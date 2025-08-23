import { ServiceEndpoint } from '../types';
import { logger } from '../utils/logger';

export class RoundRobinLoadBalancer {
  private currentIndex = 0;
  private weightedEndpoints: ServiceEndpoint[] = [];
  
  constructor(private endpoints: ServiceEndpoint[]) {
    this.updateWeightedEndpoints();
  }

  public getNextEndpoint(endpoints: ServiceEndpoint[]): ServiceEndpoint | null {
    if (endpoints !== this.endpoints) {
      this.endpoints = endpoints;
      this.updateWeightedEndpoints();
    }

    const healthyEndpoints = this.weightedEndpoints.filter(endpoint => endpoint.isHealthy);
    
    if (healthyEndpoints.length === 0) {
      logger.warn('No healthy endpoints available for round-robin');
      return null;
    }

    const selectedEndpoint = healthyEndpoints[this.currentIndex % healthyEndpoints.length];
    this.currentIndex = (this.currentIndex + 1) % healthyEndpoints.length;

    logger.debug(`Round-robin selected: ${selectedEndpoint.serviceName}:${selectedEndpoint.port} (weight: ${selectedEndpoint.weight})`);
    
    return selectedEndpoint;
  }

  private updateWeightedEndpoints(): void {
    this.weightedEndpoints = [];
    
    for (const endpoint of this.endpoints) {
      const normalizedWeight = Math.max(1, Math.round(endpoint.weight / 10));
      
      for (let i = 0; i < normalizedWeight; i++) {
        this.weightedEndpoints.push(endpoint);
      }
    }
    
    logger.info(`Updated weighted endpoints: ${this.weightedEndpoints.length} total entries`);
    
    const weightDistribution = this.endpoints.map(ep => `${ep.serviceName}: ${ep.weight}%`).join(', ');
    logger.info(`Weight distribution: ${weightDistribution}`);
  }

  getStats() {
    const totalEndpoints = this.endpoints.length;
    const healthyEndpoints = this.endpoints.filter(ep => ep.isHealthy).length;
    const weightedTotal = this.weightedEndpoints.length;
    
    return {
      totalEndpoints,
      healthyEndpoints,
      weightedTotal,
      currentIndex: this.currentIndex,
      endpoints: this.endpoints.map(ep => ({
        name: ep.serviceName,
        weight: ep.weight,
        isHealthy: ep.isHealthy
      }))
    };
  }

  reset(): void {
    this.currentIndex = 0;
    logger.debug('Round-robin index reset to 0');
  }
}