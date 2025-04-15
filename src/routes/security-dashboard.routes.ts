import express, { Request, Response } from 'express';
import path from 'path';
import { PinataService } from '../services/pinata.service';
import { Logger } from '../utils/logger.utils';
import { loadSecurityConfig } from '../config/security.config';
import { authenticateAPIKey, requireAuthLevel, AuthLevel } from '../middleware/auth.middleware';
import { SecurityLogger } from '../services/security-logger.service';

// Interface for pin list row to fix TypeScript errors
interface PinListRow {
  ipfs_pin_hash: string;
  size: number;
  date_pinned: string;
  metadata?: {
    name?: string;
    keyvalues?: Record<string, string>;
  };
}

interface PinListResponse {
  count: number;
  rows?: PinListRow[];
}

const router = express.Router();
const logger = new Logger('SecurityDashboardRoutes');
const pinataService = new PinataService();
const securityConfig = loadSecurityConfig();
const securityLogger = new SecurityLogger();

// Enable authentication for all dashboard routes
router.use(authenticateAPIKey);

// Serve dashboard home page
router.get('/', (req: Request, res: Response) => {
  res.redirect('/dashboard/index.html');
});

// Route to serve real IPFS metrics data from Pinata service
router.get('/api/ipfs-metrics', requireAuthLevel(AuthLevel.USER), async (req: Request, res: Response) => {
  try {
    logger.info('Fetching IPFS metrics');
    
    // Log the access
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req.user?.id || req.authLevel || 'unknown') as string;
    await securityLogger.logAccessEvent(
      userId,
      '/api/ipfs-metrics', 
      'read', 
      'success', 
      clientIp, 
      { user: userId }
    );
    
    // Get real data from Pinata service
    const pinList: PinListResponse = await pinataService.getPinList();
    
    // Test connection to verify API is working
    const connectionStatus = await pinataService.testConnection();
    
    // Calculate metrics from the pin list data
    const totalPinned = pinList.count || 0;
    
    // Calculate total size in MB
    const totalSizeBytes = pinList.rows?.reduce((total: number, pin: PinListRow) => total + (pin.size || 0), 0) || 0;
    const totalSizeMB = Math.round((totalSizeBytes / (1024 * 1024)) * 10) / 10;
    
    // Calculate success rate (mocked as we don't have historical data in this example)
    const successRate = 98.5;
    
    // Format recent uploads
    const recentUploads = (pinList.rows || [])
      .slice(0, 5)
      .map((pin: PinListRow) => ({
        hash: pin.ipfs_pin_hash,
        name: pin.metadata?.name || 'Untitled',
        size: Math.round((pin.size / (1024 * 1024)) * 10) / 10, // Convert to MB
        timestamp: new Date(pin.date_pinned).toISOString()
      }));
    
    // Mock daily activity for chart 
    // This could be replaced by actual data from a monitoring system
    const dailyActivity = [
      { date: '2023-05-01', uploads: 12, failures: 1 },
      { date: '2023-05-02', uploads: 8, failures: 0 },
      { date: '2023-05-03', uploads: 15, failures: 2 },
      { date: '2023-05-04', uploads: 10, failures: 0 },
      { date: '2023-05-05', uploads: 18, failures: 0 },
      { date: '2023-05-06', uploads: 14, failures: 0 },
      { date: '2023-05-07', uploads: 9, failures: 0 }
    ];
    
    // Return the processed metrics
    res.json({
      success: true,
      data: {
        ipfsMetrics: {
          connectionStatus,
          totalPinned,
          totalSize: totalSizeMB,
          uploadSuccess: totalPinned,
          uploadFailures: 0,
          successRate,
          recentUploads,
          dailyActivity
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching IPFS metrics', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch IPFS metrics'
    });
  }
});

// Route to serve general dashboard metrics with a mix of real and mock data
router.get('/api/metrics', requireAuthLevel(AuthLevel.STAKEHOLDER), async (req: Request, res: Response) => {
  try {
    logger.info('Fetching security dashboard metrics');
    
    // Log the access
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const userId = (req.user?.id || req.authLevel || 'unknown') as string;
    await securityLogger.logAccessEvent(
      userId,
      '/api/metrics', 
      'read', 
      'success', 
      clientIp, 
      { user: userId }
    );
    
    // Get real data from Pinata service for IPFS metrics
    const pinList: PinListResponse = await pinataService.getPinList();
    const totalPinned = pinList.count || 0;
    
    // Calculate security score based on various factors
    // Higher values for security settings improve the score
    let securityScore = 85; // base score
    
    // Adjust score based on real environment variables
    if (securityConfig.security.enforceHttps) securityScore += 2;
    if (securityConfig.security.accessControl.enforceMfa) securityScore += 3;
    if (securityConfig.security.accessControl.passwordRequireComplexity) securityScore += 2;
    if (securityConfig.security.network.ddosProtection === 'enabled') securityScore += 3;
    if (securityConfig.security.audit.enabled) securityScore += 2;
    if (securityConfig.security.dataProtection.gdprEnabled) securityScore += 2;
    if (securityConfig.security.dataProtection.pciCompliance) securityScore += 1;
    
    // Cap the score at 100
    securityScore = Math.min(securityScore, 100);
    
    // Return combined real and mock data
    res.json({
      success: true,
      data: {
        securityScore,
        metrics: {
          network: {
            blockedIPs: [
              { ip: '192.168.1.100', reason: 'Brute force attempt', timestamp: new Date() }
            ],
            ddosProtection: securityConfig.security.network.ddosProtection,
            firewallRules: 24
          },
          incidents: {
            total: 11,
            active: 3,
            resolved: 8,
            activeCritical: 1,
            activeHigh: 2
          },
          compliance: {
            frameworks: {
              gdpr: { 
                score: securityConfig.security.dataProtection.gdprEnabled ? 91 : 70, 
                items: 2, 
                status: securityConfig.security.dataProtection.gdprEnabled ? 'passed' : 'warning' 
              },
              pci: { 
                score: securityConfig.security.dataProtection.pciCompliance ? 86 : 65, 
                items: 3, 
                status: securityConfig.security.dataProtection.pciCompliance ? 'warning' : 'failed' 
              },
              iso27001: { score: 94, items: 1, status: 'passed' },
              soc2: { score: 82, items: 4, status: 'warning' }
            }
          },
          ipfs: {
            totalPinned,
            connectionStatus: await pinataService.testConnection(),
            apiKey: securityConfig.ipfs.pinata.apiKey ? '✓ Configured' : '✗ Missing'
          }
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching security metrics', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security metrics'
    });
  }
});

// Route to serve mock incident data
router.get('/api/incidents', requireAuthLevel(AuthLevel.STAKEHOLDER), (req: Request, res: Response) => {
  // Log the access
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const userId = (req.user?.id || req.authLevel || 'unknown') as string;
  securityLogger.logAccessEvent(
    userId,
    '/api/incidents', 
    'read', 
    'success', 
    clientIp, 
    { user: userId }
  ).catch(console.error);
  
  // Return mock incidents data
  res.json({
    success: true,
    data: {
      incidents: [
        {
          id: 'INC-001',
          type: 'unauthorized-access',
          severity: 'high',
          status: 'active',
          timestamp: new Date().toISOString(),
          details: {
            sourceIp: '192.168.1.100',
            targetSystem: 'auth-service',
            attempts: 5
          }
        },
        {
          id: 'INC-002',
          type: 'ddos',
          severity: 'critical',
          status: 'active',
          timestamp: new Date().toISOString(),
          details: {
            sourceIps: ['45.123.45.67', '46.124.46.68'],
            targetSystem: 'api-gateway',
            requestsPerSecond: 15000
          }
        }
      ]
    }
  });
});

// Route to serve mock blocked IPs data
router.get('/api/blocked-ips', requireAuthLevel(AuthLevel.STAKEHOLDER), (req: Request, res: Response) => {
  // Log the access
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const userId = (req.user?.id || req.authLevel || 'unknown') as string;
  securityLogger.logAccessEvent(
    userId,
    '/api/blocked-ips', 
    'read', 
    'success', 
    clientIp, 
    { user: userId }
  ).catch(console.error);
  
  // Return mock blocked IPs data
  res.json({
    success: true,
    data: {
      blockedIPs: [
        {
          ip: '45.123.45.67',
          reason: 'DDoS Attack',
          timestamp: new Date().toISOString(),
          expiry: null
        },
        {
          ip: '192.168.1.100',
          reason: 'Unauthorized Access Attempt',
          timestamp: new Date().toISOString(),
          expiry: new Date(Date.now() + 86400000).toISOString()
        }
      ]
    }
  });
});

// API route to get environment security configuration (redacted sensitive values)
router.get('/api/security-config', requireAuthLevel(AuthLevel.ADMIN), (req: Request, res: Response) => {
  // Log the access
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
  const userId = (req.user?.id || req.authLevel || 'unknown') as string;
  securityLogger.logAccessEvent(
    userId,
    '/api/security-config', 
    'read', 
    'success', 
    clientIp, 
    { user: userId }
  ).catch(console.error);
  
  // Create a sanitized version of the config without sensitive info
  const sanitizedConfig = {
    environment: process.env.NODE_ENV || 'development',
    securityFeatures: {
      httpsEnabled: securityConfig.security.enforceHttps,
      mfaEnabled: securityConfig.security.accessControl.enforceMfa,
      passwordComplexity: securityConfig.security.accessControl.passwordRequireComplexity,
      passwordMinLength: securityConfig.security.accessControl.passwordMinLength,
      ddosProtection: securityConfig.security.network.ddosProtection,
      auditEnabled: securityConfig.security.audit.enabled,
      auditDetailed: securityConfig.security.audit.detailed,
      sessionTimeout: securityConfig.security.session.timeout,
      tlsVersion: securityConfig.security.encryption.tlsVersion,
      rateLimiting: {
        enabled: true,
        window: securityConfig.security.network.rateLimitWindow,
        maxRequests: securityConfig.security.network.rateLimitMax
      },
      dataProtection: {
        gdprCompliant: securityConfig.security.dataProtection.gdprEnabled,
        pciCompliant: securityConfig.security.dataProtection.pciCompliance,
        retentionDays: securityConfig.security.dataProtection.dataRetentionDays,
        backupRetentionDays: securityConfig.security.dataProtection.backupRetentionDays
      }
    },
    ipfsConfig: {
      configured: !!securityConfig.ipfs.pinata.apiKey && !!securityConfig.ipfs.pinata.apiSecret,
      connectionStatus: 'testing...'
    },
    monitoring: {
      alertingConfigured: !!securityConfig.monitoring.alerts.emails.length,
      slackIntegration: !!securityConfig.monitoring.slack?.webhook
    }
  };
  
  res.json({
    success: true,
    data: sanitizedConfig
  });
});

export default router; 