import { Consumer, EachMessagePayload, Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import kafkaConfig from '../config/kafka';
import { Event, EventResponse } from '../types';
import logger from '../utils/logger';

class KafkaService {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private isConnected = false;

  constructor() {
    this.kafka = new Kafka(kafkaConfig);
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'events-service-group' });
  }

  async connect(): Promise<void> {
    try {
      await this.producer.connect();
      await this.consumer.connect();
      
      await this.consumer.subscribe({ 
        topic: kafkaConfig.topic, 
        fromBeginning: false 
      });

      this.isConnected = true;
      logger.info('Kafka connected successfully');
    } catch (error) {
      logger.error('Failed to connect to Kafka', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      this.isConnected = false;
      logger.info('Kafka disconnected successfully');
    } catch (error) {
      logger.error('Failed to disconnect from Kafka', error);
      throw error;
    }
  }

  async publishEvent(type: string, payload: any): Promise<EventResponse> {
    if (!this.isConnected) {
      throw new Error('Kafka is not connected');
    }

    const event: Event = {
      id: uuidv4(),
      type,
      timestamp: new Date().toISOString(),
      payload
    };

    try {
      const result = await this.producer.send({
        topic: kafkaConfig.topic,
        messages: [
          {
            key: event.id,
            value: JSON.stringify(event)
          }
        ]
      });

      const response: EventResponse = {
        status: 'success',
        partition: result[0].partition,
        offset: Number(result[0].baseOffset),
        event
      };

      logger.info(`Event published: ${event.id}`, { type, eventId: event.id });
      return response;
    } catch (error) {
      logger.error('Failed to publish event', error);
      throw error;
    }
  }

  async startConsumer(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Kafka is not connected');
    }

    try {
      await this.consumer.run({
        eachMessage: this.handleMessage.bind(this)
      });
      logger.info('Kafka consumer started');
    } catch (error) {
      logger.error('Failed to start consumer', error);
      throw error;
    }
  }

  private async handleMessage(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    
    try {
      if (message.value) {
        const event = JSON.parse(message.value.toString());
        logger.info(`Received event: ${event.id}`, { 
          topic, 
          partition, 
          offset: message.offset,
          eventType: event.type 
        });
      }
    } catch (error) {
      logger.error('Failed to process message', error);
    }
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

export default KafkaService;
