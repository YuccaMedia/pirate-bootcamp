import express from 'express';
import dotenv from 'dotenv';
import { setupSecurity } from './security/setup';
import { SecurityLogger } from './security/middleware/logging';
import { SecurityErrorHandler } from './security/utils/errorHandler';
import { createSecureConnection } from './security/config/security.config';

// Load environment variables
dotenv.config();

// Create Express application
const app = express();

// Initialize security setup
setupSecurity(app);

// Parse JSON bodies
app.use(express.json());

// Create secure Solana connection
const connection = createSecureConnection();

// Basic health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const errorResponse = SecurityErrorHandler.handleError(err);
    res.status(errorResponse.statusCode).json(errorResponse);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    SecurityLogger.info(`Server started on port ${PORT}`);
}); 