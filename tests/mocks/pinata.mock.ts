import { PinataResponse } from '../../src/types/pinata.types';

/**
 * Mock Pinata SDK for testing
 */
export const mockPinataSdk = {
  testAuthentication: jest.fn().mockResolvedValue(true),
  
  pinJSONToIPFS: jest.fn().mockImplementation((body, options) => {
    return Promise.resolve({
      IpfsHash: 'QmTest123456789',
      PinSize: 1000,
      Timestamp: new Date().toISOString()
    } as PinataResponse);
  }),
  
  pinFileToIPFS: jest.fn().mockImplementation((readStream, options) => {
    return Promise.resolve({
      IpfsHash: 'QmTest987654321',
      PinSize: 2000,
      Timestamp: new Date().toISOString()
    } as PinataResponse);
  }),
  
  pinList: jest.fn().mockImplementation((filters) => {
    return Promise.resolve({
      count: 2,
      rows: [
        {
          id: '1',
          ipfs_pin_hash: 'QmTest123456789',
          size: 1000,
          date_pinned: new Date().toISOString(),
          metadata: {
            name: 'Test Pin 1',
            keyvalues: {
              key1: 'value1'
            }
          }
        },
        {
          id: '2',
          ipfs_pin_hash: 'QmTest987654321',
          size: 2000,
          date_pinned: new Date().toISOString(),
          metadata: {
            name: 'Test Pin 2',
            keyvalues: {
              key2: 'value2'
            }
          }
        }
      ]
    });
  }),
  
  unpin: jest.fn().mockImplementation((hashToUnpin) => {
    return Promise.resolve({
      status: 200
    });
  }),
  
  // Mock methods that throw errors
  testAuthenticationError: jest.fn().mockRejectedValue(new Error('Authentication failed')),
  
  pinJSONToIPFSError: jest.fn().mockImplementation(() => {
    return Promise.reject(new Error('Failed to pin JSON'));
  }),
  
  pinFileToIPFSError: jest.fn().mockImplementation(() => {
    return Promise.reject(new Error('Failed to pin file'));
  }),
  
  pinListError: jest.fn().mockImplementation(() => {
    return Promise.reject(new Error('Failed to get pin list'));
  }),
  
  unpinError: jest.fn().mockImplementation(() => {
    return Promise.reject(new Error('Failed to unpin content'));
  })
}; 