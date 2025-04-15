import axios, { AxiosInstance, AxiosError } from 'axios';
import { ConfigValidator, SecurityConfig } from '../utils/config.validator';
import FormData from 'form-data';

// Constants for metrics and monitoring
const METRICS = {
    IPFS_UPLOAD_TOTAL: 'ipfs_upload_total',
    IPFS_UPLOAD_FAILURES: 'ipfs_upload_failures',
    IPFS_UPLOAD_SIZE_BYTES: 'ipfs_upload_size_bytes',
    IPFS_UPLOAD_DURATION_MS: 'ipfs_upload_duration_ms',
    IPFS_RATE_LIMIT_HITS: 'ipfs_rate_limit_hits'
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const ALLOWED_JSON_TYPES = ['object', 'array'];

export class PinataError extends Error {
    constructor(
        message: string,
        public readonly code?: string,
        public readonly status?: number,
        public readonly details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'PinataError';
    }
}

export interface PinataMetadata {
    name?: string;
    keyvalues?: Record<string, string>;
}

export interface PinataOptions {
    cidVersion?: 0 | 1;
    wrapWithDirectory?: boolean;
}

export interface PinataResponse {
    IpfsHash: string;
    PinSize: number;
    Timestamp: string;
}

export interface SecurityAuditLog {
    action: string;
    status: 'success' | 'failure';
    details: Record<string, unknown>;
    timestamp: Date;
    ipfsHash?: string;
    error?: Error;
}

export class PinataService {
    private readonly client: AxiosInstance;
    private readonly config: SecurityConfig['ipfs']['pinata'];
    private readonly securityConfig: SecurityConfig;

    constructor() {
        this.securityConfig = ConfigValidator.loadConfig();
        this.config = this.securityConfig.ipfs.pinata;

        this.client = axios.create({
            baseURL: 'https://api.pinata.cloud',
            headers: {
                'pinata_api_key': this.config.apiKey,
                'pinata_secret_api_key': this.config.apiSecret,
                'Authorization': `Bearer ${this.config.jwt}`,
                'User-Agent': 'PinataService/1.0'
            },
            timeout: 30000, // 30 second timeout
        });

        // Add response interceptor for rate limiting and metrics
        this.client.interceptors.response.use(
            response => response,
            async (error: AxiosError) => {
                if (error.response?.status === 429) {
                    await this.handleRateLimit(error);
                    return this.client.request(error.config!);
                }
                throw error;
            }
        );
    }

    /**
     * Handles rate limiting and reports metrics
     */
    private async handleRateLimit(error: AxiosError): Promise<void> {
        const retryAfter = parseInt(error.response?.headers['retry-after'] || '1', 10);
        
        // Log rate limit hit
        await this.logSecurityEvent({
            action: 'RATE_LIMIT_HIT',
            status: 'failure',
            details: {
                retryAfter,
                endpoint: error.config?.url,
                method: error.config?.method
            },
            timestamp: new Date(),
            error
        });

        // Wait for the retry-after period
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    }

    /**
     * Logs security-related events
     */
    private async logSecurityEvent(event: SecurityAuditLog): Promise<void> {
        if (!this.securityConfig.monitoring) return;

        try {
            // Log to configured monitoring systems
            if (this.securityConfig.monitoring.slack?.webhook) {
                await axios.post(this.securityConfig.monitoring.slack.webhook, {
                    channel: this.securityConfig.monitoring.slack.channel,
                    text: `IPFS Security Event: ${event.action}\nStatus: ${event.status}\nDetails: ${JSON.stringify(event.details)}`
                });
            }

            // Additional logging logic can be added here
            console.error('Security Event:', {
                ...event,
                error: event.error ? {
                    message: event.error.message,
                    stack: event.error.stack
                } : undefined
            });
        } catch (error) {
            console.error('Failed to log security event:', error);
        }
    }

    /**
     * Validates JSON data before pinning
     */
    private validateJSON(data: unknown): void {
        if (!data || typeof data !== 'object') {
            throw new PinataError('Invalid JSON data: must be an object or array', 'INVALID_JSON');
        }

        const jsonType = Array.isArray(data) ? 'array' : 'object';
        if (!ALLOWED_JSON_TYPES.includes(jsonType)) {
            throw new PinataError(`Invalid JSON type: ${jsonType}`, 'INVALID_JSON_TYPE');
        }

        // Check for circular references and size
        try {
            const jsonString = JSON.stringify(data);
            if (Buffer.byteLength(jsonString) > MAX_FILE_SIZE) {
                throw new PinataError('JSON data exceeds maximum size limit', 'SIZE_LIMIT_EXCEEDED');
            }
        } catch (error) {
            if (error instanceof PinataError) throw error;
            throw new PinataError('Invalid JSON: contains circular references', 'CIRCULAR_REFERENCE');
        }
    }

    /**
     * Implements exponential backoff retry logic with security logging
     */
    private async withRetry<T>(
        operation: () => Promise<T>,
        context: { action: string; details?: Record<string, unknown> }
    ): Promise<T> {
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const result = await operation();
                
                // Log successful operation
                await this.logSecurityEvent({
                    action: context.action,
                    status: 'success',
                    details: {
                        ...context.details,
                        attempt
                    },
                    timestamp: new Date()
                });

                return result;
            } catch (error) {
                lastError = error as Error;
                
                // Log retry attempt
                await this.logSecurityEvent({
                    action: `${context.action}_RETRY`,
                    status: 'failure',
                    details: {
                        ...context.details,
                        attempt,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    },
                    timestamp: new Date(),
                    error: error as Error
                });

                if (attempt === MAX_RETRIES) break;
                
                const delay = RETRY_DELAY * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError;
    }

    /**
     * Pin JSON data to IPFS via Pinata with security logging
     */
    async pinJSONToIPFS(
        jsonData: Record<string, any>,
        metadata: PinataMetadata | undefined = undefined,
        options: PinataOptions = {}
    ): Promise<PinataResponse> {
        this.validateJSON(jsonData);

        const startTime = Date.now();

        return this.withRetry(async () => {
            try {
                // Use an empty object as default metadata if none provided
                const pinataMetadata = metadata || { name: 'Untitled' };
                
                const response = await this.client.post('/pinning/pinJSONToIPFS', {
                    pinataContent: jsonData,
                    pinataMetadata: pinataMetadata,
                    pinataOptions: options
                });

                const duration = Date.now() - startTime;

                // Log successful upload metrics
                await this.logSecurityEvent({
                    action: 'PIN_JSON',
                    status: 'success',
                    details: {
                        ipfsHash: response.data.IpfsHash,
                        size: response.data.PinSize,
                        duration,
                        metadata: pinataMetadata
                    },
                    timestamp: new Date(),
                    ipfsHash: response.data.IpfsHash
                });

                return response.data;
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    throw new PinataError(
                        `Pinata API error: ${error.response?.data?.message || error.message}`,
                        error.code,
                        error.response?.status,
                        {
                            metadata,
                            options
                        }
                    );
                }
                throw error;
            }
        }, { action: 'PIN_JSON', details: { metadata, options } });
    }

    /**
     * Pin file to IPFS via Pinata with security logging
     */
    async pinFileToIPFS(
        fileBuffer: Buffer,
        metadata: PinataMetadata | undefined = undefined,
        options: PinataOptions = {}
    ): Promise<PinataResponse> {
        if (!fileBuffer || !(fileBuffer instanceof Buffer)) {
            throw new PinataError('Invalid file: must be a Buffer', 'INVALID_FILE');
        }

        if (fileBuffer.length > MAX_FILE_SIZE) {
            throw new PinataError('File exceeds maximum size limit', 'SIZE_LIMIT_EXCEEDED');
        }

        const startTime = Date.now();

        return this.withRetry(async () => {
            try {
                // Create form data for file upload
                const formData = new FormData();
                
                // Add the file
                formData.append('file', fileBuffer, {
                    filename: metadata?.name || 'file',
                    contentType: 'application/octet-stream'
                });
                
                // Add metadata if provided
                if (metadata) {
                    formData.append('pinataMetadata', JSON.stringify(metadata));
                }
                
                // Add options if provided
                if (options) {
                    formData.append('pinataOptions', JSON.stringify(options));
                }

                const response = await this.client.post('/pinning/pinFileToIPFS', formData, {
                    headers: {
                        ...formData.getHeaders()
                    }
                });

                const duration = Date.now() - startTime;

                // Log successful upload metrics
                await this.logSecurityEvent({
                    action: 'PIN_FILE',
                    status: 'success',
                    details: {
                        ipfsHash: response.data.IpfsHash,
                        size: response.data.PinSize,
                        duration,
                        metadata
                    },
                    timestamp: new Date(),
                    ipfsHash: response.data.IpfsHash
                });

                return response.data;
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    throw new PinataError(
                        `Pinata API error: ${error.response?.data?.message || error.message}`,
                        error.code,
                        error.response?.status,
                        {
                            fileSize: fileBuffer.length,
                            metadata,
                            options
                        }
                    );
                }
                throw error;
            }
        }, { action: 'PIN_FILE', details: { fileSize: fileBuffer.length, metadata, options } });
    }

    /**
     * Get list of pinned content from IPFS
     */
    async getPinList(): Promise<any> {
        return this.withRetry(async () => {
            try {
                const response = await this.client.get('/pinning/pinList');
                
                // Log successful retrieval
                await this.logSecurityEvent({
                    action: 'GET_PIN_LIST',
                    status: 'success',
                    details: {
                        count: response.data.count,
                        rows: response.data.rows?.length || 0
                    },
                    timestamp: new Date()
                });

                return response.data;
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    throw new PinataError(
                        `Failed to get pin list: ${error.response?.data?.message || error.message}`,
                        error.code,
                        error.response?.status
                    );
                }
                throw error;
            }
        }, { action: 'GET_PIN_LIST' });
    }

    /**
     * Unpin content from IPFS with security logging
     */
    async unpin(hash: string): Promise<void> {
        if (!hash.match(/^[a-zA-Z0-9]+$/)) {
            throw new PinataError('Invalid IPFS hash format', 'INVALID_HASH');
        }

        return this.withRetry(async () => {
            try {
                await this.client.delete(`/pinning/unpin/${hash}`);
                
                // Log successful unpin
                await this.logSecurityEvent({
                    action: 'UNPIN',
                    status: 'success',
                    details: { hash },
                    timestamp: new Date(),
                    ipfsHash: hash
                });
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    throw new PinataError(
                        `Failed to unpin content: ${error.response?.data?.message || error.message}`,
                        error.code,
                        error.response?.status,
                        { hash }
                    );
                }
                throw error;
            }
        }, { action: 'UNPIN', details: { hash } });
    }

    /**
     * Test the Pinata connection with security logging
     */
    async testConnection(): Promise<boolean> {
        return this.withRetry(async () => {
            try {
                await this.client.get('/data/testAuthentication');
                return true;
            } catch {
                return false;
            }
        }, { action: 'TEST_CONNECTION' });
    }
} 