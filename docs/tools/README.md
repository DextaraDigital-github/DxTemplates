# docs/tools

Scripts kept from the 2026-10-28/29 working sessions so they do not have to be rewritten. Run Node scripts with `node <script> force-app/main/default/lwc` from the repo root unless noted. None of this is deployed.

| File | What it does |
|---|---|
| `verify-lwc.ps1` | Jest + ESLint error count + optional deploy (`-Deploy`). First thing to run after an LWC change. |
| `parent_child.js` | Component nesting, `@api` surface per component, imperative `querySelector("c-x").method()` calls, event dispatches and whether a parent handles them. |
| `parent_child2.js` | Deeper pass: attributes the designer passes versus what each editor declares and reads, method-name overlap between sibling editors, Apex methods imported by several components, DOM-reach patterns, event payloads. Reads `isExposed` metadata separately (see the playbook). |
| `classify_unused2.js`, `lint_detail.js` | Group ESLint `no-unused-vars` findings by kind; list findings by rule. Take an ESLint JSON file (`eslint ... -f json -o file`) as input. |
| `guarded-edits/*.js` | The one-off edit scripts used for the cleanup batches. Each checks the exact text of every line it changes and aborts on a mismatch. Use them as templates for new mechanical edits; do not re-run them. |
| `org-seed/load_sample_templates.apex` | Anonymous Apex that mirrors `PostInstallDataCreation` (a source deploy does not run it): creates the sample templates and sections from the `TemplatesAndSectionData` static resource. |
| `org-seed/seed_merge_test.apex`, `org-seed/activate_rest.apex` | Create the "Merge Field Test" template with Opportunity and Case content, and activate the sample templates. Run with `sf apex run --file <file> --target-org <alias>`. |

Rules of thumb learned while using them:

- Edit by exact line match with a guard, not by regex over the whole file, and print a diff afterwards.
- To prove a new test is meaningful, run it against the original source with `git stash push -- <file>` and `git stash pop` (do not copy files through PowerShell; encoding breaks them).
- After a mechanical edit, check the line endings did not change (`git diff --stat` should show only the intended lines).
