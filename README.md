# 🏴‍☠️ Solana Pirate Bootcamp

<p width="full" margin="auto" align="center" style = "background:gray"><img src="https://raw.githubusercontent.com/solana-developers/pirate-bootcamp/main/assets/ship-fire-1.png" alt="ship" width="350" margin="auto" align="center" bg="white"/></p>

Ahoy! Ready to embark on a pirate-themed coding adventure? Join our Solana programming bootcamp and discover the treasures of blockchain development. Learn to build smart contracts and DApps using our hands-on approach and practical coding exercises. Set sail with us and become a Solana pirate!

---

Interested in conducting this bootcamp, are ye?
[How to Conduct this Bootcamp](./setup/README.md)

---

Feast 'yer eyes on the bootcamp agenda!

||
| --- |
| ⛴️ [Mint a Pirate Ship NFT](./quest-1/) |
| 🌊 [Set Sail with Solana Programs](./quest-2/) |
| 💰 [Learn to Earn Gold](./quest-3/) |
| 💎 [Smuggling, Bargaining, and Upgrading Your Ship](./quest-4/) |
| ✨ [An Efficient Port is a Profitable Port](./quest-5/) |
| ⚔️ [Prepare for Battle Using Oracles](./quest-6/) |
| 💥 [Use Solana Pay to Defend Your Ship](./quest-7/) |

# Security-Focused IPFS Pinning Service

A secure TypeScript application for pinning content to IPFS via Pinata with robust security features, monitoring, and type safety.

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

## Testing

The application includes comprehensive testing to ensure security and reliability:

### Unit Tests

Run unit tests with:

```bash
npm test
```

Unit tests cover:
- Config validation
- Error handling
- Rate limiting
- Metrics collection
- IPFS controller functionality

### Integration Tests

Run integration tests with:

```bash
npm run test:integration
```

These tests verify full API workflows including:
- Pinning content to IPFS
- Retrieving pin lists
- Unpinning content
- Security features like rate limiting and CORS

### Security Tests

Run security tests with:

```bash
npm run test:security
```

Security tests include:
- OWASP Top 10 vulnerability checks
- Input validation testing
- Access control testing
- Rate limiting effectiveness
- Header security verification

### Running All Tests

```bash
npm run test:all
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (see `.env.example`)
4. Run the application:
   ```bash
   npm start
   ```

## Configuration

Configure the application by setting environment variables in a `.env` file:

```
# Pinata API Configuration
PINATA_API_KEY=your-pinata-api-key-here
PINATA_API_SECRET=your-pinata-api-secret-here
PINATA_JWT=your-pinata-jwt-token-here

# Security settings (see .env.example for all options)
```

## API Documentation

API documentation is available at `/api/docs` when the server is running. Access levels:
- Public: Basic API information
- User: Detailed API endpoints
- Admin: Complete API documentation including security configurations

## License

[MIT](LICENSE)
