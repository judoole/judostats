# Deployment Guide

This guide explains how to deploy the Judo Stats application to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI**: Install globally with `npm i -g vercel`
3. **Data Files**: Ensure data files are generated locally before deployment

## Pre-Deployment Checklist

- [ ] Data files are generated (`data/competitions.json`, `data/techniques.json`)
- [ ] Security fixes are applied
- [ ] Build passes locally (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] Linter passes (`npm run lint`)

## Deployment Steps

### Option 1: Using the Deployment Script (Recommended)

```bash
# 1. Generate data files locally
make crawl

# 2. Deploy to Vercel (includes data files)
make deploy
```

The deployment script will:
- Check for data files
- Verify Vercel CLI is installed
- Deploy to production with data files included

### Option 2: Manual Deployment with Vercel CLI

```bash
# 1. Generate data files locally
make crawl

# 2. Login to Vercel (first time only)
vercel login

# 3. Link project (first time only)
vercel link

# 4. Deploy to production
vercel --prod
```

### Option 3: GitHub Integration

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy using `make deploy` (includes data files)

**Note:** Data files are gitignored but included during CLI deployment.

## Environment Variables

Configure these in the Vercel dashboard under **Settings → Environment Variables**:

### Optional Variables

- `ALLOWED_ORIGIN`: CORS allowed origin (defaults to `*` if not set)
  - Recommended: Set to your production domain (e.g., `https://yourdomain.vercel.app`)

### Public Variables

- `NEXT_PUBLIC_GITHUB_URL`: GitHub repository URL (defaults to `https://github.com/judoole/judostats`)

## Post-Deployment

1. **Verify Deployment**:
   - Check the deployment URL
   - Test all pages and API endpoints
   - Verify data files are accessible

2. **Monitor**:
   - Check Vercel dashboard for function execution times
   - Monitor error rates
   - Check API usage patterns

3. **Update Data**:
   - When data needs updating:
     - Run `make crawl` locally
     - Run `make deploy` to redeploy with new data

## Troubleshooting

### Build Fails

- Check Node.js version (should be 18.x or 20.x)
- Verify all dependencies are in `package.json`
- Check build logs in Vercel dashboard

### Data Files Missing

- Ensure data files exist locally before deployment
- Verify `.vercelignore` doesn't exclude `data/` directory
- Check deployment logs for file inclusion

### API Endpoints Not Working

- Verify environment variables are set correctly
- Check function execution logs in Vercel dashboard
- Ensure security headers are configured

### Function Timeout

- Vercel Hobby plan has 10-second function timeout
- Crawl endpoints are disabled on Vercel (as intended)
- If other endpoints timeout, optimize queries or upgrade plan

## Vercel Configuration

The project includes a `vercel.json` file with basic configuration:

- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Install Command**: `npm install`
- **Regions**: `iad1` (US East)

You can modify these settings in `vercel.json` if needed.

## Security Notes

- Crawl endpoints are automatically disabled on Vercel
- Test endpoints are disabled in production
- Security headers are configured in `next.config.ts`
- Input validation is enabled on all API routes

## Updating Data

To update data files:

1. Run crawler locally: `make crawl`
2. Verify data files are updated: `ls -lh data/`
3. Redeploy: `make deploy`

Data files are included in each deployment via Vercel CLI.

