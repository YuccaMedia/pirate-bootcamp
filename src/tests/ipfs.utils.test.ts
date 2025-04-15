import { getIPFSGatewayURL, extractIPFSHash, isValidIPFSHash } from '../utils/ipfs.utils';

describe('IPFS Utilities', () => {
    describe('getIPFSGatewayURL', () => {
        it('should generate correct gateway URL with default gateway', () => {
            const hash = 'QmTest123';
            const url = getIPFSGatewayURL(hash);
            expect(url).toBe('https://gateway.pinata.cloud/ipfs/QmTest123');
        });

        it('should generate correct gateway URL with custom gateway', () => {
            const hash = 'QmTest123';
            const gateway = 'https://ipfs.io';
            const url = getIPFSGatewayURL(hash, gateway);
            expect(url).toBe('https://ipfs.io/ipfs/QmTest123');
        });
    });

    describe('extractIPFSHash', () => {
        it('should extract hash from gateway URL', () => {
            const url = 'https://gateway.pinata.cloud/ipfs/QmTest123';
            const hash = extractIPFSHash(url);
            expect(hash).toBe('QmTest123');
        });

        it('should return null for invalid URL', () => {
            const url = 'https://example.com/invalid';
            const hash = extractIPFSHash(url);
            expect(hash).toBeNull();
        });
    });

    describe('isValidIPFSHash', () => {
        it('should validate correct IPFS hash', () => {
            const hash = 'QmPK1s3pNYLi9ERiq3BDxKa4XosgWwFRQUydHUtz4YgpqB';
            expect(isValidIPFSHash(hash)).toBe(true);
        });

        it('should reject invalid IPFS hash', () => {
            const hash = 'invalid-hash';
            expect(isValidIPFSHash(hash)).toBe(false);
        });

        it('should reject empty string', () => {
            expect(isValidIPFSHash('')).toBe(false);
        });
    });
}); 