import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ErrorResponse, ErrorType } from '../types/error.types';
import { env } from '../config/env.config';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let statusCode = 500;
    let errorResponse: ErrorResponse = {
        status: 'error',
        message: 'Internal Server Error'
    };

    // Handle known error types
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        errorResponse = {
            status: statusCode >= 500 ? 'error' : 'fail',
            message: err.message
        };
    } else if (err instanceof ZodError) {
        statusCode = 400;
        errorResponse = {
            status: 'fail',
            message: 'Validation Error',
            details: err.errors
        };
    }

    // Add stack trace in development
    if (env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
    }

    res.status(statusCode).json(errorResponse);
};

export const notFoundHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const err = new AppError(
        `Cannot find ${req.method} ${req.originalUrl} on this server`,
        404
    );
    next(err);
};

export const asyncHandler = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}; 