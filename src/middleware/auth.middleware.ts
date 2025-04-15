import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { z } from 'zod';
import { SecurityLogger } from '../services/security-logger.service';
import { AppError } from '../utils/error.utils';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';

// API Key validation
const API_KEY_SCHEMA = z.string().min(32);

interface AuthTokenPayload {
    userId: string;
    role: string;
    exp: number;
}

const securityLogger = new SecurityLogger();

/**
 * Authentication levels for API access
 */
export enum AuthLevel {
    PUBLIC = 'public',
    USER = 'user',
    STAKEHOLDER = 'stakeholder',
    ADMIN = 'admin'
}

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
    authLevel?: AuthLevel;
}

// JWT Authentication middleware
export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        res.status(401).json({ error: 'Authorization header is required' });
        return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        res.status(401).json({ error: 'JWT token is required' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'default-secret') as AuthTokenPayload;
        
        // Check if token is expired
        const now = Math.floor(Date.now() / 1000);
        if (decoded.exp < now) {
            res.status(401).json({ error: 'Token has expired' });
            return;
        }
        
        // Attach user info to request
        req.user = {
            id: decoded.userId,
            role: decoded.role
        };
        
        // Map role to auth level
        let authLevel: AuthLevel = AuthLevel.PUBLIC;
        switch (decoded.role) {
            case 'admin':
                authLevel = AuthLevel.ADMIN;
                break;
            case 'stakeholder':
                authLevel = AuthLevel.STAKEHOLDER;
                break;
            case 'user':
                authLevel = AuthLevel.USER;
                break;
        }
        
        req.authLevel = authLevel;
        
        next();
    } catch (error) {
        // Log failed authentication
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        securityLogger.logAuthEvent(
            'failed_login',
            'unknown',
            clientIp,
            req.headers['user-agent'] || 'unknown',
            'failure',
            { error: error instanceof Error ? error.message : 'Invalid token' }
        ).catch(console.error);
        
        res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// Role-based authorization middleware
export const authorize = (allowedRoles: string[]): (req: Request, res: Response, next: NextFunction) => void => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const authReq = req as AuthenticatedRequest;
        if (!authReq.user || !allowedRoles.includes(authReq.user.role)) {
            res.status(403).json({
                status: 'fail',
                message: 'Insufficient permissions'
            });
            return;
        }
        next();
    };
};

// API Key authentication middleware
export const authenticateAPIKey = (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
        res.status(401).json({ error: 'API key is required' });
        return;
    }
    
    let authLevel: AuthLevel = AuthLevel.PUBLIC;
    
    // Check API keys from environment variables
    if (apiKey === process.env.MASTERKEY_ADMIN) {
        authLevel = AuthLevel.ADMIN;
    } else if (apiKey === process.env.USERKEY_DEV) {
        authLevel = AuthLevel.USER;
    } else if (apiKey === process.env.STAKEHOLDER_KEY) {
        authLevel = AuthLevel.STAKEHOLDER;
    } else {
        // Log unauthorized access attempt
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        securityLogger.logAuthEvent(
            'failed_login',
            'unknown',
            clientIp,
            req.headers['user-agent'] || 'unknown',
            'failure',
            { apiKey: apiKey.substring(0, 5) + '...' }
        ).catch(console.error);
        
        res.status(403).json({ error: 'Invalid API key' });
        return;
    }
    
    // Attach auth level to request for use in route handlers
    req.authLevel = authLevel;
    
    // Log successful authentication
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    securityLogger.logAuthEvent(
        'login',
        authLevel,
        clientIp,
        req.headers['user-agent'] || 'unknown',
        'success',
        { authLevel }
    ).catch(console.error);
    
    next();
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];

    console.log(`[${timestamp}] ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`);
    next();
};

// IP whitelist middleware
export const ipWhitelist = (allowedIPs: string[]): (req: Request, res: Response, next: NextFunction) => void => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const clientIP = req.ip || '';
        if (!clientIP || !allowedIPs.includes(clientIP)) {
            res.status(403).json({
                status: 'fail',
                message: 'IP not allowed'
            });
            return;
        }
        next();
    };
};

// Request sanitization middleware
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): void => {
    // Sanitize body
    if (req.body) {
        Object.keys(req.body).forEach(key => {
            if (typeof req.body[key] === 'string') {
                // Remove any potential XSS content
                req.body[key] = req.body[key]
                    .replace(/<[^>]*>/g, '')  // Remove HTML tags
                    .replace(/javascript:/gi, '')  // Remove javascript: protocol
                    .trim();
            }
        });
    }

    // Sanitize query parameters
    if (req.query) {
        Object.keys(req.query).forEach(key => {
            if (typeof req.query[key] === 'string') {
                req.query[key] = (req.query[key] as string)
                    .replace(/<[^>]*>/g, '')
                    .replace(/javascript:/gi, '')
                    .trim();
            }
        });
    }

    next();
};

/**
 * Middleware to enforce required authentication level
 */
export const requireAuthLevel = (requiredLevel: AuthLevel) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const authLevel = req.authLevel as AuthLevel;
        
        // Calculate numeric values for comparison
        const levelValues: Record<AuthLevel, number> = {
            [AuthLevel.PUBLIC]: 0,
            [AuthLevel.USER]: 1,
            [AuthLevel.STAKEHOLDER]: 2,
            [AuthLevel.ADMIN]: 3
        };
        
        if (levelValues[authLevel] >= levelValues[requiredLevel]) {
            next();
        } else {
            // Log unauthorized access attempt
            const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
            const userId = (req.user?.id || authLevel || 'unknown') as string;
            
            securityLogger.logAccessEvent(
                userId,
                req.path,
                'access',
                'failure',
                clientIp,
                { requiredLevel, actualLevel: authLevel }
            ).catch(console.error);
            
            res.status(403).json({ 
                error: 'Insufficient permissions',
                required: requiredLevel,
                current: authLevel
            });
        }
    };
};

/**
 * Extend Express Request interface to include auth properties
 */
declare global {
    namespace Express {
        interface Request {
            authLevel?: AuthLevel;
            user?: {
                id: string;
                role: string;
            };
        }
    }
}

export const authMiddleware = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // In a real application, you would verify the JWT token here
        // and check if the user's role is in the allowedRoles array
        const userRole = req.headers['x-user-role'] as string;
        
        if (!userRole) {
            throw new AppError('Unauthorized: No role provided', 401);
        }

        if (!allowedRoles.includes(userRole)) {
            throw new AppError('Forbidden: Insufficient permissions', 403);
        }

        next();
    };
}; 