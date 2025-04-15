import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { SecuritySeverity, SecurityEventType } from '../types/security.types';

export interface SecurityLogEvent {
    id: string;
    timestamp: Date;
    eventType: SecurityEventType | string;
    severity: SecuritySeverity;
    message: string;
    details: Record<string, unknown>;
    userId?: string;
    ip?: string;
    userAgent?: string;
    resourceId?: string;
    action?: string;
    result?: 'success' | 'failure';
}

export class SecurityLogger {
    private readonly logDir: string;
    private readonly securityLogPath: string;
    private readonly alertLogPath: string;
    private readonly slackWebhook?: string;
    private readonly alertEmails?: string[];
    
    constructor() {
        this.logDir = path.join(__dirname, '../../logs');
        
        // Ensure logs directory exists
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
        
        this.securityLogPath = path.join(this.logDir, 'security-events.log');
        this.alertLogPath = path.join(this.logDir, 'security-alerts.log');
        
        // Load configuration from environment variables
        this.slackWebhook = process.env.SLACK_WEBHOOK;
        this.alertEmails = process.env.ALERT_EMAILS?.split(',');
    }
    
    /**
     * Log a security event with appropriate alerting based on severity
     */
    async logSecurityEvent(event: Omit<SecurityLogEvent, 'id' | 'timestamp'>): Promise<string> {
        // Generate a unique ID for the event
        const eventId = `sec-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        
        // Create full event record with ID and timestamp
        const fullEvent: SecurityLogEvent = {
            id: eventId,
            timestamp: new Date(),
            ...event
        };
        
        // Log to file
        await this.logToFile(fullEvent);
        
        // Send alerts for high and critical severity events
        if (fullEvent.severity === 'high' || fullEvent.severity === 'critical') {
            await this.logAlert(fullEvent);
            await this.sendAlerts(fullEvent);
        }
        
        return eventId;
    }
    
    /**
     * Log authentication events (login, logout, failed attempts)
     */
    async logAuthEvent(
        action: 'login' | 'logout' | 'failed_login' | 'password_reset' | 'mfa_challenge',
        userId: string,
        ip: string,
        userAgent: string,
        result: 'success' | 'failure',
        details?: Record<string, unknown>
    ): Promise<string> {
        const severity: SecuritySeverity = 
            (action === 'failed_login' && result === 'failure') ? 'medium' : 'low';
        
        return this.logSecurityEvent({
            eventType: 'authentication',
            severity,
            message: `Authentication ${action} ${result}`,
            details: details || {},
            userId,
            ip,
            userAgent,
            action,
            result
        });
    }
    
    /**
     * Log access control events (authorization attempts)
     */
    async logAccessEvent(
        userId: string,
        resourceId: string,
        action: string,
        result: 'success' | 'failure',
        ip: string,
        details?: Record<string, unknown>
    ): Promise<string> {
        const severity: SecuritySeverity = 
            result === 'failure' ? 'medium' : 'low';
        
        return this.logSecurityEvent({
            eventType: 'authorization',
            severity,
            message: `Access control: ${action} to ${resourceId} ${result}`,
            details: details || {},
            userId,
            ip,
            resourceId,
            action,
            result
        });
    }
    
    /**
     * Log data security events (data access, modification)
     */
    async logDataEvent(
        action: 'read' | 'create' | 'update' | 'delete',
        resourceId: string,
        userId: string,
        ip: string,
        result: 'success' | 'failure',
        details?: Record<string, unknown>
    ): Promise<string> {
        const severity: SecuritySeverity = 
            (action === 'delete' || action === 'update') ? 'medium' : 'low';
        
        return this.logSecurityEvent({
            eventType: 'data_security',
            severity,
            message: `Data ${action} on ${resourceId} ${result}`,
            details: details || {},
            userId,
            ip,
            resourceId,
            action,
            result
        });
    }
    
    /**
     * Log security configuration changes
     */
    async logConfigChange(
        component: string,
        change: string,
        userId: string,
        ip: string,
        details?: Record<string, unknown>
    ): Promise<string> {
        return this.logSecurityEvent({
            eventType: 'configuration',
            severity: 'medium',
            message: `Security configuration change: ${component} - ${change}`,
            details: details || {},
            userId,
            ip,
            resourceId: component,
            action: 'update',
            result: 'success'
        });
    }
    
    /**
     * Write security event to log file
     */
    private async logToFile(event: SecurityLogEvent): Promise<void> {
        try {
            const logEntry = JSON.stringify({
                ...event,
                timestamp: event.timestamp.toISOString()
            });
            
            fs.appendFileSync(this.securityLogPath, `${logEntry}\n`);
        } catch (error) {
            console.error('Failed to write to security log:', error);
        }
    }
    
    /**
     * Log security alerts to a separate file for high severity events
     */
    private async logAlert(event: SecurityLogEvent): Promise<void> {
        try {
            const alertEntry = JSON.stringify({
                ...event,
                timestamp: event.timestamp.toISOString()
            });
            
            fs.appendFileSync(this.alertLogPath, `${alertEntry}\n`);
        } catch (error) {
            console.error('Failed to write to alert log:', error);
        }
    }
    
    /**
     * Send alerts via configured channels (Slack, email, etc.)
     */
    private async sendAlerts(event: SecurityLogEvent): Promise<void> {
        try {
            // Send Slack notification if configured
            if (this.slackWebhook) {
                await this.sendSlackAlert(event);
            }
            
            // Send email notifications if configured
            if (this.alertEmails && this.alertEmails.length > 0) {
                await this.sendEmailAlert(event);
            }
        } catch (error) {
            console.error('Failed to send security alerts:', error);
        }
    }
    
    /**
     * Send alert to Slack
     */
    private async sendSlackAlert(event: SecurityLogEvent): Promise<void> {
        if (!this.slackWebhook) return;
        
        try {
            const color = event.severity === 'critical' ? '#FF0000' : '#FFA500';
            
            await axios.post(this.slackWebhook, {
                attachments: [{
                    color,
                    title: `Security Alert: ${event.eventType}`,
                    text: event.message,
                    fields: [
                        { title: 'Severity', value: event.severity, short: true },
                        { title: 'Time', value: event.timestamp.toISOString(), short: true },
                        { title: 'Event ID', value: event.id, short: true },
                        { title: 'Details', value: JSON.stringify(event.details), short: false }
                    ],
                    footer: 'Security Monitoring System'
                }]
            });
        } catch (error) {
            console.error('Failed to send Slack alert:', error);
        }
    }
    
    /**
     * Send alert via email
     */
    private async sendEmailAlert(event: SecurityLogEvent): Promise<void> {
        // Implementation would depend on your email service (SendGrid, Nodemailer, etc.)
        // This is a placeholder for the email sending functionality
        console.log(`[EMAIL ALERT] Would send security alert to ${this.alertEmails?.join(', ')}`);
        console.log(`Subject: Security Alert: ${event.severity.toUpperCase()} - ${event.eventType}`);
        console.log(`Body: ${event.message}`);
    }
} 