import bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { pool } from '../middleware/database.middleware';

// Password validation schema
const passwordSchema = z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
);

interface User {
    id: string;
    email: string;
    password: string;
    mfaSecret?: string;
    mfaEnabled: boolean;
    failedAttempts: number;
    lastFailedAttempt?: Date;
    passwordLastChanged: Date;
}

export class AuthService {
    private static readonly SALT_ROUNDS = 12;
    private static readonly MAX_FAILED_ATTEMPTS = 5;
    private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
    private static readonly PASSWORD_EXPIRY = 90 * 24 * 60 * 60 * 1000; // 90 days

    // Password hashing
    async hashPassword(password: string): Promise<string> {
        try {
            passwordSchema.parse(password);
            return bcrypt.hash(password, AuthService.SALT_ROUNDS);
        } catch (error) {
            throw new Error('Invalid password format');
        }
    }

    // Password verification with brute force protection
    async verifyPassword(user: User, password: string): Promise<boolean> {
        // Check for account lockout
        if (user.failedAttempts >= AuthService.MAX_FAILED_ATTEMPTS) {
            const lockoutEnd = new Date(user.lastFailedAttempt!.getTime() + AuthService.LOCKOUT_DURATION);
            if (new Date() < lockoutEnd) {
                throw new Error('Account is locked. Please try again later.');
            }
            // Reset failed attempts after lockout period
            await this.resetFailedAttempts(user.id);
        }

        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            await this.incrementFailedAttempts(user.id);
            throw new Error('Invalid password');
        }

        await this.resetFailedAttempts(user.id);
        return true;
    }

    // MFA setup
    async setupMFA(userId: string): Promise<string> {
        const secret = authenticator.generateSecret();
        await pool.query(
            'UPDATE users SET mfa_secret = $1, mfa_enabled = false WHERE id = $2',
            [secret, userId]
        );
        return secret;
    }

    // MFA verification
    async verifyMFA(user: User, token: string): Promise<boolean> {
        if (!user.mfaSecret) {
            throw new Error('MFA not set up for this user');
        }

        const isValid = authenticator.verify({
            token,
            secret: user.mfaSecret
        });

        if (isValid && !user.mfaEnabled) {
            await pool.query(
                'UPDATE users SET mfa_enabled = true WHERE id = $1',
                [user.id]
            );
        }

        return isValid;
    }

    // Password expiry check
    async checkPasswordExpiry(user: User): Promise<boolean> {
        const expiryDate = new Date(user.passwordLastChanged.getTime() + AuthService.PASSWORD_EXPIRY);
        return new Date() > expiryDate;
    }

    // Password reset
    async resetPassword(userId: string, newPassword: string): Promise<void> {
        const hashedPassword = await this.hashPassword(newPassword);
        await pool.query(
            'UPDATE users SET password = $1, password_last_changed = NOW() WHERE id = $2',
            [hashedPassword, userId]
        );
    }

    // Failed attempts management
    private async incrementFailedAttempts(userId: string): Promise<void> {
        await pool.query(
            'UPDATE users SET failed_attempts = failed_attempts + 1, last_failed_attempt = NOW() WHERE id = $1',
            [userId]
        );
    }

    private async resetFailedAttempts(userId: string): Promise<void> {
        await pool.query(
            'UPDATE users SET failed_attempts = 0, last_failed_attempt = NULL WHERE id = $1',
            [userId]
        );
    }

    // Token generation for password reset
    async generatePasswordResetToken(userId: string): Promise<string> {
        return jwt.sign(
            { userId, purpose: 'password-reset' },
            process.env.JWT_SECRET!,
            { expiresIn: '1h' }
        );
    }

    // Password history check
    async checkPasswordHistory(userId: string, newPassword: string): Promise<boolean> {
        const result = await pool.query(
            'SELECT password FROM password_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5',
            [userId]
        );

        const hashedPassword = await this.hashPassword(newPassword);
        
        for (const row of result.rows) {
            if (await bcrypt.compare(newPassword, row.password)) {
                return false; // Password was used recently
            }
        }

        // Add new password to history
        await pool.query(
            'INSERT INTO password_history (user_id, password) VALUES ($1, $2)',
            [userId, hashedPassword]
        );

        return true;
    }
} 