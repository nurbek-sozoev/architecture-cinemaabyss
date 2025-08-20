import dotenv from 'dotenv';
import { IProxyConfig } from './types';

dotenv.config();

function getEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

function getBoolEnv(key: string, fallback: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

function getNumberEnv(key: string, fallback: number): number {
  const value = process.env[key];
  if (value === undefined) return fallback;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

export function loadConfig(): IProxyConfig {
  const config: IProxyConfig = {
    port: getNumberEnv('PORT', 3200),
    monolithUrl: getEnv('MONOLITH_URL', 'http://localhost:3280'),
    moviesServiceUrl: getEnv('MOVIES_SERVICE_URL', 'http://localhost:3281'),
    eventsServiceUrl: getEnv('EVENTS_SERVICE_URL', 'http://localhost:3282'),
    gradualMigration: getBoolEnv('GRADUAL_MIGRATION', true),
    moviesMigrationPercent: getNumberEnv('MOVIES_MIGRATION_PERCENT', 0),
    environment: getEnv('NODE_ENV', 'development')
  };

  // Validate configuration
  validateConfig(config);

  return config;
}

function validateConfig(config: IProxyConfig): void {
  if (config.port < 1 || config.port > 65535) {
    throw new Error(`Invalid port number: ${config.port}. Must be between 1 and 65535.`);
  }

  if (config.moviesMigrationPercent < 0 || config.moviesMigrationPercent > 100) {
    throw new Error(`Invalid migration percentage: ${config.moviesMigrationPercent}. Must be between 0 and 100.`);
  }

  const urlPattern = /^https?:\/\/.+/;
  if (!urlPattern.test(config.monolithUrl)) {
    throw new Error(`Invalid monolith URL: ${config.monolithUrl}`);
  }

  if (!urlPattern.test(config.moviesServiceUrl)) {
    throw new Error(`Invalid movies service URL: ${config.moviesServiceUrl}`);
  }

  if (!urlPattern.test(config.eventsServiceUrl)) {
    throw new Error(`Invalid events service URL: ${config.eventsServiceUrl}`);
  }
}

export function printConfigSummary(config: IProxyConfig): void {
  console.log('Proxy Configuration:');
  console.log(`   Port: ${config.port}`);
  console.log(`   Environment: ${config.environment}`);
  console.log(`   Gradual Migration: ${config.gradualMigration ? 'Enabled' : 'Disabled'}`);
  console.log(`   Movies Migration Percent: ${config.moviesMigrationPercent}%`);
  console.log(`   Upstream Services:`);
  console.log(`     - Monolith: ${config.monolithUrl}`);
  console.log(`     - Movies Service: ${config.moviesServiceUrl}`);
  console.log(`     - Events Service: ${config.eventsServiceUrl}\n`);
}
