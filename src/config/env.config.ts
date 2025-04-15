import * as dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define the environment schema
const envSchema = z.object({
    PINATA_API_KEY: z.string().min(1, 'PINATA_API_KEY is required'),
    PINATA_API_SECRET: z.string().min(1, 'PINATA_API_SECRET is required'),
    PINATA_JWT: z.string().min(1, 'PINATA_JWT is required'),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.string().default('3000'),
});

// Parse and validate environment variables
const envParse = envSchema.safeParse(process.env);

if (!envParse.success) {
    console.error('❌ Invalid environment variables:', envParse.error.format());
    throw new Error('Invalid environment variables');
}

// Export validated environment variables
export const env = envParse.data; 