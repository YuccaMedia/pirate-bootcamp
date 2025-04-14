import { Request, Response, NextFunction } from 'express';
import { SecurityConfig } from '../config/security.config';
import { SecurityLogger } from './logging';

export const cspMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        // Convert CSP directives to string format
        const cspDirectives = Object.entries(SecurityConfig.csp.directives)
            .map(([key, values]) => `${key} ${values.join(' ')}`)
            .join('; ');

        // Set CSP header
        res.setHeader('Content-Security-Policy', cspDirectives);

        // Set additional security headers
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        // Set HSTS header in production
        if (process.env.NODE_ENV === 'production') {
            res.setHeader(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains; preload'
            );
        }

        // Log CSP configuration
        SecurityLogger.debug('CSP headers set', { 
            csp: cspDirectives,
            url: req.url 
        });

        next();
    } catch (error) {
        SecurityLogger.error('Error setting CSP headers', { error, url: req.url });
        next(error);
    }
}; 