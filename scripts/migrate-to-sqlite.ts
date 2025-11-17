/**
 * Migration script to convert JSON storage to SQLite
 * Run with: npx tsx scripts/migrate-to-sqlite.ts
 */

import { JsonStorage } from '../lib/storage';
import { SqliteStorage } from '../lib/sqlite-storage';

async function migrate() {
  console.log('Starting migration from JSON to SQLite...');
  
  // Load JSON data
  console.log('Loading JSON data...');
  const jsonStorage = new JsonStorage();
  await jsonStorage.load();
  
  const competitions = jsonStorage.getAllCompetitions();
  const techniques = jsonStorage.getAllTechniques();
  const profiles = jsonStorage.getAllJudokaProfiles();
  
  console.log(`Loaded: ${competitions.length} competitions, ${techniques.length} techniques, ${profiles.length} profiles`);
  
  // Initialize SQLite storage
  console.log('Initializing SQLite database...');
  const sqliteStorage = new SqliteStorage();
  await sqliteStorage.load();
  
  // Migrate competitions
  console.log('Migrating competitions...');
  for (const comp of competitions) {
    sqliteStorage.addCompetitionWithoutSave(comp);
  }
  console.log(`Migrated ${competitions.length} competitions`);
  
  // Migrate techniques
  console.log('Migrating techniques...');
  const BATCH_SIZE = 1000;
  for (let i = 0; i < techniques.length; i += BATCH_SIZE) {
    const batch = techniques.slice(i, i + BATCH_SIZE);
    sqliteStorage.addTechniquesWithoutSave(batch);
    console.log(`  Migrated ${Math.min(i + BATCH_SIZE, techniques.length)}/${techniques.length} techniques`);
  }
  
  // Migrate profiles
  console.log('Migrating judoka profiles...');
  for (const profile of profiles) {
    await sqliteStorage.setJudokaProfile(profile);
  }
  console.log(`Migrated ${profiles.length} profiles`);
  
  // Save SQLite database
  console.log('Saving SQLite database...');
  await sqliteStorage.save();
  
  console.log('✅ Migration completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Update lib/storage.ts to export SqliteStorage as default');
  console.log('2. Update all imports to use SqliteStorage');
  console.log('3. Test the application');
  console.log('4. Backup JSON files before removing them');
}

migrate().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});

