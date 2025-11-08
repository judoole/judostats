'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface TopJudoka {
  id: string;
  name: string;
  count: number;
  matchCount: number;
}

interface Match {
  matchUrl: string;
  contestCode: string;
  competition: string;
  competitor: string;
  score: number;
  scoreGroup: string;
  timestamp?: string;
}

export default function TechniqueDetailPage() {
  const params = useParams();
  const techniqueName = params?.name as string;
  const decodedName = decodeURIComponent(techniqueName || '');
  
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedWeightClass, setSelectedWeightClass] = useState<string>('');
  const [selectedScoreGroup, setSelectedScoreGroup] = useState<string>('');

  const filterParams = new URLSearchParams();
  if (selectedGender) filterParams.append('gender', selectedGender);
  if (selectedWeightClass) filterParams.append('weightClass', selectedWeightClass);
  if (selectedScoreGroup) filterParams.append('scoreGroup', selectedScoreGroup);

  const { data: response, isLoading } = useQuery({
    queryKey: ['technique-detail', decodedName, selectedGender, selectedWeightClass, selectedScoreGroup],
    queryFn: async () => {
      const { data } = await axios.get(`/api/techniques/${encodeURIComponent(decodedName)}?${filterParams.toString()}`);
      return data;
    },
    enabled: !!decodedName,
  });

  const topJudoka = response?.topJudoka || [];
  const matches = response?.matches || [];
  const availableFilters = response?.availableFilters || { genders: [], weightClasses: [], eventTypes: [], years: [] };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-xl text-red-600">Failed to load technique data</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-10">
      <Link href="/techniques" className="mb-6 inline-block text-gray-600 hover:text-gray-900 font-medium">
        ← Back to Techniques
      </Link>
      
      <h1 className="text-3xl font-semibold mb-10 text-gray-900">{decodedName}</h1>

      {/* Filters */}
      <div className="mb-10 space-y-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-colors"
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
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-colors"
          >
            <option value="">All Weight Classes</option>
            {availableFilters.weightClasses.map((wc) => (
              <option key={wc} value={wc}>
                {wc}
              </option>
            ))}
          </select>
          <select
            value={selectedScoreGroup}
            onChange={(e) => setSelectedScoreGroup(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300 transition-colors"
          >
            <option value="">All Score Types</option>
            <option value="Ippon">Ippon</option>
            <option value="Waza-ari">Waza-ari</option>
            <option value="Yuko">Yuko</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top 10 Judoka */}
        <div className="bg-white p-8 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-6 text-gray-900">Top 10 Judoka</h2>
          {topJudoka.length > 0 ? (
            <div className="space-y-2">
              {topJudoka.map((judoka: TopJudoka, index: number) => (
                <Link
                  key={judoka.id}
                  href={`/judoka?id=${judoka.id}`}
                  className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-semibold text-gray-400 w-8">#{index + 1}</span>
                      <div>
                        <div className="font-medium text-gray-900">{judoka.name}</div>
                        <div className="text-sm text-gray-600">{judoka.matchCount} unique matches</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg text-gray-900">{judoka.count}x</div>
                      <div className="text-xs text-gray-500">uses</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No judoka found for this technique.</p>
          )}
        </div>

        {/* All Videos */}
        <div className="bg-white p-8 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-6 text-gray-900">All Videos ({matches.length})</h2>
          {matches.length > 0 ? (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {matches.map((match: Match, index: number) => (
                <a
                  key={index}
                  href={match.matchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎥</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{match.competitor}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {match.competition} - {match.scoreGroup}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No videos found for this technique.</p>
          )}
        </div>
      </div>
    </div>
  );
}

