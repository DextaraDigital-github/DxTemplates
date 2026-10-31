# Header section: UI test log

Components: `templateHeader` (the section: column count, unique first page header, save and load), `templateHeaderType` (one rich text editor per column) and the Visualforce page `renderAsPdfLWC` (what the PDF prints). Org: scratch org `dxtemplates-scratch-30d`, template "ZZ Clip Test". Jest: 10 tests for `templateHeader`, 7 for `templateHeaderType`, 16 for `dxPdfFonts` (the shared font helper, extended in this cycle).

How it is stored: one `Section_Content__c` JSON per template header, `{ sectionsCount, sectionsFirstCount, sectionsContent: [{ value, indexvar, key, ... }] }`. Column `indexvar` 0, 1, 2 are the left, center and right cells of the normal header; 3, 4, 5 are those of the unique first page header (only used when `sectionsFirstCount` is saved). The PDF reads the header from the template when the document is generated.

## Results

| # | Test | Result |
|---|---|---|
| H1 | Open the header of "ZZ Clip Test" (it had no content yet), choose 3 columns | Pass. Three editors labelled Left, Center, Right; each has font, size, colour, bold, italic, underline, strike, lists, indent, alignment, link, merge field and image buttons. |
| H2 | Type "ACME  Corp" (two spaces) in Left, choose Courier, insert the merge field Account Name in Center without typing afterwards, type "Page 1" in Right, Save | Pass after fixes H-D2, H-D3, H-D4. Saved: `<p><span style="font-family: courier, monospace;">ACME&nbsp;&nbsp;Corp</span></p>`, `<p>{!Account.Name}</p>`, `<p>Page 1</p>`, `sectionsCount` 3. |
| H3 | Tick "Unique First Page Header", choose 1 column for it, type "COVER PAGE HEADER", Save | Pass. `sectionsFirstCount` 1 and a fourth entry with `indexvar` 3. |
| H4 | Reopen the saved header | Pass. The box is ticked, the first-page editor shows "COVER PAGE HEADER", the three columns come back. |
| H5 | Untick the box and Save | Pass after fix H-D1. `sectionsFirstCount` is empty and only `indexvar` 0, 1, 2 are saved. |
| H6 | Real PDF (Datamatics, A4 Portrait), unique first page header on | Pass after fix H-D5. Page 1: only "COVER PAGE HEADER". Pages 2 to 5: "ACME Corp" in Courier on the left, "Datamatics" (the merge field, resolved) in the center, "Page 1" on the right, all with the section texts below. |
| H7 | Font list in the header editors | Times New Roman, Arial, serif, Courier. Courier now applies (see H-D2). |

## Defects

| # | Defect | Status |
|---|---|---|
| H-D1 | Unticking "Unique First Page Header" did not remove the first-page header: Save wrote `sectionsFirstCount` and the first-page texts anyway, and the PDF uses a separate first-page header whenever `sectionsFirstCount` is present. | FIXED (the first-page header is only saved while the box is ticked; its text stays in memory in case the box is ticked again). Jest failed first; browser-verified (saved data). |
| H-D2 | The Courier option stored `courier` and the PDF prints that in Times (same as Table D11, Context C-D1, Related Objects R-D1). My earlier fix for Context changed the dropdown value to `courier, monospace`, and **that broke the dropdown**: the rich text editor only accepts its own font names (serif, sans-serif, courier, verdana, tahoma, garamond) and silently ignores anything else, so choosing Courier did nothing. Measured in the Header editor in the browser with `setFormat`. | FIXED for Header and Context: the dropdown gives the editor `courier`, and `upgradeEditorFonts` (new, in `dxPdfFonts`, 7 tests failed first) writes `courier, monospace` (and `verdana` as `Verdana, sans-serif`) when the text is sent or saved. Browser: choosing Courier now puts `font-family: courier` in the editor and the saved header holds the stack; the PDF prints it in Courier. Footer still to do in its own cycle. |
| H-D3 | Inserting a merge field or a picture changed the text in the editor but did not tell the header, so the insert was lost unless the user typed something afterwards. | FIXED (every change goes through `notifyHeader`). Jest failed first (2 tests); browser: a merge field inserted without any later typing is saved. |
| H-D4 | Two spaces in a row were converted to `&nbsp;` only on a local copy after the change event had already gone to the header, so the saved text never had them and the PDF collapsed them. | FIXED (the converted text is what is sent). Jest failed first; browser and saved data show `ACME&nbsp;&nbsp;Corp`. |
| H-D5 | **PDF: a first-page header with fewer columns than the normal header kept the normal header's other columns on page 1.** A page rule only replaces the margin boxes it names, so with a 1-column first header over a 3-column header the center and right texts of the normal header were still printed on page 1 (seen in the real PDF: "Datamatics" and "Page 1" under "COVER PAGE HEADER"). | FIXED in `renderAsPdfLWC.page` (4 first-page blocks): the unused boxes are set to `content: none`. Real PDF before and after: page 1 now shows only the cover header; the other pages are unchanged. The 2-column over 3-column case got the same rule but was not tested. |

## Observations for the UI discussion

| # | Observation |
|---|---|
| U-H1 | The Delete button of the Header (and the Footer template has the same markup) calls `handlesectionDelete`, which does not exist in the component, and no earlier version of the file had it: the button does nothing. Decide whether a header can be deleted. |
| U-H2 | The section name is fixed to "Header" and disabled; the text "Left / Center / Right" is printed as plain text above each column editor. |
| U-H3 | The rich text editor accepts only a fixed list of fonts; the dropdown offers four of them (no Verdana, which Related Objects offers). |
| U-H4 | Saving a header without choosing any column count saves it with empty content and no message. |
| U-H5 | Reopening a header shows each editor's font dropdown as "Times New Roman" whatever the text uses (same as Context U-C1). |

## Not tested yet

Picking a picture through the image dialog in the browser (Jest only), landscape PDFs and the "All Pages Except First Page" option (these belong to Page Properties), a 2-column first-page header over a 3-column header in the PDF, Delete (see U-H1), and the header in a template without any other section.
