# Requirements: Image Receipts

Phase 8 of Trial Graveyard (GitHub issue #20). The user can add a screenshot or photo of a trial confirmation. The text is read on the device with OCR, parsed by the existing receipt parser, and shown in the same review form as a pasted receipt. Requirements use EARS notation. Product rules come from `.kiro/steering/product.md`, `tech.md` and `structure.md`. This spec extends `.kiro/specs/trial-graveyard-mvp/` and reuses `parseReceipt` from `src/lib/parse`.

## Glossary
- **Image receipt**: a screenshot or photo of a trial confirmation, receipt or renewal notice.
- **OCR engine**: an object implementing `OcrEngine` that turns an image into text and a confidence score.
- **Preprocessing**: downscaling and grayscale conversion done on a canvas before OCR.
- **Normaliser**: `normaliseOcrText`, the pure function that cleans raw OCR text before parsing.
- **Confidence**: a number from 0 to 100 reported by the OCR engine for the whole image.
- **Confirmed trial**: the trial the user saves from the form. It is the only data stored.

## Requirements

### G1. Image input
User story: As a user with a screenshot of a confirmation email, I want to add it directly instead of retyping it.
1. THE "Paste a receipt" box SHALL offer an image option next to the text area.
2. THE image option SHALL provide a file picker with `accept="image/*"`.
3. THE image option SHALL provide a second input with `capture="environment"` so mobile browsers can open the camera.
4. WHEN the user drops an image file on the drop zone, THE app SHALL use that file.
5. WHEN the user pastes an image from the clipboard while the receipt box is focused, THE app SHALL use that image.
6. WHEN an image is chosen, THE app SHALL show a thumbnail preview with alternative text.
7. IF the chosen file is not an image, THEN THE app SHALL say so in a friendly message and SHALL NOT start OCR.
8. WHEN the preview is replaced or removed, or the box unmounts, THE app SHALL revoke the preview object URL.

### G2. On-device OCR
1. THE app SHALL read images with `tesseract.js` using the English language data.
2. THE app SHALL load `tesseract.js` with a dynamic `import()` only after an image is chosen, so the main bundle does not grow.
3. THE app SHALL NOT import `tesseract.js` statically anywhere in `src/`.
4. THE app SHALL NOT send the image or its text to any server of its own.
5. WHERE a service worker is active, THE app SHALL cache the Tesseract worker, core and language assets at runtime so image receipts work offline after the first use.

### G3. Preprocessing
1. BEFORE OCR, THE app SHALL downscale an image whose long edge is larger than 1600 px so its long edge is 1600 px, keeping the aspect ratio.
2. THE app SHALL NOT upscale images that are 1600 px or smaller on the long edge.
3. BEFORE OCR, THE app SHALL convert the image to grayscale on a canvas.
4. THE size and pixel math SHALL be pure functions that run without a canvas, so they can be unit tested.
5. IF the browser cannot decode the image or has no canvas, THEN THE app SHALL show the friendly error in G7 and SHALL offer manual entry.

### G4. Progress and cancel
1. WHILE OCR runs, THE app SHALL show "The spirits are deciphering…" with a progress bar that has `role="progressbar"` and a value from 0 to 100.
2. WHILE OCR runs, THE app SHALL show a Cancel button.
3. WHEN the user presses Cancel, THE app SHALL abort the engine through an `AbortSignal`, stop showing progress and say the spirits were sent back to rest.
4. WHEN the user prefers reduced motion, THE app SHALL NOT animate the progress indicator.
5. THE progress text SHALL be announced politely to assistive technology.

### G5. Parse and prefill
1. WHEN OCR finishes with text, THE app SHALL normalise the text and pass it to `parseReceipt` with the current time.
2. WHEN `parseReceipt` finds fields, THE app SHALL prefill the same form used for text receipts through `onParsed`, and SHALL NOT save anything by itself.
3. THE app SHALL show a confidence hint that says whether the spirits read the image clearly, partly or poorly, based on the OCR confidence.
4. THE app SHALL show the raw OCR text in a collapsible "What the spirits read" section.
5. WHEN the user edits the text in that section and presses "Read again", THE app SHALL parse the edited text and prefill the form again.
6. THE normaliser SHALL be idempotent: normalising its own output SHALL return the same text.

### G6. Privacy
1. THE app SHALL tell the user in the interface that the image never leaves the device and that only the confirmed trial is saved.
2. THE app SHALL NOT store the image, the preview URL or the OCR text in the store, IndexedDB or any other persistent storage.
3. WHEN the user removes the image or the box unmounts, THE app SHALL drop the image and the OCR text from memory.

### G7. Errors
1. IF OCR returns no text, THEN THE app SHALL show a friendly graveyard-voice message and a button to enter the trial by hand.
2. IF OCR confidence is below 40, THEN THE app SHALL show a friendly message that the spirits could not read the image well, keep the raw text available for fixing, and offer manual entry.
3. IF OCR text is found but the parser finds no fields, THEN THE app SHALL show the same low-result message with the raw text and manual entry.
4. IF the engine fails to load or throws, THEN THE app SHALL show a friendly message and offer manual entry.
5. WHEN the user chooses manual entry, THE app SHALL move focus to the form's name field.
6. THE messages SHALL never blame the user.

### G8. OcrEngine abstraction
1. THE app SHALL define `OcrEngine` in `src/lib/ocr/types.ts` as `recognize(image, { signal, onProgress }) => Promise<{ text, confidence }>`.
2. THE UI SHALL depend only on `OcrEngine`, received as a prop, and SHALL default to the lazy Tesseract engine.
3. THE repository SHALL provide a fake engine for tests.
4. THE tests SHALL NOT import `tesseract.js` and SHALL NOT download models.

### G9. Samples
1. THE repository SHALL contain 3 small sample receipt PNGs in `public/samples/` (Disney+, Spotify, Adobe trial confirmations) with invented data and no personal information.
2. THE repository SHALL contain the script that generates them.
3. THE UI SHALL offer a "Try a sample screenshot" link that loads a sample through `import.meta.env.BASE_URL` and runs the normal flow.

### G10. Tests and docs
1. THE preprocessing helpers SHALL have unit tests.
2. THE OCR-to-form mapping SHALL have unit tests that use the fake engine.
3. THE upload flow SHALL have a component test that includes a vitest-axe check.
4. THE normaliser SHALL have a fast-check property test for idempotence.
5. THE README SHALL have an "Image receipts" section and the Kiro features table SHALL list this spec.
6. THIS spec SHALL be committed under `.kiro/specs/image-receipts/` and its tasks ticked when done.
