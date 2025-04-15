import { Request, Response, NextFunction } from 'express';
import { apiLimiter } from '../../src/middleware/rate-limit.middleware';
import { AppError } from '../../src/utils/error.utils';

// Mock express-rate-limit
jest.mock('express-rate-limit', () => {
  return jest.fn().mockImplementation((options) => {
    return (req: Request, res: Response, next: NextFunction) => {
      // Store the handler function for testing
      (req as any).rateLimitHandler = options.handler;
      
      // Store the options for testing
      (req as any).rateLimitOptions = options;
      
      // Call next by default (no rate limiting in tests)
      next();
    };
  });
});

describe('Rate Limit Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    // Setup mocks
    mockReq = {};
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  it('should configure rate limiter with correct settings', () => {
    // Act
    apiLimiter(mockReq as Request, mockRes as Response, mockNext);
    
    // Assert
    const options = (mockReq as any).rateLimitOptions;
    expect(options.windowMs).toBe(15 * 60 * 1000); // 15 minutes
    expect(options.max).toBe(100); // 100 requests
    expect(options.standardHeaders).toBe(true);
    expect(options.legacyHeaders).toBe(false);
    expect(typeof options.handler).toBe('function');
  });

  it('should call next middleware when rate limit is not exceeded', () => {
    // Act
    apiLimiter(mockReq as Request, mockRes as Response, mockNext);
    
    // Assert
    expect(mockNext).toHaveBeenCalled();
  });

  it('should throw AppError when rate limit is exceeded', () => {
    // Act
    apiLimiter(mockReq as Request, mockRes as Response, mockNext);
    
    // Get the handler
    const handler = (mockReq as any).rateLimitHandler;
    
    // Assert - handler should throw when called
    expect(() => {
      handler(mockReq, mockRes, mockNext);
    }).toThrow(AppError);
  });

  it('should return 429 status code with appropriate message when rate limit is exceeded', () => {
    // Act
    apiLimiter(mockReq as Request, mockRes as Response, mockNext);
    
    // Get the handler
    const handler = (mockReq as any).rateLimitHandler;
    
    // Try-catch because the handler throws
    try {
      handler(mockReq, mockRes, mockNext);
    } catch (error) {
      // Assert
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Too many requests, please try again later.');
    }
  });
}); 