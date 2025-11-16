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
  weightClass?: string;
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
  competitionCount?: number;
  wazaBreakdown: WazaBreakdown[];
  favoriteTechnique?: string;
  height?: number;
  age?: number;
  country?: string;
}

interface TechniquesReceived {
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

  const { data: statsData } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data } = await axios.get('/api/stats');
      return data;
    },
  });

  const { data: topJudokaData } = useQuery({
    queryKey: ['top-judoka'],
    queryFn: async () => {
      const { data } = await axios.get('/api/judoka?topStats=true');
      return data;
    },
  });

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
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-semibold text-gray-900">Judoka Statistics</h1>
        {statsData?.stats?.totalJudoka !== undefined && (
          <div className="text-lg text-gray-600">
            <span className="font-semibold text-gray-900">{statsData.stats.totalJudoka.toLocaleString()}</span> judoka in database
          </div>
        )}
      </div>

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

          {/* Top Judoka Lists */}
          {!searchQuery && topJudokaData?.topJudoka && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {/* Most Ippons */}
              {topJudokaData.topJudoka.mostIppons && topJudokaData.topJudoka.mostIppons.length > 0 && (
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">🥇 Most Ippons</h3>
                  <div className="space-y-2">
                    {topJudokaData.topJudoka.mostIppons.map((judoka: any, index: number) => (
                      <button
                        key={judoka.id}
                        onClick={() => handleSelectJudoka(judoka.id)}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">
                            {index + 1}. {judoka.name}
                          </span>
                          <span className="text-gray-600 text-sm font-semibold">{judoka.count} ippons</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Most Techniques */}
              {topJudokaData.topJudoka.mostTechniques && topJudokaData.topJudoka.mostTechniques.length > 0 && (
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">⚡ Most Waza Performed</h3>
                  <div className="space-y-2">
                    {topJudokaData.topJudoka.mostTechniques.map((judoka: any, index: number) => (
                      <button
                        key={judoka.id}
                        onClick={() => handleSelectJudoka(judoka.id)}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">
                            {index + 1}. {judoka.name}
                          </span>
                          <span className="text-gray-600 text-sm font-semibold">{judoka.count} techniques</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Hardest to Score Against */}
              {topJudokaData.topJudoka.hardestToScoreAgainst && topJudokaData.topJudoka.hardestToScoreAgainst.length > 0 && (
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">🛡️ Hardest to Score Against</h3>
                  <p className="text-xs text-gray-500 mb-3">(min. 5 competitions)</p>
                  <div className="space-y-2">
                    {topJudokaData.topJudoka.hardestToScoreAgainst.map((judoka: any, index: number) => (
                      <button
                        key={judoka.id}
                        onClick={() => handleSelectJudoka(judoka.id)}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">
                            {index + 1}. {judoka.name}
                          </span>
                          <div className="text-right">
                            <div className="text-gray-600 text-sm font-semibold">{judoka.techniquesReceived} received</div>
                            <div className="text-gray-500 text-xs">{judoka.competitions} competitions</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Most Competitions */}
              {topJudokaData.topJudoka.mostCompetitions && topJudokaData.topJudoka.mostCompetitions.length > 0 && (
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">🏆 Most Competitions</h3>
                  <div className="space-y-2">
                    {topJudokaData.topJudoka.mostCompetitions.map((judoka: any, index: number) => (
                      <button
                        key={judoka.id}
                        onClick={() => handleSelectJudoka(judoka.id)}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900">
                            {index + 1}. {judoka.name}
                          </span>
                          <div className="text-right">
                            <div className="text-gray-600 text-sm font-semibold">{judoka.competitions} competitions</div>
                            <div className="text-gray-500 text-xs">{judoka.techniques} techniques</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
                  {judokaStats.stats.competitionCount !== undefined && (
                    <p className="text-gray-600">
                      Competitions participated: <span className="font-semibold text-gray-900">{judokaStats.stats.competitionCount}</span>
                    </p>
                  )}
                  {(judokaStats.stats.height || judokaStats.stats.age || judokaStats.stats.country || judokaStats.stats.favoriteTechnique) && (
                    <div className="flex gap-6 mt-4 text-sm text-gray-600 flex-wrap">
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
                      {judokaStats.stats.favoriteTechnique && (
                        <span>
                          Favorite throw: <span className="font-medium text-gray-900 capitalize">{judokaStats.stats.favoriteTechnique}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-8 rounded-lg border-2 border-green-200 bg-green-50/30">
                <h3 className="text-xl font-semibold mb-6 text-gray-900">Waza Performed</h3>
                <div className="space-y-4">
                  {judokaStats.stats.wazaBreakdown.map((waza: WazaBreakdown, index: number) => (
                    <div
                      key={index}
                      className="border border-green-200 rounded-lg p-6 bg-white hover:bg-green-50/50 hover:border-green-300 transition-colors"
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
                                        ) : (
                                          <span className="text-gray-500">Match</span>
                                        )}
                                        {match.scoreGroup && (
                                          <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded bg-gray-200 text-gray-700">
                                            {match.scoreGroup}
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        {match.competitionName}
                                        {match.year && ` (${match.year})`}
                                        {match.weightClass && ` • ${match.weightClass}`}
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

              {judokaStats.techniquesReceived && judokaStats.techniquesReceived.totalTechniques > 0 && (
                <div className="bg-white p-8 rounded-lg border-2 border-amber-200 bg-amber-50/30">
                  <h3 className="text-xl font-semibold mb-6 text-gray-900">Waza Received</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Techniques and scores this judoka has received from opponents
                  </p>
                  <div className="space-y-4">
                    {judokaStats.techniquesReceived.wazaBreakdown.map((waza: WazaBreakdown, index: number) => (
                      <div
                        key={index}
                        className="border border-amber-200 rounded-lg p-6 bg-white hover:bg-amber-50/50 hover:border-amber-300 transition-colors"
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
                                              from {match.opponent}
                                              {match.opponentCountry && (
                                                <span className="text-gray-600 font-normal ml-1">({match.opponentCountry})</span>
                                              )}
                                            </>
                                          ) : (
                                            <span className="text-gray-500">Match</span>
                                          )}
                                          {match.scoreGroup && (
                                            <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded bg-gray-200 text-gray-700">
                                              {match.scoreGroup}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-xs text-gray-600 mt-1">
                                          {match.competitionName}
                                          {match.year && ` (${match.year})`}
                                          {match.weightClass && ` • ${match.weightClass}`}
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
              )}
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

