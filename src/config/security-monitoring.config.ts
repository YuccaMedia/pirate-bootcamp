import { createLogger, transports, format } from 'winston';
import {
    SecuritySeverity,
    SecurityMonitoringConfig as SecurityMonitoringConfigType,
    AutoResponseTrigger,
    MetricType
} from '../types/security.types';

// Security monitoring configuration
export const SecurityMonitoringConfig: SecurityMonitoringConfigType = {
    // Real-time alerting
    alerting: {
        enabled: true,
        channels: {
            email: {
                enabled: true,
                recipients: process.env.ALERT_EMAILS?.split(',') || [],
                severity: ['high', 'critical']
            },
            slack: {
                enabled: true,
                webhook: process.env.SLACK_WEBHOOK,
                channel: '#security-alerts',
                severity: ['medium', 'high', 'critical']
            }
        },
        thresholds: {
            failedLogins: {
                count: 5,
                timeWindow: 300000, // 5 minutes
                severity: 'high'
            },
            apiErrors: {
                count: 50,
                timeWindow: 300000, // 5 minutes
                severity: 'medium'
            },
            slowResponses: {
                threshold: 1000, // 1 second
                count: 10,
                timeWindow: 60000, // 1 minute
                severity: 'medium'
            }
        }
    },

    // Automated response
    autoResponse: {
        enabled: true,
        actions: {
            blockIP: {
                threshold: 10,
                duration: 3600000, // 1 hour
                triggers: ['failed-login', 'rate-limit-exceeded']
            },
            notifyAdmin: {
                threshold: 1,
                triggers: ['suspicious-activity', 'security-scan-failed']
            },
            scaleResources: {
                threshold: 5,
                triggers: ['high-load', 'ddos-attempt']
            }
        }
    },

    // Metrics collection
    metrics: {
        enabled: true,
        interval: 60000, // 1 minute
        retention: 30, // days
        collectors: [
            {
                name: 'security-events',
                type: 'counter',
                labels: ['event_type', 'severity']
            },
            {
                name: 'auth-attempts',
                type: 'counter',
                labels: ['status', 'ip_address']
            },
            {
                name: 'api-response-time',
                type: 'histogram',
                labels: ['endpoint', 'method']
            }
        ]
    }
};

// Create security monitoring logger
export const securityMonitoringLogger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.json()
    ),
    transports: [
        new transports.File({
            filename: 'logs/security-monitoring.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        })
    ]
});

interface SecurityEvent {
    eventType: string;
    severity: SecuritySeverity;
    details: Record<string, unknown>;
    timestamp: string;
}

// Security monitoring utilities
export const SecurityMonitoringUtils = {
    // Track security event
    async trackSecurityEvent(
        eventType: string,
        severity: SecuritySeverity,
        details: Record<string, unknown>
    ) {
        try {
            const event: SecurityEvent = {
                eventType,
                severity,
                details,
                timestamp: new Date().toISOString()
            };

            securityMonitoringLogger.info('Security event tracked', event);

            // Check if event requires alerting
            if (SecurityMonitoringConfig.alerting.enabled) {
                await this.checkAlertThresholds(eventType, severity);
            }

            // Check if event requires automated response
            if (SecurityMonitoringConfig.autoResponse.enabled) {
                await this.checkAutoResponseTriggers(eventType);
            }
        } catch (error) {
            securityMonitoringLogger.error('Error tracking security event', { error });
            throw error;
        }
    },

    // Check alert thresholds
    async checkAlertThresholds(eventType: string, severity: SecuritySeverity) {
        const thresholds = SecurityMonitoringConfig.alerting.thresholds;
        const threshold = thresholds[eventType];

        if (threshold && threshold.severity === severity) {
            // Retrieve recent events of this type within the time window
            const eventKey = `security:events:${eventType}`;
            const timeWindow = threshold.timeWindow || 300000; // Default 5 minutes
            const cutoffTime = new Date(Date.now() - timeWindow).toISOString();
            
            // Get count of events (in a real implementation, this would query a database or cache)
            // This is a simplified implementation for demonstration
            const recentEventsCount = await this.getRecentEventsCount(eventType, cutoffTime);
            
            if (recentEventsCount >= (threshold.count || 1)) {
                // Threshold exceeded, send alerts
                await this.sendAlerts(eventType, severity, {
                    count: recentEventsCount,
                    threshold: threshold.count,
                    timeWindow: `${timeWindow/60000} minutes`
                });
                
                securityMonitoringLogger.warn(`Security alert threshold exceeded for ${eventType}`, {
                    count: recentEventsCount,
                    threshold: threshold.count,
                    severity
                });
            } else {
                securityMonitoringLogger.info('Alert threshold check passed', {
                    eventType,
                    severity,
                    currentCount: recentEventsCount,
                    threshold: threshold.count
                });
            }
        }
    },

    // Check auto-response triggers
    async checkAutoResponseTriggers(eventType: string) {
        const actions = SecurityMonitoringConfig.autoResponse.actions;
        
        // Find actions that have this event type as a trigger
        const matchingActions = Object.entries(actions).filter(([_, config]) =>
            config.triggers.includes(eventType as AutoResponseTrigger)
        );
        
        if (matchingActions.length > 0) {
            // Get event count for threshold checking
            const recentEventsCount = await this.getRecentEventsCount(eventType);
            
            for (const [actionName, config] of matchingActions) {
                if (recentEventsCount >= (config.threshold || 1)) {
                    // Execute the automated response
                    await this.executeAutomatedResponse(actionName, eventType, {
                        count: recentEventsCount,
                        threshold: config.threshold
                    });
                    
                    securityMonitoringLogger.warn(`Automated response triggered: ${actionName}`, {
                        eventType,
                        count: recentEventsCount,
                        threshold: config.threshold
                    });
                }
            }
        }
    },

    // Send alerts through configured channels
    async sendAlerts(eventType: string, severity: SecuritySeverity, details: Record<string, any>) {
        const alertConfig = SecurityMonitoringConfig.alerting;
        
        // Email alerts
        if (alertConfig.channels.email.enabled && 
            alertConfig.channels.email.severity.includes(severity)) {
            
            const recipients = alertConfig.channels.email.recipients;
            if (recipients && recipients.length > 0) {
                try {
                    // In a real implementation, this would use nodemailer or similar
                    // This is a simplified implementation for demonstration
                    securityMonitoringLogger.info(`Would send email alert to ${recipients.join(', ')}`, {
                        eventType,
                        severity,
                        details
                    });
                    
                    // Example of actual email implementation:
                    /*
                    await emailTransport.sendMail({
                        from: process.env.ALERT_FROM_EMAIL,
                        to: recipients.join(','),
                        subject: `Security Alert: ${severity.toUpperCase()} - ${eventType}`,
                        text: `
                            Security Alert: ${eventType}
                            Severity: ${severity}
                            Time: ${new Date().toISOString()}
                            Details: ${JSON.stringify(details, null, 2)}
                        `
                    });
                    */
                } catch (error) {
                    securityMonitoringLogger.error('Failed to send email alert', { error });
                }
            }
        }
        
        // Slack alerts
        if (alertConfig.channels.slack.enabled && 
            alertConfig.channels.slack.severity.includes(severity)) {
            
            try {
                // In a real implementation, this would use @slack/web-api
                // This is a simplified implementation for demonstration
                securityMonitoringLogger.info(`Would send Slack alert to ${alertConfig.channels.slack.channel}`, {
                    eventType,
                    severity,
                    details
                });
                
                // Example of actual Slack implementation:
                /*
                await slack.chat.postMessage({
                    channel: alertConfig.channels.slack.channel,
                    text: `Security Alert: ${severity.toUpperCase()} - ${eventType}`,
                    blocks: [
                        {
                            type: "header",
                            text: {
                                type: "plain_text",
                                text: `🚨 Security Alert: ${severity.toUpperCase()}`
                            }
                        },
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `*Event:* ${eventType}\n*Time:* ${new Date().toISOString()}`
                            }
                        },
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `*Details:*\n\`\`\`${JSON.stringify(details, null, 2)}\`\`\``
                            }
                        }
                    ]
                });
                */
            } catch (error) {
                securityMonitoringLogger.error('Failed to send Slack alert', { error });
            }
        }
    },

    // Execute automated response based on the action type
    async executeAutomatedResponse(
        actionName: string, 
        triggerEvent: string,
        details: Record<string, any>
    ) {
        switch (actionName) {
            case 'blockIP':
                // In a real implementation, this would call a firewall API or similar
                securityMonitoringLogger.info(`Would block IP ${details.ip || 'unknown'} for ${details.duration || '1 hour'}`);
                break;
                
            case 'notifyAdmin':
                // Notify admin with high priority
                await this.sendAlerts(triggerEvent, 'critical', {
                    ...details,
                    automatedResponse: true,
                    actionTaken: 'notifyAdmin'
                });
                break;
                
            case 'scaleResources':
                // In a real implementation, this would call a cloud provider API
                securityMonitoringLogger.info(`Would scale resources in response to ${triggerEvent}`, details);
                break;
                
            default:
                securityMonitoringLogger.warn(`Unknown automated response action: ${actionName}`);
        }
    },

    // Helper to get recent event counts
    async getRecentEventsCount(eventType: string, cutoffTime?: string): Promise<number> {
        // In a real implementation, this would query a database or cache
        // This is a simplified mock implementation
        securityMonitoringLogger.info(`Would get recent event count for ${eventType} since ${cutoffTime || 'default'}`);
        
        // Mock response - this would be replaced with real data in production
        const mockCounts: Record<string, number> = {
            'failed-login': 3,
            'rate-limit-exceeded': 8,
            'high-db-connections': 2,
            'suspicious-activity': 1,
            'security-scan-failed': 0
        };
        
        return mockCounts[eventType] || 0;
    },

    // Collect security metrics
    async collectMetrics() {
        try {
            const metrics = SecurityMonitoringConfig.metrics;
            if (!metrics.enabled) return;

            securityMonitoringLogger.info('Collecting security metrics');
            
            // Collect metrics from various sources
            const metricsData: Record<string, any> = {};
            
            // 1. Collect API metrics (response times, error rates)
            metricsData['api'] = await this.collectApiMetrics();
            
            // 2. Collect authentication metrics (login attempts, failures)
            metricsData['auth'] = await this.collectAuthMetrics();
            
            // 3. Collect system metrics (CPU, memory, disk)
            metricsData['system'] = await this.collectSystemMetrics();
            
            // 4. Collect database metrics (connections, query times)
            metricsData['database'] = await this.collectDatabaseMetrics();
            
            // Store metrics in time-series database or send to monitoring service
            // This is a simplified implementation for demonstration
            securityMonitoringLogger.info('Security metrics collected', { metricsData });
            
            // Check for any metrics that exceed thresholds
            await this.checkMetricsThresholds(metricsData);
            
            return metricsData;
        } catch (error) {
            securityMonitoringLogger.error('Error collecting security metrics', { error });
            throw error;
        }
    },
    
    // Helper methods for metrics collection
    async collectApiMetrics(): Promise<Record<string, any>> {
        // In a real implementation, this would collect data from API logs or Prometheus
        // This is a simplified mock implementation
        return {
            responseTime: {
                avg: 120, // ms
                p95: 350, // ms
                p99: 500  // ms
            },
            errorRate: 0.02, // 2%
            requestsPerMinute: 250
        };
    },
    
    async collectAuthMetrics(): Promise<Record<string, any>> {
        // Mock authentication metrics
        return {
            loginAttempts: 120,
            failedLogins: 8,
            failureRate: 0.067, // 6.7%
            uniqueIPs: 45
        };
    },
    
    async collectSystemMetrics(): Promise<Record<string, any>> {
        // Mock system metrics
        return {
            cpuUsage: 0.35, // 35%
            memoryUsage: 0.42, // 42%
            diskUsage: 0.68, // 68%
            networkIn: 15000000, // bytes
            networkOut: 25000000 // bytes
        };
    },
    
    async collectDatabaseMetrics(): Promise<Record<string, any>> {
        // Mock database metrics
        return {
            connections: 25,
            activeQueries: 8,
            avgQueryTime: 15, // ms
            slowQueries: 2
        };
    },
    
    async checkMetricsThresholds(metrics: Record<string, any>) {
        // Check API metrics
        if (metrics.api.errorRate > 0.05) { // 5%
            await this.trackSecurityEvent(
                'high-api-error-rate',
                'medium',
                { errorRate: metrics.api.errorRate }
            );
        }
        
        // Check authentication metrics
        if (metrics.auth.failedLogins > 20) {
            await this.trackSecurityEvent(
                'high-failed-logins',
                'high',
                { failedLogins: metrics.auth.failedLogins }
            );
        }
        
        // Check system metrics
        if (metrics.system.cpuUsage > 0.80) { // 80%
            await this.trackSecurityEvent(
                'high-cpu-usage',
                'medium',
                { cpuUsage: metrics.system.cpuUsage }
            );
        }
        
        // Check database metrics
        if (metrics.database.slowQueries > 5) {
            await this.trackSecurityEvent(
                'high-slow-queries',
                'medium',
                { slowQueries: metrics.database.slowQueries }
            );
        }
    }
}; 