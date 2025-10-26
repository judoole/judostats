'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Link from 'next/link';

interface Competition {
  id: number;
  name: string;
  date?: string;
  location?: string;
  year?: number;
  eventType?: string;
}

const fetchCompetitions = async (): Promise<Competition[]> => {
  const { data } = await axios.get('/api/competitions');
  return data;
};

export default function CompetitionsPage() {
  const { data: competitions, isLoading } = useQuery({
    queryKey: ['competitions'],
    queryFn: fetchCompetitions,
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-xl">Loading competitions...</div>
      </div>
    );
  }

  if (!competitions || competitions.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Competitions</h1>
        <div className="text-center text-gray-500">No competitions found. Run the crawler to collect data.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Competitions</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {competitions.map((comp) => (
          <Link key={comp.id} href={`/competitions/${comp.id}`}>
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
              <h2 className="text-xl font-bold mb-2">{comp.name}</h2>
              {comp.year && <p className="text-gray-600">Year: {comp.year}</p>}
              {comp.location && <p className="text-gray-600">Location: {comp.location}</p>}
              {comp.date && <p className="text-gray-500 text-sm mt-2">{comp.date}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

