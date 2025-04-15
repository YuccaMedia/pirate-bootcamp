import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler, asyncHandler } from '../../src/middleware/error.middleware';
import { AppError } from '../../src/types/error.types';

describe('Error Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Setup mocks
    mockReq = {
      method: 'GET',
      originalUrl: '/test'
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
    
    // Spy on console.error to prevent actual logging during tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('errorHandler', () => {
    it('should handle AppError instances with appropriate status code and message', () => {
      // Arrange
      const appError = new AppError('Validation error', 400);
      
      // Act
      errorHandler(appError, mockReq as Request, mockRes as Response, mockNext);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Validation error'
      });
    });

    it('should set status to "fail" for 4xx errors', () => {
      // Arrange
      const appError = new AppError('Not found', 404);
      
      // Act
      errorHandler(appError, mockReq as Request, mockRes as Response, mockNext);
      
      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'fail',
        message: 'Not found'
      });
    });

    it('should set status to "error" for 5xx errors', () => {
      // Arrange
      const appError = new AppError('Internal server error', 500);
      
      // Act
      errorHandler(appError, mockReq as Request, mockRes as Response, mockNext);
      
      // Assert
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error'
      });
    });

    it('should handle unknown errors with 500 status code and generic message', () => {
      // Arrange
      const error = new Error('Some unexpected error');
      
      // Act
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);
      
      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Something went wrong'
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('notFoundHandler', () => {
    it('should create a 404 AppError with route information', () => {
      // Act
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);
      
      // Assert
      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Cannot find GET /test on this server');
    });
  });

  describe('asyncHandler', () => {
    it('should pass result to next middleware when async function resolves', async () => {
      // Arrange
      const asyncFn = jest.fn().mockResolvedValue('result');
      const wrappedFn = asyncHandler(asyncFn);
      
      // Act
      await wrappedFn(mockReq, mockRes, mockNext);
      
      // Assert
      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled(); // Next should not be called on success
    });

    it('should call next with error when async function rejects', async () => {
      // Arrange
      const error = new Error('Async error');
      const asyncFn = jest.fn().mockRejectedValue(error);
      const wrappedFn = asyncHandler(asyncFn);
      
      // Act
      await wrappedFn(mockReq, mockRes, mockNext);
      
      // Assert
      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
}); 