import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { AppError } from '../utils/error.utils';
import { GDPRService } from '../services/gdpr.service';
import { z } from 'zod';

const gdprService = new GDPRService();

const DataSubjectRequestSchema = z.object({
    type: z.enum(['access', 'deletion', 'rectification']),
    subjectId: z.string().min(1)
});

export const gdprController = {
    // Get all data processing records
    getProcessingRecords: asyncHandler(async (req: Request, res: Response) => {
        const records = gdprService.getProcessingRecords();
        res.json({ records });
    }),

    // Submit a data subject request
    submitDataSubjectRequest: asyncHandler(async (req: Request, res: Response) => {
        const validationResult = DataSubjectRequestSchema.safeParse(req.body);
        if (!validationResult.success) {
            throw new AppError('Invalid request data', 400);
        }

        const request = validationResult.data;
        const requestId = await gdprService.processDataSubjectRequest(request);

        res.status(202).json({
            message: 'Data subject request received',
            requestId
        });
    }),

    // Get status of a data subject request
    getRequestStatus: asyncHandler(async (req: Request, res: Response) => {
        const { requestId } = req.params;
        const request = gdprService.getSubjectRequest(requestId);

        if (!request) {
            throw new AppError('Request not found', 404);
        }

        res.json({ request });
    })
}; 