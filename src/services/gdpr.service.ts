import { SecurityLogger } from './security-logger.service';
import { PinataService } from './pinata.service';
import { ConfigValidator } from '../utils/config.validator';

interface DataProcessingRecord {
    id: string;
    purpose: string;
    dataCategories: string[];
    retentionPeriod: number;
    legalBasis: string;
    createdAt: Date;
    updatedAt: Date;
}

interface DataSubjectRequest {
    id: string;
    type: 'access' | 'deletion' | 'rectification';
    subjectId: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: Date;
    completedAt?: Date;
    error?: string;
}

export class GDPRService {
    private readonly securityLogger: SecurityLogger;
    private readonly pinataService: PinataService;
    private readonly config: ReturnType<typeof ConfigValidator.loadConfig>;
    private readonly processingRecords: Map<string, DataProcessingRecord>;
    private readonly subjectRequests: Map<string, DataSubjectRequest>;

    constructor() {
        this.securityLogger = new SecurityLogger();
        this.pinataService = new PinataService();
        this.config = ConfigValidator.loadConfig();
        this.processingRecords = new Map();
        this.subjectRequests = new Map();
        this.initializeDefaultRecords();
    }

    private initializeDefaultRecords(): void {
        // Add default data processing records
        this.addProcessingRecord({
            id: 'ipfs-pinning',
            purpose: 'Content storage and distribution',
            dataCategories: ['content', 'metadata'],
            retentionPeriod: this.config.security.dataProtection.dataRetentionDays,
            legalBasis: 'Legitimate interest',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        this.addProcessingRecord({
            id: 'security-monitoring',
            purpose: 'Security and fraud prevention',
            dataCategories: ['access_logs', 'ip_addresses'],
            retentionPeriod: this.config.security.audit.logRetentionDays,
            legalBasis: 'Legal obligation',
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    addProcessingRecord(record: DataProcessingRecord): void {
        this.processingRecords.set(record.id, record);
        this.securityLogger.logSecurityEvent({
            eventType: 'gdpr',
            severity: 'info',
            message: 'Data processing record added',
            details: { recordId: record.id }
        });
    }

    async processDataSubjectRequest(request: Omit<DataSubjectRequest, 'id' | 'status' | 'createdAt'>): Promise<string> {
        const requestId = crypto.randomUUID();
        const newRequest: DataSubjectRequest = {
            ...request,
            id: requestId,
            status: 'pending',
            createdAt: new Date()
        };

        this.subjectRequests.set(requestId, newRequest);

        try {
            await this.securityLogger.logSecurityEvent({
                eventType: 'gdpr',
                severity: 'info',
                message: `Data subject request received: ${request.type}`,
                details: { requestId, subjectId: request.subjectId }
            });

            // Process the request based on type
            switch (request.type) {
                case 'access':
                    await this.handleAccessRequest(requestId, request.subjectId);
                    break;
                case 'deletion':
                    await this.handleDeletionRequest(requestId, request.subjectId);
                    break;
                case 'rectification':
                    await this.handleRectificationRequest(requestId, request.subjectId);
                    break;
            }

            return requestId;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.updateRequestStatus(requestId, 'failed', errorMessage);
            throw new Error(`Failed to process data subject request: ${errorMessage}`);
        }
    }

    private async handleAccessRequest(requestId: string, subjectId: string): Promise<void> {
        this.updateRequestStatus(requestId, 'processing');
        
        try {
            // Get all pinned content for the subject
            const pinList = await this.pinataService.getPinList();
            const subjectPins = pinList.rows?.filter(pin => 
                pin.metadata?.keyvalues?.subjectId === subjectId
            ) || [];

            // Log the access request completion
            await this.securityLogger.logSecurityEvent({
                eventType: 'gdpr',
                severity: 'info',
                message: 'Data access request completed',
                details: { requestId, subjectId, pinCount: subjectPins.length }
            });

            this.updateRequestStatus(requestId, 'completed');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.updateRequestStatus(requestId, 'failed', errorMessage);
            throw error;
        }
    }

    private async handleDeletionRequest(requestId: string, subjectId: string): Promise<void> {
        this.updateRequestStatus(requestId, 'processing');
        
        try {
            // Get all pinned content for the subject
            const pinList = await this.pinataService.getPinList();
            const subjectPins = pinList.rows?.filter(pin => 
                pin.metadata?.keyvalues?.subjectId === subjectId
            ) || [];

            // Unpin all content for the subject
            for (const pin of subjectPins) {
                await this.pinataService.unpin(pin.ipfs_pin_hash);
            }

            // Log the deletion request completion
            await this.securityLogger.logSecurityEvent({
                eventType: 'gdpr',
                severity: 'info',
                message: 'Data deletion request completed',
                details: { requestId, subjectId, deletedPins: subjectPins.length }
            });

            this.updateRequestStatus(requestId, 'completed');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.updateRequestStatus(requestId, 'failed', errorMessage);
            throw error;
        }
    }

    private async handleRectificationRequest(requestId: string, subjectId: string): Promise<void> {
        this.updateRequestStatus(requestId, 'processing');
        
        try {
            // Get all pinned content for the subject
            const pinList = await this.pinataService.getPinList();
            const subjectPins = pinList.rows?.filter(pin => 
                pin.metadata?.keyvalues?.subjectId === subjectId
            ) || [];

            // Log the rectification request completion
            await this.securityLogger.logSecurityEvent({
                eventType: 'gdpr',
                severity: 'info',
                message: 'Data rectification request completed',
                details: { requestId, subjectId, affectedPins: subjectPins.length }
            });

            this.updateRequestStatus(requestId, 'completed');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.updateRequestStatus(requestId, 'failed', errorMessage);
            throw error;
        }
    }

    private updateRequestStatus(requestId: string, status: DataSubjectRequest['status'], error?: string): void {
        const request = this.subjectRequests.get(requestId);
        if (request) {
            request.status = status;
            if (status === 'completed') {
                request.completedAt = new Date();
            }
            if (error) {
                request.error = error;
            }
            this.subjectRequests.set(requestId, request);
        }
    }

    getProcessingRecords(): DataProcessingRecord[] {
        return Array.from(this.processingRecords.values());
    }

    getSubjectRequest(requestId: string): DataSubjectRequest | undefined {
        return this.subjectRequests.get(requestId);
    }
} 