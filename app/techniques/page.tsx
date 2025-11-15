'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Link from 'next/link';

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
      setMatches(data.matches || data);
      setShowMatches(true);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoadingMatches(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <Link href={`/techniques/${encodeURIComponent(tech.name)}`} className="group">
        <h3 className="text-lg font-semibold mb-6 text-blue-600 group-hover:text-blue-700 group-hover:underline cursor-pointer transition-colors flex items-center gap-2">
          {tech.name}
          <span className="text-gray-400 group-hover:text-blue-500 text-sm">→</span>
        </h3>
      </Link>
      
      <div className="space-y-2 mb-6">
        <div className="flex justify-between items-center py-2">
          <span className="text-gray-600 text-sm">Total</span>
          <span className="font-medium text-gray-900">{tech.totalCount}x</span>
        </div>
        
        {tech.ippon > 0 && (
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 text-sm">Ippon</span>
            <span className="font-medium text-gray-900">{tech.ippon}x</span>
          </div>
        )}
        
        {tech.wazaAri > 0 && (
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 text-sm">Waza-ari</span>
            <span className="font-medium text-gray-900">{tech.wazaAri}x</span>
          </div>
        )}
        
        {tech.yuko > 0 && (
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600 text-sm">Yuko</span>
            <span className="font-medium text-gray-900">{tech.yuko}x</span>
          </div>
        )}
      </div>

      <button
        onClick={handleLoadMatches}
        className="mt-4 text-gray-600 hover:text-gray-900 font-medium text-sm border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
        disabled={loadingMatches}
      >
        {loadingMatches ? 'Loading...' : showMatches ? 'Hide Matches' : `View Matches (${tech.totalCount})`}
      </button>

      {showMatches && matches.length > 0 && (
        <div className="mt-6 border-t border-gray-200 pt-4 space-y-2 max-h-64 overflow-y-auto">
          <div className="text-sm font-medium text-gray-700 mb-3">
            Match Links ({matches.length} unique matches)
          </div>
          {matches.map((match, i) => (
            <a
              key={i}
              href={match.matchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-xs text-gray-600 hover:text-gray-900 hover:underline py-1"
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedHeightRange, setSelectedHeightRange] = useState<string>('');
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
  if (selectedYear) filterParams.append('year', selectedYear.toString());
  if (selectedHeightRange) filterParams.append('heightRange', selectedHeightRange);
  
  const { data: response, isLoading } = useQuery({
    queryKey: ['techniqueStats', selectedCompetition, selectedGender, selectedWeightClass, selectedEventType, selectedYear, selectedHeightRange],
    queryFn: async () => {
      const { data } = await axios.get(`/api/technique-stats?${filterParams.toString()}`);
      return data;
    },
    refetchInterval: 5000,
  });

  const techniques = response?.stats || [];
  const availableFilters = response?.availableFilters || { genders: [], weightClasses: [], eventTypes: [], years: [], heightRanges: [] };

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
      .filter((tech: AggregatedTechnique) => 
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
    <div className="container mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-semibold text-gray-900">Throws & Scores (Nage-waza)</h1>
        {aggregatedTechniques.length > 0 && (
          <div className="text-lg font-medium text-gray-600">
            {aggregatedTechniques.length} unique techniques
          </div>
        )}
      </div>

      <div className="mb-10 space-y-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search techniques..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg flex-1 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-colors"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedCompetition || ''}
            onChange={(e) => setSelectedCompetition(e.target.value ? parseInt(e.target.value) : null)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-colors"
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
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-colors"
          >
            <option value="">All Genders</option>
            {availableFilters.genders.map((g: string) => (
              <option key={g} value={g}>
                {g === 'm' ? 'Male' : g === 'f' ? 'Female' : g}
              </option>
            ))}
          </select>
          <select
            value={selectedWeightClass}
            onChange={(e) => setSelectedWeightClass(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-colors"
          >
            <option value="">All Weight Classes</option>
            {availableFilters.weightClasses.map((wc: string) => (
              <option key={wc} value={wc}>
                {wc}
              </option>
            ))}
          </select>
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-colors"
          >
            <option value="">All Event Types</option>
            {availableFilters.eventTypes.map((et: string) => (
              <option key={et} value={et}>
                {et}
              </option>
            ))}
          </select>
          <select
            value={selectedYear ? String(selectedYear) : ''}
            onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-colors"
          >
            <option value="">All Years</option>
            {(availableFilters.years || []).map((year: number) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
          <select
            value={selectedHeightRange}
            onChange={(e) => setSelectedHeightRange(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-colors"
          >
            <option value="">All Heights</option>
            {(availableFilters.heightRanges || []).map((range: string) => (
              <option key={range} value={range}>
                {range.replace('<', '< ').replace('>=', '≥ ')} cm
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

