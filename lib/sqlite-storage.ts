/**
 * SQLite-based storage for competitions, matches, and techniques
 * Uses better-sqlite3 for native Node.js SQLite implementation
 */

import Database from 'better-sqlite3';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'judostats.db');

// Type definitions
export interface StoredCompetition {
  id: number;
  competitionId: number;
  name: string;
  date?: string;
  location?: string;
  eventType?: string;
  year?: number;
  categories: StoredCategory[];
}

export interface StoredCategory {
  id: number;
  competitionId: number;
  categoryId: number;
  weightClass?: string;
  gender?: string;
  matches: StoredMatch[];
}

export interface StoredMatch {
  id: number;
  categoryId: number;
  matchNumber?: string;
  contestCode: string;
  competitors: CompetitorData[];
  techniques: TechniqueData[];
}

export interface CompetitorData {
  competitorId: number;
  name: string;
  countryCode?: string;
  country?: string;
  isWinner: boolean;
  score: number;
}

export interface TechniqueData {
  competitorId?: number;
  competitorName?: string;
  techniqueName: string;
  techniqueType?: string;
  side?: string;
  score: number;
  timestamp?: string;
  note?: string;
}

export interface JudokaProfile {
  id: string;
  name?: string;
  height?: number; // in cm
  age?: number;
  country?: string;
  lastUpdated?: string;
}

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory already exists or permission issue
  }
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export class SqliteStorage {
  private db: Database.Database | null = null;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes default
  private readonly CACHE_TTL_UNFILTERED_MS = 60 * 60 * 1000; // 1 hour for unfiltered queries
  private competitionsCache: any[] | null = null; // Cache for parsed competitions

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
        technique_category TEXT,
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
        score_group TEXT,
        opponent_id TEXT,
        opponent_name TEXT,
        opponent_country TEXT
      )
    `);

    // Migrate existing tables to add new columns if they don't exist
    this.migrateTable();

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

    // Stats summary table for pre-calculated aggregations
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stats_summary (
        filter_hash TEXT PRIMARY KEY,
        stats_json TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better query performance
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_techniques_competition_id ON techniques(competition_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_techniques_technique_name ON techniques(technique_name)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_techniques_competitor_id ON techniques(competitor_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_techniques_opponent_id ON techniques(opponent_id)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_competitions_year ON competitions(year)`);
    // Indexes for filter columns to optimize getStats/getTechniqueStats queries
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_techniques_gender ON techniques(gender)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_techniques_weight_class ON techniques(weight_class)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_techniques_event_type ON techniques(event_type)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_techniques_technique_category ON techniques(technique_category)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_techniques_score_group ON techniques(score_group)`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_judoka_profiles_height ON judoka_profiles(height)`);
  }

  private createStatsSummaryTable() {
    if (!this.db) return;
    // Table is already created in createTables(), this method is for clarity
    // and potential future use if we need to recreate it
  }

  private getFilterHash(filters?: any): string {
    // Create a hash from filter parameters
    if (!filters || Object.keys(filters).length === 0) {
      return 'no-filters';
    }
    // Sort keys for consistent hashing
    const sortedKeys = Object.keys(filters).sort();
    const filterString = sortedKeys.map(key => `${key}:${filters[key]}`).join('|');
    // Simple hash function (could use crypto.createHash for production)
    let hash = 0;
    for (let i = 0; i < filterString.length; i++) {
      const char = filterString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `filters-${Math.abs(hash)}`;
  }

  refreshStatsSummary(filters?: any) {
    if (!this.db) return;
    
    try {
      const filterHash = this.getFilterHash(filters);
      const stats = this.getStats(filters);
      const statsJson = JSON.stringify(stats);
      
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO stats_summary (filter_hash, stats_json, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run(filterHash, statsJson);
    } catch (error) {
      console.error('Error refreshing stats summary:', error);
    }
  }

  getStatsFromSummary(filters?: any): any | null {
    if (!this.db) return null;
    
    try {
      const filterHash = this.getFilterHash(filters);
      const stmt = this.db.prepare('SELECT stats_json FROM stats_summary WHERE filter_hash = ?');
      const row = stmt.get(filterHash) as { stats_json: string } | undefined;
      
      if (row) {
        return JSON.parse(row.stats_json);
      }
    } catch (error) {
      console.error('Error getting stats from summary:', error);
    }
    
    return null;
  }

  private migrateTable() {
    if (!this.db) return;

    try {
      // Check if new columns exist by trying to query them
      const testQuery = this.db.prepare('SELECT technique_category, opponent_id, opponent_name, opponent_country FROM techniques LIMIT 1');
      testQuery.get();
    } catch (error: any) {
      // Columns don't exist, add them
      if (error.message?.includes('no such column')) {
        console.log('Migrating techniques table to add new columns...');
        try {
          this.db.exec('ALTER TABLE techniques ADD COLUMN technique_category TEXT');
        } catch (e) {
          // Column might already exist, ignore
        }
        try {
          this.db.exec('ALTER TABLE techniques ADD COLUMN opponent_id TEXT');
        } catch (e) {
          // Column might already exist, ignore
        }
        try {
          this.db.exec('ALTER TABLE techniques ADD COLUMN opponent_name TEXT');
        } catch (e) {
          // Column might already exist, ignore
        }
        try {
          this.db.exec('ALTER TABLE techniques ADD COLUMN opponent_country TEXT');
        } catch (e) {
          // Column might already exist, ignore
        }
        console.log('Migration complete');
      }
    }
  }

  async load() {
    await this.init();
    // Database is already loaded, no need to load JSON
  }

  async save() {
    // better-sqlite3 writes synchronously, so no explicit save needed
    // But we can ensure the database is initialized
    await this.init();
    
    // Persist judoka profiles from in-memory Map to database
    if (this.db && this.judokaProfiles.size > 0) {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO judoka_profiles 
        (id, name, height, age, country, last_updated)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      for (const [id, profile] of this.judokaProfiles.entries()) {
        stmt.run(
          profile.id || id,
          profile.name || null,
          profile.height || null,
          profile.age || null,
          profile.country || null,
          profile.lastUpdated || new Date().toISOString(),
        );
      }
    }
  }

  getAllCompetitions(): any[] {
    if (!this.db) return [];
    
    // Return cached competitions if available
    if (this.competitionsCache !== null) {
      return this.competitionsCache;
    }
    
    const stmt = this.db.prepare('SELECT * FROM competitions');
    const rows = stmt.all() as any[];
    
    const competitions = rows.map(row => ({
      id: row.id,
      competitionId: row.competition_id,
      name: row.name,
      date: row.date || undefined,
      location: row.location || undefined,
      eventType: row.event_type || undefined,
      year: row.year || undefined,
      categories: row.categories_json ? JSON.parse(row.categories_json) : [],
    }));
    
    // Cache the parsed competitions
    this.competitionsCache = competitions;
    
    return competitions;
  }

  invalidateCompetitionsCache() {
    this.competitionsCache = null;
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
    
    // Invalidate competitions cache when competitions are added
    this.invalidateCompetitionsCache();
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
    
    return rows.map(row => this.mapRowToTechnique(row));
  }

  addTechniqueWithoutSave(technique: any) {
    if (!this.db) return;
    
    const stmt = this.db.prepare(`
      INSERT INTO techniques 
      (competitor_id, competitor_name, technique_name, technique_type, technique_category, side, score, 
       timestamp, note, competition_id, match_contest_code, competition_name, 
       weight_class, gender, event_type, score_group,
       opponent_id, opponent_name, opponent_country)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      technique.competitor_id || technique.competitorId || null,
      technique.competitor_name || technique.competitorName || null,
      technique.technique_name || technique.techniqueName || '',
      technique.technique_type || technique.techniqueType || null,
      technique.technique_category || technique.techniqueCategory || 'tachi-waza',
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
      (technique.opponent_id || technique.opponentId) ? String(technique.opponent_id || technique.opponentId) : null,
      technique.opponent_name || technique.opponentName || null,
      technique.opponent_country || technique.opponentCountry || null,
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
      (competitor_id, competitor_name, technique_name, technique_type, technique_category, side, score, 
       timestamp, note, competition_id, match_contest_code, competition_name, 
       weight_class, gender, event_type, score_group,
       opponent_id, opponent_name, opponent_country)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    // Use transaction for better performance
    const insertMany = this.db.transaction((techniques: any[]) => {
      for (const technique of techniques) {
        stmt.run(
          technique.competitor_id || technique.competitorId || null,
          technique.competitor_name || technique.competitorName || null,
          technique.technique_name || technique.techniqueName || '',
          technique.technique_type || technique.techniqueType || null,
          technique.technique_category || technique.techniqueCategory || 'tachi-waza',
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
          (technique.opponent_id || technique.opponentId) ? String(technique.opponent_id || technique.opponentId) : null,
          technique.opponent_name || technique.opponentName || null,
          technique.opponent_country || technique.opponentCountry || null,
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
      technique_category: row.technique_category || 'tachi-waza',
      techniqueCategory: row.technique_category || 'tachi-waza',
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
      opponent_id: row.opponent_id || undefined,
      opponentId: row.opponent_id || undefined,
      opponent_name: row.opponent_name || undefined,
      opponentName: row.opponent_name || undefined,
      opponent_country: row.opponent_country || undefined,
      opponentCountry: row.opponent_country || undefined,
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
  
  /**
   * Builds a SQL query with WHERE clauses for filtering techniques.
   * 
   * This approach filters at the database level rather than loading all techniques
   * into memory and filtering in JavaScript. Benefits:
   * - Less memory usage (only filtered rows loaded)
   * - Leverages database indexes for faster filtering
   * - Scales better as dataset grows
   * 
   * Trade-offs:
   * - More complex queries with JOINs for year/height filtering
   * - Requires proper indexes for optimal performance
   * - For very small datasets (<1000 rows), JavaScript filtering might be simpler
   */
  private buildFilteredTechniquesQuery(filters?: any): { query: string; params: any[] } {
    if (!this.db) {
      return { query: '', params: [] };
    }

    // Start with base query - exclude Fusen-Gachi
    let query = `
      SELECT t.* FROM techniques t
      WHERE LOWER(t.technique_name) NOT IN ('fusen-gachi', 'fusen gachi')
    `;
    const params: any[] = [];

    // Add joins if needed for filtering
    let needsCompetitionJoin = false;
    let needsProfileJoin = false;

    if (filters) {
      if (filters.gender) {
        query += ' AND LOWER(t.gender) = LOWER(?)';
        params.push(filters.gender);
      }
      if (filters.weightClass) {
        query += ' AND t.weight_class = ?';
        params.push(filters.weightClass);
      }
      if (filters.eventType) {
        query += ' AND LOWER(t.event_type) = LOWER(?)';
        params.push(filters.eventType);
      }
      if (filters.competitionId) {
        query += ' AND t.competition_id = ?';
        params.push(filters.competitionId);
      }
      if (filters.year) {
        needsCompetitionJoin = true;
        query += ' AND c.year = ?';
        params.push(filters.year);
      }
      if (filters.heightRange) {
        needsProfileJoin = true;
        const heightRange = filters.heightRange;
        const [min, max] = this.parseHeightRange(heightRange);
        if (min !== undefined) {
          query += ' AND p.height >= ?';
          params.push(min);
        }
        if (max !== undefined) {
          query += ' AND p.height < ?';
          params.push(max);
        }
      }
      if (filters.techniqueCategory) {
        const category = filters.techniqueCategory;
        // Map display names to stored values
        const categoryMap: Record<string, string> = {
          'nage-waza': 'tachi-waza',
          'osaekomi-waza': 'osaekomi',
          'shime-waza': 'shime-waza',
          'kansetsu-waza': 'kansetsu-waza',
        };
        const storedCategory = categoryMap[category] || category;
        query += ' AND COALESCE(t.technique_category, \'tachi-waza\') = ?';
        params.push(storedCategory);
      }
    }

    // Add joins if needed
    if (needsCompetitionJoin) {
      query = query.replace('FROM techniques t', 'FROM techniques t INNER JOIN competitions c ON t.competition_id = c.competition_id');
    }
    if (needsProfileJoin) {
      query = query.replace('FROM techniques t', 'FROM techniques t INNER JOIN judoka_profiles p ON t.competitor_id = p.id');
      if (needsCompetitionJoin) {
        // Both joins needed - adjust the query
        query = query.replace(
          'FROM techniques t INNER JOIN competitions c ON t.competition_id = c.competition_id',
          'FROM techniques t INNER JOIN competitions c ON t.competition_id = c.competition_id INNER JOIN judoka_profiles p ON t.competitor_id = p.id'
        );
      }
    }

    return { query, params };
  }

  private parseHeightRange(heightRange: string): [number | undefined, number | undefined] {
    if (heightRange.startsWith('<')) {
      const max = parseInt(heightRange.substring(1).trim());
      return [undefined, max];
    } else if (heightRange.startsWith('≥') || heightRange.startsWith('>=')) {
      const min = parseInt(heightRange.replace(/[≥=]/g, '').trim());
      return [min, undefined];
    } else if (heightRange.includes('-')) {
      const [minStr, maxStr] = heightRange.split('-');
      const min = parseInt(minStr.trim());
      const max = parseInt(maxStr.trim());
      return [min, max + 1]; // +1 because we use < for max
    }
    return [undefined, undefined];
  }

  private getCacheKey(operation: string, filters?: any): string {
    const filterStr = filters ? JSON.stringify(filters) : 'no-filters';
    return `${operation}:${filterStr}`;
  }

  private getFromCache<T>(key: string, ttlMs: number = this.CACHE_TTL_MS): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const age = Date.now() - entry.timestamp;
    if (age > ttlMs) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private clearCache(): void {
    this.cache.clear();
  }

  private buildFilteredTechniquesQueryForAggregation(filters?: any): { query: string; params: any[] } {
    if (!this.db) {
      return { query: '', params: [] };
    }

    // Start with base query - exclude Fusen-Gachi
    let query = `
      FROM techniques t
      WHERE LOWER(t.technique_name) NOT IN ('fusen-gachi', 'fusen gachi')
    `;
    const params: any[] = [];

    // Add joins if needed for filtering
    let needsCompetitionJoin = false;
    let needsProfileJoin = false;

    if (filters) {
      if (filters.gender) {
        query += ' AND LOWER(t.gender) = LOWER(?)';
        params.push(filters.gender);
      }
      if (filters.weightClass) {
        query += ' AND t.weight_class = ?';
        params.push(filters.weightClass);
      }
      if (filters.eventType) {
        query += ' AND LOWER(t.event_type) = LOWER(?)';
        params.push(filters.eventType);
      }
      if (filters.competitionId) {
        query += ' AND t.competition_id = ?';
        params.push(filters.competitionId);
      }
      if (filters.year) {
        needsCompetitionJoin = true;
        query += ' AND c.year = ?';
        params.push(filters.year);
      }
      if (filters.heightRange) {
        needsProfileJoin = true;
        const heightRange = filters.heightRange;
        const [min, max] = this.parseHeightRange(heightRange);
        if (min !== undefined) {
          query += ' AND p.height >= ?';
          params.push(min);
        }
        if (max !== undefined) {
          query += ' AND p.height < ?';
          params.push(max);
        }
      }
      if (filters.techniqueCategory) {
        const category = filters.techniqueCategory;
        // Map display names to stored values
        const categoryMap: Record<string, string> = {
          'nage-waza': 'tachi-waza',
          'osaekomi-waza': 'osaekomi',
          'shime-waza': 'shime-waza',
          'kansetsu-waza': 'kansetsu-waza',
        };
        const storedCategory = categoryMap[category] || category;
        query += ' AND COALESCE(t.technique_category, \'tachi-waza\') = ?';
        params.push(storedCategory);
      }
    }

    // Add joins if needed
    if (needsCompetitionJoin) {
      query = query.replace('FROM techniques t', 'FROM techniques t INNER JOIN competitions c ON t.competition_id = c.competition_id');
    }
    if (needsProfileJoin) {
      query = query.replace('FROM techniques t', 'FROM techniques t INNER JOIN judoka_profiles p ON t.competitor_id = p.id');
      if (needsCompetitionJoin) {
        // Both joins needed - adjust the query
        query = query.replace(
          'FROM techniques t INNER JOIN competitions c ON t.competition_id = c.competition_id',
          'FROM techniques t INNER JOIN competitions c ON t.competition_id = c.competition_id INNER JOIN judoka_profiles p ON t.competitor_id = p.id'
        );
      }
    }

    return { query, params };
  }

  getStats(filters?: any) {
    if (!this.db) {
      return {
        totalCompetitions: 0,
        totalMatches: 0,
        totalTechniques: 0,
        totalJudoka: 0,
        topTechniques: [],
        competitionsByYear: [],
        techniquesByScoreGroup: [],
        topTechniquesByGroup: {},
      };
    }

    // Check cache first
    const cacheKey = this.getCacheKey('stats', filters);
    const hasFilters = filters && Object.keys(filters).length > 0;
    const ttl = hasFilters ? this.CACHE_TTL_MS : this.CACHE_TTL_UNFILTERED_MS;
    const cached = this.getFromCache<any>(cacheKey, ttl);
    if (cached) {
      return cached;
    }

    // Build base WHERE clause for filtering
    const { query: whereClause, params } = this.buildFilteredTechniquesQueryForAggregation(filters);
    
    // Get total techniques count (aggregated in SQL)
    const totalTechniquesQuery = `SELECT COUNT(*) as count ${whereClause}`;
    const totalTechniquesResult = this.db.prepare(totalTechniquesQuery).get(...params) as { count: number };
    const totalTechniques = totalTechniquesResult.count;
    
    // Get total unique judoka (aggregated in SQL)
    const totalJudokaQuery = `SELECT COUNT(DISTINCT t.competitor_id) as count ${whereClause} AND t.competitor_id IS NOT NULL AND t.competitor_id != ''`;
    const totalJudokaResult = this.db.prepare(totalJudokaQuery).get(...params) as { count: number };
    const totalJudoka = totalJudokaResult.count || 0;
    
    // Get top techniques with counts and average scores (aggregated in SQL)
    const topTechniquesQuery = `
      SELECT 
        t.technique_name as name,
        COUNT(*) as count,
        AVG(t.score) as avgScore
      ${whereClause}
      GROUP BY t.technique_name
      ORDER BY count DESC
      LIMIT 50
    `;
    const topTechniquesRows = this.db.prepare(topTechniquesQuery).all(...params) as Array<{ name: string; count: number; avgScore: number }>;
    const topTechniques = topTechniquesRows.map(row => ({
      name: row.name || 'Unknown',
      count: row.count,
      avgScore: row.avgScore || 0,
    }));
    
    // Get techniques by score group (aggregated in SQL)
    const scoreGroupQuery = `
      SELECT 
        COALESCE(t.score_group, 'Unknown') as score_group,
        COUNT(*) as count
      ${whereClause}
      GROUP BY score_group
      ORDER BY 
        CASE score_group
          WHEN 'Ippon' THEN 1
          WHEN 'Waza-ari' THEN 2
          WHEN 'Yuko' THEN 3
          ELSE 99
        END
    `;
    const scoreGroupRows = this.db.prepare(scoreGroupQuery).all(...params) as Array<{ score_group: string; count: number }>;
    const techniquesByScoreGroup = scoreGroupRows.map(row => ({
      group: row.score_group,
      count: row.count,
    }));
    
    // Get top techniques by score group (aggregated in SQL)
    const topTechniquesByGroup: Record<string, Array<{ name: string; count: number }>> = {};
    
    for (const group of ['Ippon', 'Waza-ari', 'Yuko']) {
      const groupQuery = `
        SELECT 
          t.technique_name as name,
          COUNT(*) as count
        ${whereClause}
        AND COALESCE(t.score_group, 'Unknown') = ?
        GROUP BY t.technique_name
        ORDER BY count DESC
        LIMIT 20
      `;
      const groupRows = this.db.prepare(groupQuery).all(...params, group) as Array<{ name: string; count: number }>;
      if (groupRows.length > 0) {
        topTechniquesByGroup[group] = groupRows.map(row => ({
          name: row.name || 'Unknown',
          count: row.count,
        }));
      }
    }
    
    // Get competitions for match counting and year stats
    const competitions = this.getAllCompetitions();
    const totalMatches = competitions.reduce(
      (sum, comp) => sum + (comp.categories || []).reduce((s: number, cat: any) => s + (cat.matches?.length || 0), 0),
      0
    );
    const totalCompetitions = competitions.length;
    
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

    const result = {
      totalCompetitions,
      totalMatches,
      totalTechniques,
      totalJudoka,
      topTechniques,
      competitionsByYear,
      techniquesByScoreGroup,
      topTechniquesByGroup,
    };

    // Cache the result
    this.setCache(cacheKey, result);

    return result;
  }

  getTechniqueStats(filters?: any) {
    if (!this.db) {
      return [];
    }

    // Check cache first
    const cacheKey = this.getCacheKey('technique-stats', filters);
    const hasFilters = filters && Object.keys(filters).length > 0;
    const ttl = hasFilters ? this.CACHE_TTL_MS : this.CACHE_TTL_UNFILTERED_MS;
    const cached = this.getFromCache<any[]>(cacheKey, ttl);
    if (cached) {
      return cached;
    }

    // Build base WHERE clause for filtering
    let { query: whereClause, params: baseParams } = this.buildFilteredTechniquesQueryForAggregation(filters);
    
    // Add scoreGroup filter if specified
    let params = [...baseParams];
    if (filters?.scoreGroup) {
      whereClause += ' AND t.score_group = ?';
      params.push(filters.scoreGroup);
    }
    
    // Aggregate technique stats in SQL
    const techniqueStatsQuery = `
      SELECT 
        t.technique_name as name,
        COUNT(*) as total,
        SUM(CASE WHEN COALESCE(t.score_group, 'Unknown') = 'Ippon' THEN 1 ELSE 0 END) as ippon,
        SUM(CASE WHEN COALESCE(t.score_group, 'Unknown') = 'Waza-ari' THEN 1 ELSE 0 END) as wazaAri,
        SUM(CASE WHEN COALESCE(t.score_group, 'Unknown') = 'Yuko' THEN 1 ELSE 0 END) as yuko,
        AVG(t.score) as avgScore
      ${whereClause}
      GROUP BY t.technique_name
      ORDER BY total DESC
    `;
    
    const statsRows = this.db.prepare(techniqueStatsQuery).all(...params) as Array<{
      name: string;
      total: number;
      ippon: number;
      wazaAri: number;
      yuko: number;
      avgScore: number;
    }>;
    
    const stats = statsRows.map(row => ({
      name: row.name || 'Unknown',
      total: row.total,
      ippon: row.ippon || 0,
      wazaAri: row.wazaAri || 0,
      yuko: row.yuko || 0,
      avgScore: row.avgScore || 0,
    }));
    
    // Cache the result
    this.setCache(cacheKey, stats);

    return stats;
  }

  getAvailableFilters() {
    if (!this.db) {
      return {
        genders: [],
        weightClasses: [],
        eventTypes: [],
        techniqueCategories: [],
        years: [],
        heightRanges: [],
      };
    }

    // Check cache first (filters don't change often)
    const cacheKey = this.getCacheKey('available-filters');
    const cached = this.getFromCache<any>(cacheKey, this.CACHE_TTL_UNFILTERED_MS);
    if (cached) {
      return cached;
    }

    // Use SQL DISTINCT queries instead of loading all data
    const gendersQuery = `
      SELECT DISTINCT gender 
      FROM techniques 
      WHERE gender IS NOT NULL AND gender != ''
      ORDER BY gender
    `;
    const genders = (this.db.prepare(gendersQuery).all() as Array<{ gender: string }>)
      .map(row => row.gender);

    const weightClassesQuery = `
      SELECT DISTINCT weight_class 
      FROM techniques 
      WHERE weight_class IS NOT NULL AND weight_class != ''
      ORDER BY weight_class
    `;
    const weightClasses = (this.db.prepare(weightClassesQuery).all() as Array<{ weight_class: string }>)
      .map(row => row.weight_class);

    const eventTypesQuery = `
      SELECT DISTINCT event_type 
      FROM techniques 
      WHERE event_type IS NOT NULL AND event_type != ''
      ORDER BY event_type
    `;
    const eventTypes = (this.db.prepare(eventTypesQuery).all() as Array<{ event_type: string }>)
      .map(row => row.event_type);

    const techniqueCategoriesQuery = `
      SELECT DISTINCT COALESCE(technique_category, 'tachi-waza') as category
      FROM techniques 
      WHERE technique_category IS NOT NULL OR technique_category IS NULL
      ORDER BY category
    `;
    const techniqueCategories = (this.db.prepare(techniqueCategoriesQuery).all() as Array<{ category: string }>)
      .map(row => row.category);

    const yearsQuery = `
      SELECT DISTINCT year 
      FROM competitions 
      WHERE year IS NOT NULL 
      ORDER BY year DESC
    `;
    const years = (this.db.prepare(yearsQuery).all() as Array<{ year: number }>)
      .map(row => row.year);

    // Get heights using SQL JOIN instead of N+1 queries
    const heightsQuery = `
      SELECT DISTINCT p.height
      FROM techniques t
      INNER JOIN judoka_profiles p ON t.competitor_id = p.id
      WHERE p.height IS NOT NULL
        AND t.competitor_id IS NOT NULL
        AND t.competitor_id != ''
        AND LOWER(t.technique_name) NOT IN ('fusen-gachi', 'fusen gachi')
      ORDER BY p.height
    `;
    const heightsRows = this.db.prepare(heightsQuery).all() as Array<{ height: number }>;
    const heights = heightsRows.map(row => row.height);
    
    // Create percentile-based height ranges (same logic as before)
    const heightRanges: string[] = [];
    if (heights.length > 0) {
      const len = heights.length;
      const p10 = heights[Math.floor(len * 0.1)];
      const p25 = heights[Math.floor(len * 0.25)];
      const p35 = heights[Math.floor(len * 0.35)];
      const p40 = heights[Math.floor(len * 0.4)];
      const p50 = heights[Math.floor(len * 0.5)];
      const p60 = heights[Math.floor(len * 0.6)];
      const p70 = heights[Math.floor(len * 0.7)];
      const p75 = heights[Math.floor(len * 0.75)];
      const p80 = heights[Math.floor(len * 0.8)];
      const p90 = heights[Math.floor(len * 0.9)];
      
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
    
    const result = {
      genders: genders as string[],
      weightClasses: weightClasses as string[],
      eventTypes: eventTypes as string[],
      techniqueCategories: techniqueCategories as string[],
      years: years as number[],
      heightRanges: heightRanges,
    };

    // Cache the result
    this.setCache(cacheKey, result);

    return result;
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

  getTopJudokaStats() {
    if (!this.db) {
      return {
        mostIppons: [],
        mostTechniques: [],
        hardestToScoreAgainst: [],
        mostCompetitions: [],
      };
    }

    // Most ippons
    const mostIppons = this.db.prepare(`
      SELECT 
        t.competitor_id as id,
        t.competitor_name as name,
        COUNT(*) as ippon_count
      FROM techniques t
      WHERE t.score_group = 'Ippon'
        AND LOWER(t.technique_name) NOT IN ('fusen-gachi', 'fusen gachi')
        AND t.competitor_id IS NOT NULL
        AND t.competitor_id != ''
      GROUP BY t.competitor_id, t.competitor_name
      ORDER BY ippon_count DESC
      LIMIT 10
    `).all() as Array<{ id: string; name: string; ippon_count: number }>;

    // Most techniques performed
    const mostTechniques = this.db.prepare(`
      SELECT 
        t.competitor_id as id,
        t.competitor_name as name,
        COUNT(*) as technique_count
      FROM techniques t
      WHERE LOWER(t.technique_name) NOT IN ('fusen-gachi', 'fusen gachi')
        AND t.competitor_id IS NOT NULL
        AND t.competitor_id != ''
      GROUP BY t.competitor_id, t.competitor_name
      ORDER BY technique_count DESC
      LIMIT 10
    `).all() as Array<{ id: string; name: string; technique_count: number }>;

    // Hardest to score against (fewest techniques received, must have at least 5 competitions)
    // Start with all judoka who participated in competitions, then count techniques received
    const hardestToScoreAgainst = this.db.prepare(`
      SELECT 
        judoka.competitor_id as id,
        judoka.competitor_name as name,
        judoka.competition_count,
        COALESCE(received.techniques_received, 0) as techniques_received
      FROM (
        SELECT 
          competitor_id,
          competitor_name,
          COUNT(DISTINCT competition_id) as competition_count
        FROM techniques
        WHERE LOWER(technique_name) NOT IN ('fusen-gachi', 'fusen gachi')
          AND competitor_id IS NOT NULL
          AND competitor_id != ''
        GROUP BY competitor_id, competitor_name
        HAVING competition_count >= 5
      ) judoka
      LEFT JOIN (
        SELECT 
          opponent_id,
          COUNT(*) as techniques_received
        FROM techniques
        WHERE LOWER(technique_name) NOT IN ('fusen-gachi', 'fusen gachi')
          AND opponent_id IS NOT NULL
          AND opponent_id != ''
        GROUP BY opponent_id
      ) received ON judoka.competitor_id = received.opponent_id
      ORDER BY techniques_received ASC, judoka.competition_count DESC
      LIMIT 10
    `).all() as Array<{ id: string; name: string; competition_count: number; techniques_received: number }>;

    // Most competitions participated in
    const mostCompetitions = this.db.prepare(`
      SELECT 
        t.competitor_id as id,
        t.competitor_name as name,
        COUNT(DISTINCT t.competition_id) as competition_count,
        COUNT(*) as technique_count
      FROM techniques t
      WHERE LOWER(t.technique_name) NOT IN ('fusen-gachi', 'fusen gachi')
        AND t.competitor_id IS NOT NULL
        AND t.competitor_id != ''
      GROUP BY t.competitor_id, t.competitor_name
      ORDER BY competition_count DESC, technique_count DESC
      LIMIT 10
    `).all() as Array<{ id: string; name: string; competition_count: number; technique_count: number }>;

    return {
      mostIppons: mostIppons.map(j => ({
        id: j.id,
        name: j.name || 'Unknown',
        count: j.ippon_count,
      })),
      mostTechniques: mostTechniques.map(j => ({
        id: j.id,
        name: j.name || 'Unknown',
        count: j.technique_count,
      })),
      hardestToScoreAgainst: hardestToScoreAgainst.map(j => ({
        id: j.id,
        name: j.name || 'Unknown',
        competitions: j.competition_count,
        techniquesReceived: j.techniques_received,
      })),
      mostCompetitions: mostCompetitions.map(j => ({
        id: j.id,
        name: j.name || 'Unknown',
        competitions: j.competition_count,
        techniques: j.technique_count,
      })),
    };
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
    if (!this.db) return null;
    
    // Use SQL WHERE clause to filter in database (much more efficient)
    let query = `
      SELECT * FROM techniques 
      WHERE competitor_id = ? 
      AND LOWER(technique_name) NOT IN ('fusen-gachi', 'fusen gachi')
    `;
    const params: any[] = [String(judokaId)];
    
    // Add additional filters
    if (filters?.gender) {
      query += ' AND LOWER(gender) = ?';
      params.push(filters.gender.toLowerCase());
    }
    if (filters?.weightClass) {
      query += ' AND weight_class = ?';
      params.push(filters.weightClass);
    }
    if (filters?.eventType) {
      query += ' AND LOWER(event_type) = ?';
      params.push(filters.eventType.toLowerCase());
    }
    if (filters?.competitionId) {
      query += ' AND competition_id = ?';
      params.push(filters.competitionId);
    }
    
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    // Map rows to technique objects
    const filteredTechniques = rows.map(row => this.mapRowToTechnique(row));
    
    if (filteredTechniques.length === 0) {
      return null;
    }
    
    const competitions = this.getAllCompetitions();
    const name = filteredTechniques[0].competitor_name || filteredTechniques[0].competitorName || 'Unknown';
    const totalTechniques = filteredTechniques.length;
    
    const competitionMap = new Map<number, { name: string; year?: number }>();
    competitions.forEach(c => {
      if (c.id) {
        competitionMap.set(c.id, { name: c.name, year: c.year });
      }
    });
    
    // Build match map from techniques (which now have opponent info directly)
    const matchMap = new Map<string, { opponent?: string; opponentCountry?: string; competitionId?: number }>();
    filteredTechniques.forEach(tech => {
      const contestCode = tech.matchContestCode || tech.contestCode;
      const competitionId = tech.competitionId;
      
      if (contestCode && !matchMap.has(contestCode)) {
        matchMap.set(contestCode, {
          opponent: tech.opponent_name || tech.opponentName,
          opponentCountry: tech.opponent_country || tech.opponentCountry,
          competitionId: competitionId,
        });
      }
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
          weightClass: tech.weightClass || tech.weight_class,
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
    
    // Favorite technique is the most frequently performed one
    const favoriteTechnique = wazaBreakdown.length > 0 ? wazaBreakdown[0].name : undefined;
    
    // Count unique competitions
    const uniqueCompetitions = new Set<number>();
    filteredTechniques.forEach(tech => {
      if (tech.competitionId) {
        uniqueCompetitions.add(tech.competitionId);
      }
    });
    const competitionCount = uniqueCompetitions.size;
    
    return {
      id: judokaId,
      name,
      totalTechniques,
      competitionCount,
      wazaBreakdown,
      favoriteTechnique,
      height: profile?.height,
      age: profile?.age,
      country: profile?.country,
    };
  }

  private mapRowToTechnique(row: any): any {
    return {
      competitor_id: row.competitor_id || undefined,
      competitorId: row.competitor_id || undefined,
      competitor_name: row.competitor_name || undefined,
      competitorName: row.competitor_name || undefined,
      technique_name: row.technique_name,
      techniqueName: row.technique_name,
      technique_type: row.technique_type || undefined,
      techniqueType: row.technique_type || undefined,
      technique_category: row.technique_category || 'tachi-waza',
      techniqueCategory: row.technique_category || 'tachi-waza',
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
      opponent_id: row.opponent_id || undefined,
      opponentId: row.opponent_id || undefined,
      opponent_name: row.opponent_name || undefined,
      opponentName: row.opponent_name || undefined,
      opponent_country: row.opponent_country || undefined,
      opponentCountry: row.opponent_country || undefined,
    };
  }

  getTechniquesReceivedByJudoka(judokaId: string, filters?: any) {
    if (!this.db) return { totalTechniques: 0, wazaBreakdown: [] };
    
    // Use SQL WHERE clause to filter in database (much more efficient)
    // Handle both string and numeric opponent_id values (SQLite TEXT can match numbers)
    const judokaIdStr = String(judokaId);
    let query = `
      SELECT * FROM techniques 
      WHERE opponent_id IS NOT NULL 
      AND opponent_id != ''
      AND (opponent_id = ? OR CAST(opponent_id AS INTEGER) = ?)
      AND LOWER(technique_name) NOT IN ('fusen-gachi', 'fusen gachi')
    `;
    const params: any[] = [judokaIdStr, parseInt(judokaIdStr, 10)]; // Try both string and number
    
    // Add additional filters
    if (filters?.gender) {
      query += ' AND LOWER(gender) = ?';
      params.push(filters.gender.toLowerCase());
    }
    if (filters?.weightClass) {
      query += ' AND weight_class = ?';
      params.push(filters.weightClass);
    }
    if (filters?.eventType) {
      query += ' AND LOWER(event_type) = ?';
      params.push(filters.eventType.toLowerCase());
    }
    if (filters?.competitionId) {
      query += ' AND competition_id = ?';
      params.push(filters.competitionId);
    }
    
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    
    // Map rows to technique objects
    const filteredTechniques = rows.map(row => this.mapRowToTechnique(row));
    
    if (filteredTechniques.length === 0) {
      return {
        totalTechniques: 0,
        wazaBreakdown: [],
      };
    }
    
    const totalTechniques = filteredTechniques.length;
    
    // Get competitions for mapping (only load once)
    const competitions = this.getAllCompetitions();
    const competitionMap = new Map<number, { name: string; year?: number }>();
    competitions.forEach(c => {
      if (c.id) {
        competitionMap.set(c.id, { name: c.name, year: c.year });
      }
    });
    
    // Build match map from techniques
    const matchMap = new Map<string, { competitor?: string; competitorCountry?: string; competitionId?: number }>();
    filteredTechniques.forEach(tech => {
      const contestCode = tech.matchContestCode || tech.contestCode;
      const competitionId = tech.competitionId;
      
      if (contestCode && !matchMap.has(contestCode)) {
        matchMap.set(contestCode, {
          competitor: tech.competitor_name || tech.competitorName,
          competitorCountry: tech.competitor_country || tech.competitorCountry,
          competitionId: competitionId,
        });
      }
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
          opponent: matchInfo?.competitor, // The competitor who performed the technique
          opponentCountry: matchInfo?.competitorCountry,
          competitionName: compInfo?.name || tech.competitionName,
          year: compInfo?.year,
          scoreGroup: scoreGroup !== 'Unknown' ? scoreGroup : undefined,
          weightClass: tech.weightClass || tech.weight_class,
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
    
    return {
      totalTechniques,
      wazaBreakdown,
    };
  }

  getMatchesForTechnique(techniqueName: string, filters?: any) {
    // Filter out walkovers (Fusen-Gachi) from display, but keep in DB
    let filteredTechniques = this.getAllTechniques().filter(t => {
      const name = t.techniqueName || t.technique_name || 'Unknown';
      const nameLower = name.toLowerCase();
      return nameLower === techniqueName.toLowerCase() && nameLower !== 'fusen-gachi' && nameLower !== 'fusen gachi';
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
      if (filters.techniqueCategory) {
        const category = filters.techniqueCategory;
        // Map display names to stored values
        const categoryMap: Record<string, string> = {
          'nage-waza': 'tachi-waza',
          'osaekomi-waza': 'osaekomi',
          'shime-waza': 'shime-waza',
          'kansetsu-waza': 'kansetsu-waza',
        };
        const storedCategory = categoryMap[category] || category;
        filteredTechniques = filteredTechniques.filter(t => {
          const techCategory = t.technique_category || t.techniqueCategory || 'tachi-waza';
          return techCategory === storedCategory;
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
    // Filter out walkovers (Fusen-Gachi) from display, but keep in DB
    let filteredTechniques = this.getAllTechniques().filter(t => {
      const name = t.techniqueName || t.technique_name || 'Unknown';
      const nameLower = name.toLowerCase();
      return nameLower === techniqueName.toLowerCase() && nameLower !== 'fusen-gachi' && nameLower !== 'fusen gachi';
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
      if (filters.techniqueCategory) {
        const category = filters.techniqueCategory;
        // Map display names to stored values
        const categoryMap: Record<string, string> = {
          'nage-waza': 'tachi-waza',
          'osaekomi-waza': 'osaekomi',
          'shime-waza': 'shime-waza',
          'kansetsu-waza': 'kansetsu-waza',
        };
        const storedCategory = categoryMap[category] || category;
        filteredTechniques = filteredTechniques.filter(t => {
          const techCategory = t.technique_category || t.techniqueCategory || 'tachi-waza';
          return techCategory === storedCategory;
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
