import { GatewayConfig, LogLevel, RouteConfig, ServiceEndpoint } from '../types';

export const gatewayConfig: GatewayConfig = {
  port: parseInt(process.env.PORT || '3200'),
  host: process.env.HOST || '0.0.0.0',
  corsEnabled: process.env.CORS_ENABLED === 'true' || true,
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'),
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '10000'),
  logLevel: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
  stranglerFig: {
    gradualMigration: process.env.GRADUAL_MIGRATION === 'true' || true,
    migrationPercent: parseInt(process.env.MOVIES_MIGRATION_PERCENT || '50'),
    legacyService: 'monolith-service',
    newService: 'movies-service'
  }
};

export const serviceEndpoints: ServiceEndpoint[] = [
  {
    serviceName: 'monolith-service',
    host: process.env.MONOLITH_HOST || 'monolith',
    port: parseInt(process.env.MONOLITH_PORT || '3280'),
    protocol: 'http',
    healthCheckPath: '/health',
    weight: 100 - gatewayConfig.stranglerFig.migrationPercent,
    isHealthy: true,
    lastHealthCheck: null,
  },
  {
    serviceName: 'movies-service',
    host: process.env.MOVIES_SERVICE_HOST || 'movies-service',
    port: parseInt(process.env.MOVIES_SERVICE_PORT || '3281'),
    protocol: 'http',
    healthCheckPath: '/api/movies',
    weight: gatewayConfig.stranglerFig.migrationPercent,
    isHealthy: true,
    lastHealthCheck: null,
  },
  {
    serviceName: 'events-service',
    host: process.env.EVENTS_SERVICE_HOST || 'events-service',
    port: parseInt(process.env.EVENTS_SERVICE_PORT || '3282'),
    protocol: 'http',
    healthCheckPath: '/health',
    weight: 100,
    isHealthy: true,
    lastHealthCheck: null,
  }
];

export const routeConfig: RouteConfig[] = [
  {
    path: '/api/movies',
    method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    serviceName: 'movies-load-balanced',
    stripPath: false,
    preserveHost: false,
    timeout: 30000,
    retries: 3,
  },
  {
    path: '/api/events',
    method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    serviceName: 'events-service',
    stripPath: false,
    preserveHost: false,
    timeout: 30000,
    retries: 3,
  },
  {
    path: '/health',
    method: 'GET',
    serviceName: 'monolith-service',
    stripPath: false,
    preserveHost: false,
    timeout: 5000,
    retries: 1,
  },
  {
    path: '/api/health',
    method: 'GET',
    serviceName: 'monolith-service',
    stripPath: false,
    preserveHost: false,
    timeout: 5000,
    retries: 1,
  },
  {
    path: '/',
    method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    serviceName: 'monolith-service',
    stripPath: false,
    preserveHost: false,
    timeout: 30000,
    retries: 3,
  }
];

export const serviceGroups = new Map<string, string[]>([
  ['movies-load-balanced', ['monolith-service', 'movies-service']],
  ['monolith-service', ['monolith-service']],
  ['movies-service', ['movies-service']],
  ['events-service', ['events-service']]
]);
