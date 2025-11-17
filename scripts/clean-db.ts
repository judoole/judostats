/**
 * Clean/reset SQLite database
 * 
 * This script deletes the database file and recreates it with a fresh schema.
 * Yes, it's as simple as deleting the file - SqliteStorage.load() will automatically
 * create the tables when the database file doesn't exist.
 */
import { SqliteStorage } from '../lib/sqlite-storage';
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'judostats.db');

async function clean() {
  console.log('Cleaning SQLite database...');
  
  // Delete the database file (this is all that's needed!)
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
  // SqliteStorage.load() will automatically create all tables if the file doesn't exist
  console.log('Creating fresh database with schema...');
  const storage = new SqliteStorage();
  await storage.load();
  await storage.save();
  
  console.log('✅ Fresh database created');
  console.log('\nDatabase is now clean and ready for new data.');
  console.log('Note: You can also just delete data/judostats.db manually - it will be recreated on next load.');
}

clean().catch((error) => {
  console.error('Error cleaning database:', error);
  process.exit(1);
});

