import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import cors from 'cors';

// Rate limiting configuration
export const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});

// CORS configuration
export const corsOptions = cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24 hours
});

// File upload configuration
const ALLOWED_FILE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain',
    'application/json'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
        cb(new Error('File type not allowed'));
        return;
    }
    cb(null, true);
};

// Request validation schemas
export const pinJSONSchema = z.object({
    json: z.any().refine(val => {
        try {
            JSON.stringify(val);
            return true;
        } catch {
            return false;
        }
    }, 'Invalid JSON format'),
    metadata: z.object({
        name: z.string().optional(),
        keyvalues: z.record(z.string()).optional()
    }).optional()
});

export const pinFileSchema = z.object({
    metadata: z.object({
        name: z.string().optional(),
        keyvalues: z.record(z.string()).optional()
    }).optional()
});

export const unpinSchema = z.object({
    hash: z.string().regex(/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/, 'Invalid IPFS hash format')
});

// Validation middleware
export const validateRequest = (schema: z.ZodSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                ...req.body,
                ...req.params,
                ...req.query
            });
            next();
        } catch (error) {
            // Handle Zod validation errors with proper type checking
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    status: 'fail',
                    message: 'Validation error',
                    errors: error.errors
                });
            } else {
                // Handle any other errors
                res.status(400).json({
                    status: 'fail',
                    message: 'Validation error',
                    errors: error instanceof Error ? (error as any).errors || [error.message] : ['Unknown error']
                });
            }
        }
    };
};

// Security headers middleware using helmet
export const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'https://api.pinata.cloud'],
        },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
});

// Error handling middleware
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);

    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            status: 'fail',
            message: 'File upload error',
            error: err.message
        });
    }

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            status: 'fail',
            message: 'Validation error',
            error: err.message
        });
    }

    if (err instanceof z.ZodError) {
        return res.status(400).json({
            status: 'fail',
            message: 'Validation error',
            errors: err.errors
        });
    }

    res.status(500).json({
        status: 'error',
        message: 'Internal server error'
    });
}; 