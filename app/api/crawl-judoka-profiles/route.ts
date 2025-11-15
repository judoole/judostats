import { NextResponse } from 'next/server';
import { JsonStorage } from '@/lib/storage';
import { IJFClient } from '@/lib/ijf-client';

const storage = new JsonStorage();
const client = new IJFClient();

/**
 * POST /api/crawl-judoka-profiles
 * Fetches judoka profiles for all unique judoka found in competitions and techniques
 * 
 * Body parameters:
 * - force: if true, refetches profiles even if they already exist
 */
export async function POST(request: Request) {
  // Disable crawling on Vercel - only allow local development
  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: 'Crawling is disabled on Vercel. Use local development environment.' },
      { status: 403 }
    );
  }

  try {
    const { force } = await request.json().catch(() => ({}));

    await storage.load();

    console.log('Collecting unique judoka IDs from competitions and techniques...');
    const allJudokaIds = storage.getAllUniqueJudokaIds();
    const judokaIdsArray = Array.from(allJudokaIds);
    console.log(`Found ${judokaIdsArray.length} unique judoka`);

    // Filter out judoka that already have profiles (unless force=true)
    const judokaIdsToFetch = force 
      ? judokaIdsArray 
      : judokaIdsArray.filter(id => !storage.getJudokaProfile(id));

    console.log(`Fetching profiles for ${judokaIdsToFetch.length} judoka (${judokaIdsArray.length - judokaIdsToFetch.length} already have profiles)`);

    // Fetch profiles in parallel batches
    let fetched = 0;
    let skipped = judokaIdsArray.length - judokaIdsToFetch.length;
    let errors = 0;
    const CONCURRENT_REQUESTS = 20; // Number of parallel requests
    const SAVE_BATCH_SIZE = 50; // Save every N profiles

    // Process in batches
    for (let i = 0; i < judokaIdsToFetch.length; i += CONCURRENT_REQUESTS) {
      const batch = judokaIdsToFetch.slice(i, i + CONCURRENT_REQUESTS);
      
      // Fetch all profiles in this batch in parallel
      const results = await Promise.allSettled(
        batch.map(async (judokaId) => {
          try {
            const personId = parseInt(judokaId, 10);
            if (isNaN(personId)) {
              throw new Error(`Invalid judoka ID: ${judokaId}`);
            }

            const competitorInfo = await client.getCompetitorInfo(personId);
            
            if (!competitorInfo) {
              throw new Error(`Failed to fetch profile for judoka ${judokaId}`);
            }

            // Convert IJF API response to our profile format
            return {
              id: judokaId,
              name: `${competitorInfo.given_name} ${competitorInfo.family_name}`.trim(),
              height: competitorInfo.height ? parseInt(competitorInfo.height, 10) : undefined,
              age: competitorInfo.age ? parseInt(competitorInfo.age, 10) : undefined,
              country: competitorInfo.country || competitorInfo.country_short,
              lastUpdated: new Date().toISOString(),
            };
          } catch (error) {
            console.error(`Error fetching profile for judoka ${judokaId}:`, error);
            throw error;
          }
        })
      );

      // Process results
      for (const result of results) {
        if (result.status === 'fulfilled') {
          const profile = result.value;
          storage.judokaProfiles.set(profile.id, profile);
          fetched++;
        } else {
          errors++;
        }
      }

      // Save every SAVE_BATCH_SIZE profiles
      if (fetched % SAVE_BATCH_SIZE === 0 || (i + batch.length) >= judokaIdsToFetch.length) {
        await storage.save();
        console.log(`  Progress: ${i + batch.length}/${judokaIdsToFetch.length} profiles processed, ${fetched} fetched, ${errors} errors`);
      } else if ((i + batch.length) % 10 === 0) {
        console.log(`  Progress: ${i + batch.length}/${judokaIdsToFetch.length} profiles processed`);
      }
    }
    
    // Final save to ensure all profiles are persisted
    await storage.save();

    console.log(`✓ Profile fetching completed: ${fetched} fetched, ${skipped} skipped, ${errors} errors`);

    return NextResponse.json({ 
      success: true, 
      message: 'Judoka profile crawl completed',
      judokaProfiles: {
        total: judokaIdsArray.length,
        fetched,
        skipped,
        errors,
      },
    });
  } catch (error: any) {
    console.error('Error during judoka profile crawl:', error);
    return NextResponse.json(
      { error: 'An error occurred during judoka profile crawling' },
      { status: 500 }
    );
  }
}

