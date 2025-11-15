import { NextResponse } from 'next/server';
import { JsonStorage } from '@/lib/storage';

const storage = new JsonStorage();

export async function GET(request: Request) {
  try {
    await storage.load();
    
    // Parse query parameters
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
    
    const filters = {
      gender: searchParams.get('gender') || undefined,
      weightClass: searchParams.get('weightClass') || undefined,
      eventType: searchParams.get('eventType') || undefined,
      competitionId,
      year,
      heightRange: searchParams.get('heightRange') || undefined,
    };
    
    const stats = storage.getTechniqueStats(filters);
    const availableFilters = storage.getAvailableFilters();
    
    return NextResponse.json({ stats, availableFilters });
  } catch (error) {
    console.error('Error fetching technique stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch technique stats' },
      { status: 500 }
    );
  }
}

