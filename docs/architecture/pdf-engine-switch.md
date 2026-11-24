# The PDF engine switch (direct `Blob.toPdf` engine)

Added 2026-11 on branch `feature/document-engine-foundation`. **Off by default: nothing changes until an admin turns it on.**

## What it does
PDFs made **without a screen** (Flow action, Apex `generateDocument`, API; code path `sendEmailAutomation`, which runs in a Queueable) are made by one of two routes:

| Setting | Route |
|---|---|
| off (default) | the Visualforce page `renderAsPdfLWC` renders the PDF (`getContentAsPDF`), exactly as before |
| on | the **same page** is asked for its HTML (`engine=html`), the HTML is cleaned up, and `Blob.toPdf` makes the PDF |

The widget on the record page (browser path, `DisplayPDFController.savePDFtoQuote`) does **not** use the switch.

Why on: faster (68-page Related Objects document: 4.1 s on Visualforce, 1.4 s direct), and `getContent` + `Blob.toPdf` may run **after data was saved in the same
transaction**, which `getContentAsPDF` refuses ("DML currently not allowed"). Evidence that both routes give the same PDF on 12 real templates (same pages, words,
images, size, text positions): `docs/experiments/parity-poc/README.md`.

## Where the admin changes it
Setup, **Custom Metadata Types**, **DXTemplates_PdfEngine**, **Manage Records**, record **Default**, tick **Use Direct Engine**.
The field is subscriber-controlled, so a package upgrade does not reset it.

## If the direct engine fails
`PdfEngine.render` catches the failure, renders with the Visualforce route instead, and then writes a `TransactionLog__c` record (Process `PdfEngine.render()`, type
Exception). The log is written **after** the render because saving a record first would make the Visualforce render refuse to run. If the failure happens in a
transaction that already saved data, the Visualforce fallback itself cannot run and the error is raised as before.

## The parts
| Part | Role |
|---|---|
| `DXTemplates_PdfEngine__mdt` + record `Default` | the setting (`Use_Direct_Engine__c`, default false) |
| `PdfEngine` | `useDirectEngine()`, `render(documentId, pageSize, orientation)`, `normalizeForToPdf`, `rteTableCss` |
| `renderAsPdfLWC.page` + `DisplayPDFController` | `renderAs` is `pdf` unless the parameter `engine=html` is given (`pageRenderAs`, `htmlMode`, `inlineRteCss`); in HTML mode the table stylesheet is written inline |
| static resource `DxRteTableCss` | plain-text copy of `rte_tbl/rte_tbl1.css` (`Blob.toPdf` cannot fetch a linked stylesheet). A Jest test (`docs/tools/__tests__/rteCssCopy.test.js`) fails if the two differ: **change both or neither** |
| `sendEmailAutomation` | the two places that used `getContentAsPDF` now call `PdfEngine.render` |

## Why the HTML is cleaned up
The page returns a full Salesforce page (two `<head>` blocks, `<script>` tags, no `<body>`, page rules inside `<style media="print">`). Given as it is, `Blob.toPdf` ignores the
page rules (Letter, no margins, no header or footer). `normalizeForToPdf` rebuilds one `<head>` with all styles and one `<body>` without scripts, with `indexOf`
loops (a regex fails on documents over about 1 MB).

## Verified (dev org, 2026-11-24)
* **Switch off = unchanged.** After the page and controller change, the corpus of the parity PoC was rendered again and compared with the PDFs made before the change
  (`3_compare_in_org.apex`): 8 of 12 byte-identical except dates and document ID, the other 4 identical in size and different only in the random 6-letter tag of embedded font
  names (`MTPUYT+ArialUnicodeMS` against `QIKMBG+ArialUnicodeMS`) or the order of font objects. The same variation exists between any two runs of the same route.
* **Switch on, through the real Flow action** (`4_switch_cases.ps1`, `5_compare_switch_in_org.apex`): 4 cases (Invoice and Grant Proposal A4 portrait, Invoice **Letter landscape**,
  Newsletter on an Opportunity) made in the Queueable with the switch off and on: **same size**, same page box (A4 `595.28 x 841.88`, Letter landscape `792 x 612`), differences only in
  font object order. No `PdfEngine.render()` fallback log rows: the direct engine did the work.
* `getContent()` and `Blob.toPdf` both run after data was saved in the same transaction (tested); `getContentAsPDF` does not.
* Tests: 8 Apex tests (`PdfEngine_Test`), 3 Jest tests for the stylesheet copy; all 220 Apex and 223 Jest tests pass.

## Verified in an installed package (2026-11-25)
Package version 0.23.0-5 (`04tQm000003DxIHIA0`), fresh scratch org created with `--no-ancestors` (otherwise the install fails with "used as a scratch org ancestor"), no namespace tricks:
* the packaged record `DXTemplates_PdfEngine.Default` is there and off; the stylesheet static resource is found by its namespace (`PdfEngine.rteTableCss`);
* Account cases through the real Flow action with the switch off and on (`4_switch_cases.ps1 -AccountOnly`, `5_compare_switch_in_org.apex`): Invoice A4 portrait 8,047 bytes, Grant Proposal A4 portrait 9,236, Invoice Letter landscape 7,928 in
  **both** settings, the same sizes as in the dev org, page boxes `595.28 x 841.88` and `792 x 612`, differences only in the order of font objects; **no row in `TransactionLog__c`**, so the direct engine ran and never fell back;
* to turn the switch on in an installed org from Apex: `Metadata.CustomMetadata` with `fullName = 'DxCPQ__DXTemplates_PdfEngine.DxCPQ__Default'`, field `DxCPQ__Use_Direct_Engine__c` = true, deployed with `Metadata.Operations.enqueueDeployment`
  (the admin simply uses Setup, Custom Metadata Types).

## Known limits
Watermarks and images saved in the same transaction were not part of the comparison (landscape and Letter were); test them on a template before turning the switch on in an org. Documents whose server-side build exceeds the CPU limit (for example 3,400 Related Objects rows) fail before the PDF engine is reached, with either setting.
Only an org-wide setting exists; a per-template setting is a possible next step.
