# Bunty

> A privacy-first financial identity protocol built on Midnight Network

Prove your income, KYC status, and creditworthiness using zero-knowledge proofs without revealing sensitive documents.

---

## 📋 Table of Contents

- [What This Does](#what-this-does)
- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the App](#running-the-app)
- [Getting API Keys](#getting-api-keys)
- [Using the Application](#using-the-application)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

---

## 🎯 What This Does

**Bunty** enables users to:
- ✅ Verify identity without exposing personal documents
- ✅ Prove income without sharing bank statements
- ✅ Demonstrate creditworthiness privately
- ✅ Generate verifiable credentials for financial services
- ✅ Submit zero-knowledge proofs to blockchain

**Key Features:**
- Identity verification via Persona (with Stripe fallback)
- Bank account integration via Plaid
- Zero-knowledge proof generation
- Midnight Network blockchain integration
- Lace wallet support

---

## ⚡ Quick Start

```bash
# 1. Clone and install
git clone https://github.com/your-org/bunty-zkp-platform.git
cd bunty-zkp-platform
npm install

# 2. Set up environment
cp .env.template backend/.env
nano backend/.env  # Add your database credentials

# 3. Set up database
createdb bunty
psql -d bunty -f backend/db/init.sql
psql -d bunty -f backend/init-db.sql

# 4. Start the app
npm run dev

# 5. Open browser
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

---

## 📦 Prerequisites

### Required
- **Node.js** 18+ (tested with v22.19.0)
- **PostgreSQL** 15+ (running on port 5432)
- **Redis** 7+ (running on port 6379)
- **npm** or **yarn**

### Optional (for full features)
- **Docker** (for Midnight Network services)
- **Midnight Lace Wallet** browser extension
- **Persona account** (for identity verification)
- **Plaid account** (for bank integration)

---

## 🔧 Installation

### 1. Install Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# macOS
brew install node

# Verify
node --version  # Should be 18+
```

### 2. Install PostgreSQL

```bash
# Ubuntu/Debian
sudo apt install -y postgresql postgresql-contrib

# macOS
brew install postgresql@15

# Start PostgreSQL
sudo systemctl start postgresql  # Linux
brew services start postgresql@15  # macOS
```

### 3. Install Redis

```bash
# Ubuntu/Debian
sudo apt install -y redis-server

# macOS
brew install redis

# Start Redis
sudo systemctl start redis  # Linux
brew services start redis  # macOS
```

### 4. Clone Repository

```bash
git clone https://github.com/your-org/bunty-zkp-platform.git
cd bunty-zkp-platform
npm install
```

---

## ⚙️ Configuration

### 1. Database Setup

```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE bunty;
CREATE USER bunty_user WITH PASSWORD 'bunty_password';
GRANT ALL PRIVILEGES ON DATABASE bunty TO bunty_user;
\c bunty
GRANT ALL ON SCHEMA public TO bunty_user;
EOF

# Run schema
psql -U bunty_user -d bunty -f backend/db/init.sql
psql -U bunty_user -d bunty -f backend/init-db.sql
```

### 2. Environment Variables

```bash
# Copy template
cp .env.template backend/.env

# Edit with your values
nano backend/.env
```

**Minimum Required Configuration:**

```bash
# Database (Required)
DATABASE_URL=postgresql://bunty_user:bunty_password@localhost:5432/bunty

# Redis (Required)
REDIS_URL=redis://localhost:6379

# JWT Secrets (Required - use random strings)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars

# Server (Required)
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Identity Provider (Choose one)
USE_PERSONA=false  # Set to true when you have Persona keys
```

**Generate Secure Secrets:**

```bash
# Generate JWT secrets
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET
```

---

## 🚀 Running the App

### Development Mode

```bash
# Start both frontend and backend
npm run dev

# Or start separately
cd backend && npm run dev  # Backend only
cd frontend && npm run dev  # Frontend only
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

### Verify Installation

```bash
# Check backend health
curl http://localhost:3001/health
# Expected: {"status":"ok","timestamp":"..."}

# Check database connection
psql -U bunty_user -d bunty -c "SELECT 1;"
# Expected: 1 row returned

# Check Redis
redis-cli ping
# Expected: PONG
```

---

## 🔑 Getting API Keys

### Persona (Identity Verification)

1. **Sign up**: https://withpersona.com
2. **Get API Key**:
   - Go to Dashboard → API Keys
   - Create **Sandbox** API key
   - Copy to `PERSONA_API_KEY`
3. **Create Template**:
   - Go to Templates → Create verification template
   - Copy template ID to `PERSONA_TEMPLATE_ID`
4. **Set up Webhook**:
   - Go to Webhooks → Add endpoint
   - URL: `http://localhost:3001/api/identity/webhook`
   - Events: `inquiry.completed`, `inquiry.failed`, `inquiry.expired`
   - Copy secret to `PERSONA_WEBHOOK_SECRET`
5. **Update .env**:
   ```bash
   USE_PERSONA=true
   PERSONA_API_KEY=persona_sandbox_your_key
   PERSONA_ENVIRONMENT=sandbox
   PERSONA_TEMPLATE_ID=itmpl_your_template_id
   PERSONA_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

### Plaid (Bank Integration)

1. **Sign up**: https://plaid.com
2. **Get Credentials**:
   - Go to Dashboard → Team Settings → Keys
   - Copy **Client ID** to `PLAID_CLIENT_ID`
   - Copy **Sandbox Secret** to `PLAID_SECRET`
3. **Update .env**:
   ```bash
   PLAID_CLIENT_ID=your_client_id
   PLAID_SECRET=your_sandbox_secret
   PLAID_ENV=sandbox
   ```

### Stripe (Alternative to Persona)

1. **Sign up**: https://stripe.com
2. **Get API Keys**:
   - Go to Dashboard → Developers → API Keys
   - Copy **Secret key** to `STRIPE_SECRET_KEY`
   - Copy **Publishable key** to `STRIPE_PUBLISHABLE_KEY`
3. **Set up Webhook**:
   - Go to Webhooks → Add endpoint
   - URL: `http://localhost:3001/api/identity/webhook`
   - Copy secret to `STRIPE_WEBHOOK_SECRET`
4. **Update .env**:
   ```bash
   USE_PERSONA=false
   STRIPE_SECRET_KEY=sk_test_your_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_key
   STRIPE_WEBHOOK_SECRET=whsec_your_secret
   ```

---

## 📱 Using the Application

### 1. Register & Login

```
1. Open http://localhost:3000
2. Click "Register"
3. Enter email and password
4. Click "Login" with your credentials
```

### 2. Identity Verification

```
1. Navigate to "Verification" page
2. Click "Start Identity Verification"
3. Persona SDK will load
4. Upload government ID
5. Take selfie
6. Enter personal information
7. Submit verification
8. Wait for approval (instant in sandbox)
```

### 3. Connect Bank Account

```
1. Go to "Financial Data" page
2. Click "Connect Bank Account"
3. Plaid Link will open
4. Select your bank (use "Sandbox" for testing)
5. Login with test credentials
6. Select accounts to link
7. Accounts will appear in dashboard
```

### 4. Generate Witness

```
1. Go to "Witness Generation" page
2. Select proof type:
   - Income Proof
   - Asset Proof
   - Creditworthiness Proof
3. Set threshold (e.g., prove income > $50,000)
4. Click "Generate Witness"
5. Witness hash is created
```

### 5. Generate ZK Proof (Requires Midnight Network)

```
1. Go to "Proof Generation" page
2. Select witness
3. Click "Generate Proof"
4. Proof server creates zero-knowledge proof
5. Proof is ready for submission
```

### 6. Submit to Blockchain (Requires Lace Wallet)

```
1. Install Midnight Lace Wallet extension
2. Connect wallet to application
3. Go to "Submit Proof" page
4. Review proof details
5. Sign transaction with Lace wallet
6. Proof is submitted to Midnight Network
```

---

## 📚 API Documentation

### Authentication

#### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

Response: {
  "message": "User registered successfully",
  "userId": "uuid"
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

Response: {
  "token": "jwt_token",
  "refreshToken": "refresh_token",
  "user": { "id": "uuid", "email": "user@example.com" }
}
```

#### Refresh Token
```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token"
}

Response: {
  "token": "new_jwt_token"
}
```

### Identity Verification

#### Start Verification
```bash
POST /api/identity/verify
Authorization: Bearer jwt_token

Response: {
  "inquiryId": "inq_...",
  "sessionToken": "...",
  "url": "https://withpersona.com/verify/..."
}
```

#### Check Status
```bash
GET /api/identity/status
Authorization: Bearer jwt_token

Response: {
  "status": "completed",
  "verified": true,
  "inquiryId": "inq_...",
  "verifiedAt": "2024-11-17T12:00:00Z"
}
```

#### Webhook (Called by Persona)
```bash
POST /api/identity/webhook
Persona-Signature: signature_from_persona
Content-Type: application/json

{
  "type": "inquiry.completed",
  "data": {
    "id": "inq_...",
    "attributes": { ... }
  }
}
```

### Plaid Integration

#### Create Link Token
```bash
POST /api/plaid/create-link-token
Authorization: Bearer jwt_token

Response: {
  "linkToken": "link-sandbox-..."
}
```

#### Exchange Public Token
```bash
POST /api/plaid/exchange-token
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "publicToken": "public-sandbox-..."
}

Response: {
  "accessToken": "access-sandbox-...",
  "itemId": "item_..."
}
```

#### Get Accounts
```bash
GET /api/plaid/accounts
Authorization: Bearer jwt_token

Response: {
  "accounts": [
    {
      "id": "account_id",
      "name": "Checking",
      "type": "depository",
      "subtype": "checking",
      "balance": 1000.00
    }
  ]
}
```

#### Get Transactions
```bash
GET /api/plaid/transactions?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer jwt_token

Response: {
  "transactions": [
    {
      "id": "tx_id",
      "date": "2024-11-17",
      "amount": 50.00,
      "name": "Coffee Shop",
      "category": ["Food and Drink"]
    }
  ]
}
```

### Witness Generation

#### Generate Witness
```bash
POST /api/witness/generate
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "type": "income",
  "threshold": 50000
}

Response: {
  "witnessHash": "0x...",
  "witness": {
    "userId": "uuid",
    "personaVerified": true,
    "ssnVerified": true,
    "income": 75000,
    "threshold": 50000
  }
}
```

#### Get Witness
```bash
GET /api/witness/:hash
Authorization: Bearer jwt_token

Response: {
  "witnessHash": "0x...",
  "witness": { ... },
  "createdAt": "2024-11-17T12:00:00Z"
}
```

### Proof Generation

#### Generate Proof
```bash
POST /api/proof/generate
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "witnessHash": "0x...",
  "circuit": "verifyIncome"
}

Response: {
  "proof": "0x...",
  "publicInputs": {
    "threshold": 50000
  },
  "publicOutputs": {
    "meetsThreshold": true
  }
}
```

#### Submit Proof
```bash
POST /api/proof/submit
Authorization: Bearer jwt_token
Content-Type: application/json

{
  "proof": "0x...",
  "signedTx": "0x..."
}

Response: {
  "txHash": "0x...",
  "status": "pending",
  "submissionId": "uuid"
}
```

#### Get Proof Status
```bash
GET /api/proof/status/:submissionId
Authorization: Bearer jwt_token

Response: {
  "status": "confirmed",
  "txHash": "0x...",
  "blockNumber": 12345,
  "confirmedAt": "2024-11-17T12:00:00Z"
}
```

### Metrics & Health

#### Health Check
```bash
GET /health

Response: {
  "status": "ok",
  "timestamp": "2024-11-17T12:00:00Z"
}
```

#### Metrics
```bash
GET /api/metrics
Authorization: Bearer jwt_token

Response: {
  "requests": {
    "total": 1000,
    "success": 950,
    "error": 50
  },
  "responseTime": {
    "avg": 150,
    "p95": 300,
    "p99": 500
  },
  "database": {
    "connections": 5,
    "queries": 5000
  }
}
```

---

## 🛠️ Development

### Project Structure

```
bunty-zkp-platform/
├── frontend/              # Next.js 14 React app
│   ├── src/
│   │   ├── app/          # Pages (App Router)
│   │   ├── components/   # React components
│   │   ├── contexts/     # React contexts
│   │   ├── services/     # API clients
│   │   └── types/        # TypeScript types
│   └── public/           # Static assets
├── backend/              # Express.js API
│   ├── src/
│   │   ├── controllers/  # Route handlers
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Express middleware
│   │   ├── routes/       # API routes
│   │   ├── types/        # TypeScript types
│   │   ├── config/       # Configuration
│   │   ├── utils/        # Utilities
│   │   └── scripts/      # Utility scripts
│   └── db/
│       ├── init.sql      # Database schema
│       └── migrations/   # Migrations
├── midnight-contract/    # ZK circuits & contracts
└── package.json          # Monorepo config
```

### Available Scripts

```bash
# Root level
npm run dev              # Start all workspaces
npm run build            # Build all workspaces
npm run lint             # Lint all workspaces
npm run type-check       # Type check all workspaces

# Backend
cd backend
npm run dev              # Start with hot reload
npm run build            # Build TypeScript
npm test                 # Run tests

# Frontend
cd frontend
npm run dev              # Start with hot reload
npm run build            # Build for production
npm run lint             # Lint code
```

### Adding New Features

1. **Backend API Endpoint**:
   - Add route in `backend/src/routes/`
   - Add controller in `backend/src/controllers/`
   - Add service logic in `backend/src/services/`
   - Add types in `backend/src/types/`

2. **Frontend Page**:
   - Add page in `frontend/src/app/`
   - Add components in `frontend/src/components/`
   - Add API service in `frontend/src/services/`
   - Add types in `frontend/src/types/`

3. **Database Changes**:
   - Create migration in `backend/db/migrations/`
   - Run migration: `psql -U bunty_user -d bunty -f migration.sql`

---

## 🧪 Testing

### Backend Tests

```bash
cd backend

# Test Persona integration
npx tsx src/scripts/test-persona-integration.ts

# Test witness generation
npx tsx src/scripts/test-witness-persona.ts

# Test feature flags
npx tsx src/scripts/test-feature-flags.ts

# Test database migration
npx tsx src/scripts/test-migration.ts
```

### Frontend Tests

```bash
cd frontend
npm test
```

### Integration Tests

```bash
# Full integration test
npx tsx backend/src/scripts/test-witness-persona-integration.ts
```

---

## 🚢 Deployment

### Production Environment Setup

#### 1. Server Requirements
- 2+ CPU cores
- 4GB+ RAM
- 20GB+ storage
- Ubuntu 20.04+ or similar

#### 2. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install PM2
sudo npm install -g pm2
```

#### 3. Database Setup

```bash
# Create production database
sudo -u postgres psql << EOF
CREATE DATABASE bunty_production;
CREATE USER bunty_prod WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE bunty_production TO bunty_prod;
\c bunty_production
GRANT ALL ON SCHEMA public TO bunty_prod;
EOF

# Run migrations
psql -U bunty_prod -d bunty_production -f backend/db/init.sql
psql -U bunty_prod -d bunty_production -f backend/init-db.sql
```

#### 4. Application Deployment

```bash
# Clone repository
git clone https://github.com/your-org/bunty-zkp-platform.git
cd bunty-zkp-platform

# Install dependencies
npm install

# Build backend
cd backend
npm run build

# Configure environment
cp .env.example .env
nano .env  # Add production values

# Start with PM2
pm2 start dist/index.js --name bunty-backend
pm2 save
pm2 startup
```

#### 5. Frontend Deployment

**Option A: Vercel (Recommended)**
```bash
cd frontend
npm install -g vercel
vercel --prod
```

**Option B: Self-hosted**
```bash
cd frontend
npm run build
# Deploy .next folder to your web server
```

#### 6. Nginx Configuration

```nginx
# /etc/nginx/sites-available/bunty
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/bunty /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 7. SSL Certificate

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

#### 8. Configure Webhooks

Update webhook URLs in:
- **Persona**: `https://api.yourdomain.com/api/identity/webhook`
- **Plaid**: `https://api.yourdomain.com/api/plaid/webhook`

### Monitoring

```bash
# PM2 status
pm2 status

# View logs
pm2 logs bunty-backend

# Monitor resources
pm2 monit

# Health check
curl https://api.yourdomain.com/health
```

### Backup

```bash
# Database backup
pg_dump -U bunty_prod bunty_production > backup_$(date +%Y%m%d).sql

# Automated daily backup
echo "0 2 * * * pg_dump -U bunty_prod bunty_production > /var/backups/bunty/backup_\$(date +\%Y\%m\%d).sql" | crontab -
```

### Rollback

```bash
# Quick rollback (feature flag)
ssh production-server
cd /path/to/bunty-zkp-platform/backend
sed -i 's/USE_PERSONA=true/USE_PERSONA=false/' .env
pm2 restart bunty-backend

# Full rollback
git checkout previous-stable-tag
npm install
cd backend && npm run build
pm2 restart bunty-backend
```

---

## 🔍 Troubleshooting

### Backend Won't Start

```bash
# Check logs
tail -f backend/logs/app.log

# Check database connection
psql -U bunty_user -d bunty -c "SELECT 1;"

# Check Redis connection
redis-cli ping

# Check environment variables
cd backend && cat .env

# Check port availability
lsof -i :3001
```

### Frontend Can't Connect

```bash
# Verify backend is running
curl http://localhost:3001/health

# Check CORS settings
grep CORS_ORIGIN backend/.env

# Check browser console (F12)
```

### Database Errors

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check database exists
psql -U postgres -l | grep bunty

# Reset database
psql -U postgres -c "DROP DATABASE bunty;"
psql -U postgres -c "CREATE DATABASE bunty;"
psql -U bunty_user -d bunty -f backend/db/init.sql
```

### Persona Verification Fails

```bash
# Test API key
curl https://withpersona.com/api/v1/inquiries \
  -H "Authorization: Bearer $PERSONA_API_KEY" \
  -H "Persona-Version: 2023-01-05"

# Check webhook configuration
# Go to Persona Dashboard → Webhooks
# Verify endpoint and secret
```

### Plaid Connection Fails

```bash
# Test credentials
curl https://sandbox.plaid.com/link/token/create \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "'$PLAID_CLIENT_ID'",
    "secret": "'$PLAID_SECRET'",
    "user": {"client_user_id": "test"},
    "client_name": "Bunty",
    "products": ["auth"],
    "country_codes": ["US"],
    "language": "en"
  }'
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev
```

---

## 🏗️ Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI**: React 18
- **Styling**: CSS Modules
- **State**: React Context
- **API Client**: Axios

### Backend
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+
- **Auth**: JWT
- **Process Manager**: PM2

### Blockchain 
- **Network**: Midnight Network (Cardano)
- **Wallet**: Lace Wallet
- **Proofs**: BLS12-381 ZK-SNARKs
- **Contracts**: Compact language

### External Services
- **Identity**: Persona / Stripe Identity
- **Banking**: Plaid
- **Payments**: Sila (optional)

---

## 🔒 Security

### Features
- JWT authentication with refresh tokens
- Rate limiting (per-IP and per-user)
- Input sanitization and validation
- SQL injection prevention
- XSS prevention
- CORS whitelist
- Audit logging
- Webhook signature verification
- API key rotation

### Best Practices
- Use strong passwords
- Keep secrets in `.env` (never commit)
- Rotate API keys regularly
- Use HTTPS in production
- Enable firewall
- Regular security updates
- Monitor logs for suspicious activity

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Code Style
- Use TypeScript strict mode
- Follow existing code patterns
- Add comments for complex logic
- Write meaningful commit messages
- Add tests for new features

### Commit Message Format
```
type(scope): subject

Examples:
feat(auth): add OAuth2 support
fix(persona): handle webhook errors
docs(readme): update installation steps
```

---

## 📄 License

MIT License - See LICENSE file for details

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/miny-labs/bunty/issues)
- **Email**: thatspacebiker@gmail.com

---

## 🗺️ Roadmap

- [x] Identity verification (Persona)
- [x] Bank integration (Plaid)
- [x] Witness generation
- [x] Feature flag system
- [x] Midnight Network integration
- [x] ZK proof generation
- [x] Lace wallet integration
- [ ] Mobile app
- [ ] Multi-language support

---

**Built with ❤️ for privacy-first financial services**

Version 1.0.0 | Last Updated: November 2025
