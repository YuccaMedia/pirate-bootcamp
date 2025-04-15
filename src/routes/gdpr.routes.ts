import express from 'express';
import { gdprController } from '../controllers/gdpr.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate-limit.middleware';

const router = express.Router();

// Apply rate limiting to all GDPR routes
router.use(rateLimiter);

// Get all data processing records (admin only)
router.get('/processing-records', 
    authMiddleware(['admin']), 
    gdprController.getProcessingRecords
);

// Submit a data subject request
router.post('/data-subject-requests', 
    authMiddleware(['user', 'stakeholder', 'admin']), 
    gdprController.submitDataSubjectRequest
);

// Get status of a data subject request
router.get('/data-subject-requests/:requestId', 
    authMiddleware(['user', 'stakeholder', 'admin']), 
    gdprController.getRequestStatus
);

export default router; 