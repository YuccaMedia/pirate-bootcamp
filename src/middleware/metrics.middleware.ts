import { Request, Response, NextFunction } from 'express';
import * as promClient from 'prom-client';

// Initialize Prometheus metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000] // buckets in ms
});

const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpErrorCounter = new promClient.Counter({
  name: 'http_request_errors_total',
  help: 'Total number of HTTP request errors',
  labelNames: ['method', 'route', 'status_code']
});

// Initialize prometheus metrics collection
promClient.collectDefaultMetrics();

export const metricsMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Handle /metrics endpoint
    if (req.path === '/metrics') {
      res.set('Content-Type', 'text/plain');
      res.send(promClient.register.metrics());
      return;
    }

    // Record start time
    const start = Date.now();
    
    // Record metrics once response is finished
    res.on('finish', () => {
      // Calculate response time
      const duration = Date.now() - start;
      
      // Route path for the metrics (normalized)
      const route = req.route?.path || req.path || 'unknown';
      
      // Record duration
      httpRequestDurationMicroseconds.observe(
        { 
          method: req.method, 
          route, 
          status_code: res.statusCode 
        }, 
        duration
      );
      
      // Increment request counter
      httpRequestCounter.inc({ 
        method: req.method, 
        route, 
        status_code: res.statusCode 
      });
      
      // If error occurred, increment error counter
      if (res.statusCode >= 400) {
        httpErrorCounter.inc({ 
          method: req.method, 
          route, 
          status_code: res.statusCode 
        });
      }
    });
    
    next();
  };
}; 