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
  height?: number;
  age?: number;
  country?: string;
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
    <div className="container mx-auto px-6 py-10">
      <h1 className="text-3xl font-semibold mb-10 text-gray-900">Judoka Statistics</h1>

      {!selectedJudoka ? (
        <div>
          <div className="bg-white p-8 rounded-lg border border-gray-200 mb-8">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">Search Judoka</h2>
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name..."
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300 transition-colors"
              />
              <button
                onClick={handleSearch}
                className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Search
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Enter a judoka name to search for their statistics and favorite waza.
            </p>
          </div>

          {searchData?.judokaList && searchData.judokaList.length > 0 && (
            <div className="bg-white p-8 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-6 text-gray-900">Search Results ({searchData.judokaList.length})</h3>
              <div className="grid gap-2">
                {searchData.judokaList.map((judoka: JudokaListItem) => (
                  <button
                    key={judoka.id}
                    onClick={() => handleSelectJudoka(judoka.id)}
                    className="text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">{judoka.name}</span>
                      <span className="text-gray-600 text-sm">{judoka.totalTechniques} techniques</span>
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
            className="mb-6 px-4 py-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 font-medium"
          >
            ← Back to Search
          </button>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-xl text-gray-600">Loading...</div>
            </div>
          ) : judokaStats?.stats ? (
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-lg border border-gray-200">
                <h2 className="text-2xl font-semibold mb-3 text-gray-900">{judokaStats.stats.name}</h2>
                <div className="space-y-2">
                  <p className="text-gray-600">
                    Total scores collected: <span className="font-semibold text-gray-900">{judokaStats.stats.totalTechniques}</span>
                  </p>
                  {(judokaStats.stats.height || judokaStats.stats.age || judokaStats.stats.country) && (
                    <div className="flex gap-6 mt-4 text-sm text-gray-600">
                      {judokaStats.stats.height && (
                        <span>
                          Height: <span className="font-medium text-gray-900">{judokaStats.stats.height} cm</span>
                        </span>
                      )}
                      {judokaStats.stats.age && (
                        <span>
                          Age: <span className="font-medium text-gray-900">{judokaStats.stats.age}</span>
                        </span>
                      )}
                      {judokaStats.stats.country && (
                        <span>
                          Country: <span className="font-medium text-gray-900">{judokaStats.stats.country}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-8 rounded-lg border border-gray-200">
                <h3 className="text-xl font-semibold mb-6 text-gray-900">Waza Breakdown</h3>
                <div className="space-y-4">
                  {judokaStats.stats.wazaBreakdown.map((waza: WazaBreakdown, index: number) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg text-gray-900 mb-3">{waza.name}</h4>
                          <div className="flex gap-6 mb-4 text-sm">
                            <span className="text-gray-600">
                              Count: <span className="font-medium text-gray-900">{waza.count}</span>
                            </span>
                            <span className="text-gray-600">
                              %: <span className="font-medium text-gray-900">{waza.percentage}%</span>
                            </span>
                          </div>
                          {waza.matches && waza.matches.length > 0 && (
                            <div className="mt-4 space-y-2">
                              {waza.matches.map((match, idx) => (
                                <a
                                  key={idx}
                                  href={`https://judobase.ijf.org/#/competition/contest/${match.contestCode}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">🎥</span>
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">
                                        {match.opponent ? (
                                          <>
                                            vs {match.opponent}
                                            {match.opponentCountry && (
                                              <span className="text-gray-600 font-normal ml-1">({match.opponentCountry})</span>
                                            )}
                                          </>
                                        ) : 'Watch Match'}
                                        {match.scoreGroup && (
                                          <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded bg-gray-200 text-gray-700">
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
                            <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded border border-red-100">
                              Ippon: {waza.ippon}
                            </span>
                          )}
                          {waza.wazaAri > 0 && (
                            <span className="px-2.5 py-1 bg-orange-50 text-orange-700 rounded border border-orange-100">
                              Waza-ari: {waza.wazaAri}
                            </span>
                          )}
                          {waza.yuko > 0 && (
                            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded border border-blue-100">
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

