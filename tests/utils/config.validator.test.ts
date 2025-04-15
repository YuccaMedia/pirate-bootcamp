import { ConfigValidator, SecurityConfig } from '../../src/utils/config.validator';
import { EnvUtils } from '../../src/utils/env.utils';

// Mock the EnvUtils module
jest.mock('../../src/utils/env.utils');

describe('ConfigValidator', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.resetAllMocks();
    
    // Setup default mock implementations
    (EnvUtils.validateSecurityEnv as jest.Mock).mockImplementation(() => {});
    (EnvUtils.validateEnv as jest.Mock).mockImplementation(() => {});
    (EnvUtils.getString as jest.Mock).mockImplementation((key) => `mocked-${key}`);
    (EnvUtils.getStringArray as jest.Mock).mockImplementation((key) => [`mocked-${key}-1`, `mocked-${key}-2`]);
    (EnvUtils.getPort as jest.Mock).mockImplementation((key, defaultValue) => defaultValue);
    (EnvUtils.getSmtpSecure as jest.Mock).mockReturnValue(true);
    (EnvUtils.getBoolean as jest.Mock).mockImplementation((key, defaultValue) => defaultValue);
    (EnvUtils.getNumber as jest.Mock).mockImplementation((key, defaultValue) => defaultValue);
    (EnvUtils.getNodeEnv as jest.Mock).mockReturnValue('production');
    (EnvUtils.getSameSite as jest.Mock).mockReturnValue('strict');
    (EnvUtils.getDDoSProtection as jest.Mock).mockReturnValue('enabled');
    
    // Setup process.env for the tests
    process.env.SLACK_TOKEN = 'test-slack-token';
    process.env.SLACK_WEBHOOK = 'test-slack-webhook';
    process.env.SLACK_CHANNEL = 'test-slack-channel';
  });

  describe('loadConfig', () => {
    it('should load and validate the entire configuration', () => {
      // Act
      const config = ConfigValidator.loadConfig();
      
      // Assert
      expect(EnvUtils.validateSecurityEnv).toHaveBeenCalled();
      expect(EnvUtils.validateEnv).toHaveBeenCalledWith([
        'PINATA_API_KEY',
        'PINATA_API_SECRET',
        'PINATA_JWT'
      ]);
      
      // Check the structure of the returned config
      expect(config).toHaveProperty('database');
      expect(config).toHaveProperty('monitoring');
      expect(config).toHaveProperty('ipfs');
      expect(config).toHaveProperty('security');
      expect(config).toHaveProperty('accessControl');
      expect(config).toHaveProperty('networkSecurity');
    });
  });

  describe('loadDatabaseConfig', () => {
    it('should load database configuration', () => {
      // Act
      const config = ConfigValidator.loadConfig();
      
      // Assert
      expect(EnvUtils.getString).toHaveBeenCalledWith('DB_ENCRYPTION_KEY');
      expect(EnvUtils.getString).toHaveBeenCalledWith('DB_SSL_CA_PATH');
      expect(EnvUtils.getString).toHaveBeenCalledWith('DB_SSL_KEY_PATH');
      expect(EnvUtils.getString).toHaveBeenCalledWith('DB_SSL_CERT_PATH');
      
      expect(config.database).toEqual({
        encryptionKey: 'mocked-DB_ENCRYPTION_KEY',
        ssl: {
          caPath: 'mocked-DB_SSL_CA_PATH',
          keyPath: 'mocked-DB_SSL_KEY_PATH',
          certPath: 'mocked-DB_SSL_CERT_PATH'
        }
      });
    });
  });

  describe('loadMonitoringConfig', () => {
    it('should load monitoring configuration', () => {
      // Act
      const config = ConfigValidator.loadConfig();
      
      // Assert
      expect(EnvUtils.getStringArray).toHaveBeenCalledWith('ALERT_EMAILS');
      expect(EnvUtils.getString).toHaveBeenCalledWith('SMTP_HOST');
      expect(EnvUtils.getPort).toHaveBeenCalledWith('SMTP_PORT', 587);
      expect(EnvUtils.getSmtpSecure).toHaveBeenCalled();
      expect(EnvUtils.getString).toHaveBeenCalledWith('SMTP_USER');
      expect(EnvUtils.getString).toHaveBeenCalledWith('SMTP_PASS');
      expect(EnvUtils.getString).toHaveBeenCalledWith('ALERT_FROM_EMAIL');
      expect(EnvUtils.getPort).toHaveBeenCalledWith('PROMETHEUS_PORT', 9090);
      expect(EnvUtils.getPort).toHaveBeenCalledWith('GRAFANA_PORT', 3000);
      
      expect(config.monitoring.alertEmails).toEqual(['mocked-ALERT_EMAILS-1', 'mocked-ALERT_EMAILS-2']);
      expect(config.monitoring.smtp).toHaveProperty('host', 'mocked-SMTP_HOST');
      expect(config.monitoring.smtp).toHaveProperty('port', 587);
      expect(config.monitoring.smtp).toHaveProperty('secure', true);
      expect(config.monitoring.slack).toEqual({
        token: 'test-slack-token',
        webhook: 'test-slack-webhook',
        channel: 'test-slack-channel'
      });
    });
    
    it('should handle missing slack configuration', () => {
      // Arrange
      delete process.env.SLACK_TOKEN;
      delete process.env.SLACK_WEBHOOK;
      delete process.env.SLACK_CHANNEL;
      
      // Act
      const config = ConfigValidator.loadConfig();
      
      // Assert
      expect(config.monitoring.slack).toBeUndefined();
    });
    
    it('should handle partial slack configuration', () => {
      // Arrange
      delete process.env.SLACK_WEBHOOK;
      delete process.env.SLACK_CHANNEL;
      
      // Act
      const config = ConfigValidator.loadConfig();
      
      // Assert
      expect(config.monitoring.slack).toEqual({
        token: 'test-slack-token'
      });
    });
  });

  describe('loadIPFSConfig', () => {
    it('should load IPFS configuration', () => {
      // Act
      const config = ConfigValidator.loadConfig();
      
      // Assert
      expect(EnvUtils.getString).toHaveBeenCalledWith('PINATA_API_KEY');
      expect(EnvUtils.getString).toHaveBeenCalledWith('PINATA_API_SECRET');
      expect(EnvUtils.getString).toHaveBeenCalledWith('PINATA_JWT');
      
      expect(config.ipfs).toEqual({
        pinata: {
          apiKey: 'mocked-PINATA_API_KEY',
          apiSecret: 'mocked-PINATA_API_SECRET',
          jwt: 'mocked-PINATA_JWT'
        }
      });
    });
  });

  describe('loadSecurityConfig', () => {
    it('should load security configuration', () => {
      // Act
      const config = ConfigValidator.loadConfig();
      
      // Assert
      expect(EnvUtils.getNodeEnv).toHaveBeenCalled();
      expect(EnvUtils.getBoolean).toHaveBeenCalledWith('HTTPS', true);
      expect(EnvUtils.getStringArray).toHaveBeenCalledWith('ALLOWED_ORIGINS');
      expect(EnvUtils.getString).toHaveBeenCalledWith('SESSION_SECRET');
      expect(EnvUtils.getString).toHaveBeenCalledWith('TLS_VERSION');
      expect(EnvUtils.getStringArray).toHaveBeenCalledWith('ALLOWED_CIPHERS');
      
      expect(config.security).toEqual({
        nodeEnv: 'production',
        https: true,
        allowedOrigins: ['mocked-ALLOWED_ORIGINS-1', 'mocked-ALLOWED_ORIGINS-2'],
        sessionSecret: 'mocked-SESSION_SECRET',
        tls: {
          version: 'mocked-TLS_VERSION',
          ciphers: ['mocked-ALLOWED_CIPHERS-1', 'mocked-ALLOWED_CIPHERS-2']
        }
      });
    });
  });

  describe('loadAccessControlConfig', () => {
    it('should load access control configuration', () => {
      // Act
      const config = ConfigValidator.loadConfig();
      
      // Assert
      expect(EnvUtils.getBoolean).toHaveBeenCalledWith('ENFORCE_MFA', true);
      expect(EnvUtils.getNumber).toHaveBeenCalledWith('PASSWORD_MIN_LENGTH', 12);
      expect(EnvUtils.getBoolean).toHaveBeenCalledWith('PASSWORD_REQUIRE_COMPLEXITY', true);
      expect(EnvUtils.getNumber).toHaveBeenCalledWith('PASSWORD_EXPIRY_DAYS', 90);
      expect(EnvUtils.getNumber).toHaveBeenCalledWith('PASSWORD_HISTORY_SIZE', 5);
      expect(EnvUtils.getNumber).toHaveBeenCalledWith('SESSION_TIMEOUT', 3600);
      expect(EnvUtils.getBoolean).toHaveBeenCalledWith('SESSION_SECURE', true);
      expect(EnvUtils.getSameSite).toHaveBeenCalled();
      
      expect(config.accessControl).toEqual({
        mfa: true,
        password: {
          minLength: 12,
          requireComplexity: true,
          expiryDays: 90,
          historySize: 5
        },
        session: {
          timeout: 3600,
          secure: true,
          sameSite: 'strict'
        }
      });
    });
  });

  describe('loadNetworkSecurityConfig', () => {
    it('should load network security configuration with DDOS protection enabled', () => {
      // Act
      const config = ConfigValidator.loadConfig();
      
      // Assert
      expect(EnvUtils.getDDoSProtection).toHaveBeenCalled();
      expect(EnvUtils.getNumber).toHaveBeenCalledWith('RATE_LIMIT_WINDOW', 900000);
      expect(EnvUtils.getNumber).toHaveBeenCalledWith('RATE_LIMIT_MAX', 100);
      
      expect(config.networkSecurity).toEqual({
        ddosProtection: true,
        rateLimit: {
          windowMs: 900000,
          maxRequests: 100
        }
      });
    });
    
    it('should handle disabled DDOS protection', () => {
      // Arrange
      (EnvUtils.getDDoSProtection as jest.Mock).mockReturnValue('disabled');
      
      // Act
      const config = ConfigValidator.loadConfig();
      
      // Assert
      expect(config.networkSecurity.ddosProtection).toBe(false);
    });
  });
}); 