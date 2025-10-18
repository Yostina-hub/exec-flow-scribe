# Meeting Management System - Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development](#local-development)
3. [Docker Deployment](#docker-deployment)
4. [Self-Hosting Options](#self-hosting-options)
5. [Database Management](#database-management)
6. [Environment Configuration](#environment-configuration)
7. [Security Considerations](#security-considerations)

## Prerequisites

- Node.js 18+ or Docker
- PostgreSQL 15+ (if self-hosting database)
- Supabase account (or self-hosted Supabase instance)
- Git

## Local Development

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd meeting-management-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Create `.env.local` file:
```env
VITE_SUPABASE_URL=https://xtqsvwhwzxcutwdbxzyn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_PROJECT_ID=xtqsvwhwzxcutwdbxzyn
```

### 4. Run Development Server
```bash
npm run dev
```
Access at `http://localhost:5173`

## Docker Deployment

### Quick Start
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Build
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Service URLs
- Frontend: `http://localhost:3000`
- Database: `localhost:5432`

## Self-Hosting Options

### Option 1: Vercel
1. Connect GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push

```bash
npm install -g vercel
vercel --prod
```

### Option 2: Netlify
1. Build project: `npm run build`
2. Deploy `dist` folder
3. Configure redirects in `netlify.toml`

```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Option 3: Custom Server (Nginx)

#### Install Nginx
```bash
sudo apt update
sudo apt install nginx
```

#### Build Application
```bash
npm run build
```

#### Configure Nginx
Create `/etc/nginx/sites-available/meeting-app`:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/meeting-app/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass https://xtqsvwhwzxcutwdbxzyn.supabase.co;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/meeting-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Option 4: Docker Production Deployment

#### Using Docker Compose
```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### Using Kubernetes
Apply configuration:
```bash
kubectl apply -f k8s/
```

## Database Management

### Export Database Schema
```bash
# Using Supabase CLI
supabase db pull

# Or using pg_dump
pg_dump -h db.xtqsvwhwzxcutwdbxzyn.supabase.co \
        -U postgres \
        -d postgres \
        --schema-only \
        > schema.sql
```

### Export Database Data
```bash
# Full database export
npm run backup:database

# Or using pg_dump directly
pg_dump -h db.xtqsvwhwzxcutwdbxzyn.supabase.co \
        -U postgres \
        -d postgres \
        > full_backup.sql
```

### Import Database
```bash
# Restore from backup
npm run restore:database full_backup.sql

# Or using psql
psql -h localhost -U postgres -d postgres < full_backup.sql
```

### Automated Backups
```bash
# Set up daily backups (cron job)
crontab -e

# Add line for daily 2 AM backup
0 2 * * * /path/to/scripts/backup-database.sh
```

## Environment Configuration

### Required Variables
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

### Optional Edge Function Variables (Server-side only)
These are stored in Supabase Secrets, not in .env:
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `ELEVENLABS_API_KEY`
- `GOOGLE_CLOUD_API_KEY`

## Security Considerations

### 1. API Keys
- Never commit API keys to repository
- Use environment variables or secrets management
- Rotate keys regularly

### 2. Database Security
- Enable Row Level Security (RLS) on all tables
- Use strong passwords
- Restrict database access by IP
- Regular backups

### 3. CORS Configuration
Configure allowed origins in Supabase:
```sql
-- Example: Update CORS settings
ALTER DATABASE postgres SET "app.cors_origins" TO 'https://yourdomain.com';
```

### 4. SSL/TLS
- Use HTTPS in production
- Configure SSL certificates (Let's Encrypt)
```bash
sudo certbot --nginx -d your-domain.com
```

### 5. Rate Limiting
Implement rate limiting in edge functions or reverse proxy.

## Monitoring & Logging

### Application Logs
```bash
# Docker logs
docker-compose logs -f app

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Database Monitoring
- Monitor connection pools
- Track slow queries
- Set up alerts for errors

## Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 2. Database Connection Issues
- Check firewall rules
- Verify connection string
- Test database accessibility

#### 3. CORS Errors
- Verify Supabase project settings
- Check allowed origins
- Review edge function CORS headers

## Performance Optimization

### 1. Frontend
- Enable gzip compression
- Optimize images
- Use CDN for static assets
- Implement code splitting

### 2. Database
- Add indexes for frequently queried columns
- Use connection pooling
- Enable query caching

### 3. Edge Functions
- Optimize cold start times
- Use appropriate runtime limits
- Cache API responses

## Scaling

### Horizontal Scaling
```bash
# Scale Docker services
docker-compose up -d --scale app=3
```

### Load Balancing
Configure load balancer (nginx, HAProxy, or cloud provider):
```nginx
upstream app_servers {
    server app1:3000;
    server app2:3000;
    server app3:3000;
}
```

## Backup Strategy

### Automated Backups
- Daily database backups
- Weekly full system backups
- Store backups in multiple locations
- Test restore procedures regularly

### Backup Retention
- Keep daily backups for 7 days
- Keep weekly backups for 1 month
- Keep monthly backups for 1 year

## Support & Maintenance

### Regular Maintenance Tasks
- Update dependencies monthly
- Review security advisories
- Monitor error logs
- Test backup restores
- Review and optimize database queries

### Health Checks
Implement health check endpoints:
```typescript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});
```

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Docker Documentation](https://docs.docker.com)
- [Nginx Documentation](https://nginx.org/en/docs)
- [Project Repository](your-repo-url)

## Version History

- v1.0.0 - Initial deployment guide
- Date: 2025-10-18
