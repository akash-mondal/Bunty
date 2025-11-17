# Operations Runbook

This runbook provides step-by-step procedures for common operational tasks and incident response for the Bunty ZKP Platform.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Incident Response](#incident-response)
- [Common Operations](#common-operations)
- [Monitoring and Alerts](#monitoring-and-alerts)
- [Emergency Procedures](#emergency-procedures)

## Quick Reference

### Service URLs

**Production:**
- Frontend: https://bunty.io
- Backend API: https://api.bunty.io
- Health Check: https://api.bunty.io/health

**Staging:**
- Frontend: https://staging.bunty.io
- Backend API: https://api-staging.bunty.io

### SSH Access

```bash
# Production
ssh deploy@<production-ip>

# Staging
ssh deploy@<staging-ip>
```

### Key Commands

```bash
# View application logs
pm2 logs bunty-backend

# Restart application
pm2 restart bunty-backend

# Check application status
pm2 status

# View database connections
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity;"

# Check Redis status
redis-cli -a "$REDIS_PASSWORD" ping
```

## Incident Response

### Severity Levels

- **P0 (Critical)**: Complete service outage, data loss risk
- **P1 (High)**: Major functionality broken, significant user impact
- **P2 (Medium)**: Partial functionality impaired, workaround available
- **P3 (Low)**: Minor issues, minimal user impact

### Incident Response Process

1. **Acknowledge**: Confirm incident and severity
2. **Assess**: Determine scope and impact
3. **Communicate**: Notify stakeholders
4. **Mitigate**: Implement immediate fixes or workarounds
5. **Resolve**: Deploy permanent fix
6. **Document**: Create post-mortem

### P0: Complete Service Outage

#### Symptoms
- Health check endpoint returns 5xx errors
- Users cannot access the application
- Multiple monitoring alerts firing

#### Immediate Actions

1. **Check service status**
```bash
ssh deploy@<production-ip>
pm2 status
pm2 logs bunty-backend --err --lines 50
```

2. **Check system resources**
```bash
# CPU and memory
top
htop

# Disk space
df -h

# Network connectivity
ping 8.8.8.8
curl https://api.bunty.io/health
```

3. **Check dependencies**
```bash
# Database
psql "$DATABASE_URL" -c "SELECT 1;"

# Redis
redis-cli -a "$REDIS_PASSWORD" ping

# External APIs
curl https://api.plaid.com/health
```

4. **Restart application if needed**
```bash
pm2 restart bunty-backend
pm2 logs bunty-backend --lines 100
```

5. **Rollback if recent deployment**
```bash
# See DEPLOYMENT.md for rollback procedures
cd /var/www
mv bunty-backend bunty-backend-broken
mv bunty-backend-previous bunty-backend
pm2 restart bunty-backend
```

### P1: Database Connection Issues

#### Symptoms
- Application logs show database connection errors
- Queries timing out
- Connection pool exhausted

#### Actions

1. **Check database status**
```bash
# Connect to database
psql "$DATABASE_URL"

# Check active connections
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

# Check long-running queries
SELECT pid, now() - query_start as duration, query 
FROM pg_stat_activity 
WHERE state = 'active' 
ORDER BY duration DESC;
```

2. **Kill long-running queries if needed**
```bash
# Identify problematic query
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE pid = <problem-pid>;
```

3. **Check connection pool settings**
```bash
# Review backend configuration
cat /var/www/bunty-backend/.env | grep DATABASE
```

4. **Restart application**
```bash
pm2 restart bunty-backend
```

### P1: High Memory Usage

#### Symptoms
- Server becoming unresponsive
- OOM (Out of Memory) errors
- Slow response times

#### Actions

1. **Identify memory hog**
```bash
# Check process memory
ps aux --sort=-%mem | head -10

# Check PM2 memory
pm2 list
```

2. **Check for memory leaks**
```bash
# Review application logs for patterns
pm2 logs bunty-backend | grep -i "memory\|heap"
```

3. **Restart application**
```bash
pm2 restart bunty-backend
```

4. **Monitor memory after restart**
```bash
watch -n 5 'pm2 list'
```

5. **Scale up if needed**
```bash
# Increase server resources via DigitalOcean dashboard
# Or add more instances with load balancer
```

### P1: External API Failures

#### Symptoms
- Plaid/Stripe/Sila API calls failing
- Timeout errors in logs
- Users unable to link accounts

#### Actions

1. **Check API status pages**
- Plaid: https://status.plaid.com
- Stripe: https://status.stripe.com
- Sila: https://status.silamoney.com

2. **Verify API credentials**
```bash
# Check environment variables
cat /var/www/bunty-backend/.env | grep -E "PLAID|STRIPE|SILA"
```

3. **Test API connectivity**
```bash
# Test Plaid
curl -X POST https://sandbox.plaid.com/link/token/create \
  -H "Content-Type: application/json" \
  -d '{"client_id":"'$PLAID_CLIENT_ID'","secret":"'$PLAID_SECRET'"}'

# Test Stripe
curl https://api.stripe.com/v1/customers \
  -u "$STRIPE_SECRET_KEY:"
```

4. **Enable fallback mode if available**
```bash
# Set maintenance mode or disable affected features
# Update environment variable
echo "PLAID_ENABLED=false" >> /var/www/bunty-backend/.env
pm2 restart bunty-backend
```

### P2: Slow Response Times

#### Symptoms
- API response times > 2 seconds
- Users reporting slow page loads
- Timeout errors

#### Actions

1. **Check server load**
```bash
uptime
top
iostat -x 1 5
```

2. **Check database performance**
```bash
# Slow queries
psql "$DATABASE_URL" -c "
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;"
```

3. **Check Redis performance**
```bash
redis-cli -a "$REDIS_PASSWORD" info stats
redis-cli -a "$REDIS_PASSWORD" slowlog get 10
```

4. **Review application logs**
```bash
pm2 logs bunty-backend | grep -E "slow|timeout|error"
```

5. **Clear cache if needed**
```bash
redis-cli -a "$REDIS_PASSWORD" FLUSHDB
```

## Common Operations

### Deploying a Hotfix

1. **Create hotfix branch**
```bash
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-fix
```

2. **Make changes and test locally**
```bash
cd backend
npm run build
npm run lint
npm run type-check
```

3. **Commit and push**
```bash
git add .
git commit -m "fix: critical bug description"
git push origin hotfix/critical-bug-fix
```

4. **Merge to main (triggers deployment)**
```bash
git checkout main
git merge hotfix/critical-bug-fix
git push origin main
```

5. **Monitor deployment**
```bash
# Watch GitHub Actions
# Check health endpoint after deployment
curl https://api.bunty.io/health
```

### Rotating API Keys

#### Plaid API Key Rotation

1. **Generate new key in Plaid dashboard**
2. **Update GitHub secrets**
3. **Deploy with new key**
```bash
# Update secret in GitHub
# Trigger deployment or update manually
ssh deploy@<production-ip>
nano /var/www/bunty-backend/.env
# Update PLAID_SECRET
pm2 restart bunty-backend
```

#### Stripe API Key Rotation

1. **Generate new key in Stripe dashboard**
2. **Update GitHub secrets**
3. **Deploy with new key**
4. **Update webhook secret**

#### JWT Secret Rotation

```bash
# Generate new secret
openssl rand -base64 64

# Update in GitHub secrets
# Deploy to production
# Old tokens will be invalidated
```

### Database Maintenance

#### Running Migrations

```bash
# Backup database first
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d).sql

# Run migration
psql "$DATABASE_URL" -f migration.sql

# Verify migration
psql "$DATABASE_URL" -c "\dt"
```

#### Optimizing Database

```bash
# Analyze tables
psql "$DATABASE_URL" -c "ANALYZE;"

# Vacuum database
psql "$DATABASE_URL" -c "VACUUM ANALYZE;"

# Reindex if needed
psql "$DATABASE_URL" -c "REINDEX DATABASE bunty_prod;"
```

#### Creating Database Backup

```bash
# Manual backup
pg_dump "$DATABASE_URL" | gzip > bunty-backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Restore from backup
gunzip < bunty-backup-20240115-120000.sql.gz | psql "$DATABASE_URL"
```

### Scaling Operations

#### Vertical Scaling (Increase Resources)

1. **Resize DigitalOcean droplet**
   - Go to DigitalOcean dashboard
   - Select droplet → Resize
   - Choose new size
   - Restart droplet

2. **Verify after resize**
```bash
ssh deploy@<production-ip>
free -h
df -h
pm2 restart bunty-backend
```

#### Horizontal Scaling (Add Instances)

1. **Create new droplet from snapshot**
2. **Configure load balancer**
3. **Update DNS records**
4. **Test load distribution**

### Log Management

#### Viewing Logs

```bash
# Real-time logs
pm2 logs bunty-backend

# Last 100 lines
pm2 logs bunty-backend --lines 100

# Error logs only
pm2 logs bunty-backend --err

# Export logs
pm2 logs bunty-backend --out /tmp/app.log
```

#### Log Rotation

```bash
# Configure PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

#### Searching Logs

```bash
# Search for errors
pm2 logs bunty-backend | grep -i error

# Search for specific user
pm2 logs bunty-backend | grep "user_id:abc123"

# Count occurrences
pm2 logs bunty-backend | grep -c "proof generation failed"
```

### Certificate Management

#### Renewing SSL Certificate

```bash
# Check certificate expiry
certbot certificates

# Renew certificate
certbot renew

# Force renewal (if needed)
certbot renew --force-renewal

# Restart Nginx
systemctl restart nginx
```

#### Testing SSL Configuration

```bash
# Test SSL
curl -vI https://api.bunty.io

# Check certificate details
openssl s_client -connect api.bunty.io:443 -servername api.bunty.io
```

## Monitoring and Alerts

### Health Checks

#### Application Health

```bash
# Check health endpoint
curl https://api.bunty.io/health

# Expected response
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

#### Database Health

```bash
# Check connections
psql "$DATABASE_URL" -c "
SELECT count(*) as total_connections,
       count(*) FILTER (WHERE state = 'active') as active,
       count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity;"

# Check database size
psql "$DATABASE_URL" -c "
SELECT pg_size_pretty(pg_database_size('bunty_prod'));"
```

#### Redis Health

```bash
# Check Redis
redis-cli -a "$REDIS_PASSWORD" ping

# Check memory usage
redis-cli -a "$REDIS_PASSWORD" info memory

# Check connected clients
redis-cli -a "$REDIS_PASSWORD" info clients
```

### Performance Metrics

#### Application Metrics

```bash
# Request rate
pm2 logs bunty-backend | grep "GET\|POST" | wc -l

# Error rate
pm2 logs bunty-backend | grep -i error | wc -l

# Average response time (if logged)
pm2 logs bunty-backend | grep "response_time" | awk '{sum+=$NF; count++} END {print sum/count}'
```

#### System Metrics

```bash
# CPU usage
top -bn1 | grep "Cpu(s)"

# Memory usage
free -h

# Disk usage
df -h

# Network traffic
ifstat 1 5
```

## Emergency Procedures

### Emergency Shutdown

```bash
# Stop application
pm2 stop bunty-backend

# Stop Nginx
systemctl stop nginx

# Enable maintenance page
# (Configure Nginx maintenance page beforehand)
```

### Emergency Rollback

```bash
# Quick rollback to previous version
cd /var/www
mv bunty-backend bunty-backend-broken
mv bunty-backend-previous bunty-backend
pm2 restart bunty-backend

# Verify
curl https://api.bunty.io/health
```

### Data Recovery

```bash
# Restore from latest backup
gunzip < /var/backups/bunty/bunty-latest.sql.gz | psql "$DATABASE_URL"

# Verify data
psql "$DATABASE_URL" -c "SELECT count(*) FROM users;"
```

### Emergency Contacts

- **On-Call Engineer**: [phone/pager]
- **DevOps Lead**: [phone/email]
- **CTO**: [phone/email]
- **External Support**:
  - DigitalOcean: support ticket
  - Vercel: support@vercel.com
  - Supabase: support@supabase.io

## Post-Incident Procedures

### Post-Mortem Template

1. **Incident Summary**
   - Date and time
   - Duration
   - Severity
   - Impact

2. **Timeline**
   - Detection
   - Response
   - Mitigation
   - Resolution

3. **Root Cause**
   - What happened
   - Why it happened
   - Contributing factors

4. **Resolution**
   - Immediate fix
   - Permanent fix
   - Verification

5. **Action Items**
   - Preventive measures
   - Monitoring improvements
   - Documentation updates
   - Responsible parties

6. **Lessons Learned**
   - What went well
   - What could be improved
   - Process changes

### Incident Documentation

Create incident report in `incidents/YYYY-MM-DD-incident-name.md`

## Maintenance Schedule

### Daily
- Check health endpoints
- Review error logs
- Monitor disk space

### Weekly
- Review performance metrics
- Check backup integrity
- Update dependencies (security patches)

### Monthly
- Database optimization
- Log cleanup
- Security audit
- Certificate renewal check

### Quarterly
- Disaster recovery drill
- Capacity planning review
- Update runbook
- Team training

## Additional Resources

- [Deployment Guide](DEPLOYMENT.md)
- [Architecture Documentation](ARCHITECTURE.md)
- [API Documentation](backend/README.md)
- [GitHub Actions Workflows](.github/workflows/)

## Runbook Updates

This runbook should be updated:
- After each incident
- When new features are deployed
- When infrastructure changes
- Quarterly review cycle

Last Updated: 2024-01-15
