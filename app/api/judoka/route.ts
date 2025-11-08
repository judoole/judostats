import { NextResponse } from 'next/server';
import { JsonStorage } from '@/lib/storage';

const storage = new JsonStorage();

export async function GET(request: Request) {
  try {
    await storage.load();
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const judokaId = searchParams.get('judokaId');
    const searchTerm = searchParams.get('search');
    
    // Validate searchTerm length
    if (searchTerm && searchTerm.length > 100) {
      return NextResponse.json(
        { error: 'Search term too long. Maximum 100 characters.' },
        { status: 400 }
      );
    }
    
    if (judokaId) {
      // Validate judokaId format (should be numeric string)
      if (!/^\d+$/.test(judokaId)) {
        return NextResponse.json(
          { error: 'Invalid judoka ID format' },
          { status: 400 }
        );
      }
      
      // Get statistics for a specific judoka
      const competitionIdParam = searchParams.get('competitionId');
      const competitionId = competitionIdParam ? parseInt(competitionIdParam) : undefined;
      
      // Validate competitionId if provided
      if (competitionIdParam && (isNaN(competitionId!) || competitionId! < 1 || competitionId! > 999999)) {
        return NextResponse.json(
          { error: 'Invalid competition ID' },
          { status: 400 }
        );
      }
      
      const filters = {
        gender: searchParams.get('gender') || undefined,
        weightClass: searchParams.get('weightClass') || undefined,
        eventType: searchParams.get('eventType') || undefined,
        competitionId,
      };
      
      const stats = storage.getJudokaStats(judokaId, filters);
      
      if (!stats) {
        return NextResponse.json({ error: 'Judoka not found' }, { status: 404 });
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
    return NextResponse.json(
      { error: 'Failed to fetch judoka data' },
      { status: 500 }
    );
  }
}

