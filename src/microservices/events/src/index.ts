import cors from '@koa/cors';
import dotenv from 'dotenv';
import Koa from 'koa';
import { koaBody } from 'koa-body';
import compress from 'koa-compress';
import helmet from 'koa-helmet';
import koaLogger from 'koa-logger';

import { eventsRouter, kafkaService } from './routes/events';
import logger from './utils/logger';

dotenv.config();

const app = new Koa();
const port = process.env.PORT || 3282;

app.use(helmet());
app.use(cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));
app.use(compress());
app.use(koaLogger());
app.use(koaBody({
  jsonLimit: '1mb',
  formLimit: '1mb',
  textLimit: '1mb'
}));

app.use(eventsRouter.routes());
app.use(eventsRouter.allowedMethods());

app.on('error', (err: any, ctx?: any) => {
  logger.error('Server error', { error: err, url: ctx?.request?.url });
});

async function startServer() {
  try {
    await kafkaService.connect();
    await kafkaService.startConsumer();

    app.listen(port, () => {
      logger.info(`Events service running on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await kafkaService.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await kafkaService.disconnect();
  process.exit(0);
});

startServer();
