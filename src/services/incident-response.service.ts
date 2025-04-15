import { SecurityMonitoringUtils } from '../config/security-monitoring.config';
import { NetworkSecurityService } from './network-security.service';
import nodemailer from 'nodemailer';

interface SecurityIncident {
    id: string;
    type: 'intrusion' | 'data-breach' | 'malware' | 'ddos' | 'unauthorized-access';
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
    details: Record<string, any>;
    status: 'detected' | 'investigating' | 'mitigating' | 'resolved';
}

interface IncidentResponse {
    incidentId: string;
    actions: string[];
    timestamp: Date;
    outcome: string;
}

export class IncidentResponseService {
    private readonly networkSecurity: NetworkSecurityService;
    private readonly emailTransporter: nodemailer.Transporter;

    constructor() {
        this.networkSecurity = new NetworkSecurityService();
        this.emailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    async handleIncident(incident: SecurityIncident): Promise<IncidentResponse> {
        try {
            // Log incident
            await SecurityMonitoringUtils.trackSecurityEvent(
                'security-incident-detected',
                incident.severity,
                { incident }
            );

            // Initial response actions
            const response: IncidentResponse = {
                incidentId: incident.id,
                actions: [],
                timestamp: new Date(),
                outcome: 'pending'
            };

            // Execute automated response based on incident type
            switch (incident.type) {
                case 'intrusion':
                    await this.handleIntrusion(incident, response);
                    break;
                case 'data-breach':
                    await this.handleDataBreach(incident, response);
                    break;
                case 'ddos':
                    await this.handleDDoS(incident, response);
                    break;
                case 'unauthorized-access':
                    await this.handleUnauthorizedAccess(incident, response);
                    break;
                case 'malware':
                    await this.handleMalware(incident, response);
                    break;
            }

            // Send notifications
            await this.sendIncidentNotifications(incident, response);

            // Update incident status
            response.outcome = 'completed';
            await SecurityMonitoringUtils.trackSecurityEvent(
                'incident-response-completed',
                incident.severity,
                { incident, response }
            );

            return response;
        } catch (error) {
            await SecurityMonitoringUtils.trackSecurityEvent(
                'incident-response-failed',
                'critical',
                { incident, error: error instanceof Error ? error.message : 'Unknown error' }
            );
            throw error;
        }
    }

    private async handleIntrusion(incident: SecurityIncident, response: IncidentResponse): Promise<void> {
        response.actions.push('Initiating intrusion response protocol');

        // Block suspicious IPs
        if (incident.details.sourceIp) {
            await this.networkSecurity.blockIP(incident.details.sourceIp, 'Intrusion attempt detected');
            response.actions.push(`Blocked suspicious IP: ${incident.details.sourceIp}`);
        }

        // Enable enhanced monitoring
        await this.networkSecurity.monitorNetworkActivity();
        response.actions.push('Enhanced network monitoring enabled');
    }

    private async handleDataBreach(incident: SecurityIncident, response: IncidentResponse): Promise<void> {
        response.actions.push('Initiating data breach protocol');

        // Implement data breach response
        if (incident.details.affectedSystems) {
            for (const system of incident.details.affectedSystems) {
                await this.networkSecurity.isolateSystem(system);
                response.actions.push(`Isolated affected system: ${system}`);
            }
        }

        // Force password resets
        response.actions.push('Initiating forced password reset for all users');
    }

    private async handleDDoS(incident: SecurityIncident, response: IncidentResponse): Promise<void> {
        response.actions.push('Initiating DDoS mitigation protocol');

        // Enable DDoS protection
        await this.networkSecurity.enableDDoSMitigation();
        response.actions.push('DDoS protection enabled');

        // Monitor traffic patterns
        await this.networkSecurity.monitorNetworkActivity();
        response.actions.push('Enhanced traffic monitoring enabled');
    }

    private async handleUnauthorizedAccess(incident: SecurityIncident, response: IncidentResponse): Promise<void> {
        response.actions.push('Initiating unauthorized access protocol');

        // Lock affected accounts
        if (incident.details.affectedAccounts) {
            response.actions.push(`Locking affected accounts: ${incident.details.affectedAccounts.join(', ')}`);
        }

        // Enable additional authentication requirements
        response.actions.push('Enabling enhanced authentication requirements');
    }

    private async handleMalware(incident: SecurityIncident, response: IncidentResponse): Promise<void> {
        response.actions.push('Initiating malware response protocol');

        // Isolate affected systems
        if (incident.details.affectedSystems) {
            for (const system of incident.details.affectedSystems) {
                await this.networkSecurity.isolateSystem(system);
                response.actions.push(`Isolated infected system: ${system}`);
            }
        }

        // Initiate malware scan
        response.actions.push('Initiating emergency malware scan');
    }

    private async sendIncidentNotifications(incident: SecurityIncident, response: IncidentResponse): Promise<void> {
        const alertEmails = (process.env.ALERT_EMAILS || '').split(',');
        const emailContent = this.generateIncidentEmailContent(incident, response);

        try {
            await this.emailTransporter.sendMail({
                from: process.env.ALERT_FROM_EMAIL,
                to: alertEmails,
                subject: `Security Incident Alert - ${incident.severity.toUpperCase()}: ${incident.type}`,
                html: emailContent
            });

            // Send to Slack if configured
            if (process.env.SLACK_WEBHOOK) {
                await this.sendSlackNotification(incident, response);
            }
        } catch (error) {
            await SecurityMonitoringUtils.trackSecurityEvent(
                'notification-failed',
                'high',
                { incident, error: error instanceof Error ? error.message : 'Unknown error' }
            );
        }
    }

    private generateIncidentEmailContent(incident: SecurityIncident, response: IncidentResponse): string {
        return `
            <h2>Security Incident Alert</h2>
            <p><strong>Type:</strong> ${incident.type}</p>
            <p><strong>Severity:</strong> ${incident.severity}</p>
            <p><strong>Time:</strong> ${incident.timestamp.toISOString()}</p>
            <h3>Details:</h3>
            <pre>${JSON.stringify(incident.details, null, 2)}</pre>
            <h3>Actions Taken:</h3>
            <ul>
                ${response.actions.map(action => `<li>${action}</li>`).join('')}
            </ul>
        `;
    }

    private async sendSlackNotification(incident: SecurityIncident, response: IncidentResponse): Promise<void> {
        const webhook = process.env.SLACK_WEBHOOK;
        if (!webhook) return;

        const payload = {
            text: `🚨 Security Incident Alert`,
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: `Security Incident: ${incident.type.toUpperCase()}`
                    }
                },
                {
                    type: 'section',
                    fields: [
                        {
                            type: 'mrkdwn',
                            text: `*Severity:*\n${incident.severity}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Status:*\n${incident.status}`
                        }
                    ]
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Actions Taken:*\n${response.actions.map(a => `• ${a}`).join('\n')}`
                    }
                }
            ]
        };

        try {
            const result = await fetch(webhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!result.ok) {
                throw new Error(`Slack notification failed: ${result.statusText}`);
            }
        } catch (error) {
            await SecurityMonitoringUtils.trackSecurityEvent(
                'slack-notification-failed',
                'medium',
                { incident, error: error instanceof Error ? error.message : 'Unknown error' }
            );
        }
    }
} 