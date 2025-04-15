import {
    NodeEnv,
    SameSiteMode,
    DDoSProtectionMode,
    SmtpSecureMode,
    PortNumber,
    BooleanString
} from '../types/env.types';

/**
 * Type-safe environment variable parsing utilities
 */
export class EnvUtils {
    /**
     * Get a required string environment variable
     */
    static getString(key: keyof NodeJS.ProcessEnv, defaultValue?: string): string {
        const value = process.env[key];
        if (value === undefined && defaultValue === undefined) {
            throw new Error(`Required environment variable ${key} is not set`);
        }
        return value ?? defaultValue!;
    }

    /**
     * Get a required number environment variable
     */
    static getNumber(key: keyof NodeJS.ProcessEnv, defaultValue?: number): number {
        const value = process.env[key];
        if (value === undefined && defaultValue === undefined) {
            throw new Error(`Required environment variable ${key} is not set`);
        }
        const parsed = value ? parseInt(value, 10) : defaultValue;
        if (parsed === undefined || isNaN(parsed)) {
            throw new Error(`Environment variable ${key} is not a valid number`);
        }
        return parsed;
    }

    /**
     * Get a port number environment variable
     */
    static getPort(key: keyof Pick<NodeJS.ProcessEnv, 'SMTP_PORT' | 'PROMETHEUS_PORT' | 'GRAFANA_PORT'>, defaultValue?: number): number {
        const port = this.getNumber(key, defaultValue);
        if (port < 1 || port > 65535) {
            throw new Error(`Environment variable ${key} must be a valid port number (1-65535)`);
        }
        return port;
    }

    /**
     * Get a required boolean environment variable
     */
    static getBoolean(key: keyof NodeJS.ProcessEnv, defaultValue?: boolean): boolean {
        const value = process.env[key]?.toLowerCase();
        if (value === undefined && defaultValue === undefined) {
            throw new Error(`Required environment variable ${key} is not set`);
        }
        if (value === undefined) return defaultValue!;
        if (value !== 'true' && value !== 'false' && value !== '1' && value !== '0' && value !== 'yes' && value !== 'no') {
            throw new Error(`Environment variable ${key} must be a boolean value (true/false/1/0/yes/no)`);
        }
        return value === 'true' || value === '1' || value === 'yes';
    }

    /**
     * Get a string array from a comma-separated environment variable
     */
    static getStringArray(key: keyof NodeJS.ProcessEnv, defaultValue: string[] = []): string[] {
        const value = process.env[key];
        if (!value) return defaultValue;
        return value.split(',').map(item => item.trim()).filter(Boolean);
    }

    /**
     * Get an environment variable with a specific set of allowed values
     */
    static getEnum<T extends string>(key: keyof NodeJS.ProcessEnv, allowedValues: readonly T[], defaultValue?: T): T {
        const value = process.env[key] as T;
        if (value === undefined && defaultValue === undefined) {
            throw new Error(`Required environment variable ${key} is not set`);
        }
        if (value === undefined) return defaultValue!;
        if (!allowedValues.includes(value)) {
            throw new Error(`Environment variable ${key} must be one of: ${allowedValues.join(', ')}`);
        }
        return value;
    }

    /**
     * Get Node environment
     */
    static getNodeEnv(defaultValue: NodeEnv = 'development'): NodeEnv {
        return this.getEnum('NODE_ENV', ['development', 'production', 'test'] as const, defaultValue);
    }

    /**
     * Get same-site cookie setting
     */
    static getSameSite(defaultValue: SameSiteMode = 'strict'): SameSiteMode {
        return this.getEnum('SESSION_SAME_SITE', ['strict', 'lax', 'none'] as const, defaultValue);
    }

    /**
     * Get DDoS protection mode
     */
    static getDDoSProtection(defaultValue: DDoSProtectionMode = 'enabled'): DDoSProtectionMode {
        return this.getEnum('DDOS_PROTECTION', ['enabled', 'disabled'] as const, defaultValue);
    }

    /**
     * Get SMTP secure mode
     */
    static getSmtpSecure(defaultValue: SmtpSecureMode = 'true'): boolean {
        return this.getEnum('SMTP_SECURE', ['true', 'false'] as const, defaultValue) === 'true';
    }

    /**
     * Validate that all required environment variables are set
     */
    static validateEnv(requiredVars: Array<keyof NodeJS.ProcessEnv>): void {
        const missing = requiredVars.filter(key => !process.env[key]);
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
    }

    /**
     * Validate all security-related environment variables
     */
    static validateSecurityEnv(): void {
        const requiredSecurityVars: Array<keyof NodeJS.ProcessEnv> = [
            'DB_ENCRYPTION_KEY',
            'SESSION_SECRET',
            'BACKUP_ENCRYPTION_KEY',
            'TLS_VERSION',
            'ALLOWED_CIPHERS'
        ];

        this.validateEnv(requiredSecurityVars);

        // Validate TLS version
        const tlsVersion = this.getString('TLS_VERSION');
        if (tlsVersion !== '1.3') {
            throw new Error('TLS version must be 1.3 for security compliance');
        }

        // Validate cipher suites
        const ciphers = this.getStringArray('ALLOWED_CIPHERS');
        const requiredCiphers = [
            'TLS_AES_128_GCM_SHA256',
            'TLS_AES_256_GCM_SHA384',
            'TLS_CHACHA20_POLY1305_SHA256'
        ];
        const missingCiphers = requiredCiphers.filter(cipher => !ciphers.includes(cipher));
        if (missingCiphers.length > 0) {
            throw new Error(`Missing required cipher suites: ${missingCiphers.join(', ')}`);
        }
    }
} 