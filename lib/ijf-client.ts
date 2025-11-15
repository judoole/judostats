/**
 * IJF API Client
 * Fetches competition data from https://data.ijf.org/api/get_json
 */

const IJF_API_BASE = 'https://data.ijf.org/api/get_json';

export interface Competition {
  id_competition: number;
  nm: string;
  dt_end?: string;
  loc?: string;
  ev_typ?: string;
  yr?: number;
}

export interface Category {
  id_weight: number;
  nm: string;
  gender?: string;
}

export interface Match {
  code?: string;
  contest_code_long?: string;
  nm?: string;
  weight?: string;
  [key: string]: any;
}

export interface MatchDetails {
  code: string;
  person1?: Person;
  person2?: Person;
  events?: Event[];
  [key: string]: any;
}

export interface Person {
  id_person: number;
  nm: string;
  cnt?: string;
  cntr?: string;
  weight?: string;
  res?: number;
}

export interface Event {
  type?: string;
  id_contest_event_type?: string | number;
  name?: string;
  pts?: number;
  time?: string;
  tags?: any[];
  actors?: any[];
  [key: string]: any;
}

export interface Technique {
  name: string;
  type?: string;
  side?: string;
}

export interface CompetitorInfo {
  family_name: string;
  middle_name?: string;
  given_name: string;
  family_name_local?: string;
  middle_name_local?: string;
  given_name_local?: string;
  short_name?: string;
  gender?: string;
  height?: string; // in cm
  birth_date?: string;
  dob_year?: string;
  age?: string;
  country?: string;
  id_country?: string;
  country_short?: string;
  coach?: string;
  belt?: string;
  ftechique?: string; // favorite technique
  side?: string;
  categories?: string[];
  personal_picture?: string;
  [key: string]: any;
}

export class IJFClient {
  private async fetchJson(params: Record<string, string>): Promise<any> {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      queryParams.append(key, value);
    });

    const url = `${IJF_API_BASE}?${queryParams.toString()}`;
    console.log('Fetching:', url);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching from IJF API:', error);
      return null;
    }
  }

  async getAllCompetitions(): Promise<Competition[]> {
    const data = await this.fetchJson({ 'params[action]': 'competition.get_list' });
    return Array.isArray(data) ? data : [];
  }

  async getCompetitionCategories(competitionId: number): Promise<Category[]> {
    const data = await this.fetchJson({
      'params[action]': 'competition.categories_full',
      'params[id_competition]': competitionId.toString(),
    });
    
    // The API returns an object with gender keys, not an array
    // Format: {"1": {"categories": {"1": "-60", ...}, "gender": "m"}, "2": {...}}
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const categories: Category[] = [];
      Object.values(data).forEach((genderGroup: any) => {
        if (genderGroup && genderGroup.categories) {
          Object.entries(genderGroup.categories).forEach(([id, name]) => {
            categories.push({
              id_weight: parseInt(id),
              nm: name as string,
              gender: genderGroup.gender,
            });
          });
        }
      });
      return categories;
    }
    
    return Array.isArray(data) ? data : [];
  }

  async getMatches(competitionId: number, categoryId: number): Promise<Match[]> {
    const data = await this.fetchJson({
      'params[action]': 'contest.find',
      'params[id_competition]': competitionId.toString(),
      'params[id_weight]': categoryId.toString(),
      'params[order_by]': 'cnum',
    });
    
    // The API returns matches in a "contests" field
    if (data && typeof data === 'object' && !Array.isArray(data) && data.contests) {
      return Array.isArray(data.contests) ? data.contests : [];
    }
    
    return Array.isArray(data) ? data : [];
  }

  async getMatchDetails(contestCode: string): Promise<MatchDetails | null> {
    const data = await this.fetchJson({
      'params[action]': 'contest.find',
      'params[contest_code]': contestCode,
      'params[part]': 'info,score_list,media,events',
    });
    
    // The API returns details in a "contests" array
    if (data && typeof data === 'object' && !Array.isArray(data) && data.contests) {
      const contests = Array.isArray(data.contests) ? data.contests : [];
      return contests.length > 0 ? contests[0] : null;
    }
    
    return data && typeof data === 'object' ? data : null;
  }

  matchHasTechniques(matchDetails: MatchDetails): boolean {
    if (!matchDetails.events || !Array.isArray(matchDetails.events)) {
      return false;
    }

    // Check if any event has tags (which indicate technique data)
    return matchDetails.events.some((event: Event) => {
      return event.tags && Array.isArray(event.tags) && event.tags.length > 0;
    });
  }

  extractTechniques(matchDetails: MatchDetails): any[] {
    if (!matchDetails.events || !Array.isArray(matchDetails.events)) {
      return [];
    }

    const techniques: any[] = [];

    for (const event of matchDetails.events) {
      // Skip events without tags
      if (!event.tags || !Array.isArray(event.tags) || event.tags.length === 0) {
        continue;
      }

      // Extract technique name from tags (find the non-direction tag)
      // Filter out: directions (left/right), penalties (shido), and Osaekomi tags
      const techniqueTags = event.tags.filter((tag: any) => 
        tag.code_short !== 'left' && 
        tag.code_short !== 'right' &&
        tag.code_short !== 'osaekomi' &&
        !tag.group_name?.toLowerCase().includes('shido') &&
        !tag.group_name?.toLowerCase().includes('non-combativity')
      );
      
      if (techniqueTags.length === 0) {
        continue;
      }

      const techniqueName = techniqueTags[0].name;
      
      // Skip "Cancel" events (score cancellations)
      if (techniqueName.toLowerCase().startsWith('cancel')) {
        continue;
      }
      
      // Skip Osaekomi techniques (holding/pinning techniques)
      const isOsaekomi = [
        'kesa-gatame', 'yoko-shiho-gatame', 'kata-gatame', 'kami-shiho-gatame',
        'tate-shiho-gatame', 'kuzure-kami-shiho-gatame', 'kuzure-kesa-gatame',
        'ushiro-kesa-gatame', 'ura-gatame',
        'juji-gatame', 'hadaka-jime', 'katame-jime', 'katate-jime',
        'okuri-eri-jime', 'sankaku-jime', 'sankaku-gatame',
        'ude-garami', 'ashi-garami', 'ude-jime',
        'jigoku-jime', 'sode-guruma-jime'
      ].includes(techniqueName.toLowerCase());
      
      if (isOsaekomi) {
        continue;
      }
      const directionTags = event.tags.filter((tag: any) => 
        tag.code_short === 'left' || tag.code_short === 'right'
      );
      const side = directionTags.length > 0 ? directionTags[0].name : '';

      // Extract competitor info from actors
      const actor = event.actors?.[0];
      const competitorId = actor?.id_person;
      const competitorName = actor ? `${actor.family_name} ${actor.given_name}` : '';
      
      const score = this.getScoreFromEventType(event);
      const scoreGroup = this.getScoreGroupFromEvent(event, score);

      techniques.push({
        event_type: event.id_contest_event_type || event.type,
        timestamp: event.time_real || event.time,
        score: score,
        score_group: scoreGroup,
        note: event.custom_title || '',
        competitor_id: competitorId,
        competitor_name: competitorName,
        technique_name: techniqueName,
        technique_type: '',  // Could extract from tags if needed
        side: side,
      });
    }

    return techniques;
  }

  private getScoreFromEventType(event: Event): number {
    // Look for score information in tags based on group_name
    if (!event.tags || !Array.isArray(event.tags)) {
      return 0;
    }

    for (const tag of event.tags) {
      const groupName = tag.group_name?.toLowerCase() || '';
      
      if (groupName.includes('ippon')) return 10;  // Ippon = 10 points
      if (groupName.includes('waza-ari')) return 7;  // Waza-ari = 7 points  
      if (groupName.includes('waza-ari-awasete-ippon')) return 10;  // Ippon by accumulation
      if (groupName.includes('yuko')) return 5;  // Yuko = 5 points
      if (groupName.includes('shido')) return -1;  // Shido (penalty) = -1 point
    }
    
    return 0;
  }

  private getScoreGroupFromEvent(event: Event, score: number): string {
    // Determine score group from tags
    if (!event.tags || !Array.isArray(event.tags)) {
      return score > 0 ? 'Unknown' : 'Penalty';
    }

    for (const tag of event.tags) {
      const groupName = tag.group_name?.toLowerCase() || '';
      
      if (groupName.includes('ippon')) return 'Ippon';
      if (groupName.includes('waza-ari')) return 'Waza-ari';
      if (groupName.includes('waza-ari-awasete-ippon')) return 'Ippon';  // Ippon by accumulation
      if (groupName.includes('yuko')) return 'Yuko';
      if (groupName.includes('shido')) return 'Penalty';
    }
    
    // Determine group by score value
    if (score === 10) return 'Ippon';
    if (score === 7) return 'Waza-ari';
    if (score === 5) return 'Yuko';
    if (score === -1) return 'Penalty';
    
    return score > 0 ? 'Unknown' : 'Penalty';
  }

  async getCompetitorInfo(personId: number): Promise<CompetitorInfo | null> {
    const data = await this.fetchJson({
      'params[action]': 'competitor.info',
      'params[id_person]': personId.toString(),
    });
    
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data as CompetitorInfo;
    }
    
    return null;
  }
}

