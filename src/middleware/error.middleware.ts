import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, ErrorResponse, ErrorType } from '../types/error.types';
import { env } from '../config/env.config';

export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            status: err.statusCode < 500 ? 'fail' : 'error',
            message: err.message,
        });
        return;
    }

    // Handle unknown errors
    console.error('ERROR 💥', err);
    res.status(500).json({
        status: 'error',
        message: 'Something went wrong',
    });
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