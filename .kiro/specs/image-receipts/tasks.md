# Tasks: Image Receipts

Ordered and incremental. Each task leaves the app building and tests passing. Requirement references are in brackets.

- [x] 1. Spec
  - Write `requirements.md`, `design.md` and `tasks.md` for this feature. [G10.6]

- [x] 2. OCR library
  - [x] 2.1 `src/lib/ocr/types.ts` with `OcrEngine`, and the fake engine in `fake.ts`. [G8.1, G8.3]
  - [x] 2.2 `normalise.ts` with `normaliseOcrText`. [G5.6]
  - [x] 2.3 `preprocess.ts` with `fitWithin`, `toGrayscale` and the canvas `preprocessImage`. [G3.1 to G3.5]
  - [x] 2.4 `read.ts` mapping OCR text to a `ParseResult`, confidence hint and problems. [G5.1, G5.3, G7.1 to G7.3]
  - [x] 2.5 `tesseractEngine.ts` with the lazy `import('tesseract.js')`, and add the `tesseract.js` dependency. [G2.1 to G2.3]

- [x] 3. Interface
  - [x] 3.1 `ImageReceipt.tsx` input: file picker, camera capture, drop, clipboard paste, thumbnail. [G1.1 to G1.8]
  - [x] 3.2 Progress, cancel and reduced motion. [G4.1 to G4.5]
  - [x] 3.3 Results: confidence hint, "What the spirits read", "Read again", privacy note. [G5.2 to G5.5, G6.1 to G6.3]
  - [x] 3.4 Errors and manual entry fallback, wired into `PasteBox` and `App`. [G7.1 to G7.6]
  - [x] 3.5 "Try a sample screenshot" link. [G9.3]

- [x] 4. Samples and offline
  - [x] 4.1 `scripts/make-samples.py` and three PNGs in `public/samples/`. [G9.1, G9.2]
  - [x] 4.2 Workbox runtime caching for Tesseract assets in `vite.config.ts`. [G2.5]

- [x] 5. Tests
  - [x] 5.1 Unit tests for preprocessing and for the mapping with the fake engine. [G10.1, G10.2]
  - [x] 5.2 Component test for the upload flow with vitest-axe. [G10.3]
  - [x] 5.3 fast-check idempotence property for the normaliser. [G10.4]
  - [x] 5.4 Confirm no test imports `tesseract.js`. [G8.4]

- [x] 6. Docs
  - [x] 6.1 README "Image receipts" section and Kiro features table (Specs (4)). [G10.5]
