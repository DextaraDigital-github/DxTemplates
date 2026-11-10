# PDF engine spikes: fonts, CSS, post-processing (2026-11-10)

Three proofs of concept on what `Blob.toPdf` can and cannot do **inside Salesforce**, after the owner ruled out any external renderer (see
`docs/roadmap/product-vision-and-architecture.md`, section 11). Dev org only; nothing here is part of the package.

## Spike 1: custom fonts with `@font-face` (`spike1_fontface.apex`, `spike1b_fontface.apex`, `zzFontSpike.page`)
**Result: not possible, on either engine.** The font (Liberation Sans Regular, SIL OFL, 139 KB) was offered as a Salesforce File (relative
`/sfc/servlet.shepherd/version/download/<id>`), as a static resource (`/resource/ZZSpikeFont`, also with the timestamp path and quoted), as an
Attachment (`/servlet/servlet.FileDownload?file=<id>`), with and without `-fs-pdf-font-embed: embed; -fs-pdf-font-encoding: Identity-H`, with `format("truetype")`,
and through the **Visualforce PDF engine** (`$Resource` URL) for comparison. 10 variants: no crash, but **no font is embedded** (PDF stays 1,021 bytes
like the control; no `/FontFile`; the text falls back to the default font). Earlier result for `data:` and https URLs: the engine crashes
("Error accessing PDF resource"). So brand fonts cannot be used through `@font-face`.
Side findings: the engine does not know the CSS name "Helvetica" (it fell back to Times; "Courier", "Arial" and the generic families are known);
a `<style>` placed inside `<body>` is printed as text, put styles in `<head>`.

## Spike 2: which CSS is honoured (`spike2_css.apex`, `analyze_css.mjs`)
One A4 page per feature, drawing operations read with pdf.js and compared with a control page.

| Works | Ignored (no effect) | Harmful |
|---|---|---|
| float, clear; inline-block; `position: absolute / relative`; `overflow: hidden` (clips); `display: table / table-cell` on divs; dashed, dotted, double borders; underline, line-through; `text-transform`; `list-style-type` (roman etc.); `text-align: justify`, `text-indent`, `line-height`; `white-space: nowrap`; `border-spacing`; `:before` / `:after` with `content`; `page-break-inside`; background image from a File | `border-radius`; `opacity`; `box-shadow`; `text-shadow`; `transform`; `letter-spacing`; `:nth-child`; `box-sizing: border-box`; `calc()`; flexbox; CSS columns; `text-overflow: ellipsis` | **`rgba()` colours and `linear-gradient` backgrounds drop the whole background** (nothing is painted). Never emit them. |

Not decided by this method: `background-size`, `object-fit`, `vertical-align: middle` (the analyser could not tell). The designer must therefore express every layout with tables,
floats, inline-blocks and absolute positioning, and every colour as `#rrggbb`.

## Spike 3: post-processing the PDF in Apex (`spike3_postprocess.apex`, `verify_postprocess.mjs`)
**Result: works.** `Blob.toPdf` writes simple PDFs (iText 2.0.8, classic xref table, page resources inline). The script appends an **incremental update**
(new objects + a new xref; the original bytes are untouched) in 56 ms of CPU for a 2-page, 82 KB PDF:
* **Stamp every page:** rotated text ("CONFIDENTIAL"), a footer line, a circle (4 Bezier curves) and a polyline, in page coordinates, using a new base-14 font object.
* **Image to vector:** the `<img>` (a PNG File) that the engine drew was replaced by a **Form XObject** drawn in the unit square (bars + line): pdf.js reports
  the image gone, one vector form with 9 paths in its place; the engine's own placement and size of the image decide where the chart appears.
* pdf.js opens the result; the original text is unchanged; stamp text is on both pages. (A visual check in Chrome was not possible: the browser tool froze.)

What this opens: stamps and watermarks with any text, vector charts and QR codes that stay sharp, page numbering outside the engine, merging, later PDF/A-style
metadata. What it does not give: custom fonts (that would need a TrueType parser and glyph widths in Apex), or layout (positions of text are not known to the caller).

## Files
`spike1_fontface.apex`, `spike1b_fontface.apex`, `zzFontSpike.page(-meta.xml)` (Visualforce comparison page, deploy to a dev org only), `spike2_css.apex`, `analyze_css.mjs`,
`spike3_postprocess.apex`, `verify_postprocess.mjs`. Record and file ids (Account, ContentVersion) are those of the dev org. The font file is not committed
(`LiberationSans-Regular.ttf` is in `pdfjs-dist/standard_fonts`).
