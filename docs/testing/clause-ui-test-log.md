# Clause section: UI test log

Component: `templateContentDetails` in its Clause mode (`showclausescreen`, section type `Clause`), plus the shared `multiLookupComponent` for the clause lookup. Org: scratch org `dxtemplates-scratch-30d`, template "ZZ Clip Test". Seed: `docs/tools/org-seed/seed_clauses.apex` (ZZ Payment Terms, ZZ Confidentiality, ZZ Retired Clause which is inactive). Jest: 12 Clause tests added next to the 14 Context tests (26 in `templateContentDetails.test.js`).

How a Clause section works: picking a clause copies its body into the section's rich-text editor and its name into the section name; the section keeps a reference to the clause (`Document_Clause__c`, sent as the id inside quotation marks, which Apex strips). The PDF uses only the copied text in `Section_Content__c`, so a later change to the clause record does not change the section.

## Results

| # | Test | Result |
|---|---|---|
| CL1 | Add a Clause section (task icon in the section toolbar); the screen shows Name, "Document Clause" lookup, New Page and the editor | Pass |
| CL2 | Type "ZZ" in the lookup | Pass after fix C-D5: two active clauses are offered; the inactive one is not. |
| CL3 | Pick "ZZ Confidentiality" | Pass. Name and pill are filled; the text appears with the `&`, the italic quotation marks and both paragraphs. |
| CL4 | Tick New Page, append " Edited by hand." and Save | Pass. Toast "Section "ZZ Confidentiality" was Saved"; record at the next sequence number, `Document_Clause__c` is the clause id (no quotation marks), `New_Page__c` true, content `<div style="page-break-before : always;">` around the paragraphs with `&amp;` and the edit. |
| CL5 | Save a second time without reopening | Pass after fix C-D7: New Page and a single wrapper are kept. |
| CL6 | Open another section, then the Clause section again | Pass. Pill, New Page and the edited text come back. |
| CL7 | Remove the pill (x) | Pass: name and text are cleared, New Page stays ticked. |
| CL8 | After removing the pill type another name and Save | Pass after fix C-D6: error toast "Please select a pre-defined Clause to save this section." and nothing is saved. |
| CL9 | Pick "ZZ Payment Terms" in the same section and Save | Pass. The name and the text (bold title and two bullets) are replaced; the record now points at Payment Terms and holds its text inside the page-break wrapper. |
| CL10 | **Real PDF** of "ZZ Clip Test" (Datamatics, A4 Portrait) | Pass. 5 pages; the Clause is on its own page 5 (New Page): "Payment Terms" in Times-Bold and the two list items. Pages 1 to 4 are as in the Related Objects log (page 1 empty because Seq A has New Page, intended). |

## Defects

| # | Defect | Status |
|---|---|---|
| C-D5 | The clause lookup offered inactive clauses. The class starts with the filter ` IsActive__c = true`, and `connectedCallback` replaced it with the value of an unused attribute (undefined). | FIXED (line removed). Jest first failed with an empty filter. Browser: with the fix only the two active clauses are listed; before it the retired one was too. |
| C-D6 | Removing the clause from the lookup cleared the name and the text but not the clause id that Save checks. A section with a newly typed name saved without any error and kept the removed clause and its old text (seen in the browser: the section kept "ZZ Confidentiality" and its text after the pill was removed). | FIXED (`clauseId` is cleared in `updateItemEventHandler` and `handleclauseremoval`). Jest first failed (Apex was called once). Browser: the error toast appears. |
| C-D7 | Every save ended with `this.newpage = false`, while the New Page checkbox on the screen stayed ticked. A second Save (or Update) without reopening the section saved it without New Page and without the page-break wrapper. Affects Context sections too (same component). | FIXED (the reset is gone; the designer's own reset already clears it). Jest first failed with New Page false on the second save. Browser: a second save keeps New Page and a single wrapper. |

## Observations for the UI discussion

| # | Observation |
|---|---|
| U-CL1 | Picking a clause overwrites the section name and the text without asking, also when the user had typed something. |
| U-CL2 | The text is a copy: nothing tells the user that editing the clause record later will not change existing sections, and there is no way to refresh a section from its clause. |
| U-CL3 | The lookup list box shows only about two rows and scrolls inside a small box; the clause body is not previewed before picking. |
| U-CL4 | Both "Update" (next to the name) and "Save" (bottom) save the section; the section list shows an unnamed "Clause" entry until the first save. |
| U-CL5 | The section is saved with `Document_Clause__c` as text with quotation marks and Apex strips them (`arrOfStr[1]`); fragile, but works. |
| U-CL6 | Designer: if another template is selected while the first template's sections are still loading, the section list shows the sections of both templates merged (seen with "ZZ Clone RO 2", whose sections have the same names). The data was not affected. To fix in the designer cycle. |

## Not tested yet

Merge field inside a clause body, images in a clause, Delete and visibility filter on a Clause section (same code as Context, covered there), a saved Clause section whose clause was deleted or set inactive later (the editor reads `Document_Clause__r.Name`), Clone of a template with a Clause section.
