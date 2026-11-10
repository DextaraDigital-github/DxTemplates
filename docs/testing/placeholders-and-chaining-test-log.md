# Placeholders, Flow/Apex values, chaining, template lifecycle: test log

Dev scratch org `dxtemplates-scratch-30d`. Seeds: `docs/tools/org-seed/seed_placeholders.apex`, `docs/tools/org-seed/zzpack/` (class, chain handler, flow, handler metadata).

## Fixed and verified (Apex tests + real PDF)
- `##Section##` embeds a Table section of the same template (inline or replacing a lone paragraph); `%%Token%%`, `%%Path.To%%`, `%%List.Field%%` in table rows; Apex class and Flow values; safe text for `&` `<`; `$` kept.
- Chained run (Flow action -> Queueable `sendEmailAutomation` -> attachment -> handler class from `DXTemplates_HandlerClass`): works; server-side path now applies translations, visibility rules, class/flow values.
- Default page properties fallback, orientation/size normalised, activation/delete/clone lifecycle.

## Edit Template dialog: class/flow wiped (fixed 2026-11-01)
- Symptom: saving a description-only edit cleared `ClassId__c` / `FlowId__c`.
- Cause: `editTemp` (choice sent to `updateTemplateDetails`) was never reset, so a class/flow choice (or an empty selection event) from an earlier visit of the dialog was sent again.
- Fix: `handleEditTemplate` starts with `this.editTemp = {}`. Jest: templateDesignerCMP.test.js "sends no class or flow change...". Browser: description edit kept ClassId (SOQL).

## Open / for follow-up
- Server-side generation for several records (class/flow/translations/visibility only for one record); Flow action handles one record at a time.
- `DXTemplates_HandlerClass` record is not shipped by the package.
- Re-run all of this in a non-namespaced org with the 2GP package (convert seeds to `DxCPQ__` names, install zzpack, check Flow dropdown lists only unnamespaced flows).

## Designer lifecycle in the browser (2026-11-01, "ZZ Probe2", own throwaway)
- Activate: toolbar label flips to Deactivate, section editors grey out; SOQL IsActive=true, Previously_Active=true. OK.
- Deactivate: label flips back to Activate, IsActive=false; OK.
- Delete: confirm dialog, toast "Template Deleted Successfully", list refreshes and selects the first template; template gone. OK.
- UI observations (for the UI discussion): after Deactivate the section editors stay greyed out (Previously_Active locks editing by design, but nothing on screen says why); Edit Properties stays clickable while active; section Save/Delete buttons look enabled while the fields are locked.

## Page size / orientation and footer in real PDFs (2026-11-01, "ZZ Placeholders")
- Sizes read from the real PDF: A4 portrait 595x842, A5 landscape 595x420 (content flows to 2 pages, header and footer on both), Letter 612x792, Legal landscape 1008x612. OK. Helper: `PSIZE=Letter PORI=Landscape bash run_tpl.sh "<template>" <tag>`; `items.mjs` prints text positions at the page top and bottom.
- FOUND F-1: with footer cells that have NO side padding (the Apex fallback `DefaultPageProperties`, and any template whose Footer Properties padding was set to 0 - seen in an older PDF too) the PDF engine lays the footer out wrongly: left cell squeezed ("Footer" / "left" on two lines), middle cell at x=0, right cell at the page edge so only its first letter shows. With 5px or more side padding it is correct (cells at 4/203/400 pt; 75/274/471 with 100/70 like the header). The designer's own default is 10px, so templates made in the designer are fine.
- Fix: fallback `DefaultPageProperties` footer cells now have 10px side padding (test `theDefaultFooterCellsHaveSidePadding`); real PDF verified (cells + "Page 1 of 1" all inside the page).
- Still open (for the UI discussion): a user who sets footer left/right padding to 0 in Footer Properties gets the broken layout; either enforce a minimum or fix the margin-box CSS in renderAsPdfLWC.page.

## First-page header (real PDF, A5 landscape, 2 pages)
- Page 1 shows the first-page header cells, page 2 the normal header; both correct.
- FOUND and fixed: the fallback `DefaultPageProperties` first-page header cells had zero side padding (same layout fault as the footer) and a BLACK background (designer default is white; black text on black). Now 10px padding and white (test `theDefaultFirstPageHeaderCellsArePaddedAndWhite`).

## Heavy data: "ZZ Heavy Combined" (2026-11-01)
Seed: `docs/tools/org-seed/seed_heavy.apex` (400 Opportunities `Heavy Opp n`, 250 Contacts `Heavy n` on Datamatics; template with Header + first-page header, Context of 60 long paragraphs, Table of 300 rows from `ZZHeavyHandler`, static Table of 120 rows, Related Objects of the 400 opportunities grouped by stage with sub totals / grand total / chart, long Clause with page break, a Table nesting the 120-row table via `##Static##`, Footer). Check script: scratchpad `heavycheck.mjs` (counts rows, order, header/footer per page); run: `bash run_tpl.sh "ZZ Heavy Combined" tag`.
- Real Generate PDF screen (Datamatics record page, A4 portrait, Save as Attachment): 34 pages in under 10 s, 303 KB. All 60 paragraphs, 300 rows in order, 120 nested rows, 40 clause paragraphs, all 400 opportunities, sub totals add up to the Grand Total 3,387,450.00, chart page, header and footer with "Page n of 34" on every page, first-page header on page 1 only.
- Server-side chained run (Flow action -> Queueable): 29 pages, 305 KB, same content.
- Letter landscape (server-side sections): 23 pages, header/footer on every page.
- FOUND and fixed (test first, `AutomationChain_Test.aRelatedObjectsSectionMadeOutsideTheDesignerStillGivesThePdf`):
  1. A Related Objects section without `Header_Content__c` (made by import/API/seed) stopped the whole run with a null error and no document: now prints without a header row.
  2. Standard parent fields in a Related Objects table (`Account.NumberOfEmployees` on Opportunity) were looked up on the User object and threw per row: the real related object of the relationship is now used (User only for Owner/CreatedBy style names), and an unknown field type prints as text.
  3. Text values from an Apex class/Flow that contain an unknown `<word>` (e.g. `<special>`) lost it as if it were an HTML tag: only a list of real HTML tags keeps a value as HTML now.
- Observations for the UI discussion: Generate PDF widget offers only A4/A5/Letter and Portrait/Landscape (the controller accepts A3, A4, A5, B4, B5, Letter, Legal, Ledger); the server-side (chained) Related Objects table ignores the section's font style (printed serif 7-9px, the screen path prints the chosen monospace); a "New Page" Related Objects section with chart adds near-empty pages (28, 29 of the screen PDF hold only the last rows or the chart); sub total of a PARENT field (Account.AnnualRevenue) sums the same parent value once per child row (7,125,000,000 for 57 rows of 125,000,000).
- Not heap/CPU limited: anonymous generation of the 300-row + 120-row + nested sections used about 100 ms CPU and 12 SOQL.

## Scale: how many rows from a class/Flow (2026-11-01)
Template "ZZ Heavy 3000" (Header, Footer, one Table `%%Lines.*%%` filled by `ZZHeavyHandlerBig`, a 3,000 or 12,000 item list).
- 300 rows: 17 pages (inside the combined template). 3,000 rows: 86 pages, 846 KB, 25 s, 0.65 s CPU. 12,000 rows: 343 pages, 3.4 MB, 39 s, 3.4 s of 10 s CPU. All rows present and in order, header and footer on every page.
- FOUND and fixed, with the real runs as the reproduction:
  1. More than 131,072 characters of class/Flow values (about 1,500+ rows of text) made the screen's `Document__c` insert fail on `Token_Data__c` (a write-only copy); no document, so no PDF ("Id not specified in an update call"). Now a small marker is stored when the copy does not fit (`valuesLargerThanTheFieldThatKeepsThemDoNotStopTheDocumentFromBeingCreated`).
  2. From about 5,000 rows the regular expressions that find the table body, the `%%tokens%%` and the `{!merge fields}` failed with an uncatchable "Regex too complicated" (Apex regexes fail on texts over about 1 MB when they use a lazy quantifier). They are now plain position scans (`nextToken`, `mergeFieldsIn`, tbody by `indexOf`) (`aTableOfEightThousandRowsIsFilledWithoutRegexLimits`).
- Remaining limits to know (not tested beyond 12,000 rows): a section's Section_Content__c field (131,072 characters) holds static content only; rows from a class are expanded in memory, so sync heap (6 MB) is the next ceiling; generation took 39 s for 343 pages, near the callout/PDF time budgets of the Queueable path - the chained run was only tested at 29 pages.

## Related Objects at scale and the size ceilings (2026-11-01)
Data: 3,400 Opportunities `Heavy Opp n` on Datamatics (400 from the seed + 3,000 added by an anonymous script), RO section of the "ZZ Heavy Combined" template switched between `name like` filters.
- Fixed, measured in Apex (CPU of the table build):
  1. Screen path (`DisplayRelatedObjects.getsectionData`): 119 rows 0.3 s, 1,019 rows 13 s (quadratic) -> 0.55 s; 3,400 rows exceeded the limit -> 4.3 s. Causes: an unused `JSON.deserializeUntyped(JSON.serialize(record))` per record, the record turned into a map again for EVERY cell, and an HTML copy of the whole table (never used, the screen gets JSON) grown by string concatenation per cell.
  2. Standard parent fields (`Account.NumberOfEmployees`) were typed through the User object also on the screen path (an exception logged per table; test `DisplayRelatedObjects_Test`).
  3. Server-side path (`ROsectionAutomationController`): record map once per row, cells buffered per row: 1,019 rows 1.7 s -> 1.4 s. Still about 1.4 ms per row, so about 2,500 rows exhaust the 10 s synchronous limit of the Flow action; at 3,400 rows the chained run stops with "Apex CPU time limit exceeded" (before: stopped at the same size). Proposal for the discussion: build the content inside the Queueable (60 s CPU) instead of the Flow action's transaction.
  4. `addCjkLineBreaks` kept a `List<Integer>` with one entry per character of the document: 25 MB of heap for a 1.8 MB document, so every PDF above about 1 MB failed in the render step (`generatePDFAttachment`: "Apex heap size too large"). It now copies pieces (test `aLongDocument...WithoutHeapProblems`). Screen path with 1,111 opportunities then gave 58 pages, 605 KB, with all rows and the Grand Total.
  5. When making the PDF failed, the Generate PDF widget kept its spinner for ever and said nothing. The two catch blocks of `dxShowSelectedTemplate` now show an error toast and send `pdfgenerationfailed`, which `dxtemplateSelectorCmp` uses to stop the spinner (verified in the browser with the 3,419 row case: spinner stops). No Jest test: these two components have no test harness yet (only visibilityRules.test.js exists).
- CEILING that remains (design, for the discussion): the screen builds the whole document in the browser and posts it as ONE parameter (`pdfbody`) to `generateDocument`; at 3,419 opportunities the page held 4.85 MB and the call failed (`handlePDF` error). Each synchronous step then keeps several copies of the text in the 6 MB heap (body, chunks, the VF controller's `displayText` and its copies). Measured: 1.8 MB works; 4.85 MB fails. Realistic limit about 1,100 Related Objects rows (58 pages) per template on the screen path. A fix means uploading the body in chunks and rendering page by page, or building the PDF from the data on the server (Queueable); both are larger changes.
- Multi-record generation (`getTemplateSectionsMulRecords` with two records, heavy template): runs in 20 ms CPU, no token left, but the values of the template's Apex class/Flow are not applied (the 300-row table prints only its header row). Known gap, unchanged: class/Flow values and visibility rules exist only for ONE record.
- Housekeeping: my throwaway Account "ZZ Multi Second" was deleted; the 3,400 opportunities, 250 contacts, the templates "ZZ Heavy Combined" / "ZZ Heavy 3000" and the attachments are left in the dev org for the owner to delete.

## 2GP package version and the installed package (2026-11-01/02)
Package `Dx_Templates` (managed, namespace DxCPQ, Dev Hub `dxdevhub`), version number set to 0.23.0 in sfdx-project.json. Created with `sf package version create -p Dx_Templates -v dxdevhub -c -x -w 120`; built 0.23.0-1 (04tQm000003De7ZIAS), 0.23.0-2 (04tQm000003DeE1IAK), 0.23.0-3 (04tQm000003DeIrIAK, current; code coverage 80%, passed).
Test orgs: non-namespaced scratch orgs `dxtemplates-2gp-30d` (0.23.0-1), `dxtemplates-2gp-b-30d` (0.23.0-2), `dxtemplates-2gp-c-30d` (0.23.0-3, use this one). A beta cannot be upgraded by another beta of the same ancestor (error "ancestor ... not in the same package ancestry branch"), and uninstall is blocked by customer classes/flows that use the package: make a NEW scratch org for each build (`sf org create scratch --no-namespace --duration-days 30`), `sf package install -p <04t> -w 25`, `sf org assign permset -n Dx_Template_Access`.
Rerun recipe in the installed org: create Account Datamatics (acct2gp.apex data), deploy `docs/tools/org-seed/zzpack` (handler classes must be `global`), run `seed_placeholders.apex` (DxCPQ__ names), `ro_source` (the Related Objects section copied from the dev org, see make_ro_seed.js idea) then `seed_heavy.apex`. Managed code cannot be called from anonymous Apex unless `global`, so the PDF helper scripts (run_tpl.sh) do not work in the installed org: use the global invocable action through REST `POST /services/data/v61.0/actions/custom/apex/DxCPQ__documentAutomationController` (body `{"inputs":[{recordId, templateId, documentName, docOrientation, docSize, multiplePdf}]}`), then read the Attachment on the record.

### Build failures and what they meant
- 0.23.0-1 failed with 43 Apex test failures: the Dev Hub build runs tests as a user without access to the package's objects and fields ("No such column ..." is how a hidden field shows). Fix: `apexTestAccess` with the permission set `Dx_Template_Access` on the `Dx_Templates` package directory (the unlocked package entry already had it).
- Two fixtures of my own tests were incomplete (the Related Objects JSON needs the `style` block the designer always writes; one assertion counted every logged exception, a restricted build user logs a security exception).

### Found by using the installed package (not visible in the dev org)
1. The Flow action "Generate PDF Document through Flow." was NOT in the list of invocable actions of a subscriber org (`/actions/custom/apex` returned an empty list): the method and its parameter class `recordParameters` were `public`. Now `global` (method, class, fields). Verified: the action lists as `DxCPQ__documentAutomationController` and runs.
2. A customer's Apex class named in a template (`ClassId__c`) or in the custom metadata record HandlerClass was reported "missing" and its values skipped ("The Apex class of the template is missing" / "The class named in the custom metadata record HandlerClass does not exist"). **Cause: the lookup, not the access level.** `Type.forName(name)` searches the namespace of the calling code (the package), so a class of the subscriber (no namespace) was not found. `TypeLookup` (new) passes the class's own namespace to `Type.forName`. *This entry first said that managed code only sees `global` customer classes; that was wrong, see "3c" below (corrected 2026-11-10).* A `global` class is still the safe style for customers, but it is not required.
3. `Flow.Interview.createInterview` now gets the flow's namespace (`FlowDefinitionView.NamespacePrefix`); an Apex-invoked flow of the customer ran in the installed org (Flow template PDF: "Hello from the flow, total $99.90.").

### Verified in the installed package (0.23.0-3)
- PostInstall data: 8 sample templates with their sections created.
- Chained generation: ZZ Placeholders (class values, embedded tables, merge fields, `&` and `$`), ZZ Flow Placeholders (flow values), and the handler Task.
- Designer: opens with the sample templates, the class picker shows the customer's global class as selected, a description-only save keeps ClassId (the fix of this session works in the package), Preview of "ZZ Heavy Combined" shows class values and merge fields.
- Heavy template through the chained action: 29 pages, 305 KB, all 60 paragraphs, 120 nested rows, 40 clause paragraphs, all 400 opportunities, header (with first-page header) and footer with page numbers on every page, no exception log: identical to the dev org result.
- Not repeated in the installed org: the end-user widget on a record page (needs the component added to the page in the Lightning App Builder; it is not part of the package), import/export between two package orgs, 3,400-row scale, translations, watermark.

## 3b: minimum header/footer side padding (2026-11-10)
- **Problem:** a header or footer cell with `padding-left/right: 0` (the designer lets a user type that) is laid out wrongly by the PDF engine.
- **Measured before the fix** (real VF page, A4, `ZZ Heavy Combined` copy with all side padding set to 0, header and footer text in all three cells): text x-positions `0 / 0 / 595` for left / center / right, so the right cell starts at the page edge and is cut off, and the left and center cells overlap at 0.
- **Fix:** `DisplayPDFController.getSanitizedHeaderJSON` now passes every `header_*`, `first_header_*` and `footer_*` style through `ensureMinimumSidePadding`: `padding-left`/`padding-right` given in px and below 10 are raised to 10, a cell with neither (and no `padding:` shorthand) gets both added. Other units, larger values and the `padding:` shorthand are left as the author wrote them (known gap: a shorthand with 0 sides is not corrected).
- **Measured after the fix:** `8 / 207 / 403`, the same as a template that was padded correctly (footer of the original template: `8 / 207 / 403`).
- **Tests:** 3 new Apex tests in `PdfDefaultProperties_Test`; all 212 local tests pass in `dxtemplates-scratch-30d`.
- **How it was checked** (reusable): clone a template with Apex, create a `Document__c` with `Document_Body__c` and a `Document_Content__c` of the form `{"header":{"sectionsCount":"3","sectionsContent":[{"value":"..","indexvar":0},..]},"footer":{...,"displaypagesequence":false}}`, then in a **separate** anonymous run (rendering after an insert in the same transaction fails with "DML currently not allowed") call `new PageReference('/apex/DxCPQ__renderAsPdfLWC')` with `documentid`, `selectedPageSize`, `selectedPageOrientation` and `getContentAsPDF()`, store it as an Attachment, download it over REST and read the text positions with `docs/experiments/inspect.mjs`. Through the widget this was unreliable for the heavy template (the screen builds the body in the browser; no attachment appeared).

## 3c: does a handler class have to be `global`? No (2026-11-10)
- **Question:** the 2GP finding above said managed code cannot see a customer's `public` class, so item 3c planned a class-picker warning for non-global classes.
- **Test:** package version 0.23.0.4 installed in a fresh scratch org (`dxtemplates-2gp-d-30d`, created with `--no-ancestors`, otherwise the install fails with "used as a scratch org ancestor"). Customer-side class `ZZPublicHandler`: `public with sharing class ... implements DxCPQ.DXHandlerInterface` with a `public` execute method (it compiles). Template with that class and a Context section `%%zzPublic%%`, generated with the global `DxCPQ.documentAutomationController.generateDocument`.
- **Result:** the document body contains `PUBLIC-CLASS-VALUE: [visible]`. The package finds and runs a public class. `ApexTypeImplementor` lists the public class as well, and the designer's class picker shows it.
- **Decision:** 3c is dropped. A warning would be wrong, and "handlers must be global" must not be written into customer documentation. (The same finding means `SaveDocumentTemplate.getClassNames` needs no change; the experimental version 0.23.0.4 contains an unneeded picker label change that never fires. Do not release 0.23.0.4; build the next version from the current branch.)
- **Still true:** things a *Flow* or a *subscriber's anonymous Apex* calls must be `global` (the invocable Flow action and its parameter class, `documentAutomationController.generateDocument`).
- Side observation: generating for an Account in this org logged an exception "No such column DxCPQ__Document_Language__c on entity Account" (the code reads a custom field from the record's object). Not investigated; to be discussed as a separate finding.

## 3d: new tables get automatic column widths (2026-11-10)
- **Before:** the designer saves every table as `table-layout: fixed` with an empty `<colgroup>`, so the PDF gives every column the same width whatever it holds.
- **Measured in the real PDF** (same 4-column table, A4, VF page, Document with that body): fixed = columns start at x = 31 / 166 / 300 / 435, the description wraps onto 3 lines per row (rows 10 pt apart, 9 text lines); automatic with `width: 100%` = columns start at x = 31 / 46 / 482 / 512, the description fits on one line (one line per row, 4 text lines), Qty and Amount are narrow.
- **Change:** `getCleanedHTMLString` (templateTableDetails) now calls `applyAutomaticColumnWidths`: a **new** table is saved with `table-layout:auto; width:100%`. Kept `fixed`: a table opened from a saved section (`isExistingTable`, so its look does not change when it is saved again) and a table where the user dragged a column (any non-S.No header cell with a width). The editing grid in the designer is unchanged (equal columns while editing).
- **Tests:** 5 new Jest tests (220 in total pass): new table is auto + 100%; the editing grid stays fixed; S.No column does not count as a manual width; a resized new table stays fixed; a reopened table stays fixed.
- **Designer click-through (done 2026-11-10, dev org):** a Table section created in the designer (3 rows x 4 columns, default settings) and saved with Update is stored as `style="font-family: Verdana, sans-serif; font-size: large; table-layout: auto; width: 100%;"`. (The Chrome tab had to be in front: a background tab froze on screenshots and clicks.)
- **Side finding (for discussion):** the "No such column DxCPQ__Document_Language__c on entity Account" exception seen in the installed org comes from the custom metadata record `Document_Translation.Account_Language_Field`, which names a language field on the record's object; where that field does not exist the generation logs the exception and carries on.

## Parity PoC: Visualforce PDF vs Blob.toPdf on the real templates (2026-11-10)
Details, files and rerun steps: `docs/experiments/parity-poc/README.md`; report: `docs/experiments/parity-poc/results-2026-11-10.md`.
- 12 templates (sample + placeholder + a 68-page Related Objects one), A4 portrait: same pages, words, images and size on both routes, **identical text positions on every page**, 3 byte-identical.
- Needed adapter: the page's HTML must be normalised (one head with all styles, one body, no scripts) or `Blob.toPdf` ignores `@page` (Letter, no header/footer). Large documents need `indexOf` loops instead of regexes.
- Speed: 68-page template 4.1 s (Visualforce) vs 1.4 s (`toPdf`); small templates 0.2 to 0.6 s vs 0.01 to 0.4 s.
- Gap: ZZ Heavy Combined cannot be generated through the server route at all (CPU limit while building the document), independent of the PDF engine.
