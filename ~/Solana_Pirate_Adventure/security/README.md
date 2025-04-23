# Security Module for Solana Pirate Adventure

This directory contains the security-focused IPFS pinning service with robust security features, monitoring, and type safety. This module was developed as part of the Solana Pirate Adventure project.

## Features

- **IPFS Integration**: Secure pinning of JSON and files to IPFS via Pinata
- **Security Features**:
  - Rate limiting to prevent abuse
  - Input validation and sanitization
  - CORS protection
  - Error handling with operational/programming error distinction
  - Authentication and authorization
  - Type safety throughout the application
- **Monitoring**: Prometheus metrics for request tracking and performance monitoring
- **Documentation**: API documentation with access control based on user role

## Installation

1. Navigate to this directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (see `.env.example`)
4. Run the application:
   ```bash
   npm start
   ```

## Testing

The application includes comprehensive testing to ensure security and reliability:

### Unit Tests

Run unit tests with:

```bash
npm test
```

### Integration Tests

Run integration tests with:

```bash
npm run test:integration
```

### Security Tests

Run security tests with:

```bash
npm run test:security
```

### Running All Tests

```bash
npm run test:all
```

## Configuration

Configure the application by setting environment variables in a `.env` file.

## Code Quality

[![SonarCloud](https://sonarcloud.io/images/project_badges/sonarcloud-white.svg)](https://sonarcloud.io/summary/new_code?id=YuccaMedia_Solana_Pirate_Adventure) 