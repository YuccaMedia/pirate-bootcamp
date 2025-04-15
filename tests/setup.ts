import dotenv from 'dotenv';
import { resolve } from 'path';
import { mockPinataSdk } from './mocks/pinata.mock';
import { mockLogger } from './mocks/logger.mock';
import { mockSlackApi } from './mocks/slack.mock';
import { mockNodemailer } from './mocks/email.mock';
import { mockPromClient } from './mocks/prometheus.mock';

// Load environment variables from .env.test if it exists, otherwise from .env
dotenv.config({ path: resolve(__dirname, '../.env.test') });
dotenv.config({ path: resolve(__dirname, '../.env') });

// Set default timeout for all tests
jest.setTimeout(30000);

// Mock external modules
jest.mock('@pinata/sdk', () => {
  return jest.fn().mockImplementation(() => mockPinataSdk);
});

jest.mock('prom-client', () => mockPromClient);

jest.mock('@slack/web-api', () => ({
  WebClient: mockSlackApi.WebClient
}));

jest.mock('@slack/webhook', () => ({
  IncomingWebhook: mockSlackApi.IncomingWebhook
}));

jest.mock('nodemailer', () => mockNodemailer);

jest.mock('../src/utils/logger.utils', () => ({
  logger: mockLogger
}));

// Global beforeAll hook
beforeAll(() => {
  console.log('Starting test suite with environment:', process.env.NODE_ENV || 'development');
  
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Setup default test values for environment variables
  process.env.PINATA_API_KEY = 'test-api-key';
  process.env.PINATA_API_SECRET = 'test-api-secret';
  process.env.PINATA_JWT = 'test-jwt-token';
});

// Global afterAll hook
afterAll(() => {
  console.log('Test suite completed');
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Clear environment modifications
  mockLogger.reset();
});

// Define global mocks here if needed
global.mockPinataService = {
  pinJSON: jest.fn(),
  pinFile: jest.fn(),
  getPinList: jest.fn(),
  unpin: jest.fn(),
};

// Setup console spy to capture logs during tests
global.consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation(),
  warn: jest.spyOn(console, 'warn').mockImplementation(),
}; 