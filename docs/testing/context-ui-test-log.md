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

| C6 | Real PDF of Seq A (stored content wrapped between "Page one text" and "Last text", rendered with `renderAsPdfLWC`, read with pdfjs) | Pass after the fixes. Page 1 holds only "Page one text"; page 2 starts with the Context text in Courier-Bold, then "Last text". The New Page break works and the single wrapper is enough. (Method: swap the body of the throwaway Document D-0024, render, restore; the backup is `ZZBACKUP`.) |

## Defects

| # | Defect | Status |
|---|---|---|
| C-D1 | The Courier option stored `courier`; the PDF engine only knows generic names, so it printed Times (same as Table D11). Option is now `courier, monospace`; saving also upgrades old `font-family: courier;` in existing content. | FIXED, Jest (3 new tests failed first), UI-verified: a section holding `courier;` was saved again and now holds `courier, monospace;`. |
| C-D2 | `<div style="${css}\>` lost the closing quote of the style attribute, so the custom CSS wrapper was invalid HTML. | FIXED, Jest test failed first. Not yet checked in the browser or the PDF. |
| C-D3 | A New Page section reopens with its page-break div inside the editor, so each Update wrapped it again. Now the old wrapper(s) are taken off before the new one is added; unticking New Page also removes the page break. | FIXED, Jest test failed first, UI-verified: 6 nested wrappers became 1 on the next Update. |

## Observations for the UI discussion

| # | Observation |
|---|---|
| U-C1 | After reopening, the font dropdown shows "Times New Roman" even when the text is Courier; it does not follow the text. |
| U-C2 | The font list has two entries with the same value (Times New Roman and Serif both `serif`). |
| U-C3 | The custom CSS is not saved with the section and is not shown again on reopen (only the wrapper in the content remains). Custom CSS and New Page cannot be combined (New Page wins). |
| U-C4 | A new page break is stored inside the content, so the editor shows no sign of it except the ticked box. |

## Not yet tested (next)

Merge field insert; image insert; the visibility filter dialog; Delete; New section creation; Clone; sections with many images; Preview and the real PDF for a Context section (recipe: `table-ui-test-log.md` section 1.16); the Clause screen that uses the same component.

## Lessons for testing

- After a deploy the browser can keep running the old component for several reloads. What worked: clear the page's local storage and IndexedDB from the page (`localStorage.clear()`, delete the databases), then reload.
- The first Update click right after a page load did not save; click again and check the record's LastModifiedDate.
- `javascript_tool` output containing HTML attribute text can be blocked; return counts and booleans instead.
