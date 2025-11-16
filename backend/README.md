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
