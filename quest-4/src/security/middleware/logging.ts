import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { SecurityConfig } from '../config/security.config';

// Create Winston logger
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        // Write all logs to console
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        }),
        // Write all logs to security.log
        new winston.transports.File({ 
            filename: 'logs/security.log',
            level: 'info'
        }),
        // Write all errors to error.log
        new winston.transports.File({ 
            filename: 'logs/error.log',
            level: 'error'
        })
    ]
});

export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
    // Log request details
    const startTime = Date.now();
    const requestLog = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        walletAddress: req.headers['x-wallet-address'],
        requestId: req.headers['x-request-id'],
    };

    // Log request
    logger.info('Incoming request', requestLog);

    // Log response
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        const responseLog = {
            ...requestLog,
            statusCode: res.statusCode,
            responseTime,
        };

        if (res.statusCode >= 400) {
            logger.error('Request error', responseLog);
        } else {
            logger.info('Request completed', responseLog);
        }
    });

    next();
};

// Export logger for use in other parts of the application
export const SecurityLogger = {
    info: (message: string, meta?: any) => logger.info(message, meta),
    error: (message: string, meta?: any) => logger.error(message, meta),
    warn: (message: string, meta?: any) => logger.warn(message, meta),
    debug: (message: string, meta?: any) => logger.debug(message, meta),
}; 