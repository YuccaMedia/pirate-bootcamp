import { PinataService } from '../../services/pinata.service';
import { getIPFSGatewayURL } from '../../utils/ipfs.utils';
import * as fs from 'fs';
import * as path from 'path';

// Test Fixtures
const TEST_FILES = {
    small: {
        content: Buffer.from('Small test file content'),
        name: 'small-test.txt',
        type: 'text/plain'
    },
    medium: {
        content: Buffer.alloc(1024 * 1024), // 1MB
        name: 'medium-test.bin',
        type: 'application/octet-stream'
    },
    image: {
        content: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        name: 'test-image.png',
        type: 'image/png'
    }
};

const TEST_JSON = {
    simple: {
        name: 'Simple Test',
        description: 'A simple test object'
    },
    complex: {
        metadata: {
            name: 'Complex Test',
            description: 'A complex test object',
            version: '1.0.0'
        },
        attributes: Array(5).fill(null).map((_, i) => ({
            trait_type: `Trait ${i}`,
            value: `Value ${i}`
        }))
    }
};

// Test Utilities
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const isValidIPFSHash = (hash: string) => /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(hash);

// Only run these tests if PINATA_API_KEY is available
const runIntegrationTests = process.env.PINATA_API_KEY && process.env.RUN_INTEGRATION_TESTS;
// Choose describe or skip based on environment
const integrationDescribe = runIntegrationTests ? describe : describe.skip;

integrationDescribe('Pinata Integration Tests', () => {
    let pinataService: PinataService;
    let testHashes: string[] = [];

    beforeAll(async () => {
        pinataService = new PinataService();
        const isConnected = await pinataService.testConnection();
        expect(isConnected).toBe(true);
    });

    afterAll(async () => {
        // Cleanup with retries
        for (const hash of testHashes) {
            let retries = 3;
            while (retries > 0) {
                try {
                    await pinataService.unpin(hash);
                    break;
                } catch (error) {
                    console.warn(`Failed to unpin hash ${hash}, retries left: ${retries-1}`);
                    await wait(1000); // Wait 1 second before retry
                    retries--;
                }
            }
        }
    });

    describe('Connection Management', () => {
        it('should handle connection errors gracefully', async () => {
            const invalidService = new PinataService();
            // @ts-ignore - Intentionally break the JWT for testing
            invalidService.jwt = 'invalid-jwt';
            await expect(invalidService.testConnection()).resolves.toBe(false);
        });

        it('should handle rate limiting', async () => {
            const requests = Array(5).fill(null).map(() => 
                pinataService.pinJSONToIPFS(TEST_JSON.simple)
            );
            await expect(Promise.all(requests)).resolves.not.toThrow();
        });
    });

    describe('JSON Operations', () => {
        it('should pin simple JSON successfully', async () => {
            const result = await pinataService.pinJSONToIPFS(
                TEST_JSON.simple,
                { name: 'simple-test.json' }
            );

            expect(isValidIPFSHash(result.IpfsHash)).toBe(true);
            testHashes.push(result.IpfsHash);

            const response = await fetch(getIPFSGatewayURL(result.IpfsHash));
            const content = await response.json();
            expect(content).toEqual(TEST_JSON.simple);
        });

        it('should handle complex JSON with metadata', async () => {
            const result = await pinataService.pinJSONToIPFS(
                TEST_JSON.complex,
                {
                    name: 'complex-test.json',
                    keyvalues: {
                        type: 'metadata',
                        version: '1.0.0'
                    }
                }
            );

            expect(isValidIPFSHash(result.IpfsHash)).toBe(true);
            testHashes.push(result.IpfsHash);
        });
    });

    describe('File Operations', () => {
        Object.entries(TEST_FILES).forEach(([size, file]) => {
            it(`should handle ${size} file upload`, async () => {
                const result = await pinataService.pinFileToIPFS(
                    file.content,
                    {
                        name: file.name,
                        keyvalues: {
                            type: file.type,
                            size: file.content.length.toString()
                        }
                    }
                );

                expect(isValidIPFSHash(result.IpfsHash)).toBe(true);
                testHashes.push(result.IpfsHash);

                const response = await fetch(getIPFSGatewayURL(result.IpfsHash));
                expect(response.ok).toBe(true);
                expect(response.headers.get('content-type')).toContain(file.type);
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid file data', async () => {
            await expect(
                pinataService.pinFileToIPFS(null as any)
            ).rejects.toThrow();
        });

        it('should handle invalid JSON data', async () => {
            const circular: any = { prop: 'value' };
            circular.self = circular;
            await expect(
                pinataService.pinJSONToIPFS(circular)
            ).rejects.toThrow();
        });

        it('should handle network timeouts', async () => {
            // Simulate slow network
            jest.setTimeout(10000);
            const largeData = { data: Array(10000).fill('test') };
            await expect(
                pinataService.pinJSONToIPFS(largeData)
            ).resolves.toBeDefined();
        });
    });

    describe('Performance', () => {
        it('should handle concurrent uploads', async () => {
            const uploads = Array(3).fill(null).map((_, i) => 
                pinataService.pinJSONToIPFS(
                    { test: `concurrent-${i}` },
                    { name: `concurrent-${i}.json` }
                )
            );

            const results = await Promise.all(uploads);
            results.forEach(result => {
                expect(isValidIPFSHash(result.IpfsHash)).toBe(true);
                testHashes.push(result.IpfsHash);
            });
        });
    });
}); 