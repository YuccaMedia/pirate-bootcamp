import { SecurityMonitoringUtils } from '../config/security-monitoring.config';
import { readFile } from 'fs/promises';
import { join } from 'path';
import {
    ComplianceRule,
    ComplianceCheck,
    ComplianceReport,
    ComplianceStatus,
    ComplianceCategory,
    ComplianceStandard
} from '../types/security.types';
import { EnvUtils } from '../utils/env.utils';

export class ComplianceMonitoringService {
    private readonly rulesPath: string;
    private rules: ComplianceRule[] = [];

    constructor() {
        this.rulesPath = join(__dirname, '../../config/compliance-rules.json');
        this.loadRules().catch(console.error);
    }

    private async loadRules(): Promise<void> {
        try {
            const content = await readFile(this.rulesPath, 'utf8');
            const parsedRules = JSON.parse(content);
            if (this.validateRules(parsedRules)) {
                this.rules = parsedRules;
            } else {
                throw new Error('Invalid compliance rules format');
            }
        } catch (error) {
            await SecurityMonitoringUtils.trackSecurityEvent(
                'compliance-rules-load-failed',
                'high',
                { error: error instanceof Error ? error.message : 'Unknown error' }
            );
            throw error;
        }
    }

    private validateRules(rules: unknown): rules is ComplianceRule[] {
        if (!Array.isArray(rules)) return false;
        return rules.every(rule => 
            typeof rule === 'object' &&
            rule !== null &&
            typeof rule.id === 'string' &&
            this.isValidCategory(rule.category) &&
            typeof rule.requirement === 'string' &&
            this.isValidSeverity(rule.severity) &&
            Array.isArray(rule.standard) &&
            rule.standard.every((std: unknown) => this.isValidStandard(std))
        );
    }

    private isValidCategory(category: unknown): category is ComplianceCategory {
        const validCategories: ComplianceCategory[] = [
            'data-protection',
            'access-control',
            'encryption',
            'audit',
            'network'
        ];
        return typeof category === 'string' && validCategories.includes(category as ComplianceCategory);
    }

    private isValidStandard(standard: unknown): standard is ComplianceStandard {
        const validStandards: ComplianceStandard[] = ['GDPR', 'PCI-DSS', 'SOC2', 'ISO27001'];
        return typeof standard === 'string' && validStandards.includes(standard as ComplianceStandard);
    }

    private isValidSeverity(severity: unknown): severity is ComplianceCheck['status'] {
        const validSeverities: ComplianceStatus[] = ['pass', 'fail', 'warning'];
        return typeof severity === 'string' && validSeverities.includes(severity as ComplianceStatus);
    }

    async runComplianceChecks(): Promise<ComplianceReport> {
        const checks: ComplianceCheck[] = [];
        
        try {
            // Run all compliance checks
            await this.checkDataProtection(checks);
            await this.checkAccessControl(checks);
            await this.checkEncryption(checks);
            await this.checkAuditTrail(checks);
            await this.checkNetworkSecurity(checks);

            // Analyze results
            const failures = checks.filter(check => check.status === 'fail').length;
            const criticalFailures = checks.filter(check => {
                const rule = this.rules.find(r => r.id === check.ruleId);
                return check.status === 'fail' && rule?.severity === 'critical';
            }).length;

            // Determine affected standards
            const standardsAffected = this.getAffectedStandards(checks);

            // Create report
            const report: ComplianceReport = {
                timestamp: new Date(),
                overallStatus: this.determineOverallStatus(checks),
                checks,
                failures,
                criticalFailures,
                standardsAffected
            };

            // Report failures
            if (failures > 0) {
                await SecurityMonitoringUtils.trackSecurityEvent(
                    'compliance-check-failures',
                    criticalFailures > 0 ? 'critical' : 'high',
                    { report }
                );
            }

            return report;
        } catch (error) {
            await SecurityMonitoringUtils.trackSecurityEvent(
                'compliance-check-error',
                'critical',
                { error: error instanceof Error ? error.message : 'Unknown error' }
            );
            throw error;
        }
    }

    private determineOverallStatus(checks: ComplianceCheck[]): ComplianceStatus {
        if (checks.some(check => check.status === 'fail')) return 'fail';
        if (checks.some(check => check.status === 'warning')) return 'warning';
        return 'pass';
    }

    private getAffectedStandards(checks: ComplianceCheck[]): ComplianceStandard[] {
        const failedRuleIds = checks
            .filter(check => check.status === 'fail')
            .map(check => check.ruleId);

        return Array.from(new Set(
            this.rules
                .filter(rule => failedRuleIds.includes(rule.id))
                .flatMap(rule => rule.standard)
        ));
    }

    // Data Protection Compliance
    private async checkDataProtection(checks: ComplianceCheck[]): Promise<void> {
        // Check data encryption at rest
        checks.push({
            ruleId: 'DP-001',
            status: EnvUtils.getString('DB_ENCRYPTION_KEY', '') ? 'pass' : 'fail',
            details: 'Database encryption at rest',
            timestamp: new Date()
        });

        // Check data backup encryption
        checks.push({
            ruleId: 'DP-002',
            status: EnvUtils.getString('BACKUP_ENCRYPTION_KEY', '') ? 'pass' : 'fail',
            details: 'Backup encryption',
            timestamp: new Date()
        });

        // Check data retention policies
        const hasRetentionPolicy = await this.verifyRetentionPolicy();
        checks.push({
            ruleId: 'DP-003',
            status: hasRetentionPolicy ? 'pass' : 'fail',
            details: 'Data retention policy implementation',
            timestamp: new Date()
        });
    }

    // Access Control Compliance
    private async checkAccessControl(checks: ComplianceCheck[]): Promise<void> {
        // Check MFA enforcement
        checks.push({
            ruleId: 'AC-001',
            status: EnvUtils.getBoolean('ENFORCE_MFA', false) ? 'pass' : 'fail',
            details: 'Multi-factor authentication enforcement',
            timestamp: new Date()
        });

        // Check password policy
        checks.push({
            ruleId: 'AC-002',
            status: this.verifyPasswordPolicy() ? 'pass' : 'fail',
            details: 'Password policy compliance',
            timestamp: new Date()
        });

        // Check session management
        checks.push({
            ruleId: 'AC-003',
            status: this.verifySessionManagement() ? 'pass' : 'fail',
            details: 'Session management security',
            timestamp: new Date()
        });
    }

    // Encryption Compliance
    private async checkEncryption(checks: ComplianceCheck[]): Promise<void> {
        // Check TLS version
        checks.push({
            ruleId: 'EN-001',
            status: EnvUtils.getString('TLS_VERSION', '') === '1.3' ? 'pass' : 'fail',
            details: 'TLS version compliance',
            timestamp: new Date()
        });

        // Check cipher suites
        const hasSecureCiphers = this.verifySecureCiphers();
        checks.push({
            ruleId: 'EN-002',
            status: hasSecureCiphers ? 'pass' : 'fail',
            details: 'Secure cipher suite configuration',
            timestamp: new Date()
        });
    }

    // Audit Trail Compliance
    private async checkAuditTrail(checks: ComplianceCheck[]): Promise<void> {
        // Check audit logging
        checks.push({
            ruleId: 'AU-001',
            status: await this.verifyAuditLogging() ? 'pass' : 'fail',
            details: 'Audit logging implementation',
            timestamp: new Date()
        });

        // Check log retention
        checks.push({
            ruleId: 'AU-002',
            status: await this.verifyLogRetention() ? 'pass' : 'fail',
            details: 'Log retention compliance',
            timestamp: new Date()
        });
    }

    // Network Security Compliance
    private async checkNetworkSecurity(checks: ComplianceCheck[]): Promise<void> {
        // Check firewall configuration
        checks.push({
            ruleId: 'NS-001',
            status: await this.verifyFirewallConfig() ? 'pass' : 'fail',
            details: 'Firewall configuration compliance',
            timestamp: new Date()
        });

        // Check DDoS protection
        checks.push({
            ruleId: 'NS-002',
            status: EnvUtils.getEnum('DDOS_PROTECTION', ['enabled', 'disabled'] as const) === 'enabled' ? 'pass' : 'fail',
            details: 'DDoS protection implementation',
            timestamp: new Date()
        });
    }

    // Utility methods
    private async verifyRetentionPolicy(): Promise<boolean> {
        // Implementation would check actual data retention settings
        return true;
    }

    private verifyPasswordPolicy(): boolean {
        const minLength = EnvUtils.getNumber('PASSWORD_MIN_LENGTH', 0);
        const requiresComplexity = EnvUtils.getBoolean('PASSWORD_REQUIRE_COMPLEXITY', false);
        return minLength >= 12 && requiresComplexity;
    }

    private verifySessionManagement(): boolean {
        const sessionTimeout = EnvUtils.getNumber('SESSION_TIMEOUT', 0);
        const secureSession = EnvUtils.getBoolean('SESSION_SECURE', false);
        return sessionTimeout <= 3600 && secureSession;
    }

    private verifySecureCiphers(): boolean {
        const allowedCiphers = EnvUtils.getStringArray('ALLOWED_CIPHERS');
        const securedCiphers = [
            'TLS_AES_128_GCM_SHA256',
            'TLS_AES_256_GCM_SHA384',
            'TLS_CHACHA20_POLY1305_SHA256'
        ];
        return securedCiphers.every(cipher => allowedCiphers.includes(cipher));
    }

    private async verifyAuditLogging(): Promise<boolean> {
        // Implementation would verify audit log configuration and functionality
        return true;
    }

    private async verifyLogRetention(): Promise<boolean> {
        const retentionDays = EnvUtils.getNumber('LOG_RETENTION_DAYS', 0);
        return retentionDays >= 90;
    }

    private async verifyFirewallConfig(): Promise<boolean> {
        // Implementation would verify firewall rules and configuration
        return true;
    }
} 