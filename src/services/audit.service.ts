import { createLogger, format, transports } from 'winston';
import { Request } from 'express';
import { pool } from '../middleware/database.middleware';

// Extend Request type to include user property
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
    };
}

// Define audit event types
export enum AuditEventType {
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILURE = 'LOGIN_FAILURE',
    LOGOUT = 'LOGOUT',
    PASSWORD_CHANGE = 'PASSWORD_CHANGE',
    PASSWORD_RESET = 'PASSWORD_RESET',
    MFA_SETUP = 'MFA_SETUP',
    MFA_VERIFY = 'MFA_VERIFY',
    FILE_UPLOAD = 'FILE_UPLOAD',
    FILE_DELETE = 'FILE_DELETE',
    API_ACCESS = 'API_ACCESS',
    PERMISSION_CHANGE = 'PERMISSION_CHANGE',
    ACCOUNT_LOCKOUT = 'ACCOUNT_LOCKOUT',
    SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY'
}

// Audit log entry interface
interface AuditLogEntry {
    eventType: AuditEventType;
    userId: string | null;  // Changed to allow null
    ipAddress: string;
    userAgent: string;
    details: Record<string, any>;
    timestamp: Date;
}

export class AuditService {
    private logger;

    constructor() {
        // Create Winston logger for audit logs
        this.logger = createLogger({
            format: format.combine(
                format.timestamp(),
                format.json()
            ),
            transports: [
                // Console transport for development
                new transports.Console({
                    format: format.combine(
                        format.colorize(),
                        format.simple()
                    )
                }),
                // File transport for audit logs
                new transports.File({
                    filename: 'logs/audit.log',
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                    tailable: true
                }),
                // Separate file for security events
                new transports.File({
                    filename: 'logs/security.log',
                    level: 'warn',
                    maxsize: 5242880,
                    maxFiles: 5
                })
            ]
        });
    }

    // Log audit event
    async logEvent(
        eventType: AuditEventType,
        req: AuthenticatedRequest,
        details: Record<string, any> = {},
        userId?: string
    ): Promise<void> {
        const entry: AuditLogEntry = {
            eventType,
            userId: userId || req.user?.id || null,
            ipAddress: String(req.ip || 'unknown'),
            userAgent: String(req.headers['user-agent'] || 'unknown'),
            details,
            timestamp: new Date()
        };

        // Log to Winston
        this.logger.info('Audit event', entry);

        // Store in database
        try {
            await pool.query(
                `INSERT INTO audit_logs (
                    event_type,
                    user_id,
                    ip_address,
                    user_agent,
                    details,
                    timestamp
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    entry.eventType,
                    entry.userId,
                    entry.ipAddress,
                    entry.userAgent,
                    JSON.stringify(entry.details),
                    entry.timestamp
                ]
            );
        } catch (error) {
            this.logger.error('Failed to store audit log in database', {
                error,
                entry
            });
        }
    }

    // Log security event with higher severity
    async logSecurityEvent(
        eventType: AuditEventType,
        req: AuthenticatedRequest,
        details: Record<string, any> = {},
        userId?: string
    ): Promise<void> {
        const entry: AuditLogEntry = {
            eventType,
            userId: userId || req.user?.id || null,
            ipAddress: String(req.ip || 'unknown'),
            userAgent: String(req.headers['user-agent'] || 'unknown'),
            details,
            timestamp: new Date()
        };

        // Log to Winston with warning level
        this.logger.warn('Security event', entry);

        // Store in database with higher severity
        try {
            await pool.query(
                `INSERT INTO security_logs (
                    event_type,
                    user_id,
                    ip_address,
                    user_agent,
                    details,
                    timestamp
                ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    entry.eventType,
                    entry.userId,
                    entry.ipAddress,
                    entry.userAgent,
                    JSON.stringify(entry.details),
                    entry.timestamp
                ]
            );
        } catch (error) {
            this.logger.error('Failed to store security log in database', {
                error,
                entry
            });
        }
    }

    // Get audit logs for a specific user
    async getUserAuditLogs(userId: string, limit: number = 100): Promise<AuditLogEntry[]> {
        const result = await pool.query(
            `SELECT * FROM audit_logs 
            WHERE user_id = $1 
            ORDER BY timestamp DESC 
            LIMIT $2`,
            [userId, limit]
        );
        return result.rows;
    }

    // Get security events within a time range
    async getSecurityEvents(
        startDate: Date,
        endDate: Date,
        eventTypes?: AuditEventType[]
    ): Promise<AuditLogEntry[]> {
        const query = eventTypes
            ? `SELECT * FROM security_logs 
               WHERE timestamp BETWEEN $1 AND $2 
               AND event_type = ANY($3)
               ORDER BY timestamp DESC`
            : `SELECT * FROM security_logs 
               WHERE timestamp BETWEEN $1 AND $2
               ORDER BY timestamp DESC`;

        const params = eventTypes ? [startDate, endDate, eventTypes] : [startDate, endDate];
        const result = await pool.query(query, params);
        return result.rows;
    }

    // Clean up old audit logs
    async cleanupOldLogs(daysToKeep: number = 90): Promise<void> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        await Promise.all([
            pool.query(
                'DELETE FROM audit_logs WHERE timestamp < $1',
                [cutoffDate]
            ),
            pool.query(
                'DELETE FROM security_logs WHERE timestamp < $1',
                [cutoffDate]
            )
        ]);
    }
} 