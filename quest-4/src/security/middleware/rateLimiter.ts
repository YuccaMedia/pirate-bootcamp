import rateLimit from 'express-rate-limit';
import { SecurityConfig } from '../config/security.config';
import { SecurityErrorHandler } from '../utils/errorHandler';

export const createRateLimiter = () => {
    return rateLimit({
        windowMs: SecurityConfig.rateLimit.windowMs,
        max: SecurityConfig.rateLimit.max,
        standardHeaders: SecurityConfig.rateLimit.standardHeaders,
        legacyHeaders: SecurityConfig.rateLimit.legacyHeaders,
        handler: (req, res) => {
            const error = SecurityErrorHandler.createRateLimitError();
            res.status(error.statusCode).json(SecurityErrorHandler.handleError(error));
        },
        keyGenerator: (req) => {
            // Use both IP and wallet address (if available) for rate limiting
            const ip = req.ip;
            const walletAddress = req.headers['x-wallet-address'] || '';
            return `${ip}-${walletAddress}`;
        }
    });
}; 