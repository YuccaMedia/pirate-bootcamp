import { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';

// Redis client for session storage
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        tls: process.env.NODE_ENV === 'production',
        rejectUnauthorized: false
    }
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.connect().catch(console.error);

// Session configuration
export const sessionMiddleware = session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    name: 'sessionId', // Don't use default connect.sid
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'strict',
        domain: process.env.COOKIE_DOMAIN || undefined
    },
    genid: () => uuidv4() // Use UUID for session IDs
});

// Session activity tracker
export const sessionActivityTracker = (req: Request, res: Response, next: NextFunction) => {
    if (req.session) {
        const now = Date.now();
        const lastActivity = req.session.lastActivity || now;
        const inactivityTimeout = 30 * 60 * 1000; // 30 minutes

        if (now - lastActivity > inactivityTimeout) {
            return req.session.destroy((err) => {
                if (err) {
                    console.error('Session destruction error:', err);
                }
                res.status(440).json({
                    status: 'fail',
                    message: 'Session expired'
                });
            });
        }

        req.session.lastActivity = now;
    }
    next();
};

// Session security headers
export const sessionSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    });
    next();
};

// MFA verification middleware
export const requireMFA = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.mfaVerified) {
        return res.status(403).json({
            status: 'fail',
            message: 'MFA verification required'
        });
    }
    next();
};

// Session cleanup on logout
export const clearSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await new Promise<void>((resolve, reject) => {
            req.session.destroy((err) => {
                if (err) reject(err);
                res.clearCookie('sessionId');
                resolve();
            });
        });
        next();
    } catch (error) {
        next(error);
    }
};

// Rate limiting for session operations
const sessionOperations: { [key: string]: number[] } = {};
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_SESSION_OPERATIONS = 100;

export const sessionRateLimiter = (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const ip = req.ip;

    // Initialize or clean up old operations
    sessionOperations[ip] = (sessionOperations[ip] || []).filter(
        time => now - time < RATE_LIMIT_WINDOW
    );

    if (sessionOperations[ip].length >= MAX_SESSION_OPERATIONS) {
        return res.status(429).json({
            status: 'fail',
            message: 'Too many session operations'
        });
    }

    sessionOperations[ip].push(now);
    next();
}; 