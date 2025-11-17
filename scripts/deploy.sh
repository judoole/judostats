#!/bin/bash
# Deployment script for Vercel
# This script ensures the database file is included in the deployment
# Note: Vercel CLI includes gitignored files when deploying from local directory

set -e

echo "🚀 Preparing deployment to Vercel..."

# Check if database file exists
if [ ! -f "data/judostats.db" ]; then
  echo "❌ Error: Database file not found at data/judostats.db"
  echo "Please run the crawler first to generate the database"
  echo "Or ensure the database file exists in the data/ directory"
  exit 1
fi

# Check database file size
DB_SIZE=$(du -h data/judostats.db | cut -f1)
echo "📊 Database file found: data/judostats.db (${DB_SIZE})"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "❌ Error: Vercel CLI not found"
  echo "Install it with: npm i -g vercel"
  exit 1
fi

echo "✅ Database file found"
echo "📦 Deploying to Vercel (database file will be included)..."
echo ""
echo "ℹ️  Note: Vercel CLI includes gitignored files when deploying from local directory"
echo "   The database file will be deployed even though it's gitignored"

# Deploy using Vercel CLI
# The --prod flag deploys to production
# Files in the current directory (including gitignored data/judostats.db) will be included
# For first deployment, this will be interactive to set up the project
# For subsequent deployments, you can add --yes to skip confirmation
vercel --prod

echo "✅ Deployment complete!"

