/**
 * JSON-based storage for competitions, matches, and techniques
 */

import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

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

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists or permission issue
  }
}

export class JsonStorage {
  private competitionsPath = path.join(DATA_DIR, 'competitions.json');
  private techniquesPath = path.join(DATA_DIR, 'techniques.json');
  private competitions: StoredCompetition[] = [];
  private techniques: any[] = [];

  async load() {
    await ensureDataDir();

    try {
      const compData = await fs.readFile(this.competitionsPath, 'utf-8');
      this.competitions = JSON.parse(compData);
    } catch {
      this.competitions = [];
    }

    try {
      const techData = await fs.readFile(this.techniquesPath, 'utf-8');
      this.techniques = JSON.parse(techData);
    } catch {
      this.techniques = [];
    }
  }

  async save() {
    await ensureDataDir();

    // Use compact JSON (no pretty printing) to reduce file size
    await fs.writeFile(this.competitionsPath, JSON.stringify(this.competitions));
    await fs.writeFile(this.techniquesPath, JSON.stringify(this.techniques));
  }

  getAllCompetitions(): StoredCompetition[] {
    return this.competitions;
  }

  getCompetition(id: number): StoredCompetition | undefined {
    return this.competitions.find((c) => c.id === id);
  }

  async addCompetition(competition: StoredCompetition) {
    // Replace existing competition with same ID instead of appending
    const existingIndex = this.competitions.findIndex((c) => c.id === competition.id);
    if (existingIndex !== -1) {
      this.competitions[existingIndex] = competition;
    } else {
      this.competitions.push(competition);
    }
    await this.save();
  }

  updateCompetition(id: number, updater: (comp: StoredCompetition) => StoredCompetition) {
    const index = this.competitions.findIndex((c) => c.id === id);
    if (index !== -1) {
      this.competitions[index] = updater(this.competitions[index]);
    }
  }

  getAllTechniques() {
    return this.techniques;
  }

  async addTechnique(technique: any) {
    this.techniques.push(technique);
    await this.save();
  }

  async addTechniques(techniques: any[]) {
    this.techniques.push(...techniques);
    await this.save();
  }

  async removeTechniquesForCompetition(competitionId: number) {
    this.techniques = this.techniques.filter((t) => t.competitionId !== competitionId);
    await this.save();
  }

  // Get unique competitions that have techniques
  getCompetitionsWithTechniques(): StoredCompetition[] {
    const competitionIds = new Set(this.techniques.map((t) => t.competitionId));
    return this.competitions.filter((c) => competitionIds.has(c.id));
  }

  getTechniquesByCompetition(competitionId: number) {
    return this.techniques.filter((t) => t.competitionId === competitionId);
  }

  getTechniquesFiltered(filters: {
    competitionId?: number;
    techniqueName?: string;
    minScore?: number;
  }) {
    let result = this.techniques;

    if (filters.competitionId !== undefined) {
      result = result.filter((t) => t.competitionId === filters.competitionId);
    }

    if (filters.techniqueName) {
      const search = filters.techniqueName.toLowerCase();
      result = result.filter((t) =>
        (t.techniqueName || t.technique_name)?.toLowerCase().includes(search)
      );
    }

    if (filters.minScore !== undefined) {
      result = result.filter((t) => t.score >= (filters.minScore as number));
    }

    return result;
  }

  getStats(filters?: { gender?: string; weightClass?: string; eventType?: string; competitionId?: number; year?: number }) {
    // Filter techniques based on provided filters
    let filteredTechniques = this.techniques;
    
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
        // Look up year from competitions based on competitionId
        const competitionYearMap = new Map<number, number>();
        this.competitions.forEach(c => {
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
    }

    // Filter competitions if competitionId or year filter is specified
    let filteredCompetitions = this.competitions;
    if (filters?.competitionId) {
      filteredCompetitions = filteredCompetitions.filter(c => c.id === filters.competitionId);
    }
    if (filters?.year) {
      filteredCompetitions = filteredCompetitions.filter(c => c.year === filters.year);
    }

    const totalTechniques = filteredTechniques.length;
    const totalMatches = filteredCompetitions.reduce(
      (sum, comp) => sum + comp.categories.reduce((s, cat) => s + cat.matches.length, 0),
      0
    );
    const totalCompetitions = filteredCompetitions.length;

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
    filteredCompetitions.forEach((comp) => {
      if (comp.year) {
        byYear[comp.year] = (byYear[comp.year] || 0) + 1;
      }
    });

    const competitionsByYear = Object.entries(byYear)
      .map(([year, count]) => ({ year: parseInt(year), count }))
      .sort((a, b) => b.year - a.year);

    // Group techniques by score group (Ippon, Waza-ari, Yuko)
    const byScoreGroup: Record<string, number> = {};
    filteredTechniques.forEach((tech) => {
      const group = tech.score_group || tech.scoreGroup || 'Unknown';
      byScoreGroup[group] = (byScoreGroup[group] || 0) + 1;
    });

    const techniquesByScoreGroup = Object.entries(byScoreGroup)
      .map(([group, count]) => ({ group, count }))
      .sort((a, b) => {
        // Sort: Ippon, Waza-ari, Yuko, then others
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

  getTechniqueStats(filters?: { gender?: string; weightClass?: string; eventType?: string; competitionId?: number; year?: number }) {
    // Filter techniques based on provided filters
    let filteredTechniques = this.techniques;
    
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
        // Look up year from competitions based on competitionId
        const competitionYearMap = new Map<number, number>();
        this.competitions.forEach(c => {
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
    }
    
    // Aggregate techniques by name and score group
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
    const genders = new Set(this.techniques.map(t => t.gender).filter(Boolean));
    const weightClasses = new Set(this.techniques.map(t => t.weightClass).filter(Boolean));
    const eventTypes = new Set(this.techniques.map(t => t.eventType).filter(Boolean));
    const years = Array.from(new Set(this.competitions.map(c => c.year).filter(Boolean))).sort((a, b) => (b || 0) - (a || 0));
    
    return {
      genders: Array.from(genders) as string[],
      weightClasses: Array.from(weightClasses) as string[],
      eventTypes: Array.from(eventTypes) as string[],
      years: years as number[],
    };
  }

  getJudokaList(searchTerm?: string) {
    // Get unique judoka names
    const judokaMap = new Map<string, { id: string; name: string; totalTechniques: number }>();
    
    this.techniques.forEach(t => {
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
    
    // Filter by search term if provided
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      judokaList = judokaList.filter(j => j.name.toLowerCase().includes(search));
    }
    
    // Sort by total techniques (descending)
    return judokaList.sort((a, b) => b.totalTechniques - a.totalTechniques);
  }

  getJudokaStats(judokaId: string, filters?: { gender?: string; weightClass?: string; eventType?: string; competitionId?: number }) {
    // Filter techniques for this judoka
    let filteredTechniques = this.techniques.filter(t => {
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
    
    // Build lookup maps for competitions and matches
    const competitionMap = new Map<number, { name: string; year?: number }>();
    this.competitions.forEach(c => {
      if (c.id) {
        competitionMap.set(c.id, { name: c.name, year: c.year });
      }
    });
    
    const matchMap = new Map<string, { opponent?: string; opponentCountry?: string; competitionId?: number }>();
    this.competitions.forEach(comp => {
      comp.categories?.forEach(cat => {
        cat.matches?.forEach(match => {
          if (match.contestCode && match.competitors && match.competitors.length > 0) {
            // Find the opponent (the competitor who is NOT the judoka)
            const opponentData = match.competitors.find(c => {
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
    
    // Aggregate waza statistics
    const wazaStats: Record<string, { count: number; totalScore: number; ippon: number; wazaAri: number; yuko: number; matches: Map<string, { contestCode: string; opponent?: string; opponentCountry?: string; competitionName?: string; year?: number }> }> = {};
    
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
        matches: Array.from(data.matches.values()).slice(0, 5), // Limit to first 5 matches
      }))
      .sort((a, b) => b.count - a.count);
    
    return {
      id: judokaId,
      name,
      totalTechniques,
      wazaBreakdown,
    };
  }

  getMatchesForTechnique(techniqueName: string, filters?: { gender?: string; weightClass?: string; eventType?: string; competitionId?: number }) {
    let filteredTechniques = this.techniques.filter(t => {
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
    }

    // Group by contest code to get unique matches
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
}
