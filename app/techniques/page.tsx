'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface Match {
  matchUrl: string;
  contestCode: string;
  competition: string;
  competitor: string;
  score: number;
  scoreGroup: string;
  timestamp?: string;
}

function TechniqueCard({ 
  tech, 
  filters 
}: { 
  tech: AggregatedTechnique; 
  filters: { gender?: string; weightClass?: string; eventType?: string; competitionId?: number | null };
}) {
  const [showMatches, setShowMatches] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const handleLoadMatches = async () => {
    if (showMatches) {
      setShowMatches(false);
      return;
    }

    setLoadingMatches(true);
    try {
      const filterParams = new URLSearchParams();
      if (filters.gender) filterParams.append('gender', filters.gender);
      if (filters.weightClass) filterParams.append('weightClass', filters.weightClass);
      if (filters.eventType) filterParams.append('eventType', filters.eventType);
      if (filters.competitionId) filterParams.append('competitionId', filters.competitionId.toString());

      const { data } = await axios.get(`/api/techniques/${encodeURIComponent(tech.name)}?${filterParams.toString()}`);
      setMatches(data);
      setShowMatches(true);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoadingMatches(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-xl font-bold mb-4">{tech.name}</h3>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total</span>
          <span className="font-semibold">{tech.totalCount}x</span>
        </div>
        
        {tech.ippon > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-red-600">Ippon</span>
            <span className="font-semibold">{tech.ippon}x</span>
          </div>
        )}
        
        {tech.wazaAri > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-orange-600">Waza-ari</span>
            <span className="font-semibold">{tech.wazaAri}x</span>
          </div>
        )}
        
        {tech.yuko > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-blue-600">Yuko</span>
            <span className="font-semibold">{tech.yuko}x</span>
          </div>
        )}
      </div>

      <button
        onClick={handleLoadMatches}
        className="mt-4 text-blue-600 hover:text-blue-800 font-semibold text-sm"
        disabled={loadingMatches}
      >
        {loadingMatches ? 'Loading...' : showMatches ? 'Hide Matches' : `View Matches (${tech.totalCount})`}
      </button>

      {showMatches && matches.length > 0 && (
        <div className="mt-4 border-t pt-4 space-y-2 max-h-64 overflow-y-auto">
          <div className="text-sm font-semibold text-gray-700 mb-2">
            Match Links ({matches.length} unique matches)
          </div>
          {matches.map((match, i) => (
            <a
              key={i}
              href={match.matchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              • {match.competitor} - {match.competition} ({match.scoreGroup})
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function TechniqueCardList({ 
  techniques, 
  selectedGender, 
  selectedWeightClass, 
  selectedEventType, 
  selectedCompetition 
}: { 
  techniques: AggregatedTechnique[]; 
  selectedGender: string;
  selectedWeightClass: string;
  selectedEventType: string;
  selectedCompetition: number | null;
}) {
  const filters = {
    gender: selectedGender || undefined,
    weightClass: selectedWeightClass || undefined,
    eventType: selectedEventType || undefined,
    competitionId: selectedCompetition || undefined,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {techniques.map((tech, i) => (
        <TechniqueCard key={i} tech={tech} filters={filters} />
      ))}
    </div>
  );
}

interface AggregatedTechnique {
  name: string;
  totalCount: number;
  ippon: number;
  wazaAri: number;
  yuko: number;
  avgScore: number;
}

interface Competition {
  id: number;
  name: string;
  year?: number;
}

const fetchCompetitions = async (): Promise<Competition[]> => {
  const { data } = await axios.get('/api/competitions');
  return data;
};

export default function TechniquesPage() {
  const [selectedCompetition, setSelectedCompetition] = useState<number | null>(null);
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedWeightClass, setSelectedWeightClass] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: competitions } = useQuery({
    queryKey: ['competitions'],
    queryFn: fetchCompetitions,
  });

  // Build query URL with filters
  const filterParams = new URLSearchParams();
  if (selectedCompetition) filterParams.append('competitionId', selectedCompetition.toString());
  if (selectedGender) filterParams.append('gender', selectedGender);
  if (selectedWeightClass) filterParams.append('weightClass', selectedWeightClass);
  if (selectedEventType) filterParams.append('eventType', selectedEventType);
  
  const { data: response, isLoading } = useQuery({
    queryKey: ['techniqueStats', selectedCompetition, selectedGender, selectedWeightClass, selectedEventType],
    queryFn: async () => {
      const { data } = await axios.get(`/api/technique-stats?${filterParams.toString()}`);
      return data;
    },
    refetchInterval: 5000,
  });

  const techniques = response?.stats || [];
  const availableFilters = response?.availableFilters || { genders: [], weightClasses: [], eventTypes: [] };

  // Filter techniques based on search term
  let aggregatedTechniques: AggregatedTechnique[] = [];

  if (techniques) {
    aggregatedTechniques = techniques
      .map((tech: any) => ({
        name: tech.name,
        totalCount: tech.total,
        ippon: tech.ippon,
        wazaAri: tech.wazaAri,
        yuko: tech.yuko,
        avgScore: tech.avgScore,
      }))
      .filter((tech) => 
        !searchTerm || tech.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-xl">Loading techniques...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Throws & Scores (Nage-waza)</h1>
        {aggregatedTechniques.length > 0 && (
          <div className="text-xl font-semibold text-gray-600">
            {aggregatedTechniques.length} unique techniques
          </div>
        )}
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search techniques..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border rounded-lg flex-1"
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <select
            value={selectedCompetition || ''}
            onChange={(e) => setSelectedCompetition(e.target.value ? parseInt(e.target.value) : null)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Competitions</option>
            {competitions?.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name} ({comp.year})
              </option>
            ))}
          </select>
          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Genders</option>
            {availableFilters.genders.map((g) => (
              <option key={g} value={g}>
                {g === 'm' ? 'Male' : g === 'f' ? 'Female' : g}
              </option>
            ))}
          </select>
          <select
            value={selectedWeightClass}
            onChange={(e) => setSelectedWeightClass(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Weight Classes</option>
            {availableFilters.weightClasses.map((wc) => (
              <option key={wc} value={wc}>
                {wc}
              </option>
            ))}
          </select>
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Event Types</option>
            {availableFilters.eventTypes.map((et) => (
              <option key={et} value={et}>
                {et}
              </option>
            ))}
          </select>
        </div>
      </div>

      <TechniqueCardList 
        techniques={aggregatedTechniques}
        selectedGender={selectedGender}
        selectedWeightClass={selectedWeightClass}
        selectedEventType={selectedEventType}
        selectedCompetition={selectedCompetition}
      />
    </div>
  );
}

