import { gatewayConfig, routeConfig, serviceEndpoints, serviceGroups } from '../config/gateway';
import { ProxyRequest, RouteConfig, ServiceEndpoint } from '../types';
import { logger } from '../utils/logger';
import { RoundRobinLoadBalancer } from './load-balancer';
import { ProxyService } from './proxy';

export class ApiGateway {
  private loadBalancers: Map<string, RoundRobinLoadBalancer>;
  private proxyService: ProxyService;
  private endpoints: ServiceEndpoint[];
  private routes: RouteConfig[];
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.endpoints = [...serviceEndpoints];
    this.routes = [...routeConfig];
    this.proxyService = new ProxyService(gatewayConfig.requestTimeout);
    this.loadBalancers = new Map();
    
    this.initializeLoadBalancers();
    this.startHealthChecks();
  }

  private initializeLoadBalancers(): void {
    for (const [serviceName, serviceNames] of serviceGroups.entries()) {
      const endpoints = this.endpoints.filter(ep => serviceNames.includes(ep.serviceName));
      const loadBalancer = new RoundRobinLoadBalancer(endpoints);
      this.loadBalancers.set(serviceName, loadBalancer);
      
      logger.info(`Initialized load balancer for ${serviceName}`, {
        endpoints: endpoints.length,
        services: serviceNames
      });
    }
  }

  public async handleRequest(
    path: string,
    method: string,
    headers: Record<string, string | string[] | undefined>,
    body: any,
    query: Record<string, any>
  ) {
    logger.info(`Incoming request: ${method} ${path}`);

    const route = this.findMatchingRoute(path, method);
    if (!route) {
      logger.warn(`No matching route found for ${method} ${path}`);
      return this.createErrorResponse(404, 'Route not found');
    }

    logger.debug(`Matched route: ${route.path} -> ${route.serviceName}`);

    const loadBalancer = this.loadBalancers.get(route.serviceName);
    if (!loadBalancer) {
      logger.error(`No load balancer found for service: ${route.serviceName}`);
      return this.createErrorResponse(503, 'Service configuration error');
    }

    const selectedEndpoint = loadBalancer.getNextEndpoint(
      this.getEndpointsForService(route.serviceName)
    );

    if (!selectedEndpoint) {
      logger.error(`No healthy endpoints available for ${route.serviceName}`);
      return this.createErrorResponse(503, 'Service temporarily unavailable');
    }

    const proxyRequest: ProxyRequest = {
      originalUrl: route.stripPath ? this.stripPath(path, route.path) : path,
      method,
      headers: route.preserveHost ? headers : { ...headers, host: undefined },
      body,
      query
    };

    return await this.proxyWithRetries(selectedEndpoint, proxyRequest, route.retries);
  }


  private async proxyWithRetries(
    endpoint: ServiceEndpoint,
    request: ProxyRequest,
    maxRetries: number
  ) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        logger.debug(`Proxy attempt ${attempt}/${maxRetries + 1} to ${endpoint.serviceName}`);
        
        const response = await this.proxyService.proxyRequest(endpoint, request);
        
        if (response.statusCode < 500 || attempt === maxRetries + 1) {
          return response;
        }
        
        lastError = `Server error: ${response.statusCode}`;
        logger.warn(`Attempt ${attempt} failed with status ${response.statusCode}, retrying...`);
        
      } catch (error: any) {
        lastError = error.message;
        logger.warn(`Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt === maxRetries + 1) {
          break;
        }
      }

      if (attempt <= maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await this.sleep(delay);
      }
    }

    logger.error(`All proxy attempts failed for ${endpoint.serviceName}: ${lastError}`);
    return this.createErrorResponse(503, 'Service unavailable after retries');
  }

  private findMatchingRoute(path: string, method: string): RouteConfig | null {
    return this.routes.find(route => {
      const methodMatch = Array.isArray(route.method) 
        ? route.method.includes(method)
        : route.method === method;
        
      const pathMatch = this.pathMatches(path, route.path);
      
      return methodMatch && pathMatch;
    }) || null;
  }

  private pathMatches(requestPath: string, routePath: string): boolean {
    if (routePath === '/') {
      return true;
    }
    
    return requestPath === routePath || requestPath.startsWith(routePath + '/');
  }

  private stripPath(fullPath: string, routePath: string): string {
    if (routePath === '/') return fullPath;
    return fullPath.replace(new RegExp(`^${routePath}`), '') || '/';
  }

  private getEndpointsForService(serviceName: string): ServiceEndpoint[] {
    const serviceNames = serviceGroups.get(serviceName) || [serviceName];
    return this.endpoints.filter(ep => serviceNames.includes(ep.serviceName));
  }

  private createErrorResponse(statusCode: number, message: string) {
    return {
      statusCode,
      headers: {
        'content-type': 'application/json',
        'x-gateway': 'cinemaabyss-api-gateway'
      },
      body: {
        error: message,
        timestamp: new Date().toISOString()
      },
      responseTime: 0,
      serviceName: 'api-gateway',
      serviceEndpoint: 'internal'
    };
  }

  getStats() {
    const stats: any = {
      endpoints: this.endpoints.map(ep => ({
        name: ep.serviceName,
        url: `${ep.protocol}://${ep.host}:${ep.port}`,
        weight: ep.weight,
        isHealthy: ep.isHealthy,
        lastHealthCheck: ep.lastHealthCheck
      })),
      loadBalancers: {}
    };

    for (const [serviceName, loadBalancer] of this.loadBalancers.entries()) {
      stats.loadBalancers[serviceName] = loadBalancer.getStats();
    }

    return stats;
  }

  private startHealthChecks(): void {
    if (gatewayConfig.healthCheckInterval > 0) {
      this.healthCheckInterval = setInterval(() => {
        this.performHealthChecks();
      }, gatewayConfig.healthCheckInterval);
      
      logger.info(`Health checks started with interval: ${gatewayConfig.healthCheckInterval}ms`);
    }
  }

  private async performHealthChecks(): Promise<void> {
    const healthCheckPromises = this.endpoints.map(endpoint => 
      this.checkEndpointHealth(endpoint)
    );

    await Promise.allSettled(healthCheckPromises);
  }

  private async checkEndpointHealth(endpoint: ServiceEndpoint): Promise<void> {
    try {
      const response = await this.proxyService.proxyRequest(
        endpoint,
        {
          originalUrl: endpoint.healthCheckPath,
          method: 'GET',
          headers: {},
          query: {}
        },
        5000
      );

      const wasHealthy = endpoint.isHealthy;
      endpoint.isHealthy = response.statusCode >= 200 && response.statusCode < 300;
      endpoint.lastHealthCheck = new Date();

      if (wasHealthy !== endpoint.isHealthy) {
        logger.info(`Health status changed for ${endpoint.serviceName}: ${wasHealthy} -> ${endpoint.isHealthy}`);
      }

    } catch (error) {
      const wasHealthy = endpoint.isHealthy;
      endpoint.isHealthy = false;
      endpoint.lastHealthCheck = new Date();

      if (wasHealthy) {
        logger.warn(`Endpoint ${endpoint.serviceName} became unhealthy: ${error}`);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    logger.info('API Gateway shutdown completed');
  }
}
