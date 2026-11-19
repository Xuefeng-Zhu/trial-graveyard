# Tasks: Image Receipts

Ordered and incremental. Each task leaves the app building and tests passing. Requirement references are in brackets.

- [ ] 1. Spec
  - Write `requirements.md`, `design.md` and `tasks.md` for this feature. [G10.6]

- [ ] 2. OCR library
  - [ ] 2.1 `src/lib/ocr/types.ts` with `OcrEngine`, and the fake engine in `fake.ts`. [G8.1, G8.3]
  - [ ] 2.2 `normalise.ts` with `normaliseOcrText`. [G5.6]
  - [ ] 2.3 `preprocess.ts` with `fitWithin`, `toGrayscale` and the canvas `preprocessImage`. [G3.1 to G3.5]
  - [ ] 2.4 `read.ts` mapping OCR text to a `ParseResult`, confidence hint and problems. [G5.1, G5.3, G7.1 to G7.3]
  - [ ] 2.5 `tesseractEngine.ts` with the lazy `import('tesseract.js')`, and add the `tesseract.js` dependency. [G2.1 to G2.3]

- [ ] 3. Interface
  - [ ] 3.1 `ImageReceipt.tsx` input: file picker, camera capture, drop, clipboard paste, thumbnail. [G1.1 to G1.8]
  - [ ] 3.2 Progress, cancel and reduced motion. [G4.1 to G4.5]
  - [ ] 3.3 Results: confidence hint, "What the spirits read", "Read again", privacy note. [G5.2 to G5.5, G6.1 to G6.3]
  - [ ] 3.4 Errors and manual entry fallback, wired into `PasteBox` and `App`. [G7.1 to G7.6]
  - [ ] 3.5 "Try a sample screenshot" link. [G9.3]

- [ ] 4. Samples and offline
  - [ ] 4.1 `scripts/make-samples.py` and three PNGs in `public/samples/`. [G9.1, G9.2]
  - [ ] 4.2 Workbox runtime caching for Tesseract assets in `vite.config.ts`. [G2.5]

- [ ] 5. Tests
  - [ ] 5.1 Unit tests for preprocessing and for the mapping with the fake engine. [G10.1, G10.2]
  - [ ] 5.2 Component test for the upload flow with vitest-axe. [G10.3]
  - [ ] 5.3 fast-check idempotence property for the normaliser. [G10.4]
  - [ ] 5.4 Confirm no test imports `tesseract.js`. [G8.4]

- [ ] 6. Docs
  - [ ] 6.1 README "Image receipts" section and Kiro features table (Specs (4)). [G10.5]
