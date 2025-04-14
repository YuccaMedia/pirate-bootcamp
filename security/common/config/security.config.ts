/**
 * Global Security Configuration
 * This file contains security configurations that are shared across all components
 */

export const GlobalSecurityConfig = {
    // Environment
    environment: process.env.NODE_ENV || 'development',
    
    // Application
    app: {
        name: 'Solana Pirate Adventure',
        version: '1.0.0',
    },

    // Authentication
    auth: {
        jwtExpiryTime: 3600, // 1 hour
        requireSignature: true,
        sessionTimeout: 3600000, // 1 hour in milliseconds
        maxFailedAttempts: 5,
        lockoutDuration: 900000, // 15 minutes in milliseconds
    },

    // Cryptography
    crypto: {
        hashAlgorithm: 'sha256',
        saltRounds: 10,
        keyLength: 32,
        ivLength: 16,
    },

    // Rate Limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        standardHeaders: true,
        legacyHeaders: false,
    },

    // Blockchain
    blockchain: {
        network: process.env.SOLANA_NETWORK || 'devnet',
        commitment: 'confirmed',
        maxRetries: 3,
        confirmationTimeout: 30000, // 30 seconds
    },

    // Monitoring
    monitoring: {
        enabled: true,
        logLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        alertThreshold: {
            errorRate: 0.1, // 10% error rate threshold
            responseTime: 1000, // 1 second response time threshold
        },
    },

    // Security Headers
    headers: {
        csp: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'", 'https://api.devnet.solana.com', 'wss://api.devnet.solana.com'],
            },
        },
        hsts: {
            maxAge: 31536000, // 1 year
            includeSubDomains: true,
            preload: true,
        },
    },

    // Validation
    validation: {
        maxInputLength: 1000,
        allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif'],
        maxFileSize: 5 * 1024 * 1024, // 5MB
    },

    // Error Handling
    errors: {
        showStack: process.env.NODE_ENV !== 'production',
        logErrors: true,
        sanitizeErrors: true,
    },

    // Compliance
    compliance: {
        gdpr: {
            enabled: true,
            dataRetentionDays: 30,
            requireConsent: true,
        },
        audit: {
            enabled: true,
            retentionDays: 90,
        },
    },
} as const;

// Security utility functions
export const SecurityUtils = {
    /**
     * Validates if we're in a secure environment
     */
    isSecureEnvironment(): boolean {
        return process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true';
    },

    /**
     * Gets environment-specific configuration
     */
    getEnvironmentConfig() {
        return {
            isDevelopment: GlobalSecurityConfig.environment === 'development',
            isProduction: GlobalSecurityConfig.environment === 'production',
            isTest: GlobalSecurityConfig.environment === 'test',
        };
    },

    /**
     * Gets network-specific configuration
     */
    getNetworkConfig() {
        return {
            isDevnet: GlobalSecurityConfig.blockchain.network === 'devnet',
            isTestnet: GlobalSecurityConfig.blockchain.network === 'testnet',
            isMainnet: GlobalSecurityConfig.blockchain.network === 'mainnet-beta',
        };
    },
}; 