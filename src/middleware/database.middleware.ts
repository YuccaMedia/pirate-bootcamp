import { Pool } from 'pg';
import { Request, Response, NextFunction } from 'express';
import sqlstring from 'sqlstring';

// Database connection pool
export const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: process.env.NODE_ENV === 'production',
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// SQL injection prevention
export const sanitizeQuery = (query: string, params: any[]): string => {
    return sqlstring.format(query, params);
};

// Database query logging middleware
export const queryLogger = (req: Request, res: Response, next: NextFunction) => {
    const originalQuery = (pool as any).query;
    (pool as any).query = async (...args: any[]) => {
        const start = Date.now();
        try {
            const result = await originalQuery.apply(pool, args);
            const duration = Date.now() - start;
            console.log('Executed query', {
                query: args[0],
                duration,
                rows: result.rowCount,
                timestamp: new Date().toISOString()
            });
            return result;
        } catch (error) {
            console.error('Query error', {
                query: args[0],
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        }
    };
    next();
};

// Database error handling middleware
export const databaseErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (err.code && err.code.startsWith('23')) { // PostgreSQL constraint violation errors
        return res.status(400).json({
            status: 'fail',
            message: 'Database constraint violation',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Invalid data'
        });
    }
    if (err.code && err.code.startsWith('28')) { // PostgreSQL authentication errors
        console.error('Database authentication error:', err);
        return res.status(500).json({
            status: 'error',
            message: 'Database authentication error'
        });
    }
    next(err);
};

// Database connection check middleware
export const checkDatabaseConnection = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        next();
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Database connection error'
        });
    }
}; 