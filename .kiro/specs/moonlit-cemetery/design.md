# Design: Moonlit Cemetery

Follows `.kiro/steering/tech.md` and `structure.md`. IDs (M1..M10) refer to `requirements.md`.

## 1. Where things go
```
src/
  domain/motion.ts            pure motionFor(view), isMotionAllowed(osReduced, calm) (M4, M8)
  state/storage.ts, store.ts  settings.calm, toggleCalm, migration default (M8.2, M8.3)
  design/tokens.css           midnight, silver, ectoplasm palette, glass utility (M8.4)
  design/fonts.ts             Cormorant Garamond headings, Inter body
  features/moonlit/
    useMotionAllowed.ts       OS reduced motion OR calm (M8.1)
    ParallaxScene.tsx         layered scene, motion values (M1)
    useParallaxInput.ts       pointer, scroll, tilt into springs (M1.2, M1.3)
    particles.ts              pure pooled particle simulation (M2)
    AtmosphereCanvas.tsx      canvas loop, default export, lazy chunk (M2)
    Atmosphere.tsx            React.lazy wrapper
    MoonlitBackdrop.tsx       ParallaxScene + Atmosphere, mounted by App
  features/graveyard/         tombstones, restlessness, interactions (later tasks)
```

## 2. Motion mapping (M4)
`motionFor(view)` returns `{ level, glow, cracks, tremble, hand, dirt, ghost, intensity }`.
- grave, remaining <= 24 h (including overdue): level `rising`, all flags on except ghost.
- grave, remaining <= 72 h: level `restless`, glow, cracks, tremble.
- otherwise, and for cancelled graves: level `calm`, all flags off.
- kept: level `ghost`, only `ghost` on.
`intensity` is `1 - remaining / 72 h` clamped to [0, 1] for graves, 0 otherwise. Stage thresholds in `stage.ts` stay untouched; the 24 h hand cut is local to `motion.ts` because the zombie stage starts at 48 h.

## 3. Calm mode (M8)
`settings.calm` is persisted next to `daylight` and `soundOn`. `migrate` fills `calm: false` when stored settings lack it, so schema version stays 1. `useMotionAllowed()` combines `useReducedMotion()` with the setting through `isMotionAllowed`. When off: no pointer, scroll or tilt listeners, no canvas, no CSS animation classes.

## 4. Parallax (M1)
Five absolutely positioned layers in a fixed container: sky (0.02), hills (0.05), graves slot (0.09), fog (0.13), foreground (0.2). Pointer, scroll and `deviceorientation` write normalized values into Framer Motion `useMotionValue`s through one rAF-throttled handler. Each layer uses `useSpring` and `useTransform` to produce `x`, `y` transforms (translate3d, `will-change: transform`). Layers are slightly oversized (inset -4%) to hide edges. No `getBoundingClientRect` in handlers; the viewport size is read on resize only.

## 5. Atmosphere (M2)
`particles.ts` holds fixed pools (fog bands, fireflies, one shooting star slot) and `step(state, dt, random)`, so it is testable without a canvas. `AtmosphereCanvas` runs a rAF loop with a delta clamp, DPR capped at 2, and stops on `visibilitychange` hidden. `Atmosphere.tsx` imports it via `React.lazy`, so Vite emits a separate chunk. The moon glow is a CSS keyframe on a radial gradient (opacity and transform only).

## 6. Visual tokens (M8.4)
Night: bg `#0a1030`, surface `#141c44`, text `#e8eefc` (silver), accent `#7CFFB2`. Daylight keeps its own softer palette. A `.glass` utility gives translucent, blurred panels with a silver hairline border, and falls back to a solid surface when `backdrop-filter` is unsupported.

## 7. Testing
Example and fast-check tests for `motion.ts` (100% coverage), store tests for calm persistence and migration, component tests for `useMotionAllowed` and `ParallaxScene` (static when disabled), a pure test for particle stepping. Later tasks update App, graveyard and landing tests.

## 8. Risks
- Particle cost: capped counts and DPR; paused when hidden.
- jsdom has no canvas or matchMedia: tests stub both.
- Fonts add weight: only the 600 weight of the serif is imported.
