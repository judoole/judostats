import { NextResponse } from 'next/server';
import { JsonStorage } from '@/lib/storage';

const storage = new JsonStorage();

export async function GET(request: Request) {
  try {
    await storage.load();
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters = {
      gender: searchParams.get('gender') || undefined,
      weightClass: searchParams.get('weightClass') || undefined,
      eventType: searchParams.get('eventType') || undefined,
      competitionId: searchParams.get('competitionId') ? parseInt(searchParams.get('competitionId')!) : undefined,
    };
    
    const stats = storage.getStats(filters);
    const availableFilters = storage.getAvailableFilters();
    
    return NextResponse.json({ stats, availableFilters });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

