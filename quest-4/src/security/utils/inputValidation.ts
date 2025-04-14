import { PublicKey } from '@solana/web3.js';

export class InputValidation {
    /**
     * Validates and sanitizes a public key
     */
    static validatePublicKey(key: string): boolean {
        try {
            // Check if the key is a valid base58 string
            if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(key)) {
                return false;
            }

            // Attempt to create a PublicKey object
            new PublicKey(key);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validates transaction amount
     */
    static validateAmount(amount: number): boolean {
        return (
            typeof amount === 'number' &&
            Number.isFinite(amount) &&
            amount > 0 &&
            amount <= Number.MAX_SAFE_INTEGER
        );
    }

    /**
     * Sanitizes string input
     */
    static sanitizeString(input: string): string {
        // Remove any HTML tags
        let sanitized = input.replace(/<[^>]*>/g, '');
        
        // Remove any script tags and their contents
        sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        
        // Remove potentially dangerous characters
        sanitized = sanitized.replace(/[;&<>"']/g, '');
        
        return sanitized.trim();
    }

    /**
     * Validates program ID
     */
    static validateProgramId(programId: string): boolean {
        try {
            // Check if it's a valid public key
            if (!this.validatePublicKey(programId)) {
                return false;
            }

            // Additional program ID specific checks can be added here
            // For example, checking against a whitelist of known program IDs

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validates instruction data
     */
    static validateInstructionData(data: Buffer): boolean {
        try {
            // Check data length
            if (data.length === 0 || data.length > 1232) { // Solana's max transaction size is 1232 bytes
                return false;
            }

            // Check for potentially malicious patterns
            const dataString = data.toString('hex');
            const suspiciousPatterns = [
                /exec/i,
                /eval/i,
                /function/i,
                /script/i
            ];

            return !suspiciousPatterns.some(pattern => pattern.test(dataString));
        } catch {
            return false;
        }
    }

    /**
     * Validates account metadata
     */
    static validateMetadata(metadata: any): boolean {
        try {
            // Required fields
            const requiredFields = ['name', 'symbol', 'uri'];
            for (const field of requiredFields) {
                if (!metadata[field] || typeof metadata[field] !== 'string') {
                    return false;
                }
            }

            // Name length
            if (metadata.name.length > 32) {
                return false;
            }

            // Symbol length
            if (metadata.symbol.length > 10) {
                return false;
            }

            // URI format
            const uriPattern = /^https?:\/\/.+/i;
            if (!uriPattern.test(metadata.uri)) {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    }
} 