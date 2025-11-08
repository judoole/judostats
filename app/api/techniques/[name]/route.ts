import { NextResponse } from 'next/server';
import { JsonStorage } from '@/lib/storage';

const storage = new JsonStorage();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const decodedName = decodeURIComponent(name);
    
    const { searchParams } = new URL(request.url);
    const filters = {
      gender: searchParams.get('gender') || undefined,
      weightClass: searchParams.get('weightClass') || undefined,
      eventType: searchParams.get('eventType') || undefined,
      competitionId: searchParams.get('competitionId') ? parseInt(searchParams.get('competitionId')!) : undefined,
      year: searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined,
      scoreGroup: searchParams.get('scoreGroup') || undefined,
    };
    
    await storage.load();
    const matches = storage.getMatchesForTechnique(decodedName, filters);
    const topJudoka = storage.getTopJudokaForTechnique(decodedName, 10, filters);
    const availableFilters = storage.getAvailableFilters();
    
    return NextResponse.json({ 
      techniqueName: decodedName,
      matches,
      topJudoka,
      availableFilters,
    });
  } catch (error) {
    console.error('Error fetching technique data:', error);
    return NextResponse.json({ error: 'Failed to fetch technique data' }, { status: 500 });
  }
}
