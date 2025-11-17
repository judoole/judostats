import { NextResponse } from 'next/server';
import { createStorage } from '@/lib/storage';

const storage = createStorage();

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
      techniqueCategory: searchParams.get('techniqueCategory') || undefined,
    };
    
    const stats = storage.getTechniqueStats(filters);
    const availableFilters = storage.getAvailableFilters();
    
    // Add caching headers
    // For unfiltered queries, cache longer (1 hour)
    // For filtered queries, cache shorter (5 minutes)
    const hasFilters = Object.values(filters).some(v => v !== undefined);
    const maxAge = hasFilters ? 300 : 3600; // 5 minutes or 1 hour
    
    return NextResponse.json(
      { stats, availableFilters },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=600`,
        },
      }
    );
  } catch (error) {
    console.error('Error fetching technique stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch technique stats' },
      { status: 500 }
    );
  }
}

