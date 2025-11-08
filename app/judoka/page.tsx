'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface JudokaListItem {
  id: string;
  name: string;
  totalTechniques: number;
}

interface MatchInfo {
  contestCode: string;
  opponent?: string;
  opponentCountry?: string;
  competitionName?: string;
  year?: number;
  scoreGroup?: string;
}

interface WazaBreakdown {
  name: string;
  count: number;
  percentage: string;
  avgScore: number;
  ippon: number;
  wazaAri: number;
  yuko: number;
  matches?: MatchInfo[];
}

interface JudokaStats {
  id: string;
  name: string;
  totalTechniques: number;
  wazaBreakdown: WazaBreakdown[];
}

export default function JudokaPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJudoka, setSelectedJudoka] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Check for judokaId in URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const judokaIdFromUrl = searchParams.get('id');
      if (judokaIdFromUrl && !selectedJudoka) {
        setSelectedJudoka(judokaIdFromUrl);
      }
    }
  }, [selectedJudoka]);

  const { data: searchData } = useQuery({
    queryKey: ['judoka-search', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      const { data } = await axios.get(`/api/judoka?${params.toString()}`);
      return data;
    },
    enabled: searchQuery.length > 0,
  });

  const { data: judokaStats, isLoading } = useQuery({
    queryKey: ['judoka-stats', selectedJudoka],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('judokaId', selectedJudoka!);
      const { data } = await axios.get(`/api/judoka?${params.toString()}`);
      return data;
    },
    enabled: !!selectedJudoka,
  });

  const handleSearch = () => {
    setSearchQuery(searchTerm);
  };

  const handleSelectJudoka = (judokaId: string) => {
    setSelectedJudoka(judokaId);
    // Update URL to reflect selected judoka
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('id', judokaId);
      window.history.pushState({}, '', url.toString());
    }
  };

  const clearSelection = () => {
    setSelectedJudoka(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Judoka Statistics</h1>

      {!selectedJudoka ? (
        <div>
          <div className="bg-white p-6 rounded-xl shadow-md mb-6">
            <h2 className="text-2xl font-bold mb-4">Search Judoka</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name..."
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Search
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Enter a judoka name to search for their statistics and favorite waza.
            </p>
          </div>

          {searchData?.judokaList && searchData.judokaList.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-xl font-bold mb-4">Search Results ({searchData.judokaList.length})</h3>
              <div className="grid gap-3">
                {searchData.judokaList.map((judoka: JudokaListItem) => (
                  <button
                    key={judoka.id}
                    onClick={() => handleSelectJudoka(judoka.id)}
                    className="text-left p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-lg">{judoka.name}</span>
                      <span className="text-gray-600">{judoka.totalTechniques} techniques</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {searchQuery && searchData?.judokaList && searchData.judokaList.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <p className="text-yellow-800">No judoka found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <button
            onClick={clearSelection}
            className="mb-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back to Search
          </button>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-xl">Loading...</div>
            </div>
          ) : judokaStats?.stats ? (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl shadow-md border border-gray-100">
                <h2 className="text-3xl font-bold mb-2">{judokaStats.stats.name}</h2>
                <p className="text-gray-600">
                  Total scores collected: <span className="font-bold text-blue-600">{judokaStats.stats.totalTechniques}</span>
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-2xl font-bold mb-4">Waza Breakdown</h3>
                <div className="space-y-3">
                  {judokaStats.stats.wazaBreakdown.map((waza: WazaBreakdown, index: number) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-bold text-lg text-gray-800">{waza.name}</h4>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span className="text-gray-600">
                              Count: <span className="font-semibold">{waza.count}</span>
                            </span>
                            <span className="text-gray-600">
                              %: <span className="font-semibold">{waza.percentage}%</span>
                            </span>
                          </div>
                          {waza.matches && waza.matches.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {waza.matches.map((match, idx) => (
                                <a
                                  key={idx}
                                  href={`https://judobase.ijf.org/#/competition/contest/${match.contestCode}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">🎥</span>
                                    <div className="flex-1">
                                      <div className="font-semibold text-blue-700">
                                        {match.opponent ? (
                                          <>
                                            vs {match.opponent}
                                            {match.opponentCountry && (
                                              <span className="text-gray-600 font-normal ml-1">({match.opponentCountry})</span>
                                            )}
                                          </>
                                        ) : 'Watch Match'}
                                        {match.scoreGroup && (
                                          <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded bg-blue-100 text-blue-800">
                                            {match.scoreGroup}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        {match.competitionName}
                                        {match.year && ` (${match.year})`}
                                      </div>
                                    </div>
                                  </div>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 text-xs">
                          {waza.ippon > 0 && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                              Ippon: {waza.ippon}
                            </span>
                          )}
                          {waza.wazaAri > 0 && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
                              Waza-ari: {waza.wazaAri}
                            </span>
                          )}
                          {waza.yuko > 0 && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                              Yuko: {waza.yuko}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-800">Failed to load judoka statistics</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

