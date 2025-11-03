export type BetaChecklistTask = {
  id: string;
  title: string;
  description: string;
  href?: string;
  external?: boolean;
  tip?: string;
};

export const betaChecklistTasks: BetaChecklistTask[] = [
  {
    id: 'explore',
    title: 'Tour the Explore page',
    description: 'Browse featured pals and confirm ownership badges render after you claim.',
    href: '/explore',
    tip: 'Favorite one pal you love and note what made it pop.',
  },
  {
    id: 'claim',
    title: 'Redeem your collectible code',
    description: 'Use the code we sent at /claim and confirm it appears in My Pals.',
    href: '/claim',
    tip: 'Time the flow—should be <60s from submit to inventory.',
  },
  {
    id: 'viewer',
    title: 'Open the 3D viewer',
    description: 'On your pal detail page, rotate/zoom the model and note any glitches.',
    href: '/me',
    tip: 'Try on mobile + desktop; note any wobble or texture pop-in.',
  },
  {
    id: 'mini-game',
    title: 'Play a mini-game',
    description: 'Visit Play → Runner, finish a round, and capture any bugs or unfair moments.',
    href: '/play/runner',
    tip: 'Record the run and highlight any spikes or impossible patterns.',
  },
  {
    id: 'feedback',
    title: 'Share feedback',
    description: 'Drop notes, screenshots, or ideas in the feedback channel.',
    external: true,
    href: 'mailto:beta@charmxpals.com?subject=Beta%20feedback',
    tip: 'Bundle repro steps + device info so we can fix fast.',
  },
];
