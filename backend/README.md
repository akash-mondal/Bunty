# Backend API

Node.js/Express backend for the Bunty ZKP platform.

## Structure

```
backend/
├── src/
│   ├── index.ts           # Application entry point
│   ├── config/            # Configuration files
│   ├── middleware/        # Express middleware
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic and external service clients
│   ├── models/            # Data models and types
│   └── utils/             # Utility functions
├── db/
│   └── init.sql           # Database initialization script
└── package.json
```

## Development

```bash
npm install
npm run dev
```

## Environment Variables

Copy `.env.example` from the root directory and configure:
- Database credentials
- Redis URL
- JWT secrets
- External API keys (Plaid, Stripe, Sila)
- Midnight Network URLs

## API Endpoints

See the design document for complete API specification.

## Database

PostgreSQL database is initialized via Docker Compose with the schema defined in `db/init.sql`.

## Monitoring and Alerting

The backend includes comprehensive monitoring and alerting capabilities:

- **Structured Logging** - JSON-formatted logs with automatic PII sanitization
- **Metrics Collection** - Real-time tracking of API, proof, and service metrics
- **Alerting** - Multi-channel notifications for critical issues

### Quick Start

```bash
# Test alerts
npm run test:alerts -- --all

# View metrics
curl http://localhost:3001/api/metrics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Documentation

- [ALERTING_QUICKSTART.md](./ALERTING_QUICKSTART.md) - Get alerts running in 5 minutes
- [ALERTING_CONFIGURATION.md](./ALERTING_CONFIGURATION.md) - Complete alerting setup guide
- [MONITORING.md](./MONITORING.md) - Monitoring and observability overview
- [METRICS_COLLECTION.md](./METRICS_COLLECTION.md) - Metrics tracking details
- [LOGGING.md](./LOGGING.md) - Logging configuration and best practices

## Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:alerts
npm run test:metrics
npm run test:indexer
npm run test:proof-server
npm run test:proof-submission
```
