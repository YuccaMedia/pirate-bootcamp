import rateLimit from 'express-rate-limit';
import { AppError } from '../utils/error.utils';

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res, next) => {
        throw new AppError('Too many requests, please try again later.', 429);
    }
}); 