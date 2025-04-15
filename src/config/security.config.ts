import dotenv from 'dotenv';
import { Logger } from '../utils/logger.utils';

dotenv.config();

const logger = new Logger('SecurityConfig');

export interface SecurityConfig {
    database: {
        encryption: {
            key: string;
            algorithm: string;
        };
        ssl: {
            ca: string;
            key: string;
            cert: string;
        };
    };
    monitoring: {
        alerts: {
            emails: string[];
            from: string;
            smtp: {
                host: string;
                port: number;
                secure: boolean;
                user: string;
                pass: string;
            };
        };
        slack?: {
            token?: string;
            webhook?: string;
            channel?: string;
        };
    };
    ipfs: {
        pinata: {
            apiKey: string;
            apiSecret: string;
            jwt: string;
        };
    };
    security: {
        enforceHttps: boolean;
        allowedOrigins: string[];
        sessionSecret: string;
        accessControl: {
            enforceMfa: boolean;
            passwordMinLength: number;
            passwordRequireComplexity: boolean;
            passwordExpiryDays: number;
            passwordHistorySize: number;
        };
        session: {
            timeout: number;
            secure: boolean;
            sameSite: 'strict' | 'lax' | 'none';
        };
        encryption: {
            tlsVersion: string;
            allowedCiphers: string[];
            backupEncryptionKey: string;
            contentEncryptionEnabled: boolean;
        };
        audit: {
            logRetentionDays: number;
            enabled: boolean;
            detailed: boolean;
        };
        network: {
            ddosProtection: string;
            rateLimitWindow: number;
            rateLimitMax: number;
        };
        dataProtection: {
            dataRetentionDays: number;
            backupRetentionDays: number;
            gdprEnabled: boolean;
            pciCompliance: boolean;
        };
        securityRecommendations: {
            ipfsContentEncryption: 'Recommended' | 'Implemented' | 'Missing';
            accessControlForPins: 'Recommended' | 'Implemented' | 'Missing';
            periodicContentValidation: 'Recommended' | 'Implemented' | 'Missing';
        };
    };
    apiAccess: {
        admin: string;
        dev: string;
        stakeholder: string;
    };
}

// Load configuration from environment variables
export function loadSecurityConfig(): SecurityConfig {
    logger.info('Loading security configuration');
    
    return {
        database: {
            encryption: {
                key: process.env.DB_ENCRYPTION_KEY || '',
                algorithm: 'aes-256-gcm'
            },
            ssl: {
                ca: process.env.DB_SSL_CA_PATH || '',
                key: process.env.DB_SSL_KEY_PATH || '',
                cert: process.env.DB_SSL_CERT_PATH || ''
            }
        },
        monitoring: {
            alerts: {
                emails: (process.env.ALERT_EMAILS || '').split(','),
                from: process.env.ALERT_FROM_EMAIL || '',
                smtp: {
                    host: process.env.SMTP_HOST || '',
                    port: parseInt(process.env.SMTP_PORT || '587'),
                    secure: process.env.SMTP_SECURE === 'true',
                    user: process.env.SMTP_USER || '',
                    pass: process.env.SMTP_PASS || ''
                }
            },
            slack: {
                token: process.env.SLACK_TOKEN,
                webhook: process.env.SLACK_WEBHOOK,
                channel: process.env.SLACK_CHANNEL
            }
        },
        ipfs: {
            pinata: {
                apiKey: process.env.PINATA_API_KEY || '',
                apiSecret: process.env.PINATA_API_SECRET || '',
                jwt: process.env.PINATA_JWT || ''
            }
        },
        security: {
            enforceHttps: process.env.HTTPS === 'true',
            allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(','),
            sessionSecret: process.env.SESSION_SECRET || '',
            accessControl: {
                enforceMfa: process.env.ENFORCE_MFA === 'true',
                passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '12'),
                passwordRequireComplexity: process.env.PASSWORD_REQUIRE_COMPLEXITY === 'true',
                passwordExpiryDays: parseInt(process.env.PASSWORD_EXPIRY_DAYS || '90'),
                passwordHistorySize: parseInt(process.env.PASSWORD_HISTORY_SIZE || '5')
            },
            session: {
                timeout: parseInt(process.env.SESSION_TIMEOUT || '3600'),
                secure: process.env.SESSION_SECURE === 'true',
                sameSite: (process.env.SESSION_SAME_SITE || 'strict') as 'strict' | 'lax' | 'none'
            },
            encryption: {
                tlsVersion: process.env.TLS_VERSION || '1.3',
                allowedCiphers: (process.env.ALLOWED_CIPHERS || '').split(','),
                backupEncryptionKey: process.env.BACKUP_ENCRYPTION_KEY || '',
                contentEncryptionEnabled: true
            },
            audit: {
                logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '90'),
                enabled: process.env.AUDIT_ENABLED === 'true',
                detailed: process.env.AUDIT_DETAILED === 'true'
            },
            network: {
                ddosProtection: process.env.DDOS_PROTECTION || 'enabled',
                rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'),
                rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100')
            },
            dataProtection: {
                dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '365'),
                backupRetentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '90'),
                gdprEnabled: process.env.GDPR_ENABLED === 'true',
                pciCompliance: process.env.PCI_COMPLIANCE === 'true'
            },
            securityRecommendations: {
                ipfsContentEncryption: 'Implemented',
                accessControlForPins: 'Implemented',
                periodicContentValidation: 'Implemented'
            }
        },
        apiAccess: {
            admin: process.env.MASTERKEY_ADMIN || '',
            dev: process.env.USERKEY_DEV || '',
            stakeholder: process.env.STAKEHOLDER_KEY || ''
        }
    };
}

// Function to validate security configuration
export function validateSecurityConfig(config: SecurityConfig): boolean {
    logger.info('Validating security configuration');
    
    // Check TLS version
    if (config.security.encryption.tlsVersion !== '1.3' && config.security.encryption.tlsVersion !== '1.2') {
        logger.error('Invalid TLS version configuration');
        return false;
    }
    
    // Check password minimum length
    if (config.security.accessControl.passwordMinLength < 12) {
        logger.error('Password minimum length too short');
        return false;
    }
    
    // Check session timeout (max 1 hour recommended)
    if (config.security.session.timeout > 3600) {
        logger.warn('Session timeout exceeds recommended maximum');
    }
    
    // Verify DDOS protection is enabled in production
    if (process.env.NODE_ENV === 'production' && config.security.network.ddosProtection !== 'enabled') {
        logger.error('DDOS protection should be enabled in production');
        return false;
    }
    
    // Check content encryption is enabled for IPFS
    if (!config.security.encryption.contentEncryptionEnabled) {
        logger.warn('IPFS content encryption is not enabled');
    }
    
    return true;
} 