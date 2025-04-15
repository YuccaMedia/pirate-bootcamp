import { SecurityMonitoringUtils } from '../config/security-monitoring.config';
import { ComplianceMonitoringService } from '../services/compliance-monitoring.service';
import { BackupVerificationService } from '../services/backup-verification.service';
import { NetworkSecurityService } from '../services/network-security.service';
import { SecurityReport } from '../types/security.types';
import { writeFile } from 'fs/promises';
import { join } from 'path';

async function runSecurityCheck(): Promise<void> {
    const report: SecurityReport = {
        timestamp: new Date(),
        overallStatus: 'pass',
        compliance: {
            status: 'pass',
            checks: [],
            failures: 0
        },
        backups: {
            status: 'pass',
            verified: 0,
            failed: 0,
            details: []
        },
        network: {
            status: 'pass',
            ddosProtection: false,
            firewallStatus: 'unknown',
            suspiciousIPs: []
        },
        recommendations: []
    };

    try {
        // Initialize services
        const complianceService = new ComplianceMonitoringService();
        const backupService = new BackupVerificationService();
        const networkService = new NetworkSecurityService();

        // Run compliance checks
        console.log('Running compliance checks...');
        const complianceReport = await complianceService.runComplianceChecks();
        report.compliance = {
            status: complianceReport.overallStatus,
            checks: complianceReport.checks,
            failures: complianceReport.failures
        };
        
        if (complianceReport.failures > 0) {
            report.overallStatus = 'fail';
            report.recommendations.push(
                `Address ${complianceReport.failures} compliance failures (${complianceReport.criticalFailures} critical)`
            );
            if (complianceReport.standardsAffected.length > 0) {
                report.recommendations.push(
                    `Standards affected: ${complianceReport.standardsAffected.join(', ')}`
                );
            }
        }

        // Verify backups
        console.log('Verifying backups...');
        const backupResult = await backupService.verifyBackup();
        report.backups = {
            status: backupResult.isValid ? 'pass' : 'fail',
            verified: backupResult.verified || 0,
            failed: backupResult.failed || 0,
            details: backupResult.errors?.map(error => ({
                id: error.backupId,
                status: 'fail',
                error: error.message
            })) || []
        };

        if (!backupResult.isValid) {
            report.overallStatus = 'fail';
            report.recommendations.push('Fix backup integrity issues');
        }

        // Check network security
        console.log('Checking network security...');
        const networkStatus = await networkService.checkSecurityStatus();
        report.network = {
            status: networkStatus.isSecure ? 'pass' : 'fail',
            ddosProtection: networkStatus.ddosProtection || false,
            firewallStatus: networkStatus.firewallStatus || 'unknown',
            suspiciousIPs: networkStatus.suspiciousIPs || []
        };

        if (!networkStatus.isSecure) {
            report.overallStatus = 'fail';
            report.recommendations.push('Address network security issues');
        }

        // Save report
        const reportPath = join(__dirname, '../../reports/security-check.json');
        await writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`Security check completed. Report saved to ${reportPath}`);

        // Track event
        await SecurityMonitoringUtils.trackSecurityEvent(
            'security-check-completed',
            report.overallStatus === 'pass' ? 'low' : 'high',
            { report }
        );
    } catch (error) {
        console.error('Security check failed:', error);
        await SecurityMonitoringUtils.trackSecurityEvent(
            'security-check-failed',
            'critical',
            { error: error instanceof Error ? error.message : 'Unknown error' }
        );
        throw error;
    }
}

// Run security check
runSecurityCheck().catch(console.error); 