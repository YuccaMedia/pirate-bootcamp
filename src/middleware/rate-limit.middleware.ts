import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/error.utils';

export const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    handler: (req, res) => {
        throw new AppError('Too many requests, please try again later', 429);
    }
}); 