/**
 * Migrate only techniques from JSON to SQLite
 * Use this if techniques migration failed
 */
import { JsonStorage } from '../lib/storage';
import { SqliteStorage } from '../lib/sqlite-storage';

async function migrateTechniques() {
  console.log('Migrating techniques from JSON to SQLite...');
  
  // Load JSON data
  console.log('Loading JSON data...');
  const jsonStorage = new JsonStorage();
  await jsonStorage.load();
  
  const techniques = jsonStorage.getAllTechniques();
  console.log(`Loaded ${techniques.length} techniques from JSON`);
  
  if (techniques.length === 0) {
    console.error('No techniques found in JSON files!');
    process.exit(1);
  }
  
  // Initialize SQLite storage
  console.log('Loading SQLite database...');
  const sqliteStorage = new SqliteStorage();
  await sqliteStorage.load();
  
  // Clear existing techniques (if any)
  console.log('Clearing existing techniques...');
  if (sqliteStorage.getAllTechniques().length > 0) {
    // Delete all techniques
    const compIds = new Set(techniques.map(t => t.competitionId).filter(Boolean));
    for (const compId of compIds) {
      sqliteStorage.removeTechniquesForCompetitionWithoutSave(compId);
    }
  }
  
  // Migrate techniques in batches
  console.log('Migrating techniques...');
  const BATCH_SIZE = 1000;
  for (let i = 0; i < techniques.length; i += BATCH_SIZE) {
    const batch = techniques.slice(i, i + BATCH_SIZE);
    sqliteStorage.addTechniquesWithoutSave(batch);
    console.log(`  Migrated ${Math.min(i + BATCH_SIZE, techniques.length)}/${techniques.length} techniques`);
  }
  
  // Save SQLite database
  console.log('Saving SQLite database...');
  await sqliteStorage.save();
  
  // Verify
  const migrated = sqliteStorage.getAllTechniques();
  console.log(`✅ Migration completed!`);
  console.log(`   Migrated: ${migrated.length} techniques`);
  
  if (migrated.length !== techniques.length) {
    console.warn(`⚠️  Warning: Expected ${techniques.length} but got ${migrated.length}`);
  }
}

migrateTechniques().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});

