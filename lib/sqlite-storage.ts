/**
 * SQLite-based storage for competitions, matches, and techniques
 * Uses better-sqlite3 for native Node.js SQLite implementation
 */

import Database from 'better-sqlite3';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'judostats.db');

// Re-export interfaces from storage.ts
export type {
  StoredCompetition,
  StoredCategory,
  StoredMatch,
  CompetitorData,
  TechniqueData,
  JudokaProfile,
} from './storage';

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory already exists or permission issue
  }
}

export class SqliteStorage {
  private db: Database.Database | null = null;

  private async init() {
    if (this.db) return;
    
    await ensureDataDir();
    this.db = new Database(DB_PATH);
    this.createTables();
  }

  private createTables() {
    if (!this.db) return;

    // Competitions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS competitions (
        id INTEGER PRIMARY KEY,
        competition_id INTEGER UNIQUE NOT NULL,
        name TEXT NOT NULL,
        date TEXT,
        location TEXT,
        event_type TEXT,
        year INTEGER,
        categories_json TEXT
      )
    `);

    // Techniques table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS techniques (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        competitor_id TEXT,
        competitor_name TEXT,
        technique_name TEXT NOT NULL,
        technique_type TEXT,
        side TEXT,
        score INTEGER,
        timestamp TEXT,
        note TEXT,
        competition_id INTEGER,
        match_contest_code TEXT,
        competition_name TEXT,
        weight_class TEXT,
        gender TEXT,
        event_type TEXT,
        score_group TEXT
      )
    `);

    // Judoka profiles table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS judoka_profiles (
        id TEXT PRIMARY KEY,
        name TEXT,
        height INTEGER,
        age INTEGER,
        country TEXT,
        last_updated TEXT
      )
    `);

    // Create indexes for better query performance
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_techniques_competition_id ON techniques(competition_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_techniques_technique_name ON techniques(technique_name)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_techniques_competitor_id ON techniques(competitor_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_competitions_year ON competitions(year)`);
  }

  async load() {
    await this.init();
    // Database is already loaded, no need to load JSON
  }

  async save() {
    // better-sqlite3 writes synchronously, so no explicit save needed
    // But we can ensure the database is initialized
    await this.init();
  }

  getAllCompetitions(): any[] {
    if (!this.db) return [];
    
    const stmt = this.db.prepare('SELECT * FROM competitions');
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      competitionId: row.competition_id,
      name: row.name,
      date: row.date || undefined,
      location: row.location || undefined,
      eventType: row.event_type || undefined,
      year: row.year || undefined,
      categories: row.categories_json ? JSON.parse(row.categories_json) : [],
    }));
  }

  getCompetition(id: number): any | undefined {
    if (!this.db) return undefined;
    
    const stmt = this.db.prepare('SELECT * FROM competitions WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) return undefined;
    
    return {
      id: row.id,
      competitionId: row.competition_id,
      name: row.name,
      date: row.date || undefined,
      location: row.location || undefined,
      eventType: row.event_type || undefined,
      year: row.year || undefined,
      categories: row.categories_json ? JSON.parse(row.categories_json) : [],
    };
  }

  addCompetitionWithoutSave(competition: any) {
    if (!this.db) return;
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO competitions 
      (id, competition_id, name, date, location, event_type, year, categories_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      competition.id,
      competition.competitionId || competition.id,
      competition.name,
      competition.date || null,
      competition.location || null,
      competition.eventType || null,
      competition.year || null,
      JSON.stringify(competition.categories || []),
    );
  }

  async addCompetition(competition: any) {
    await this.init();
    this.addCompetitionWithoutSave(competition);
  }

  updateCompetition(id: number, updater: (comp: any) => any) {
    const existing = this.getCompetition(id);
    if (existing) {
      const updated = updater(existing);
      this.addCompetitionWithoutSave(updated);
    }
  }

  getAllTechniques() {
    if (!this.db) return [];
    
    const stmt = this.db.prepare('SELECT * FROM techniques');
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      competitor_id: row.competitor_id || undefined,
      competitorId: row.competitor_id || undefined,
      competitor_name: row.competitor_name || undefined,
      competitorName: row.competitor_name || undefined,
      technique_name: row.technique_name,
      techniqueName: row.technique_name,
      technique_type: row.technique_type || undefined,
      techniqueType: row.technique_type || undefined,
      side: row.side || undefined,
      score: row.score || undefined,
      timestamp: row.timestamp || undefined,
      note: row.note || undefined,
      competitionId: row.competition_id || undefined,
      matchContestCode: row.match_contest_code || undefined,
      contestCode: row.match_contest_code || undefined,
      competitionName: row.competition_name || undefined,
      weightClass: row.weight_class || undefined,
      gender: row.gender || undefined,
      eventType: row.event_type || undefined,
      score_group: row.score_group || undefined,
      scoreGroup: row.score_group || undefined,
    }));
  }

  addTechniqueWithoutSave(technique: any) {
    if (!this.db) return;
    
    const stmt = this.db.prepare(`
      INSERT INTO techniques 
      (competitor_id, competitor_name, technique_name, technique_type, side, score, 
       timestamp, note, competition_id, match_contest_code, competition_name, 
       weight_class, gender, event_type, score_group)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      technique.competitor_id || technique.competitorId || null,
      technique.competitor_name || technique.competitorName || null,
      technique.technique_name || technique.techniqueName || '',
      technique.technique_type || technique.techniqueType || null,
      technique.side || null,
      technique.score || null,
      technique.timestamp || null,
      technique.note || null,
      technique.competitionId || null,
      technique.matchContestCode || technique.contestCode || null,
      technique.competitionName || null,
      technique.weightClass || null,
      technique.gender || null,
      technique.eventType || null,
      technique.score_group || technique.scoreGroup || null,
    );
  }

  async addTechnique(technique: any) {
    await this.init();
    this.addTechniqueWithoutSave(technique);
  }

  addTechniquesWithoutSave(techniques: any[]) {
    if (!this.db) return;
    
    const stmt = this.db.prepare(`
      INSERT INTO techniques 
      (competitor_id, competitor_name, technique_name, technique_type, side, score, 
       timestamp, note, competition_id, match_contest_code, competition_name, 
       weight_class, gender, event_type, score_group)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Use transaction for better performance
    const insertMany = this.db.transaction((techniques: any[]) => {
      for (const technique of techniques) {
        stmt.run(
          technique.competitor_id || technique.competitorId || null,
          technique.competitor_name || technique.competitorName || null,
          technique.technique_name || technique.techniqueName || '',
          technique.technique_type || technique.techniqueType || null,
          technique.side || null,
          technique.score || null,
          technique.timestamp || null,
          technique.note || null,
          technique.competitionId || null,
          technique.matchContestCode || technique.contestCode || null,
          technique.competitionName || null,
          technique.weightClass || null,
          technique.gender || null,
          technique.eventType || null,
          technique.score_group || technique.scoreGroup || null,
        );
      }
    });
    
    insertMany(techniques);
  }

  async addTechniques(techniques: any[]) {
    await this.init();
    this.addTechniquesWithoutSave(techniques);
  }

  removeTechniquesForCompetitionWithoutSave(competitionId: number) {
    if (!this.db) return;
    
    const stmt = this.db.prepare('DELETE FROM techniques WHERE competition_id = ?');
    stmt.run(competitionId);
  }

  async removeTechniquesForCompetition(competitionId: number) {
    await this.init();
    this.removeTechniquesForCompetitionWithoutSave(competitionId);
  }

  // Judoka profiles stored in Map for compatibility
  public judokaProfiles: Map<string, any> = new Map();

  getJudokaProfile(judokaId: string): any | undefined {
    if (!this.db) {
      // Fallback to in-memory map if DB not initialized
      return this.judokaProfiles.get(judokaId);
    }
    
    const stmt = this.db.prepare('SELECT * FROM judoka_profiles WHERE id = ?');
    const row = stmt.get(judokaId) as any;
    
    if (!row) return undefined;
    
    return {
      id: row.id,
      name: row.name || undefined,
      height: row.height || undefined,
      age: row.age || undefined,
      country: row.country || undefined,
      lastUpdated: row.last_updated || undefined,
    };
  }

  async setJudokaProfile(profile: any): Promise<void> {
    await this.init();
    if (!this.db) return;
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO judoka_profiles 
      (id, name, height, age, country, last_updated)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      profile.id,
      profile.name || null,
      profile.height || null,
      profile.age || null,
      profile.country || null,
      new Date().toISOString(),
    );
    
    // Also update in-memory map for compatibility
    this.judokaProfiles.set(profile.id, profile);
  }

  async updateJudokaProfile(judokaId: string, updates: Partial<any>): Promise<void> {
    const existing = this.getJudokaProfile(judokaId) || { id: judokaId };
    const updated = {
      ...existing,
      ...updates,
      id: judokaId,
      lastUpdated: new Date().toISOString(),
    };
    await this.setJudokaProfile(updated);
  }

  getAllJudokaProfiles(): any[] {
    if (!this.db) {
      return Array.from(this.judokaProfiles.values());
    }
    
    const stmt = this.db.prepare('SELECT * FROM judoka_profiles');
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      name: row.name || undefined,
      height: row.height || undefined,
      age: row.age || undefined,
      country: row.country || undefined,
      lastUpdated: row.last_updated || undefined,
    }));
  }

  getAllUniqueJudokaIds(): Set<string> {
    const judokaIds = new Set<string>();
    
    if (!this.db) return judokaIds;
    
    // Get from techniques
    const techStmt = this.db.prepare('SELECT DISTINCT competitor_id FROM techniques WHERE competitor_id IS NOT NULL AND competitor_id != \'\'');
    const techRows = techStmt.all() as any[];
    for (const row of techRows) {
      const id = (row.competitor_id as string)?.toString();
      if (id && id !== '0') {
        judokaIds.add(id);
      }
    }
    
    // Get from competitions (stored in JSON, need to parse)
    const compStmt = this.db.prepare('SELECT categories_json FROM competitions');
    const compRows = compStmt.all() as any[];
    for (const row of compRows) {
      if (row.categories_json) {
        try {
          const categories = JSON.parse(row.categories_json);
          categories.forEach((cat: any) => {
            cat.matches?.forEach((match: any) => {
              match.competitors?.forEach((competitor: any) => {
                const id = (competitor.competitorId || '').toString();
                if (id && id !== '0' && id !== '') {
                  judokaIds.add(id);
                }
              });
            });
          });
        } catch {
          // Invalid JSON, skip
        }
      }
    }
    
    return judokaIds;
  }

  // Delegate complex query methods - same logic as JsonStorage
  getTechniquesFiltered(filters: {
    competitionId?: number;
    techniqueName?: string;
    minScore?: number;
  }) {
    if (!this.db) return [];
    
    let query = 'SELECT * FROM techniques WHERE 1=1';
    const params: any[] = [];
    
    if (filters.competitionId !== undefined) {
      query += ' AND competition_id = ?';
      params.push(filters.competitionId);
    }
    
    if (filters.techniqueName) {
      query += ' AND technique_name LIKE ?';
      params.push(`%${filters.techniqueName}%`);
    }
    
    if (filters.minScore !== undefined) {
      query += ' AND score >= ?';
      params.push(filters.minScore);
    }
    
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    return rows.map(row => ({
      competitor_id: row.competitor_id || undefined,
      competitorId: row.competitor_id || undefined,
      competitor_name: row.competitor_name || undefined,
      competitorName: row.competitor_name || undefined,
      technique_name: row.technique_name,
      techniqueName: row.technique_name,
      technique_type: row.technique_type || undefined,
      techniqueType: row.technique_type || undefined,
      side: row.side || undefined,
      score: row.score || undefined,
      timestamp: row.timestamp || undefined,
      note: row.note || undefined,
      competitionId: row.competition_id || undefined,
      matchContestCode: row.match_contest_code || undefined,
      contestCode: row.match_contest_code || undefined,
      competitionName: row.competition_name || undefined,
      weightClass: row.weight_class || undefined,
      gender: row.gender || undefined,
      eventType: row.event_type || undefined,
      score_group: row.score_group || undefined,
      scoreGroup: row.score_group || undefined,
    }));
  }

  getCompetitionsWithTechniques(): any[] {
    if (!this.db) return [];
    
    const stmt = this.db.prepare(`
      SELECT DISTINCT c.* FROM competitions c
      INNER JOIN techniques t ON c.competition_id = t.competition_id
    `);
    
    const rows = stmt.all() as any[];
    
    return rows.map(row => ({
      id: row.id,
      competitionId: row.competition_id,
      name: row.name,
      date: row.date || undefined,
      location: row.location || undefined,
      eventType: row.event_type || undefined,
      year: row.year || undefined,
      categories: row.categories_json ? JSON.parse(row.categories_json) : [],
    }));
  }

  // Import remaining methods from JsonStorage - these are complex and can be optimized later
  // For now, delegate to in-memory operations after loading
  
  getStats(filters?: any) {
    // Load all data and use same logic as JsonStorage
    // This is a temporary implementation - can be optimized with SQL queries later
    const competitions = this.getAllCompetitions();
    const techniques = this.getAllTechniques();
    
    // Apply filters
    let filteredTechniques = techniques;
    if (filters) {
      if (filters.gender) {
        filteredTechniques = filteredTechniques.filter(t => (t.gender || '').toLowerCase() === filters.gender?.toLowerCase());
      }
      if (filters.weightClass) {
        filteredTechniques = filteredTechniques.filter(t => (t.weightClass || '') === filters.weightClass);
      }
      if (filters.eventType) {
        filteredTechniques = filteredTechniques.filter(t => (t.eventType || '').toLowerCase() === filters.eventType?.toLowerCase());
      }
      if (filters.competitionId) {
        filteredTechniques = filteredTechniques.filter(t => t.competitionId === filters.competitionId);
      }
      if (filters.year) {
        const competitionYearMap = new Map<number, number>();
        competitions.forEach(c => {
          if (c.year && c.id) {
            competitionYearMap.set(c.id, c.year);
          }
        });
        filteredTechniques = filteredTechniques.filter(t => {
          if (!t.competitionId) return false;
          const compYear = competitionYearMap.get(t.competitionId);
          return compYear === filters.year;
        });
      }
      if (filters.heightRange) {
        const heightRange = filters.heightRange;
        filteredTechniques = filteredTechniques.filter(t => {
          const competitorId = (t.competitor_id || t.competitorId || '').toString();
          if (!competitorId) return false;
          
          const profile = this.getJudokaProfile(competitorId);
          if (!profile || !profile.height) return false;
          
          return this.heightMatchesRange(profile.height, heightRange);
        });
      }
    }
    
    // Calculate stats (same logic as JsonStorage)
    const totalTechniques = filteredTechniques.length;
    const totalMatches = competitions.reduce(
      (sum, comp) => sum + (comp.categories || []).reduce((s: number, cat: any) => s + (cat.matches?.length || 0), 0),
      0
    );
    const totalCompetitions = competitions.length;
    
    // Top techniques
    const techniqueCounts: Record<string, { count: number; totalScore: number }> = {};
    filteredTechniques.forEach((tech) => {
      const name = tech.techniqueName || tech.technique_name || 'Unknown';
      if (!techniqueCounts[name]) {
        techniqueCounts[name] = { count: 0, totalScore: 0 };
      }
      techniqueCounts[name].count++;
      techniqueCounts[name].totalScore += tech.score || 0;
    });
    
    const topTechniques = Object.entries(techniqueCounts)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgScore: data.totalScore / data.count,
      }))
      .sort((a, b) => b.count - a.count);
    
    // Competitions by year
    const byYear: Record<number, number> = {};
    competitions.forEach((comp) => {
      if (comp.year) {
        byYear[comp.year] = (byYear[comp.year] || 0) + 1;
      }
    });
    
    const competitionsByYear = Object.entries(byYear)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => b.year - a.year);
    
    // Group techniques by score group
    const byScoreGroup: Record<string, number> = {};
    filteredTechniques.forEach((tech) => {
      const group = tech.score_group || tech.scoreGroup || 'Unknown';
      byScoreGroup[group] = (byScoreGroup[group] || 0) + 1;
    });
    
    const techniquesByScoreGroup = Object.entries(byScoreGroup)
      .map(([group, count]) => ({ group, count }))
      .sort((a, b) => {
        const order: Record<string, number> = { 'Ippon': 1, 'Waza-ari': 2, 'Yuko': 3 };
        const aOrder = order[a.group] || 99;
        const bOrder = order[b.group] || 99;
        return aOrder - bOrder;
      });
    
    // Top techniques by score group
    const topTechniquesByGroup: Record<string, Array<{ name: string; count: number }>> = {};
    
    ['Ippon', 'Waza-ari', 'Yuko'].forEach((group) => {
      const groupTechniques = filteredTechniques.filter((tech) => 
        (tech.score_group || tech.scoreGroup) === group
      );
      
      const techniqueCounts: Record<string, number> = {};
      groupTechniques.forEach((tech) => {
        const name = tech.techniqueName || tech.technique_name || 'Unknown';
        techniqueCounts[name] = (techniqueCounts[name] || 0) + 1;
      });
      
      const all = Object.entries(techniqueCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      
      if (all.length > 0) {
        topTechniquesByGroup[group] = all;
      }
    });
    
    return {
      totalCompetitions,
      totalMatches,
      totalTechniques,
      topTechniques,
      competitionsByYear,
      techniquesByScoreGroup,
      topTechniquesByGroup,
    };
  }

  getTechniqueStats(filters?: any) {
    // Similar to getStats but for technique-specific stats
    const techniques = this.getAllTechniques();
    
    let filteredTechniques = techniques;
    if (filters) {
      if (filters.gender) {
        filteredTechniques = filteredTechniques.filter(t => (t.gender || '').toLowerCase() === filters.gender?.toLowerCase());
      }
      if (filters.weightClass) {
        filteredTechniques = filteredTechniques.filter(t => (t.weightClass || '') === filters.weightClass);
      }
      if (filters.eventType) {
        filteredTechniques = filteredTechniques.filter(t => (t.eventType || '').toLowerCase() === filters.eventType?.toLowerCase());
      }
      if (filters.competitionId) {
        filteredTechniques = filteredTechniques.filter(t => t.competitionId === filters.competitionId);
      }
      if (filters.year) {
        const competitions = this.getAllCompetitions();
        const competitionYearMap = new Map<number, number>();
        competitions.forEach(c => {
          if (c.year && c.id) {
            competitionYearMap.set(c.id, c.year);
          }
        });
        filteredTechniques = filteredTechniques.filter(t => {
          if (!t.competitionId) return false;
          const compYear = competitionYearMap.get(t.competitionId);
          return compYear === filters.year;
        });
      }
      if (filters.heightRange) {
        const heightRange = filters.heightRange;
        filteredTechniques = filteredTechniques.filter(t => {
          const competitorId = (t.competitor_id || t.competitorId || '').toString();
          if (!competitorId) return false;
          
          const profile = this.getJudokaProfile(competitorId);
          if (!profile || !profile.height) return false;
          
          return this.heightMatchesRange(profile.height, heightRange);
        });
      }
      if (filters.scoreGroup) {
        filteredTechniques = filteredTechniques.filter(t => {
          const scoreGroup = t.score_group || t.scoreGroup || 'Unknown';
          return scoreGroup === filters.scoreGroup;
        });
      }
    }
    
    const techniqueStats: Record<string, { total: number; ippon: number; wazaAri: number; yuko: number; avgScore: number }> = {};
    
    filteredTechniques.forEach((tech) => {
      const name = tech.techniqueName || tech.technique_name || 'Unknown';
      const scoreGroup = tech.score_group || tech.scoreGroup || 'Unknown';
      const score = tech.score || 0;
      
      if (!techniqueStats[name]) {
        techniqueStats[name] = { total: 0, ippon: 0, wazaAri: 0, yuko: 0, avgScore: 0 };
      }
      
      techniqueStats[name].total++;
      
      if (scoreGroup === 'Ippon') techniqueStats[name].ippon++;
      else if (scoreGroup === 'Waza-ari') techniqueStats[name].wazaAri++;
      else if (scoreGroup === 'Yuko') techniqueStats[name].yuko++;
      
      techniqueStats[name].avgScore = (techniqueStats[name].avgScore * (techniqueStats[name].total - 1) + score) / techniqueStats[name].total;
    });
    
    const stats = Object.entries(techniqueStats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
    
    return stats;
  }

  getAvailableFilters() {
    const techniques = this.getAllTechniques();
    const competitions = this.getAllCompetitions();
    
    const genders = new Set(techniques.map(t => t.gender).filter(Boolean));
    const weightClasses = new Set(techniques.map(t => t.weightClass).filter(Boolean));
    const eventTypes = new Set(techniques.map(t => t.eventType).filter(Boolean));
    const years = Array.from(new Set(competitions.map(c => c.year).filter(Boolean))).sort((a, b) => (b || 0) - (a || 0));
    
    // Get available height ranges from judoka profiles using percentiles
    const heights = new Set<number>();
    techniques.forEach(t => {
      const competitorId = (t.competitor_id || t.competitorId || '').toString();
      if (competitorId) {
        const profile = this.getJudokaProfile(competitorId);
        if (profile?.height) {
          heights.add(profile.height);
        }
      }
    });
    
    // Create percentile-based height ranges (same logic as JsonStorage)
    const heightRanges: string[] = [];
    const sortedHeights = Array.from(heights).sort((a, b) => a - b);
    if (sortedHeights.length > 0) {
      const len = sortedHeights.length;
      const p10 = sortedHeights[Math.floor(len * 0.1)];
      const p25 = sortedHeights[Math.floor(len * 0.25)];
      const p35 = sortedHeights[Math.floor(len * 0.35)];
      const p40 = sortedHeights[Math.floor(len * 0.4)];
      const p50 = sortedHeights[Math.floor(len * 0.5)];
      const p60 = sortedHeights[Math.floor(len * 0.6)];
      const p70 = sortedHeights[Math.floor(len * 0.7)];
      const p75 = sortedHeights[Math.floor(len * 0.75)];
      const p80 = sortedHeights[Math.floor(len * 0.8)];
      const p90 = sortedHeights[Math.floor(len * 0.9)];
      
      if (p10 !== undefined) heightRanges.push(`<${p10}`);
      if (p10 !== undefined && p25 !== undefined && p10 !== p25) heightRanges.push(`${p10}-${p25}`);
      if (p25 !== undefined && p50 !== undefined && p25 !== p50) {
        if (p35 !== undefined && p25 !== p35) heightRanges.push(`${p25}-${p35}`);
        if (p40 !== undefined && p35 !== undefined && p35 !== p40) heightRanges.push(`${p35}-${p40}`);
        if (p40 !== undefined && p50 !== undefined && p40 !== p50) heightRanges.push(`${p40}-${p50}`);
      }
      if (p50 !== undefined) {
        if (p50 < 182 && (p75 === undefined || 182 < p75)) {
          if (p50 !== 182) heightRanges.push(`${p50}-182`);
          if (p75 !== undefined && 182 !== p75) heightRanges.push(`182-${p75}`);
        } else {
          if (p50 !== undefined && p60 !== undefined && p50 !== p60) heightRanges.push(`${p50}-${p60}`);
          if (p60 !== undefined && p70 !== undefined && p60 !== p70) heightRanges.push(`${p60}-${p70}`);
          if (p70 !== undefined && p75 !== undefined && p70 !== p75) heightRanges.push(`${p70}-${p75}`);
        }
      }
      if (p75 !== undefined && p80 !== undefined && p75 !== p80) heightRanges.push(`${p75}-${p80}`);
      if (p80 !== undefined && p90 !== undefined && p80 !== p90) heightRanges.push(`${p80}-${p90}`);
      if (p90 !== undefined) heightRanges.push(`>=${p90}`);
    }
    
    return {
      genders: Array.from(genders) as string[],
      weightClasses: Array.from(weightClasses) as string[],
      eventTypes: Array.from(eventTypes) as string[],
      years: years as number[],
      heightRanges: heightRanges,
    };
  }

  private heightMatchesRange(height: number, range: string): boolean {
    if (range.startsWith('>=')) {
      const min = parseInt(range.replace('>=', ''), 10);
      return height >= min;
    }
    
    if (range.startsWith('<')) {
      const max = parseInt(range.replace('<', ''), 10);
      return height < max;
    }
    
    if (range.endsWith('+')) {
      const min = parseInt(range.replace('+', ''), 10);
      return height >= min;
    }
    
    const [min, max] = range.split('-').map(s => parseInt(s, 10));
    if (isNaN(min) || isNaN(max)) return false;
    return height >= min && height < max;
  }

  getJudokaList(searchTerm?: string) {
    const techniques = this.getAllTechniques();
    const judokaMap = new Map<string, { id: string; name: string; totalTechniques: number }>();
    
    techniques.forEach(t => {
      const id = t.competitor_id || t.competitorId || '';
      const name = t.competitor_name || t.competitorName || 'Unknown';
      
      if (id && name !== 'Unknown') {
        if (!judokaMap.has(id)) {
          judokaMap.set(id, { id, name, totalTechniques: 0 });
        }
        judokaMap.get(id)!.totalTechniques++;
      }
    });
    
    let judokaList = Array.from(judokaMap.values());
    
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      judokaList = judokaList.filter(j => j.name.toLowerCase().includes(search));
    }
    
    return judokaList.sort((a, b) => b.totalTechniques - a.totalTechniques);
  }

  getJudokaStats(judokaId: string, filters?: any) {
    const techniques = this.getAllTechniques();
    const competitions = this.getAllCompetitions();
    
    let filteredTechniques = techniques.filter(t => {
      const id = t.competitor_id || t.competitorId || '';
      return id === judokaId;
    });
    
    if (filters) {
      if (filters.gender) {
        filteredTechniques = filteredTechniques.filter(t => (t.gender || '').toLowerCase() === filters.gender?.toLowerCase());
      }
      if (filters.weightClass) {
        filteredTechniques = filteredTechniques.filter(t => (t.weightClass || '') === filters.weightClass);
      }
      if (filters.eventType) {
        filteredTechniques = filteredTechniques.filter(t => (t.eventType || '').toLowerCase() === filters.eventType?.toLowerCase());
      }
      if (filters.competitionId) {
        filteredTechniques = filteredTechniques.filter(t => t.competitionId === filters.competitionId);
      }
    }
    
    if (filteredTechniques.length === 0) {
      return null;
    }
    
    const name = filteredTechniques[0].competitor_name || filteredTechniques[0].competitorName || 'Unknown';
    const totalTechniques = filteredTechniques.length;
    
    const competitionMap = new Map<number, { name: string; year?: number }>();
    competitions.forEach(c => {
      if (c.id) {
        competitionMap.set(c.id, { name: c.name, year: c.year });
      }
    });
    
    const matchMap = new Map<string, { opponent?: string; opponentCountry?: string; competitionId?: number }>();
    competitions.forEach(comp => {
      (comp.categories || []).forEach((cat: any) => {
        (cat.matches || []).forEach((match: any) => {
          if (match.contestCode && match.competitors && match.competitors.length > 0) {
            const opponentData = match.competitors.find((c: any) => {
              const cId = c.competitorId?.toString() || '';
              const jId = judokaId.toString();
              return cId !== jId && cId !== '' && jId !== '';
            });
            
            if (opponentData) {
              matchMap.set(match.contestCode, { 
                opponent: opponentData.name, 
                opponentCountry: opponentData.country || opponentData.countryCode,
                competitionId: comp.id 
              });
            }
          }
        });
      });
    });
    
    const wazaStats: Record<string, { count: number; totalScore: number; ippon: number; wazaAri: number; yuko: number; matches: Map<string, any> }> = {};
    
    filteredTechniques.forEach(tech => {
      const wazaName = tech.techniqueName || tech.technique_name || 'Unknown';
      const scoreGroup = tech.score_group || tech.scoreGroup || 'Unknown';
      const score = tech.score || 0;
      const contestCode = tech.matchContestCode || tech.contestCode;
      const competitionId = tech.competitionId;
      
      if (!wazaStats[wazaName]) {
        wazaStats[wazaName] = { count: 0, totalScore: 0, ippon: 0, wazaAri: 0, yuko: 0, matches: new Map() };
      }
      
      wazaStats[wazaName].count++;
      wazaStats[wazaName].totalScore += score;
      
      if (contestCode && !wazaStats[wazaName].matches.has(contestCode)) {
        const matchInfo = matchMap.get(contestCode);
        const compInfo = competitionId ? competitionMap.get(competitionId) : undefined;
        wazaStats[wazaName].matches.set(contestCode, {
          contestCode,
          opponent: matchInfo?.opponent,
          opponentCountry: matchInfo?.opponentCountry,
          competitionName: compInfo?.name || tech.competitionName,
          year: compInfo?.year,
          scoreGroup: scoreGroup !== 'Unknown' ? scoreGroup : undefined,
        });
      }
      
      if (scoreGroup === 'Ippon') wazaStats[wazaName].ippon++;
      else if (scoreGroup === 'Waza-ari') wazaStats[wazaName].wazaAri++;
      else if (scoreGroup === 'Yuko') wazaStats[wazaName].yuko++;
    });
    
    const wazaBreakdown = Object.entries(wazaStats)
      .map(([name, data]) => ({
        name,
        count: data.count,
        percentage: (data.count / totalTechniques * 100).toFixed(1),
        avgScore: data.totalScore / data.count,
        ippon: data.ippon,
        wazaAri: data.wazaAri,
        yuko: data.yuko,
        matches: Array.from(data.matches.values()),
      }))
      .sort((a, b) => b.count - a.count);
    
    const profile = this.getJudokaProfile(judokaId);
    
    return {
      id: judokaId,
      name,
      totalTechniques,
      wazaBreakdown,
      height: profile?.height,
      age: profile?.age,
      country: profile?.country,
    };
  }

  getMatchesForTechnique(techniqueName: string, filters?: any) {
    let filteredTechniques = this.getAllTechniques().filter(t => {
      const name = t.techniqueName || t.technique_name || 'Unknown';
      return name.toLowerCase() === techniqueName.toLowerCase();
    });
    
    if (filters) {
      if (filters.gender) {
        filteredTechniques = filteredTechniques.filter(t => (t.gender || '').toLowerCase() === filters.gender?.toLowerCase());
      }
      if (filters.weightClass) {
        filteredTechniques = filteredTechniques.filter(t => (t.weightClass || '') === filters.weightClass);
      }
      if (filters.eventType) {
        filteredTechniques = filteredTechniques.filter(t => (t.eventType || '').toLowerCase() === filters.eventType?.toLowerCase());
      }
      if (filters.competitionId) {
        filteredTechniques = filteredTechniques.filter(t => t.competitionId === filters.competitionId);
      }
      if (filters.year) {
        const competitions = this.getAllCompetitions();
        const competitionYearMap = new Map<number, number>();
        competitions.forEach(c => {
          if (c.year && c.id) {
            competitionYearMap.set(c.id, c.year);
          }
        });
        filteredTechniques = filteredTechniques.filter(t => {
          if (!t.competitionId) return false;
          const compYear = competitionYearMap.get(t.competitionId);
          return compYear === filters.year;
        });
      }
      if (filters.scoreGroup) {
        filteredTechniques = filteredTechniques.filter(t => {
          const scoreGroup = t.score_group || t.scoreGroup || 'Unknown';
          return scoreGroup === filters.scoreGroup;
        });
      }
      if (filters.heightRange) {
        const heightRange = filters.heightRange;
        filteredTechniques = filteredTechniques.filter(t => {
          const competitorId = (t.competitor_id || t.competitorId || '').toString();
          if (!competitorId) return false;
          
          const profile = this.getJudokaProfile(competitorId);
          if (!profile || !profile.height) return false;
          
          return this.heightMatchesRange(profile.height, heightRange);
        });
      }
    }
    
    const matchMap = new Map<string, any>();
    
    filteredTechniques.forEach(t => {
      const contestCode = t.matchContestCode;
      if (contestCode && !matchMap.has(contestCode)) {
        matchMap.set(contestCode, {
          matchUrl: `https://judobase.ijf.org/#/competition/contest/${contestCode}`,
          contestCode,
          competition: t.competitionName,
          competitor: t.competitor_name || t.competitorName,
          score: t.score,
          scoreGroup: t.score_group || t.scoreGroup,
          timestamp: t.timestamp,
        });
      }
    });
    
    return Array.from(matchMap.values());
  }

  getTopJudokaForTechnique(techniqueName: string, limit: number = 10, filters?: any) {
    let filteredTechniques = this.getAllTechniques().filter(t => {
      const name = t.techniqueName || t.technique_name || 'Unknown';
      return name.toLowerCase() === techniqueName.toLowerCase();
    });
    
    if (filters) {
      if (filters.gender) {
        filteredTechniques = filteredTechniques.filter(t => (t.gender || '').toLowerCase() === filters.gender?.toLowerCase());
      }
      if (filters.weightClass) {
        filteredTechniques = filteredTechniques.filter(t => (t.weightClass || '') === filters.weightClass);
      }
      if (filters.eventType) {
        filteredTechniques = filteredTechniques.filter(t => (t.eventType || '').toLowerCase() === filters.eventType?.toLowerCase());
      }
      if (filters.competitionId) {
        filteredTechniques = filteredTechniques.filter(t => t.competitionId === filters.competitionId);
      }
      if (filters.year) {
        const competitions = this.getAllCompetitions();
        const competitionYearMap = new Map<number, number>();
        competitions.forEach(c => {
          if (c.year && c.id) {
            competitionYearMap.set(c.id, c.year);
          }
        });
        filteredTechniques = filteredTechniques.filter(t => {
          if (!t.competitionId) return false;
          const compYear = competitionYearMap.get(t.competitionId);
          return compYear === filters.year;
        });
      }
      if (filters.scoreGroup) {
        filteredTechniques = filteredTechniques.filter(t => {
          const scoreGroup = t.score_group || t.scoreGroup || 'Unknown';
          return scoreGroup === filters.scoreGroup;
        });
      }
      if (filters.heightRange) {
        const heightRange = filters.heightRange;
        filteredTechniques = filteredTechniques.filter(t => {
          const competitorId = (t.competitor_id || t.competitorId || '').toString();
          if (!competitorId) return false;
          
          const profile = this.getJudokaProfile(competitorId);
          if (!profile || !profile.height) return false;
          
          return this.heightMatchesRange(profile.height, heightRange);
        });
      }
    }
    
    const judokaStats: Record<string, { id: string; name: string; count: number; matches: Set<string> }> = {};
    
    filteredTechniques.forEach(tech => {
      const judokaId = (tech.competitor_id || tech.competitorId || '').toString();
      const judokaName = tech.competitor_name || tech.competitorName || 'Unknown';
      const contestCode = tech.matchContestCode || tech.contestCode;
      
      if (judokaId && judokaName !== 'Unknown') {
        if (!judokaStats[judokaId]) {
          judokaStats[judokaId] = { id: judokaId, name: judokaName, count: 0, matches: new Set() };
        }
        judokaStats[judokaId].count++;
        if (contestCode) {
          judokaStats[judokaId].matches.add(contestCode);
        }
      }
    });
    
    const topJudoka = Object.values(judokaStats)
      .map(j => ({
        id: j.id,
        name: j.name,
        count: j.count,
        matchCount: j.matches.size,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
    
    return topJudoka;
  }
}
