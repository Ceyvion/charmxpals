import { notFound } from 'next/navigation';

import { StylesDebugClient } from './StylesDebugClient';

export default function StyleDebug() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_STYLE_STATUS !== '1') {
    return notFound();
  }

  return <StylesDebugClient />;
}
