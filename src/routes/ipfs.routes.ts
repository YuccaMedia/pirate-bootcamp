import { Router } from 'express';
import multer from 'multer';
import { ipfsController } from '../controllers/ipfs.controller';
import {
    rateLimiter,
    corsOptions,
    fileFilter,
    validateRequest,
    pinJSONSchema,
    pinFileSchema,
    unpinSchema,
    securityHeaders
} from '../middleware/security.middleware';
import {
    authenticateJWT,
    authorize,
    authenticateAPIKey,
    requestLogger,
    sanitizeRequest
} from '../middleware/auth.middleware';
import { register } from 'prom-client';
import { Request, Response, NextFunction } from 'express';

const router = Router();

// Configure multer with security options
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    }
});

// Apply security middleware to all routes
router.use(corsOptions);
router.use(securityHeaders);
router.use(rateLimiter);
router.use(requestLogger);
router.use(sanitizeRequest);

// Require authentication for all routes
router.use(authenticateJWT);

// Routes with validation and authorization
router.post('/json',
    authorize(['admin', 'user']),
    validateRequest(pinJSONSchema),
    ipfsController.pinJSON
);

router.post('/file',
    authorize(['admin', 'user']),
    upload.single('file'),
    validateRequest(pinFileSchema),
    ipfsController.pinFile
);

router.get('/pins',
    authorize(['admin', 'user', 'viewer']),
    ipfsController.getPinList
);

router.delete('/unpin/:hash',
    authorize(['admin']),
    validateRequest(unpinSchema),
    ipfsController.unpin
);

// API endpoints that use API key authentication instead of JWT
router.post('/api/json',
    authenticateAPIKey,
    validateRequest(pinJSONSchema),
    ipfsController.pinJSON
);

router.post('/api/file',
    authenticateAPIKey,
    upload.single('file'),
    validateRequest(pinFileSchema),
    ipfsController.pinFile
);

router.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

export default router; 