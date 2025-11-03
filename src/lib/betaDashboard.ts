export type BetaHighlight = {
  id: string;
  title: string;
  description: string;
  href: string;
  label: string;
  external?: boolean;
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
  waveLabel: 'Wave 1 beta',
  missionStatement:
    "We're pressure-testing claim latency, mini-game feel, and the first cosmetics sync. Thank you for flying recon with us.",
  velocityGoal: 'Keep friction under 60s from code entry to sync.',
  weeklyFocus: 'Runner difficulty curve, cosmetics equip latency.',
  highlights: [
    {
      id: 'claim',
      title: 'Redeem & Sync',
      description: 'Claim your collectible at /claim and confirm it appears in My Pals within a minute.',
      href: '/claim',
      label: 'Claim flow',
    },
    {
      id: 'runner',
      title: 'Stress the Runner',
      description: 'Finish a full runner session, capture any spikes or unfair collisions, and log device specs.',
      href: '/play/runner',
      label: 'Play test',
    },
    {
      id: 'feedback',
      title: 'Drop Notes Fast',
      description: 'Screenshots, clips, repro steps—send it all so we can sharpen launch polish.',
      href: 'mailto:beta@charmxpals.com?subject=Beta%20feedback',
      label: 'Feedback',
      external: true,
    },
  ],
  pulses: [
    { title: 'Beta window', detail: 'Nov 4 → Dec 2 (rolling releases)' },
    { title: 'Next patch', detail: 'Wave 1.2 — cosmetics pass & latency logs' },
    { title: 'Support line', detail: 'beta@charmxpals.com (1 business day SLA)' },
  ],
  focusAreas: [
    {
      id: 'latency',
      title: 'Claim latency',
      detail: 'Measure time from code submit to inventory sync. Call out spikes >60s.',
    },
    {
      id: 'runner-feel',
      title: 'Runner feel',
      detail: 'Watch for unfair hits or camera wobble when rotating fast.',
    },
    {
      id: 'cosmetics-sync',
      title: 'Cosmetics sync',
      detail: 'Equip cosmetics on /character and confirm they mirror into /me + runner loadout.',
    },
  ],
  patch: {
    version: 'Wave 1.1',
    codename: 'Neon Pulse',
    summary: 'Runner balancing tweaks, cosmetics equip preview, fix for duplicate claim toasts.',
    publishedAt: '2024-11-08T17:00:00.000Z',
    href: 'https://github.com/Ceyvion/charmxpals/blob/main/docs/beta/WAVE1.md#patch-wave-11-neon-pulse',
  },
  resources: [
    {
      id: 'dashboard-notes',
      title: 'Beta dashboard notes',
      description: 'Screenshots, copy blocks, and how to update the welcome/checklist experience.',
      href: 'https://github.com/Ceyvion/charmxpals/blob/main/docs/beta/dashboard.md',
      external: true,
    },
    {
      id: 'playbook',
      title: 'Tester playbook',
      description: 'Full onboarding, tester etiquette, and escalation paths for urgent bugs.',
      href: 'https://github.com/Ceyvion/charmxpals/blob/main/docs/beta/WAVE1.md',
      external: true,
    },
    {
      id: 'latency-log',
      title: 'Latency logging template',
      description: 'Suggested spreadsheet headers for timing the claim flow with your squad.',
      href: 'https://github.com/Ceyvion/charmxpals/blob/main/docs/beta/latency-log-template.md',
      external: true,
    },
    {
      id: 'roadmap',
      title: 'Roadmap snapshot',
      description: 'Check current priorities and what feedback feeds the next patch.',
      href: '/orchestrator',
    },
  ],
};

export function getBetaDashboardContent(): BetaDashboardContent {
  return config;
}
