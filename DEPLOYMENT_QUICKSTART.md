# Deployment Quick Start Guide

Quick reference for deploying the Bunty ZKP Platform. For detailed instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Prerequisites Checklist

- [ ] GitHub repository with Actions enabled
- [ ] Vercel account and project created
- [ ] DigitalOcean droplet provisioned
- [ ] PostgreSQL database (Supabase or self-hosted)
- [ ] Redis instance (Redis Cloud or self-hosted)
- [ ] All GitHub secrets configured (see `.github/SECRETS.md`)
- [ ] Domain names configured (optional)
- [ ] SSL certificates (Let's Encrypt)

## Quick Deploy Commands

### Deploy Frontend to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link project (first time only)
cd frontend
vercel link

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Deploy Backend to DigitalOcean

```bash
# Build backend
cd backend
npm ci
npm run build

# Create deployment package
tar -czf backend-deploy.tar.gz dist package.json package-lock.json

# Copy to server
scp backend-deploy.tar.gz deploy@<server-ip>:/tmp/

# SSH and deploy
ssh deploy@<server-ip>
cd /var/www/bunty-backend
tar -xzf /tmp/backend-deploy.tar.gz
npm ci --production
pm2 restart bunty-backend
```

## Automated Deployment (GitHub Actions)

### Production Deployment

```bash
# Merge to main branch
git checkout main
git merge develop
git push origin main

# GitHub Actions will automatically:
# 1. Run CI checks (lint, type-check)
# 2. Deploy frontend to Vercel
# 3. Deploy backend to DigitalOcean
```

### Staging Deployment

```bash
# Create pull request
git checkout -b feature/my-feature
git push origin feature/my-feature

# Create PR on GitHub
# GitHub Actions will automatically deploy to staging
```

## Environment Variables

### Set in Vercel Dashboard

```
NEXT_PUBLIC_API_URL=https://api.bunty.io
NEXT_PUBLIC_PLAID_ENV=production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_MIDNIGHT_NETWORK=mainnet
```

### Set on DigitalOcean Server

```bash
# SSH into server
ssh deploy@<server-ip>

# Edit .env file
cd /var/www/bunty-backend
nano .env

# Add variables (see .env.template)
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
# ... etc

# Restart application
pm2 restart bunty-backend
```

## Health Checks

### Frontend
```bash
curl https://bunty.io
# Should return 200 OK
```

### Backend
```bash
curl https://api.bunty.io/health
# Should return: {"status":"healthy",...}
```

### Database
```bash
psql "$DATABASE_URL" -c "SELECT 1;"
# Should return: 1
```

### Redis
```bash
redis-cli -u "$REDIS_URL" ping
# Should return: PONG
```

## Common Issues

### Build Fails
```bash
# Check logs
cd backend
npm run build
npm run lint
npm run type-check
```

### Deployment Fails
```bash
# Check GitHub Actions logs
# Verify all secrets are configured
# Test SSH access: ssh deploy@<server-ip>
```

### Application Won't Start
```bash
# Check PM2 logs
pm2 logs bunty-backend --err

# Check environment variables
cat /var/www/bunty-backend/.env

# Restart application
pm2 restart bunty-backend
```

### Database Connection Error
```bash
# Test connection
psql "$DATABASE_URL"

# Check firewall
sudo ufw status

# Verify credentials
echo $DATABASE_URL
```

## Rollback

### Frontend (Vercel)
```bash
# Via dashboard: Deployments → Previous → Promote
# Or via CLI:
vercel rollback
```

### Backend (DigitalOcean)
```bash
ssh deploy@<server-ip>
cd /var/www
mv bunty-backend bunty-backend-broken
mv bunty-backend-previous bunty-backend
pm2 restart bunty-backend
```

## Monitoring

### View Logs
```bash
# Frontend logs (Vercel dashboard)
# Backend logs
pm2 logs bunty-backend

# System logs
journalctl -u nginx -f
```

### Check Status
```bash
# Application status
pm2 status

# System resources
htop
df -h
```

## Emergency Contacts

- DevOps Lead: [contact]
- Backend Lead: [contact]
- Frontend Lead: [contact]

## Next Steps

1. ✅ Complete prerequisites
2. ✅ Configure GitHub secrets
3. ✅ Deploy to staging
4. ✅ Test staging deployment
5. ✅ Deploy to production
6. ✅ Verify production deployment
7. ✅ Set up monitoring
8. ✅ Configure backups

## Additional Resources

- [Full Deployment Guide](DEPLOYMENT.md)
- [Operations Runbook](RUNBOOK.md)
- [GitHub Secrets Guide](.github/SECRETS.md)
- [Architecture Documentation](ARCHITECTURE.md)

---

**Last Updated:** 2024-01-15
