export type CharacterLore = {
  series: string;
  slug: string;
  name: string;
  realm: string;
  color: string;
  title: string;
  vibe: string;
  danceStyle: string;
  coreCharm: string;
  personality: string;
  tagline: string;
  description: string;
  rarity: number;
  stats: Record<string, number>;
  order: number;
  artRefs?: Record<string, string>;
};

export const worldTagline = 'When the music calls, the worlds collide.';

export const characterLore: CharacterLore[] = [
  {
    series: 'Blue Pixie',
    slug: 'neon-city',
    name: 'Vexa Volt',
    realm: 'Neon City',
    color: '#FF7A24',
    title: 'Street Dance Champion',
    vibe: 'Electric billboards, graffiti alleys, glowing skateparks.',
    danceStyle: 'Hip-hop, popping, locking.',
    coreCharm: 'Bass Drop Gem — a subsonic crystal that amplifies every pop and lock.',
    personality: 'Bold, flashy, and full of swagger; speaks in punchy beats and graffiti tags.',
    tagline: 'Lightning-fast footwork straight from the neon skyline.',
    description:
      'Neon City’s skyline is her stage. Vexa Volt slides across holo rails, syncs with billboard breakers, and channels the Bass Drop Gem to spark Shockwave routines that reboot corrupted beats.',
    rarity: 4,
    stats: {
      rhythm: 95,
      style: 93,
      power: 78,
      flow: 86,
      teamwork: 82,
    },
    order: 1,
  },
  {
    series: 'Purple Dash',
    slug: 'crystal-kingdom',
    name: 'Seraphine Gliss',
    realm: 'Crystal Kingdom',
    color: '#7A4DFF',
    title: 'Ballroom Royalty',
    vibe: 'Sparkling palaces, chandeliers, mirrored ballrooms.',
    danceStyle: 'Waltz, tango, elegant spins.',
    coreCharm: 'Royal Rhythm Crown — refracts light into perfect tempo halos.',
    personality: 'Graceful and diplomatic but fierce once the music swells.',
    tagline: 'A single pirouette can shatter silence into symphonies.',
    description:
      'Raised within the mirrored halls of Crystal Kingdom, Seraphine Gliss wields the Royal Rhythm Crown to choreograph lightstorms. Every spin restores harmony, bending reflections to reveal hidden distortions in the beat.',
    rarity: 4,
    stats: {
      rhythm: 88,
      style: 96,
      power: 72,
      flow: 90,
      teamwork: 89,
    },
    order: 2,
  },
  {
    series: 'Blue Dash',
    slug: 'rhythm-reef',
    name: 'Kai Tidal',
    realm: 'Rhythm Reef',
    color: '#2EB4FF',
    title: 'Ocean Wave Dancer',
    vibe: 'Coral stages, glowing jellyfish lights, tidal wave shows.',
    danceStyle: 'Flowing contemporary wave dance with underwater flourishes.',
    coreCharm: 'Tidal Tune Pearl — stores tsunami crescendos to drown out the Break.',
    personality: 'Calm, soothing, but fiercely competitive when currents shift.',
    tagline: 'The tide always turns on the downbeat.',
    description:
      'Kai Tidal rides luminant surf across coral amphitheaters, bending water into ribboned choreography. With the Tidal Tune Pearl he can summon rhythm ripcurrents that wash corruption out of entire arenas.',
    rarity: 4,
    stats: {
      rhythm: 92,
      style: 87,
      power: 80,
      flow: 98,
      teamwork: 84,
    },
    order: 3,
  },
  {
    series: 'Purple Pixie',
    slug: 'wildbeat-jungle',
    name: 'Tarin Pulse',
    realm: 'Wildbeat Jungle',
    color: '#35C25A',
    title: 'Nature Groove Keeper',
    vibe: 'Giant drums in tree canopies, firefly-lit vines.',
    danceStyle: 'Afrobeat, tribal footwork, percussive stomps.',
    coreCharm: 'Jungle Groove Seed — sprouts percussion that heals broken bridges.',
    personality: 'Energetic, earthy, and fiercely loyal to every crew mate.',
    tagline: 'Roots, rhythm, and relentless bounce.',
    description:
      'Tarin Pulse drums thunder through canopy catwalks, syncing every creature to the primal groove. The Jungle Groove Seed lets Tarin awaken drumtree guardians whose beats mend fractured Beat Bridges.',
    rarity: 4,
    stats: {
      rhythm: 90,
      style: 82,
      power: 88,
      flow: 83,
      teamwork: 95,
    },
    order: 4,
  },
  {
    series: 'Pink Dash',
    slug: 'lunar-lux',
    name: 'Mina Starlit',
    realm: 'Lunar Lux',
    color: '#FF6EB5',
    title: 'K-pop Popstar',
    vibe: 'Neon moons, starlit runways, glitter cities.',
    danceStyle: 'K-pop choreography—sharp, cute, and flawlessly synchronized.',
    coreCharm: 'Stardust Mic — beams fandom energy into dazzling shields.',
    personality: 'Bubbly, confident, and obsessed with staging the perfect encore.',
    tagline: 'Every spotlight follows her constellation.',
    description:
      'Mina Starlit headlines Lunar Lux’s shimmering tour, dropping choreo bursts timed to meteor showers. With the Stardust Mic she harmonizes entire squads, reflecting corrupted noise back as glittering harmony.',
    rarity: 4,
    stats: {
      rhythm: 93,
      style: 95,
      power: 76,
      flow: 88,
      teamwork: 90,
    },
    order: 5,
  },
  {
    series: 'Black Dash',
    slug: 'shadow-stage',
    name: 'Cipher Noir',
    realm: 'Shadow Stage',
    color: '#111111',
    title: 'Mystery Freestyler',
    vibe: 'Foggy arenas, streetlight silhouettes, underground beats.',
    danceStyle: 'Freestyle, krump, experimental contortions.',
    coreCharm: 'Phantom Pulse Orb — manifests silhouettes that mimic his moves.',
    personality: 'Speaks through motion; enigmatic but laser-focused on justice.',
    tagline: 'Silence is just a beat waiting to be flipped.',
    description:
      'Cipher Noir stalks the dim catwalks of Shadow Stage, pulling echoes out of lamplit fog. The Phantom Pulse Orb spins spectral doubles that battle in sync, overwhelming the Beat Break with improvisational swarms.',
    rarity: 5,
    stats: {
      rhythm: 91,
      style: 89,
      power: 90,
      flow: 95,
      teamwork: 88,
    },
    order: 6,
  },
  {
    series: 'Pink Pixie',
    slug: 'prism-pulse',
    name: 'DJ Prismix',
    realm: 'Prism Pulse',
    color: '#FFD966',
    title: 'Legendary DJ Mentor',
    vibe: 'Giant turntable islands, rainbow soundwave bridges.',
    danceStyle: 'Fusion of every style, remixed on the fly.',
    coreCharm: 'Master Mix Prism — blends realms into one unstoppable beat.',
    personality: 'Mentor energy, radiates calm focus, keeps crews unified.',
    tagline: 'Spin every realm into the same groove.',
    description:
      'DJ Prismix floats between realms on soundwave bridges, sampling every rhythm to remix the perfect counterbeat. The Master Mix Prism lets Prismix splice dimensions together, stabilizing arenas before the Beat Break can spread.',
    rarity: 5,
    stats: {
      rhythm: 99,
      style: 94,
      power: 86,
      flow: 97,
      teamwork: 98,
    },
    order: 7,
  },
  {
    series: 'Red Dash',
    slug: 'ember-heights',
    name: 'Raze Ember',
    realm: 'Ember Heights',
    color: '#FF3C2E',
    title: 'Flamecore BBoy/BGirl',
    vibe: 'Rooftop cyphers under ruby neon, suspended heat pipes, sunset skies on fire.',
    danceStyle: 'Breaking and Capoeira fusion with power moves and inverted kicks.',
    coreCharm: 'Inferno Heart Drum — fuels blazing momentum and heat mirages.',
    personality: 'Fearless hype-starter; first into battle, last off the floor.',
    tagline: 'Spin sparks until the night catches fire.',
    description:
      'Raze Ember whips through rooftop cyphers, fusing flare combos with capoeira sweeps. Every strike on the Inferno Heart Drum throws heat mirages that trip up corrupted rhythms and reignite the crowd.',
    rarity: 5,
    stats: {
      rhythm: 94,
      style: 88,
      power: 96,
      flow: 89,
      teamwork: 85,
    },
    order: 8,
  },
  {
    series: 'Red Pixie',
    slug: 'solar-spire',
    name: 'Helio Trace',
    realm: 'Solar Spire',
    color: '#FFC93A',
    title: 'Sunstep House Captain',
    vibe: 'Golden terraces, sundial plazas, prism windows casting kinetic light.',
    danceStyle: 'House, shuffle, and agile footwork with solar glide runs.',
    coreCharm: 'Sunburst Disc — stores daylight bursts to boost team tempo.',
    personality: 'Radiant optimist and timekeeper; keeps every crew on count.',
    tagline: 'Daylight drops right on beat.',
    description:
      'Helio Trace conducts rooftop sessions that charge the Sunburst Disc, releasing Burst Tempo flares that quicken allies’ steps and burn through shadows. Every shuffle keeps the multiverse perfectly on time.',
    rarity: 4,
    stats: {
      rhythm: 90,
      style: 85,
      power: 82,
      flow: 93,
      teamwork: 91,
    },
    order: 9,
  },
  {
    series: 'Black Pixie',
    slug: 'terra-tempo',
    name: 'Cadence Clay',
    realm: 'Terra Tempo',
    color: '#8B5A2B',
    title: 'Groundbeat Marshal',
    vibe: 'Canyon amphitheaters, copper catwalks, drum caverns with seismic echoes.',
    danceStyle: 'Stepping, tap, and body percussion with ripple stomps.',
    coreCharm: 'Earth Resonance Stone — sends shockwaves of perfect timing.',
    personality: 'Steady, wise, community-first; turns crowds into choirs.',
    tagline: 'Every stomp anchors the beat.',
    description:
      'Cadence Clay leads canyon choirs where every stomp travels for miles. The Earth Resonance Stone drops seismic metronomes that stabilize Beat Bridges and give the squad rock-solid timing.',
    rarity: 3,
    stats: {
      rhythm: 88,
      style: 81,
      power: 90,
      flow: 79,
      teamwork: 97,
    },
    order: 10,
  },
];

export const loreBySeries = characterLore.reduce<Record<string, CharacterLore>>((acc, entry) => {
  acc[entry.series] = entry;
  return acc;
}, {});

export const loreBySlug = characterLore.reduce<Record<string, CharacterLore>>((acc, entry) => {
  acc[entry.slug] = entry;
  return acc;
}, {});
