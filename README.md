# Judo Stats

A web application that collects, analyzes, and visualizes judo technique statistics from international competitions. This project aggregates data from IJF-sanctioned events to provide insights into popular techniques, their usage patterns, and performance metrics across different competitions, weight classes, and categories.

## What is This?

Judo Stats is a personal project that explores judo competition data to answer questions like:

- Which techniques are most commonly used in international competitions?
- How do technique preferences vary by weight class, gender, or competition type?
- Which judoka excel at specific techniques?
- What are the success rates of different scoring techniques (Ippon, Waza-ari, Yuko)?

The application features:

- **Dashboard**: Overview statistics with filters for competitions, gender, weight class, and year
- **Techniques Browser**: Search and filter techniques with detailed statistics
- **Judoka Profiles**: Individual athlete statistics showing their favorite techniques and match history
- **Technique Details**: Deep dive into specific techniques showing top performers and video links

## Data Source & Legal Notice

This application uses data from the **International Judo Federation (IJF)** through their public API at [data.ijf.org](https://data.ijf.org).

### Important Legal Information

⚠️ **Data Ownership**: All competition data, match results, technique information, and related content displayed in this application are the property of the **International Judo Federation (IJF)**. This project is an independent, non-commercial application that aggregates publicly available data for educational and analytical purposes.

**Rights Reserved**:

- All data and content remain the intellectual property of the IJF
- This application does not claim ownership of any IJF data
- Video links and match content are hosted and owned by the IJF
- This project is not affiliated with, endorsed by, or sponsored by the IJF

**Usage**: This repository is provided for educational purposes. Users are responsible for ensuring their use of the data complies with IJF's terms of service and applicable data protection regulations.

## Technical Details

### Data Collection

The application uses the IJF public API to collect competition data:

- Example getting all competitions: `https://data.ijf.org/api/get_json?params%5Baction%5D=competition.get_list`
- Example competition with matches: "Guadalajara Grand Prix 2025"
  - Categories: `https://data.ijf.org/api/get_json?params%5Baction%5D=competition.categories_full&params%5Bid_competition%5D=3081`
  - Matches: `https://data.ijf.org/api/get_json?params%5Baction%5D=contest.find&params%5Bid_competition%5D=3081&params%5Bid_weight%5D=2`
  - Match details: `https://data.ijf.org/api/get_json?params%5Baction%5D=contest.find&params%5Bcontest_code%5D=gp_mex2025_0001_m_0066_0021&params%5Bpart%5D=info%2Cscore_list%2Cmedia%2Cevents`

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Run Data Crawler

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

✅ **JSON-based storage** - No database setup needed, all data stored in JSON files  
✅ **IJF API integration** - Automated data collection from IJF's public API  
✅ **Smart data discovery** - Automatically finds competitions with technique data  
✅ **Next.js application** - Modern React framework with API routes  
✅ **Minimalist UI** - Clean, responsive design with Tailwind CSS  
✅ **Comprehensive statistics** - Dashboard with aggregated stats and filters  
✅ **Technique analysis** - Browse techniques with detailed breakdowns  
✅ **Judoka profiles** - Individual athlete statistics and technique preferences  
✅ **Video integration** - Direct links to match videos on judobase.ijf.org  
✅ **Deployment ready** - Can be deployed to Vercel with zero configuration  

## Project Structure

```text
.
├── app/
│   ├── api/                    # Next.js API routes
│   │   ├── competitions/        # Competition endpoints
│   │   ├── techniques/         # Technique endpoints
│   │   │   └── [name]/         # Individual technique detail pages
│   │   ├── stats/              # Statistics endpoint
│   │   ├── judoka/             # Judoka search and stats
│   │   └── crawl/              # Data crawler endpoint
│   ├── dashboard/              # Dashboard page
│   ├── techniques/             # Techniques listing page
│   │   └── [name]/             # Individual technique detail page
│   ├── judoka/                 # Judoka search and profile page
│   ├── layout.tsx              # Root layout with navigation
│   └── page.tsx                # Landing page
├── lib/
│   ├── ijf-client.ts           # IJF API client for data fetching
│   └── storage.ts              # JSON-based storage layer
└── data/                       # JSON data files (auto-generated by crawler)
    ├── competitions.json       # Competition metadata
    └── techniques.json         # Technique data
```

## API Endpoints

### Public Endpoints

- `GET /api/competitions` - List all competitions
- `GET /api/competitions/[id]` - Get competition details
- `GET /api/techniques` - List techniques with optional filters (gender, weight class, year, etc.)
- `GET /api/techniques/[name]` - Get detailed information about a specific technique
- `GET /api/stats` - Get aggregated statistics with filters
- `GET /api/judoka` - Search judoka or get individual judoka statistics

### Data Collection Endpoint

- `POST /api/crawl` - Run data crawler (body: `{ "minYear": 2024, "limit": 50, "skipExisting": true }`)

## Data Storage

All data is stored as JSON files in the `data/` directory:

- `competitions.json` - Competition metadata with categories and matches
- `techniques.json` - All techniques with competition info, scores, and match details

This approach is simple, requires no database setup, and makes it easy to backup, restore, or version control the data. The JSON files are automatically generated by the crawler and can be manually edited if needed.

## Development

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Deployment

### Deploying to Vercel

The application can be deployed to Vercel. Since data files are large and gitignored, they need to be included during deployment.

#### Quick Start

```bash
# 1. Generate data files locally
make crawl

# 2. Deploy to Vercel (includes data files)
make deploy
```

#### Detailed Instructions

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment instructions, including:
- Pre-deployment checklist
- Multiple deployment options
- Environment variable configuration
- Troubleshooting guide
- Post-deployment verification

#### Environment Variables

Configure these in the Vercel dashboard:

- `ALLOWED_ORIGIN` (optional): CORS allowed origin (defaults to `*`)
- `NEXT_PUBLIC_GITHUB_URL` (optional): GitHub repository URL

#### Important Notes

- Data files are gitignored but included during CLI deployment
- Crawl endpoints are automatically disabled on Vercel
- Security headers are configured automatically
- See `DEPLOYMENT.md` for full details

The application is also compatible with other Next.js hosting platforms.

## License

This project is provided as-is for educational and personal use. Please refer to the legal notice above regarding IJF data ownership and usage rights.

## Contributing

This is a personal project, but suggestions and feedback are welcome. Please note that any contributions should respect IJF's data ownership and terms of service.
