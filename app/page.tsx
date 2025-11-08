import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent">
            🥋 Judo Stats
          </h1>
          <p className="text-2xl text-gray-700 mb-8 max-w-3xl mx-auto">
            Explore popular judo techniques from international competitions
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-12">
          {/* What is this */}
          <section className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-3xl font-bold mb-4 text-gray-800">What is this?</h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              Judo Stats is a personal project that collects and displays information about 
              popular judo techniques used in international competitions. It analyzes match data to identify 
              which techniques are most frequently used, their success rates, and how they vary across 
              different competitions, weight classes, and categories.
            </p>
          </section>

          {/* Data Source */}
          <section className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-3xl font-bold mb-4 text-gray-800">Data Source</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              All competition data is sourced from the <strong>International Judo Federation (IJF)</strong> 
              through their official API at <a href="https://data.ijf.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">data.ijf.org</a>. 
              This includes match results, technique data, and competition information from IJF-sanctioned events worldwide.
            </p>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-gray-800 font-semibold">
                ⚠️ <strong>Data Ownership:</strong> All data displayed on this site is owned by the International Judo Federation (IJF).
              </p>
            </div>
          </section>

          {/* How to Use */}
          <section className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-3xl font-bold mb-4 text-gray-800">How to Use</h2>
            <div className="space-y-4 text-lg text-gray-700">
              <div className="flex items-start">
                <span className="text-2xl mr-4">📊</span>
                <div>
                  <strong className="text-gray-800">Dashboard:</strong> View overall statistics, top techniques by score type (Ippon, Waza-ari, Yuko), and filter by competition, gender, weight class, or year.
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-4">🎯</span>
                <div>
                  <strong className="text-gray-800">Techniques:</strong> Browse and search for specific judo techniques to see their usage statistics across competitions.
                </div>
              </div>
              <div className="flex items-start">
                <span className="text-2xl mr-4">👤</span>
                <div>
                  <strong className="text-gray-800">Judoka:</strong> Explore data by individual athletes and their technique usage.
                </div>
              </div>
            </div>
          </section>

          {/* Call to Action */}
          <div className="text-center pt-8">
            <Link
              href="/dashboard"
              className="inline-block bg-gradient-to-r from-blue-700 to-blue-800 text-white text-xl font-semibold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
            >
              Explore the Dashboard →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
