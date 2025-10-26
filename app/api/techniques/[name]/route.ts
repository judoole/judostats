import { NextResponse } from 'next/server';
import { JsonStorage } from '@/lib/storage';

const storage = new JsonStorage();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    
    const { searchParams } = new URL(request.url);
    const filters = {
      gender: searchParams.get('gender') || undefined,
      weightClass: searchParams.get('weightClass') || undefined,
      eventType: searchParams.get('eventType') || undefined,
      competitionId: searchParams.get('competitionId') ? parseInt(searchParams.get('competitionId')!) : undefined,
    };
    
    await storage.load();
    const matches = storage.getMatchesForTechnique(decodeURIComponent(name), filters);
    
    return NextResponse.json(matches);
  } catch (error) {
    console.error('Error fetching technique matches:', error);
    return NextResponse.json({ error: 'Failed to fetch technique matches' }, { status: 500 });
  }
}
