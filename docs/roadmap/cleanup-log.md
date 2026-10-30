# Cleanup log (branch `dev-revision`)

One entry per batch. Each batch lists what changed, how it was verified, and what that verification does not cover.

## Batch 1: remove unused imports (2026-10-28)

**Change.** 16 unused import specifiers removed in 12 LWC files (9 insertions, 16 deletions). Only import lines were touched; line endings preserved.

| File | Removed |
|---|---|
| `displayRelatedObjectsData`, `dxtemplateSelectorCmp`, `menuSetup`, `menuSetupRow`, `summaryChildHierarchy`, `templateRelatedObjects` | `wire` (from `lwc`) |
| `templateHeader` | `track` (from `lwc`), `createLog` |
| `dxShowSelectedTemplate` | `loadScript`, `getTemplateSectionsMulRecords` |
| `templateRelatedObjects` | `loadScript` |
| `templateTableDetails` | `RefreshEvent` (the whole import), `createLog` |
| `templateFooter` | `createLog` |
| `imageResizeCMP` | `deleteContentVersions` |
| `templateContentDetails` | `updateContentVersions` |

**Method.** ESLint (`no-unused-vars`) listed the candidates. A script removed only lines or specifiers that ESLint flagged and that it could prove were imports; it aborts on anything unexpected. The first run aborted on a sole-specifier import (`RefreshEvent`), so the LWC folder was reverted and re-run from a clean state after the script was fixed.

**Verification.**

- ESLint total 963 to 947. Only `no-unused-vars` changed (132 to 116); no new errors.
- Dry-run deploy of all 28 LWC bundles: succeeded, 0 errors. Real deploy to `dxtemplates-scratch-30d`: 28 of 28, 0 errors.
- Regression: Grant Proposal PDF regenerated through the UI on the Datamatics Account after the deploy. Text identical to baseline (9,236 bytes, 3 pages, 128 lines).

**Designer smoke test (read path), after the deploy.** Opened the DXTemplates tab, the template list loaded (all templates listed), opened Invoice Template (Header and all section names listed) and its "Invoice Product Details" Table section: the Table editor rendered with its toolbar and the Description / Rate / QTY / Amount grid. No console errors.

**Not covered.** The designer's edit path (create a template, add and save a section, conditions, translations, watermark, import/export) has not been exercised after the change. Removing an unused import cannot change behaviour, so the risk is low, but the checks so far are compile, generator output and designer read path.

**Status.** Committed locally on `dev-revision` as `c2b84d5` ("Remove unused imports from LWC components"). Not pushed.

**Observations while testing (not changed).** Cold load of the DXTemplates tab took about 40 seconds before the template list appeared. Record pages with the PDF Generator need 30 seconds or more to render the widget.

## Batch 2: remove provably unused local declarations (2026-10-28)

**Change.** 4 declaration lines removed in 2 files (commit `ab5a9a3`): `finalExpression`, `finalStatement`, `lastChildrenArr` in `conditioncmp`; `lastColIndex` in `templateTableDetails`.

**Why only 4.** ESLint lists 116 unused-variable findings after batch 1. By kind: 51 unused function parameters (mostly `event`), 30 catch/promise placeholders (`error`, `reject`, `result`), 15 locals whose initializer calls something, 11 locals with a simple initializer, 8 assigned-but-never-read, 1 callback parameter. Only declarations that (a) ESLint flags, (b) are a standalone line with a literal or plain-variable initializer, and (c) have the identifier exactly once in the file are provably no-ops. Of the 11 simple locals, 4 met all three conditions; the other 7 are used elsewhere in their file or read a property (`resultdata.record`, `event.target.id`), where removing the line would also remove a possible `TypeError`.

**Verification.** ESLint 947 to 943 (only `no-unused-vars` changed: 116 to 112). Dry-run and real deploy of all 28 LWC bundles: 0 errors. No UI regression run for this batch (declarations never read cannot change behaviour); the designer edit-path smoke test is still pending.

**Recommendation.** Stop the unused-variable work here. The remaining 112 are parameters and placeholders that are cosmetic, and several are deliberate. The effort is better spent on defects B1 to B3, `eval`, and the clipboard helper.

**Designer edit-path smoke test, after batches 1 and 2 (2026-10-29).** In the scratch org, "+ New" created template "ZZ Smoke Test" (related type Account); adding a Table section (2x2), typing text in a cell and clicking Save updated the section list to the new name. A query confirmed the section row exists (`Smoke Table`, type `Table`, sequence 2). Not covered: the page froze during the reload that was meant to confirm the grid text visually, so cell content persistence was not checked in the UI, and conditions, translations, watermark and import/export were not exercised. The watermark dialog opened by itself after the template was created (not investigated; cancelled).

**Cause of the earlier "freezes" (2026-10-29).** The designer registers a "Leave site?" (unsaved changes) prompt. A reload or navigation with that prompt open blocks the browser extension, which looked like a frozen tab. Navigating with the force option discards it. A separate "chrome-extension:// URL of different extension" error still blocks screenshots, so another extension is active.

## Batch 3: cache read-only Apex calls (performance, 2026-10-29)

**Change.** New service module `dxApexCache` memoizes five read-only Apex calls for the page session: `getDomainUrl`, `getClassNames`, `getFlowNames`, `getPDFLinks`, `getAllUserLanguages`. A failed call is not cached. Object results are copied per caller. `templateDesignerCMP`, `dxTemplateSetup`, `generatePDF` and `templateContentDetails` import from it; only import lines changed, call sites are unchanged. No Apex change.

**Why.** `getClassNames` (queries `ApexTypeImplementor`) and `getFlowNames` (queries `FlowDefinitionView`) ran in `dxTemplateSetup` and again in every `templateDesignerCMP.connectedCallback()`. The designer re-runs that callback in 7 places and on each template selection, so the two slowest setup-metadata queries repeated many times per session, along with the domain URL, languages and PDF links.

**Verification.** ESLint 943 (no change). Dry-run and real deploy of 29 LWC bundles: 0 errors. After a reload: template list, sections and the saved Table cell text ("SmokeHeaderA") render; no console errors (tracking began after page load, so load-time errors may be missed).

**Not measured.** There is no before-measurement of Apex call counts or timings, so the gain is not quantified. After the change, initial load of the DXTemplates tab made about 12 `ApexAction.execute` requests. The next step is a counted before/after on repeated template selection.

## Batch 4: stop calling `connectedCallback()` by hand in the designer (2026-10-29)

**Change.** `templateDesignerCMP.connectedCallback()` is split into `loadLookups()` (domain URL, languages, PDF links, Apex class and Flow names; cached by `dxApexCache`) and `refreshSections()` (everything else, unchanged logic including the `isconnectedcalledonLoad` / `isconnectedcalledondeletion` modes). `connectedCallback()` calls both. The 7 manual `this.connectedCallback()` calls (`handleConnectedCallback`, four new-section branches, `handlesavedsectiondata`, `handledeletesectiondata`) now call `refreshSections()`, so a refresh no longer re-runs the lookups. One `console.log` of an always-undefined value was dropped.

**Verification.** ESLint 943 (no change); dry-run and deploy of 29 bundles: 0 errors. UI, in the scratch org after the deploy: (1) added a Context section: it appeared in the list and its editor opened; (2) named it, typed body text with a merge field and saved: the list showed "Smoke Context"; (3) deleted it: the list returned to Header / Smoke Table / Footer and a query confirmed the row was gone. No console errors (tracking began after page load).

**Template switch (checked afterwards).** Clicking Newsletter from the template list loaded its 9 sections and content, Opportunity type and Deactivate state; no console errors.

**Not covered.** Clause, Related Objects and Header/Footer new-section paths, conditions, translations, watermark and import/export were not exercised. No timing comparison.

## Batch 5: dead code and a null-safe activation helper (2026-10-29)

**Change.** (1) Removed `handleRichTextAreaSave` from `templateHeaderType` and `templateFooterType`: plain (not `@api`) methods that no template or script references. (2) `templateDesignerCMP`: the same five `querySelector(...).handleActivateTemplate(...)` lines appeared in `handleActiveTemplate` and `disableEditingHandler`; both now call `applyActivationToSectionEditors(isActive)`, which skips an editor that is not rendered (`?.`) in the same call order. All five editors are always rendered by the designer template (the show flags only control visibility), so in normal use the behaviour is identical; the difference is that one missing child no longer aborts the caller before the activation Apex call.

**Deliberately not done.** The `selectpill` event in `multiLookupComponent` has no listener anywhere, but the component is `isExposed` in a released managed package (22 of 29 components are), so it was left alone: removing it gains nothing and could affect a subscriber. For the same reason the planned method-name alignment (PC2) was skipped: renaming `@api` methods would need the old names kept as aliases forever. Whether package validation blocks removing `@api` members from exposed components was not checked.

**Verification.** ESLint 943 (no change); dry-run and deploy of 29 bundles: 0 errors. UI on the scratch org: Activate on "ZZ Smoke Test" set `IsActive` to true; Deactivate set it back to false; no console errors (tracking began after page load). Side effect: activation sets `Previously_Active__c`, which stays true, so that throwaway template is now read-only in the designer by design.

## Batch 6: Jest set up, defects B1 and B3 fixed (2026-10-29)

**Jest.** `@salesforce/sfdx-lwc-jest` 1.4.1 (Jest 27) was already in `package.json` with a `jest.config.js`; `.forceignore` already excludes `**/__tests__/**`, so tests do not deploy. Run with `npm test` (or `npx sfdx-lwc-jest`). The old runner prints "Invalid sourceApiVersion ... Expected 58.0, found 61.0" but still runs; upgrading the runner is a separate, later task. First tests (9): `dxApexCache` (5: one Apex call across callers, shared in-flight request, failures not cached, per-caller copies, key mapping) and `templateTableDetails` (4).

**Fixes, each proven by a test that fails on the original source.**
- B1: the "no data" branch in `getContentVersionData` read an undeclared `error`; now a plain `else` that logs. Test fails before (`ReferenceError: error is not defined`), passes after. The accidental `isLoaded = false` in the catch was a no-op (it is already false at mount).
- B3: the duplicate plain `disableButton` field removed, the `@api` one kept (the component is exposed in a released managed package). Test fails before (the engine reports "Found a duplicate accessor"), passes after. A third test, that `handleActivateTemplate(true)` sets `disableButton`, passes both before and after, so it is a regression guard only.
- B2 was retracted: `result` is in scope (see the assessment document).

**Verification.** ESLint 943 to 941 (the two fixes removed errors; the test file carries one targeted suppression). Dry-run and deploy: 29 of 29 bundles, 0 errors. UI not re-run for these two tiny changes.

**Not covered.** 2 of 29 components have tests. Component tests for the designer, the other section editors and the end-user widget are still to write; they need mocks for many Apex imports.

## Batch 7: designer tests (2026-10-29)

**Tests.** `templateDesignerCMP/__tests__/templateDesignerCMP.test.js`, 7 tests (suite total 16, all passing). The five section editors are replaced by recording stubs in `jest-mocks/designer/` (outside `force-app`, never deployed; kept out of `__tests__` because Jest treats every file there as a test). `c/dxApexCache` and the designer's Apex imports are mocked; `lightning/actions` is virtual-mocked because the old runner lacks it. Covered: sections load once with the right id; each lookup is called once on connect; saving a section refreshes from memory (no server call, no new lookups); deleting reloads from the server but not the lookups; switching templates (`handleConnectedCallback`) reloads the new template; activation calls the five editors in order with `(true, 'Account')` then calls `activateTemplate`; no activation while `isSaved` is false.

**Check that the tests are meaningful.** Run against the designer from commit `512324c` (before the `connectedCallback` split), the three "lookups once" tests fail and the rest pass; against the current code all pass.

**New finding (B4, partly confirmed).** The engine logs "Invalid observed borderOptions field. Found a duplicate accessor" for the designer: `borderOptions` is a getter (Top/Right/Bottom/Left, line 2664) and also a field (Left Border/Right Border/Top Border/Bottom Border, line 2776). The footer "Separate Borders" checkboxes use it, so the labels users see depend on which definition wins in production. **Not changed**: it must be settled by looking at the UI first. The other duplicate fields listed under B4 were not yet checked.

**Not covered.** The designer's other 130+ methods (translations, watermark, page properties, import/export, clone, delete).

## Batch 8: the `eval` page refresh, investigated and centralised (2026-10-29)

**What it is for (verified in the scratch org).** `eval("$A.get('e.force:refreshView').fire();")` appears twice: the designer's **Refresh** button and the setup page's **Done** button (shown after the JSON import wizard creates templates). In the browser, clicking Refresh does not reload the page (a `window` marker survived) but Lightning re-initialises the whole DxTemplates app: 8 Apex requests (template list, lookups, ...) and the table editor re-runs its load. It is a "re-fetch everything and re-create the components" button.

**Why it is `eval`.** Replacing it with a direct call fails to deploy: `LWC1503: Do not use $A in LWC code`. The `eval` hides `$A` from the compiler; it is the only way an LWC reaches Aura's refresh event. `lightning/refresh` (`RefreshEvent`) is not a drop-in replacement: it only notifies handlers a component has registered and does not re-create components, so switching to it would change behaviour (a design decision, not a cleanup).

**Change.** Both call sites now use one helper, `dxPageRefresh.refreshPage()`, with the same 100 ms delay and the same `eval`, documented in place. A Jest test checks the event fires once, after the delay.

**Verification.** Jest: 18 tests pass (the helper adds 2). ESLint 941 to 937. Deploy: 30 of 30 bundles. UI: the Refresh button after the change produced the same 8 Apex requests and the same console output as before, and the page was not reloaded. **Not covered:** the **Done** button path was not clicked (it needs a JSON import, and export only offers a file download, which I did not do without permission); it calls the same helper.

**Side observation (not changed).** During a Refresh the table editor logs "error in Table new Page: Cannot set properties of null (setting 'checked')" twice. This is existing behaviour (seen before the change) and looks like a latent bug in `templateTableDetails`.

## Batch 9: clipboard helper, investigated, NOT changed (2026-10-29)

**Where it is.** `document.execCommand('copy')` through a temporary `<textarea>` appears in four places: `getMergeFieldCopy` in `templateContentDetails`, `templateHeaderType` and `templateFooterType` (three near-identical methods, behind the merge-field dialog's **CopyToClipboard** button; the footer one also shows a browser `alert`), and `copyJsonData` in `dxTemplateSetup` (export JSON). The setup one has a commented-out `navigator.clipboard.writeText(...)` line above it, so the modern API was tried before.

**Baseline (verified in the scratch org).** In a freshly created template, Add Merge Field, select Account Name, click CopyToClipboard: the dialog closed and pasting into the section name field gave `{!Account.Name}`. So the current approach works.

**Experiment: inconclusive.** I tried to test `navigator.clipboard.writeText` in `templateContentDetails` with a temporary variant. After a page reload, the click on CopyToClipboard produced only a masked "Script error. null" (reported through a browser extension's error hook), the dialog stayed open, and nothing was logged, **even when I instrumented the original `execCommand` code**; the method was never reached. So the variant did not get a chance to run and the experiment says nothing about `navigator.clipboard`. The reload-versus-fresh-template difference was not isolated. All experiment code was reverted and the org redeployed from the committed source.

**Open observation: retracted.** I re-tested cleanly (committed code, page reloaded, new Context section, Add Merge Field, Account Name, CopyToClipboard): the dialog closed and pasting gave `{!Account.Name}`. The earlier failure only occurred with my experiment deploys and was not reproducible, so it is not a product defect. (Why the experiment builds failed was not determined.)

## Batch 10: shared clipboard helper (2026-10-29)

**Change.** `dxClipboard.copyText(text)` replaces four copies of the temporary-textarea + `execCommand('copy')` code: `getMergeFieldCopy` in `templateContentDetails`, `templateHeaderType` and `templateFooterType`, and `copyJsonData` in `dxTemplateSetup`. It uses the off-screen textarea style the setup page already had; the merge-field versions appended a visible, id-tagged textarea to `body`. The footer's `alert(' Copy success ')` was left as is.

**Verification.** Jest: 21 tests pass (the helper adds 3: it selects and copies the right text, removes the textarea, reports a failed copy). ESLint 937 to 930. Deploy: 31 of 31 bundles. UI: in a Context section, Add Merge Field, select Account Type, CopyToClipboard: the dialog closed and pasting gave `{!Account.Type}`. **Not clicked:** the header and footer merge-field copy (the footer shows a browser `alert`, which blocks the extension) and the export JSON copy; all three call the same helper.

## Batch 11: B4 duplicate field declarations (2026-10-29)

**Finding.** ESLint `no-dupe-class-members` listed 7 duplicates: `showimages`, `imagesfound`, `ruleCondition` (`templateContentDetails`), `conditionsArr`, `listOfExistingConditions` (`templateRelatedObjects`), `draggedColumnIndex` (`templateTableDetails`), `borderOptions` (`templateDesignerCMP`).

**Change (6 of 7).** One declaration of each plain duplicate removed (6 deleted lines). `showimages`, `imagesfound`, `conditionsArr` and `listOfExistingConditions` had identical initial values, so the removal is a strict no-op. `ruleCondition` (`= false` vs undefined) is only read by `if:true={ruleCondition}`, where both are falsy. `draggedColumnIndex` (undefined vs `null`) is only read after being set in a drop handler; the later `= null` was kept.

**Verification.** ESLint 930 to 921; duplicates 7 to 1. Jest 23 pass. The two new registration tests (`templateContentDetails`, `templateRelatedObjects`) **pass before and after**, because the engine does not report plain-versus-plain duplicates; they are load smoke tests, not proof of the fix (the proof is the ESLint rule). Deploy: 31 of 31. UI (Newsletter): the "CEO's Message" Context section and the "Contents" Table section both load and render; no console errors.

**`borderOptions` (the seventh), resolved in the same batch.** It was a getter ("Top/Right/Bottom/Left") and a field ("Left Border/Right Border/Top Border/Bottom Border"). Checked first: its only use in the designer template is inside an HTML comment (`<!-- <lightning-checkbox-group label="Separate Borders" options={borderOptions} ...> -->`), and no other JS or template references it, so neither definition is ever rendered; in the UI, the Footer Properties tab of Page Properties has no "Separate Borders" group. The duplicate field was removed and the getter kept. A new designer test ("registers its decorators without engine errors") **fails before** (the engine's "Found a duplicate accessor" error) and passes after. ESLint 921 to 920; `no-dupe-class-members` is now 0. Jest 24 pass. Deploy 31 of 31. UI: the designer loads and Page Properties opens.

**Side observation (not changed).** Opening Page Properties for a template with no saved page properties (my fresh test template) logs a caught `JSON.parse` error ("Unexpected end of JSON input") from `handlePageProperties`, then shows defaults. It is existing behaviour.

## Batch 12: stop passing dead attributes to the section editors (2026-10-29)

**Check.** `recordidvalueprop`, `recordidtoedit` and `wherecondition` were passed by the designer to the section editors, but: `recordIDValueprop` does not exist in `templateDesignerCMP.js` (always `undefined`); `recordidtoedit` is a real designer value that no editor reads (3 declare it, 2 do not); `wherecondition` can never bind because `templateContentDetails` declares `@api whereCondition` (camel case) and the attribute would need to be `where-condition`, and its value was `''` anyway (the designer never assigns `whereCondition`). Every use was checked with a search over `js` and `html`.

**Change.** 11 attribute occurrences removed from `templateDesignerCMP.html` (5, 5 and 1). No `@api` declaration was removed, so no public surface changed.

**Verification.** Jest 25 pass (a new designer smoke test, which passes before and after the change, so it is not proof); ESLint unchanged at 920; deploy 31 of 31. **UI check: done (2026-10-29, foreground tab, after a forced reload on the deployed code).** On the Newsletter template each editor opened its own section and showed its saved content: Header (2 columns, two rich-text areas), Table "Contents" (toolbar and grid controls), Context "CEO's Message" and "Upcoming Events" (their text), and Footer ("Display page number sequence", column count). The selected-section highlight followed each click. Console: no errors. **Not covered:** the Related Objects editor (no sample template has a Related Objects section), and saving after the change. An earlier attempt failed only because the browser window was not rendering (see the playbook, section 2).

## Batch 13: component tests for `templateContentDetails` (2026-10-29)

**Tests (13, replacing the single smoke test).** Mount with details shown or hidden; the visibility-rule Apex call only when an object is selected; loading a saved section fills the name and rich text; **save** sends the right record to Apex (Id, Name, Type, sequence from `rowcount`, template id, content) and then raises a success toast, `savesectiondata` with the saved record and `datasaved: true`; an empty name calls no Apex and raises the error toast; **delete** of a saved section calls `deletetemplate` with the section and template ids and then raises `deletesectiondata`; an unsaved (`...NotSaved`) section is removed with no Apex call; a delete Apex did not confirm raises no event; activation disables Save and Delete (and re-enables on deactivation); reset clears the editor and reports "saved".

**Test-set-up facts.** `getContentVersions` is a `@wire` here, so it is left to the runner's wire stub (every other Apex method is a virtual `jest.fn()`). The runner's `ShowToastEvent` stub discards the title and message, so the test mocks `lightning/platformShowToastEvent` with a class that keeps them in `detail`. The component assumes `sectionrecordid` is always a string (the designer passes `<Type>NotSaved` for a new section), so the tests do the same.

**Check that the tests catch regressions.** Mutating the source (saved sequence forced to 0; template id dropped from the delete call) made exactly the save test and the delete test fail; the source was restored from git.

**Not covered.** Visibility-rule building (`handleCreateRules`, `handleRuleUpdates`, `getExistingConditions`), clause selection, the image picker and image resizing, section CSS, translation, and the merge-field dialog. `templateTableDetails` and `templateRelatedObjects` still only have smoke tests (Table has four).

## Batch 14: component tests for `templateRelatedObjects`, defect B7 fixed (2026-10-29)

**Tests (9).** Mount with details shown or hidden; `handleObjectNameSelection` asks Apex for the related objects of the object; a failing Apex call is survived; delete of a saved section calls `deletetemplate` with the section id and the template id and then raises `deletesectiondata`; an unsaved section is removed with no Apex call; activation disables and deactivation re-enables Save and Delete; `assignDocTempId` supplies the template id used by delete; saving an incomplete form shows the error toast, calls no Apex and raises no uncaught error.

**B7 (new defect, found by the tests).** `handlesectionsave` ended with `this.template.querySelector('c-template-designer-cmp').showPreview = true`. That element is not in this component's template (the designer's tag is `c-template-designer-c-m-p`, and it is the parent), so every save, including a validation failure, ended in `TypeError: Cannot set properties of null (setting 'showPreview')`. `templateHeader.js` already has the same line commented out. The designer shows its own Preview button when it receives `savesectiondata`, so the line was redundant; it was removed. The test "shows an error and saves nothing when the section is incomplete, without throwing" **fails before the fix** (with exactly that message) and passes after.

**Verification.** Jest 45 pass in 7 suites; ESLint unchanged at 920; deploy 31 of 31. UI (foreground tab, reloaded after the deploy): adding a Related Objects section opens its editor, and Save on the empty form shows the error toast "Please Enter Name, Select Object & Fields before Saving". **Unresolved:** the browser console still logged one masked `Script error. null` (reported through a browser extension's error hook) for each Save click, so I cannot say the click is now free of uncaught errors in the browser. It could be the same cause in every editor (for example the error toast) or something else; a Context-section Save was going to be the comparison, but the browser froze before it ran. Not seen in Jest.

**Not covered.** A successful save of a loaded section: six attempts to drive it failed because the field list is built by load-time timers after field Apex calls and the validation still saw it as empty; the cause was not found. Also uncovered: the visibility and filter rule paths, grouping, subtotals and charts, styling, and the field pickers.

## Batch 15: component tests for `templateTableDetails`, defect B8 fixed (2026-10-29)

**Tests (16 in the file, 12 new).** Create-table inputs and button, creating a table of the requested size (3 rows x 4 columns gives 3 body rows and 4 header cells), refusing 0 rows, more than 20 rows or more than 10 columns with the error toast, refusing to save before a table exists, reporting unsaved changes on a name edit, saving a new table (Apex gets name, type, template id, table HTML with `<table`, and the settings JSON; then the success toast, `savesectiondata` and `datasaved: true`), delete of a saved section through Apex and of an unsaved one without it, activation disabling Create Table and Update, and loading a saved section showing its table and name.

**B8 (new defect, found by the tests, fixed).** `handletablecreate` did `this.rowcount = this.rownumber`. `rowcount` is the `@api` value the designer passes for the section's position (0-based: Header -1, first body section 0, ...), and the save stores it as `DxCPQ__Sequence__c`. So creating a table, or loading a saved one (the load path calls `handletablecreate` too), and saving stored the table's row count as its position (a string, `"3"`). The PDF is built with `ORDER BY Sequence__c ASC` (four queries in `DisplayPDFController`) and the server stores whatever sequence the client sends for ordinary sections (it only normalises Header and Footer), so a Table section could end up in the wrong place in generated PDFs. Evidence in real data: my earlier UI-created "Smoke Table" was stored with sequence 2 (its row count) when its position was 0.
**Fix:** the loop in `handletablecreate` now reads `this.rownumber` directly and no longer assigns `this.rowcount`.
**Tests:** "saves the section at its own position, not at the number of table rows" (expected 2, got `"3"`) and "keeps the position of a loaded section when it is saved again" (expected 4, got 2) both **failed before the fix** and pass after.

**Verification.** Jest 57 pass in 7 suites; ESLint 920 to 919; deploy 31 of 31. **UI, against the database:** on the editable test template, a new Context section saved at sequence 0, a new 4-row Table saved at **1** (the old code would store 4); after a reload, opening the table and clicking Update (confirmed saved by last-modified time) left it at 1; further saves in the same session also kept 1.

**Existing data.** Table sections saved before this fix may carry a sequence equal to their row count. Not repaired here. Dragging sections in the designer re-saves all sequences and would correct them.

**More UI testing of the Table editor** is in `docs/testing/table-ui-test-log.md` (results, defect candidates D1 to D3, and UI observations).

## Next candidates

1. Unused local variables and parameters (116 left): needs per-case review, since some assignments have side effects.
2. Dead (commented-out) code: about 339 lines.
3. `eval` refresh and the clipboard helper (designer and setup; need a designer smoke test first).
4. Confirmed defects B1 to B3 (each with a test that fails before the fix).
