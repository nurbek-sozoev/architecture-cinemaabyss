import Koa from 'koa';
import KafkaService from '../services/kafka';
import { MovieEvent, PaymentEvent, UserEvent } from '../types';
import logger from '../utils/logger';

type Context = Koa.ParameterizedContext;

class EventsController {
  constructor(private kafkaService: KafkaService) {}

  async health(ctx: Context): Promise<void> {
    try {
      const status = this.kafkaService.isHealthy();
      ctx.status = 200;
      ctx.body = { status };
    } catch (error) {
      logger.error('Health check failed', error);
      ctx.status = 500;
      ctx.body = { error: 'Health check failed' };
    }
  }

  async createMovieEvent(ctx: Context): Promise<void> {
    try {
      const movieEvent: MovieEvent = ctx.request.body;
      
      if (!movieEvent.movie_id || !movieEvent.title || !movieEvent.action) {
        ctx.status = 400;
        ctx.body = { error: 'Missing required fields: movie_id, title, action' };
        return;
      }

      const result = await this.kafkaService.publishEvent('movie', movieEvent);
      
      ctx.status = 201;
      ctx.body = result;
    } catch (error) {
      logger.error('Failed to create movie event', error);
      ctx.status = 500;
      ctx.body = { error: 'Internal Server Error' };
    }
  }

  async createUserEvent(ctx: Context): Promise<void> {
    try {
      const userEvent: UserEvent = ctx.request.body;
      
      if (!userEvent.user_id || !userEvent.action || !userEvent.timestamp) {
        ctx.status = 400;
        ctx.body = { error: 'Missing required fields: user_id, action, timestamp' };
        return;
      }

      const result = await this.kafkaService.publishEvent('user', userEvent);
      
      ctx.status = 201;
      ctx.body = result;
    } catch (error) {
      logger.error('Failed to create user event', error);
      ctx.status = 500;
      ctx.body = { error: 'Internal Server Error' };
    }
  }

  async createPaymentEvent(ctx: Context): Promise<void> {
    try {
      const paymentEvent: PaymentEvent = ctx.request.body;
      
      if (!paymentEvent.payment_id || !paymentEvent.user_id || 
          !paymentEvent.amount || !paymentEvent.status || !paymentEvent.timestamp) {
        ctx.status = 400;
        ctx.body = { error: 'Missing required fields: payment_id, user_id, amount, status, timestamp' };
        return;
      }

      const result = await this.kafkaService.publishEvent('payment', paymentEvent);
      
      ctx.status = 201;
      ctx.body = result;
    } catch (error) {
      logger.error('Failed to create payment event', error);
      ctx.status = 500;
      ctx.body = { error: 'Internal Server Error' };
    }
  }
}

export default EventsController;
