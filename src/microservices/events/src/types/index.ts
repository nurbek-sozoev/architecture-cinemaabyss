export interface MovieEvent {
  movie_id: number;
  title: string;
  action: string;
  user_id?: number;
  rating?: number;
  genres?: string[];
  description?: string;
}

export interface UserEvent {
  user_id: number;
  username?: string;
  email?: string;
  action: string;
  timestamp: string;
}

export interface PaymentEvent {
  payment_id: number;
  user_id: number;
  amount: number;
  status: string;
  timestamp: string;
  method_type?: string;
}

export interface Event {
  id: string;
  type: string;
  timestamp: string;
  payload: any;
}

export interface EventResponse {
  status: string;
  partition: number;
  offset: number;
  event: Event;
}

export interface KafkaConfig {
  clientId: string;
  brokers: string[];
  topic: string;
}
