import { PinataService } from './pinata.service';
import { SecurityLogger } from './security-logger.service';
import { NetworkSecurityService } from './network-security.service';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ConfigValidator } from '../utils/config.validator';

interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    timestamp: Date;
}

interface ContentChecksum {
    path: string;
    hash: string;
    lastChecked: Date;
}

/**
 * Service for periodic validation of security-critical content and configurations
 */
export class SecurityValidationService {
    private readonly pinataService: PinataService;
    private readonly securityLogger: SecurityLogger;
    private readonly networkSecurity: NetworkSecurityService;
    private readonly checksumPath: string;
    private readonly validationResultsPath: string;
    private checksums: ContentChecksum[] = [];
    private validationInterval: NodeJS.Timeout | null = null;
    private readonly VALIDATION_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

    constructor() {
        this.pinataService = new PinataService();
        this.securityLogger = new SecurityLogger();
        this.networkSecurity = new NetworkSecurityService();
        
        const logsDir = path.join(__dirname, '../../logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        this.checksumPath = path.join(logsDir, 'content-checksums.json');
        this.validationResultsPath = path.join(logsDir, 'validation-results.json');
        
        // Load existing checksums if available
        this.loadChecksums();
    }
    
    /**
     * Start periodic content validation
     */
    startPeriodicValidation(): void {
        if (this.validationInterval) {
            console.log('Periodic validation is already running');
            return;
        }
        
        console.log('Starting periodic content validation...');
        
        // Run initial validation
        this.validateAllContent().catch(error => {
            console.error('Initial validation failed:', error);
        });
        
        // Schedule periodic validation
        this.validationInterval = setInterval(() => {
            this.validateAllContent().catch(error => {
                console.error('Periodic validation failed:', error);
            });
        }, this.VALIDATION_INTERVAL_MS);
        
        // Log that validation has started
        this.securityLogger.logSecurityEvent({
            eventType: 'configuration',
            severity: 'info',
            message: 'Started periodic content validation',
            details: { interval: `${this.VALIDATION_INTERVAL_MS / 60000} minutes` }
        }).catch(console.error);
    }
    
    /**
     * Stop periodic content validation
     */
    stopPeriodicValidation(): void {
        if (!this.validationInterval) {
            console.log('Periodic validation is not running');
            return;
        }
        
        clearInterval(this.validationInterval);
        this.validationInterval = null;
        
        console.log('Stopped periodic content validation');
        
        // Log that validation has stopped
        this.securityLogger.logSecurityEvent({
            eventType: 'configuration',
            severity: 'info',
            message: 'Stopped periodic content validation',
            details: { timestamp: new Date().toISOString() }
        }).catch(console.error);
    }
    
    /**
     * Validate all security-critical content
     */
    async validateAllContent(): Promise<ValidationResult> {
        console.log('Running comprehensive content validation...');
        
        const errors: string[] = [];
        const warnings: string[] = [];
        
        try {
            // Validate IPFS content integrity
            const ipfsValidation = await this.validateIPFSContent();
            errors.push(...ipfsValidation.errors);
            warnings.push(...ipfsValidation.warnings);
            
            // Validate environment variables
            const envValidation = this.validateEnvironmentVariables();
            errors.push(...envValidation.errors);
            warnings.push(...envValidation.warnings);
            
            // Validate security files integrity
            const fileValidation = await this.validateSecurityFiles();
            errors.push(...fileValidation.errors);
            warnings.push(...fileValidation.warnings);
            
            // Validate network security configuration
            const networkValidation = await this.validateNetworkSecurity();
            errors.push(...networkValidation.errors);
            warnings.push(...networkValidation.warnings);
            
            // Prepare results
            const result: ValidationResult = {
                valid: errors.length === 0,
                errors,
                warnings,
                timestamp: new Date()
            };
            
            // Save validation results
            this.saveValidationResults(result);
            
            // Log validation results
            await this.securityLogger.logSecurityEvent({
                eventType: 'security_validation',
                severity: errors.length > 0 ? 'high' : 'info',
                message: `Content validation completed with ${errors.length} errors and ${warnings.length} warnings`,
                details: {
                    errors: errors.length > 0 ? errors : 'None',
                    warnings: warnings.length > 0 ? warnings : 'None'
                }
            });
            
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await this.securityLogger.logSecurityEvent({
                eventType: 'security_validation',
                severity: 'critical',
                message: 'Content validation failed',
                details: { error: errorMessage }
            });
            
            return {
                valid: false,
                errors: [`Validation process error: ${errorMessage}`],
                warnings,
                timestamp: new Date()
            };
        }
    }
    
    /**
     * Validate IPFS content integrity
     */
    private async validateIPFSContent(): Promise<{ errors: string[], warnings: string[] }> {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        try {
            // Verify Pinata connection
            const connected = await this.pinataService.testConnection();
            if (!connected) {
                errors.push('Cannot connect to Pinata IPFS service');
                return { errors, warnings };
            }
            
            // Get list of pinned content
            const pinList = await this.pinataService.getPinList();
            
            if (!pinList || !pinList.rows || pinList.rows.length === 0) {
                warnings.push('No pinned content found on IPFS');
                return { errors, warnings };
            }
            
            // Check for any recently deleted pins
            // This would be implemented based on your specific requirements
            
            console.log(`Validated ${pinList.rows.length} IPFS pins`);
        } catch (error) {
            errors.push(`IPFS validation error: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        return { errors, warnings };
    }
    
    /**
     * Validate environment variables
     */
    private validateEnvironmentVariables(): { errors: string[], warnings: string[] } {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        try {
            // Use ConfigValidator to check environment configuration using the static method
            const config = ConfigValidator.loadConfig();
            
            // Check critical security settings
            if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
                warnings.push('Application is not running in production mode');
            }
            
            if (!process.env.HTTPS || process.env.HTTPS !== 'true') {
                errors.push('HTTPS is not enabled');
            }
            
            if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'your-secure-session-secret') {
                errors.push('Using default or weak SESSION_SECRET');
            }
            
            if (!process.env.ENFORCE_MFA || process.env.ENFORCE_MFA !== 'true') {
                warnings.push('Multi-factor authentication is not enforced');
            }
            
            // Check for missing required environment variables
            const requiredVars = [
                'PINATA_API_KEY',
                'PINATA_API_SECRET',
                'DB_ENCRYPTION_KEY',
                'SESSION_SECRET',
                'MASTERKEY_ADMIN',
                'USERKEY_DEV'
            ];
            
            for (const varName of requiredVars) {
                if (!process.env[varName]) {
                    errors.push(`Required environment variable ${varName} is missing`);
                } else if (
                    process.env[varName]?.includes('your-') || 
                    process.env[varName]?.includes('here') ||
                    process.env[varName] === 'default-secret'
                ) {
                    errors.push(`Environment variable ${varName} appears to be using a default value`);
                }
            }
            
            console.log(`Validated ${requiredVars.length} environment variables`);
        } catch (error) {
            errors.push(`Environment validation error: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        return { errors, warnings };
    }
    
    /**
     * Validate the integrity of security-critical files
     */
    private async validateSecurityFiles(): Promise<{ errors: string[], warnings: string[] }> {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        try {
            // Security-critical files to validate
            const filesToCheck = [
                path.join(__dirname, '../middleware/auth.middleware.ts'),
                path.join(__dirname, '../config/security.config.ts'),
                path.join(__dirname, '../services/security-logger.service.ts'),
                path.join(__dirname, '../services/network-security.service.ts')
            ];
            
            for (const filePath of filesToCheck) {
                if (!fs.existsSync(filePath)) {
                    errors.push(`Security file not found: ${filePath}`);
                    continue;
                }
                
                const fileContents = fs.readFileSync(filePath, 'utf8');
                const currentHash = this.calculateFileHash(fileContents);
                
                // Check if file has been modified
                const existingChecksum = this.checksums.find(c => c.path === filePath);
                if (existingChecksum) {
                    if (existingChecksum.hash !== currentHash) {
                        warnings.push(`Security file has been modified: ${path.basename(filePath)}`);
                        
                        // Update checksum
                        existingChecksum.hash = currentHash;
                        existingChecksum.lastChecked = new Date();
                    }
                } else {
                    // First time seeing this file, add to checksums
                    this.checksums.push({
                        path: filePath,
                        hash: currentHash,
                        lastChecked: new Date()
                    });
                }
            }
            
            // Save updated checksums
            this.saveChecksums();
            
            console.log(`Validated ${filesToCheck.length} security files`);
        } catch (error) {
            errors.push(`File validation error: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        return { errors, warnings };
    }
    
    /**
     * Validate network security configuration
     */
    private async validateNetworkSecurity(): Promise<{ errors: string[], warnings: string[] }> {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        try {
            // Get recent network actions
            const recentActions = this.networkSecurity.getRecentNetworkActions(20);
            
            // Check for suspicious activity patterns
            const blockIPActions = recentActions.filter(a => a.type === 'block_ip');
            if (blockIPActions.length > 10) {
                warnings.push(`High number of recent IP blocks detected: ${blockIPActions.length}`);
            }
            
            // Check DDoS protection status
            if (process.env.DDOS_PROTECTION !== 'enabled') {
                errors.push('DDoS protection is not enabled');
            }
            
            // Check rate limiting configuration
            const rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW || '0', 10);
            const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || '0', 10);
            
            if (rateLimitWindow <= 0 || rateLimitMax <= 0) {
                errors.push('Rate limiting is not properly configured');
            } else if (rateLimitMax > 200) {
                warnings.push(`Rate limit maximum (${rateLimitMax}) is set too high`);
            }
            
            console.log('Validated network security configuration');
        } catch (error) {
            errors.push(`Network security validation error: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        return { errors, warnings };
    }
    
    /**
     * Calculate SHA-256 hash of file contents
     */
    private calculateFileHash(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }
    
    /**
     * Load content checksums from file
     */
    private loadChecksums(): void {
        try {
            if (fs.existsSync(this.checksumPath)) {
                const data = fs.readFileSync(this.checksumPath, 'utf8');
                this.checksums = JSON.parse(data);
                
                // Convert string dates back to Date objects
                this.checksums.forEach(checksum => {
                    checksum.lastChecked = new Date(checksum.lastChecked);
                });
            }
        } catch (error) {
            console.error('Error loading checksums:', error);
            this.checksums = [];
        }
    }
    
    /**
     * Save content checksums to file
     */
    private saveChecksums(): void {
        try {
            fs.writeFileSync(this.checksumPath, JSON.stringify(this.checksums, null, 2));
        } catch (error) {
            console.error('Error saving checksums:', error);
        }
    }
    
    /**
     * Save validation results to file
     */
    private saveValidationResults(result: ValidationResult): void {
        try {
            // Read existing results if available
            let results: ValidationResult[] = [];
            if (fs.existsSync(this.validationResultsPath)) {
                const data = fs.readFileSync(this.validationResultsPath, 'utf8');
                results = JSON.parse(data);
            }
            
            // Add new result
            results.push(result);
            
            // Keep only the last 100 results
            if (results.length > 100) {
                results = results.slice(-100);
            }
            
            // Save to file
            fs.writeFileSync(this.validationResultsPath, JSON.stringify(results, null, 2));
        } catch (error) {
            console.error('Error saving validation results:', error);
        }
    }
    
    /**
     * Get the latest validation result
     */
    getLatestValidationResult(): ValidationResult | null {
        try {
            if (fs.existsSync(this.validationResultsPath)) {
                const data = fs.readFileSync(this.validationResultsPath, 'utf8');
                const results: ValidationResult[] = JSON.parse(data);
                
                if (results.length > 0) {
                    return results[results.length - 1];
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error getting validation results:', error);
            return null;
        }
    }
} 