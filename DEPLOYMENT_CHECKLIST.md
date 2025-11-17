# Deployment Setup Checklist

Use this checklist to ensure all components are properly configured before deploying the Bunty ZKP Platform.

## Pre-Deployment Setup

### 1. GitHub Repository Configuration

- [ ] Repository created and code pushed
- [ ] GitHub Actions enabled
- [ ] Branch protection rules configured for `main`
  - [ ] Require pull request reviews
  - [ ] Require status checks to pass
  - [ ] Require branches to be up to date
- [ ] Environments created (production, staging)
  - [ ] Production environment requires approval
  - [ ] Staging environment auto-deploys

### 2. Vercel Setup

- [ ] Vercel account created
- [ ] Project created and linked to GitHub repository
- [ ] Vercel CLI installed: `npm install -g vercel`
- [ ] Project linked locally: `cd frontend && vercel link`
- [ ] Vercel token generated (Settings → Tokens)
- [ ] GitHub secrets configured:
  - [ ] `VERCEL_TOKEN`
  - [ ] `VERCEL_ORG_ID`
  - [ ] `VERCEL_PROJECT_ID`
- [ ] Environment variables set in Vercel dashboard:
  - [ ] `NEXT_PUBLIC_API_URL` (production)
  - [ ] `NEXT_PUBLIC_API_URL_STAGING` (preview)
  - [ ] `NEXT_PUBLIC_PLAID_ENV`
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - [ ] `NEXT_PUBLIC_MIDNIGHT_NETWORK`

### 3. DigitalOcean Setup

#### Production Server
- [ ] Droplet created (Ubuntu 22.04, 2 vCPUs, 4GB RAM minimum)
- [ ] SSH key generated: `ssh-keygen -t ed25519 -C "bunty-deploy"`
- [ ] SSH key added to droplet
- [ ] Server initial setup completed:
  - [ ] System updated: `apt update && apt upgrade -y`
  - [ ] Node.js 18 installed
  - [ ] PM2 installed globally: `npm install -g pm2`
  - [ ] Nginx installed and configured
  - [ ] PostgreSQL client installed (if using local DB)
  - [ ] Deploy user created
  - [ ] Application directory created: `/var/www/bunty-backend`
  - [ ] PM2 startup configured
- [ ] Firewall configured:
  - [ ] SSH (22) allowed
  - [ ] HTTP (80) allowed
  - [ ] HTTPS (443) allowed
  - [ ] Application port (3001) allowed from localhost only
- [ ] SSL certificate obtained: `certbot --nginx -d api.bunty.io`

#### Staging Server
- [ ] Staging droplet created
- [ ] Same setup as production completed
- [ ] Different domain/subdomain configured

#### GitHub Secrets
- [ ] `DO_HOST` (production IP)
- [ ] `DO_HOST_STAGING` (staging IP)
- [ ] `DO_USERNAME` (deploy user)
- [ ] `DO_SSH_KEY` (private key content)

### 4. Database Setup (PostgreSQL)

#### Option A: Supabase (Recommended)
- [ ] Supabase project created
- [ ] Production database created
- [ ] Staging database created
- [ ] Connection strings obtained
- [ ] Database initialized: `psql "$DATABASE_URL" -f backend/db/init.sql`
- [ ] Backups configured (automatic in Supabase)

#### Option B: Self-Hosted
- [ ] PostgreSQL installed on server
- [ ] Production database created
- [ ] Staging database created
- [ ] Database user created with proper permissions
- [ ] Database initialized with schema
- [ ] Backup script created and scheduled
- [ ] Connection pooling configured

#### GitHub Secrets
- [ ] `DATABASE_URL` (production)
- [ ] `DATABASE_URL_STAGING`

### 5. Redis Setup

#### Option A: Redis Cloud (Recommended)
- [ ] Redis Cloud account created
- [ ] Production instance created
- [ ] Staging instance created
- [ ] Connection strings obtained

#### Option B: Self-Hosted
- [ ] Redis installed on server
- [ ] Redis password configured
- [ ] Redis persistence enabled
- [ ] Redis backup configured

#### GitHub Secrets
- [ ] `REDIS_URL` (production)
- [ ] `REDIS_URL_STAGING`

### 6. External Services Configuration

#### Plaid
- [ ] Plaid account created
- [ ] Application registered
- [ ] Sandbox credentials obtained
- [ ] Production credentials obtained (when ready)
- [ ] Webhook URL configured
- [ ] GitHub secrets configured:
  - [ ] `PLAID_CLIENT_ID`
  - [ ] `PLAID_SECRET`
  - [ ] `PLAID_ENV`

#### Stripe
- [ ] Stripe account created
- [ ] Test mode keys obtained
- [ ] Production keys obtained (when ready)
- [ ] Stripe Identity enabled
- [ ] Webhook endpoints configured:
  - [ ] Production: `https://api.bunty.io/api/stripe/webhook`
  - [ ] Staging: `https://api-staging.bunty.io/api/stripe/webhook`
- [ ] Webhook secrets obtained
- [ ] GitHub secrets configured:
  - [ ] `STRIPE_SECRET_KEY`
  - [ ] `STRIPE_SECRET_KEY_STAGING`
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [ ] `STRIPE_WEBHOOK_SECRET_STAGING`
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_STAGING`

#### Sila Money
- [ ] Sila account created
- [ ] Application registered
- [ ] Sandbox credentials obtained
- [ ] Production credentials obtained (when ready)
- [ ] GitHub secrets configured:
  - [ ] `SILA_APP_HANDLE`
  - [ ] `SILA_PRIVATE_KEY`
  - [ ] `SILA_ENVIRONMENT`

### 7. Midnight Network Setup

- [ ] Midnight node running (Docker Compose)
- [ ] Proof server running (Docker Compose)
- [ ] Indexer running (Docker Compose)
- [ ] Smart contracts compiled
- [ ] Smart contracts deployed to testnet
- [ ] Contract addresses documented
- [ ] GitHub secrets configured:
  - [ ] `MIDNIGHT_RPC_URL`
  - [ ] `MIDNIGHT_RPC_URL_STAGING`
  - [ ] `MIDNIGHT_INDEXER_URL`
  - [ ] `MIDNIGHT_INDEXER_URL_STAGING`
  - [ ] `PROOF_SERVER_URL`
  - [ ] `PROOF_SERVER_URL_STAGING`

### 8. Security Configuration

#### Secrets Generation
- [ ] JWT secret generated: `openssl rand -base64 64`
- [ ] JWT refresh secret generated: `openssl rand -base64 64`
- [ ] Encryption key generated: `openssl rand -hex 32`
- [ ] All secrets are unique per environment
- [ ] Secrets documented in secure location (password manager)

#### GitHub Secrets
- [ ] `JWT_SECRET`
- [ ] `JWT_SECRET_STAGING`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `JWT_REFRESH_SECRET_STAGING`
- [ ] `ENCRYPTION_KEY`
- [ ] `ENCRYPTION_KEY_STAGING`

#### Application Security
- [ ] CORS origins configured
- [ ] Rate limiting configured
- [ ] Input validation enabled
- [ ] Audit logging enabled
- [ ] GitHub secrets configured:
  - [ ] `CORS_ORIGIN`
  - [ ] `CORS_ORIGIN_STAGING`

### 9. Domain and DNS Configuration

- [ ] Domain purchased (e.g., bunty.io)
- [ ] DNS records configured:
  - [ ] `bunty.io` → Vercel (frontend production)
  - [ ] `api.bunty.io` → DigitalOcean (backend production)
  - [ ] `staging.bunty.io` → Vercel (frontend staging)
  - [ ] `api-staging.bunty.io` → DigitalOcean (backend staging)
- [ ] SSL certificates obtained and configured
- [ ] Certificate auto-renewal configured

### 10. NPM Publishing (Optional)

- [ ] NPM account created
- [ ] Access token generated
- [ ] GitHub secret configured:
  - [ ] `NPM_TOKEN`
- [ ] Package name available: `@bunty/verifier-client`

## Deployment Testing

### 1. Test CI Workflow

- [ ] Create test branch
- [ ] Make small change
- [ ] Push to GitHub
- [ ] Verify CI workflow runs successfully
- [ ] Check all lint and type-check jobs pass

### 2. Test Staging Deployment

- [ ] Create feature branch
- [ ] Make changes to frontend
- [ ] Create pull request
- [ ] Verify frontend staging deployment
- [ ] Test staging URL
- [ ] Make changes to backend
- [ ] Verify backend staging deployment
- [ ] Test staging API

### 3. Test Production Deployment

- [ ] Merge to main branch
- [ ] Verify frontend production deployment
- [ ] Verify backend production deployment
- [ ] Test production URL
- [ ] Test production API
- [ ] Verify health checks pass

### 4. Test Rollback Procedures

- [ ] Test frontend rollback in Vercel
- [ ] Test backend rollback on server
- [ ] Verify application works after rollback
- [ ] Document rollback time

## Post-Deployment Configuration

### 1. Monitoring Setup

- [ ] Health check monitoring configured
- [ ] Uptime monitoring service configured (UptimeRobot, Pingdom)
- [ ] Error tracking configured (Sentry, optional)
- [ ] Log aggregation configured (optional)
- [ ] Alerts configured for:
  - [ ] Application downtime
  - [ ] High error rates
  - [ ] Database connection issues
  - [ ] Disk space warnings

### 2. Backup Verification

- [ ] Database backup script tested
- [ ] Backup restoration tested
- [ ] Backup schedule verified (daily at 2 AM)
- [ ] Backup retention policy configured (7 days)
- [ ] Backup storage location secured

### 3. Documentation

- [ ] Deployment guide reviewed
- [ ] Runbook reviewed and updated
- [ ] Team trained on deployment procedures
- [ ] Emergency contacts documented
- [ ] Incident response procedures reviewed

### 4. Performance Optimization

- [ ] Database indexes verified
- [ ] Redis caching tested
- [ ] CDN configuration verified (Vercel)
- [ ] API response times measured
- [ ] Frontend performance tested (Lighthouse)

## Security Audit

- [ ] All secrets stored securely (GitHub Secrets, not in code)
- [ ] No secrets in git history
- [ ] `.env` files in `.gitignore`
- [ ] SSH keys secured and backed up
- [ ] Database credentials strong and unique
- [ ] API keys rotated from defaults
- [ ] HTTPS enforced on all endpoints
- [ ] Security headers configured
- [ ] Rate limiting tested
- [ ] Input validation tested
- [ ] CORS configuration verified
- [ ] Firewall rules verified
- [ ] Server hardening completed

## Compliance Checklist

- [ ] Requirement 13.1: GitHub Actions workflows implemented ✅
- [ ] Requirement 13.2: Frontend deployment to Vercel configured ✅
- [ ] Requirement 13.3: Backend deployment to DigitalOcean configured ✅
- [ ] Requirement 13.4: Environment variables configured ✅
- [ ] Requirement 13.5: Automated deployment on main branch ✅

## Go-Live Checklist

### Final Verification (24 hours before)

- [ ] All staging tests passed
- [ ] Performance tests completed
- [ ] Security audit completed
- [ ] Backup and restore tested
- [ ] Rollback procedure tested
- [ ] Team briefed on deployment
- [ ] Support team on standby
- [ ] Monitoring dashboards ready

### Deployment Day

- [ ] Announce maintenance window (if needed)
- [ ] Deploy to production
- [ ] Verify health checks
- [ ] Test critical user flows
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Verify external integrations
- [ ] Test payment flows
- [ ] Test proof generation
- [ ] Announce successful deployment

### Post-Deployment (24 hours after)

- [ ] Monitor application logs
- [ ] Review error rates
- [ ] Check performance metrics
- [ ] Verify backup completed
- [ ] Review user feedback
- [ ] Document any issues
- [ ] Create post-deployment report

## Maintenance Schedule

### Daily
- [ ] Check health endpoints
- [ ] Review error logs
- [ ] Monitor disk space

### Weekly
- [ ] Review performance metrics
- [ ] Check backup integrity
- [ ] Update dependencies (security patches)
- [ ] Review deployment logs

### Monthly
- [ ] Database optimization
- [ ] Log cleanup
- [ ] Security audit
- [ ] Certificate renewal check
- [ ] Review and update documentation

### Quarterly
- [ ] Rotate secrets
- [ ] Disaster recovery drill
- [ ] Capacity planning review
- [ ] Team training
- [ ] Update runbook

## Emergency Contacts

- [ ] DevOps Lead: [Name, Phone, Email]
- [ ] Backend Lead: [Name, Phone, Email]
- [ ] Frontend Lead: [Name, Phone, Email]
- [ ] CTO: [Name, Phone, Email]
- [ ] On-Call Engineer: [Phone, Pager]

## Additional Resources

- [ ] [Deployment Guide](DEPLOYMENT.md) reviewed
- [ ] [Operations Runbook](RUNBOOK.md) reviewed
- [ ] [GitHub Secrets Guide](.github/SECRETS.md) reviewed
- [ ] [Quick Start Guide](DEPLOYMENT_QUICKSTART.md) reviewed
- [ ] [Architecture Documentation](ARCHITECTURE.md) reviewed

## Sign-Off

- [ ] DevOps Lead approval
- [ ] Backend Lead approval
- [ ] Frontend Lead approval
- [ ] Security review completed
- [ ] CTO approval

---

**Checklist Version:** 1.0
**Last Updated:** 2024-01-15
**Status:** Ready for deployment setup
