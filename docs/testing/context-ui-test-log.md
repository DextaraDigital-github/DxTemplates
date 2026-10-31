# Context section: UI test log

Component: `templateContentDetails` (Context and Clause screens share it). Org: scratch org `dxtemplates-scratch-30d`, template "ZZ Clip Test", section "Seq A". Same method as `table-ui-test-log.md`: test in the browser, check the saved record with SOQL, fix with a failing-then-passing Jest test, check again in the browser. Jest baseline before this round: 13 tests; now 17.

## Results

| # | Test | Result |
|---|---|---|
| C1 | Type text at the end of the text, select all, Bold, Update | Pass. Saved `<p><strong>Context text and more</strong></p>`, "Section was saved" toast. |
| C2 | Tick New Page, Update | Pass. Saved with `<div style="page-break-before : always;">` around the text and `New_Page__c = true`. |
| C3 | Choose font Courier for the selected text, Update | Saved `font-family: courier;`. **Defect C-D1** (the PDF prints this in Times). |
| C4 | Update the same section again and again with New Page ticked | **Defect C-D3**: the page-break div nested one level deeper on every save (6 deep after 6 saves). |
| C5 | Custom Section CSS (code review, Jest) | **Defect C-D2**: wrapper written as `<div style="...>` without the closing quote. |

| C6 | Real PDF of Seq A (stored content wrapped between "Page one text" and "Last text", rendered with `renderAsPdfLWC`, read with pdfjs) | Pass after the fixes. Page 1 holds only "Page one text"; page 2 starts with the Context text in Courier-Bold, then "Last text". The New Page break works and the single wrapper is enough. (Method: put the section content into the body of the throwaway Document D-0024, render it in a separate Apex run, download the ContentVersion. D-0024 now holds this test body; the earlier backup record `ZZBACKUP` no longer exists. Rendering a cloned Document failed with "DML currently not allowed", so reuse an existing one.) |

## Defects

| # | Defect | Status |
|---|---|---|
| C-D1 | The Courier option stored `courier`; the PDF engine only knows generic names, so it printed Times (same as Table D11). Option is now `courier, monospace`; saving also upgrades old `font-family: courier;` in existing content. | FIXED, Jest (3 new tests failed first), UI-verified: a section holding `courier;` was saved again and now holds `courier, monospace;`. |
| C-D2 | `<div style="${css}\>` lost the closing quote of the style attribute, so the custom CSS wrapper was invalid HTML. | FIXED, Jest test failed first. Not yet checked in the browser or the PDF. |
| C-D3 | A New Page section reopens with its page-break div inside the editor, so each Update wrapped it again. Now the old wrapper(s) are taken off before the new one is added; unticking New Page also removes the page break. | FIXED, Jest test failed first, UI-verified: 6 nested wrappers became 1 on the next Update. |
| C-D4 | One click on Insert in the merge field dialog added the merge field to the text **twice** (`{!Account.Name}{!Account.Name}`), seen in the browser. `getMergeField()` appended it on two lines; the first also changed the editor text when the dialog was opened from the translation table. Now it is added once, and only on the normal path. | FIXED, Jest test failed first (18 tests now). UI-verified after clearing the page caches: one click on Insert adds `{!Account.Name}` once. |

## Observations for the UI discussion

| # | Observation |
|---|---|
| U-C1 | After reopening, the font dropdown shows "Times New Roman" even when the text is Courier; it does not follow the text. |
| U-C2 | The font list has two entries with the same value (Times New Roman and Serif both `serif`). |
| U-C3 | The custom CSS is not saved with the section and is not shown again on reopen (only the wrapper in the content remains). Custom CSS and New Page cannot be combined (New Page wins). |
| U-C4 | A new page break is stored inside the content, so the editor shows no sign of it except the ticked box. |
| U-C5 | The merge field is always added at the **end** of the text, not at the caret. |

## Not yet tested (next)

Merge field insert; image insert; the visibility filter dialog; Delete; New section creation; Clone; sections with many images; Preview and the real PDF for a Context section (recipe: `table-ui-test-log.md` section 1.16); the Clause screen that uses the same component.

## Lessons for testing

- After a deploy the browser can keep running the old component for several reloads. What worked: clear the page's local storage and IndexedDB from the page (`localStorage.clear()`, delete the databases), then reload.
- The first Update click right after a page load did not save; click again and check the record's LastModifiedDate.
- `javascript_tool` output containing HTML attribute text can be blocked; return counts and booleans instead.

## Added during the Clause cycle (2026-10-31)

| # | Defect | Status |
|---|---|---|
| C-D7 | (Found on the Clause screen, same component.) Every save ended with `this.newpage = false` while the New Page checkbox stayed ticked, so a second Save or Update without reopening the section saved it without New Page and without the page-break wrapper. | FIXED, Jest and browser-verified; details in `docs/testing/clause-ui-test-log.md`. |

## Correction found during the Header cycle (2026-10-31)

C-D1 was fixed wrongly for the dropdown: I changed the Courier option's value to `courier, monospace`, but the rich text editor only accepts its own font names and silently ignores any other value, so choosing Courier in the Context editor did nothing from that fix until now. Re-fixed: the dropdown gives the editor `courier`, and `upgradeEditorFonts` (in `dxPdfFonts`) writes `courier, monospace` (and `verdana` as `Verdana, sans-serif`) when the section is saved. The Jest test that asserted the stack as the dropdown value was wrong and has been replaced. Details and the measurements: `docs/testing/header-ui-test-log.md` (H-D2). Browser check after the correction: choosing Courier in the Context editor puts `font-family: courier` on the selected text (the dropdown works again); the stack is written on save.
