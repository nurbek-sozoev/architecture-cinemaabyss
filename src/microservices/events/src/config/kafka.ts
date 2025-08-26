import { KafkaConfig } from '../types';

const kafkaConfig: KafkaConfig = {
  clientId: process.env.KAFKA_CLIENT_ID || 'events-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  topic: process.env.KAFKA_TOPIC || 'cinema-events'
};

export default kafkaConfig;
