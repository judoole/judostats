import { NextResponse } from 'next/server';
import { createStorage } from '@/lib/storage';

const storage = createStorage();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Validate and parse competitionId
    const competitionIdParam = searchParams.get('competitionId');
    const competitionId = competitionIdParam ? parseInt(competitionIdParam) : undefined;
    if (competitionIdParam && (isNaN(competitionId!) || competitionId! < 1 || competitionId! > 999999)) {
      return NextResponse.json(
        { error: 'Invalid competition ID' },
        { status: 400 }
      );
    }
    
    // Validate techniqueName length
    const techniqueName = searchParams.get('techniqueName');
    if (techniqueName && techniqueName.length > 200) {
      return NextResponse.json(
        { error: 'Technique name too long. Maximum 200 characters.' },
        { status: 400 }
      );
    }
    
    // Validate and parse minScore
    const minScoreParam = searchParams.get('minScore');
    const minScore = minScoreParam ? parseInt(minScoreParam) : undefined;
    if (minScoreParam && (isNaN(minScore!) || minScore! < 0 || minScore! > 100)) {
      return NextResponse.json(
        { error: 'Invalid minimum score. Must be between 0 and 100' },
        { status: 400 }
      );
    }

    await storage.load();
    
    const techniques = storage.getTechniquesFiltered({
      competitionId,
      techniqueName: techniqueName || undefined,
      minScore,
    });

    return NextResponse.json(techniques);
  } catch (error) {
    console.error('Error fetching techniques:', error);
    return NextResponse.json(
      { error: 'Failed to fetch techniques' },
      { status: 500 }
    );
  }
}

