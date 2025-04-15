import { createHash } from 'crypto';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { SecurityMonitoringUtils } from '../config/security-monitoring.config';

interface BackupMetadata {
    timestamp: string;
    checksum: string;
    size: number;
    encrypted: boolean;
}

interface BackupVerificationResult {
    isValid: boolean;
    errors?: string[];
    metadata?: BackupMetadata;
}

export class BackupVerificationService {
    private readonly backupPath: string;
    private readonly metadataPath: string;
    private readonly requiredFiles = [
        'database-dump.sql',
        'user-data.json',
        'configuration.json',
        'encryption-keys.enc'
    ];

    constructor() {
        this.backupPath = process.env.BACKUP_PATH || '/var/backups/app';
        this.metadataPath = join(this.backupPath, 'metadata.json');
    }

    // Verify backup integrity
    async verifyBackup(): Promise<BackupVerificationResult> {
        try {
            const errors: string[] = [];
            
            // Check if all required files exist
            for (const file of this.requiredFiles) {
                const filePath = join(this.backupPath, file);
                try {
                    const metadata = await this.verifyFile(filePath);
                    if (!metadata.isValid) {
                        errors.push(`Invalid checksum for file: ${file}`);
                    }
                } catch (error) {
                    errors.push(`Failed to verify file ${file}: ${error.message}`);
                }
            }

            // Verify backup metadata
            const metadata = await this.loadBackupMetadata();
            if (!metadata) {
                errors.push('Backup metadata not found');
            }

            const isValid = errors.length === 0;
            if (!isValid) {
                await SecurityMonitoringUtils.trackSecurityEvent(
                    'backup-verification-failed',
                    'high',
                    { errors }
                );
            }

            return {
                isValid,
                errors: errors.length > 0 ? errors : undefined,
                metadata: metadata || undefined
            };
        } catch (error) {
            await SecurityMonitoringUtils.trackSecurityEvent(
                'backup-verification-error',
                'critical',
                { error: error.message }
            );
            throw error;
        }
    }

    // Verify individual file integrity
    private async verifyFile(filePath: string): Promise<{ isValid: boolean; checksum: string }> {
        try {
            const fileContent = await readFile(filePath);
            const actualChecksum = this.calculateChecksum(fileContent);
            const metadata = await this.loadBackupMetadata();
            
            if (!metadata || !metadata[filePath]) {
                throw new Error(`No metadata found for file: ${filePath}`);
            }

            const expectedChecksum = metadata[filePath].checksum;
            const isValid = actualChecksum === expectedChecksum;

            if (!isValid) {
                await SecurityMonitoringUtils.trackSecurityEvent(
                    'file-integrity-check-failed',
                    'high',
                    {
                        file: filePath,
                        expectedChecksum,
                        actualChecksum
                    }
                );
            }

            return { isValid, checksum: actualChecksum };
        } catch (error) {
            throw new Error(`File verification failed: ${error.message}`);
        }
    }

    // Calculate file checksum
    private calculateChecksum(data: Buffer): string {
        return createHash('sha256').update(data).digest('hex');
    }

    // Load backup metadata
    private async loadBackupMetadata(): Promise<Record<string, BackupMetadata> | null> {
        try {
            const content = await readFile(this.metadataPath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            return null;
        }
    }

    // Update backup metadata
    async updateBackupMetadata(filePath: string, metadata: BackupMetadata): Promise<void> {
        try {
            const currentMetadata = await this.loadBackupMetadata() || {};
            currentMetadata[filePath] = metadata;
            await writeFile(this.metadataPath, JSON.stringify(currentMetadata, null, 2));
            
            await SecurityMonitoringUtils.trackSecurityEvent(
                'backup-metadata-updated',
                'info',
                { file: filePath, metadata }
            );
        } catch (error) {
            await SecurityMonitoringUtils.trackSecurityEvent(
                'backup-metadata-update-failed',
                'high',
                { file: filePath, error: error.message }
            );
            throw error;
        }
    }

    // Verify backup encryption
    async verifyEncryption(filePath: string): Promise<boolean> {
        try {
            const metadata = await this.loadBackupMetadata();
            if (!metadata || !metadata[filePath]) {
                throw new Error(`No metadata found for file: ${filePath}`);
            }

            const isEncrypted = metadata[filePath].encrypted;
            if (!isEncrypted) {
                await SecurityMonitoringUtils.trackSecurityEvent(
                    'unencrypted-backup-detected',
                    'critical',
                    { file: filePath }
                );
            }

            return isEncrypted;
        } catch (error) {
            await SecurityMonitoringUtils.trackSecurityEvent(
                'encryption-verification-failed',
                'high',
                { file: filePath, error: error.message }
            );
            throw error;
        }
    }
} 