/**
 * Find judoka who have received techniques (where they are the opponent)
 */
import { SqliteStorage } from '../lib/sqlite-storage';

async function findJudokaWithReceivedTechniques() {
  const storage = new SqliteStorage();
  await storage.load();

  const techniques = storage.getAllTechniques();
  
  // Find all unique opponent IDs
  const opponentMap = new Map<string, { name?: string; count: number }>();
  
  techniques.forEach(t => {
    const opponentId = (t.opponent_id || t.opponentId || '').toString();
    const opponentName = t.opponent_name || t.opponentName;
    const name = (t.techniqueName || t.technique_name || '').toLowerCase();
    
    // Skip Fusen-Gachi
    if (opponentId && opponentId !== '' && name !== 'fusen-gachi' && name !== 'fusen gachi') {
      if (!opponentMap.has(opponentId)) {
        opponentMap.set(opponentId, { name: opponentName, count: 0 });
      }
      opponentMap.get(opponentId)!.count++;
    }
  });
  
  // Sort by count descending
  const sorted = Array.from(opponentMap.entries())
    .map(([id, data]) => ({ id, name: data.name, count: data.count }))
    .sort((a, b) => b.count - a.count);
  
  console.log(`Found ${sorted.length} judoka who have received techniques:\n`);
  
  if (sorted.length === 0) {
    console.log('No judoka found with received techniques.');
    console.log('This might mean:');
    console.log('  1. The database needs more data (crawl more competitions)');
    console.log('  2. Opponent information is not being captured correctly');
    console.log('  3. The database was recently cleaned');
    return;
  }
  
  sorted.slice(0, 20).forEach((judoka, index) => {
    console.log(`${index + 1}. ${judoka.name || 'Unknown'} (ID: ${judoka.id}) - ${judoka.count} techniques received`);
  });
  
  if (sorted.length > 0) {
    console.log(`\nTo test, search for: "${sorted[0].name || sorted[0].id}" or use ID: ${sorted[0].id}`);
  }
}

findJudokaWithReceivedTechniques().catch(console.error);

