# Import and Export of templates: test log (2026-11-01)

Purpose of the feature: move templates from one org to another (develop in a dev sandbox, then UAT, then production). Code: `dxTemplateSetup` (`exportTemplate`, `handleExportTemplateList`, `downloadJson`, `importTemplate`, `handleJSONUpload`, `createTemplateData`) and the Apex class `ImportExportData`. Buttons: the two round icons at the top of the template list (left = Import, right = Export).

## Set-up (reusable)

- Source org: `dxtemplates-scratch-30d` (the development org). Target org: **`dxtemplates-uat-30d`**, a second scratch org made from the same Dev Hub (`dxdevhub`) with `sf org create scratch --definition-file config/project-scratch-def.json --target-dev-hub dxdevhub --alias dxtemplates-uat-30d --duration-days 30`, then `sf project deploy start --source-dir force-app` (237 components) and `sf org assign permset --name Dx_Template_Access --name Dx_Template_User_Access`. It has the same code as a package install would give but none of the source org's data, fields or files. Expires 2026-12-01.
- Templates exported: "ZZ Clone Ctx" (header, context with a resized image and a visibility rule, three tables, Related Objects with a filter rule, two Clause sections, footer) and "ZZ Translation Test" (translations in seven languages, header, footer, page properties, text and image watermark).
- Export was run in the real dialog (two templates selected, Download). The download was caught in the page by a hook on the anchor click so that no file was written to the disk; the file content was read from the page (181,461 characters: 2 templates, 12 sections, 2 rules, 2 conditions, 1 clause, 99 translations, 3 watermark files). The same file was rebuilt from the same Apex methods and the dialog's own filter code (`docs/tools/...` is not needed, the steps are in this log), and the counts were identical, so that file was uploaded in the target org with the real Import dialog (file chooser, Create).
- Tool trap: `javascript_tool` returns only about a thousand characters, so a large file cannot be read out of the page; dump it from Apex instead (base64 in 12,000-character `System.debug` chunks).

## Results

| # | Test | Result |
|---|---|---|
| IE1 | Export dialog: pick two templates, Download | Pass for the file itself (valid JSON, all seven blocks). Findings E-1 and E-2 below. |
| IE2 | Import the file into the empty second org (Choose File, Create) | The dialog ends with "Templates have been successfully created" and both templates and all 12 sections exist, with page properties. But see I-1 to I-6: the data is wrong or missing in several places while the message says success. |
| IE3 | Import the same file a second time | Blocked: "Duplicates found. Please check your file and make sure to upload the correct data". The dialog stays on step 2 with no button to go back or close except the corner X. |

## Findings: data that was wrong or lost (all verified in the target org)

| # | Finding | Severity |
|---|---|---|
| I-1 | **The Related Objects filter rule was linked to every section of the template** (Header, Footer, Context, Tables, Clauses: 9 sections), not only to "RO Opps". The import matches a section's rule by `External_RuleID__c`, which is empty for that rule, and `null == null` is true for every section. Data corruption. | High |
| I-2 | **Watermark was not imported.** No file was created in the target org and the template's `Watermark_Data__c` still names the source org's file ids, so the watermark is broken. The import looks the file up by `External_Id__c`, which the product never sets when it saves a watermark, so the lookup value is empty. | High |
| I-3 | **Translations are exported but never imported** (99 in the file, 0 created). There is no import method for them at all. | High |
| I-4 | **Pictures in section text are not carried over.** Three sections still contain `/sfc/servlet.shepherd/version/download/068...` ids of the source org (Seq A, Full T, the clause section), so the pictures are broken in the target org. Only watermark files are exported, no other file. | High |
| I-5 | **Re-importing is impossible.** A template that was imported once (or any template with an external id already present) blocks the whole file, so a changed template cannot be promoted again; the only way is to delete it in the target first. | High (the main use case) |
| I-6 | **The import is not atomic and its success message is not true.** The steps run as unconnected promises (watermark, rules, conditions, clauses, sections); the success text is shown before the last calls finish and errors inside them are swallowed; a failure half way leaves half of the data. | High |
| I-7 | Rule and condition links work only by luck: they follow `External_Id__c`, which is filled for rules made through "Create Rule" but empty for rules saved later (4 of 7 rules and 4 of 7 conditions in the source org had none). A condition with an empty external id is **not exported at all** (the export reads conditions with `External_Id__c IN (rule external ids)`). | High |
| I-8 | The clause and the visibility rule of "Seq A" were linked correctly (the paths that do work). A clause whose record was deleted leaves its section without a clause (as in the designer, C-D13). | info |
| I-9 | The Class and Flow of a template (`ClassId__c`, `FlowId__c`) are not exported (they are org specific), and nothing tells the user that they have to be set again in the target org. | Medium |

## Findings: export dialog and file

| # | Finding |
|---|---|
| E-1 | The file contains **all translations of the org**, not those of the selected templates (99 in the file; 98 belong to the selected template, one to a template that was not selected). |
| E-2 | A template without a version number is listed as "ZZ Translation Test - vundefined". |
| E-3 | If the server call fails, `getAllDocumentTemplatesData` returns an empty text (the `catch` returns `''`), the dialog's `JSON.parse` then fails and the dialog shows no list and no message. |
| E-4 | The call loads **every** section and translation of the org (limit 50,000 sections, translations without a limit) every time the dialog opens, and the selection is applied in the browser. |
| E-5 | The Apex methods that create records insert whatever JSON they receive (`JSON.deserialize` into the SObject, no field whitelist, no object or field permission check). A hand-edited file can set any writable field. |
| E-6 | The import dialog's own check covers only the "Related to Type" picklist value. Related Objects sections name objects and fields (`Section_Details__c`) that may not exist in the target org; nothing is checked. |

## What a correct design looks like (architect)

1. **One server call, one transaction.** Move the orchestration into Apex (`ImportExportData.importTemplates(json)`): validate the file, take a savepoint, insert templates, then sections, rules and conditions, clauses, translations and files, and roll back on any failure. Return a summary (what was created, what was skipped and why) that the dialog shows.
2. **Key every link by the source id** that is in the file (`Id` of each exported record), never by `External_Id__c`. A map `old id to new id` per object resolves template, rule, condition, clause links and the pictures in text.
3. **Export the files** that the selected templates use (watermark entries and every `068...` id found in section content, header JSON and table cells) as base64 with their title, and re-create them in the target, rewriting the ids in the text.
4. **Translations** of the selected templates only, re-created with the new template id.
5. **Re-import = promote**: decide whether a template that exists in the target (matched by its source id or name) is replaced or imported as the next version.
6. A **dry-run summary** before Create (counts, missing objects or fields, class/flow to set again).

## Fix and retest (2026-11-01)

Built as designed above: new Apex class **`TemplateMigration`** (`listTemplates`, `exportData`, `importData`) with 9 Apex tests (`TemplateMigration_Test`, written first), `dxTemplateSetup` rewired to it, 8 new Jest tests (`dxTemplateSetup/__tests__/importExport.test.js`, written first and failing against the old code). The old create methods of `ImportExportData` are no longer AuraEnabled (the install script `PostInstallDataCreation` still uses them from Apex).

How it works now: the export dialog lists templates (`listTemplates`); selecting some asks the server for a file with only those templates, their sections, the rules, conditions and clauses they use, their translations and every file they show (watermark files and every `068...` id in section text, header and page properties, as base64). Import sends the whole file in one call; the server checks the file and the "Related To Type" values, then creates everything in one transaction (all or nothing) and returns what was made and what to check. Every link is keyed by the source record's `Id` from the file. Whitelisted fields only. Importing a name that exists makes the next version. Files of the old format (key `Watermark`) are still accepted.

Retest with the real dialogs (target org already held the first, faulty import as version 1):

| # | Test | Result |
|---|---|---|
| IE4 | Import the new file (170 KB) into the target org | Pass. The dialog lists "ZZ Translation Test (version 2)", "ZZ Clone Ctx (version 2)" and "12 sections, 2 rules, 2 conditions, 1 clause, 98 translations, 5 files". Version 2 because the first import is version 1; nothing was blocked (I-5). |
| IE5 | Links in the new copies (SOQL) | Pass. The Related Objects rule is only on "RO Opps"; the visibility rule only on "Seq A"; "ZZ Payment Terms" points to the clause that already existed (no second copy); each condition belongs to the copy of its own rule (I-1, I-7). |
| IE6 | Translations | Pass: 98 on the copy of "ZZ Translation Test", 0 on the other (I-3, E-1). |
| IE7 | Watermark | Pass: three files created in the target org and the template's watermark data names the new ids (I-2). |
| IE8 | Pictures | Pass: the resized picture in "Seq A" points to a new file in the target org (7,289 bytes, as in the source), and the logo was created too (I-4). |
| IE9 | Real PDF of the imported template in the target org (account, generate, render) | Pass. The resized logo is painted at 135 x 32 pt as in the source, the merge fields resolve ("Dear Datamatics", "Industry: Technology"), the visibility rule shows "Seq A" for an account of type "Customer - Direct", and the table column starts match the source. |
| IE10 | Failure cases (Apex and Jest) | Pass. A "Related To Type" the target does not have, a file that is not JSON, one without templates: each is refused with a message and nothing is left behind (rollback test). The dialog shows the server's message with a Back button. |

| # | Defect | Status |
|---|---|---|
| I-1..I-7, E-1, E-3 | see the findings above | FIXED (server-side import, ids as keys, atomic, files and translations carried). |
| E-2 | "vundefined" for a template without a version | FIXED (label has no version part then). |
| E-4 | the dialog loaded every template of the org | FIXED: it lists templates only; the file is made for the selection. |
| E-5 | create methods accepted any field, exposed to the browser | FIXED: whitelisted fields in `TemplateMigration`; the old create methods are not AuraEnabled any more. |
| E-6 / I-9 | Related Objects objects and Class/Flow not checked | PARTLY: the result lists a warning for a Related Objects section whose object does not exist in the target and for a template that had a Class or Flow in the source. Fields inside the Related Objects details are not checked. |

## Still open (for discussion)

| # | Item |
|---|---|
| IE-O1 | Importing makes a new version; there is no "replace the existing version" choice and the active version is not touched. |
| IE-O2 | Files larger than about 2.5 MB in total are left out of the file with a note (synchronous Apex memory limit). A very image-heavy template needs several exports or a different transport. |
| IE-O3 | The export file carries pictures as base64, so it is large (170 KB for two templates); the JSON preview in the dialog is not readable for it. |
| IE-O4 | The first, faulty import is still in the target org as version 1 of both templates (wrong rule on all sections, no translations). Nothing was deleted. |
| IE-O5 | Custom fields, record types and picklist values that sections or rules refer to are not migrated (outside templates); the target org has to have them. A pre-check for those is not built. |

## Repeat migration by template family (2026-11-01, after the owner's clarification)

Owner's intent: the External ID of a template is how a template is recognised in another org; migrating the same template again must add a **new version under that template**, never replace it.

How the product models it (read from `SaveDocumentTemplate`): a new template has `Parent_Template__c` = itself, version 1, `External_ID__c` = its own Id; "New Version" gives the next version of the family (same `Parent_Template__c`), `External_ID__c` = the new record's own Id. So a template family is identified by the **External Id of its root**.

What `TemplateMigration` does now:
- Export: every template row carries `FamilyKey` = the External Id of its family's root.
- Import: a template whose family key is already in the target org (a root with that External Id) becomes the **next version of that family** (`Parent_Template__c` = that root, version = highest + 1, own Id as External Id). Otherwise it starts a new family: it is its own root, version 1, and **keeps the source family key as its External Id**, so the next migration finds it. Several versions in one file are imported in version order under one root. Files from before this change (no key) fall back to the source root id, the template's external id, or the name.
- Nothing is ever replaced.

| # | Test | Result |
|---|---|---|
| IE11 | Apex (3 new tests, failing first): migrate to an org without the template, then twice more; version 2 of the source exported on its own and imported later; two versions in one file | Pass: one family, versions 1, 2, 3, every version under the first import as parent, root keeps the source family key, versions have their own Id as external id. |
| IE12 | Real dialog in the target org, same file twice | Pass. First run: "ZZ Translation Test (version 1)" and "ZZ Clone Ctx (version 1)", each its own root; second run: both "(version 2)" under those roots (checked by SOQL: parent = the first import, external id = own Id). |

Two product defects found while checking how families are made (Apex probe with the exact values the clone dialog sends), both FIXED with 4 new Apex tests (`TemplateCloneVersioning_Test`, failing first):

| # | Defect | Status |
|---|---|---|
| V-D1 | **"New Version" of the first (root) template gave version 1 again**, not 2: the code compared the parent with the selected template, which is the same record for a root. | FIXED: the next version is the highest of the family plus 1. |
| V-D2 | **"New Template" put the new template under the source as parent** (the dialog sent the source as parent), so it joined the source's family with version 1; a later New Version of it would have been numbered inside the other family. | FIXED: the dialog sends no parent for "New Template" and the server makes the new template its own root. |

Existing data keeps its old shape: "ZZ Clone Ctx" in the source org still has "ZZ Clip Test" as parent (made before the fix), so it migrates into a family keyed by the Clip Test id. Templates created before the fix may need their parent corrected once.

Also visible in the target org: the two first, faulty imports (before the redesign) have no parent and are not part of any family.
