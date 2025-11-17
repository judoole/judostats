/**
 * Check technique data and new fields
 */
import { SqliteStorage } from '../lib/sqlite-storage';

async function check() {
  const storage = new SqliteStorage();
  await storage.load();

  const db = (storage as any).db;

  const total = db.prepare('SELECT COUNT(*) as count FROM techniques').get().count;
  const withOpponent = db.prepare('SELECT COUNT(*) as count FROM techniques WHERE opponent_name IS NOT NULL').get().count;
  const withSide = db.prepare("SELECT COUNT(*) as count FROM techniques WHERE side IS NOT NULL AND side != ''").get().count;
  const neWaza = db.prepare("SELECT COUNT(*) as count FROM techniques WHERE technique_category IS NOT NULL AND technique_category != 'tachi-waza'").get().count;

  console.log('Technique statistics:');
  console.log(`  Total: ${total}`);
  console.log(`  With opponent: ${withOpponent}`);
  console.log(`  With side: ${withSide}`);
  console.log(`  Ne-waza: ${neWaza}`);

  const sample = db.prepare('SELECT technique_name, technique_category, side, opponent_name, opponent_country FROM techniques LIMIT 5').all();

  console.log('\nSample techniques:');
  sample.forEach((t: any) => {
    console.log(JSON.stringify(t, null, 2));
  });

  const neWazaSample = db.prepare("SELECT technique_name, technique_category, side, opponent_name FROM techniques WHERE technique_category != 'tachi-waza' LIMIT 3").all();

  if (neWazaSample.length > 0) {
    console.log('\nNe-waza techniques:');
    neWazaSample.forEach((t: any) => {
      console.log(JSON.stringify(t, null, 2));
    });
  }

  const withSideSample = db.prepare("SELECT technique_name, side, opponent_name FROM techniques WHERE side IS NOT NULL AND side != '' LIMIT 3").all();

  if (withSideSample.length > 0) {
    console.log('\nTechniques with side (left/right):');
    withSideSample.forEach((t: any) => {
      console.log(JSON.stringify(t, null, 2));
    });
  }

  // Find judoka who have received techniques
  const received = db.prepare(`
    SELECT opponent_id, opponent_name, COUNT(*) as count 
    FROM techniques 
    WHERE opponent_id IS NOT NULL AND opponent_id != '' 
    GROUP BY opponent_id 
    ORDER BY count DESC 
    LIMIT 10
  `).all();

  console.log('\nJudoka who have received techniques:');
  if (received.length === 0) {
    console.log('  None found. The database may need more data or opponent information may not be captured.');
  } else {
    received.forEach((r: any) => {
      console.log(`  ${r.opponent_name || 'Unknown'} (ID: ${r.opponent_id}): ${r.count} techniques received`);
    });
    console.log(`\nTo test, search for: "${received[0].opponent_name || received[0].opponent_id}" or use ID: ${received[0].opponent_id}`);
  }
}

check().catch(console.error);

