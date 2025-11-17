import { NextResponse } from 'next/server';
import { createStorage } from '@/lib/storage';

const storage = createStorage();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    
    // Validate competition ID
    const id = parseInt(idParam);
    if (isNaN(id) || id < 1 || id > 999999) {
      return NextResponse.json(
        { error: 'Invalid competition ID' },
        { status: 400 }
      );
    }
    
    await storage.load();
    const competition = storage.getCompetition(id);
    
    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(competition);
  } catch (error) {
    console.error('Error fetching competition:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competition' },
      { status: 500 }
    );
  }
}

