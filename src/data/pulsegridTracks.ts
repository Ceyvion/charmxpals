export type PulsegridNote = {
  lane: number;
  timeMs: number;
};

export type PulsegridTrack = {
  id: string;
  title: string;
  artist: string;
  artistUrl: string;
  license: { name: string; url: string; credit: string; nonCommercial?: boolean };
  audioSrc: string;
  bpm: number;
  offsetMs: number;
  difficulty: 'normal' | 'hard';
  sparkColor: string;
  notes: PulsegridNote[];
};

type BeatEvent = {
  beat: number;
  lanes: number[];
};

type SectionPlan = {
  pattern: BeatEvent[];
  repeat?: number;
};

const BEATS_PER_MEASURE = 4;

const clampBeat = (beat: number) => (beat < 0 ? 0 : beat);

function buildNotes(bpm: number, offsetMs: number, sections: BeatEvent[], measures: number): PulsegridNote[] {
  const quarterMs = 60000 / bpm;
  const notes: PulsegridNote[] = [];
  for (const event of sections) {
    const baseBeat = clampBeat(event.beat);
    const measureIndex = Math.floor(baseBeat / BEATS_PER_MEASURE);
    if (measureIndex >= measures) continue;
    const beatInMeasure = baseBeat % BEATS_PER_MEASURE;
    const timeMs = offsetMs + (measureIndex * BEATS_PER_MEASURE + beatInMeasure) * quarterMs;
    for (const lane of event.lanes) {
      notes.push({ lane, timeMs });
    }
  }
  notes.sort((a, b) => a.timeMs - b.timeMs);
  return notes;
}

function patternMeasure(pattern: BeatEvent[], startMeasure: number): BeatEvent[] {
  return pattern.map((event) => ({ beat: event.beat + startMeasure * BEATS_PER_MEASURE, lanes: event.lanes }));
}

function chainPatterns(patterns: BeatEvent[][]): BeatEvent[] {
  const events: BeatEvent[] = [];
  patterns.forEach((pattern, index) => {
    events.push(...patternMeasure(pattern, index));
  });
  return events;
}

function expandPlan(plan: SectionPlan[]): BeatEvent[][] {
  const expanded: BeatEvent[][] = [];
  plan.forEach(({ pattern, repeat = 1 }) => {
    for (let i = 0; i < repeat; i += 1) {
      expanded.push(pattern);
    }
  });
  return expanded;
}

function rotatePattern(pattern: BeatEvent[], shift: number): BeatEvent[] {
  if (shift % 4 === 0) return pattern;
  const normalized = ((shift % 4) + 4) % 4;
  return pattern.map((event) => ({
    beat: event.beat,
    lanes: event.lanes.map((lane) => (lane + normalized) % 4),
  }));
}

const makeBeat = (step: number, lanes: number[]): BeatEvent => ({ beat: step / 4, lanes });

const patternIntro: BeatEvent[] = [
  makeBeat(0, [0]),
  makeBeat(2, [1]),
  makeBeat(4, [2]),
  makeBeat(6, [3]),
  makeBeat(8, [0, 2]),
  makeBeat(12, [1, 3]),
];

const patternVerse: BeatEvent[] = [
  makeBeat(0, [0]),
  makeBeat(1, [1]),
  makeBeat(2, [2]),
  makeBeat(3, [1]),
  makeBeat(4, [3]),
  makeBeat(6, [2]),
  makeBeat(8, [0, 3]),
  makeBeat(10, [1]),
  makeBeat(11, [2]),
  makeBeat(12, [1, 3]),
  makeBeat(14, [0]),
  makeBeat(15, [2]),
];

const patternPulse: BeatEvent[] = [
  makeBeat(0, [0, 2]),
  makeBeat(2, [1, 3]),
  makeBeat(4, [0, 1]),
  makeBeat(6, [2, 3]),
  makeBeat(8, [0, 2]),
  makeBeat(9, [1]),
  makeBeat(10, [3]),
  makeBeat(12, [0, 1, 2]),
  makeBeat(14, [1, 2, 3]),
];

const patternBurst: BeatEvent[] = [
  makeBeat(0, [0]),
  makeBeat(1, [1, 3]),
  makeBeat(2, [2]),
  makeBeat(3, [0, 2]),
  makeBeat(4, [1]),
  makeBeat(5, [0, 3]),
  makeBeat(6, [2]),
  makeBeat(7, [1, 3]),
  makeBeat(8, [0, 2, 3]),
  makeBeat(9, [1]),
  makeBeat(10, [0, 2]),
  makeBeat(11, [3]),
  makeBeat(12, [1, 2]),
  makeBeat(13, [0]),
  makeBeat(14, [2, 3]),
  makeBeat(15, [1]),
];

const patternBreak: BeatEvent[] = [
  makeBeat(0, [0]),
  makeBeat(4, [1]),
  makeBeat(8, [2]),
  makeBeat(12, [3]),
  makeBeat(13, [0, 2]),
  makeBeat(14, [1, 3]),
];

const patternLift: BeatEvent[] = [
  makeBeat(0, [0, 1]),
  makeBeat(2, [2, 3]),
  makeBeat(4, [0, 2]),
  makeBeat(6, [1, 3]),
  makeBeat(8, [0, 1, 2]),
  makeBeat(10, [1, 2, 3]),
  makeBeat(12, [0, 2, 3]),
  makeBeat(14, [0, 1, 3]),
];

const patternOutro: BeatEvent[] = [
  makeBeat(0, [0]),
  makeBeat(8, [3]),
  makeBeat(12, [1]),
  makeBeat(14, [2]),
];

const patternSyncFade: BeatEvent[] = [
  makeBeat(0, [0, 3]),
  makeBeat(3, [1]),
  makeBeat(6, [2]),
  makeBeat(8, [0, 2]),
  makeBeat(11, [1]),
  makeBeat(14, [2, 3]),
];

const luwanCyclePlan: SectionPlan[] = [
  { pattern: patternIntro, repeat: 2 },
  { pattern: patternVerse, repeat: 2 },
  { pattern: rotatePattern(patternVerse, 1), repeat: 2 },
  { pattern: patternPulse, repeat: 2 },
  { pattern: rotatePattern(patternPulse, 2), repeat: 2 },
  { pattern: patternLift, repeat: 2 },
  { pattern: patternBurst, repeat: 2 },
  { pattern: rotatePattern(patternBurst, 1), repeat: 2 },
];

const luwanSequence = expandPlan(luwanCyclePlan);
const luwanExtendedPatterns: BeatEvent[][] = [];
for (let i = 0; i < 4; i += 1) {
  luwanExtendedPatterns.push(...luwanSequence);
}
luwanExtendedPatterns.push(patternBreak, patternSyncFade, patternLift, patternOutro);

const luwanEvents = chainPatterns(luwanExtendedPatterns);

const sunshineCyclePlan: SectionPlan[] = [
  { pattern: patternIntro, repeat: 1 },
  { pattern: rotatePattern(patternIntro, 1), repeat: 1 },
  { pattern: patternVerse, repeat: 2 },
  { pattern: rotatePattern(patternVerse, 2), repeat: 2 },
  { pattern: patternPulse, repeat: 2 },
  { pattern: rotatePattern(patternPulse, 1), repeat: 2 },
  { pattern: patternBurst, repeat: 2 },
  { pattern: rotatePattern(patternBurst, 3), repeat: 1 },
];

const sunshineSequence = expandPlan(sunshineCyclePlan);
const sunshinePatterns: BeatEvent[][] = [];
for (let i = 0; i < 10; i += 1) {
  sunshinePatterns.push(...sunshineSequence);
}
sunshinePatterns.push(patternLift, rotatePattern(patternLift, 2), patternBreak, patternOutro, patternOutro);

const sunshineEvents = chainPatterns(sunshinePatterns);

const luwanNotes = buildNotes(123, 1800, luwanEvents, 72);
const sunshineNotes = buildNotes(120, 1900, sunshineEvents, 160);

export const pulsegridTracks: PulsegridTrack[] = [
  {
    id: 'luwan-house',
    title: 'Luwan House',
    artist: 'Reiswerk ft. Sonja V',
    artistUrl: 'https://ccmixter.org/people/Reiswerk',
    license: {
      name: 'CC BY-NC 3.0',
      url: 'http://creativecommons.org/licenses/by-nc/3.0/',
      credit: '“Luwan House feat Sonja V” by Reiswerk (ccMixter)',
      nonCommercial: true,
    },
    audioSrc: '/audio/pulsegrid/luwan-house.mp3',
    bpm: 123,
    offsetMs: 1800,
    difficulty: 'normal',
    sparkColor: '#8b5cf6',
    notes: luwanNotes,
  },
  {
    id: 'sunshine',
    title: 'Sunshine',
    artist: 'Funnywico ft. Andres Franco',
    artistUrl: 'https://ccmixter.org/people/Funnywico',
    license: {
      name: 'CC BY 3.0',
      url: 'http://creativecommons.org/licenses/by/3.0/',
      credit: '“Sunshine (feat Andres Franco)” by Funnywico (ccMixter)',
    },
    audioSrc: '/audio/pulsegrid/sunshine.mp3',
    bpm: 120,
    offsetMs: 1900,
    difficulty: 'hard',
    sparkColor: '#f97316',
    notes: sunshineNotes,
  },
];
