import { SecurityMonitoringUtils } from '../config/security-monitoring.config';
import { SecurityScanUtils } from '../config/security-scan.config';
import { dbSecurityUtils } from '../config/database.config';
import fs from 'fs';
import path from 'path';

interface IncidentDetails {
    suspiciousIPs?: string[];
    affectedUsers?: string[];
    affectedSystems?: string[];
    scope?: string;
    timestamp?: Date;
    [key: string]: any; // For flexibility while maintaining some type safety
}

interface SecurityIncident {
    id: string;
    type: 'intrusion' | 'data-breach' | 'malware' | 'ddos' | 'unauthorized-access';
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'detected' | 'investigating' | 'mitigating' | 'resolved';
    details: IncidentDetails;
    timestamp: Date;
    resolution?: string;
}

class IncidentResponseSystem {
    private incidentsPath: string;
    private readonly INCIDENT_TYPES = [
        'unauthorized-access',
        'data-breach',
        'malware',
        'ddos',
        'intrusion'
    ] as const;

    constructor() {
        this.incidentsPath = path.join(__dirname, '../../logs/security-incidents.json');
        this.ensureIncidentLogExists();
    }

    private ensureIncidentLogExists() {
        if (!fs.existsSync(this.incidentsPath)) {
            fs.writeFileSync(this.incidentsPath, JSON.stringify([], null, 2));
        }
    }

    async createIncident(
        type: typeof this.INCIDENT_TYPES[number],
        severity: 'low' | 'medium' | 'high' | 'critical',
        details: IncidentDetails
    ): Promise<SecurityIncident> {
        const incident: SecurityIncident = {
            id: `INC-${Date.now()}`,
            type,
            severity,
            status: 'detected',
            details,
            timestamp: new Date()
        };

        // Log incident
        const incidents = this.loadIncidents();
        incidents.push(incident);
        this.saveIncidents(incidents);

        // Track security event
        await SecurityMonitoringUtils.trackSecurityEvent(
            'incident-created',
            severity,
            { incidentId: incident.id, type }
        );

        // Trigger automated response based on incident type
        await this.triggerAutomatedResponse(incident);

        return incident;
    }

    private async triggerAutomatedResponse(incident: SecurityIncident) {
        switch (incident.type) {
            case 'unauthorized-access':
                await this.handleUnauthorizedAccess(incident);
                break;
            case 'data-breach':
                await this.handleDataBreach(incident);
                break;
            case 'ddos':
                await this.handleDDoSAttack(incident);
                break;
            default:
                console.log(`No automated response defined for incident type: ${incident.type}`);
        }
    }

    private async handleUnauthorizedAccess(incident: SecurityIncident) {
        // 1. Block suspicious IPs
        const suspiciousIPs = this.extractSuspiciousIPs(incident.details);
        if (suspiciousIPs.length > 0) {
            for (const ip of suspiciousIPs) {
                await this.blockIP(ip);
            }
        }

        // 2. Force password reset for affected accounts
        const affectedUsers = incident.details.affectedUsers;
        if (Array.isArray(affectedUsers) && affectedUsers.length > 0) {
            for (const userId of affectedUsers) {
                await this.forcePasswordReset(userId);
            }
        }

        // 3. Increase monitoring
        await SecurityMonitoringUtils.trackSecurityEvent(
            'increased-monitoring',
            'high',
            { trigger: 'unauthorized-access', scope: incident.details.scope ?? 'unknown' }
        );
    }

    private async handleDataBreach(incident: SecurityIncident) {
        // 1. Isolate affected systems
        const affectedSystems = incident.details.affectedSystems;
        if (Array.isArray(affectedSystems) && affectedSystems.length > 0) {
            await this.isolateSystems(affectedSystems);
        }

        // 2. Initiate data backup verification
        await this.verifyDataBackups();

        // 3. Prepare breach notification
        await this.prepareBreachNotification(incident);
    }

    private async handleDDoSAttack(incident: SecurityIncident) {
        // 1. Enable DDoS mitigation
        await this.enableDDoSMitigation();

        // 2. Scale resources if needed
        if (incident.severity === 'high') {
            await this.scaleResources();
        }

        // 3. Update firewall rules
        await this.updateFirewallRules(incident.details);
    }

    // Utility methods
    private loadIncidents(): SecurityIncident[] {
        const content = fs.readFileSync(this.incidentsPath, 'utf8');
        const parsed = JSON.parse(content);
        
        if (!Array.isArray(parsed)) {
            throw new Error('Invalid incidents file format: expected an array');
        }

        // Validate each incident
        return parsed.map((item, index) => {
            if (!this.isValidSecurityIncident(item)) {
                throw new Error(`Invalid incident at index ${index}`);
            }
            return item;
        });
    }

    private saveIncidents(incidents: SecurityIncident[]) {
        fs.writeFileSync(this.incidentsPath, JSON.stringify(incidents, null, 2));
    }

    private extractSuspiciousIPs(details: IncidentDetails): string[] {
        return Array.isArray(details.suspiciousIPs) ? details.suspiciousIPs : [];
    }

    private async blockIP(ip: string) {
        console.log(`Blocking IP: ${ip}`);
        // Implementation would go here
    }

    private async forcePasswordReset(userId: string) {
        console.log(`Forcing password reset for user: ${userId}`);
        // Implementation would go here
    }

    private async isolateSystems(systems: string[]) {
        console.log(`Isolating systems: ${systems.join(', ')}`);
        // Implementation would go here
    }

    private async verifyDataBackups() {
        console.log('Verifying data backups');
        // Implementation would go here
    }

    private async prepareBreachNotification(incident: SecurityIncident) {
        console.log('Preparing breach notification');
        // Implementation would go here
    }

    private async enableDDoSMitigation() {
        console.log('Enabling DDoS mitigation');
        // Implementation would go here
    }

    private async scaleResources() {
        console.log('Scaling resources');
        // Implementation would go here
    }

    private async updateFirewallRules(details: IncidentDetails) {
        console.log('Updating firewall rules');
        // Implementation would go here
    }

    private isValidSecurityIncident(item: any): item is SecurityIncident {
        return (
            typeof item === 'object' &&
            item !== null &&
            typeof item.id === 'string' &&
            typeof item.type === 'string' &&
            typeof item.severity === 'string' &&
            typeof item.details === 'object' &&
            item.details !== null
        );
    }
}

// Export singleton instance
export const incidentResponse = new IncidentResponseSystem(); 