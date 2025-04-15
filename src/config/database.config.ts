import { Pool, PoolConfig } from 'pg';
import fs from 'fs';
import path from 'path';

// Database configuration with encryption settings
export const dbConfig: PoolConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: true,
        ca: fs.readFileSync(path.join(__dirname, '../certs/ca.crt')).toString(),
        key: fs.readFileSync(path.join(__dirname, '../certs/client-key.pem')).toString(),
        cert: fs.readFileSync(path.join(__dirname, '../certs/client-cert.pem')).toString(),
    } : undefined,
    // Connection pool settings
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

// Create pool with encryption settings
export const pool = new Pool(dbConfig);

// Encryption at rest configuration
export const dbEncryptionConfig = {
    // Column-level encryption settings
    algorithm: 'aes-256-gcm',
    keySize: 32,
    ivSize: 16,
    // Key rotation settings
    keyRotationInterval: 90 * 24 * 60 * 60 * 1000, // 90 days
    // Backup encryption settings
    backupEncryption: true,
    // Transparent Data Encryption (TDE) settings
    tdeEnabled: process.env.NODE_ENV === 'production',
};

// Database security monitoring
export const dbSecurityConfig = {
    // Audit settings
    auditEnabled: true,
    auditLogPath: path.join(__dirname, '../logs/db-audit.log'),
    // Connection monitoring
    maxConnections: 100,
    connectionTimeout: 10000,
    // Query monitoring
    slowQueryThreshold: 1000, // ms
    queryTimeout: 30000, // ms
};

// Export utility functions for database security
export const dbSecurityUtils = {
    // Encrypt sensitive data before storing
    async encryptData(data: string): Promise<{ encrypted: Buffer; iv: Buffer }> {
        const crypto = require('crypto');
        const key = Buffer.from(process.env.DB_ENCRYPTION_KEY || '', 'hex');
        const iv = crypto.randomBytes(dbEncryptionConfig.ivSize);
        const cipher = crypto.createCipheriv(dbEncryptionConfig.algorithm, key, iv);
        
        const encrypted = Buffer.concat([
            cipher.update(data, 'utf8'),
            cipher.final()
        ]);
        
        return { encrypted, iv };
    },

    // Decrypt data from database
    async decryptData(encrypted: Buffer, iv: Buffer): Promise<string> {
        const crypto = require('crypto');
        const key = Buffer.from(process.env.DB_ENCRYPTION_KEY || '', 'hex');
        const decipher = crypto.createDecipheriv(dbEncryptionConfig.algorithm, key, iv);
        
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);
        
        return decrypted.toString('utf8');
    },

    // Monitor database connections
    async monitorConnections(): Promise<{ totalCount: number; idleCount: number; waitingCount: number }> {
        const result = await pool.query<{ total: string; idle: string; waiting: string }>(
            'SELECT count(*) as total, sum(case when state = \'idle\' then 1 else 0 end) as idle, sum(case when state = \'waiting\' then 1 else 0 end) as waiting FROM pg_stat_activity'
        );
        
        const row = result.rows[0];
        return { 
            totalCount: parseInt(row.total, 10), 
            idleCount: parseInt(row.idle, 10), 
            waitingCount: parseInt(row.waiting, 10) 
        };
    }
}; 