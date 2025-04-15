import { SecurityMonitoringUtils } from '../config/security-monitoring.config';
import { SecurityScanUtils } from '../config/security-scan.config';
import { dbSecurityUtils } from '../config/database.config';
import nodemailer from 'nodemailer';
import { WebClient } from '@slack/web-api';
import { register, Counter, Histogram } from 'prometheus-client';

// Initialize Prometheus metrics
const securityEvents = new Counter({
    name: 'security_events_total',
    help: 'Total number of security events by type and severity',
    labelNames: ['event_type', 'severity']
});

const authAttempts = new Counter({
    name: 'auth_attempts_total',
    help: 'Total number of authentication attempts',
    labelNames: ['status', 'ip_address']
});

const responseTime = new Histogram({
    name: 'api_response_time_seconds',
    help: 'API response time in seconds',
    labelNames: ['endpoint', 'method']
});

// Initialize email transport
const emailTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Initialize Slack client
const slack = new WebClient(process.env.SLACK_TOKEN);

// Security monitoring functions
async function monitorSecurityEvents() {
    try {
        // Monitor database connections
        const dbStats = await dbSecurityUtils.monitorConnections();
        if (dbStats.waitingCount > 10) {
            await SecurityMonitoringUtils.trackSecurityEvent(
                'high-db-connections',
                'high',
                dbStats
            );
        }

        // Run security scans
        await SecurityScanUtils.runSecurityScan('vulnerabilityScan');
        await SecurityScanUtils.runSecurityScan('containerScan');

        // Collect security metrics
        await SecurityMonitoringUtils.collectMetrics();

    } catch (error) {
        console.error('Error in security monitoring:', error);
        await sendAlert('error', 'Security Monitoring Failed', error);
    }
}

// Alert sending function
async function sendAlert(severity: string, title: string, details: any) {
    // Send email alert
    if (severity === 'high' || severity === 'critical') {
        await emailTransport.sendMail({
            from: process.env.ALERT_FROM_EMAIL,
            to: process.env.ALERT_EMAILS?.split(','),
            subject: `[${severity.toUpperCase()}] Security Alert: ${title}`,
            text: JSON.stringify(details, null, 2)
        });
    }

    // Send Slack alert
    if (process.env.SLACK_WEBHOOK) {
        await slack.chat.postMessage({
            channel: '#security-alerts',
            text: `*[${severity.toUpperCase()}] Security Alert*\n*${title}*\n\`\`\`${JSON.stringify(details, null, 2)}\`\`\``,
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: `🚨 Security Alert: ${title}`
                    }
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Severity:* ${severity.toUpperCase()}\n*Details:*\n\`\`\`${JSON.stringify(details, null, 2)}\`\`\``
                    }
                }
            ]
        });
    }
}

// Automated response function
async function automatedResponse(eventType: string, details: any) {
    switch (eventType) {
        case 'failed-login':
            if (details.attempts >= 5) {
                // Block IP
                await SecurityMonitoringUtils.trackSecurityEvent(
                    'ip-blocked',
                    'high',
                    { ip: details.ip, reason: 'Multiple failed login attempts' }
                );
            }
            break;

        case 'high-load':
            // Scale resources
            await SecurityMonitoringUtils.trackSecurityEvent(
                'auto-scaling',
                'medium',
                { trigger: 'High load detected', details }
            );
            break;

        case 'security-scan-failed':
            // Notify admin and create incident
            await sendAlert('critical', 'Security Scan Failed', details);
            break;
    }
}

// Start monitoring
console.log('Starting security monitoring...');
monitorSecurityEvents();

// Run monitoring at regular intervals
setInterval(monitorSecurityEvents, 5 * 60 * 1000); // Every 5 minutes 