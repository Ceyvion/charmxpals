export type BetaHighlight = {
  id: string;
  title: string;
  description: string;
  href: string;
  label: string;
  external?: boolean;
  tagline?: string;
  cta?: string;
};

export type BetaPulse = {
  title: string;
  detail: string;
};

export type BetaResource = {
  id: string;
  title: string;
  description: string;
  href: string;
  external?: boolean;
};

export type BetaFocus = {
  id: string;
  title: string;
  detail: string;
};

export type BetaPatch = {
  version: string;
  codename?: string;
  summary: string;
  publishedAt: string;
  href: string;
};

export type BetaDashboardContent = {
  waveLabel: string;
  missionStatement: string;
  velocityGoal: string;
  weeklyFocus: string;
  highlights: BetaHighlight[];
  pulses: BetaPulse[];
  focusAreas: BetaFocus[];
  patch: BetaPatch;
  resources: BetaResource[];
};

const config: BetaDashboardContent = {
  waveLabel: 'Wave 1 Beta',
  missionStatement:
    'Testing: Claim speeds, runner mechanics, cosmetic sync. Your data shapes launch.',
  velocityGoal: 'Code → Inventory under 60 seconds.',
  weeklyFocus: 'Stress runner collisions, verify cosmetics sync.',
  highlights: [
    {
      id: 'claim-test',
      title: 'Claim Test',
      tagline: 'Code → Inventory in <60s',
      description: 'Submit code at /claim and verify it syncs to My Pals.',
      href: '/claim',
      label: 'Core mission',
      cta: 'Start Test →',
    },
    {
      id: 'runner-stress',
      title: 'Runner Stress Test',
      tagline: 'Break the mechanics',
      description: 'Finish a session, log collisions, and note device specs.',
      href: '/play/runner',
      label: 'Core mission',
      cta: 'Launch Runner →',
    },
    {
      id: 'cosmetic-sync',
      title: 'Cosmetic Sync',
      tagline: 'Equip → Verify across views',
      description: 'Confirm changes on /character mirror to /me and runner.',
      href: '/explore',
      label: 'Core mission',
      cta: 'Test Sync →',
    },
  ],
  pulses: [
    { title: 'Beta window', detail: 'Nov 4 → Dec 2 (rolling releases)' },
    { title: 'Next patch', detail: 'Wave 1.2 — cosmetics pass & latency logs' },
    { title: 'Support line', detail: 'charmxpals.contact@gmail.com (1 business day SLA)' },
  ],
  focusAreas: [],
  patch: {
    version: 'Wave 1.1',
    codename: 'Neon Pulse',
    summary: 'Runner balance, cosmetic preview, duplicate claim fix.',
    publishedAt: '2024-11-08T17:00:00.000Z',
    href: 'https://github.com/Ceyvion/charmxpals/blob/main/docs/beta/WAVE1.md#patch-wave-11-neon-pulse',
  },
  resources: [
    {
      id: 'claim-action',
      title: 'Claim Code',
      description: 'Redeem at /claim',
      href: '/claim',
    },
    {
      id: 'runner-action',
      title: 'Play Runner',
      description: 'Stress test mechanics',
      href: '/play/runner',
    },
    {
      id: 'feedback-action',
      title: 'Drop Feedback',
      description: 'Screenshots, clips, repro steps',
      href: 'mailto:charmxpals.contact@gmail.com?subject=Beta%20feedback',
      external: true,
    },
  ],
};

export function getBetaDashboardContent(): BetaDashboardContent {
  return config;
}
