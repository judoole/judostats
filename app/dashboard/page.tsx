'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Link from 'next/link';

// Component for expandable technique list
function ExpandableTechniqueList({ 
  title, 
  techniques, 
  colorClass 
}: { 
  title: string; 
  techniques: Array<{ name: string; count: number }>; 
  colorClass?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const displayCount = 5;
  const visibleTechniques = showAll ? techniques : techniques.slice(0, displayCount);
  const hasMore = techniques.length > displayCount;

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100">
      <h2 className="text-xl font-bold mb-4 text-gray-800">{title}</h2>
      <div className="space-y-2">
        {visibleTechniques.map((tech, i) => (
          <div key={i} className="flex justify-between items-center py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
            <Link 
              href={`/techniques/${encodeURIComponent(tech.name)}`}
              className={`font-medium ${colorClass || 'text-gray-700'} hover:underline`}
            >
              {tech.name}
            </Link>
            <span className="font-bold text-lg text-gray-800">{tech.count}x</span>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-4 w-full py-2 px-4 text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-semibold rounded-lg transition-colors"
        >
          {showAll ? '↑ Show Less' : `↓ Show All (${techniques.length})`}
        </button>
      )}
    </div>
  );
}

interface Stat {
  totalCompetitions: number;
  totalMatches: number;
  totalTechniques: number;
  topTechniques: Array<{ name: string; count: number; avgScore: number }>;
  competitionsByYear: Array<{ year: number; count: number }>;
  techniquesByScoreGroup: Array<{ group: string; count: number }>;
  topTechniquesByGroup: Record<string, Array<{ name: string; count: number }>>;
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

export default function Dashboard() {
  const [selectedCompetition, setSelectedCompetition] = useState<number | null>(null);
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedWeightClass, setSelectedWeightClass] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

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

  const { data: response, isLoading } = useQuery({
    queryKey: ['stats', selectedCompetition, selectedGender, selectedWeightClass, selectedEventType, selectedYear],
    queryFn: async () => {
      const { data } = await axios.get(`/api/stats?${filterParams.toString()}`);
      return data;
    },
    refetchInterval: 5000,
  });

  const stats = response?.stats;
  const availableFilters = response?.availableFilters || { genders: [], weightClasses: [], eventTypes: [], years: [] };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">Failed to load stats</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Judo Stats</h1>

      {/* Filter Controls */}
      <div className="mb-6 space-y-4">
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
          <select
            value={selectedYear ? String(selectedYear) : ''}
            onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Years</option>
            {(availableFilters.years || []).map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Competitions" value={stats.totalCompetitions} icon="🏆" />
        <StatCard title="Total Matches" value={stats.totalMatches} icon="🥋" />
        <StatCard title="Total Techniques" value={stats.totalTechniques} icon="🎯" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {stats.topTechniquesByGroup['Ippon'] && (
          <ExpandableTechniqueList 
            title="Top Ippon Techniques" 
            techniques={stats.topTechniquesByGroup['Ippon']}
            colorClass="text-red-600"
          />
        )}
        {stats.topTechniquesByGroup['Waza-ari'] && (
          <ExpandableTechniqueList 
            title="Top Waza-ari Techniques" 
            techniques={stats.topTechniquesByGroup['Waza-ari']}
            colorClass="text-orange-600"
          />
        )}
        {stats.topTechniquesByGroup['Yuko'] && (
          <ExpandableTechniqueList 
            title="Top Yuko Techniques" 
            techniques={stats.topTechniquesByGroup['Yuko']}
            colorClass="text-blue-600"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpandableTechniqueList 
          title="Top Techniques (Overall)" 
          techniques={stats.topTechniques.map(t => ({ name: t.name, count: t.count }))}
        />

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Competitions by Year</h2>
          <div className="space-y-2">
            {stats.competitionsByYear.map((item, i) => (
              <div key={i} className="flex justify-between items-center">
                <span>{item.year}</span>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: string }) {
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
          <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            {value.toLocaleString()}
          </p>
        </div>
        <div className="text-5xl opacity-20">{icon}</div>
      </div>
    </div>
  );
}

