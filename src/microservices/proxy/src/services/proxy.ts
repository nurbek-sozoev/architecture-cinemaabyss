import axios, { AxiosResponse } from 'axios';
import { ProxyRequest, ProxyResponse, ServiceEndpoint } from '../types';
import { logger } from '../utils/logger';

export class ProxyService {
  private axiosTimeout: number;

  constructor(timeout: number = 30000) {
    this.axiosTimeout = timeout;
  }

  public async proxyRequest(
    endpoint: ServiceEndpoint,
    request: ProxyRequest,
    timeout?: number
  ): Promise<ProxyResponse> {
    const startTime = Date.now();
    const targetUrl = this.buildTargetUrl(endpoint, request.originalUrl);
    
    logger.info(`Proxying request to ${targetUrl}`, {
      method: request.method,
      service: endpoint.serviceName,
      endpoint: `${endpoint.host}:${endpoint.port}`
    });

    try {
      const axiosConfig = {
        method: request.method,
        url: targetUrl,
        headers: this.prepareHeaders(request.headers, endpoint),
        data: request.body,
        params: request.query,
        timeout: timeout || this.axiosTimeout,
        validateStatus: () => true,
        maxRedirects: 0
      };

      const response: AxiosResponse = await axios(axiosConfig);
      const responseTime = Date.now() - startTime;

      logger.info(`Received response from ${endpoint.serviceName}`, {
        statusCode: response.status,
        responseTime,
        contentLength: response.headers['content-length']
      });

      return {
        statusCode: response.status,
        headers: this.prepareResponseHeaders(response.headers, endpoint),
        body: response.data,
        responseTime,
        serviceName: endpoint.serviceName,
        serviceEndpoint: `${endpoint.host}:${endpoint.port}`
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      logger.error(`Proxy request failed to ${endpoint.serviceName}`, {
        error: error.message,
        responseTime,
        code: error.code,
        timeout: error.code === 'ECONNABORTED'
      });

      return {
        statusCode: this.getErrorStatusCode(error),
        headers: {
          'content-type': 'application/json',
          'x-service-name': endpoint.serviceName,
          'x-service-endpoint': `${endpoint.host}:${endpoint.port}`,
          'x-error': 'proxy-error'
        },
        body: {
          error: 'Service Unavailable',
          message: 'The requested service is temporarily unavailable',
          service: endpoint.serviceName
        },
        responseTime,
        serviceName: endpoint.serviceName,
        serviceEndpoint: `${endpoint.host}:${endpoint.port}`
      };
    }
  }

  private buildTargetUrl(endpoint: ServiceEndpoint, originalUrl: string): string {
    const baseUrl = `${endpoint.protocol}://${endpoint.host}:${endpoint.port}`;
    
    const path = originalUrl.startsWith('/') ? originalUrl.slice(1) : originalUrl;
    
    return `${baseUrl}/${path}`;
  }

  private prepareHeaders(
    originalHeaders: Record<string, string | string[] | undefined>,
    endpoint: ServiceEndpoint
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    for (const [key, value] of Object.entries(originalHeaders)) {
      if (this.shouldForwardHeader(key) && value) {
        headers[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
      }
    }

    headers['x-forwarded-for'] = headers['x-forwarded-for'] || 'api-gateway';
    headers['x-forwarded-proto'] = endpoint.protocol;
    headers['x-forwarded-host'] = `${endpoint.host}:${endpoint.port}`;
    
    delete headers['host'];
    delete headers['connection'];
    delete headers['transfer-encoding'];

    return headers;
  }

  private prepareResponseHeaders(
    responseHeaders: any,
    endpoint: ServiceEndpoint
  ): Record<string, string> {
    const headers: Record<string, string> = {};

    for (const [key, value] of Object.entries(responseHeaders)) {
      if (this.shouldForwardResponseHeader(key) && value) {
        headers[key.toLowerCase()] = String(value);
      }
    }

    headers['x-service-name'] = endpoint.serviceName;
    headers['x-service-endpoint'] = `${endpoint.host}:${endpoint.port}`;
    headers['x-gateway'] = 'cinemaabyss-api-gateway';

    return headers;
  }

  private shouldForwardHeader(headerName: string): boolean {
    const lowerName = headerName.toLowerCase();
    
    const forbiddenHeaders = [
      'host',
      'connection',
      'upgrade',
      'transfer-encoding',
      'te',
      'trailer',
      'proxy-authorization',
      'proxy-authenticate',
      'proxy-connection'
    ];
    
    return !forbiddenHeaders.includes(lowerName);
  }

  private shouldForwardResponseHeader(headerName: string): boolean {
    const lowerName = headerName.toLowerCase();
    
    const forbiddenHeaders = [
      'connection',
      'upgrade',
      'transfer-encoding',
      'te',
      'trailer'
    ];
    
    return !forbiddenHeaders.includes(lowerName);
  }

  private getErrorStatusCode(error: any): number {
    if (error.response) {
      return error.response.status;
    }
    
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return 504;
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return 503;
    }
    
    return 502;
  }
}
