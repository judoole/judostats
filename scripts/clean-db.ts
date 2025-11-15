/**
 * Clean/reset SQLite database
 */
import { SqliteStorage } from '../lib/sqlite-storage';
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'judostats.db');

async function clean() {
  console.log('Cleaning SQLite database...');
  
  // Delete the database file
  try {
    await fs.unlink(DB_PATH);
    console.log('✅ Database file deleted');
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('Database file does not exist, nothing to clean');
    } else {
      throw error;
    }
  }
  
  // Create a fresh database by initializing storage
  console.log('Creating fresh database...');
  const storage = new SqliteStorage();
  await storage.load();
  await storage.save();
  
  console.log('✅ Fresh database created');
  console.log('\nDatabase is now clean and ready for new data.');
}

clean().catch((error) => {
  console.error('Error cleaning database:', error);
  process.exit(1);
});

