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
    
    // Validate technique name length
    if (decodedName.length > 200) {
      return NextResponse.json(
        { error: 'Technique name too long' },
        { status: 400 }
      );
    }
    
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
    
    // Validate and parse year
    const yearParam = searchParams.get('year');
    const year = yearParam ? parseInt(yearParam) : undefined;
    if (yearParam && (isNaN(year!) || year! < 1900 || year! > 2100)) {
      return NextResponse.json(
        { error: 'Invalid year. Must be between 1900 and 2100' },
        { status: 400 }
      );
    }
    
    // Validate scoreGroup
    const scoreGroupParam = searchParams.get('scoreGroup');
    const validScoreGroups = ['Ippon', 'Waza-ari', 'Yuko', 'Shido', 'Penalty'];
    if (scoreGroupParam && !validScoreGroups.includes(scoreGroupParam)) {
      return NextResponse.json(
        { error: 'Invalid score group' },
        { status: 400 }
      );
    }
    
    const filters = {
      gender: searchParams.get('gender') || undefined,
      weightClass: searchParams.get('weightClass') || undefined,
      eventType: searchParams.get('eventType') || undefined,
      competitionId,
      year,
      scoreGroup: scoreGroupParam || undefined,
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
    return NextResponse.json(
      { error: 'Failed to fetch technique data' },
      { status: 500 }
    );
  }
}
