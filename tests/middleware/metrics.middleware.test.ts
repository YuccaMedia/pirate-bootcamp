import { Request, Response, NextFunction } from 'express';
import { metricsMiddleware } from '../../src/middleware/metrics.middleware';
import * as promClient from 'prom-client';

// Mock prom-client
jest.mock('prom-client', () => {
  return {
    Counter: jest.fn().mockImplementation(() => {
      return {
        inc: jest.fn()
      };
    }),
    Histogram: jest.fn().mockImplementation(() => {
      return {
        observe: jest.fn()
      };
    }),
    register: {
      metrics: jest.fn().mockReturnValue('metric1{label="value"} 1\nmetric2{label="value"} 2'),
      clear: jest.fn()
    }
  };
});

describe('Metrics Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let mockStartTime: number;

  beforeEach(() => {
    // Setup mocks
    mockReq = {
      method: 'GET',
      path: '/api/test',
      ip: '127.0.0.1'
    };
    mockRes = {
      statusCode: 200,
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          callback();
        }
        return mockRes;
      })
    };
    mockNext = jest.fn();
    mockStartTime = Date.now();
    
    // Mock Date.now to return consistent values for testing
    jest.spyOn(Date, 'now').mockImplementation(() => mockStartTime);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should track request metrics', () => {
    // Arrange
    const middleware = metricsMiddleware();
    
    // Act
    middleware(mockReq as Request, mockRes as Response, mockNext);
    
    // Assert
    expect(mockNext).toHaveBeenCalled();
    // Verify that the response.on('finish') handler was registered
    expect(mockRes.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('should observe response time when request completes', () => {
    // Arrange
    const middleware = metricsMiddleware();
    
    // Simulate a delay of 100ms
    const responseDelay = 100;
    jest.spyOn(Date, 'now')
      .mockImplementationOnce(() => mockStartTime) // First call in middleware
      .mockImplementationOnce(() => mockStartTime + responseDelay); // Second call in finish handler
    
    // Act
    middleware(mockReq as Request, mockRes as Response, mockNext);
    
    // Get the finish callback
    const finishCallback = (mockRes.on as jest.Mock).mock.calls[0][1];
    
    // Execute the callback to simulate response completion
    finishCallback();
    
    // Assert that metrics were incremented and timing was observed
    // These assertions depend on the implementation of your metrics middleware
    // You'll need to adjust based on your actual implementation
    const histogramObserve = (promClient.Histogram as jest.Mock).mock.instances[0].observe;
    expect(histogramObserve).toHaveBeenCalledWith(expect.any(Number));
    
    const counterInc = (promClient.Counter as jest.Mock).mock.instances[0].inc;
    expect(counterInc).toHaveBeenCalled();
  });

  it('should handle metrics endpoint requests', () => {
    // Arrange
    const middleware = metricsMiddleware();
    mockReq.path = '/metrics';
    
    mockRes.set = jest.fn().mockReturnThis();
    mockRes.send = jest.fn().mockReturnThis();
    
    // Act
    middleware(mockReq as Request, mockRes as Response, mockNext);
    
    // Assert
    expect(mockRes.set).toHaveBeenCalledWith('Content-Type', 'text/plain');
    expect(mockRes.send).toHaveBeenCalledWith(expect.any(String));
    expect(mockNext).not.toHaveBeenCalled(); // Next should not be called for metrics endpoint
  });

  it('should track errors correctly', () => {
    // Arrange
    const middleware = metricsMiddleware();
    mockRes.statusCode = 500;
    
    // Act
    middleware(mockReq as Request, mockRes as Response, mockNext);
    
    // Get the finish callback
    const finishCallback = (mockRes.on as jest.Mock).mock.calls[0][1];
    
    // Execute the callback to simulate response completion with error status
    finishCallback();
    
    // Assert that error metrics were incremented
    // Again, these assertions depend on your implementation
    const counterInc = (promClient.Counter as jest.Mock).mock.instances[0].inc;
    expect(counterInc).toHaveBeenCalled();
    // You might want to verify that the right labels were used if your implementation
    // differentiates between successful requests and errors
  });
}); 