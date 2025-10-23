'use client';

import Link from 'next/link';

export default function GameHub() {
  const games = [
    {
      id: 'plaza',
      title: 'Plaza (Preview)',
      description: 'Meet other players with your collectible in a small social space'
    },
    {
      id: 'runner',
      title: 'Endless Runner',
      description: 'Run as far as you can while avoiding obstacles'
    },
    {
      id: 'battle',
      title: 'Stat Battle',
      description: 'Challenge friends in quick turn-based battles'
    },
    {
      id: 'time-trial',
      title: 'Time Trial',
      description: 'Complete challenges using your character\'s power-ups'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-950/90 py-12 px-4">
      <div className="cp-container">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white font-display mb-4">Game Hub</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Play exciting mini-games with your collectibles and compete on leaderboards
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {games.map((game) => (
            <div key={game.id} className="cp-card overflow-hidden backdrop-blur">
              <div className="p-8 h-full flex flex-col">
                <h2 className="text-2xl font-bold text-white font-display mb-2">{game.title}</h2>
                <p className="text-gray-300 mb-6 flex-grow">{game.description}</p>
                <Link
                  href={game.id === 'plaza' ? `/plaza` : `/play/${game.id}`}
                  className="mt-4 px-6 py-3 bg-white text-gray-900 font-bold rounded-lg hover:bg-gray-100 transition-colors text-center"
                >
                  Play Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
