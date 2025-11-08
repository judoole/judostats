import { NextResponse } from 'next/server';
import { JsonStorage } from '@/lib/storage';
import { IJFClient } from '@/lib/ijf-client';

const storage = new JsonStorage();
const ijfClient = new IJFClient();

export async function GET(request: Request) {
  try {
    await storage.load();
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const judokaId = searchParams.get('judokaId');
    const searchTerm = searchParams.get('search');
    
    if (judokaId) {
      // Get statistics for a specific judoka
      const filters = {
        gender: searchParams.get('gender') || undefined,
        weightClass: searchParams.get('weightClass') || undefined,
        eventType: searchParams.get('eventType') || undefined,
        competitionId: searchParams.get('competitionId') ? parseInt(searchParams.get('competitionId')!) : undefined,
      };
      
      const stats = storage.getJudokaStats(judokaId, filters);
      
      if (!stats) {
        return NextResponse.json({ error: 'Judoka not found' }, { status: 404 });
      }
      
      // Fetch opponent info for matches that don't have it
      if (stats.wazaBreakdown) {
        for (const waza of stats.wazaBreakdown) {
          if (waza.matches) {
            for (const match of waza.matches) {
              if (!match.opponent && match.contestCode) {
                try {
                  const matchDetails = await ijfClient.getMatchDetails(match.contestCode);
                  if (matchDetails) {
                    const opponent = matchDetails.person1?.id_person?.toString() === judokaId 
                      ? matchDetails.person2 
                      : matchDetails.person1;
                    if (opponent) {
                      match.opponent = opponent.nm;
                      match.opponentCountry = opponent.cntr || opponent.cnt;
                    }
                  }
                } catch (error) {
                  console.error(`Error fetching match details for ${match.contestCode}:`, error);
                }
              }
            }
          }
        }
      }
      
      return NextResponse.json({ stats });
    } else if (searchTerm) {
      // Search for judoka by name
      const judokaList = storage.getJudokaList(searchTerm);
      return NextResponse.json({ judokaList });
    } else {
      // Get all judoka (limited list)
      const judokaList = storage.getJudokaList();
      return NextResponse.json({ judokaList: judokaList.slice(0, 100) }); // Limit to first 100 for performance
    }
  } catch (error) {
    console.error('Error fetching judoka data:', error);
    return NextResponse.json({ error: 'Failed to fetch judoka data' }, { status: 500 });
  }
}

