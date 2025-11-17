# Deployment Guide

This document provides comprehensive instructions for deploying the Bunty ZKP Platform to production and staging environments.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [CI/CD Pipeline](#cicd-pipeline)
- [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
- [Backend Deployment (DigitalOcean)](#backend-deployment-digitalocean)
- [Database Setup](#database-setup)
- [Monitoring and Health Checks](#monitoring-and-health-checks)
- [Rollback Procedures](#rollback-procedures)
- [Troubleshooting](#troubleshooting)

## Overview

The Bunty platform uses a multi-environment deployment strategy:

- **Production**: Main branch deployments to production infrastructure
- **Staging**: Pull request deployments for testing before production
- **Development**: Local Docker Compose environment

### Architecture

```
Frontend (Vercel) → Backend (DigitalOcean) → PostgreSQL (Supabase/DO)
                                           → Redis (Redis Cloud/DO)
                                           → Midnight Network
                                           → External APIs (Plaid, Stripe, Sila)
```

## Prerequisites

### Required Accounts

1. **GitHub**: Repository access with Actions enabled
2. **Vercel**: Account with CLI access token
3. **DigitalOcean**: Droplet with SSH access
4. **Supabase** (optional): Managed PostgreSQL database
5. **Redis Cloud** (optional): Managed Redis instance

### Required Tools

- Node.js 18+
- npm or yarn
- Git
- SSH client
- Vercel CLI (for manual deployments)

## Environment Configuration

### GitHub Secrets

Configure the following secrets in your GitHub repository (Settings → Secrets and variables → Actions):

#### Vercel Secrets

```
VERCEL_TOKEN                              # Vercel CLI authentication token
VERCEL_ORG_ID                            # Vercel organization ID
VERCEL_PROJECT_ID                        # Vercel project ID
```

#### DigitalOcean Secrets

```
DO_HOST                                  # Production droplet IP/hostname
DO_HOST_STAGING                          # Staging droplet IP/hostname
DO_USERNAME                              # SSH username (e.g., root or deploy)
DO_SSH_KEY                               # Private SSH key for authentication
```

#### Backend Environment Variables (Production)

```
BACKEND_PORT=3001
BACKEND_URL=https://api.bunty.io
DATABASE_URL=postgresql://user:pass@host:5432/bunty_prod
REDIS_URL=redis://user:pass@host:6379
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
ENCRYPTION_KEY=<32-byte-hex-key>
PLAID_CLIENT_ID=<plaid-client-id>
PLAID_SECRET=<plaid-secret>
PLAID_ENV=production
STRIPE_SECRET_KEY=<stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>
SILA_APP_HANDLE=<sila-app-handle>
SILA_PRIVATE_KEY=<sila-private-key>
SILA_ENVIRONMENT=production
MIDNIGHT_RPC_URL=https://midnight-rpc.bunty.io:26657
MIDNIGHT_INDEXER_URL=https://midnight-indexer.bunty.io:8081
PROOF_SERVER_URL=http://localhost:6300
CORS_ORIGIN=https://bunty.io
```

#### Backend Environment Variables (Staging)

```
BACKEND_PORT_STAGING=3001
DATABASE_URL_STAGING=postgresql://user:pass@host:5432/bunty_staging
REDIS_URL_STAGING=redis://user:pass@host:6379
JWT_SECRET_STAGING=<staging-secret>
JWT_REFRESH_SECRET_STAGING=<staging-secret>
ENCRYPTION_KEY_STAGING=<32-byte-hex-key>
STRIPE_SECRET_KEY_STAGING=<stripe-test-key>
STRIPE_WEBHOOK_SECRET_STAGING=<stripe-test-webhook-secret>
MIDNIGHT_RPC_URL_STAGING=https://testnet.midnight.network:26657
MIDNIGHT_INDEXER_URL_STAGING=https://testnet-indexer.midnight.network:8081
PROOF_SERVER_URL_STAGING=http://localhost:6300
CORS_ORIGIN_STAGING=https://staging.bunty.io
```

#### Frontend Environment Variables (Production)

```
NEXT_PUBLIC_API_URL=https://api.bunty.io
NEXT_PUBLIC_PLAID_ENV=production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<stripe-publishable-key>
NEXT_PUBLIC_MIDNIGHT_NETWORK=mainnet
```

#### Frontend Environment Variables (Staging)

```
NEXT_PUBLIC_API_URL_STAGING=https://api-staging.bunty.io
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_STAGING=<stripe-test-publishable-key>
```

### Generating Secrets

```bash
# Generate JWT secrets
openssl rand -base64 64

# Generate encryption key (32 bytes hex)
openssl rand -hex 32

# Generate SSH key pair for deployment
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/bunty_deploy
```

## CI/CD Pipeline

### Workflow Overview

The platform uses three GitHub Actions workflows:

1. **CI Workflow** (`.github/workflows/ci.yml`)
   - Runs on: Push to main/develop, Pull requests
   - Actions: Lint, type check, security audit
   - Workspaces: backend, frontend, midnight-contract, verifier-client

2. **Frontend Deployment** (`.github/workflows/deploy-frontend.yml`)
   - Runs on: Push to main (production), Pull requests (staging)
   - Target: Vercel
   - Triggers: Changes to `frontend/**` or workflow file

3. **Backend Deployment** (`.github/workflows/deploy-backend.yml`)
   - Runs on: Push to main (production), Pull requests (staging)
   - Target: DigitalOcean droplet
   - Triggers: Changes to `backend/**` or workflow file

### Triggering Deployments

#### Automatic Deployment

```bash
# Production deployment (main branch)
git checkout main
git merge develop
git push origin main

# Staging deployment (pull request)
git checkout -b feature/new-feature
git push origin feature/new-feature
# Create pull request on GitHub
```

#### Manual Deployment

```bash
# Trigger workflow manually via GitHub UI
# Go to Actions → Select workflow → Run workflow
```

## Frontend Deployment (Vercel)

### Initial Setup

1. **Create Vercel Project**

```bash
cd frontend
vercel login
vercel link
```

2. **Configure Environment Variables**

In Vercel dashboard (Settings → Environment Variables):
- Add all `NEXT_PUBLIC_*` variables
- Set different values for Production and Preview environments

3. **Configure Build Settings**

```
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm ci
```

### Manual Deployment

```bash
cd frontend

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Vercel Configuration

Create `vercel.json` in frontend directory:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm ci",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "@next-public-api-url",
    "NEXT_PUBLIC_PLAID_ENV": "@next-public-plaid-env",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY": "@next-public-stripe-key",
    "NEXT_PUBLIC_MIDNIGHT_NETWORK": "@next-public-midnight-network"
  }
}
```

## Backend Deployment (DigitalOcean)

### Initial Server Setup

1. **Create Droplet**

```bash
# Create Ubuntu 22.04 droplet
# Minimum specs: 2 vCPUs, 4GB RAM, 80GB SSD
```

2. **Initial Server Configuration**

```bash
# SSH into droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Install PostgreSQL client (if using local DB)
apt install -y postgresql-client

# Create deployment user
adduser deploy
usermod -aG sudo deploy

# Setup SSH key for deploy user
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Create application directory
mkdir -p /var/www/bunty-backend
chown deploy:deploy /var/www/bunty-backend
```

3. **Configure Nginx (Optional)**

```bash
apt install -y nginx

# Create Nginx configuration
cat > /etc/nginx/sites-available/bunty-backend << 'EOF'
server {
    listen 80;
    server_name api.bunty.io;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/bunty-backend /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Install Certbot for SSL
apt install -y certbot python3-certbot-nginx
certbot --nginx -d api.bunty.io
```

4. **Setup PM2 Startup**

```bash
# As deploy user
su - deploy
pm2 startup
# Follow the instructions to enable PM2 on boot
```

### Manual Deployment

```bash
# On local machine
cd backend
npm run build
tar -czf backend-deploy.tar.gz dist package.json package-lock.json

# Copy to server
scp backend-deploy.tar.gz deploy@your-droplet-ip:/tmp/

# SSH into server
ssh deploy@your-droplet-ip

# Deploy
cd /var/www/bunty-backend
tar -xzf /tmp/backend-deploy.tar.gz
npm ci --production

# Create .env file (use your actual values)
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
# ... other environment variables
EOF

# Start/restart with PM2
pm2 restart bunty-backend || pm2 start dist/index.js --name bunty-backend
pm2 save
```

### PM2 Management

```bash
# View logs
pm2 logs bunty-backend

# Monitor processes
pm2 monit

# Restart application
pm2 restart bunty-backend

# Stop application
pm2 stop bunty-backend

# View process list
pm2 list

# Save process list
pm2 save
```

## Database Setup

### PostgreSQL (Supabase)

1. **Create Project**
   - Go to Supabase dashboard
   - Create new project
   - Note connection string

2. **Run Migrations**

```bash
# Connect to database
psql "postgresql://user:pass@host:5432/bunty_prod"

# Run init script
\i backend/db/init.sql
```

### PostgreSQL (Self-Hosted)

```bash
# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE bunty_prod;
CREATE USER bunty_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE bunty_prod TO bunty_user;
\q

# Run migrations
psql -U bunty_user -d bunty_prod -f backend/db/init.sql
```

### Redis Setup

```bash
# Install Redis
apt install -y redis-server

# Configure Redis
nano /etc/redis/redis.conf
# Set: bind 127.0.0.1
# Set: requirepass your_redis_password

# Restart Redis
systemctl restart redis-server
```

## Monitoring and Health Checks

### Health Check Endpoint

The backend exposes a health check endpoint:

```bash
curl https://api.bunty.io/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "midnight": "connected"
  }
}
```

### PM2 Monitoring

```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Application Logs

```bash
# View real-time logs
pm2 logs bunty-backend --lines 100

# View error logs only
pm2 logs bunty-backend --err

# Export logs
pm2 logs bunty-backend --out /var/log/bunty/app.log
```

### Uptime Monitoring

Consider using external monitoring services:
- UptimeRobot
- Pingdom
- StatusCake
- Datadog

## Rollback Procedures

### Frontend Rollback (Vercel)

```bash
# Via Vercel dashboard
# Go to Deployments → Select previous deployment → Promote to Production

# Via CLI
vercel rollback
```

### Backend Rollback

```bash
# SSH into server
ssh deploy@your-droplet-ip

# Keep previous deployments
cd /var/www
mv bunty-backend bunty-backend-$(date +%Y%m%d-%H%M%S)
mv bunty-backend-previous bunty-backend

# Restart PM2
cd bunty-backend
pm2 restart bunty-backend
```

### Database Rollback

```bash
# Restore from backup
pg_restore -U bunty_user -d bunty_prod backup_file.dump

# Or restore specific tables
psql -U bunty_user -d bunty_prod < backup_tables.sql
```

## Troubleshooting

### Common Issues

#### 1. Deployment Fails - Build Error

```bash
# Check GitHub Actions logs
# Verify all dependencies are in package.json
# Ensure TypeScript compiles locally

cd backend
npm ci
npm run build
```

#### 2. Backend Not Starting

```bash
# Check PM2 logs
pm2 logs bunty-backend --err

# Common issues:
# - Missing environment variables
# - Database connection failure
# - Port already in use

# Verify environment
cat /var/www/bunty-backend/.env

# Test database connection
psql "$DATABASE_URL"
```

#### 3. Frontend Build Fails

```bash
# Check Vercel build logs
# Verify environment variables are set
# Test build locally

cd frontend
npm ci
npm run build
```

#### 4. Database Connection Issues

```bash
# Test connection
psql "$DATABASE_URL"

# Check firewall rules
sudo ufw status

# Verify PostgreSQL is running
systemctl status postgresql
```

#### 5. SSL Certificate Issues

```bash
# Renew certificate
certbot renew

# Test certificate
certbot certificates

# Force renewal
certbot renew --force-renewal
```

### Getting Help

- Check GitHub Actions logs for CI/CD issues
- Review PM2 logs for runtime errors
- Check Vercel deployment logs
- Review application logs in `/var/log/bunty/`

### Emergency Contacts

- DevOps Lead: [email]
- Backend Lead: [email]
- Frontend Lead: [email]

## Maintenance Windows

Schedule regular maintenance:
- Database backups: Daily at 2 AM UTC
- Log rotation: Weekly
- Security updates: Monthly
- SSL renewal: Automatic (Let's Encrypt)

## Backup Strategy

### Database Backups

```bash
# Create backup script
cat > /usr/local/bin/backup-bunty-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/bunty"
DATE=$(date +%Y%m%d-%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump "$DATABASE_URL" > $BACKUP_DIR/bunty-$DATE.sql
gzip $BACKUP_DIR/bunty-$DATE.sql
# Keep only last 7 days
find $BACKUP_DIR -name "bunty-*.sql.gz" -mtime +7 -delete
EOF

chmod +x /usr/local/bin/backup-bunty-db.sh

# Add to crontab
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-bunty-db.sh
```

### Application Backups

```bash
# Backup application code
tar -czf /var/backups/bunty/backend-$(date +%Y%m%d).tar.gz /var/www/bunty-backend
```

## Security Checklist

- [ ] All secrets stored in GitHub Secrets
- [ ] SSH keys rotated regularly
- [ ] Database credentials use strong passwords
- [ ] SSL certificates configured and auto-renewing
- [ ] Firewall rules configured (UFW)
- [ ] Regular security updates applied
- [ ] API rate limiting enabled
- [ ] CORS properly configured
- [ ] Environment variables never committed to git
- [ ] Backup strategy implemented and tested

## Performance Optimization

### Backend Optimization

- Enable Redis caching for frequent queries
- Use connection pooling for PostgreSQL
- Enable gzip compression in Nginx
- Optimize database indexes
- Monitor slow queries

### Frontend Optimization

- Enable Vercel Edge Network
- Optimize images with Next.js Image component
- Use code splitting and lazy loading
- Enable service worker for offline support
- Monitor Core Web Vitals

## Conclusion

This deployment guide covers the complete deployment process for the Bunty ZKP Platform. For additional support or questions, refer to the project documentation or contact the development team.
