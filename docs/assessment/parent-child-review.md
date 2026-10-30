# Parent-child review of the LWC components

Sections 1 to 5 were measured against `dev-revision` at commit `306c7a6`. **Section 6 is a deeper re-assessment at commit `9e148d7`** (after the cleanup batches, Jest set-up and defect fixes) and supersedes the ordering in section 4. Both on 2026-10-29. Method: a script over `force-app/main/default/lwc` (nesting from templates, `@api` surface, `querySelector("c-x").method()` calls, `CustomEvent` dispatches and `on<event>` handlers), plus reading the flagged code. No code was changed for this review. Labels: **Verified** = seen in code; **Unverified** = inferred, needs a test.

## 1. How the components nest (Verified)

```
dxTemplateSetup (setup page)
├─ menuSetup → menuSetupRow → summaryChildHierarchy (recursive)
├─ searchCategory, modal
└─ templateDesignerCMP (designer)
   ├─ templateHeader   → templateHeaderType (+ dxLookupFieldsDisplaycmp, modal)
   ├─ templateFooter   → templateFooterType (+ dxLookupFieldsDisplaycmp, modal)
   ├─ templateContentDetails → conditioncmp → conditionRowcmp (recursive), dxLookupFieldsDisplaycmp, multiLookupComponent, modal
   ├─ templateRelatedObjects → conditioncmp, hiddenComponent, searchCategory, modal
   ├─ templateTableDetails   → conditioncmp, dxLookupFieldsDisplaycmp, modal
   └─ cloneDocumentCmp, dxShowSelectedTemplate (preview), multiLookupComponent, searchCategory, modal

dxtemplateSelectorCmp / dxSelectedRelatedObjectTemplateCmp (end-user widget)
└─ dxShowSelectedTemplate → displayRelatedObjectsData, modal ; multiLookupComponent
```

Maximum depth is 4 levels (setup → designer → section editor → condition row). The shape is reasonable: one container, five section editors that share a contract, and small leaf helpers.

## 2. What is done well (Verified)

- **Events go up, data comes down** for the main save flow: the section editors raise `datasaved`, `savesectiondata` and `deletesectiondata`, and the designer handles them.
- **Leaf components are small and focused**: `modal` (49 lines), `hiddenComponent` (30), `summaryChildHierarchy` (20), `searchCategory` (202).
- **Recursive components are correct in structure**: `conditionRowcmp` and `summaryChildHierarchy` nest themselves, with the events needed to talk to the parent.
- **Listener cleanup is mostly right**: the column-resize `mousemove`/`mouseup` listeners in `templateTableDetails` are removed on mouse-up.

## 3. Findings

| # | Finding | Evidence | Severity |
|---|---|---|---|
| PC1 | **The parent drives children imperatively, in large numbers.** `templateDesignerCMP` makes 51 `querySelector("c-…").method()` calls; `dxTemplateSetup` makes 23. The child API is command-style: `loadsectionsectionvaluesforedit`, `resetvaluesonchildcmp`, `handleActivateTemplate`, `assignDocTempId`, `handleObjectNameSelection`. | Script output; e.g. `handleActivateTemplate` is called on 5 children in sequence, each one `this.template.querySelector(...)` that throws if that child is not rendered. | Medium |
| PC2 | **The five section editors expose the same contract with inconsistent names.** Header and Footer use `loadsectionsvaluesforCreation` / `loadsectionvaluesforedit`; Content, Related Objects and Table use `loadsectionsectionvaluesforedit`. Table and Related Objects take `documenttemplaterecordid`; the others take `documenttemplaterecord`. | Script output and `templateDesignerCMP.html` | Medium |
| PC3 | **Props drilling.** Each of the five section editors receives 12 to 14 attributes from the designer; about 9 are identical across all five (`selected-object-name`, `recordidvalueprop`, `rowcount`, `sectiontype`, `recordidtoedit`, `sectionrecordid`, `documenttemplaterecord`, `pdf-links`, a show flag). `pdf-links` is passed to four of the five, not Table. | `templateDesignerCMP.html` | Medium |
| PC4 | **Large duplicated blocks between siblings.** Header and footer type components are 91% identical in JS (179 of 197 lines) and 78% in HTML. Header and footer editors share 57% of their JS lines. Content, Related Objects and Table share 45 to 48% of their lines with each other. | Line-identity measure (trimmed non-blank lines), so it overstates trivial lines such as `}`; the header/footer-type figure is the reliable one. | Medium |
| PC5 | **God components.** `templateDesignerCMP` 2,929 lines with 19 Apex imports; `templateTableDetails` 2,346 lines / 10 Apex; `templateRelatedObjects` 2,238 / 10; `templateContentDetails` 1,311 / 12; `dxTemplateSetup` 1,191 / 16. Components call Apex directly, with no service layer. | Script output | Medium |
| PC6 | **Dead event and dead code.** `multiLookupComponent` fires `selectpill`, which no parent handles. `handleRichTextAreaSave` exists in both `templateHeaderType` and `templateFooterType` but no template references it (the footer one fires a header event name, harmless because it is never called). | Grep on templates | Low |
| PC7 | **Two composed events with the same name travel up the same path.** `displayRelatedObjectsData` and `dxShowSelectedTemplate` both dispatch `showgenerate` with `bubbles` and `composed`; the end-user widget `dxtemplateSelectorCmp` listens once on its shadow root, so its handler may run twice per load. | Code in `dxShowSelectedTemplate.js:302`, `displayRelatedObjectsData.js:375`, `dxtemplateSelectorCmp.js:67`. **Unverified** that the handler is not idempotent. | Low |
| PC8 | **Composed events used widely.** 34 `bubbles`/`composed` occurrences in 9 files; 21 are in `conditionRowcmp`, where a recursive tree needs them. Composed events cross shadow boundaries and can be caught by unrelated listeners. | Grep | Low |
| PC9 | **Setup registers a `beforeunload` listener but has no `disconnectedCallback`.** It is removed inside a handler (`dxTemplateSetup.js:1181`). If the component is removed while the prompt is armed, the listener may remain. | **Unverified** | Low |
| PC10 | **Event-handler names are inconsistent** (`handlesavedsectiondata`, `handlesavedheaderdata`, `saverichtextheader`, `hanldleVisibility`). A typo (`hanldle`) is in a handler name. | `menuSetup.html:49` | Low |

## 4. Recommended improvements, in order

Each step is one commit, deployed and checked in the scratch org before the next.

1. **PC6: remove dead code.** Delete the two unused `handleRichTextAreaSave` methods and the unused `selectpill` event, after confirming with a search that nothing references them. Lowest risk.
2. **PC2: align the section-editor contract.** Give the five editors the same public method names, keeping the old names as thin aliases until the designer is switched over. Adds no new behaviour.
3. **PC1: replace the per-child calls with one loop.** Keep a single list of the section editors and call a shared method on whichever is rendered, with a null check, in place of five hard-coded `querySelector` lines. Fixes the throw-if-not-rendered risk in `handleActivateTemplate`.
4. **PC4: extract the shared header/footer-type code.** A shared module or base class for the 91% identical pair first, then the header/footer editors.
5. **PC3: pass one context object** (object name, template record, PDF links, section ids) instead of nine attributes. Changes five templates at once, so it needs the full designer test pass first.
6. **PC5: move Apex calls into service modules** (like `dxApexCache`) grouped by concern, so each component imports a few functions instead of 10 to 19 Apex methods. Do this alongside the Jest work in the refactoring plan.
7. **PC7 and PC9: verify, then fix if real.** Count the `showgenerate` handler runs; add a `disconnectedCallback` to remove the `beforeunload` listener.

## 5. Not covered

- Test coverage is still zero (no Jest), so none of these refactors can be proven safe by unit tests yet. The checks so far are ESLint, deploy, the PDF text baselines and manual scratch-org paths.
- The end-user widget (`dxtemplateSelectorCmp` and children) was reviewed for structure only, not exercised.
- Apex was not reviewed.

## 6. Re-assessment (commit `9e148d7`)

Method: a script over `force-app/main/default/lwc` comparing what the designer passes to each section editor with what the editor declares and reads; method-name overlap between sibling editors; Apex imports shared across components; DOM-reach patterns; event payloads; and each component's `isExposed` metadata. Overlap figures compare method **names** (not bodies), so they show where duplication is likely, not how many lines it covers. **Verified** = measured or seen in code; **Unverified** = inferred.

### 6.1 What changed since the first review

| Item | Status |
|---|---|
| PC1 imperative child calls | Partly: the five-call activation block is now one null-safe helper. The other ~45 calls remain. |
| PC2 inconsistent editor method names | Deliberately skipped (exposed `@api` surface in a released package). |
| PC6 dead code | Two dead header/footer methods removed; the `selectpill` event kept (exposed component). |
| Lookups re-fetched on every refresh | Fixed (`dxApexCache`, `loadLookups` / `refreshSections`), covered by designer tests. |
| Duplicate class members (B4) | All 7 fixed. |
| Tests | 24 Jest tests in 7 suites; the designer is covered, the five editors and the end-user widget are not. |

### 6.2 Findings

| # | Finding | Evidence | Severity |
|---|---|---|---|
| R1 | **Several shared attributes are dead.** The designer passes 9 to 11 attributes to each editor. `recordidvalueprop` and `recordidtoedit` are never read by any of the five editors; `wherecondition` is passed to `templateContentDetails` but not declared there. In total, 6 attribute-editor pairs are passed but not declared and 5 are declared but never read. | **Verified.** Script section 1, e.g. `templateTableDetails` declares `recordidvalueprop` and `recordidtoedit` with 0 reads; `templateHeader` and `templateFooter` do not declare either. | Medium |
| R2 | **Redundant value passed twice.** `templateTableDetails` and `templateRelatedObjects` get both `documenttemplaterecord` and `documenttemplaterecordid`, which is `doctemplatedetails.Id` from the same object. | **Verified.** `templateDesignerCMP.html` lines 88 and 97 | Low |
| R3 | **The live shared state is small.** Once the dead attributes are set aside, an editor reads about six things: `selectedObjectName`, `sectionrecordid`, `rowcount`, `sectiontype`, the template record, and (four editors, not Table) `pdfLinks`, plus its own show flag. | **Verified.** Script section 1 | Info |
| R4 | **Section-rules logic is repeated in the three large editors.** 18 method names appear in all three (`handleRuleWrapperMaking`, `createRuleConditionObjects`, `handleRuleUpdates`, `getExistingConditions`, `removeDeletedConditions`, `handleFilterRuleReset`, `handleFiltering`, ...), and all three import the same four rule Apex methods (`getSObjectListFiltering`, `createRuleCondition`, `getExistingConditions`, `handleTemplateRuleResetCondition`). Another 24 names are shared by exactly two editors (mostly font, colour and background handlers in Content and Table). | **Verified** for names and imports (script sections 2 and 4). Lines covered not measured. | High (maintainability) |
| R5 | **Persistence and image-picker Apex is imported piecemeal.** `saveDocumentTemplateSectionDetails` and `gettemplatesectiondata` are imported by all five editors; `getContentVersions` by five and `getSearchedContentVersions` by four components; `createLog` by seven. In total 62 Apex methods across 15 classes, 11 of them imported by more than one component. | **Verified.** Script section 4 | Medium |
| R6 | **Header and footer are near-copies and are internal.** `templateHeaderType` and `templateFooterType` share 13 of their 14 and 13 method names; `templateHeader` and `templateFooter` share 9 of 16 and 11. `templateHeader`, `templateHeaderType` and `templateFooterType` are **not exposed**, so their interface is private to the package. | **Verified.** Script section 3 and the metadata check | Medium (low risk to fix) |
| R7 | **Exposure is inconsistent.** `templateFooter` is exposed with Experience Cloud and Record Action targets; its twin `templateHeader` is not. The four section editors that only make sense inside the designer are exposed (Footer, Content, Table, Related). | **Verified** for the metadata. Whether any customer relies on the section editors being exposed is **Unverified**. | Medium |
| R8 | **Event contracts are uneven.** `datasaved` carries a boolean ("is saved") and is fired from many places (7 in `templateHeader` and `templateFooter`, up to 6 elsewhere). `savesectiondata` carries the saved record; `deletesectiondata` carries the section id. The designer has three save handlers; the header and footer ones only store an id. | **Verified** for the dispatch sites (script section 6). That the `savesectiondata` payload is the full saved record is inferred from the designer handler (**Unverified**). | Low |
| R9 | **Render-timing hacks.** `setTimeout` appears 12 times in `templateRelatedObjects`, 10 in `templateTableDetails`, 6 in the designer and 3 in `templateContentDetails`, suggesting there is no "ready" contract between parent and child. | **Verified** for the counts (script section 7). The purpose of each timeout was not reviewed. | Medium |
| R10 | **Large components, heavy DOM work.** Designer 2,924 lines, 19 Apex imports, 91 `querySelector` calls; table 2,344 lines, 82 `querySelector`, 31 `.closest()`; related 2,236 lines, 12 timeouts. | **Verified.** Script section 7 | Medium |

### 6.3 Risks that shape any refactor

- **Public surface.** The designer, setup and four section editors are `isExposed`. Changing an `@api` name or removing one is a compatibility question for a released managed package. Whether the package version creation step blocks removing `@api` members or deleting components is **Unverified**; check it with a dry run before any large change.
- **No component tests for the editors.** The designer is covered with the editors stubbed, so changes inside an editor are not caught. Rule building (visibility rules) affects PDF output, so those paths need tests before they are moved.
- **PDF regression baseline** (`docs/testing/baseline/`) covers rendered output for 9 templates, but not the designer, so it will not catch designer-only regressions.

### 6.4 Recommended order (supersedes section 4)

Ordered by risk and payoff. Each step is its own commit with tests, a deploy and a UI check.

1. **Stop passing dead attributes** (R1): remove `recordidvalueprop`, `recordidtoedit` and `wherecondition` from the designer template. The editors never read them, so behaviour is unchanged; no `@api` is removed. Smallest possible step.
2. **Write component tests for the three large editors** (Content, Table, Related): mount, save, delete, activation, and the rule-building paths. This is the safety net for everything below.
3. **Merge the header and footer type components** (R6): the three internal components are the lowest-risk dedupe (shared module first, then one component with a mode if it stays simple).
4. **Service modules for Apex** (R5): `sectionService` (save, load, delete), `imageService` (content versions), a logging helper. Thin wrappers, same calls; makes mocking trivial.
5. **Extract the section-rules controller** (R4): one module used by the three editors; the biggest duplicate-code reduction, and the most behaviour-sensitive, so it follows steps 2 and 4.
6. **Single context object** instead of individual attributes (R3), after steps 1 and 5, because by then the live set is small and known.
7. **Audit the `setTimeout` calls** (R9) one by one; replace with a ready event where a real dependency exists.

### 6.5 Not covered by this assessment

- Lines of code actually duplicated (only names were compared).
- The end-user widget (`dxtemplateSelectorCmp` and its children) beyond structure.
- Apex, and the PDF generation classes.
