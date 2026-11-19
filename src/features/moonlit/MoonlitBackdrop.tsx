import { Atmosphere } from './Atmosphere';
import { ParallaxScene } from './ParallaxScene';

/** Decorative backdrop behind the app: parallax scene plus lazy particle canvas. */
export function MoonlitBackdrop({ motion }: { motion: boolean }) {
  return (
    <>
      <ParallaxScene motion={motion} />
      <Atmosphere motion={motion} />
    </>
  );
}
