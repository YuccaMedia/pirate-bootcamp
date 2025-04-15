export {};

// Type definitions for environment variable values
export type NodeEnv = 'development' | 'production' | 'test';
export type SameSiteMode = 'strict' | 'lax' | 'none';
export type DDoSProtectionMode = 'enabled' | 'disabled';
export type SmtpSecureMode = 'true' | 'false';
export type PortNumber = `${number}`;
export type BooleanString = 'true' | 'false';

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            // Pinata IPFS
            PINATA_API_KEY: string;
            PINATA_API_SECRET: string;
            PINATA_JWT: string;

            // Database Security
            DB_ENCRYPTION_KEY: string;
            DB_SSL_CA_PATH: string;
            DB_SSL_KEY_PATH: string;
            DB_SSL_CERT_PATH: string;

            // Security Monitoring
            ALERT_EMAILS: string;
            ALERT_FROM_EMAIL: string;
            SMTP_HOST: string;
            SMTP_PORT: PortNumber;
            SMTP_SECURE: SmtpSecureMode;
            SMTP_USER: string;
            SMTP_PASS: string;

            // Slack Integration
            SLACK_TOKEN?: string;
            SLACK_WEBHOOK?: string;
            SLACK_CHANNEL?: string;

            // Security Scanning
            SONAR_URL: string;
            SONAR_TOKEN: string;
            DOCKER_IMAGE: string;

            // Monitoring Metrics
            PROMETHEUS_PORT: PortNumber;
            GRAFANA_PORT: PortNumber;

            // Infrastructure Security
            NODE_ENV: NodeEnv;
            HTTPS: BooleanString;
            ALLOWED_ORIGINS: string;
            SESSION_SECRET: string;

            // Access Control
            ENFORCE_MFA: BooleanString;
            PASSWORD_MIN_LENGTH: string;
            PASSWORD_REQUIRE_COMPLEXITY: BooleanString;
            PASSWORD_EXPIRY_DAYS: string;
            PASSWORD_HISTORY_SIZE: string;

            // Session Security
            SESSION_TIMEOUT: string;
            SESSION_SECURE: BooleanString;
            SESSION_SAME_SITE: SameSiteMode;

            // Encryption
            TLS_VERSION: string;
            ALLOWED_CIPHERS: string;
            BACKUP_ENCRYPTION_KEY: string;

            // Audit & Logging
            LOG_RETENTION_DAYS: string;
            AUDIT_ENABLED: BooleanString;
            AUDIT_DETAILED: BooleanString;

            // Network Security
            DDOS_PROTECTION: DDoSProtectionMode;
            RATE_LIMIT_WINDOW: string;
            RATE_LIMIT_MAX: string;

            // Data Protection
            DATA_RETENTION_DAYS: string;
            BACKUP_RETENTION_DAYS: string;
            GDPR_ENABLED: BooleanString;
            PCI_COMPLIANCE: BooleanString;
        }
    }
} 