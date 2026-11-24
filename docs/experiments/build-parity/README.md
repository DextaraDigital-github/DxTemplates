# Build parity: browser build vs server build (step 5 of the plan, first slice, 2026-11-25)

**Question.** Step 5 of the roadmap ("one engine") moves the screen path to the server: the browser stops merging sections and posting HTML, and the same Apex build that Flow/Apex generation
uses serves both. That is only safe if the **server build gives the same document as the browser build**. Today the two pipelines are separate code:

| | Browser build (record-page widget) | Server build (Flow / Apex / API) |
|---|---|---|
| Who merges sections, fields, rules, Related Objects | the LWC (`dxShowSelectedTemplate` and friends), then posts the HTML | `documentAutomationController` + `DisplayPDFController.getTemplateSectionsMulRecords` + `ROsectionAutomationController` |
| Who renders the PDF | Visualforce page `renderAsPdfLWC` | the same page (or `Blob.toPdf`, see `docs/architecture/pdf-engine-switch.md`) |

Both are rendered by the **same** page, so any difference comes from the **build**.

## Method
The 9 sample templates were generated from the widget on 2026-10-28 (`docs/testing/baseline/*.pdf`, same records). The same 9 were generated through the server route on 2026-11-24
(`docs/experiments/parity-poc`). `compare_builds.mjs` reads both with pdf.js and compares page count, words (as a multiset) and the first lines.

## Result
**After one fix, 9 of 9 templates match: same pages, same words.** See `results-2026-11-25.md`.

Before the fix 2 of 9 differed (Claim Form 5 vs 6 pages, Employment Contract 5 vs 6 pages, PDFs about 7 times bigger on the server route). Cause, found by `find_unicode_chars.apex`:
the rich-text editor leaves its cursor in saved content as `<span class="ql-cursor">U+FEFF</span>`. `DisplayPDFController.needsUnicodeFont` counted that invisible character as
"non-Latin text" and switched the **whole document** to Arial Unicode MS (wider text, an extra page, a 90 KB PDF). The widget did not hit it. **Fix:** invisible formatting characters
(FEFF, 200B to 200F, 2060) no longer count; real non-Latin letters still switch the font. Test: `DisplayPDFFontNeed_Test.invisibleFormattingCharactersDoNotNeedTheUnicodeFont` (failed before, passes now).
This is a real defect fix for every Flow / Apex user, independent of step 5.

## What this does and does not prove
Proven: for static sections, tables, merge fields and header/footer, the two builds agree. **Not yet covered** (each needs its own parity check before the browser build is retired):
Related Objects (browser LWC vs `ROsectionAutomationController`), visibility rules (JS copy vs Apex `SectionVisibility`), class and Flow values, translations, and the widget's page size /
orientation / watermark parameters. `ZZ Placeholders`, `ZZ Flow Placeholders` and `ZZ Clone RO` exist for the first three, but have no widget baseline yet.

## Files
| File | Purpose |
|---|---|
| `compare_builds.mjs` | Compares a folder of widget PDFs with a folder of server PDFs (pages, words, first lines). Needs `pdfjs-dist` (legacy build). |
| `find_unicode_chars.apex` | Lists the characters that make a stored document switch to the Unicode font, with context. |
| `results-2026-11-25.md` | Report of the run described here. |

## Rerun
1. Server PDFs: `docs/experiments/parity-poc/run_parity.ps1` (needs the page `zzRenderHtml` only for its toPdf half), then download the newest `vf <template>.pdf` of each with `sf api request rest ... --stream-to-file`.
2. `node compare_builds.mjs docs/testing/baseline <server dir> > report.md`
