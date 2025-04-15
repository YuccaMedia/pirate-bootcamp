import * as dotenv from 'dotenv';

// Set test environment variables before loading .env files
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.PINATA_API_KEY = process.env.PINATA_API_KEY || 'test-api-key';
process.env.PINATA_API_SECRET = process.env.PINATA_API_SECRET || 'test-api-secret';
process.env.PINATA_JWT = process.env.PINATA_JWT || 'test-jwt-token';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock Pinata service for tests
jest.mock('../services/pinata.service', () => {
    return {
        PinataService: jest.fn().mockImplementation(() => ({
            testConnection: jest.fn().mockResolvedValue(true),
            pinJSONToIPFS: jest.fn().mockResolvedValue({
                IpfsHash: 'test-hash',
                PinSize: 100,
                Timestamp: new Date().toISOString()
            }),
            pinFileToIPFS: jest.fn().mockResolvedValue({
                IpfsHash: 'test-file-hash',
                PinSize: 1000,
                Timestamp: new Date().toISOString()
            }),
            getPinList: jest.fn().mockResolvedValue({ 
                rows: [],
                count: 0
            }),
            unpin: jest.fn().mockResolvedValue(undefined)
        }))
    };
}); 