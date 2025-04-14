import {
    Transaction,
    PublicKey,
    Connection,
    TransactionInstruction
} from '@solana/web3.js';
import { SecurityConfig } from '../config/security.config';

export class TransactionSecurityMiddleware {
    private connection: Connection;

    constructor(connection: Connection) {
        this.connection = connection;
    }

    /**
     * Validates a transaction before processing
     */
    async validateTransaction(transaction: Transaction): Promise<boolean> {
        try {
            // Check number of instructions
            if (transaction.instructions.length > SecurityConfig.program.maxInstructions) {
                throw new Error('Transaction exceeds maximum number of instructions');
            }

            // Verify all required signatures are present
            if (SecurityConfig.program.requireAllSignatures) {
                const signers = new Set(transaction.signatures.map(s => s.publicKey.toBase58()));
                for (const instruction of transaction.instructions) {
                    for (const key of instruction.keys) {
                        if (key.isSigner && !signers.has(key.pubkey.toBase58())) {
                            throw new Error('Missing required signature');
                        }
                    }
                }
            }

            // Verify recent blockhash if required
            if (SecurityConfig.wallet.enforceRecentBlockhash) {
                const isRecentBlockhash = await this.connection.getRecentBlockhash()
                    .then(({ blockhash }) => transaction.recentBlockhash === blockhash);
                if (!isRecentBlockhash) {
                    throw new Error('Invalid or expired blockhash');
                }
            }

            // Validate account sizes
            for (const instruction of transaction.instructions) {
                if (!this.validateInstructionAccounts(instruction)) {
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('Transaction validation error:', error);
            return false;
        }
    }

    /**
     * Validates instruction accounts
     */
    private validateInstructionAccounts(instruction: TransactionInstruction): boolean {
        try {
            // Check account data size
            for (const key of instruction.keys) {
                // You would typically fetch the account info here
                // This is a simplified check
                this.connection.getAccountInfo(key.pubkey)
                    .then(accountInfo => {
                        if (accountInfo && accountInfo.data.length > SecurityConfig.program.maxAccountSize) {
                            throw new Error('Account data size exceeds maximum allowed');
                        }
                    });
            }

            return true;
        } catch (error) {
            console.error('Instruction account validation error:', error);
            return false;
        }
    }

    /**
     * Sanitizes transaction data
     */
    sanitizeTransactionData(data: Buffer): Buffer {
        // Implement data sanitization logic
        // This is a basic example - enhance based on your needs
        return Buffer.from(data.toString('hex'), 'hex');
    }

    /**
     * Monitors transaction for suspicious patterns
     */
    async monitorTransaction(transaction: Transaction): Promise<void> {
        try {
            // Log transaction details for monitoring
            console.log('Transaction monitoring:', {
                signatures: transaction.signatures.map(s => s.publicKey.toBase58()),
                numInstructions: transaction.instructions.length,
                recentBlockhash: transaction.recentBlockhash,
                timestamp: new Date().toISOString()
            });

            // Add additional monitoring logic here
            // For example, checking for known malicious patterns
            // or implementing rate limiting per wallet
        } catch (error) {
            console.error('Transaction monitoring error:', error);
        }
    }
} 