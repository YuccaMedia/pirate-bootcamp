import { Request, Response, NextFunction } from 'express';

// Documentation access levels
export enum DocAccessLevel {
    PUBLIC = 'public',     // Basic info only
    USER = 'user',         // Developer with limited access
    STAKEHOLDER = 'stakeholder', // Technical stakeholder access
    ADMIN = 'admin'        // Full admin access
}

// Interface for the documentation request with access level
export interface DocRequest extends Request {
    docAccessLevel?: DocAccessLevel;
}

/**
 * Middleware to check documentation API key and determine access level
 */
export const checkDocAccess = (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = req.query.key as string || '';
    const docReq = req as DocRequest;
    
    // Default to public access
    docReq.docAccessLevel = DocAccessLevel.PUBLIC;
    
    // Check for admin access
    if (apiKey === process.env.MASTERKEY_ADMIN) {
        docReq.docAccessLevel = DocAccessLevel.ADMIN;
    } 
    // Check for developer access
    else if (apiKey === process.env.USERKEY_DEV) {
        docReq.docAccessLevel = DocAccessLevel.USER;
    }
    // Check for stakeholder access 
    else if (apiKey === process.env.STAKEHOLDER_KEY) {
        docReq.docAccessLevel = DocAccessLevel.STAKEHOLDER;
    }
    
    next();
};

/**
 * Middleware to require minimum access level for specific documentation routes
 */
export const requireDocAccess = (minLevel: DocAccessLevel) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const docReq = req as DocRequest;
        
        // Map access levels to numeric values for comparison
        const accessLevels = {
            [DocAccessLevel.PUBLIC]: 0,
            [DocAccessLevel.STAKEHOLDER]: 1,
            [DocAccessLevel.USER]: 2,
            [DocAccessLevel.ADMIN]: 3
        };
        
        // If access level is insufficient, block access
        if (accessLevels[docReq.docAccessLevel || DocAccessLevel.PUBLIC] < accessLevels[minLevel]) {
            res.status(403).json({
                status: 'error',
                message: 'You do not have sufficient access to view this documentation'
            });
            return;
        }
        
        next();
    };
}; 