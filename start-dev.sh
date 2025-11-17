#!/bin/bash
# Start dev server with Node.js 24

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Use Node.js 24 (from .nvmrc)
nvm use

# Start the dev server
npm run dev

