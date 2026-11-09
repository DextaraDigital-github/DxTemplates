# DxTemplates documentation map

Start here. Each entry says what the document is for, so you can find the right one quickly.

| Folder / file | What it contains | Read it when |
|---|---|---|
| `roadmap/product-vision-and-architecture.md` | Product vision, target "Document Engine" architecture, phased roadmap, measured experiments (`Blob.toPdf`, assets, charts) | You decide what to build next |
| `experiments/` | The scripts behind every measured claim of the vision document (Apex + small Node PDF readers) | You want to re-run or extend an experiment |
| `testing/placeholders-and-chaining-test-log.md` | Everything tested this season: placeholders, Flow/Apex values, chaining, lifecycle, heavy data, the 2GP package version and installed-package findings | You need what was tested, found and fixed |
| `testing/*-ui-test-log.md`, `testing/import-export-test-log.md` | Per-area UI test logs (context, clause, table, page properties, import/export) | You work on one designer area |
| `testing/browser-testing-playbook.md`, `testing/scratch-org-ui-test-runbook.md` | How to drive the browser and rebuild/seed the scratch orgs | You set up an org or repeat a UI test |
| `tools/` | Helper scripts: deploy and verify, refresh cached component code, org seeds | You deploy or seed |
| `tools/org-seed/` | Seed scripts for templates, data and test handler classes (`zzpack/` is customer-style code, see its README) | You need test data |
| `architecture/`, `assessment/` | Earlier architecture and quality reviews of the LWC/Apex code | You review existing code |
| `roadmap/review-later.md`, `roadmap/cleanup-log.md`, `roadmap/refactoring-plan.md` | Parked items, cleanup history, refactoring plan | You pick up parked work |

## Conventions
* Findings are tagged **[Verified]** (measured), **[Documented]** (from Salesforce docs) or **[Assumption]** (needs a spike).
* A test is written first, then the fix, then verified in the browser or in a real PDF when output is affected.
* Seed scripts use `DxCPQ__` names so they run both in the namespaced dev org and in an org with the package installed.
