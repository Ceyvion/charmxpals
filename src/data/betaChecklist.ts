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
    title: 'Tour Explore page',
    description: 'Verify ownership badges post-claim.',
    href: '/explore',
    tip: 'Call out any missing badges or stale states.',
  },
  {
    id: 'claim',
    title: 'Redeem code',
    description: 'Time the flow (<60s target).',
    href: '/claim',
    tip: 'Start a timer from submit to inventory sync.',
  },
  {
    id: 'viewer',
    title: 'Open the 3D viewer',
    description: 'Rotate/zoom and note rendering issues.',
    href: '/me',
    tip: 'Test on multiple devices/screens if you can.',
  },
  {
    id: 'mini-game',
    title: 'Complete runner session',
    description: 'Log bugs and impossible patterns.',
    href: '/play/runner',
    tip: 'Record a clip if collisions feel unfair.',
  },
  {
    id: 'feedback',
    title: 'Submit feedback',
    description: 'Include device info + repro steps.',
    external: true,
    href: 'mailto:charmxpals.contact@gmail.com?subject=Beta%20feedback',
    tip: 'Screenshots, clips, and repro steps keep us fast.',
  },
];
