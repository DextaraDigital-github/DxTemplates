# Parity PoC: Visualforce PDF engine vs `Blob.toPdf` on the real templates (2026-11-10)

**Question:** can `Blob.toPdf` replace the Visualforce page `renderAsPdfLWC` as the PDF engine for the headless/server route, and what must be
adapted? **Not a decision, not part of the package:** nothing here ships; the production code is untouched.

## Result in one paragraph
For all 12 templates that could be rendered (the 8 sample templates of the dev org that are active or related, the placeholder templates, and the
68-page "ZZ Clone RO"), the `Blob.toPdf` PDF has the **same page count, the same words, the same images and the same file size** as the Visualforce
PDF, and **every text item sits at the same position on every page**. 3 of 12 are even byte-identical (the rest differ in bytes only, not in size or
layout; both routes use the same engine). Speed: small templates take 0.2 to 0.6 s on Visualforce and 0.01 to 0.4 s with `toPdf`; the 68-page
Related Objects template (2.2 million characters of HTML) took 4.1 s on Visualforce and 1.4 s with `toPdf`. Full table: [results-2026-11-10.md](results-2026-11-10.md).

## The one adapter that is needed
The HTML that Salesforce returns for the page is a full Salesforce page (two `<head>` blocks, `<script>` tags, no `<body>`, the page CSS inside
`<style media="print">`). Given as it is to `Blob.toPdf`, **all page rules were ignored** (Letter instead of A4, no margins, no header/footer boxes, other page
count). Rebuilt as one `<head>` with every `<style>` block and one `<body>` without scripts, it renders like Visualforce. In the production design this
is not an adapter: the engine will build the HTML itself. Implemented in `2_render_topdf.apex` (`normalizeForToPdf`, `takeOut`, `dropTags`) with `indexOf`
loops, because lazy regexes fail with "Regex too complicated" on documents over about 1 MB (hit on the 2.2 MB template).

## Not covered / known gaps
* **ZZ Heavy Combined** (3,400 Related Objects rows) has no result: the server route itself (`documentGenerationForAutomationContext`) exceeds the CPU limit
  while building the document (the known "about 1.4 ms per Related Objects row" limit), before any PDF engine is involved.
* Page size A4 portrait only; landscape, other sizes, watermark and first-page headers were verified earlier with hand-written HTML, not through this comparison.
* Templates with images from Files: the 6 images of "Claim Form" and the images of the sample templates rendered in both routes (image counts equal). Images
  inserted in the same transaction (grey placeholder in `toPdf`) are not part of this comparison.
* One Account, one Opportunity and one Case record; Related Objects only in "ZZ Clone RO".
* Fonts: the comparison does not parse font names (the PDF reader reported none for both); font fallbacks (Calibri to Helvetica) are identical because the engine is the same.

## Files
| File | Purpose |
|---|---|
| `zzRenderHtml.page` (+ meta) | Copy of `renderAsPdfLWC` without `renderas="PDF"` and with `rte_tbl1.css` inlined: returns the exact HTML of the production page via `getContent()`. **Dev org only; never package.** Deploy by copying it into `force-app/main/default/pages`, deploying, and deleting the copy. |
| `1_generate.apex` | Step 1 (one template per run): the real global `documentAutomationController.generateDocument` creates the `Document__c` records. |
| `2_render_topdf.apex` | Step 2 (one template per run): baseline `getContentAsPDF()` of the production page and candidate `Blob.toPdf` of the same page's HTML, stored as Attachments. |
| `run_parity.ps1` | Runs both steps for the whole corpus (`-SkipGenerate` repeats step 2 only, `-Only '<template>'` for one). |
| `fetch_results.mjs`, `compare.mjs` | Download the attachments and compare pairs (pages, words, images, bytes, text positions). Need `pdfjs-dist` (legacy build). |
| `results-2026-11-10.md` | The comparison report of the run described here. |

## Rerun
```
cp docs/experiments/parity-poc/zzRenderHtml.page* force-app/main/default/pages/ && sf project deploy start -o <alias> -d force-app/main/default/pages/zzRenderHtml.page ; rm force-app/main/default/pages/zzRenderHtml.page*
powershell -File docs/experiments/parity-poc/run_parity.ps1 -Org <alias>
SF_TOKEN=... SF_URL=... node docs/experiments/parity-poc/fetch_results.mjs out
node docs/experiments/parity-poc/compare.mjs out > report.md
```
Record ids in `run_parity.ps1` (Account, Opportunity, Case) belong to the dev org; replace them for another org.
