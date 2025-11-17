#!/bin/bash
set -e

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Installing Node.js 24..."
nvm install 24

echo "Switching to Node.js 24..."
nvm use 24

echo "Current Node.js version: $(node -v)"
echo "MODULE_VERSION: $(node -p 'process.versions.modules')"

echo "Rebuilding better-sqlite3..."
npm rebuild better-sqlite3

echo "Testing better-sqlite3..."
node -e "const db = require('better-sqlite3'); const d = new db(':memory:'); console.log('✅ better-sqlite3 works!'); d.close();"

echo ""
echo "✅ Setup complete! Node.js 24 is now active."
echo "To use Node.js 24 in this project, run: nvm use"

