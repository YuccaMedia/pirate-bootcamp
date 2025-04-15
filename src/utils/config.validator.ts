import { EnvUtils } from './env.utils';

export interface SecurityConfig {
    database: {
        encryptionKey: string;
        ssl: {
            caPath: string;
            keyPath: string;
            certPath: string;
        };
    };
    monitoring: {
        alertEmails: string[];
        smtp: {
            host: string;
            port: number;
            secure: boolean;
            user: string;
            pass: string;
            fromEmail: string;
        };
        slack?: {
            token?: string;
            webhook?: string;
            channel?: string;
        };
        metrics: {
            prometheusPort: number;
            grafanaPort: number;
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
        nodeEnv: 'development' | 'production' | 'test';
        https: boolean;
        allowedOrigins: string[];
        sessionSecret: string;
        tls: {
            version: string;
            ciphers: string[];
        };
    };
    accessControl: {
        mfa: boolean;
        password: {
            minLength: number;
            requireComplexity: boolean;
            expiryDays: number;
            historySize: number;
        };
        session: {
            timeout: number;
            secure: boolean;
            sameSite: 'strict' | 'lax' | 'none';
        };
    };
    networkSecurity: {
        ddosProtection: boolean;
        rateLimit: {
            windowMs: number;
            maxRequests: number;
        };
    };
}

export class ConfigValidator {
    /**
     * Load and validate the entire configuration
     */
    static loadConfig(): SecurityConfig {
        // Validate all required environment variables first
        this.validateRequiredEnv();

        return {
            database: this.loadDatabaseConfig(),
            monitoring: this.loadMonitoringConfig(),
            ipfs: this.loadIPFSConfig(),
            security: this.loadSecurityConfig(),
            accessControl: this.loadAccessControlConfig(),
            networkSecurity: this.loadNetworkSecurityConfig()
        };
    }

    private static validateRequiredEnv(): void {
        // Validate security-related environment variables
        EnvUtils.validateSecurityEnv();

        // Validate IPFS configuration
        const ipfsVars: Array<keyof NodeJS.ProcessEnv> = [
            'PINATA_API_KEY',
            'PINATA_API_SECRET',
            'PINATA_JWT'
        ];
        EnvUtils.validateEnv(ipfsVars);
    }

    private static loadDatabaseConfig() {
        return {
            encryptionKey: EnvUtils.getString('DB_ENCRYPTION_KEY'),
            ssl: {
                caPath: EnvUtils.getString('DB_SSL_CA_PATH'),
                keyPath: EnvUtils.getString('DB_SSL_KEY_PATH'),
                certPath: EnvUtils.getString('DB_SSL_CERT_PATH')
            }
        };
    }

    private static loadMonitoringConfig() {
        return {
            alertEmails: EnvUtils.getStringArray('ALERT_EMAILS'),
            smtp: {
                host: EnvUtils.getString('SMTP_HOST'),
                port: EnvUtils.getPort('SMTP_PORT', 587),
                secure: EnvUtils.getSmtpSecure(),
                user: EnvUtils.getString('SMTP_USER'),
                pass: EnvUtils.getString('SMTP_PASS'),
                fromEmail: EnvUtils.getString('ALERT_FROM_EMAIL')
            },
            slack: this.loadSlackConfig(),
            metrics: {
                prometheusPort: EnvUtils.getPort('PROMETHEUS_PORT', 9090),
                grafanaPort: EnvUtils.getPort('GRAFANA_PORT', 3000)
            }
        };
    }

    private static loadSlackConfig() {
        const token = process.env.SLACK_TOKEN;
        const webhook = process.env.SLACK_WEBHOOK;
        const channel = process.env.SLACK_CHANNEL;

        if (!token && !webhook) return undefined;

        return {
            ...(token && { token }),
            ...(webhook && { webhook }),
            ...(channel && { channel })
        };
    }

    private static loadIPFSConfig() {
        return {
            pinata: {
                apiKey: EnvUtils.getString('PINATA_API_KEY'),
                apiSecret: EnvUtils.getString('PINATA_API_SECRET'),
                jwt: EnvUtils.getString('PINATA_JWT')
            }
        };
    }

    private static loadSecurityConfig() {
        return {
            nodeEnv: EnvUtils.getNodeEnv(),
            https: EnvUtils.getBoolean('HTTPS', true),
            allowedOrigins: EnvUtils.getStringArray('ALLOWED_ORIGINS'),
            sessionSecret: EnvUtils.getString('SESSION_SECRET'),
            tls: {
                version: EnvUtils.getString('TLS_VERSION'),
                ciphers: EnvUtils.getStringArray('ALLOWED_CIPHERS')
            }
        };
    }

    private static loadAccessControlConfig() {
        return {
            mfa: EnvUtils.getBoolean('ENFORCE_MFA', true),
            password: {
                minLength: EnvUtils.getNumber('PASSWORD_MIN_LENGTH', 12),
                requireComplexity: EnvUtils.getBoolean('PASSWORD_REQUIRE_COMPLEXITY', true),
                expiryDays: EnvUtils.getNumber('PASSWORD_EXPIRY_DAYS', 90),
                historySize: EnvUtils.getNumber('PASSWORD_HISTORY_SIZE', 5)
            },
            session: {
                timeout: EnvUtils.getNumber('SESSION_TIMEOUT', 3600),
                secure: EnvUtils.getBoolean('SESSION_SECURE', true),
                sameSite: EnvUtils.getSameSite()
            }
        };
    }

    private static loadNetworkSecurityConfig() {
        return {
            ddosProtection: EnvUtils.getDDoSProtection() === 'enabled',
            rateLimit: {
                windowMs: EnvUtils.getNumber('RATE_LIMIT_WINDOW', 900000),
                maxRequests: EnvUtils.getNumber('RATE_LIMIT_MAX', 100)
            }
        };
    }
} 