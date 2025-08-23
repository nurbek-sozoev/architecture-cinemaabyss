export interface ServiceEndpoint {
  serviceName: string;
  host: string;
  port: number;
  protocol: 'http' | 'https';
  healthCheckPath: string;
  weight: number;
  isHealthy: boolean;
  lastHealthCheck: Date | null;
}

export interface RouteConfig {
  path: string;
  method: string | string[];
  serviceName: string;
  stripPath: boolean;
  preserveHost: boolean;
  timeout: number;
  retries: number;
}

export interface ProxyRequest {
  originalUrl: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body?: any;
  query: Record<string, any>;
}

export interface ProxyResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: any;
  responseTime: number;
  serviceName: string;
  serviceEndpoint: string;
}

export interface HealthCheckResult {
  endpointId: string;
  isHealthy: boolean;
  responseTime: number;
  error?: string;
  timestamp: Date;
}

export interface StranglerFigConfig {
  gradualMigration: boolean;
  migrationPercent: number;
  legacyService: string;
  newService: string;
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface GatewayConfig {
  port: number;
  host: string;
  corsEnabled: boolean;
  requestTimeout: number;
  healthCheckInterval: number;
  logLevel: LogLevel;
  stranglerFig: StranglerFigConfig;
}
