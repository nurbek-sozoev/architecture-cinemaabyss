import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { Context } from 'koa';
import { EProxyTarget, IProxyConfig, IRoutingDecision } from './types';

export class ProxyService {
  private config: IProxyConfig;
  private startTime: number;
  private requestCounter: number = 0;

  constructor(config: IProxyConfig) {
    this.config = config;
    this.startTime = Date.now();
  }

  private shouldUseMoviesService(): boolean {
    if (!this.config.gradualMigration) {
      return true;
    }

    this.requestCounter++;
    const position = this.requestCounter % 100;
    return position <= this.config.moviesMigrationPercent;
  }

  public makeRoutingDecision(path: string): IRoutingDecision {
    if (path.startsWith('/api/movies')) {
      if (this.shouldUseMoviesService()) {
        return {
          target: EProxyTarget.MOVIES_SERVICE,
          targetUrl: this.config.moviesServiceUrl
        };
      } else {
        return {
          target: EProxyTarget.MONOLITH,
          targetUrl: this.config.monolithUrl,
        };
      }
    }

    if (path.startsWith('/api/events')) {
      return {
        target: EProxyTarget.EVENTS_SERVICE,
        targetUrl: this.config.eventsServiceUrl,
      };
    }

    return {
      target: EProxyTarget.MONOLITH,
      targetUrl: this.config.monolithUrl,
    };
  }

  public async forwardRequest(ctx: Context, decision: IRoutingDecision): Promise<void> {
    const startTime = Date.now();
    
    try {
      const targetPath = decision.targetUrl + ctx.path;
      const targetUrl = ctx.query && Object.keys(ctx.query).length > 0 
        ? `${targetPath}?${new URLSearchParams(ctx.query as any).toString()}`
        : targetPath;

      console.log(`Proxying ${ctx.method} ${ctx.path} to ${decision.target} (${targetUrl})`);

      const requestConfig: AxiosRequestConfig = {
        method: ctx.method as any,
        url: targetUrl,
        headers: this.prepareHeaders(ctx),
        timeout: 30000,
        validateStatus: () => true,
      };

      if (['POST', 'PUT', 'PATCH'].includes(ctx.method.toUpperCase()) && ctx.request.body) {
        requestConfig.data = ctx.request.body;
      }

      const response: AxiosResponse = await axios(requestConfig);

      ctx.status = response.status;
      
      this.copyResponseHeaders(ctx, response);

      ctx.body = response.data;

      const duration = Date.now() - startTime;
      console.log(`Request completed in ${duration}ms with status ${response.status}`);

    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error as any;
      console.error(`Proxy error after ${duration}ms:`, err.message);
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          ctx.status = 503;
          ctx.body = {
            error: 'Service Unavailable',
            message: `Unable to connect to ${decision.target}`,
            target: decision.targetUrl
          };
        } else if (error.code === 'ECONNABORTED') {
          ctx.status = 504;
          ctx.body = {
            error: 'Gateway Timeout',
            message: 'Request timeout while connecting to upstream service'
          };
        } else {
          ctx.status = 502;
          ctx.body = {
            error: 'Bad Gateway',
            message: 'Error occurred while proxying request'
          };
        }
      } else {
        ctx.status = 500;
        ctx.body = {
          error: 'Internal Server Error',
          message: 'Unexpected error in proxy service'
        };
      }
    }
  }

  private prepareHeaders(ctx: Context): Record<string, string> {
    const headers: Record<string, string> = {};

    Object.entries(ctx.headers).forEach(([key, value]) => {
      if (!this.isHopByHopHeader(key) && key !== 'host' && value !== undefined) {
        headers[key] = Array.isArray(value) ? value[0] : value as string;
      }
    });

    // Добавляем X-Forwarded заголовки
    headers['x-forwarded-for'] = ctx.ip;
    headers['x-forwarded-proto'] = ctx.protocol;
    headers['x-forwarded-host'] = ctx.host;
    headers['x-forwarded-by'] = 'cinemaabyss-proxy';

    return headers;
  }

  private copyResponseHeaders(ctx: Context, response: AxiosResponse): void {
    Object.entries(response.headers).forEach(([key, value]) => {
      // Убираем hop-by-hop заголовки, так как Hop-by-hop заголовки предназначены 
      // только для одного соединения между клиентом и сервером
      if (!this.isHopByHopHeader(key)) {
        ctx.set(key, Array.isArray(value) ? value[0] : value);
      }
    });
  }

  private isHopByHopHeader(headerName: string): boolean {
    const hopByHopHeaders = [
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailers',
      'transfer-encoding',
      'upgrade'
    ];
    return hopByHopHeaders.includes(headerName.toLowerCase());
  }

  public getHealthStatus(): any {
    return {
      status: 'healthy',
      service: 'strangler-fig-proxy',
      gradual_migration: this.config.gradualMigration,
      movies_migration_percent: this.config.moviesMigrationPercent,
      request_counter: this.requestCounter,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      environment: this.config.environment,
      upstream_services: {
        monolith: this.config.monolithUrl,
        movies: this.config.moviesServiceUrl,
        events: this.config.eventsServiceUrl
      }
    };
  }
}
