# Crawler Issues & Recommendations

## The Problem

When you crawled 100 competitions and got no techniques, it's because:

1. **The competitions at the beginning of the list are very old** (from 1950s-1990s)
2. **Old competitions don't have video/technique data** - This data is only available for recent competitions with video coverage
3. **The IJF API fields are different than expected** - The code was looking for `nm` but the API uses `name`

## What "limit 100" Means

- Processes the first 100 competitions from the list
- These are the OLDEST competitions (historical)
- They typically don't have technique/video data
- **You need to work backwards from recent competitions**

## Recommended Approach

Instead of processing from the start, we should:

1. **Process competitions in REVERSE order** (newest first)
2. **Use a skip parameter** to start from recent competitions
3. **Focus on competitions after 2015** when video data became common

## Suggested Fix

Modify the crawler to:
1. Reverse the competition list
2. Add a "skip" parameter to start from a specific point
3. Process competitions from 2015 onwards first

Example:
```bash
# Get competitions from 2015 onwards (skip the old ones)
curl -X POST http://localhost:3000/api/crawl \
  -H "Content-Type: application/json" \
  -d '{"limit": 50, "minYear": 2015}'
```

This would find 50 competitions with technique data much faster than crawling the old ones.

## Why You Got No Results

The competitions from 1956-2000 you were crawling simply don't have the detailed event/technique data in the API responses. This data only exists for competitions with video coverage, which started being added around 2010-2015.

## Quick Test

Try this to see if recent competitions have data:
```bash
curl http://localhost:3000/api/test-ijf | jq '.sample[0]'
```

Look for competitions from 2015 onwards - those are the ones with technique data!

