import request from 'supertest';
import app from '../../src/app';
import { PinataService } from '../../src/services/pinata.service';

// Mock the PinataService
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

describe('API Integration Tests', () => {
  let pinataServiceInstance: any;

  beforeAll(() => {
    // Get the mocked PinataService instance
    pinataServiceInstance = new PinataService();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Health Check Endpoint', () => {
    it('should return 200 OK with status information', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
    });
  });

  describe('IPFS Endpoints', () => {
    describe('Pin JSON', () => {
      it('should successfully pin valid JSON data', async () => {
        // Mock the pinJSON method to return a successful response
        pinataServiceInstance.pinJSON.mockResolvedValue({
          IpfsHash: 'QmTest123',
          PinSize: 1000,
          Timestamp: new Date().toISOString()
        });

        const response = await request(app)
          .post('/api/ipfs/json')
          .send({
            data: { test: 'value' },
            metadata: { name: 'Test Pin' }
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('hash', 'QmTest123');
        expect(pinataServiceInstance.pinJSON).toHaveBeenCalled();
      });

      it('should return 400 for invalid JSON input', async () => {
        const response = await request(app)
          .post('/api/ipfs/json')
          .send({
            // Missing required 'data' field
            metadata: { name: 'Test Pin' }
          });

        expect(response.status).toBe(400);
        expect(pinataServiceInstance.pinJSON).not.toHaveBeenCalled();
      });

      it('should handle Pinata service errors', async () => {
        // Mock the pinJSON method to throw an error
        pinataServiceInstance.pinJSON.mockRejectedValue(new Error('Pinata service error'));

        const response = await request(app)
          .post('/api/ipfs/json')
          .send({
            data: { test: 'value' },
            metadata: { name: 'Test Pin' }
          });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('status', 'error');
        expect(pinataServiceInstance.pinJSON).toHaveBeenCalled();
      });
    });

    describe('Get Pin List', () => {
      it('should return a list of pins', async () => {
        // Mock the getPinList method to return a list of pins
        pinataServiceInstance.getPinList.mockResolvedValue({
          count: 2,
          rows: [
            {
              id: '1',
              ipfs_pin_hash: 'QmTest123',
              size: 1000,
              date_pinned: new Date().toISOString()
            },
            {
              id: '2',
              ipfs_pin_hash: 'QmTest456',
              size: 2000,
              date_pinned: new Date().toISOString()
            }
          ]
        });

        const response = await request(app).get('/api/ipfs/pins');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('items');
        expect(response.body.items).toHaveLength(2);
        expect(pinataServiceInstance.getPinList).toHaveBeenCalled();
      });

      it('should handle filtering parameters', async () => {
        // Mock the getPinList method
        pinataServiceInstance.getPinList.mockResolvedValue({
          count: 1,
          rows: [
            {
              id: '1',
              ipfs_pin_hash: 'QmTest123',
              size: 1000,
              date_pinned: new Date().toISOString()
            }
          ]
        });

        await request(app)
          .get('/api/ipfs/pins')
          .query({ status: 'pinned', limit: '10' });

        // Verify that the service was called with the correct parameters
        expect(pinataServiceInstance.getPinList).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'pinned',
            limit: 10
          })
        );
      });
    });

    describe('Unpin Content', () => {
      it('should successfully unpin existing content', async () => {
        // Mock the unpin method to return successfully
        pinataServiceInstance.unpin.mockResolvedValue(true);

        const response = await request(app).delete('/api/ipfs/pins/QmTest123');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(pinataServiceInstance.unpin).toHaveBeenCalledWith('QmTest123');
      });

      it('should return 400 for invalid hash format', async () => {
        const response = await request(app).delete('/api/ipfs/pins/invalid-hash-format');

        expect(response.status).toBe(400);
        expect(pinataServiceInstance.unpin).not.toHaveBeenCalled();
      });

      it('should handle service errors gracefully', async () => {
        // Mock the unpin method to throw an error
        pinataServiceInstance.unpin.mockRejectedValue(new Error('Hash not found'));

        const response = await request(app).delete('/api/ipfs/pins/QmTest123');

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('status', 'error');
      });
    });
  });

  describe('Security Features', () => {
    describe('Rate Limiting', () => {
      it('should allow requests under the rate limit', async () => {
        // Make a request that should be under the rate limit
        const response = await request(app).get('/api/health');
        
        expect(response.status).toBe(200);
        expect(response.headers).toHaveProperty('ratelimit-limit');
        expect(response.headers).toHaveProperty('ratelimit-remaining');
      });
    });

    describe('CORS Protection', () => {
      it('should include appropriate CORS headers', async () => {
        const response = await request(app).get('/api/health');
        
        // The exact headers will depend on your CORS configuration
        expect(response.headers).toHaveProperty('access-control-allow-origin');
      });
    });
  });
}); 