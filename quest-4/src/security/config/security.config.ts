import { Connection } from '@solana/web3.js';

export const SecurityConfig = {
    // Rate Limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        standardHeaders: true,
        legacyHeaders: false,
    },

    // Transaction Security
    transaction: {
        maxRetries: 3,
        confirmationCommitment: 'confirmed',
        preflightCommitment: 'processed',
        timeout: 30000, // 30 seconds
    },

    // Wallet Security
    wallet: {
        autoConnectTimeout: 10000, // 10 seconds
        requireSignature: true,
        enforceRecentBlockhash: true,
    },

    // Program Security
    program: {
        maxAccountSize: 10 * 1024, // 10KB
        maxInstructions: 10,
        requireAllSignatures: true,
    },

    // API Security
    api: {
        cors: {
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
            methods: ['GET', 'POST'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true,
        },
        jwt: {
            expiresIn: '1h',
            algorithm: 'HS256',
        },
    },

    // Content Security Policy
    csp: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'https://api.devnet.solana.com', 'wss://api.devnet.solana.com'],
        },
    },

    // Solana Connection Security
    solana: {
        connection: {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: 60000,
            wsEndpoint: 'wss://api.devnet.solana.com/',
        },
    },

    // Error Handling
    errors: {
        showStackTrace: process.env.NODE_ENV !== 'production',
        logErrors: true,
        sanitizeErrors: true,
    },
} as const;

// Utility function to create secure Solana connection
export const createSecureConnection = (): Connection => {
    return new Connection(
        process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
        SecurityConfig.solana.connection
    );
}; 