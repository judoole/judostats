# Judo Top Waza

This is a project to collect and display data of popular techniques from judobase.ijf.org.

## About judobase.ijf.org

* Example getting all competitions (json result): "https://data.ijf.org/api/get_json?params%5Baction%5D=competition.get_list"
* Example of competition that contains matches with techniques "Guadalajara Grand Prix 2025"
  * Categories: https://data.ijf.org/api/get_json?params%5Baction%5D=competition.categories_full&params%5Bid_competition%5D=3081 
  * Matches in -66: https://data.ijf.org/api/get_json?params%5Baction%5D=contest.find&params%5Bid_competition%5D=3081&params%5Bid_weight%5D=2&params%5Border_by%5D=cnum
  * One match in -66: https://data.ijf.org/api/get_json?params%5Baction%5D=contest.find&params%5Bcontest_code%5D=gp_mex2025_0001_m_0066_0021&params%5Bpart%5D=info%2Cscore_list%2Cmedia%2Cevents

## Getting Started

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Run Crawler

The crawler is accessible via the API. To collect data, send a POST request to `/api/crawl` with an optional limit:

```bash
# Crawl 2025 competitions (fixed to parse categories correctly!)
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"minYear": 2025, "limit": 5}'

# Or crawl 2024-2025 competitions
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"minYear": 2024, "limit": 50}'

# Crawl recent competitions (2020+)
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"minYear": 2020, "limit": 100}'

# Crawl new competitions only (skip already crawled ones)
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"minYear": 2024, "limit": 50, "skipExisting": true}'
```

**Note:** Recent competitions (2020+) are much more likely to have video/technique data. Use `minYear` to filter to modern competitions first. Start with `{"minYear": 2025, "limit": 10}` for testing.

Or use a tool like Postman or Insomnia.

## Features

✅ JSON-based storage (no database setup needed)  
✅ IJF API integration to fetch competition data  
✅ Automatic discovery of competitions with technique data  
✅ FastAPI backend with REST endpoints  
✅ React frontend with Tailwind CSS  
✅ Dashboard with statistics  
✅ Competition browser  
✅ Technique search and filtering  
✅ Vercel deployment ready  

## Project Structure

```
.
├── app/
│   ├── api/              # Next.js API routes
│   │   ├── competitions/ # Competition endpoints
│   │   ├── techniques/   # Technique endpoints
│   │   ├── stats/       # Statistics endpoint
│   │   └── crawl/       # Crawler endpoint
│   ├── competitions/    # Competition page
│   ├── techniques/      # Techniques page
│   └── page.tsx         # Dashboard
├── lib/
│   ├── ijf-client.ts    # IJF API client
│   └── storage.ts        # JSON storage
└── data/                # JSON data files (auto-generated)
```

## API Endpoints

- `GET /api/competitions` - List all competitions
- `GET /api/competitions/[id]` - Get competition details
- `GET /api/techniques` - List techniques with optional filters
- `GET /api/stats` - Get aggregated statistics
- `POST /api/crawl` - Run crawler (body: `{ "limit": 5 }`)

## Data Storage

All data is stored as JSON files in the `data/` directory:
- `competitions.json` - Competition metadata with categories and matches
- `techniques.json` - All techniques with competition info

This approach is simple, requires no database setup, and is easy to backup/restore.

## Deployment

This can be deployed to Vercel with zero configuration - just push to GitHub and connect your repo.