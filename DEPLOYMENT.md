# Last Survive - Deployment Guide

## 🚀 Production Deployment Guide

This guide covers deploying the Last Survive NFL Fantasy application to production.

## Prerequisites

- Node.js 18+ and npm
- Supabase account with a production project
- Domain name for your application
- SSL certificate (handled by hosting provider)

## Environment Setup

### 1. Environment Variables

Copy `.env.production` and fill in your production values:

```bash
cp .env.production .env.production.local
```

Required variables:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `VITE_APP_URL`: Your production domain
- `VITE_ADMIN_EMAILS`: Comma-separated admin emails
- `VITE_SENTRY_DSN`: (Optional) Sentry error tracking

### 2. Database Setup

1. Run all migrations in your Supabase production project
2. Enable Row Level Security (RLS) on all tables
3. Set up database backups (recommended: daily)
4. Configure connection pooling for high traffic

## Build Process

### 1. Install Dependencies

```bash
npm ci --production
```

### 2. Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist` directory.

### 3. Test Production Build Locally

```bash
npm run preview
```

## Deployment Options

### Option 1: Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel --prod
```

3. Set environment variables in Vercel dashboard

### Option 2: Netlify

1. Install Netlify CLI:
```bash
npm i -g netlify-cli
```

2. Deploy:
```bash
netlify deploy --prod --dir=dist
```

3. Set environment variables in Netlify dashboard

### Option 3: Traditional Hosting

1. Build the application
2. Upload `dist` folder to your server
3. Configure nginx/Apache to serve the SPA:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/lastsurvive/dist;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Post-Deployment Checklist

### Security
- [ ] SSL certificate active
- [ ] Environment variables secured
- [ ] Rate limiting configured
- [ ] CORS settings verified
- [ ] CSP headers configured

### Performance
- [ ] CDN configured for static assets
- [ ] Gzip/Brotli compression enabled
- [ ] Image optimization active
- [ ] Browser caching headers set

### Monitoring
- [ ] Error tracking (Sentry) configured
- [ ] Performance monitoring active
- [ ] Uptime monitoring configured
- [ ] Database monitoring enabled

### Functionality
- [ ] User registration/login working
- [ ] League creation functional
- [ ] Draft system operational
- [ ] Weekly processing scheduled
- [ ] Email notifications configured

## Maintenance

### Regular Tasks

1. **Daily**
   - Monitor error logs
   - Check system health endpoint: `/api/health`
   - Review performance metrics

2. **Weekly**
   - Database backup verification
   - Security updates check
   - Performance optimization review

3. **Monthly**
   - Dependency updates
   - Database optimization
   - User feedback review

### Database Maintenance

1. **Indexes**: Monitor and optimize query performance
2. **Vacuuming**: Schedule regular VACUUM operations
3. **Archiving**: Move old season data to archive tables

### Scaling Considerations

When traffic increases:

1. **Database**
   - Enable connection pooling
   - Consider read replicas
   - Optimize slow queries

2. **Frontend**
   - Implement service worker caching
   - Use CDN for all static assets
   - Enable HTTP/2

3. **Backend**
   - Implement Redis caching
   - Use edge functions for global distribution
   - Consider horizontal scaling

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check connection pooling limits
   - Verify network connectivity
   - Review RLS policies

2. **Performance Issues**
   - Check database query performance
   - Review bundle size
   - Analyze network waterfall

3. **Authentication Problems**
   - Verify Supabase auth settings
   - Check redirect URLs
   - Review session management

### Debug Mode

Enable debug mode by setting:
```
localStorage.setItem('debug', 'true')
```

## Rollback Procedure

If issues occur:

1. **Immediate**: Revert to previous deployment
2. **Database**: Restore from backup if needed
3. **Communication**: Notify users of any issues

## Support

For deployment issues:
- Check Supabase status: https://status.supabase.com
- Review application logs
- Contact support with error ID from error boundary