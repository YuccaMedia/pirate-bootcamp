import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ConfigValidator } from '../utils/config.validator';
import { SecurityLogger } from './security-logger.service';

/**
 * Encryption result containing the encrypted data and encryption metadata
 */
export interface EncryptionResult {
  encryptedData: Buffer;
  iv: Buffer;
  authTag: Buffer;
  algorithm: string;
}

/**
 * Service for encrypting and decrypting IPFS content
 */
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keySize = 32; // 256 bits
  private readonly ivSize = 16; // 128 bits
  private readonly securityLogger: SecurityLogger;
  private readonly keyPath: string;
  private encryptionKey: Buffer | null = null;

  constructor() {
    this.securityLogger = new SecurityLogger();
    const config = ConfigValidator.loadConfig();
    
    // Initialize key path
    const keysDir = path.join(__dirname, '../../keys');
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { recursive: true });
    }
    
    this.keyPath = path.join(keysDir, 'ipfs-encryption.key');
    
    // Load or generate encryption key
    this.loadOrGenerateKey();
  }

  /**
   * Load existing encryption key or generate a new one
   */
  private loadOrGenerateKey(): void {
    try {
      if (fs.existsSync(this.keyPath)) {
        // Load existing key
        this.encryptionKey = fs.readFileSync(this.keyPath);
        console.log('IPFS encryption key loaded successfully');
      } else {
        // Generate new key and save it
        this.encryptionKey = crypto.randomBytes(this.keySize);
        fs.writeFileSync(this.keyPath, this.encryptionKey, { mode: 0o600 }); // Read/write only for owner
        console.log('New IPFS encryption key generated');
        
        // Log key generation event
        this.securityLogger.logSecurityEvent({
          eventType: 'encryption',
          severity: 'medium',
          message: 'New IPFS encryption key generated',
          details: {
            keyPath: this.keyPath,
            algorithm: this.algorithm,
            keySize: this.keySize * 8
          }
        }).catch(console.error);
      }
    } catch (error) {
      console.error('Error initializing encryption key:', error);
      throw new Error('Failed to initialize encryption key');
    }
  }

  /**
   * Encrypt content before uploading to IPFS
   * 
   * @param data Content to encrypt (Buffer or string)
   * @returns Encryption result containing encrypted data and metadata
   */
  encrypt(data: Buffer | string): EncryptionResult {
    try {
      if (!this.encryptionKey) {
        throw new Error('Encryption key not initialized');
      }
      
      // Generate a random initialization vector
      const iv = crypto.randomBytes(this.ivSize);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
      
      // Convert data to Buffer if it's a string
      const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
      
      // Encrypt the data
      const encryptedData = Buffer.concat([
        cipher.update(dataBuffer),
        cipher.final()
      ]);
      
      // Get the authentication tag
      const authTag = cipher.getAuthTag();
      
      return {
        encryptedData,
        iv,
        authTag,
        algorithm: this.algorithm
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt content');
    }
  }

  /**
   * Decrypt content retrieved from IPFS
   * 
   * @param encryptedData Encrypted data buffer
   * @param iv Initialization vector used in encryption
   * @param authTag Authentication tag from encryption
   * @returns Decrypted content as a Buffer
   */
  decrypt(encryptedData: Buffer, iv: Buffer, authTag: Buffer): Buffer {
    try {
      if (!this.encryptionKey) {
        throw new Error('Encryption key not initialized');
      }
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      
      // Set authentication tag
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      const decryptedData = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
      ]);
      
      return decryptedData;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt content');
    }
  }

  /**
   * Create a JSON metadata wrapper for encrypted content
   * 
   * @param result Encryption result
   * @param originalMetadata Original metadata to include
   * @returns Encrypted metadata object
   */
  createEncryptedMetadata(result: EncryptionResult, originalMetadata: Record<string, any> = {}): Record<string, any> {
    return {
      ...originalMetadata,
      encrypted: true,
      encryption: {
        algorithm: result.algorithm,
        iv: result.iv.toString('base64'),
        authTag: result.authTag.toString('base64')
      }
    };
  }

  /**
   * Extract encryption parameters from metadata
   * 
   * @param metadata Metadata with encryption information
   * @returns Object with extracted IV and authTag
   */
  extractEncryptionParams(metadata: Record<string, any>): { iv: Buffer, authTag: Buffer } | null {
    if (!metadata || !metadata.encrypted || !metadata.encryption) {
      return null;
    }
    
    try {
      const { iv, authTag } = metadata.encryption;
      
      return {
        iv: Buffer.from(iv, 'base64'),
        authTag: Buffer.from(authTag, 'base64')
      };
    } catch (error) {
      console.error('Error extracting encryption parameters:', error);
      return null;
    }
  }

  /**
   * Check if content is encrypted based on metadata
   * 
   * @param metadata Content metadata
   * @returns Boolean indicating if content is encrypted
   */
  isEncrypted(metadata: Record<string, any>): boolean {
    return !!(metadata && metadata.encrypted && metadata.encryption);
  }

  /**
   * Rotate encryption key
   * 
   * @returns Boolean indicating success
   */
  async rotateEncryptionKey(): Promise<boolean> {
    try {
      // Generate new key
      const newKey = crypto.randomBytes(this.keySize);
      
      // Backup old key
      if (this.encryptionKey) {
        const backupPath = `${this.keyPath}.${Date.now()}.bak`;
        fs.writeFileSync(backupPath, this.encryptionKey, { mode: 0o600 });
      }
      
      // Save new key
      fs.writeFileSync(this.keyPath, newKey, { mode: 0o600 });
      this.encryptionKey = newKey;
      
      // Log key rotation event
      await this.securityLogger.logSecurityEvent({
        eventType: 'encryption',
        severity: 'medium',
        message: 'IPFS encryption key rotated',
        details: {
          keyPath: this.keyPath,
          timestamp: new Date().toISOString()
        }
      });
      
      return true;
    } catch (error) {
      console.error('Key rotation error:', error);
      await this.securityLogger.logSecurityEvent({
        eventType: 'encryption',
        severity: 'high',
        message: 'IPFS encryption key rotation failed',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
      return false;
    }
  }
} 