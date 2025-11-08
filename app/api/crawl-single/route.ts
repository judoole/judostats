import { NextResponse } from 'next/server';
import { JsonStorage } from '@/lib/storage';
import { IJFClient } from '@/lib/ijf-client';

const storage = new JsonStorage();
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
    const { competitionId } = await request.json().catch(() => ({}));
    
    if (!competitionId) {
      return NextResponse.json({ error: 'competitionId is required' }, { status: 400 });
    }

    await storage.load();

    console.log(`Crawling competition ${competitionId}...`);

    // Get competition info from the list
    const allCompetitions = await client.getAllCompetitions();
    const comp = allCompetitions.find((c: any) => 
      parseInt(c.id_competition || c.id) === competitionId
    );

    if (!comp) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }

    const compId = parseInt(comp.id_competition || comp.id);
    const compName = comp.name || comp.nm || 'Unknown';
    
    console.log(`Processing: ${compName} (ID: ${compId})`);

    // Remove existing techniques for this competition to avoid duplicates
    await storage.removeTechniquesForCompetition(compId);

    const categories = await client.getCompetitionCategories(compId);
    if (!categories.length) {
      return NextResponse.json({ error: 'No categories found' }, { status: 404 });
    }

    const storedComp: any = {
      id: compId,
      competitionId: compId,
      name: compName,
      date: comp.date_to || comp.dt_end || '',
      location: comp.city || comp.loc || '',
      eventType: comp.ages?.[0] || '',
      year: parseInt(comp.comp_year || comp.year || '0'),
      categories: [],
    };

    for (const cat of categories) {
      console.log(`Category: ${cat.id_weight}, name: ${cat.nm}, gender: ${cat.gender}`);
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

      // Debug: Check first match
      console.log(`Found ${matches.length} matches in category ${cat.id_weight}`);
      if (matches.length > 0) {
        const firstMatch = matches[0];
        const contestCode = firstMatch.contest_code_long || firstMatch.code;
        console.log(`Sample contest code: ${contestCode}`);
        console.log(`Match data:`, JSON.stringify(firstMatch).slice(0, 200));
        
        if (contestCode && contestCode !== 'undefined') {
          const sampleDetails = await client.getMatchDetails(contestCode);
          console.log(`Sample match has events: ${!!(sampleDetails?.events)}`);
          console.log(`Sample match events count: ${sampleDetails?.events?.length || 0}`);
          if (sampleDetails?.events?.length > 0) {
            console.log(`First event type: ${sampleDetails.events[0].id_contest_event_type}`);
            console.log(`First event tags:`, sampleDetails.events[0].tags?.length || 0);
          }
        }
      }
      
      // Sample a few matches to check for techniques
      for (const match of matches.slice(0, 3)) {
        const contestCode = match.contest_code_long || match.code;
        if (!contestCode) continue;
        const details = await client.getMatchDetails(contestCode);
        if (details && client.matchHasTechniques(details)) {
          hasTechniques = true;
          console.log(`Found techniques in sample for category ${cat.id_weight}`);
          break;
        }
      }

      if (hasTechniques) {
        console.log(`Processing all matches for category ${cat.id_weight}...`);
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
              eventType: comp.ages?.[0] || '',
            });

            await storage.addTechnique({
              ...tech,
              competitionId: compId,
              matchContestCode: contestCode,
              competitionName: compName,
              weightClass: cat.nm,
              gender: cat.gender,
              eventType: comp.ages?.[0] || '',
            });
          }

          storedCat.matches.push(storedMatch);
        }
      } else {
        console.log(`No techniques found in category ${cat.id_weight}`);
      }

      if (storedCat.matches.length > 0) {
        storedComp.categories.push(storedCat);
      }
    }

    if (storedComp.categories.length > 0) {
      await storage.addCompetition(storedComp);
      console.log(`✓ Added competition: ${compName}`);
      return NextResponse.json({
        success: true,
        message: `Successfully crawled ${compName}`,
        competition: storedComp,
        techniqueCount: storage.getAllTechniques().length,
      });
    } else {
      return NextResponse.json({
        success: true,
        message: `No techniques found in ${compName}`,
        competition: storedComp,
      });
    }

  } catch (error: any) {
    console.error('Error during crawl:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

