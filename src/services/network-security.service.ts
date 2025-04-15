import { exec } from 'child_process';
import { promisify } from 'util';
import { SecurityMonitoringUtils } from '../config/security-monitoring.config';
import { SecuritySeverity } from '../types/security.types';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

interface FirewallRule {
    id: string;
    source: string;
    destination: string;
    port: number;
    protocol: 'tcp' | 'udp' | 'icmp';
    action: 'allow' | 'deny';
}

interface BlockedIP {
    ip: string;
    reason: string;
    timestamp: Date;
    expiry: Date | null; // null means permanent block
}

interface NetworkAction {
    type: 'block_ip' | 'isolate_system' | 'ddos_mitigation' | 'monitoring';
    target: string;
    reason: string;
    timestamp: Date;
    expiry: Date | null;
}

export class NetworkSecurityService {
    private readonly IPTABLES = '/sbin/iptables';
    private readonly MAX_CONN_PER_IP = 50;
    private readonly CONN_PER_SECOND = 10;
    private readonly BURST_LIMIT = 20;
    private blockedIPsPath: string;
    private networkActionsPath: string;

    constructor() {
        const logsDir = path.join(__dirname, '../../logs');
        
        // Ensure logs directory exists
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        this.blockedIPsPath = path.join(logsDir, 'blocked-ips.json');
        this.networkActionsPath = path.join(logsDir, 'network-actions.json');
        
        // Ensure files exist
        this.ensureFileExists(this.blockedIPsPath, []);
        this.ensureFileExists(this.networkActionsPath, []);
    }
    
    private ensureFileExists(filePath: string, defaultContent: any) {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
        }
    }

    // DDoS Mitigation
    async enableDDoSMitigation(): Promise<void> {
        try {
            // Rate limiting rules
            await this.executeCommand(`${this.IPTABLES} -A INPUT -p tcp --syn -m limit --limit ${this.CONN_PER_SECOND}/s --limit-burst ${this.BURST_LIMIT} -j ACCEPT`);
            await this.executeCommand(`${this.IPTABLES} -A INPUT -p tcp --syn -j DROP`);

            // Connection limiting
            await this.executeCommand(`${this.IPTABLES} -A INPUT -p tcp -m connlimit --connlimit-above ${this.MAX_CONN_PER_IP} -j DROP`);

            // Block invalid packets
            await this.executeCommand(`${this.IPTABLES} -A INPUT -m state --state INVALID -j DROP`);

            // Allow established connections
            await this.executeCommand(`${this.IPTABLES} -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT`);

            await SecurityMonitoringUtils.trackSecurityEvent(
                'ddos-protection-enabled',
                'info',
                { timestamp: new Date().toISOString() }
            );
        } catch (error) {
            await SecurityMonitoringUtils.trackSecurityEvent(
                'ddos-protection-failed',
                'high',
                { error }
            );
            throw error;
        }
    }

    // IP Blocking
    async blockIP(ip: string, reason: string, duration?: number): Promise<void> {
        const blockedIPs = this.getBlockedIPs();
        
        // Check if IP is already blocked
        const existingBlock = blockedIPs.find(block => block.ip === ip);
        if (existingBlock) {
            // Update existing block
            existingBlock.reason = reason;
            existingBlock.timestamp = new Date();
            existingBlock.expiry = duration ? new Date(Date.now() + duration) : null;
        } else {
            // Add new block
            blockedIPs.push({
                ip,
                reason,
                timestamp: new Date(),
                expiry: duration ? new Date(Date.now() + duration) : null
            });
        }
        
        // Save updated list
        this.saveBlockedIPs(blockedIPs);
        
        // Log action
        this.logNetworkAction({
            type: 'block_ip',
            target: ip,
            reason,
            timestamp: new Date(),
            expiry: duration ? new Date(Date.now() + duration) : null
        });
        
        // Report security event
        await SecurityMonitoringUtils.trackSecurityEvent(
            'ip-blocked',
            'medium',
            { ip, reason, duration }
        );
    }

    async unblockIP(ip: string): Promise<boolean> {
        const blockedIPs = this.getBlockedIPs();
        const initialCount = blockedIPs.length;
        
        // Remove IP from blocked list
        const updatedList = blockedIPs.filter(block => block.ip !== ip);
        this.saveBlockedIPs(updatedList);
        
        // Check if an IP was actually unblocked
        const wasUnblocked = updatedList.length < initialCount;
        
        if (wasUnblocked) {
            // Log action
            this.logNetworkAction({
                type: 'block_ip',
                target: ip,
                reason: 'Unblocked',
                timestamp: new Date(),
                expiry: null
            });
            
            // Report security event
            await SecurityMonitoringUtils.trackSecurityEvent(
                'ip-unblocked',
                'low' as SecuritySeverity,
                { ip }
            );
        }
        
        return wasUnblocked;
    }

    // Firewall Management
    async addFirewallRule(rule: FirewallRule): Promise<void> {
        try {
            const action = rule.action.toUpperCase();
            await this.executeCommand(
                `${this.IPTABLES} -A INPUT -p ${rule.protocol} -s ${rule.source} -d ${rule.destination} --dport ${rule.port} -j ${action}`
            );
            await SecurityMonitoringUtils.trackSecurityEvent(
                'firewall-rule-added',
                'info',
                { rule }
            );
        } catch (error) {
            await SecurityMonitoringUtils.trackSecurityEvent(
                'firewall-rule-failed',
                'high',
                { rule, error }
            );
            throw error;
        }
    }

    // System Isolation
    async isolateSystem(systemId: string): Promise<void> {
        // Log the action
        this.logNetworkAction({
            type: 'isolate_system',
            target: systemId,
            reason: 'Security incident response',
            timestamp: new Date(),
            expiry: null
        });
        
        // Report security event
        await SecurityMonitoringUtils.trackSecurityEvent(
            'system-isolated',
            'high',
            { systemId }
        );
    }

    // Network Monitoring
    async monitorNetworkActivity(): Promise<void> {
        // Log the action
        this.logNetworkAction({
            type: 'monitoring',
            target: 'all',
            reason: 'Enhanced security monitoring',
            timestamp: new Date(),
            expiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });
        
        // Report security event
        await SecurityMonitoringUtils.trackSecurityEvent(
            'enhanced-monitoring-enabled',
            'medium',
            { duration: '24 hours' }
        );
        
        // Additional monitoring would be implemented here
    }

    isIPBlocked(ip: string): boolean {
        const blockedIPs = this.getBlockedIPs();
        
        // Find the IP in the blocked list
        const block = blockedIPs.find(block => block.ip === ip);
        
        // If not found, it's not blocked
        if (!block) {
            return false;
        }
        
        // If expiry is null, it's permanently blocked
        if (block.expiry === null) {
            return true;
        }
        
        // Check if the block has expired
        const now = new Date();
        return new Date(block.expiry) > now;
    }
    
    getRecentNetworkActions(count: number = 10): NetworkAction[] {
        const actions = this.getNetworkActions();
        return actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                     .slice(0, count);
    }
    
    private getBlockedIPs(): BlockedIP[] {
        try {
            const data = fs.readFileSync(this.blockedIPsPath, 'utf8');
            return JSON.parse(data) as BlockedIP[];
        } catch (error) {
            console.error('Error reading blocked IPs:', error);
            return [];
        }
    }
    
    private saveBlockedIPs(blockedIPs: BlockedIP[]): void {
        try {
            fs.writeFileSync(this.blockedIPsPath, JSON.stringify(blockedIPs, null, 2));
        } catch (error) {
            console.error('Error saving blocked IPs:', error);
        }
    }
    
    private getNetworkActions(): NetworkAction[] {
        try {
            const data = fs.readFileSync(this.networkActionsPath, 'utf8');
            return JSON.parse(data) as NetworkAction[];
        } catch (error) {
            console.error('Error reading network actions:', error);
            return [];
        }
    }
    
    private logNetworkAction(action: NetworkAction): void {
        try {
            const actions = this.getNetworkActions();
            actions.push(action);
            fs.writeFileSync(this.networkActionsPath, JSON.stringify(actions, null, 2));
        } catch (error) {
            console.error('Error logging network action:', error);
        }
    }

    private async executeCommand(command: string): Promise<void> {
        try {
            await execAsync(command);
        } catch (error) {
            console.error(`Error executing command '${command}':`, error);
            throw new Error(`Failed to execute command: ${error}`);
        }
    }
} 