import { describe, it, expect } from '@jest/globals';
import { IJFClient } from '../lib/ijf-client';

describe('Crawler Integration Tests', () => {
  const client = new IJFClient();

  describe('Competition 3081', () => {
    it('should find category "-66" for males', async () => {
      const categories = await client.getCompetitionCategories(3081);
      const maleMinus66 = categories.find(
        (cat) => cat.nm === '-66' && cat.gender === 'm'
      );
      expect(maleMinus66).toBeDefined();
      expect(maleMinus66?.id_weight).toBe(2);
    });
  });

  describe('Contest 2 for competition 3081', () => {
    it('should find fight with contest_code_long gp_mex2025_0001_m_0066_0021', async () => {
      const matches = await client.getMatches(3081, 2);
      const targetMatch = matches.find(
        (m: any) => m.contest_code_long === 'gp_mex2025_0001_m_0066_0021'
      );
      expect(targetMatch).toBeDefined();
    });
  });

  describe('Fight gp_mex2025_0001_m_0066_0021', () => {
    it('should extract Ko-soto-gari with Waza-ari (score 7) to Right', async () => {
      const matchDetails = await client.getMatchDetails('gp_mex2025_0001_m_0066_0021');
      const techniques = client.extractTechniques(matchDetails);
      
      const koSotoGari = techniques.find(
        (t) => t.technique_name === 'Ko-soto-gari'
      );
      
      expect(koSotoGari).toBeDefined();
      expect(koSotoGari?.score).toBe(7);
      expect(koSotoGari?.side).toBe('Right');
    });

    it('should extract Seoi-nage with Yuko (score 5) to Left', async () => {
      const matchDetails = await client.getMatchDetails('gp_mex2025_0001_m_0066_0021');
      const techniques = client.extractTechniques(matchDetails);
      
      const seoiNage = techniques.find(
        (t) => t.technique_name === 'Seoi-nage'
      );
      
      expect(seoiNage).toBeDefined();
      expect(seoiNage?.score).toBe(5);
      expect(seoiNage?.side).toBe('Left');
    });

    it('should NOT extract Shido penalties (False Attack, Defensive Posture)', async () => {
      const matchDetails = await client.getMatchDetails('gp_mex2025_0001_m_0066_0021');
      const techniques = client.extractTechniques(matchDetails);
      
      const falseAttack = techniques.find(
        (t) => t.technique_name === 'False-Attack'
      );
      const defensivePosture = techniques.find(
        (t) => t.technique_name === 'Defensive-Posture'
      );
      
      expect(falseAttack).toBeUndefined();
      expect(defensivePosture).toBeUndefined();
    });

    it('should extract Ko-uchi-gari with Yuko (score 5) to Left', async () => {
      const matchDetails = await client.getMatchDetails('gp_mex2025_0001_m_0066_0021');
      const techniques = client.extractTechniques(matchDetails);
      
      const koUchiGari = techniques.find(
        (t) => t.technique_name === 'Ko-uchi-gari'
      );
      
      expect(koUchiGari).toBeDefined();
      expect(koUchiGari?.score).toBe(5);
      expect(koUchiGari?.side).toBe('Left');
    });

    it('should extract Yoko-shiho-gatame with Waza-ari-awasete-ippon (score 10) to Left', async () => {
      const matchDetails = await client.getMatchDetails('gp_mex2025_0001_m_0066_0021');
      const techniques = client.extractTechniques(matchDetails);
      
      const yokoShihoGatame = techniques.find(
        (t) => t.technique_name === 'Yoko-shiho-gatame'
      );
      
      expect(yokoShihoGatame).toBeDefined();
      expect(yokoShihoGatame?.score).toBe(10);
      expect(yokoShihoGatame?.side).toBe('Left');
    });

    it('should extract exactly 4 techniques (filtering out penalties)', async () => {
      const matchDetails = await client.getMatchDetails('gp_mex2025_0001_m_0066_0021');
      const techniques = client.extractTechniques(matchDetails);
      
      expect(techniques.length).toBe(4);
    });
  });
});

