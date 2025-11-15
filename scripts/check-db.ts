/**
 * Quick script to check database contents
 */
import { SqliteStorage } from '../lib/sqlite-storage';

async function check() {
  const storage = new SqliteStorage();
  await storage.load();
  
  const competitions = storage.getAllCompetitions();
  const techniques = storage.getAllTechniques();
  const profiles = storage.getAllJudokaProfiles();
  
  console.log('Database contents:');
  console.log(`  Competitions: ${competitions.length}`);
  console.log(`  Techniques: ${techniques.length}`);
  console.log(`  Profiles: ${profiles.length}`);
  
  if (techniques.length === 0 && competitions.length > 0) {
    console.log('\n⚠️  WARNING: Techniques table appears empty!');
    console.log('This might indicate a migration issue.');
  }
}

check().catch(console.error);

