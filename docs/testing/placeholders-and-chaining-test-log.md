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
