/**
 * Check technique categorization issues
 */
import { SqliteStorage } from '../lib/sqlite-storage';

async function check() {
  const storage = new SqliteStorage();
  await storage.load();

  const db = (storage as any).db;

  // Check yoko-shiho-gatame
  const yoko = db.prepare("SELECT technique_name, technique_category, score, score_group, note FROM techniques WHERE technique_name LIKE '%yoko%shiho%' OR technique_name LIKE '%Yoko%Shiho%'").all();
  console.log(`\nYoko-shiho-gatame techniques: ${yoko.length}`);
  yoko.slice(0, 10).forEach((t: any) => {
    console.log(JSON.stringify(t, null, 2));
  });

  // Check penalties
  const penalties = db.prepare("SELECT technique_name, technique_category, score, score_group, note FROM techniques WHERE score < 0 OR score_group = 'Penalty' OR technique_name LIKE '%shido%' OR technique_name LIKE '%Shido%'").all();
  console.log(`\n\nPenalties: ${penalties.length}`);
  penalties.slice(0, 15).forEach((t: any) => {
    console.log(JSON.stringify(t, null, 2));
  });

  // Check all osaekomi
  const osaekomi = db.prepare("SELECT technique_name, technique_category, score, score_group, COUNT(*) as count FROM techniques WHERE technique_category = 'osaekomi' GROUP BY technique_name ORDER BY count DESC").all();
  console.log(`\n\nOsaekomi techniques by name:`);
  osaekomi.forEach((t: any) => {
    console.log(`${t.technique_name}: ${t.count} (score_group: ${t.score_group})`);
  });

  // Check "Osaekomi" as technique name
  const osaekomiName = db.prepare("SELECT technique_name, technique_category, score, score_group, note FROM techniques WHERE technique_name = 'Osaekomi'").all();
  console.log(`\n\nTechniques named 'Osaekomi': ${osaekomiName.length}`);
  osaekomiName.slice(0, 10).forEach((t: any) => {
    console.log(JSON.stringify(t, null, 2));
  });
}

check().catch(console.error);

