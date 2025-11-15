import { NextResponse } from 'next/server';
import { createStorage } from '@/lib/storage';

export async function POST(request: Request) {
  // Disable on Vercel - only allow local development
  if (process.env.VERCEL) {
    return NextResponse.json(
      { error: 'Database cleaning is disabled on Vercel. Use local development environment.' },
      { status: 403 }
    );
  }

  try {
    const storage = createStorage();
    await storage.load();

    // Delete all data
    const competitions = storage.getAllCompetitions();
    for (const comp of competitions) {
      if (comp.id) {
        storage.removeTechniquesForCompetitionWithoutSave(comp.id);
      }
    }

    // Clear competitions (SQLite specific - need to delete from table)
    if (storage.constructor.name === 'SqliteStorage') {
      // Access the database directly to delete all competitions
      const sqliteStorage = storage as any;
      if (sqliteStorage.db) {
        sqliteStorage.db.exec('DELETE FROM competitions');
        sqliteStorage.db.exec('DELETE FROM techniques');
        sqliteStorage.db.exec('DELETE FROM judoka_profiles');
        sqliteStorage.db.exec('VACUUM'); // Reclaim space
      }
    }

    await storage.save();

    return NextResponse.json({
      success: true,
      message: 'Database cleaned successfully',
    });
  } catch (error: any) {
    console.error('Error cleaning database:', error);
    return NextResponse.json(
      { error: 'An error occurred while cleaning the database', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

