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

## Custom CSS and visibility filter (2026-11-01)

Org: scratch org, template "ZZ Clip Test", section "Seq A" (rule and CSS were removed/left as noted). Jest: 4 new tests in `templateContentDetails.test.js` (30 now), 10 new in `dxShowSelectedTemplate/__tests__/visibilityRules.test.js`.

| # | Test | Result |
|---|---|---|
| C7 | Custom Section CSS: type `color: red;`, Save in the dialog, Update (New Page was ticked) | Pass after fix C-D8..C-D10. Stored: page-break div around a `color: red` div around the text, once. |
| C8 | Reopen the section and the CSS dialog | Pass: the dialog shows `color: red;` (empty before the fix). Change to `color: blue;`, Update: the wrapper was replaced, not nested. |
| C9 | Filter dialog: Account / Type / Equals / Customer - Direct, Create Rule, Update | Pass. `Section_Visibility_Rule__c` set after Update (the rule itself is created when the dialog's Create Rule is pressed, the link to the section only on Update/Save). Reopening the dialog shows the saved condition. |
| C10 | Real Generate PDF screen (component on the Account page), Account Type = Customer - Direct, then Prospect; stored Document body compared | Pass. Direct: Seq A in the body (D-0103); Prospect: Seq A missing, tables still there (D-0105). Template had to be active to be listed; deactivated again, Account Type restored. |
| C11 | "Reset Rule & Save" | Pass: rule link null, content kept. |

| # | Defect | Status |
|---|---|---|
| C-D8 | The CSS typed for one section stayed in the component when the editor was cleared for the next section, so the next saved section got the first one's wrapper. | FIXED (reset on clear and on load). Jest failed first. |
| C-D9 | A section saved with custom CSS reopened with an empty CSS dialog and the wrapper in the editor; typing CSS again nested another wrapper. | FIXED (dialog shows the CSS, wrapper replaced; clearing the CSS removes it). Jest failed first; browser-verified. |
| C-D10 | New Page won over the custom CSS: with both set, the CSS was dropped silently (U-C3). | FIXED: both are written (CSS div inside the page-break div). |
| C-D11 | **Visibility rules were evaluated wrongly at PDF time** (`dxShowSelectedTemplate.evaluateExpression`): every condition had to hold whatever the operator (OR behaved as AND), parentheses and AND/OR precedence were ignored, a number or checkbox from the record never equalled the rule's text (`5 !== "5"`, `true !== "true"`), `<`/`>` compared numbers as text ("9" > "10"), and `Condition1` also replaced inside `Condition10`. | FIXED: new pure module `visibilityRules.js` (parser with AND over OR, parentheses; numeric and boolean aware); 10 Jest tests, written first. Browser: single-condition rule verified on the real screen; OR/groups covered by Jest only. |

## Observations for the UI discussion

| # | Observation |
|---|---|
| U-C6 | The three icons above the editor have no text: `</>` = custom CSS, the page icon = visibility filter, `?` = help (opens a Google Drive PDF in a new tab). |
| U-C7 | Create Rule in the filter dialog saves the rule immediately, but the section only points to it after Update; closing without Update leaves an orphan rule (Rule and Rule Condition records are never cleaned up). |
| U-C8 | The generate screen lists only active templates; an active template is read-only in the designer. |
| U-C9 | The visibility rule is evaluated in the browser (Generate PDF screen) only; a PDF made by another path (Apex or flow calling `generateDocument` directly with its own body) does not apply it. |

## Not yet tested

Image insert and resize in a Context section, Delete / New / Clone, merge-field value in CSS, OR/group rules in the browser.

## Image insert, New, Delete, Clone (2026-11-01)

Org: scratch org, template "ZZ Clip Test", section "Seq A"; clone "ZZ Clone Ctx" (left for you to delete). Jest: 1 more test (31 in `templateContentDetails.test.js`).

| # | Test | Result |
|---|---|---|
| C12 | Add Image (toolbar), pick the only image (DxtaraDatamaticsLogo), Update | Pass. Saved `<img src="/sfc/servlet.shepherd/version/download/068...">` inside the page-break and CSS wrappers. The Resize Image button is commented out in the markup (see U-C10), so resizing was not testable. |
| C13 | Reopen, type text after the image, Update (CSS dialog never opened) | FAIL before fix C-D12: the `color: blue` wrapper was lost. After the fix the content keeps both wrappers and the new text. |
| C14 | Real flow: activate template, Generate PDF screen, Preview PDF; the attachment it saved was read with pdfjs | Pass. Page 2 starts with the Context text in Courier-Bold, blue fill (0,0,255) is used, 2 images painted on that page (the Context image and one more in the template), page break works, footer "Page 2 of 5". Template deactivated again. |
| C15 | New Context section: toolbar "Section : Context", name "Seq New", text, Save | Pass. New row with Sequence 6 before the footer (Footer is 9: gaps from earlier deletes); toast "Section Seq New was Saved". |
| C16 | Delete that section (Delete button) | Pass. Row removed (SOQL count 0), designer returns to the Header editor. No confirmation dialog. |
| C17 | Clone > New Template "ZZ Clone Ctx" | Pass. Same 8 sections; Context content (page break, blue CSS, image) and the Clause section with its clause link are identical to the original. The dialog needs two clicks on the toggle position because the layout moves when "New Template" is chosen (automation note). |

| # | Defect | Status |
|---|---|---|
| C-D12 | The real rich text editor removes the outer `<div style>` from the text it reports, so editing a section that has custom CSS (without opening the CSS dialog) saved it without the CSS. The Jest stub keeps the div, which hid this until the browser. | FIXED: the CSS wrapper (and the page-break wrapper) is taken off when the section loads and kept in `sectioncssval`; Jest test (editor reports the text without the div) failed first, browser-verified: CSS kept after editing the text. |

## Observations for the UI discussion (added)

| # | Observation |
|---|---|
| U-C10 | "Resize Image" is commented out in `templateContentDetails.html`; about 400 lines (resize, crop, image properties, `handleResizeUpdate`, `modifyImageAttributes`, resized-image storage `Resized_Images_Data__c`, `deleteContentVersions`) are dead or half-live code. Decide: finish the feature or remove it. |
| U-C11 | The saved image tag is not closed (`<img src="...">`); the PDF still renders it (checked), so no action, but the page should be well-formed if the PDF engine ever gets stricter. |
| U-C12 | The image picker lists all Files images (one here); there is no upload from the dialog. |
| U-C13 | Delete has no confirmation. The section name is not shown in the toast after delete (no toast at all). |
| U-C14 | Apex test method note: calling `Page.renderAsPdfLWC.getContentAsPDF()` from anonymous Apex now fails with "DML currently not allowed" for browser-made documents; use the attachment that Preview PDF saves (read it with Apex base64 dump) as the real-flow PDF. |

## Not yet tested

Merge field value inside a clause or Context text in a real PDF with a record that has data (Clause screen), clause deleted or inactivated later, OR/group visibility rules in the browser, Table Col Resize re-test, U43.
