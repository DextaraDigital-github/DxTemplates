# Page Properties (gear icon): UI test log

Where it lives: the designer component `templateDesignerCMP` (dialog markup in its `.html`, state and handlers in its `.js`, save and load in `templateDesignerCMPUtils.js`, start values in the new `templateDesignerCMPDefaults.js`). Tabs: Page Properties (page margins and line height), Header Properties (first page header, if the template has one, and normal header), Footer Properties. Saved as one JSON in `Document_Template__c.PDF_Page_Properties__c` through `SaveDocumentTemplatesection.saveTemplateData`: `{ pageMargins, headerProperties, footerProperties, pagePropCSS, headerJSONVal, footerJSONVal }`. The PDF page takes `pageMargins` for the `@page` margins and the `*JSONVal` strings as the CSS of the running header and footer boxes. Org: scratch org, templates "ZZ Clip Test" and "ZZ Clone RO". Jest: 9 tests (`templateDesignerCMPUtils.test.js`, `pagePropertiesMarkup.test.js`).

## Results

| # | Test | Result |
|---|---|---|
| P1 | Open the dialog of a template with saved properties | Pass. Values shown match the saved JSON (margins 0/0/0/80, footer height 80, line height 1.2). |
| P2 | Type 2.5 as left margin (before the fix) | FAIL: red "Your entry isn't a valid increment", Save did nothing useful. See P-D3. |
| P3 | Type 2.5, Save, reopen (after the fix) | Pass. Saved `margin-left` `2.5px`, toast "Page Configurations are saved successfully!", the dialog shows 2.5 again. The footer CSS saved by the same click now has `margin-left` (P-D1). |
| P4 | Put the margin back to 0 and Save | Pass (restores the test data). |

## Defects

| # | Defect | Status |
|---|---|---|
| P-D1 | The footer CSS was written with `maring-left` (typo) for all three footer boxes, so the left margin of the footer was never applied in the PDF. | FIXED (Jest failed first). Saved CSS checked in the org after a save: `margin-left`. Templates saved earlier keep the typo until their Page Properties are saved once more. |
| P-D2 | Values with decimals were cut when the dialog was reopened ("2.5mm" became 2 and the unit ".5mm"). The line height of the page was also not restored from the saved JSON. | FIXED (the split reads the decimals and gives numbers; Jest failed first). |
| P-D3 | Every number field of the dialog (36 of them: margins, paddings, heights, line heights, border weight and opacity) had no `step`, so only whole numbers were accepted; "2.5" was refused. | FIXED (`step="any"`). A markup test fails on the old file and passes on the new one; browser: 2.5 accepted, saved and shown again. |
| P-D4 | A template without saved properties (or with an unreadable value) showed the values of the template opened before, and Save would write them into it. The cached `jsonStr` was also never cleared when another template was selected, and `handlePageProperties` read `sectionsData[0]`, which fails for a template without sections. | FIXED (defaults restored first in `updatePropertiesFromJSON`; `jsonStr` cleared when a template is loaded; the `sectionsData[0]` fallback removed). Jest failed first (2 tests). Not yet shown in the browser with two different templates. |
| P-D5 | Start values were written out twice in the component (one literal per property object) with no way to reset them. | FIXED (one `defaultPageProperties()` used by the component and the reset). |

## Observations for the UI discussion

| # | Observation |
|---|---|
| U-P1 | Page type and orientation fields exist in the component (`pageType`, `pageOrientation`, options) but the dialog has no control for them and they are not saved; the PDF takes them from the Generate PDF screen. Dead code or a missing feature? |
| U-P2 | The saved properties of "ZZ Clip Test" are inconsistent: `footerProperties.borderColor` is #FFFFFF while the footer CSS uses #000000 and an older header CSS has `border-bottom: 1px solid [object Object]` (a bug of an earlier version). Re-saving fixes the CSS; the dialog shows the properties, not the CSS. |
| U-P3 | The header "height" and "line height" and the footer "height" are saved but are not part of any CSS rule, so they do nothing in the PDF. |
| U-P4 | Header Properties offers the first-page block when the Header section has `sectionsFirstCount` not null; headers saved before the Header fix (H-D1) may still show it. |
| U-P5 | Line height unit: the page line height is saved as "1.2px" (a unitless 1.2 was meant). |
| U-P6 | A click on a template in the list can land on the neighbour while the list is still settling after load (test automation only, noted because it changed the wrong template's data once; restored). |

## Not tested yet

Header Properties tab in the browser, a real PDF with changed margins, paddings, border and background (only the CSS text is tested), landscape, `separateBorders`, unit conversions, the cancel button.
