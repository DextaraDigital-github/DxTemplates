# LWC / JS / CSS Code Quality Assessment

Scope: `force-app/main/default/lwc` and the global CSS static resources. Branch `dev-active-managed`, commit `b99ae1f`, measured 2026-10-29.

Method: static measurement with `grep`/`wc`, an ESLint run with the repo's own rules (section 0), and reading selected files. **Not done:** Salesforce Code Analyzer (PMD/security rules), accessibility audit, runtime profiling, cross-browser testing, review of every line. `grep` counts are text matches, so a small number may be false positives (for example inside comments).

## 0. ESLint baseline (repo's own ruleset)

Command: `ESLINT_USE_FLAT_CONFIG=false npx eslint "force-app/main/default/lwc/**/*.js"` with `force-app/main/default/lwc/.eslintrc.json` (`@salesforce/eslint-config-lwc/recommended`), ESLint 8.57.1, Node 18.20.3.

**963 errors, 0 warnings, 29 files.**

| Rule | Count | Meaning |
|---|---|---|
| `eqeqeq` | 346 | Loose equality |
| `no-unused-vars` | 132 | Dead variables and imports |
| `vars-on-top` | 100 | `var` declarations scattered |
| `@lwc/lwc/no-api-reassignments` | 51 | A component reassigns its own `@api` property (not allowed in LWC) |
| `dot-notation` | 44 | Style |
| `@lwc/lwc/no-async-operation` | 39 | `setTimeout` etc. |
| `radix` | 24 | `parseInt` without radix |
| `@lwc/lwc/no-inner-html` | 24 | Unsafe `innerHTML` writes |
| `no-new-object` / `no-shadow` / `no-use-before-define` / `no-useless-concat` | 22 / 21 / 18 / 18 | Style and clarity |
| `no-redeclare` | 14 | Same variable declared twice in a scope |
| `@lwc/lwc/no-document-query` | 9 | Document-level DOM queries (the clipboard hack) |
| `no-dupe-class-members` | 8 | Same field or method declared twice |
| `no-undef` | 6 | Use of a variable that does not exist |

Files with the most errors: `templateRelatedObjects` 187, `templateDesignerCMP` 144, `templateTableDetails` 115, `templateContentDetails` 76, `displayRelatedObjectsData` 60, `dxTemplateSetup` 50, `dxShowSelectedTemplate` 45, `conditionUtil` 35.

### Confirmed defects (read in code, not only lint)

| # | Where | Defect | Effect |
|---|---|---|---|
| B1 | `templateTableDetails.js:424` | `else if (error)` inside a `.then` where `error` is not defined (it exists only in the later `.catch`). | `ReferenceError` whenever `getContentVersions()` returns no data; the image-list load aborts. **Confirmed by Jest and fixed** in the batch 6 commit (the dead branch is now a plain `else`); the test fails before the fix and passes after. |
| B2 | `templateTableDetails.js:1430-1434` | **Retracted (2026-10-29).** I reported `result` as undefined here. It is defined: the `.then(result => {` opened at line 1260 encloses these lines. No defect. (The code does assign `showBool` twice, so the second assignment wins; that may be intended and was not changed.) | None. |
| B3 | `templateTableDetails.js:163,171` | `disableButton` declared twice, first with `@api`, then as a plain field. | **Confirmed by Jest:** the LWC engine logs "Invalid observed disableButton field. Found a duplicate accessor" at class registration. **Fixed** (plain duplicate removed, `@api` kept) in the batch 6 commit; a registration test fails before the fix and passes after. |
| B4 | `templateContentDetails.js:29,50` and others | Fields declared twice (`showimages`, `imagesfound`, `ruleCondition`, `conditionsArr`, `listOfExistingConditions`, `draggedColumnIndex`, `borderOptions`). | Harmless today if both default the same, but state resets are easy to introduce. |
| B5 | `templateRelatedObjects.js:2033` | `this.visibilityConditionsArr = this.visibilityConditionsArr;` | A no-op that suggests a missing reset. |
| B6 | `PdfDisplay.cls:46` (Apex, called from `dxtemplateSelectorCmp`) | `getObjectDetails` runs `SELECT Name FROM <object>`. Objects without a `Name` field (for example Case) throw `No such column 'Name' on entity 'Case'`. | **Observed 2026-10-28** on a Case record page: the error is logged in `TransactionLog__c` and the record name comes back null (the PDF still generated). Affects the default document name on every object without a Name field, which contradicts the "any object" claim. Fix: look up the object's name field through describe (`nameField`) with a safe fallback. |

Also, `package.json` cannot be installed as written: `@lwc/eslint-plugin-lwc ^1.1.2` conflicts with the peer requirement (`^2.0.0`) of the current `@salesforce/eslint-config-lwc` 3.7.2. `npm install` fails without `--legacy-peer-deps`. The untracked `eslint.config.js` needs ESLint 9.22+, while `package.json` pins ESLint `^8.11.0`.

## 1. Size and shape

| Metric | Value |
|---|---|
| Components | 28 |
| JS / HTML / CSS lines | 15,838 / 4,335 / 198 |
| Jest tests | 0 |
| Five largest components | `templateDesignerCMP` 3,442 JS + 1,377 HTML; `templateTableDetails` 2,348 + 655; `templateRelatedObjects` 2,237 + 309; `templateContentDetails` 1,311 + 342; `dxTemplateSetup` 1,192 + 281 |

The five largest components hold about 10,500 of 15,838 JS lines (66%).

`templateDesignerCMP` has about 144 methods, 32 imports and 22 Apex imports in one class. It is a "god component": it owns template state, section CRUD, translations, watermark, page properties, import of images, and navigation.

## 2. Findings

### High

| # | Finding | Evidence | Why it matters |
|---|---|---|---|
| H1 | `eval("$A.get('e.force:refreshView').fire();")` in two components | `templateDesignerCMP.js:1174`, `dxTemplateSetup.js:982` | `eval` and Aura globals inside LWC are blocked or flagged under Lightning Web Security and AppExchange security scanning. Replace with `NavigationMixin`, `refreshApex`, or `notifyRecordUpdateAvailable`. |
| H2 | Zero automated front-end tests | no `__tests__` folders | Any refactor of 15,000 lines is blind. This blocks every other improvement. |
| H3 | Large `innerHTML` and `lwc:dom="manual"` surface | `innerHTML` in 4 files (`dxShowSelectedTemplate` 11, `templateTableDetails` 12); 13 `lwc:dom`/`lwc:inner-html` uses | Template content is user-authored HTML. Each write path needs a sanitising policy, because it is also an XSS and PDF-injection vector. **Unverified:** whether current content is sanitised before insertion. |
| H4 | Direct `document.getElementById` / `document.body.appendChild` | `templateContentDetails.js:579`, `templateHeaderType.js:116`, `templateFooterType.js:114`, `dxTemplateSetup.js:974,1041` | The same "copy to clipboard" hack (a temporary element with id `input_test_id`) is copied three times. It breaks under shadow DOM encapsulation and LWS. Use `navigator.clipboard.writeText`. |

### Medium

| # | Finding | Evidence | Recommendation |
|---|---|---|---|
| M1 | Imperative DOM querying everywhere | 331 `querySelector` calls (designer 100, table 82, related objects 38) | Use template refs (`lwc:ref`), reactive state, and `data-` attributes. Manual DOM mutation is the main source of fragility. |
| M2 | Timing hacks | 44 `setTimeout` calls (designer has at least 8) | These hide ordering bugs. Replace with lifecycle hooks (`renderedCallback` once-guards) and promise chains. |
| M3 | `@track` overused | 212 uses | Since Spring '20 all fields are reactive and `@track` is needed only for in-place mutation of nested objects/arrays. Remove where not needed, and replace in-place mutation with immutable updates. |
| M4 | Deep clone through JSON | 28 `JSON.parse(JSON.stringify(...))` | Slow, drops `undefined`/`Date`. Use `structuredClone` where available or targeted copies. |
| M5 | Loose equality | about 480 `==` / `!=` vs about 255 `===` / `!==` | Latent coercion bugs. Enforce `eqeqeq` in ESLint. |
| M6 | Promise chains, no `async/await` | 145 `.then(`, 0 `async`/`await` | Harder error handling. About 100 catch-like blocks that only log. |
| M7 | Debug logging left in | 283 `console.*` calls | Noise in production and a minor data-exposure risk. Replace with a `logger` service that calls `LogHandler` for real errors only. |
| M8 | Dead code | about 339 commented-out code lines | Remove (git has history). |
| M9 | Duplicated components | `templateHeaderType` (220 lines) vs `templateFooterType` (212 lines): about 50 differing lines; `templateHeader`/`templateFooter` likewise | Merge into one parameterised component. |
| M10 | Mixed API versions | LWC meta files range from 48.0 to 61.0 | Behaviour differs by version. Align all to one supported version (target 66.0+ for template expressions). |
| M11 | No shared state or messaging | 36 `datasaved` events, no LMS or store | Deep event bubbling makes data flow hard to trace. Introduce a small shared service/store module. |
| M12 | `var` and `alert` | 143 `var`, 6 `alert(` | Use `let`/`const` and `ShowToastEvent` or a modal. |

### Low

| # | Finding | Evidence |
|---|---|---|
| L1 | Inconsistent naming | `transalatorLWC` (typo), mixed `Cmp`/`cmp`/`CMP` suffixes (8 components), `currectUserLang` |
| L2 | Section-by-author comments | e.g. "variables added by Bhavya" in code; use git blame instead |
| L3 | 22 of 28 components are `isExposed` | Many are internal children and should not be exposed in App Builder |

## 3. CSS and styling

| Finding | Evidence |
|---|---|
| Almost no component-scoped CSS | 198 CSS lines across all LWC |
| Global styling lives in static resources | `dexcpqstyles.css` 558 lines, `rte_tbl1.css` 182, `dexcpqcartstyles.css` 119, `dxQuoteTemplate.css` 125 |
| No SLDS styling hooks / design tokens | 0 uses of `var(--...)` in LWC CSS |
| Inline styles in templates | 40 in the designer, 30 in table details, 26 in setup, 24 in related objects |
| Hard-coded colours | `#000000` 37, `#FFFFFF` 17, `#333333` 9, others |
| `!important` | 12 in CSS |

Consequences: no theming or dark mode, inconsistent spacing, and style changes require editing static resources and redeploying. Target state: SLDS styling hooks and component CSS, with static resources reserved for the PDF output styling (which is a different problem, see below).

**Important distinction.** The PDF is rendered by Visualforce `getContentAsPDF()`, which uses a limited CSS engine. UI styling and PDF styling must be treated as two separate concerns. `DxTemplates_VF_Style__mdt` holds the PDF CSS and should stay.

## 4. Observed behaviour worth recording

From UI testing on 2026-10-28 in a scratch org:

- Table section: requesting 3 rows rendered 4 (likely a header row, unconfirmed).
- Table cells are individual rich-text editors; clicking the cell border does not focus them. This is a usability and testability issue.
- The DXTemplates tab body stays blank for several seconds on first load with no loading indicator.
- Generating a PDF from the Grant Proposal template on an Account worked end to end; the static Table rendered with borders, shading and column widths.

## 5. Suggested priority

1. H2: add Jest, ESLint and Prettier to CI (no behaviour change).
2. H1, H4: remove `eval` and the clipboard hack (small, high value for security review).
3. M7, M8, M12: delete dead code and debug logs.
4. M9: merge the Header/Footer duplicates.
5. M1, M2, M3, M11: restructure the five large components behind tests (see the refactoring plan).
6. CSS: introduce SLDS styling hooks, then remove inline styles.
