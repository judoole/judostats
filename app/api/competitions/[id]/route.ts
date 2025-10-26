import { NextResponse } from 'next/server';
import { JsonStorage } from '@/lib/storage';

const storage = new JsonStorage();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    await storage.load();
    const id = parseInt(idParam);
    const competition = storage.getCompetition(id);
    
    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }
    
    return NextResponse.json(competition);
  } catch (error) {
    console.error('Error fetching competition:', error);
    return NextResponse.json({ error: 'Failed to fetch competition' }, { status: 500 });
  }
}

