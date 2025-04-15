import request from 'supertest';
import express from 'express';
import multer from 'multer';
import { ipfsController } from '../controllers/ipfs.controller';
import { errorHandler } from '../middleware/error.middleware';

const app = express();
app.use(express.json());

// Setup multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Setup routes for testing
app.post('/api/ipfs/json', ipfsController.pinJSON);
app.post('/api/ipfs/file', upload.single('file'), ipfsController.pinFile);
app.get('/api/ipfs/pins', ipfsController.getPinList);
app.delete('/api/ipfs/unpin/:hash', ipfsController.unpin);

// Add error handling
app.use(errorHandler);

describe('IPFS Controller', () => {
    describe('POST /api/ipfs/json', () => {
        it('should pin JSON to IPFS successfully', async () => {
            const response = await request(app)
                .post('/api/ipfs/json')
                .send({
                    json: { test: 'data' },
                    metadata: { name: 'test-json' }
                });

            expect(response.status).toBe(201);
            expect(response.body.status).toBe('success');
            expect(response.body.data).toHaveProperty('IpfsHash');
            expect(response.body.data).toHaveProperty('PinSize');
            expect(response.body.data).toHaveProperty('Timestamp');
        });

        it('should handle complex JSON objects', async () => {
            const response = await request(app)
                .post('/api/ipfs/json')
                .send({
                    json: {
                        nested: { data: [1, 2, 3] },
                        date: new Date().toISOString(),
                        nullValue: null
                    }
                });

            expect(response.status).toBe(201);
            expect(response.body.status).toBe('success');
        });

        it('should return 400 for missing JSON data', async () => {
            const response = await request(app)
                .post('/api/ipfs/json')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('fail');
        });

        it('should validate metadata format', async () => {
            const response = await request(app)
                .post('/api/ipfs/json')
                .send({
                    json: { test: 'data' },
                    metadata: { invalidField: 123 } // Should be string
                });

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('fail');
        });

        it('should handle empty objects', async () => {
            const response = await request(app)
                .post('/api/ipfs/json')
                .send({
                    json: {},
                    metadata: { name: 'empty-object' }
                });

            expect(response.status).toBe(201);
            expect(response.body.status).toBe('success');
        });

        it('should handle very large JSON objects', async () => {
            const largeObject = {
                data: Array(1000).fill({ field: 'test', value: 'data' })
            };
            const response = await request(app)
                .post('/api/ipfs/json')
                .send({
                    json: largeObject,
                    metadata: { name: 'large-json' }
                });

            expect(response.status).toBe(201);
            expect(response.body.status).toBe('success');
        });

        it('should reject invalid JSON structures', async () => {
            const circularRef: any = { prop: 'value' };
            circularRef.circular = circularRef;

            const response = await request(app)
                .post('/api/ipfs/json')
                .send({
                    json: circularRef,
                    metadata: { name: 'circular-json' }
                });

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('fail');
        });
    });

    describe('POST /api/ipfs/file', () => {
        it('should pin file to IPFS successfully', async () => {
            const response = await request(app)
                .post('/api/ipfs/file')
                .attach('file', Buffer.from('test content'), 'test.txt')
                .field('metadata', JSON.stringify({ name: 'test-file' }));

            expect(response.status).toBe(201);
            expect(response.body.status).toBe('success');
            expect(response.body.data).toHaveProperty('IpfsHash');
        });

        it('should handle large files', async () => {
            const largeBuffer = Buffer.alloc(1024 * 1024); // 1MB file
            const response = await request(app)
                .post('/api/ipfs/file')
                .attach('file', largeBuffer, 'large.bin');

            expect(response.status).toBe(201);
            expect(response.body.status).toBe('success');
        });

        it('should return 400 for missing file', async () => {
            const response = await request(app)
                .post('/api/ipfs/file')
                .field('metadata', JSON.stringify({ name: 'test-file' }));

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('fail');
        });

        it('should handle invalid metadata format', async () => {
            const response = await request(app)
                .post('/api/ipfs/file')
                .attach('file', Buffer.from('test'), 'test.txt')
                .field('metadata', 'invalid-json');

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('fail');
        });

        it('should handle empty files', async () => {
            const response = await request(app)
                .post('/api/ipfs/file')
                .attach('file', Buffer.from(''), 'empty.txt')
                .field('metadata', JSON.stringify({ name: 'empty-file' }));

            expect(response.status).toBe(201);
            expect(response.body.status).toBe('success');
        });

        it('should handle files with special characters in name', async () => {
            const response = await request(app)
                .post('/api/ipfs/file')
                .attach('file', Buffer.from('test'), 'test@#$%.txt')
                .field('metadata', JSON.stringify({ name: 'special-chars' }));

            expect(response.status).toBe(201);
            expect(response.body.status).toBe('success');
        });

        it('should reject unsupported file types', async () => {
            const response = await request(app)
                .post('/api/ipfs/file')
                .attach('file', Buffer.from('test'), 'test.exe')
                .field('metadata', JSON.stringify({ name: 'executable' }));

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('fail');
        });
    });

    describe('GET /api/ipfs/pins', () => {
        it('should return pin list successfully', async () => {
            const response = await request(app)
                .get('/api/ipfs/pins');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.data).toHaveProperty('rows');
            expect(Array.isArray(response.body.data.rows)).toBe(true);
        });

        it('should handle pagination parameters', async () => {
            const response = await request(app)
                .get('/api/ipfs/pins')
                .query({ limit: 5, offset: 0 });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(Array.isArray(response.body.data.rows)).toBe(true);
            expect(response.body.data.rows.length).toBeLessThanOrEqual(5);
        });

        it('should handle invalid pagination parameters', async () => {
            const response = await request(app)
                .get('/api/ipfs/pins')
                .query({ limit: -1, offset: 'invalid' });

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('fail');
        });
    });

    describe('DELETE /api/ipfs/unpin/:hash', () => {
        it('should unpin content successfully', async () => {
            const response = await request(app)
                .delete('/api/ipfs/unpin/test-hash');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
            expect(response.body.message).toBe('Content unpinned successfully');
        });

        it('should return 404 for missing hash', async () => {
            const response = await request(app)
                .delete('/api/ipfs/unpin/');

            expect(response.status).toBe(404);
        });

        it('should handle invalid hash format', async () => {
            const response = await request(app)
                .delete('/api/ipfs/unpin/invalid-hash-format');

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('fail');
        });

        it('should handle non-existent hash', async () => {
            const response = await request(app)
                .delete('/api/ipfs/unpin/QmNonExistentHash');

            expect(response.status).toBe(404);
            expect(response.body.status).toBe('fail');
        });

        it('should reject hash with invalid length', async () => {
            const response = await request(app)
                .delete('/api/ipfs/unpin/tooshort');

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('fail');
        });
    });
}); 