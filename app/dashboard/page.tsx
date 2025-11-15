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
    <div className="bg-white p-8 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <h2 className="text-lg font-semibold mb-6 text-gray-900">{title}</h2>
      <div className="space-y-1">
        {visibleTechniques.map((tech, i) => (
          <Link 
            key={i}
            href={`/techniques/${encodeURIComponent(tech.name)}`}
            className="flex justify-between items-center py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors group"
          >
            <span className={`font-medium ${colorClass || 'text-blue-600'} group-hover:text-blue-700 group-hover:underline flex items-center gap-2`}>
              {tech.name}
              <span className="text-gray-400 group-hover:text-blue-500 text-xs">→</span>
            </span>
            <span className="font-semibold text-base text-gray-800">{tech.count}x</span>
          </Link>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-6 w-full py-2.5 px-4 text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-medium rounded-lg transition-colors border border-gray-200"
        >
          {showAll ? '↑ Show Less' : `↓ Show All (${techniques.length})`}
        </button>
      )}
    </div>
  );
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
  const [selectedHeightRange, setSelectedHeightRange] = useState<string>('');

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
    queryKey: ['stats', selectedCompetition, selectedGender, selectedWeightClass, selectedEventType, selectedYear, selectedHeightRange],
    queryFn: async () => {
      const { data } = await axios.get(`/api/stats?${filterParams.toString()}`);
      return data;
    },
    refetchInterval: 5000,
  });

  const stats = response?.stats;
  const availableFilters = response?.availableFilters || { genders: [], weightClasses: [], eventTypes: [], years: [], heightRanges: [] };

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
    <div className="container mx-auto px-6 py-10">
      <h1 className="text-3xl font-semibold mb-10 text-gray-900">Judo Stats</h1>

      {/* Filter Controls */}
      <div className="mb-10 space-y-4">
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
                {range} cm
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <StatCard title="Total Competitions" value={stats.totalCompetitions} icon="🏆" />
        <StatCard title="Total Matches" value={stats.totalMatches} icon="🥋" />
        <StatCard title="Total Techniques" value={stats.totalTechniques} icon="🎯" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {stats.topTechniquesByGroup['Ippon'] && (
          <ExpandableTechniqueList 
            title="Top Ippon Techniques" 
            techniques={stats.topTechniquesByGroup['Ippon']}
          />
        )}
        {stats.topTechniquesByGroup['Waza-ari'] && (
          <ExpandableTechniqueList 
            title="Top Waza-ari Techniques" 
            techniques={stats.topTechniquesByGroup['Waza-ari']}
          />
        )}
        {stats.topTechniquesByGroup['Yuko'] && (
          <ExpandableTechniqueList 
            title="Top Yuko Techniques" 
            techniques={stats.topTechniquesByGroup['Yuko']}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ExpandableTechniqueList 
          title="Top Techniques (Overall)" 
          techniques={stats.topTechniques.map((t: { name: string; count: number }) => ({ name: t.name, count: t.count }))}
        />

        <div className="bg-white p-8 rounded-lg border border-gray-200">
          <h2 className="text-lg font-semibold mb-6 text-gray-900">Competitions by Year</h2>
          <div className="space-y-1">
            {stats.competitionsByYear.map((item: { year: number; count: number }, i: number) => (
              <div key={i} className="flex justify-between items-center py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors">
                <span className="text-gray-700">{item.year}</span>
                <span className="font-semibold text-gray-900">{item.count}</span>
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
    <div className="bg-white p-8 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium mb-2">{title}</p>
          <p className="text-3xl font-semibold text-gray-900">
            {value.toLocaleString()}
          </p>
        </div>
        <div className="text-4xl opacity-10">{icon}</div>
      </div>
    </div>
  );
}

