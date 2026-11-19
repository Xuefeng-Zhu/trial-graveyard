import { lazy, Suspense } from 'react';

// Separate chunk: the canvas code only downloads when motion is allowed.
const AtmosphereCanvas = lazy(() => import('./AtmosphereCanvas'));

export function Atmosphere({ motion }: { motion: boolean }) {
  if (!motion) return null;
  return (
    <Suspense fallback={null}>
      <AtmosphereCanvas />
    </Suspense>
  );
}
