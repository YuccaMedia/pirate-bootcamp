import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createRateLimiter } from './middleware/rateLimiter';
import { securityLogger } from './middleware/logging';
import { cspMiddleware } from './middleware/csp';
import { SecurityConfig } from './config/security.config';
import { SecurityLogger } from './middleware/logging';

export const setupSecurity = (app: Express) => {
    try {
        // Basic security with helmet
        app.use(helmet());

        // CORS configuration
        app.use(cors(SecurityConfig.api.cors));

        // Rate limiting
        app.use(createRateLimiter());

        // Security logging
        app.use(securityLogger);

        // Content Security Policy
        app.use(cspMiddleware);

        // Create logs directory
        const fs = require('fs');
        const path = require('path');
        const logsDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir);
        }

        SecurityLogger.info('Security middleware initialized successfully');
    } catch (error) {
        SecurityLogger.error('Failed to initialize security middleware', { error });
        throw error;
    }
}; 