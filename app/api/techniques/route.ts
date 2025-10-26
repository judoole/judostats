import { NextResponse } from 'next/server';
import { JsonStorage } from '@/lib/storage';

const storage = new JsonStorage();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const competitionId = searchParams.get('competitionId');
    const techniqueName = searchParams.get('techniqueName');
    const minScore = searchParams.get('minScore');

    await storage.load();
    
    const techniques = storage.getTechniquesFiltered({
      competitionId: competitionId ? parseInt(competitionId) : undefined,
      techniqueName: techniqueName || undefined,
      minScore: minScore ? parseInt(minScore) : undefined,
    });

    return NextResponse.json(techniques);
  } catch (error) {
    console.error('Error fetching techniques:', error);
    return NextResponse.json({ error: 'Failed to fetch techniques' }, { status: 500 });
  }
}

