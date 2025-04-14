import { SecurityConfig } from '../config/security.config';

export class SecurityError extends Error {
    public code: string;
    public statusCode: number;
    public details?: any;

    constructor(message: string, code: string, statusCode: number = 400, details?: any) {
        super(message);
        this.name = 'SecurityError';
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
    }
}

export class SecurityErrorHandler {
    /**
     * Handles security-related errors
     */
    static handleError(error: any): { 
        message: string;
        code: string;
        statusCode: number;
        details?: any;
    } {
        // If it's already a SecurityError, process it
        if (error instanceof SecurityError) {
            return this.formatError(error);
        }

        // Handle known error types
        if (error.name === 'TransactionError') {
            return this.formatError(new SecurityError(
                'Transaction failed',
                'TRANSACTION_ERROR',
                400,
                SecurityConfig.errors.showStackTrace ? error : undefined
            ));
        }

        if (error.name === 'ValidationError') {
            return this.formatError(new SecurityError(
                'Validation failed',
                'VALIDATION_ERROR',
                400,
                SecurityConfig.errors.showStackTrace ? error : undefined
            ));
        }

        // Generic error handling
        return this.formatError(new SecurityError(
            'An unexpected error occurred',
            'INTERNAL_ERROR',
            500,
            SecurityConfig.errors.showStackTrace ? error : undefined
        ));
    }

    /**
     * Formats error for response
     */
    private static formatError(error: SecurityError) {
        // Log error if configured
        if (SecurityConfig.errors.logErrors) {
            console.error('Security Error:', {
                message: error.message,
                code: error.code,
                stack: error.stack,
                details: error.details
            });
        }

        // Sanitize error details in production
        const sanitizedError = {
            message: error.message,
            code: error.code,
            statusCode: error.statusCode,
            details: SecurityConfig.errors.showStackTrace ? error.details : undefined
        };

        return sanitizedError;
    }

    /**
     * Creates a security error for invalid input
     */
    static createInputValidationError(field: string): SecurityError {
        return new SecurityError(
            `Invalid input for field: ${field}`,
            'INVALID_INPUT',
            400
        );
    }

    /**
     * Creates a security error for unauthorized access
     */
    static createUnauthorizedError(reason: string): SecurityError {
        return new SecurityError(
            `Unauthorized: ${reason}`,
            'UNAUTHORIZED',
            401
        );
    }

    /**
     * Creates a security error for forbidden actions
     */
    static createForbiddenError(action: string): SecurityError {
        return new SecurityError(
            `Forbidden action: ${action}`,
            'FORBIDDEN',
            403
        );
    }

    /**
     * Creates a security error for rate limiting
     */
    static createRateLimitError(): SecurityError {
        return new SecurityError(
            'Too many requests',
            'RATE_LIMIT_EXCEEDED',
            429
        );
    }
} 