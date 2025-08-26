import Router from '@koa/router';
import EventsController from '../controllers/events';
import KafkaService from '../services/kafka';

const kafkaService = new KafkaService();
const eventsController = new EventsController(kafkaService);

const eventsRouter = new Router();

eventsRouter.get('/api/events/health', eventsController.health.bind(eventsController));
eventsRouter.post('/api/events/movie', eventsController.createMovieEvent.bind(eventsController));
eventsRouter.post('/api/events/user', eventsController.createUserEvent.bind(eventsController));
eventsRouter.post('/api/events/payment', eventsController.createPaymentEvent.bind(eventsController));

export { eventsRouter, kafkaService };
