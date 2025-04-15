export interface PinataConfig {
    apiKey: string;
    apiSecret: string;
    jwt: string;
}

export interface PinataResponse {
    IpfsHash: string;
    PinSize: number;
    Timestamp: string;
}

export interface PinataMetadata {
    name?: string;
    keyvalues?: Record<string, string>;
}

export interface PinataOptions {
    cidVersion?: 0 | 1;
    wrapWithDirectory?: boolean;
    customPinPolicy?: {
        regions: Array<{
            id: string;
            desiredReplicationCount: number;
        }>;
    };
}

export interface PinataError {
    error: {
        reason: string;
        details: string;
    };
} 