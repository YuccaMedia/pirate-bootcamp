import { Request, Response } from 'express';
import { ipfsController } from '../../src/controllers/ipfs.controller';
import { PinataService } from '../../src/services/pinata.service';
import { AppError } from '../../src/utils/error.utils';

// Mock PinataService
jest.mock('../../src/services/pinata.service', () => {
  return {
    PinataService: jest.fn().mockImplementation(() => {
      return {
        pinJSON: jest.fn(),
        pinFile: jest.fn(),
        getPinList: jest.fn(),
        unpin: jest.fn()
      };
    })
  };
});

describe('IPFS Controller Security Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let pinataServiceInstance: PinataService;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock request, response, and next
    mockReq = {
      body: {},
      file: undefined,
      query: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
    
    // Get the mocked instance
    pinataServiceInstance = new PinataService();
  });

  describe('pinJSON', () => {
    it('should reject invalid JSON data', async () => {
      // Arrange: Setup invalid data
      mockReq.body = {
        // Missing required 'data' field
        metadata: {
          name: 'Test Pin'
        }
      };

      // Act: Call the controller method
      await ipfsController.pinJSON(mockReq as Request, mockRes as Response, mockNext);

      // Assert: Check if next was called with an error
      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('data');
      expect(error.statusCode).toBe(400);
    });

    it('should sanitize metadata to prevent injection attacks', async () => {
      // Arrange: Setup potentially malicious metadata
      mockReq.body = {
        data: { test: 'value' },
        metadata: {
          name: '<script>alert("XSS")</script>',
          keyvalues: {
            dangerous: '{"$ne": null}', // NoSQL injection attempt
            malicious: '<img src=x onerror=alert(1)>'
          }
        }
      };

      // Configure mock to return successfully
      (pinataServiceInstance.pinJSON as jest.Mock).mockResolvedValue({
        IpfsHash: 'test-hash',
        PinSize: 1000,
        Timestamp: new Date().toISOString()
      });

      // Act: Call the controller method
      await ipfsController.pinJSON(mockReq as Request, mockRes as Response, mockNext);

      // Assert: Check what was passed to pinataService.pinJSON
      expect(pinataServiceInstance.pinJSON).toHaveBeenCalled();
      const passedMetadata = (pinataServiceInstance.pinJSON as jest.Mock).mock.calls[0][1];
      
      // Verify sanitization occurred
      expect(passedMetadata.name).not.toContain('<script>');
      if (passedMetadata.keyvalues) {
        expect(passedMetadata.keyvalues.dangerous).not.toContain('$ne');
        expect(passedMetadata.keyvalues.malicious).not.toContain('onerror');
      }
    });
  });

  describe('unpin', () => {
    it('should reject invalid hash formats to prevent path traversal', async () => {
      // Arrange: Setup invalid hash with path traversal attempt
      mockReq.params = {
        hash: '../../../etc/passwd'
      };

      // Act: Call the controller method
      await ipfsController.unpin(mockReq as Request, mockRes as Response, mockNext);

      // Assert: Check if next was called with an error
      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error.statusCode).toBe(400);
    });

    it('should properly handle authentication errors', async () => {
      // Arrange: Setup valid hash
      mockReq.params = {
        hash: 'QmValidHash123456789'
      };

      // Configure mock to throw authentication error
      (pinataServiceInstance.unpin as jest.Mock).mockRejectedValue(
        new AppError('Authentication failed', 401)
      );

      // Act: Call the controller method
      await ipfsController.unpin(mockReq as Request, mockRes as Response, mockNext);

      // Assert: Check if next was called with the correct error
      expect(mockNext).toHaveBeenCalled();
      const error = mockNext.mock.calls[0][0];
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(401);
      expect(error.message).toContain('Authentication failed');
    });
  });

  // Add more security tests for other methods...
}); 