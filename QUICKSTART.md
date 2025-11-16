# Quick Start Guide

## Prerequisites

Ensure you have the following installed:
- Node.js 18+ and npm
- Docker and Docker Compose
- Git

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

This will install dependencies for all workspaces (frontend, backend, midnight-contract).

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
- Plaid credentials (get from https://dashboard.plaid.com)
- Stripe credentials (get from https://dashboard.stripe.com)
- Sila credentials (get from https://console.silamoney.com)
- Generate secure JWT secrets

### 3. Start Docker Services

```bash
docker-compose up -d
```

This starts:
- Midnight Network node (port 26657)
- Proof Server (port 6300)
- GraphQL Indexer (port 8081)
- PostgreSQL (port 5432)
- Redis (port 6379)

Wait for services to be healthy:
```bash
docker-compose ps
```

### 4. Verify Database

Check that PostgreSQL is running and initialized:
```bash
docker-compose logs postgres
```

### 5. Start Development Servers

```bash
npm run dev
```

This starts both frontend and backend in development mode:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### 6. Verify Setup

Test the backend health endpoint:
```bash
curl http://localhost:3001/health
```

Open the frontend in your browser:
```bash
open http://localhost:3000
```

## Troubleshooting

### Docker Services Not Starting

Check Docker logs:
```bash
docker-compose logs [service-name]
```

Restart services:
```bash
docker-compose restart
```

### Port Conflicts

If ports are already in use, modify the port mappings in `docker-compose.yml`.

### Database Connection Issues

Ensure PostgreSQL is healthy:
```bash
docker-compose exec postgres pg_isready -U bunty_user
```

### TypeScript Errors

Run type checking:
```bash
npm run type-check
```

## Next Steps

1. Review the requirements document: `.kiro/specs/bunty-zkp-platform/requirements.md`
2. Review the design document: `.kiro/specs/bunty-zkp-platform/design.md`
3. Check the implementation tasks: `.kiro/specs/bunty-zkp-platform/tasks.md`
4. Start implementing task 2: Backend authentication system

## Useful Commands

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# View logs
docker-compose logs -f [service-name]

# Build all workspaces
npm run build

# Lint all workspaces
npm run lint

# Run backend only
npm run dev:backend

# Run frontend only
npm run dev:frontend
```
