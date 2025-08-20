export interface IProxyConfig {
  port: number;
  monolithUrl: string;
  moviesServiceUrl: string;
  eventsServiceUrl: string;
  gradualMigration: boolean;
  moviesMigrationPercent: number;
  environment: string;
}

export interface IHealthStatus {
  status: 'healthy' | 'unhealthy';
  service: string;
  gradual_migration: boolean;
  movies_migration_percent: number;
  timestamp: string;
  uptime: number;
  environment: string;
  upstream_services: {
    monolith: string;
    movies: string;
    events: string;
  };
}


export enum EProxyTarget {
  MONOLITH = 'monolith',
  MOVIES_SERVICE = 'movies_service',
  EVENTS_SERVICE = 'events_service'
}

export interface IRoutingDecision {
  target: EProxyTarget;
  targetUrl: string;
}

export interface IExtendedContext {
  routingDecision?: IRoutingDecision;
  startTime?: number;
}
