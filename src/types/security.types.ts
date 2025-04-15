// Security event types
export type SecurityEventType = 'intrusion' | 'data-breach' | 'malware' | 'ddos' | 'unauthorized-access';
export type SecuritySeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type SecurityStatus = 'open' | 'investigating' | 'mitigating' | 'resolved' | 'detected';

export interface SecurityEvent {
    type: string;
    timestamp: Date;
    severity: SecuritySeverity;
    source: string;
    message: string;
    data?: Record<string, any>;
}

export interface IncidentDetails {
    suspiciousIPs?: string[];
    affectedUsers?: string[];
    affectedSystems?: string[];
    affectedAccounts?: string[];
    scope?: string;
    sourceIp?: string;
    timestamp?: Date;
    [key: string]: unknown;
}

export interface SecurityIncident {
    id: string;
    type: string;
    severity: SecuritySeverity;
    status: SecurityStatus;
    timestamp: Date;
    details: Record<string, any>;
    affectedSystems?: string[];
    assignedTo?: string;
    resolvedAt?: Date;
    notes?: string;
}

export interface IncidentResponse {
    incidentId: string;
    actions: string[];
    timestamp: Date;
    outcome: 'pending' | 'completed' | 'failed';
}

// Security Monitoring Types
export type AlertChannel = 'email' | 'slack';
export type MetricType = 'counter' | 'histogram' | 'gauge';
export type AutoResponseTrigger = 'failed-login' | 'rate-limit-exceeded' | 'suspicious-activity' | 'security-scan-failed' | 'high-load' | 'ddos-attempt';

export interface AlertThreshold {
    count?: number;
    timeWindow?: number;
    threshold?: number;
    severity: SecuritySeverity;
}

export interface AlertChannelConfig {
    enabled: boolean;
    recipients?: string[];
    webhook?: string;
    channel?: string;
    severity: SecuritySeverity[];
}

export interface AutoResponseAction {
    threshold: number;
    duration?: number;
    triggers: AutoResponseTrigger[];
}

export interface MetricCollector {
    name: string;
    type: MetricType;
    labels: string[];
}

export interface SecurityMonitoringConfig {
    alerting: {
        enabled: boolean;
        channels: Record<AlertChannel, AlertChannelConfig>;
        thresholds: Record<string, AlertThreshold>;
    };
    autoResponse: {
        enabled: boolean;
        actions: Record<string, AutoResponseAction>;
    };
    metrics: {
        enabled: boolean;
        interval: number;
        retention: number;
        collectors: MetricCollector[];
    };
}

// Compliance Types
export type ComplianceCategory = 'data-protection' | 'access-control' | 'encryption' | 'audit' | 'network';
export type ComplianceStandard = 'GDPR' | 'PCI-DSS' | 'SOC2' | 'ISO27001';
export type ComplianceStatus = 'pass' | 'fail' | 'warning';

export interface ComplianceRule {
    id: string;
    category: ComplianceCategory;
    requirement: string;
    severity: SecuritySeverity;
    standard: ComplianceStandard[];
}

export interface ComplianceCheck {
    ruleId: string;
    status: ComplianceStatus;
    details: string;
    timestamp: Date;
}

export interface ComplianceItem {
    id: string;
    name: string;
    description: string;
    status: 'pass' | 'fail' | 'warn';
    details?: Record<string, any>;
}

export interface ComplianceReport {
    framework: string;
    version: string;
    timestamp: Date;
    score: number;
    items: ComplianceItem[];
    status: 'passed' | 'warning' | 'failed';
}

export interface SecurityReport {
    timestamp: Date;
    overallStatus: ComplianceStatus;
    compliance: {
        status: ComplianceStatus;
        checks: ComplianceCheck[];
        failures: number;
    };
    backups: {
        status: 'pass' | 'fail';
        verified: number;
        failed: number;
        details: Array<{
            id: string;
            status: 'pass' | 'fail';
            error?: string;
        }>;
    };
    network: {
        status: 'pass' | 'fail';
        ddosProtection: boolean;
        firewallStatus: 'active' | 'inactive' | 'warning' | 'unknown';
        suspiciousIPs: string[];
    };
    recommendations: string[];
}

// Backup Verification Types
export interface BackupError {
    backupId: string;
    message: string;
    timestamp: Date;
}

export interface BackupVerificationResult {
    timestamp: Date;
    status: 'success' | 'partial' | 'failed';
    totalFiles: number;
    verifiedFiles: number;
    failedFiles: number;
    errors: Array<{
        id: string;
        file: string;
        error: string;
    }>;
    metadata?: BackupMetadata;
}

export interface BackupMetadata {
    timestamp: Date;
    checksum: string;
    size: number;
    encrypted: boolean;
    encryptionMethod?: string;
}

// Network Security Types
export type FirewallStatus = 'active' | 'inactive' | 'warning' | 'unknown';

export interface NetworkSecurityStatus {
    firewalls: {
        status: 'active' | 'warning' | 'error';
        rules: number;
    };
    ddosProtection: {
        status: 'active' | 'warning' | 'error';
        attacks: number;
    };
    intrusionDetection: {
        status: 'active' | 'warning' | 'error';
        alerts: number;
    };
    vulnerabilities: {
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
} 