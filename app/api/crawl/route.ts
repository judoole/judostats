import { NextResponse } from 'next/server';
import { createStorage } from '@/lib/storage';
import { IJFClient } from '@/lib/ijf-client';

const storage = createStorage();
const client = new IJFClient();

export async function POST(request: Request) {
  // Disable crawling on Vercel - only allow local development
  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: 'Crawling is disabled on Vercel. Use local development environment.' },
      { status: 403 }
    );
  }

  try {
    const { 
      limit, 
      minYear, 
      skipExisting, 
      force, 
      concurrent = 30,  // Concurrent competitions (each triggers multiple API calls)
      profileConcurrent = 30  // Concurrent judoka profile requests
    } = await request.json().catch(() => ({}));

    await storage.load();

    console.log('Fetching all competitions...');
    const competitions = await client.getAllCompetitions();
    
    // Filter by year if specified
    let filtered = competitions;
    if (minYear) {
      filtered = competitions.filter((comp: any) => {
        const year = parseInt(comp.comp_year || comp.year || '0');
        return year >= minYear;
      });
      console.log(`Filtered to ${filtered.length} competitions from ${minYear} onwards`);
    }
    
    // Filter out already crawled competitions if skipExisting is true
    if (skipExisting) {
      const existingCompetitionIds = new Set(storage.getAllCompetitions().map(c => c.id));
      const beforeSkip = filtered.length;
      filtered = filtered.filter((comp: any) => {
        const compId = parseInt(comp.id_competition || comp.id);
        return !existingCompetitionIds.has(compId);
      });
      console.log(`Skipping ${beforeSkip - filtered.length} already crawled competitions`);
    }
    
    const limited = limit ? filtered.slice(0, limit) : filtered;
    console.log(`Processing ${limited.length} competitions with ${concurrent} concurrent requests`);

    // Process competitions in parallel batches
    const CONCURRENT_REQUESTS = concurrent;
    let processed = 0;
    let added = 0;
    let errors = 0;

    for (let i = 0; i < limited.length; i += CONCURRENT_REQUESTS) {
      const batch = limited.slice(i, i + CONCURRENT_REQUESTS);
      
      const results = await Promise.allSettled(
        batch.map(async (comp) => {
          const compAny = comp as any;
          const compId = parseInt(compAny.id_competition || compAny.id);
          const compName = compAny.name || compAny.nm || 'Unknown';
          
          console.log(`Processing: ${compName} (ID: ${compId})`);

          // Remove existing techniques for this competition to avoid duplicates (without saving)
          storage.removeTechniquesForCompetitionWithoutSave(compId);

          const categories = await client.getCompetitionCategories(compId);
          if (!categories.length) {
            console.log(`No categories for competition ${compId}`);
            return null;
          }

          const storedComp: any = {
            id: compId,
            competitionId: compId,
            name: compName,
            date: compAny.date_to || compAny.dt_end || '',
            location: compAny.city || compAny.loc || '',
            eventType: compAny.ages?.[0] || '',
            year: parseInt(compAny.comp_year || compAny.year || '0'),
            categories: [],
          };

          for (const cat of categories) {
            const matches = await client.getMatches(compId, cat.id_weight);
            const storedCat: any = {
              id: compId * 1000 + cat.id_weight,
              competitionId: compId,
              categoryId: cat.id_weight,
              weightClass: cat.nm,
              gender: cat.gender,
              matches: [],
            };

            let hasTechniques = false;

            // Sample a few matches to check for techniques
            for (const match of matches.slice(0, 3)) {
              const contestCode = match.contest_code_long || match.code;
              if (!contestCode) continue;
              
              const details = await client.getMatchDetails(contestCode);
              if (details && client.matchHasTechniques(details)) {
                hasTechniques = true;
                break;
              }
            }

            if (hasTechniques) {
              // Process all matches
              for (const match of matches) {
                const contestCode = match.contest_code_long || match.code;
                if (!contestCode) continue;
                
                const details = await client.getMatchDetails(contestCode);
                if (!details) continue;

                const techniques = client.extractTechniques(details);
                if (!techniques.length) continue;

                const storedMatch: any = {
                  id: Date.now() + Math.random(),
                  categoryId: storedCat.id,
                  contestCode: contestCode,
                  matchNumber: match.nm,
                  competitors: [],
                  techniques: [],
                };

                // Extract competitors
                if (details.person1) {
                  storedMatch.competitors.push({
                    competitorId: details.person1.id_person,
                    name: details.person1.nm,
                    countryCode: details.person1.cnt,
                    country: details.person1.cntr,
                    isWinner: details.person1.res === 1,
                    score: 0,
                  });
                }

                if (details.person2) {
                  storedMatch.competitors.push({
                    competitorId: details.person2.id_person,
                    name: details.person2.nm,
                    countryCode: details.person2.cnt,
                    country: details.person2.cntr,
                    isWinner: details.person2.res === 1,
                    score: 0,
                  });
                }

                // Extract techniques
                for (const tech of techniques) {
                  storedMatch.techniques.push({
                    ...tech,
                    competitionId: compId,
                    matchContestCode: contestCode,
                    competitionName: compName,
                    weightClass: cat.nm,
                    gender: cat.gender,
                  });

                  // Add technique without saving (will save in batch)
                  storage.addTechniqueWithoutSave({
                    ...tech,
                    competitionId: compId,
                    matchContestCode: contestCode,
                    competitionName: compName,
                    weightClass: cat.nm,
                    gender: cat.gender,
                    eventType: compAny.ages?.[0] || '',
                  });
                }

                storedCat.matches.push(storedMatch);
              }
            }

            if (storedCat.matches.length > 0) {
              storedComp.categories.push(storedCat);
            }
          }

          if (storedComp.categories.length > 0) {
            // Add competition without saving (will save in batch)
            storage.addCompetitionWithoutSave(storedComp);
            console.log(`✓ Added competition: ${compName}`);
            return storedComp;
          }
          
          return null;
        })
      );

      // Process results
      for (const result of results) {
        processed++;
        if (result.status === 'fulfilled' && result.value) {
          added++;
        } else if (result.status === 'rejected') {
          errors++;
          console.error('Error processing competition:', result.reason);
        }
      }

      // Save progress periodically
      await storage.save();
      console.log(`Progress: ${processed}/${limited.length} processed, ${added} added, ${errors} errors`);
    }

    console.log(`✓ Competition crawling completed: ${processed} processed, ${added} added, ${errors} errors`);

    // Fetch judoka profiles after processing competitions (using parallel processing)
    console.log('Collecting unique judoka IDs...');
    const allJudokaIds = storage.getAllUniqueJudokaIds();
    const judokaIdsArray = Array.from(allJudokaIds);
    console.log(`Found ${judokaIdsArray.length} unique judoka`);

    // Filter out judoka that already have profiles (unless force=true)
    const judokaIdsToFetch = force 
      ? judokaIdsArray 
      : judokaIdsArray.filter(id => !storage.getJudokaProfile(id));

    // Fetch profiles in parallel batches
    let fetched = 0;
    let skipped = judokaIdsArray.length - judokaIdsToFetch.length;
    let profileErrors = 0;
    const PROFILE_CONCURRENT_REQUESTS = profileConcurrent;
    const SAVE_BATCH_SIZE = 50;

    console.log(`Fetching profiles for ${judokaIdsToFetch.length} judoka (${judokaIdsArray.length - judokaIdsToFetch.length} already have profiles) with ${PROFILE_CONCURRENT_REQUESTS} concurrent requests`);

    for (let i = 0; i < judokaIdsToFetch.length; i += PROFILE_CONCURRENT_REQUESTS) {
      const batch = judokaIdsToFetch.slice(i, i + PROFILE_CONCURRENT_REQUESTS);
      
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
          profileErrors++;
        }
      }

      // Save every SAVE_BATCH_SIZE profiles
      if (fetched % SAVE_BATCH_SIZE === 0 || (i + batch.length) >= judokaIdsToFetch.length) {
        await storage.save();
        console.log(`  Profile progress: ${i + batch.length}/${judokaIdsToFetch.length} processed, ${fetched} fetched, ${profileErrors} errors`);
      } else if ((i + batch.length) % 10 === 0) {
        console.log(`  Profile progress: ${i + batch.length}/${judokaIdsToFetch.length} processed`);
      }
    }
    
    // Final save to ensure all profiles are persisted
    await storage.save();

    console.log(`✓ Profile fetching completed: ${fetched} fetched, ${skipped} skipped, ${profileErrors} errors`);

    return NextResponse.json({ 
      success: true, 
      message: 'Crawl completed',
      competitions: {
        processed,
        added,
        errors,
      },
      judokaProfiles: {
        total: judokaIdsArray.length,
        fetched,
        skipped,
        errors: profileErrors,
      },
    });
  } catch (error: any) {
    console.error('Error during crawl:', error);
    console.error('Error stack:', error?.stack);
    return NextResponse.json(
      { error: 'An error occurred during crawling', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

