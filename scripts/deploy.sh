#!/bin/bash
# Deployment script for Vercel
# This script ensures data files are included in the deployment

set -e

echo "🚀 Preparing deployment to Vercel..."

# Check if data files exist
if [ ! -d "data" ]; then
  echo "❌ Error: data/ directory not found"
  echo "Please run the crawler first to generate data files"
  exit 1
fi

if [ ! -f "data/competitions.json" ] || [ ! -f "data/techniques.json" ]; then
  echo "⚠️  Warning: Some data files are missing"
  echo "Found files in data/:"
  ls -lh data/ || echo "  (none)"
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "❌ Error: Vercel CLI not found"
  echo "Install it with: npm i -g vercel"
  exit 1
fi

echo "✅ Data files found"
echo "📦 Deploying to Vercel (data files will be included)..."

# Deploy using Vercel CLI
# The --prod flag deploys to production
# Files in the current directory (including data/) will be included
vercel --prod

echo "✅ Deployment complete!"

