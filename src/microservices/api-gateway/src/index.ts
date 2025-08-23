import cors from '@koa/cors';
import Router from '@koa/router';
import Koa, { Context } from 'koa';
import { koaBody } from 'koa-body';
import compress from 'koa-compress';
import helmet from 'koa-helmet';

import { gatewayConfig } from './config/gateway';
import { ApiGateway } from './services/gateway';
import { logger } from './utils/logger';

class CinemaAbyssApiGateway {
  private app: Koa;
  private router: Router;
  private gateway: ApiGateway;
  private server?: any;

  constructor() {
    this.app = new Koa();
    this.router = new Router();
    this.gateway = new ApiGateway();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(compress());

    if (gatewayConfig.corsEnabled) {
      this.app.use(cors({
        origin: '*',
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposeHeaders: [
          'X-Service-Name', 
          'X-Service-Endpoint',
          'X-Gateway',
          'X-Response-Time'
        ],
        credentials: true
      }));
    }

    this.app.use(koaBody({
      jsonLimit: '10mb',
      formLimit: '10mb',
      textLimit: '10mb',
      multipart: true
    }));

    this.app.use(async (ctx, next) => {
      const start = Date.now();
      await next();
      const responseTime = Date.now() - start;
      
      ctx.set('X-Response-Time', `${responseTime}ms`);
      
      logger.info(`${ctx.method} ${ctx.url} - ${ctx.status} - ${responseTime}ms`, {
        method: ctx.method,
        url: ctx.url,
        status: ctx.status,
        responseTime,
        userAgent: ctx.get('User-Agent')
      });
    });
  }

  private setupRoutes(): void {
    this.router.get('/gateway/health', async (ctx: Context) => {
      ctx.body = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      };
    });

    this.router.get('/gateway/stats', async (ctx: Context) => {
      const stats = this.gateway.getStats();
      ctx.body = { gateway: stats };
    });

    this.router.all('(.*)', async (ctx: Context) => {
      try {
        const response = await this.gateway.handleRequest(
          ctx.path,
          ctx.method,
          ctx.headers,
          ctx.request.body,
          ctx.query
        );

        ctx.status = response.statusCode;
        
        for (const [key, value] of Object.entries(response.headers)) {
          ctx.set(key, value);
        }
        
        ctx.set('X-Response-Time', `${response.responseTime}ms`);
        ctx.set('X-Service-Name', response.serviceName);
        ctx.set('X-Service-Endpoint', response.serviceEndpoint);
        
        ctx.body = response.body;

      } catch (error: any) {
        logger.error('Proxy error in router', {
          error: error.message,
          stack: error.stack
        });
        
        ctx.status = 500;
        ctx.body = {
          error: 'Internal Gateway Error',
          timestamp: new Date().toISOString()
        };
      }
    });

    this.app.use(this.router.routes());
    this.app.use(this.router.allowedMethods());
  }

  private setupErrorHandling(): void {
    this.app.on('error', (error, ctx) => {
      logger.error('Unhandled application error', {
        error: error.message,
        stack: error.stack,
        url: ctx?.url,
        method: ctx?.method
      });
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.shutdown();
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', { reason });
      process.exit(1);
    });
  }

  async start(): Promise<void> {
    try {
      this.server = this.app.listen(gatewayConfig.port, gatewayConfig.host, () => {
        logger.info(`CinemaAbyss API Gateway started`, {
          port: gatewayConfig.port,
          host: gatewayConfig.host,
          environment: process.env.NODE_ENV || 'development',
          stranglerFig: {
            enabled: gatewayConfig.stranglerFig.gradualMigration,
            migrationPercent: gatewayConfig.stranglerFig.migrationPercent
          }
        });
      });

      const stats = this.gateway.getStats();
      logger.info('Service endpoints configured:', {
        endpoints: stats.endpoints.length,
        services: stats.endpoints.map((ep: any) => `${ep.name} (weight: ${ep.weight}%)`).join(', ')
      });

    } catch (error: any) {
      logger.error('Failed to start API Gateway', {
        error: error.message,
        port: gatewayConfig.port
      });
      process.exit(1);
    }
  }

  private shutdown(): void {
    if (this.server) {
      this.server.close(() => {
        logger.info('HTTP server closed');
        this.gateway.shutdown();
        process.exit(0);
      });
    } else {
      this.gateway.shutdown();
      process.exit(0);
    }
  }
}

const apiGateway = new CinemaAbyssApiGateway();
apiGateway.start().catch(error => {
  logger.error('Failed to start application', { error: error.message });
  process.exit(1);
});

export default CinemaAbyssApiGateway;
