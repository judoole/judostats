import { NextResponse } from 'next/server';
import { JsonStorage } from '@/lib/storage';

const storage = new JsonStorage();

export async function GET() {
  try {
    await storage.load();
    const competitions = storage.getAllCompetitions();
    return NextResponse.json(competitions);
  } catch (error) {
    console.error('Error fetching competitions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competitions' },
      { status: 500 }
    );
  }
}

