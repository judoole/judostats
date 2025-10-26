import { NextResponse } from 'next/server';
import { JsonStorage } from '@/lib/storage';
import { IJFClient } from '@/lib/ijf-client';

const storage = new JsonStorage();
const client = new IJFClient();

export async function POST(request: Request) {
  try {
    const { limit, minYear, skipExisting } = await request.json().catch(() => ({}));

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
    console.log(`Processing ${limited.length} competitions`);

    for (const comp of limited) {
      const compId = parseInt(comp.id_competition || comp.id);
      const compName = comp.name || comp.nm || 'Unknown';
      
      console.log(`Processing: ${compName} (ID: ${compId})`);

      // Remove existing techniques for this competition to avoid duplicates
      await storage.removeTechniquesForCompetition(compId);

      const categories = await client.getCompetitionCategories(compId);
      if (!categories.length) {
        console.log(`No categories for competition ${compId}`);
        continue;
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
        }

        if (storedCat.matches.length > 0) {
          storedComp.categories.push(storedCat);
        }
      }

      if (storedComp.categories.length > 0) {
        await storage.addCompetition(storedComp);
        console.log(`✓ Added competition: ${compName}`);
      }
    }

    return NextResponse.json({ success: true, message: 'Crawl completed' });
  } catch (error: any) {
    console.error('Error during crawl:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

