# Design: Image Receipts

Follows `.kiro/steering/tech.md` and `structure.md`. Requirement IDs (G1..G10) refer to `requirements.md`. Builds on `src/lib/parse`, `src/features/editor` and `src/features/graveyard/useReducedMotion.ts`.

## 1. Where things go

```
src/
  lib/
    ocr/
      types.ts            OcrEngine, OcrResult, OcrOptions (G8.1)
      normalise.ts        normaliseOcrText, idempotent (G5.6)
      preprocess.ts       fitWithin, toGrayscale (pure) and preprocessImage (canvas) (G3)
      read.ts             readImageReceipt: engine + normaliser + parseReceipt (G5, G7)
      fake.ts             createFakeEngine for tests (G8.3)
      tesseractEngine.ts  lazy engine, the only file that mentions tesseract.js (G2)
      index.ts            barrel (tesseractEngine only holds a dynamic import, so this stays light)
      *.test.ts           unit and property tests (G10)
  features/editor/
    ImageReceipt.tsx      input, drop zone, preview, progress, results (G1, G4 to G7)
    PasteBox.tsx          renders ImageReceipt under the text area, passes engine prop
    editor.module.css     styles for the new parts
public/samples/           3 generated PNGs (G9)
scripts/make-samples.py   generator (G9.2)
vite.config.ts            workbox runtimeCaching for Tesseract assets (G2.5)
```

## 2. OcrEngine

```ts
interface OcrEngine {
  recognize(image: Blob | HTMLCanvasElement, opts: { signal?: AbortSignal; onProgress?: (pct: number) => void }): Promise<{ text: string; confidence: number }>;
}
```
`confidence` is 0 to 100. Engines reject with an `AbortError` when the signal aborts. The fake engine returns canned text or errors, reports progress steps, and honours the signal.

## 3. Tesseract engine
`createTesseractEngine()` returns an `OcrEngine`. On the first `recognize` it runs `await import('tesseract.js')`, so Vite emits a separate chunk. It creates a worker for `eng`, forwards `logger` progress (0 to 1, scaled to 0 to 100), and terminates the worker when done or aborted. Nothing in `src/` imports it except `defaultEngine` through that dynamic path, and tests never import this file.

Worker, core and language data come from the tesseract.js defaults (jsDelivr for worker and core, the tessdata CDN for `eng`). These are fetched once, not at page load.

## 4. Preprocessing
- `fitWithin(w, h, max = 1600)` returns the target size. It never upscales and keeps the aspect ratio.
- `toGrayscale(data)` rewrites RGBA pixels in place with luma `0.299 R + 0.587 G + 0.114 B`.
- `preprocessImage(blob)` decodes with `createImageBitmap` (or an `Image` fallback), draws on a canvas at the fitted size, grayscales through `getImageData`, and returns a canvas. It throws when there is no canvas, and the UI shows the G7.4 message.

## 5. Normaliser
`normaliseOcrText` applies NFKC, replaces common OCR glyph noise (curly quotes, `|` between digits to `1`, stray non-printing characters), joins hyphenated line breaks, collapses spaces within lines and blank lines, and trims. Each step is idempotent and they are ordered so the output is a fixed point. Covered by a fast-check property.

## 6. Mapping: `readImageReceipt`
`readImageReceipt(engine, image, now, opts)` runs the engine, normalises, and returns `{ text, confidence, parsed, hint, problem }`:
- `hint`: `clear` at 70 or more, `partial` at 40 to 69, `poor` below 40.
- `problem`: `no-text` when the normalised text is empty, `low-confidence` when confidence is below 40, `no-fields` when the parser returns nothing, otherwise none.
`parseText(text, now)` is exported so "Read again" reuses the same path without OCR. The email scanner's signals are not used. A bare receipt screenshot has no subject or sender.

## 7. UI: ImageReceipt
State machine: `idle`, `reading` (progress, AbortController), `done` (text, hint, problem), `error`. The drop zone is a labelled region with the two file inputs and a paste handler. The thumbnail uses `URL.createObjectURL` and is revoked on change and unmount. The progress bar uses `role="progressbar"`, and the label sits in a polite live region. A CSS shimmer runs only when `useReducedMotion()` is false. Results show the hint, the privacy note, a `<details>` "What the spirits read" with an editable textarea and "Read again", and, for problems, the friendly message plus "Enter it by hand", which calls `onManual`. PasteBox forwards `onParsed`, and App focuses the form's name field for `onManual`.

## 8. Samples
`scripts/make-samples.py` (Pillow) draws three confirmation cards with invented data and writes `public/samples/{phantomflix,wraithwave,cryptic-cloud}.png`. "Try a sample screenshot" fetches `${import.meta.env.BASE_URL}samples/phantomflix.png` and feeds the blob to the same flow.

## 9. Offline
`globPatterns` stays as is, so samples and PNGs under 2 MiB are precached and no large model file is. `workbox.runtimeCaching` adds a `CacheFirst` rule named `tesseract-assets` for requests to `cdn.jsdelivr.net` and `tessdata.projectnaptha.com`, with a 30 day expiry and 20 entries, and `cacheableResponse` statuses 0 and 200 so opaque responses work.

## 10. Testing
- Unit: `fitWithin`, `toGrayscale`, `normaliseOcrText` examples, `readImageReceipt` with the fake engine.
- Property: `normaliseOcrText(normaliseOcrText(s)) === normaliseOcrText(s)`.
- Component: choose a file, see progress, cancel, prefill via `onParsed`, low-confidence error, privacy text, and a vitest-axe check. The component receives the fake engine and a fake `preprocess` function, so jsdom needs no canvas.
