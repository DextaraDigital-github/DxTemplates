# Watermark settings: UI test log

Where: designer toolbar, Edit Properties (the dialog also holds name, description and the flow or class), button "Watermark Settings". Code: `templateDesignerCMP` (`handleWatermarkSettings`, `handleWaterMarkSave`, `drawOnCanvas`, `generateCanvas`, `getSavedDocTempWatermarkData`), Apex `DisplayPDFController.saveContentVersion` and the PDF side in `DisplayPDFController` (constructor, lines about 301 to 319) and `renderAsPdfLWC.page` (page background image per page option). The same watermark code also exists a second time in `dxTemplateSetup` (see U-W1). Stored in `Document_Template__c.Watermark_Data__c`: a JSON list with a Text entry and an Image entry (`isPrimary`, `contentVersionID` of the saved PNG, `pageOption`, size, opacity, rotation, colour, text). Only the entry marked primary is printed, as the page background, from `/sfc/servlet.shepherd/version/renditionDownload?rendition=ORIGINAL_Png&versionId=...`.

Org: scratch org, template "ZZ Translation Test" (made 3 pages long with two page breaks). PDFs rendered with the Apex recipe of `translations-multilanguage-pdf-test-log.md` and read with `readpdf.mjs` (images painted per page). The saved watermark PNG was extracted from the org and looked at.

## Results

| # | Test | Result |
|---|---|---|
| W1 | Open the dialog on a template without watermark | Pass. Text tab with defaults (size 22, colour #000000, opacity 1.0, rotation 0, Primary ticked, All Pages), empty preview. |
| W2 | Text "CONFIDENTIAL", size 28, rotation -100, opacity 0.3, All Pages, Save | Pass. Preview shows the rotated light text. Saved JSON as set. The saved PNG is 600 by 600, transparent, with the text rotated and light grey. |
| W3 | Real PDF, All Pages | Pass. An image is painted on each of the 3 pages. |
| W4 | Reopen the dialog | Pass. All Text values and the page option come back; the preview is redrawn. |
| W5 | Page option Only First Page, Save, real PDF | Pass. Image on page 1 only. |
| W6 | Page option All Pages Except First Page, Save, real PDF | Pass. Image on pages 2 and 3 only. |
| W7 | Image tab: choose a PNG, preview, tick Primary, Save | Pass. Preview shows the picture; the Image entry is primary, the Text entry is switched to not primary (the two are mutually exclusive); `originalImageCVId` is kept. |
| W8 | Real PDF with the image watermark | Pass. Image on all 3 pages. |
| W9 | Reopen: Text tab and Image tab | Pass. Text not primary, "Except First Page"; Image primary, All Pages, scale 100. |
| W10 | Save again without changing anything (the Image preview is blank after reopening, so the image is not re-sent) | Pass. The image watermark is kept (a new copy is made from the original) and still prints on all pages. |

## Observations for the UI discussion (no defect found that needed a code change)

| # | Observation |
|---|---|
| U-W1 | The whole watermark code (about 400 lines of canvas drawing, saving and loading) exists twice: in `templateDesignerCMP` and in `dxTemplateSetup`. A fix has to be made twice; a shared module is the clean solution (architect item for the refactoring plan). |
| U-W2 | The watermark is always drawn on a fixed 600 by 600 canvas and used as the page background, so a text watermark at the largest font size is still small on an A4 page and cannot cover the page or be placed. |
| U-W3 | The Image tab preview is blank after the dialog is reopened (it only shows a picture chosen in this session), although the saved image is still used. |
| U-W4 | Every save makes new files for both entries (Text and Image) even when nothing changed, so the Files library fills with "WatermarkImage" versions. |
| U-W5 | After a save the code resets the Image page option to `'All Pages -  Image'` (two spaces) instead of `'All Pages - Image'`. It has no effect today because the dialog reloads the saved data when it opens. |
| U-W6 | When neither entry is primary the PDF builds the image address with `versionId=null`. |
| U-W7 | The Version number field in the Edit Template dialog was empty for this template, although the list shows "v1". Not investigated. |
| U-W8 | Page options of Text and Image are separate, and only the primary one is used; unticking Primary on one tab ticks it on the other. |

## Not tested

Colour and font-size effect in the PDF beyond the PNG, scaling of an image above or below 100 percent, opacity of the image, rotation of the image, a very large image, import and export of watermarks (`ImportExportData`), a landscape PDF.
