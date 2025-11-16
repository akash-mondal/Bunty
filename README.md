# Bunty ZKP Platform

A privacy-first financial identity protocol built on Cardano's Midnight Network.

## Project Structure

```
bunty-zkp-platform/
├── frontend/           # Next.js frontend application
├── backend/            # Node.js/Express backend API
├── midnight-contract/  # Compact smart contracts
├── docker-compose.yml  # Docker services configuration
└── package.json        # Monorepo root configuration
```

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm or yarn

## Getting Started

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start Docker services:
```bash
docker-compose up -d
```

4. Start development servers:
```bash
npm run dev
```

## Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Midnight Node**: http://localhost:26657
- **Proof Server**: http://localhost:6300
- **GraphQL Indexer**: http://localhost:8081
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## Development

- `npm run dev` - Start all development servers
- `npm run build` - Build all workspaces
- `npm run lint` - Lint all workspaces
- `npm run type-check` - Type check all workspaces

## Documentation

See the `.kiro/specs/bunty-zkp-platform/` directory for detailed requirements, design, and implementation plan.
