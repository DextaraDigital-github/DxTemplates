# DxTemplates: product vision, target architecture and roadmap

Written 2026-11-10 as product owner / enterprise architect proposal for the owner's review. Every technical claim is tagged
**[Verified]** (measured by me in the org, scripts in `docs/experiments/`), **[Documented]** (Salesforce documentation or release
information found on the web) or **[Assumption]** (to be proven in a spike; the spike is named).

---

## 1. The short version

1. **The root cause of most pains is not the PDF engine, it is where the document is built.** Today the source of truth is HTML that a
   *browser* (the LWC) assembles and posts to the server, and a Visualforce page re-parses it. Headless generation (Flow, Apex, Queueable,
   list view) therefore needs a second implementation of everything (merge fields, Related Objects, rules, translations), the screen path
   has a hard size ceiling (a 4.85 MB post fails; about 1,100 Related Objects rows), and templates carry org-specific Ids that break
   migration.
2. **Move the document pipeline to one server-side engine and render with `Blob.toPdf(html)`.** I tested it: it runs in any context (after DML,
   in a Queueable, with no Visualforce page and no browser), it is about **20 times faster** than our Visualforce route (12,000 table rows in
   1.9 s against 39 s; 30,000 rows in 6 s), and the real merged output of our heavy template went through it with a 0.6 s total run
   [Verified]. Same rendering engine family, so header/footer margin boxes, "Page x of y", first-page rules and repeating watermarks work.
3. **Be honest about what the built-in engine cannot do, and say so in the product (no external renderer, see section 11):** no custom fonts, no SVG,
   no data-URI images, no external images, no CSS3 layout [Verified]. ~~Offer an optional "Browser-grade renderer" (headless Chromium)~~ **Rejected by the owner on 2026-11-10: record data must not leave Salesforce.**
   Custom fonts, SVG and JavaScript charts therefore stay out of scope. Everything else (charts, QR codes,
   assets) can be solved natively, and I proved the hardest one: **a chart drawn by Apex itself, stored as a File and printed in the PDF**.
4. **Make templates portable by construction.** Replace Ids inside templates with stable keys (assets, rules, clauses, classes, flows),
   keep images in an Asset Library that travels inside the export bundle, and treat a template as a versioned bundle that can move through
   sandbox to production like code.
5. **Do not rewrite the UI in React or Angular now.** Multi-Framework is real (React GA July 2026, Angular GA and managed packaging in
   Winter '27 for non-site apps) [Documented], but our six pains are renderer and data-model problems. Use a time-boxed spike to decide
   whether the *designer shell and rich-text/block editor* should be React once the model-driven engine exists (section 7).
6. **Invest the customer-experience budget in what a non-technical admin sees:** one-click generation with sensible defaults, a true
   preview (the real engine), a template "doctor" that finds mistakes before users do, a starter gallery, and a health check that would
   have caught this week's packaging surprises.

---

## 2. What I proved this week (evidence)

All scripts are in `docs/experiments/` and can be re-run in the dev org. Environment: dev scratch org, API 61.0.

### 2.1 `Blob.toPdf(html)` capability matrix

| Capability | Today's route (VF page `renderAsPdfLWC`) | `Blob.toPdf(html)` | Notes |
|---|---|---|---|
| Needs a Visualforce page and a browser-built HTML post | yes | **no** | `toPdf` takes the string directly [Verified] |
| Callable after DML in the same transaction | no ("DML currently not allowed" for `getContentAsPDF`) | **yes** | [Verified] |
| Callable in Queueable / Batch (no session) | yes, with workarounds | **yes** | PDF with a file image produced in a Queueable [Verified] |
| Speed, 12,000 table rows | 39 s end to end, 343 pages | **1.9 s**, 2.4 MB | CPU 1.8 s [Verified] |
| Speed, 30,000 rows | not attempted | **6.0 s**, 5.9 MB, heap 6.3 MB | needs async limits above this [Verified] |
| Real merged heavy template (60 paragraphs, 300 rows, nested table, long clause) | 25 s, 17 pages | **0.6 s**, 15 pages, all paragraphs, 300/300 rows, 40/40 clause paragraphs, footer on 15/15 pages | 2 of 120 nested rows not found by my text check (rows 48, 117), look like page-break artefacts, to be checked in the parity spike [Verified] |
| Header / footer as margin boxes, independent left / centre / right cells | works with our CSS | **works** | `position: running(...)` + `@top-left` etc. [Verified] |
| "Page x of y" | works | **works** | `counter(page)`, `counter(pages)` [Verified] |
| Different first page (`@page :first`, other margin and header) | works | **works** | [Verified] |
| Watermark on every page (`position: fixed`) | works | **works**, repeats on all pages | [Verified] |
| Landscape / any page size | works | **works** | [Verified] |
| Non-Latin text (Cyrillic, Chinese, Japanese) | works with `Arial Unicode MS` | **works with `Arial Unicode MS`**, dropped otherwise | server fonts only: the 14 standard PDF fonts + Arial Unicode MS; "Calibri" falls back to Helvetica [Verified] |
| Custom web fonts | no | **no, and it crashes the engine** | `@font-face` with a data URI or an https URL gives "Error accessing PDF resource" [Verified] |
| Images from Salesforce Files by relative URL `/sfc/servlet.shepherd/version/download/<id>` | works | **works, also in a Queueable** | the file must already be committed; a file inserted in the same transaction shows a grey broken-image placeholder, render in the next transaction [Verified] |
| Images as `data:` URI | no | **no** (grey placeholder) | even a valid PNG [Verified]. (Earlier I wrongly believed it worked; I checked the pixels and corrected it.) |
| Images from public URLs (Google, W3C, Wikimedia) and public file links (ContentDistribution) | works for some | **no** (grey placeholder) | [Verified] |
| SVG (inline or as image) | no | **no** | inline SVG ignored, SVG image replaced by placeholder [Verified] |
| CSS | CSS 2.1 | **CSS 2.1** | floats work; no flexbox/grid/gradients [Documented, partly Verified] |

### 2.2 Headless charts are feasible without external JavaScript

An Apex routine drew a 400x200 bar chart as a **valid PNG** (indexed colour, stored deflate, hand-written CRC32 and Adler32; CRCs and
inflation checked in Node), saved it as a File, and a Queueable printed it with `Blob.toPdf`: the PDF contains the 400x200 image with the
expected colours (white 55,840 px, blue 9,500, green 6,000, red 4,500) [Verified]. The proof of concept took 2.8 s of CPU because it loops
per pixel; drawing by runs and rows would be about ten times faster [Assumption]. Text on the chart should stay outside the bitmap
(axis labels and legend as HTML around the image), which avoids needing a bitmap font.

### 2.3 What else I measured about the current product (useful as the baseline for every "better" claim)

* Screen path ceiling: the LWC posts the whole document as one parameter; 1.8 MB works, 4.85 MB fails (3,419 Related Objects rows).
* Related Objects through the Flow action: about 1.4 ms of CPU per row, so about 2,500 rows exhaust the 10 s synchronous limit.
* Visualforce route: 12,000 rows take 39 s and 3.4 s of CPU.
* Installed (managed) package: the Flow action was invisible to Flows until it was made `global`. A customer's Apex class was first thought to need `global` too; that was wrong, the cause was the namespace lookup (fixed by `TypeLookup`, see test log 3c).

---

## 3. Diagnosis: why the six pains exist

| Pain you described | Real cause | What removes it |
|---|---|---|
| 1. Only Visualforce can render PDF, needs proper HTML | Browser-assembled HTML is the hand-off format | Server builds XHTML from a model; `Blob.toPdf` (section 4) |
| 2. Headless generation is hard; no charts | Two pipelines (browser path and server path) and an engine without JavaScript | One engine; charts as server-drawn PNG or CSS bars (no external renderer) |
| 3. Few fonts; header/footer limits | Engine fonts are fixed; header and footer modelled as three fixed cells | Honest font picker; free-form header band using `running()`; web fonts are out of scope (no external renderer) |
| 4. Rich text editor is limited | The platform RTE emits what it emits | Own block/text editor over our model (LWC with a bundled editor library, or React, section 7) |
| 5. Images: Files tab picker, resizing, migration, watermark references | Templates store `068...` Ids | Asset Library with stable keys; assets travel in the export bundle |
| 6. HTML does not obey page geometry | Page geometry is split between VF CSS and LWC inline styles | Geometry generated by the engine from the model (`@page` rules), one place |

---

## 4. Target architecture ("Document Engine")

```
 Designer (LWC / later maybe React)             Runtime entry points
 edits a versioned MODEL (JSON)                 Record-page component, list view, Flow action,
 sections, blocks, styles, bindings             Apex API, Batch/Queueable, REST, Platform Event
            |                                              |
            +------------------ one Apex API --------------+
                         DxDocument.generate(request)   (global, documented)
                                       |
     1 RESOLVE   record + related queries (user mode or system mode, configurable)
                 + class / Flow values + translations + parameters        <- one implementation
     2 DECIDE    visibility rules and conditions                          <- one Apex engine (the JS copy is removed)
     3 EXPAND    repeaters (tables, Related Objects, lists), embedded tables, sub totals
     4 DRAW      charts, QR/barcodes, asset images                        <- chart provider interface
     5 COMPOSE   XHTML + generated @page CSS (size, margins, header band, footer band, first page, watermark)
     6 RENDER    provider interface:  built-in Blob.toPdf   (Visualforce kept as fallback flag; no external renderer)
     7 STORE     File (ContentVersion + link), generation log, optional email / platform event
```

Design rules:

* **The screen preview calls the same engine** (it returns the PDF), so "what you see is what prints" is true by construction.
  The browser never builds the PDF input again; the 4.85 MB ceiling disappears.
* **Interfaces everywhere there is a choice**: renderer, chart provider, data provider (the existing `DXHandlerInterface`), asset resolver.
  Partners and customers extend; the core stays small.
* **Two modes of data access**: user mode (respects FLS/sharing; right for the record page) and system mode with a field allow-list
  (right for unattended automation). Today this is implicit; make it a setting per template with an audit trail.
* **Generation log object** with duration, pages, bytes, renderer, errors, and a limits advisor ("this template will not run synchronously
  above about 2,500 rows"). Today failures vanish into `TransactionLog__c`.
* **Async by default, sync when small.** Build content inside the Queueable (60 s CPU) and report back by Platform Event, so the Flow
  action no longer pays for the build in the Flow's 10 s transaction.

---

## 5. Solutions to the six challenges

### 5.1 Rendering (pains 1, 2, 6)
* Replace `renderAsPdfLWC` with `Blob.toPdf`, behind a feature flag per template for a safe migration.
* Generate the `@page` CSS from the model (the pieces already exist in `DefaultPageProperties` and the page-properties dialog).
* **Parity spike (Phase 0, 2 weeks):** run every template of the test pack (the ZZ templates and the 8 sample templates) through both
  routes, compare page count, text, and image and table geometry with the golden-file scripts in `docs/experiments/`. Exit criterion:
  zero content loss, page count within 5%, and a written list of intentional differences.

### 5.2 Charts (pain 2)
Three built-in levels, one interface:
1. **CSS charts** (horizontal/vertical bars, stacked bars, progress, KPI tiles, sparkline-like bars): pure HTML, no files, very reliable.
2. **Apex-drawn PNG** (bar, column, line, area, pie, donut, gauge): proved above. Needs a small, well-tested raster library
   (lines, rectangles, filled arcs, anti-aliasing optional), a File created in the launching transaction and the render in the next one
   (the pattern I verified), and cleanup of the temporary File.
3. ~~Chromium tier~~ **dropped** (owner decision 2026-11-10): JavaScript charts (ECharts / Chart.js) are not supported; levels 1 and 2 cover the need.
Also needs the same raster path: **QR codes and barcodes** (a very common ask on invoices and labels).

### 5.3 Fonts, headers and footers (pain 3)
* The font picker shows only fonts that really render (14 standard + Arial Unicode MS), with a one-line explanation, instead of letting the
  user pick Calibri and silently getting Helvetica. Custom fonts are not supported (no external renderer).
* Header and footer become **bands**: any block content (long image, text plus icons, merge fields) in a running element of any height,
  with optional left/centre/right layout inside. The margin-box mechanism (verified) supports this; the three fixed cells become a layout
  inside the band.
* Fix the known layout trap (zero padding in the footer cells) by generating the geometry in the engine so a user cannot create it.

### 5.4 Rich text (pain 4)
Options, in order of cost:
1. **Keep the LWC and replace the editor** with a bundled open-source editor (ProseMirror/TipTap/Quill class) loaded from a static
   resource. It needs a short compatibility spike with Lightning Web Security [Assumption: libraries from static resources are allowed under
   LWS, to be verified].
2. **React editor** as the first Multi-Framework component (section 7), once packaging for it is proven.
Either way the editor must write to the model (clean semantic HTML for text blocks, tokens `{!Account.Name}` / `%%Value%%` / `##Section##`
as first-class inline objects with validation), not raw browser HTML. That is what makes the output predictable in the PDF engine.

### 5.5 Images and migration (pain 5)
* **Asset Library** (custom object, e.g. `Document_Asset__c`): key (`logo.primary`), file reference, checksum, dimensions, alt text.
  Templates and watermarks reference the **key**, never `068...`. At render time the engine resolves key to the current File URL
  (relative shepherd URL, which I verified works in async), so replacing a logo updates every template.
* Resize and crop are stored as properties of the block (width, height, fit), not baked into new files; the "Resized Image" copies and the
  orphan-file cleanup problem go away.
* **Export bundle** carries asset binaries (compressed) and checksums; import re-creates or reuses assets by key + checksum and rebinds.
* Extend the same idea to everything that holds an Id today: rules, clauses (key), `ClassId__c` (class API name), `FlowId__c` (flow API
  name, not DurableId). The existing `FamilyKey` and the single-transaction `TemplateMigration` are the base.
* **Templates as metadata:** a `.dxtemplate` bundle (JSON + assets + translations) that a CLI command or a GitHub Action can deploy, so
  sandbox to UAT to production is a pipeline step and can be reviewed in a pull request. This is the enterprise feature competitors
  handle weakly.

### 5.6 Geometry and WYSIWYG (pain 6)
One place computes page geometry (engine). The designer canvas shows the page frame from the same numbers, and "Preview" is the real PDF
(server round trip, about a second) shown in the dialog. No more guessing whether the LWC and the PDF agree.

---

## 6. Customer experience: what a non-technical admin and an end user should feel

### Admin (builds templates)
* **First run wizard**: pick the object, pick a starter from a **gallery** (quote, invoice, contract, proposal, letter, certificate,
  labels), choose a logo from the Asset Library, done in minutes. Today an empty designer is the first thing a customer sees.
* **Token picker with autocomplete** (fields, parent/child relationships, formulas, class/Flow outputs shown with their shape), instead
  of typing syntax from memory.
* **Template doctor** (lint, runs on save and on demand): unresolved tokens, fields the running user cannot read, missing assets, a table
  with no rows for a sample record, a Flow/class that is not active or not `global`, oversize risk, "this font will not render".
* **Health check page** for the installation: permission sets, record-page component placed, handler classes visible, Flow action
  visible, remote sites/named credentials (renderer tier). Every item of this week's installed-package findings becomes one check.
* **Sample-record picker and test data in the designer**, remembered per template.
* Plain-language errors with a "fix it" link instead of a log record.

### End user (generates documents)
* One-click **"Generate"** with remembered defaults per object and user, a real preview, then Save / Download / Email.
* **Files, not Attachments** (the Attachment object is legacy): generated documents as Files linked to the record with version history,
  regenerate in place, naming rules, retention.
* **List view bulk**: choose records, template, "one PDF per record" or "merged", progress bar, results as a zip / links, failures listed
  with the reason.
* Language and currency/date locale choice when the template has translations.

### Developer / automation owner
* A small, **stable, documented global API** (`DxDocument.generate`, request/response classes, result File Id, status), an invocable
  action that takes **template API name** (not Id), returns the File Id or reports by Platform Event, and accepts parameters
  (`%%Parameter%%` values) and a language.
* Handler classes documented: `global with sharing class X implements DxCPQ.DXHandlerInterface` with a global `execute` (verified
  requirement in an installed package). The designer's class picker should mark non-global classes as "not usable".
* CLI / REST for deploying and testing templates in a pipeline.

---

## 7. Technology options assessed

| Option | Verdict | Why |
|---|---|---|
| Keep VF `renderAs` | Retire (keep as fallback flag for one release) | Needs a page, a browser, a session; 20x slower; DML restriction |
| **`Blob.toPdf(html)`** | **Adopt as the default engine** | Verified: any context, fast, same layout features, no VF page; limits listed in 2.1 |
| External headless Chromium (Heroku / cloud, Named Credential + External Credential) | **Rejected by the owner (2026-11-10)** | Only route to web fonts, SVG, JS charts, CSS3 layout, PDF/A. Cost: hosting, security review, data leaves Salesforce, so offer customer-hosted and a "HTML only, no record data" mode [Assumption: AppExchange acceptance to be confirmed with the partner team] |
| Native Salesforce document generation products (Industries / OmniStudio Document Generation) | Watch, integrate later | Needs other licences; I did not find a general-purpose native Flow action for PDF in recent release notes [Documented search, inconclusive] |
| LWC (keep) | Keep for now | Works, tested (208 Jest tests), packaged |
| React / Angular via Multi-Framework | **Spike, do not migrate yet** | React GA July 2026; Angular GA and managed packaging Winter '27, **non-site apps only** in managed packages [Documented]. AppExchange rules for such apps: not confirmed [Assumption]. Best candidate: the block/rich-text editor and a canvas-style designer, once the model-driven engine makes the UI a thin editor |

**React/Angular spike (2 weeks, after Phase 1):** build the text/block editor as a Multi-Framework app in a *managed* scratch org; measure
(a) packaging and upgrade behaviour, (b) data access to Apex and to the template model, (c) editor quality and accessibility, (d) bundle
size and load time, (e) security review implications. Decision gate: continue only if packaging is stable and the editor is clearly better
than the LWC-hosted library option.

---

## 8. Roadmap

Effort is in engineer-weeks for one senior engineer plus testing; I tested heavily so far, so keep testing in each phase.

| Phase | Content | Effort | Exit criteria | Main risk |
|---|---|---|---|---|
| **0 Parity spike** | `Blob.toPdf` behind a flag for the headless path; golden-file corpus; decision memo | 2 | Zero content loss on the corpus; faster; list of intended differences | Style drift vs VF (margins, fonts) |
| **1 One engine** | `DxDocument.generate` API; server-side build for the screen too (browser stops posting HTML); one Related Objects implementation; one rules engine (Apex), drop the JS copy; build in Queueable; File output + generation log; fix Flow action (output, template API name, parameters) | 8 to 10 | Screen path has no size ceiling; Flow with 12,000 rows works; one code path for all entry points; 205+ tests migrated | Largest refactor; keep behaviour parity with the test pack |
| **2 Assets and portability** | Asset Library, key-based references everywhere, bundle format with binaries, CLI/GitHub Action, migration test between two package orgs | 5 to 6 | Move a template with images, rules, clauses, class and Flow between two orgs with no manual rebinding | Backfill of existing templates (upgrade script) |
| **3 Visuals** | Chart providers (CSS + Apex PNG), QR/barcode, free-form header/footer bands, honest font picker, geometry generated by the engine | 5 to 6 | 6 chart types in a real PDF; first-page/band variants; zero-padding trap impossible | Raster library quality and CPU |
| **4 Experience** | Wizard, gallery, token picker, template doctor, health check, true preview, list-view bulk with progress, Files instead of Attachments, email step | 8 to 10 | An admin with no training builds and generates a document in under 15 minutes (measured with 5 users) | Scope creep, needs UX research time |
| **5 Premium and reach** | ~~Chromium renderer tier~~ (dropped), DOCX output, editor spike (React vs LWC library), AI assist (describe a template, fix a template, summarise block) | 8 to 12 | Customer pilots; security review plan | Hosting/ops cost, AppExchange acceptance |

Parallel track from day one: **Documentation and onboarding content** (the handler-class rule, the Flow action, limits advisor values),
since several of this week's surprises were knowledge gaps rather than defects.

### Quick wins (can ship in the current line, 1 to 2 weeks)
1. Make handler-class requirement visible in the class picker and docs (global), and the Flow action `global` (done in 0.23.0-2).
2. Page-size list in the widget: A3, A4, A5, B4, B5, Letter, Legal, Ledger (the controller already supports them).
3. Footer minimum padding in Footer Properties (stops the layout trap).
4. Save generated PDFs as Files instead of Attachments (keep Attachment as an option for compatibility).
5. Template doctor, first version: unresolved tokens, missing images, inactive Flow/class.
6. Generation log object and a plain-language error toast (partly done: failed generation now says so).
7. Document the real limits (about 1,100 Related Objects rows on the screen path today; about 2,500 in the Flow path).

---

## 9. Market position and packaging

* Competitors found in a quick scan: S-Docs, CloudFiles, 360 InstantDocs, Nutrient Documents (and Conga, Nintex/Drawloop in the wider
  market). They offer Flow actions too; vendors describe Salesforce-native generation as workable for low volume and limited at scale
  [Documented, vendor claims]. Our measured numbers (12,000 rows in 1.9 s for the engine, no data leaving Salesforce) are a credible
  counter-position once Phase 1 ships.
* **Differentiators to build the story on:** a single-screen designer a non-developer understands; native and fast; Flow-first; templates
  that migrate cleanly and live in pipelines; a health check and doctor that make setup safe.
* **Tiers:** Core (Blob.toPdf engine, CSS charts, assets, bundles), Pro (Apex-drawn charts, QR/barcodes, bulk, API, generation log),
  Enterprise (DOCX, SSO-grade audit, priority support). Tiering is a business decision for you; the architecture
  supports it through the provider interfaces.
* **Risk:** Salesforce may ship a native generator. The moat is UX, portability and the template ecosystem, not the PDF call.

---

## 10. Open questions and what would change my mind

1. **Parity** (Phase 0): if `Blob.toPdf` output differs materially from the VF route for real customer templates, keep the VF route for
   those and fix the differences first.
2. **Heap and CPU for very large documents** in one Queueable: 30,000 rows used 6 s CPU and 6.3 MB heap; chunked rendering and merging
   (render in parts, concatenate) is needed above that [Assumption].
3. **The two missing nested rows** in the parity run (48, 117): confirm visually whether they are a text-extraction artefact.
4. **LWS compatibility of a bundled editor library** and the **Multi-Framework managed-packaging constraints** for AppExchange.
5. ~~Chromium tier acceptance~~ **Closed 2026-11-10:** no external rendering service.
6. **System-mode generation**: the right default and the allow-list model need a security review before unattended automation is
   marketed for sensitive objects.
7. **Backward compatibility**: existing templates must keep rendering identically; a migration/upgrade script and a "legacy renderer"
   switch per template for one or two releases.

## Appendix: experiment scripts (docs/experiments)

| File | What it shows |
|---|---|
| `toPdfA.apex` | margin boxes, running headers, counters, fonts, data-URI image, CSS bars, DML before `toPdf` |
| `toPdfD.tpl` | scale test (replace `@@N@@` with the row count) |
| `toPdfE.apex` | `@page :first`, fixed watermark, SVG variants, float columns |
| `toPdfG.apex` | image sources: public file link, relative file URL, external URLs |
| `pngChart.apex` | the Apex PNG chart encoder |
| `parity.apex` | the real "ZZ Heavy Combined" template through `Blob.toPdf` |
| `inspect.mjs`, `imgcolors.mjs`, `counts.mjs` | PDF readers (text positions, image pixels, completeness counts); need `npm i pdfjs-dist@3.11.174` |
| `docs/tools/org-seed/zzpack/.../ZZToPdfProbe.cls` | Queueable that renders a File image headlessly |

---

## 11. Decisions and working order (updated 2026-11-10)

### Decisions taken with the owner
* **No external renderer (decided 2026-11-10).** Record data must not leave Salesforce, so the optional headless-Chromium tier is dropped from
  the plan. `Blob.toPdf` is the only engine (Visualforce kept as a fallback flag for one release). Consequences: no custom web fonts, no SVG, no JavaScript
  charts; charts, QR codes and barcodes are drawn in-platform (CSS or Apex-drawn PNG). Also, headless generation (Flow, Apex, API) has no UI to render in,
  which is what `Blob.toPdf` is for.
* **Third-party JavaScript is acceptable** if it is free, reliable, and its source is held locally (bundled, no CDN, no server/API call).
  So pdf.js is allowed. This supersedes the "no external JS" constraint of the original LWC designer for the new canvas.
* **React is acceptable** (Salesforce Multi-Framework UI bundles). The owner's PoC (`SF Angular React PoC`, managed package
  `DXLab_MultiFramework` 0.1.0.1 in the Dev Hub) shows managed packaging of React and Angular UI bundles works [Verified: package exists;
  install in a non-namespaced org reported by the owner]. Still to confirm: AppExchange security review treatment.
* **The designer becomes a React UI bundle** (full-page app on its own domain, launched from the App Launcher). **The runtime widget on
  record pages stays LWC**.
* **Preview must be the real engine output.** Spike result (section 12): feasible with pdf.js or with the browser's own viewer.
* Branch policy: new work goes to `feature/document-engine-foundation` (pushed), not to `dev-revision`.
* The throwaway preview probe in the dev org (LWC `zzPdfProbe`, Apex `ZZPdfPreview`, static resource `ZZPdfJs`, tab `ZZ_Pdf_Probe`) is kept and tracked
  in `docs/tools/org-seed/zzpack`; decide later whether to delete it from the org.

### Working order (one item at a time, each with tests, browser/PDF verification and a commit)
| # | Item | Why now | Size |
|---|---|---|---|
| 1 | Branch, docs map, folder READMEs | Foundation for everything below | done |
| 2 | Preview spike (React + Apex REST + pdf.js) | Decides the designer direction | done |
| 3a | Quick win: page sizes A3, A4, A5, B4, B5, Letter, Legal, Ledger in the widget | Controller already supports them | XS. **Done 2026-11-10**: all 8 sizes in the widget (pageOptions.js + Jest), unset default no longer becomes undefined; A3 verified in the real PDF (MediaBox 841.88 x 1190.55) |
| 3b | Quick win: header/footer minimum padding (the zero-padding layout trap) | A user can break the PDF today | S. **Done 2026-11-10**: the server raises header/footer cell side padding (px) to at least 10px (`DisplayPDFController.ensureMinimumSidePadding`); see the test log, section "3b" |
| 3c | ~~Quick win: class picker marks classes that are not `global`; document the rule~~ **Dropped 2026-11-10**: tested in an installed package, a `public` handler class works; the earlier "must be global" finding was a namespace-lookup problem fixed by `TypeLookup` (see test log, section 3c) | n/a | n/a |
| 3d | Quick win: new tables default to automatic column widths (widths become optional) | Removes the tedious width setting; engine sizes by content (verified) | M. **Done 2026-11-10 (code, Jest, real-PDF measurement and designer click-through)**: `templateTableDetails.applyAutomaticColumnWidths` saves new tables as `table-layout:auto; width:100%`; existing tables and hand-resized tables stay fixed |
| 4 | Phase 0 parity: `Blob.toPdf` behind a flag for the headless path, golden-file corpus | Proves the engine switch on real templates | M |
| 5 | Phase 1: one engine (`DxDocument.generate`), server-side build for the screen, one Related Objects implementation | Removes the size ceiling and the duplicated pipelines | L |
| 6 | Template model + canvas designer in React, staged: page and header/footer, text and image, tables, conditions and nesting | The core of the owner's vision | XL |
| 7 | Assets library and bundles, charts and QR, template doctor and health check, bulk generation, Files instead of Attachments | Portability and reach | L |

## 12. Preview spike results (2026-11-10)
Details, code and deploy steps: `docs/experiments/react-preview-spike/README.md`.
* React UI bundle in a managed-package-style app calls Apex REST with `sdk.fetch`, receives PDF bytes, and shows them with locally
  bundled pdf.js (worker included, no CDN) and, with no library at all, in an `<iframe>` using a `blob:` URL [Verified].
* Click on the page returns the content under the cursor from the PDF text layer (exact hit, distance 0 px) [Verified]; mapping text to
  a block needs a marker or a lookup (design item).
* Latency: warm 1 page about 0.95 s REST + 0.67 s draw; 8 pages about 1.1 s + 1.4 s. Server `toPdf` is 12 to 49 ms, so about 0.9 s is
  platform/network overhead. The canvas therefore needs an instant local approximation plus the real PDF refreshing behind it.
* UI bundles need Salesforce CLI 2.157 or newer; the bundle runs on its own `*.salesforce.app` domain in a new tab.
