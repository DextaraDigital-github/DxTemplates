# Scratch Org and UI Test Runbook

Verified on 2026-10-28/29 with Salesforce CLI 2.121.7. Scratch orgs are always created with the maximum 30-day duration.

> **Starting a testing session? Read [browser-testing-playbook.md](browser-testing-playbook.md) first.** It has the fast start, measured timings, tab handling, the recipes with exact controls, and every pitfall. This runbook covers only building the org from nothing. The seed scripts it describes are saved in `docs/tools/org-seed/` and the helper scripts in `docs/tools/`.

## 1. Create and deploy

```bash
sf org create scratch --definition-file config/project-scratch-def.json \
  --target-dev-hub <devhub-alias> --alias dxtemplates-scratch-30d \
  --duration-days 30 --wait 15 --set-default
sf project deploy start --source-dir force-app --target-org dxtemplates-scratch-30d --wait 30
sf org assign permset --name Dx_Template_Access --name Dx_Template_User_Access \
  --target-org dxtemplates-scratch-30d
```

- The namespace `DxCPQ` is picked up from the Dev Hub automatically.
- The deploy output tail does not show success. Confirm with `sf project deploy report --use-most-recent --json` (expect 229 of 229 components, 0 errors).
- Quotes and Knowledge are not enabled by the scratch definition, so Quote and Knowledge sample templates are skipped.

## 2. Seed sample templates

A source deploy does not run `PostInstallDataCreation`. Its template method is private, and `onInstall` also schedules a job and sends email. Run anonymous Apex that mirrors the method: read the static resource `TemplatesAndSectionData` (JSON), keep templates whose `DxCPQ__Related_To_Type__c` object exists in the org, then call `ImportExportData.createImportedTemplates` and `createImportedTemplateSections`, saving the logo `DextaraDatamaticsLogo` as a `ContentVersion` and substituting `<contentversionid>` in Header sections.

The script is saved as `docs/tools/org-seed/load_sample_templates.apex`; run it with `sf apex run --file docs/tools/org-seed/load_sample_templates.apex --target-org dxtemplates-scratch-30d`. `seed_merge_test.apex` adds the "Merge Field Test" template and `activate_rest.apex` activates the samples.

Result in a fresh org: 8 templates, 60 sections (Context 31, Table 19, Header 8, Footer 1, Clause 1); 9 templates with the merge-field test template.

Verify with `sf data query` from PowerShell (from Git Bash it fails on the spaces in the folder path).

## 3. Log in

`sf org open --target-org <alias> --url-only` prints a single-use `frontdoor.jsp` link. Open it in the browser and wait up to about 15 seconds for the redirect to finish. Generate a fresh link each time.

## 4. UI path

| Step | Where |
|---|---|
| Designer | Tab `DXTemplates`: `/lightning/n/DxCPQ__DxTemplates` (component `dxTemplateSetup`). The Document Template record page is the standard layout and has no designer. |
| New template | `/lightning/o/DxCPQ__Document_Template__c/list`, New (name and Related To Type). It then appears in the DXTemplates tab with default Header and Footer sections. |
| Add a section | Toolbar buttons "Section : Context / Related Objects / Clause / Table" at the top right of the designer. |
| Static Table | Table button, then name, rows, columns, Create Table, type in cells, Save. Toast: `Section "<name>" was Saved`. |
| End-user PDF | Add the `DXTemplates PDF Generator` component to the object's record page in Lightning App Builder (it is not placed by the package). Activate a template (`IsActive__c`), then search and generate on a record. |

## 5. Verified results (2026-10-28)

- Create template, open designer, add Table section, create a grid, type in cells, save: works.
- Generate PDF from an active Grant Proposal template on an Account: works. The `Document__c` parent plus one child chunk were created, a 9,236-byte PDF was attached, no `TransactionLog__c` rows, and the static Table rendered with borders, shading and column widths.

## 6. Automation tips (Claude in Chrome)

- Table cells are separate rich-text editors. Clicking cell coordinates does not focus them; locate the "Compose text" textbox elements and click by reference, then type.
- Allow the site `*.scratch.lightning.force.com` in the extension, otherwise actions fail with "Permission denied for this action on this domain".

## 7. Not yet tested

Preview, merge fields resolving from the record, merge/remove cells, Table-in-Table by section name, conditional sections, multi-language, Flow/Apex automation and email, Related Objects sections, Apex tests.
