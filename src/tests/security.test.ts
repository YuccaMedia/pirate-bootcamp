import request from 'supertest';
import express, { Request, Response } from 'express';
import { rateLimiter, corsOptions, validateRequest, pinJSONSchema, pinFileSchema, unpinSchema } from '../middleware/security.middleware';
import multer from 'multer';

const app = express();
app.use(express.json());
app.use(corsOptions);

// Test routes
app.post('/test/json', validateRequest(pinJSONSchema), (req: Request, res: Response) => {
    res.json({ status: 'success' });
});

app.post('/test/file', validateRequest(pinFileSchema), (req: Request, res: Response) => {
    res.json({ status: 'success' });
});

app.delete('/test/unpin/:hash', validateRequest(unpinSchema), (req: Request, res: Response) => {
    res.json({ status: 'success' });
});

app.get('/test/rate-limit', rateLimiter, (req: Request, res: Response) => {
    res.json({ status: 'success' });
});

describe('Security Middleware', () => {
    describe('Request Validation', () => {
        it('should validate valid JSON data', async () => {
            const response = await request(app)
                .post('/test/json')
                .send({
                    json: { test: 'data' },
                    metadata: { name: 'test' }
                });

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
        });

        it('should reject invalid JSON data', async () => {
            const circular: any = { prop: 'value' };
            circular.self = circular;

            const response = await request(app)
                .post('/test/json')
                .send({
                    json: circular,
                    metadata: { name: 'test' }
                });

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('fail');
        });

        it('should validate IPFS hash format', async () => {
            const response = await request(app)
                .delete('/test/unpin/invalidhash');

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('fail');
        });
    });

    describe('Rate Limiting', () => {
        it('should allow requests within rate limit', async () => {
            const response = await request(app)
                .get('/test/rate-limit');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
        });

        it('should block excessive requests', async () => {
            // Make 101 requests (above our 100 limit)
            const requests = Array(101).fill(null).map(() =>
                request(app).get('/test/rate-limit')
            );

            const responses = await Promise.all(requests);
            const blockedRequests = responses.filter(r => r.status === 429);
            expect(blockedRequests.length).toBeGreaterThan(0);
        });
    });

    describe('CORS', () => {
        it('should allow requests from allowed origins', async () => {
            const response = await request(app)
                .post('/test/json')
                .set('Origin', 'http://localhost:3000')
                .send({
                    json: { test: 'data' }
                });

            expect(response.headers['access-control-allow-origin']).toBeDefined();
        });

        it('should handle preflight requests', async () => {
            const response = await request(app)
                .options('/test/json')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'POST');

            expect(response.headers['access-control-allow-methods']).toBeDefined();
        });
    });

    describe('File Upload Security', () => {
        const upload = multer({
            storage: multer.memoryStorage(),
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.startsWith('image/')) {
                    cb(new Error('Only images are allowed'));
                    return;
                }
                cb(null, true);
            },
            limits: {
                fileSize: 1024 * 1024 // 1MB
            }
        });

        const fileApp = express();
        fileApp.post('/upload', upload.single('file'), (req, res) => {
            res.json({ status: 'success' });
        });

        it('should reject files exceeding size limit', async () => {
            const largeBuf = Buffer.alloc(2 * 1024 * 1024); // 2MB
            const response = await request(fileApp)
                .post('/upload')
                .attach('file', largeBuf, 'large.jpg');

            expect(response.status).toBe(400);
        });

        it('should reject files with invalid types', async () => {
            const response = await request(fileApp)
                .post('/upload')
                .attach('file', Buffer.from('test'), 'test.exe');

            expect(response.status).toBe(400);
        });
    });
}); 