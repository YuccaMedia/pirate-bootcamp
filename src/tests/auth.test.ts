import request from 'supertest';
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import {
    authenticateJWT,
    authorize,
    authenticateAPIKey,
    sanitizeRequest
} from '../middleware/auth.middleware';

const app = express();
app.use(express.json());

// Test JWT secret
const JWT_SECRET = 'test-secret';

// Test routes
app.post('/protected',
    authenticateJWT,
    authorize('admin'),
    (req: Request, res: Response) => {
        res.json({ status: 'success' });
    }
);

app.post('/api/protected',
    authenticateAPIKey,
    (req: Request, res: Response) => {
        res.json({ status: 'success' });
    }
);

app.post('/sanitize',
    sanitizeRequest,
    (req: Request, res: Response) => {
        res.json({ data: req.body });
    }
);

describe('Authentication & Authorization', () => {
    describe('JWT Authentication', () => {
        it('should allow access with valid JWT token', async () => {
            const token = jwt.sign({ id: '1', role: 'admin' }, JWT_SECRET);

            const response = await request(app)
                .post('/protected')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
        });

        it('should reject access without token', async () => {
            const response = await request(app)
                .post('/protected');

            expect(response.status).toBe(401);
            expect(response.body.status).toBe('fail');
        });

        it('should reject invalid tokens', async () => {
            const response = await request(app)
                .post('/protected')
                .set('Authorization', 'Bearer invalid-token');

            expect(response.status).toBe(403);
            expect(response.body.status).toBe('fail');
        });
    });

    describe('Role-based Authorization', () => {
        it('should allow access to authorized roles', async () => {
            const token = jwt.sign({ id: '1', role: 'admin' }, JWT_SECRET);

            const response = await request(app)
                .post('/protected')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
        });

        it('should deny access to unauthorized roles', async () => {
            const token = jwt.sign({ id: '1', role: 'user' }, JWT_SECRET);

            const response = await request(app)
                .post('/protected')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(403);
        });
    });

    describe('API Key Authentication', () => {
        beforeAll(() => {
            process.env.API_KEY = 'test-api-key-12345678901234567890123456789012';
        });

        it('should allow access with valid API key', async () => {
            const response = await request(app)
                .post('/api/protected')
                .set('x-api-key', process.env.API_KEY as string);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('success');
        });

        it('should reject invalid API keys', async () => {
            const response = await request(app)
                .post('/api/protected')
                .set('x-api-key', 'invalid-key');

            expect(response.status).toBe(401);
            expect(response.body.status).toBe('fail');
        });
    });

    describe('Request Sanitization', () => {
        it('should sanitize XSS attempts in body', async () => {
            const response = await request(app)
                .post('/sanitize')
                .send({
                    name: '<script>alert("xss")</script>Hello',
                    description: 'javascript:alert("xss")'
                });

            expect(response.body.data.name).toBe('Hello');
            expect(response.body.data.description).toBe('alert("xss")');
        });

        it('should handle nested objects', async () => {
            const response = await request(app)
                .post('/sanitize')
                .send({
                    user: {
                        name: '<script>alert("xss")</script>John',
                        bio: 'javascript:alert("xss")'
                    }
                });

            expect(response.body.data.user.name).toBe('John');
            expect(response.body.data.user.bio).toBe('alert("xss")');
        });
    });
}); 