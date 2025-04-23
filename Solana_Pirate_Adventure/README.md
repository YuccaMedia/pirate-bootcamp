# 🏴‍☠️ Solana Pirate Bootcamp (Customized by Tatiane Amnuar)

This project is a modified version of the official Solana Developers Pirate Bootcamp.
It is being developed by **Tatiane Amnuar** as part of her Web3 portfolio for the **Solana Grant** and 
**Entertainment Community Fund**.

## Purpose
To demonstrate my technical capability and commitment to building on Solana by completing and deploying a working dApp.

## Live Demo
(Coming soon: deployment on Solana Devnet)

## Features
- Interactive quests to learn Solana development
- NFT minting and management
- Token economics and on-chain programs
- Security-focused development practices

## Code Quality
[![SonarCloud](https://sonarcloud.io/images/project_badges/sonarcloud-white.svg)](https://sonarcloud.io/summary/new_code?id=YuccaMedia_Solana_Pirate_Adventure)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=YuccaMedia_Solana_Pirate_Adventure&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=YuccaMedia_Solana_Pirate_Adventure)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=YuccaMedia_Solana_Pirate_Adventure&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=YuccaMedia_Solana_Pirate_Adventure)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=YuccaMedia_Solana_Pirate_Adventure&metric=sqale_rating)](https://sonarcloud.io/summary/new_code?id=YuccaMedia_Solana_Pirate_Adventure)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=YuccaMedia_Solana_Pirate_Adventure&metric=reliability_rating)](https://sonarcloud.io/summary/new_code?id=YuccaMedia_Solana_Pirate_Adventure)

## Security & Compliance

This project incorporates several security best practices and features, aligning with OWASP Top 10 principles:

- **Secure Authentication & Access Control:**
    - API Key authentication with different access levels (Admin, Dev, Stakeholder).
    - (Configurable) Multi-Factor Authentication (MFA) enforcement.
    - Strong password policies (length, complexity, expiry, history).
    - Secure session management (timeout, secure cookies, SameSite attribute).
- **Data Protection & Encryption:**
    - Enforces HTTPS for secure communication.
    - Configurable TLS version (defaulting to 1.3) and allowed cipher suites.
    - Database and backup encryption keys.
    - (Configurable) GDPR and PCI compliance settings.
    - Configurable data and backup retention policies.
    - IPFS content encryption and access control recommendations implemented.
- **Network Security:**
    - Rate limiting to prevent brute-force and denial-of-service attacks.
    - CORS protection with configurable allowed origins.
    - (Configurable) DDoS protection layer.
- **Input Validation & Sanitization:**
    - Robust input validation is implemented throughout the application to prevent injection attacks.
- **Monitoring & Logging:**
    - Detailed security event logging.
    - (Configurable) Log retention policies.
    - Integration with Prometheus for monitoring.
    - (Configurable) Email and Slack alerts for security events.
- **Regular Validation:**
    - Periodic content validation service to ensure integrity.
- **Code Quality & Scanning:**
    - Continuous integration with SonarCloud for static code analysis and vulnerability detection.

## Technologies Used

**Core Stack:**
- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Redis

**Blockchain & IPFS:**
- Solana (Web3.js)
- Anchor Framework
- Rust
- Pinata SDK

**Key Libraries & Tools:**
- Jest & Supertest (Testing)
- Helmet, CORS, JWT, bcrypt (Security)
- Zod (Validation)
- Docker
- SonarCloud
- Prometheus & Grafana (Monitoring - via config)
- Winston (Logging)
- Git, GitHub CLI, WSL, VS Code

## Author
Tatiane Amnuar
Developer at YucaMedia
[LinkedIn](https://www.linkedin.com/in/tatianeamnuar)  
[GitHub Profile](https://github.com/YuccaMedia)

Last updated: April 23, 2025 