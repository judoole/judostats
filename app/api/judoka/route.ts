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

