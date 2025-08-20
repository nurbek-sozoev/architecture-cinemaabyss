import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from 'koa-cors';
import json from 'koa-json';
import Router from 'koa-router';

import { loadConfig, printConfigSummary } from './config';
import { ProxyService } from './proxy';
import { IExtendedContext } from './types';

function createApp(): Koa {
  const app = new Koa();
  const router = new Router();
  
  const config = loadConfig();
  printConfigSummary(config);

  const proxyService = new ProxyService(config);

  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      console.error('Unhandled error:', error);
      const err = error as any;
      ctx.status = err.status || 500;
      ctx.body = {
        error: 'Internal Server Error',
        message: err.message || 'An unexpected error occurred'
      };
      ctx.app.emit('error', error, ctx);
    }
  });

  app.use(async (ctx, next) => {
    const start = Date.now();
    (ctx as IExtendedContext).startTime = start;
    
    await next();
    
    const duration = Date.now() - start;
    ctx.set('X-Response-Time', `${duration}ms`);
  });

  app.use(cors());
  app.use(json({ pretty: false, param: 'pretty' }));
  
  app.use(bodyParser({
    enableTypes: ['json', 'form', 'text'],
    jsonLimit: '10mb',
    formLimit: '10mb',
    textLimit: '10mb'
  }));

  router.get('/health', (ctx) => {
    console.log('Health check');
    ctx.body = proxyService.getHealthStatus();
  });

  app.use(async (ctx, next) => {
    if (ctx.path === '/health' || ctx.body !== undefined) {
      await next();
      return;
    }

    const decision = proxyService.makeRoutingDecision(ctx.path);
    (ctx as IExtendedContext).routingDecision = decision;

    await proxyService.forwardRequest(ctx, decision);
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  app.on('error', (error, ctx) => {
    console.error('Application error:', {
      error: error.message,
      url: ctx?.url,
      method: ctx?.method,
      status: ctx?.status
    });
  });

  return app;
}

async function startServer(): Promise<void> {
  try {
    const config = loadConfig();
    const app = createApp();

    const server = app.listen(config.port, () => {
      console.log(`Proxy started successfully on port ${config.port} \n`);
    });

    const gracefulShutdown = (signal: string) => {
      console.log(`Received ${signal}, starting graceful shutdown...`);
      
      server.close((error) => {
        if (error) {
          console.error('Error during server shutdown:', error);
          process.exit(1);
        }
        
        console.log('Server shutdown gracefully');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Error during startup:', error);
    process.exit(1);
  });
}

export { createApp, startServer };
