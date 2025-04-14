import winston from 'winston';
import { GlobalSecurityConfig } from '../config/security.config';

// Custom log format
const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create the logger instance
const logger = winston.createLogger({
    level: GlobalSecurityConfig.monitoring.logLevel,
    format: logFormat,
    defaultMeta: { 
        service: GlobalSecurityConfig.app.name,
        version: GlobalSecurityConfig.app.version 
    },
    transports: [
        // Write all logs with level 'error' and below to 'error.log'
        new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Write all logs with level 'info' and below to 'combined.log'
        new winston.transports.File({ 
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
});

// If we're not in production, log to the console with a simpler format
if (GlobalSecurityConfig.environment !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        ),
    }));
}

// Security-specific logging functions
export const SecurityLogger = {
    /**
     * Log security-related events
     */
    logSecurityEvent(
        eventType: string, 
        details: Record<string, any>, 
        severity: 'info' | 'warn' | 'error' = 'info'
    ) {
        logger[severity]('Security Event', {
            eventType,
            ...details,
            timestamp: new Date().toISOString(),
        });
    },

    /**
     * Log authentication attempts
     */
    logAuthAttempt(
        success: boolean, 
        details: Record<string, any>
    ) {
        this.logSecurityEvent(
            'authentication_attempt',
            { success, ...details },
            success ? 'info' : 'warn'
        );
    },

    /**
     * Log blockchain transactions
     */
    logTransaction(
        transactionType: string,
        details: Record<string, any>
    ) {
        this.logSecurityEvent('blockchain_transaction', {
            type: transactionType,
            network: GlobalSecurityConfig.blockchain.network,
            ...details,
        });
    },

    /**
     * Log security violations
     */
    logViolation(
        violationType: string,
        details: Record<string, any>
    ) {
        this.logSecurityEvent('security_violation', {
            type: violationType,
            ...details,
        }, 'error');
    },

    /**
     * Log rate limit violations
     */
    logRateLimit(details: Record<string, any>) {
        this.logSecurityEvent('rate_limit', details, 'warn');
    },
};

// Export the base logger for general use
export default logger; 