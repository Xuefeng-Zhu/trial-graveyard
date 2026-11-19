QA on the live app (1eed06d) found bugs in parsing and the Séance copy.

1. **OCR sample name grabs an extra word.** Add trial → "Try a sample screenshot" fills Name with `Phantomflix Your` (it swallows the first word of the next sentence). The name extractor should stop at sentence and line boundaries and common words (Your, Free, Trial, Premium...), or match against known brand tokens.
2. **OCR sample sets an odd charge date.** The same sample silently sets Charge date to 11/15/2027. Check the date extraction for the sample image (year inference/rollover) and show which text the date was read from, so the user can verify it.
3. **Séance plural.** "The spirits have read 1 letters so far." → use proper singular/plural handling ("1 letter", "3 letters"), and the same for "1 spirit found" style strings.
4. **Séance snippets cut mid-URL.** Result snippets are truncated mid-sentence or mid-URL, e.g. "Manage your plan: https". Truncate at word boundaries with an ellipsis, and never break inside a URL (drop it or keep it whole).

Add unit tests with the exact sample OCR text and the plural strings. Keep typecheck, tests (504+) and the build green.
