'use client';

export default function FriendsPage() {
  return (
    <div className="min-h-screen py-12 px-4 bg-grid-overlay">
      <div className="cp-container">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white font-display mb-2">Friends</h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">Connect, invite, and see who’s online.</p>
        </div>

        <div className="cp-panel p-8 mb-8">
          <h2 className="text-2xl font-bold text-white font-display mb-4">Invite Friends</h2>
          <p className="text-gray-300 mb-6">Share your invite code with friends and both get exclusive cosmetics!</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-grow">
              <label htmlFor="invite-code" className="block text-sm font-semibold text-white mb-1">Your Invite Code</label>
              <div className="flex">
                <input
                  type="text"
                  id="invite-code"
                  value="CHARM-XPAL-FRIEND"
                  readOnly
                  className="flex-grow px-4 py-3 border border-white/10 rounded-l-lg bg-white/10 text-white"
                />
                <button
                  onClick={() => navigator.clipboard.writeText('CHARM-XPAL-FRIEND')}
                  className="px-4 bg-white text-gray-900 font-bold rounded-r-lg hover:bg-gray-100 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="cp-panel p-8">
          <h2 className="text-2xl font-bold text-white font-display mb-4">Online Now</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[{name:'Nova', status:'Playing Runner'},{name:'Rex',status:'In Lobby'},{name:'Echo',status:'Browsing'}].map((f) => (
              <div key={f.name} className="flex items-center gap-3 border border-white/10 rounded-xl p-4 bg-white/5">
                <div className="w-10 h-10 rounded-full" style={{ backgroundImage: 'var(--cp-gradient)' }} />
                <div className="flex-1">
                  <div className="font-semibold text-white">{f.name}</div>
                  <div className="text-xs text-gray-300">{f.status}</div>
                </div>
                <button className="px-3 py-2 bg-white text-gray-900 text-sm rounded-lg font-semibold">Challenge</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
