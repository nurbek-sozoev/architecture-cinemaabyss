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
    
    if (this.endpoints.length === 0) return;
    
    const weights = this.endpoints.map(ep => Math.max(1, ep.weight));
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    const baseSlots = 100;
    const endpointSlots = this.endpoints.map(endpoint => {
      const proportion = endpoint.weight / totalWeight;
      return Math.max(1, Math.round(proportion * baseSlots));
    });
    
    const totalSlots = endpointSlots.reduce((sum, slots) => sum + slots, 0);
    
    for (let slot = 0; slot < totalSlots; slot++) {
      let cumulativeSlots = 0;
      for (let i = 0; i < this.endpoints.length; i++) {
        cumulativeSlots += endpointSlots[i];
        if (slot < cumulativeSlots) {
          this.weightedEndpoints.push(this.endpoints[i]);
          break;
        }
      }
    }
    
    this.shuffleWeightedEndpoints();
    
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

  private shuffleWeightedEndpoints(): void {
    if (this.weightedEndpoints.length <= 2) return;
    
    if (this.endpoints.length === 2 && this.endpoints[0].weight === this.endpoints[1].weight) {
      const [service1, service2] = this.endpoints;
      this.weightedEndpoints = [];
      
      const slotsPerService = Math.floor(100 / this.endpoints.length);
      for (let i = 0; i < slotsPerService; i++) {
        this.weightedEndpoints.push(service1);
        this.weightedEndpoints.push(service2);
      }
      
      logger.debug(`Created alternating pattern for equal weights: ${this.weightedEndpoints.length} total slots`);
      return;
    }
    
    const result: ServiceEndpoint[] = [];
    const serviceSlots: { [key: string]: ServiceEndpoint[] } = {};
    
    this.weightedEndpoints.forEach(endpoint => {
      const key = `${endpoint.serviceName}:${endpoint.port}`;
      if (!serviceSlots[key]) {
        serviceSlots[key] = [];
      }
      serviceSlots[key].push(endpoint);
    });
    
    const keys = Object.keys(serviceSlots);
    const maxSlots = Math.max(...Object.values(serviceSlots).map(slots => slots.length));
    
    for (let round = 0; round < maxSlots; round++) {
      for (const key of keys) {
        if (serviceSlots[key][round]) {
          result.push(serviceSlots[key][round]);
        }
      }
    }
    
    this.weightedEndpoints = result;
  }
}