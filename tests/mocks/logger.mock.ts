/**
 * Mock logger utility for testing
 */
export const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  security: jest.fn(),
  audit: jest.fn(),
  
  // Reset all mocks
  reset: () => {
    mockLogger.info.mockReset();
    mockLogger.error.mockReset();
    mockLogger.warn.mockReset();
    mockLogger.debug.mockReset();
    mockLogger.security.mockReset();
    mockLogger.audit.mockReset();
  }
}; 