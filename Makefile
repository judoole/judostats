.PHONY: help install dev build start lint test clean kill crawl crawl-single deploy

# Default target
help:
	@echo "Judo Stats - Available commands:"
	@echo ""
	@echo "  make install       - Install dependencies"
	@echo "  make dev           - Start development server"
	@echo "  make build         - Build for production"
	@echo "  make start         - Start production server"
	@echo "  make lint          - Run linter"
	@echo "  make test          - Run tests"
	@echo "  make clean         - Clean build artifacts and node_modules"
	@echo "  make kill          - Kill all running dev/ngrok processes"
	@echo ""
	@echo "Crawler commands:"
	@echo "  make crawl         - Crawl recent competitions (2025, limit 10)"
	@echo "  make crawl-2024    - Crawl 2024 competitions (limit 50)"
	@echo "  make crawl-2020    - Crawl 2020+ competitions (limit 100)"
	@echo "  make crawl-single  - Crawl single competition (requires COMP_ID)"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy        - Deploy to Vercel (includes data files)"
	@echo ""
	@echo "Examples:"
	@echo "  make crawl-single COMP_ID=3081"
	@echo "  make crawl YEAR=2024 LIMIT=20"
	@echo "  make deploy"

# Install dependencies
install:
	npm install

# Development server
dev:
	npm run dev

# Build for production
build:
	npm run build

# Start production server
start:
	npm run start

# Run linter
lint:
	npm run lint

# Run tests
test:
	npm run test

# Clean build artifacts and dependencies
clean:
	rm -rf .next
	rm -rf node_modules
	rm -rf .next/dev/lock
	@echo "Cleaned build artifacts and node_modules"

# Kill all running dev/ngrok processes
kill:
	@echo "Killing Next.js and ngrok processes..."
	-lsof -ti:3000 -ti:3001 | xargs kill -9 2>/dev/null || true
	-pkill -f "next dev" 2>/dev/null || true
	-pkill -f "ngrok" 2>/dev/null || true
	-rm -f .next/dev/lock
	@echo "All processes killed"

# Crawler commands
YEAR ?= 2025
LIMIT ?= 10
COMP_ID ?=

crawl:
	@echo "Crawling competitions from year $(YEAR) with limit $(LIMIT)..."
	@curl -X POST http://localhost:3000/api/crawl \
		-H "Content-Type: application/json" \
		-d '{"minYear": $(YEAR), "limit": $(LIMIT)}' | jq .

crawl-2024:
	@echo "Crawling 2024 competitions (limit 50)..."
	@curl -X POST http://localhost:3000/api/crawl \
		-H "Content-Type: application/json" \
		-d '{"minYear": 2024, "limit": 50}' | jq .

crawl-2020:
	@echo "Crawling 2020+ competitions (limit 100)..."
	@curl -X POST http://localhost:3000/api/crawl \
		-H "Content-Type: application/json" \
		-d '{"minYear": 2020, "limit": 100}' | jq .

crawl-single:
	@if [ -z "$(COMP_ID)" ]; then \
		echo "Error: COMP_ID is required. Usage: make crawl-single COMP_ID=3081"; \
		exit 1; \
	fi
	@echo "Crawling single competition $(COMP_ID)..."
	@curl -X POST http://localhost:3000/api/crawl-single \
		-H "Content-Type: application/json" \
		-d '{"competitionId": $(COMP_ID)}' | jq .

# Check if dev server is running
check-dev:
	@if ! curl -s http://localhost:3000 > /dev/null; then \
		echo "Error: Dev server is not running on port 3000"; \
		echo "Start it with: make dev"; \
		exit 1; \
	fi

# Setup: install and prepare
setup: install
	@echo "Setup complete!"

# Full restart: kill, clean, install, dev
restart: kill clean install dev

