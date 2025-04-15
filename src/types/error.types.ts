export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

export interface ErrorResponse {
    status: 'error' | 'fail';
    message: string;
    stack?: string;
    details?: unknown;
}

export const ErrorType = {
    VALIDATION_ERROR: 'ValidationError',
    NOT_FOUND: 'NotFoundError',
    UNAUTHORIZED: 'UnauthorizedError',
    FORBIDDEN: 'ForbiddenError',
    INTERNAL_SERVER: 'InternalServerError',
} as const; 