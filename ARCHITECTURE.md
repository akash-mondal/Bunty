# Project Architecture

## Monorepo Structure

This project uses npm workspaces to manage a monorepo with three main packages:

```
bunty-zkp-platform/
├── frontend/              # Next.js 14 React application
├── backend/               # Node.js/Express API server
├── midnight-contract/     # Compact smart contracts
├── docker-compose.yml     # Infrastructure services
└── package.json           # Monorepo root configuration
```

## Workspaces

### Frontend (`frontend/`)
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Port**: 3000
- **Key Dependencies**:
  - React 18
  - Plaid Link SDK
  - Stripe Identity SDK
  - Axios for API calls

### Backend (`backend/`)
- **Framework**: Express.js
- **Language**: TypeScript
- **Port**: 3001
- **Key Dependencies**:
  - PostgreSQL client (pg)
  - Redis client
  - JWT authentication
  - Plaid, Stripe, Sila SDKs

### Midnight Contract (`midnight-contract/`)
- **Language**: Compact
- **Purpose**: Zero-knowledge proof circuits and smart contracts
- **Deployment**: Midnight Network testnet

## Infrastructure Services (Docker)

### Midnight Network Node
- **Port**: 26657
- **Purpose**: Blockchain node for transaction submission
- **Network**: Testnet

### Proof Server
- **Port**: 6300
- **Purpose**: Generate BLS12-381 zero-knowledge proofs
- **Input**: Witness data + circuit parameters
- **Output**: ZK proof blob

### GraphQL Indexer
- **Port**: 8081
- **Purpose**: Query proof records from blockchain
- **Database**: PostgreSQL (bunty_indexer)

### PostgreSQL
- **Port**: 5432
- **Database**: bunty
- **Purpose**: Store user data, commitments, proof submissions
- **Schema**: Defined in `backend/db/init.sql`

### Redis
- **Port**: 6379
- **Purpose**: Session management and rate limiting
- **Persistence**: AOF enabled

## Data Flow

### 1. User Onboarding
```
User → Frontend → Backend API → PostgreSQL
                              → Plaid/Stripe/Sila APIs
```

### 2. Witness Construction
```
Frontend → Plaid API (income data)
        → Stripe API (KYC status)
        → IndexedDB (local storage)
```

### 3. Proof Generation
```
Frontend → Proof Server (localhost:6300)
        → ZK Proof → Frontend
```

### 4. Proof Submission
```
Frontend → Lace Wallet (sign transaction)
        → Backend API → Midnight Node
        → Blockchain → Indexer
```

### 5. Proof Verification
```
Verifier → GraphQL Indexer → Proof Record
```

## Security Architecture

### Client-Side Privacy
- Witness data stored only in browser IndexedDB
- Proof generation happens locally via proof server
- No raw financial data sent to backend

### API Security
- JWT authentication with refresh tokens
- Rate limiting via Redis
- CORS whitelist
- Input validation and sanitization

### Data Encryption
- API keys encrypted with AES-256
- HTTPS/TLS for all communications
- Database connection encryption

### Blockchain Security
- Nullifier prevents proof replay
- 30-day proof expiry
- Wallet signature required for submission

## Development Workflow

### Local Development
1. Start Docker services: `docker-compose up -d`
2. Start dev servers: `npm run dev`
3. Frontend: http://localhost:3000
4. Backend: http://localhost:3001

### Building
```bash
npm run build              # Build all workspaces
npm run build --workspace=backend
npm run build --workspace=frontend
```

### Type Checking
```bash
npm run type-check         # Check all workspaces
npm run type-check --workspace=backend
npm run type-check --workspace=frontend
```

### Linting
```bash
npm run lint               # Lint all workspaces
npm run lint --workspace=backend
npm run lint --workspace=frontend
```

## Deployment Architecture

### Frontend (Vercel)
- Automatic deployments from main branch
- Environment variables configured in Vercel dashboard
- CDN distribution for static assets

### Backend (DigitalOcean/Supabase)
- Docker container deployment
- Environment variables via secrets management
- PostgreSQL managed database
- Redis managed cache

### Midnight Network
- Contracts deployed to testnet
- Proof server runs as Docker service
- Indexer connected to blockchain node

## Environment Configuration

All services are configured via environment variables in `.env`:

- **Database**: PostgreSQL connection string
- **Cache**: Redis URL
- **Auth**: JWT secrets
- **External APIs**: Plaid, Stripe, Sila credentials
- **Midnight**: Node, proof server, indexer URLs

See `.env.example` for complete configuration template.

## Monitoring and Observability

### Logging
- Structured JSON logs
- Request/response logging (sanitized)
- Error tracking with stack traces

### Metrics
- API response times
- Proof generation success rates
- Transaction confirmation times
- External service uptime

### Health Checks
- Backend: `GET /health`
- PostgreSQL: Docker healthcheck
- Redis: Docker healthcheck

## Next Steps

1. Implement authentication system (Task 2)
2. Integrate Plaid service (Task 3)
3. Integrate Stripe Identity (Task 4)
4. Develop Compact smart contracts (Task 7)
5. Build frontend components (Tasks 10-16)
