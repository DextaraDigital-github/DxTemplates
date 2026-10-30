# LWC Refactoring Plan

Goal: make the front end maintainable, testable and secure without changing behaviour. Scope is the existing LWC code only. Other front-end frameworks are deliberately out of scope until the existing code has been reviewed and discussed (parked notes: [../research/parked-multi-framework-notes.md](../research/parked-multi-framework-notes.md)).

Principles:

1. **No refactor without a safety net.** Characterise current behaviour first.
2. **Small, reviewable pull requests**, one concern each, from a feature branch off `dev-active-managed`.
3. **Separate logic from UI.** Pure JavaScript modules (state, serialisation, merge-token parsing, table-grid operations) have no LWC imports, so they are unit-testable and easier to reason about.
4. **Package safety.** This is a published 2GP managed package. Do not rename or delete anything that is already part of the managed contract (global Apex, exposed component names, custom fields) without checking package upgrade rules.

## Phase 0: Tooling (no behaviour change)

- Fix the dependency conflict in `package.json` (`@lwc/eslint-plugin-lwc ^1.1.2` vs the `^2.0.0` peer of `@salesforce/eslint-config-lwc` 3.7.2) and decide ESLint 8 (committed `.eslintrc.json`) or ESLint 9 (the untracked `eslint.config.js`). Until then use `npm install --ignore-scripts --legacy-peer-deps --no-package-lock`. (`postinstall` runs `husky install`; confirm before enabling hooks.)
- Node 22+ (Salesforce CLI now requires it; the machine currently has v18.20.3).
- ESLint baseline is recorded in the assessment (963 errors). Still to run: Prettier check and Salesforce Code Analyzer.
- Fix the confirmed defects B1 to B3 first, each in its own small PR with a Jest test that fails before the fix.
- Add rules: `eqeqeq`, `no-eval`, `no-alert`, `no-console` (warn), `no-var`.
- CI job: lint, Jest, Code Analyzer on every pull request.

## Phase 1: Safety net

- Jest unit tests for the pure logic first, then component tests with `@salesforce/sfdx-lwc-jest`.
- Priority order: `conditionUtil`, table-grid operations in `templateTableDetails` (create, merge, remove, add/remove row/column), page-properties serialisation (`templateDesignerCMPUtils`), merge-token handling.
- Add Apex-to-LWC contract tests using mocked `@salesforce/apex` imports.
- Maintain a manual UI checklist from [../testing/scratch-org-ui-test-runbook.md](../testing/scratch-org-ui-test-runbook.md) for what Jest cannot cover (PDF output, rich-text editor).

## Phase 2: Quick wins (small PRs)

| PR | Change | Findings |
|---|---|---|
| 2.1 | Remove `eval` refresh; use platform refresh APIs | H1 |
| 2.2 | Replace clipboard hack with `navigator.clipboard` (one shared helper) | H4 |
| 2.3 | Delete commented-out code and debug `console.*` | M7, M8 |
| 2.4 | `var` to `let`/`const`, `==` to `===` (lint auto-fix, review diffs) | M5, M12 |
| 2.5 | Replace `alert()` with toast | M12 |
| 2.6 | Align LWC API versions | M10 |
| 2.7 | Fix naming (`transalatorLWC` and others) only if safe for the package; otherwise document | L1 |

## Phase 3: Structural refactor

1. **Shared services** (`c/` modules, no UI): `templateService` (Apex calls and error handling), `logger`, `clipboard`, `sanitizer`, `tableGrid`, `pageProperties`.
2. **Merge duplicates**: one `templateHeaderFooterType` component replacing the Header/Footer pairs (M9).
3. **Split `templateDesignerCMP`** by responsibility: section list and ordering, template toolbar (activate, clone, delete, properties), page properties, translations, watermark, preview. Parent keeps orchestration only. Target: no component over about 500 lines.
4. **Split `templateTableDetails`**: grid model (pure JS), toolbar, cell editor.
5. **Replace imperative DOM access** with `lwc:ref` and reactive state (M1, M2).
6. **Introduce a small shared store** or Lightning Message Service for cross-tree events instead of 36 bubbling `datasaved` events (M11).
7. Convert `.then` chains to `async/await` with one error-handling path (M6).

## Phase 4: Styling

- Replace inline styles with component CSS using SLDS styling hooks.
- Keep PDF CSS in `DxTemplates_VF_Style__mdt` (separate engine and constraints).
- Define a small design-token file for colours and spacing used by the designer.

## Phase 5: Hardening

- Define a sanitisation policy for all `innerHTML` and `lwc:dom="manual"` paths (H3) and test it with hostile input.
- Accessibility pass (keyboard operation and labels in the designer and table editor).
- Performance pass on the table editor (one rich-text editor per cell is expensive on large tables).

## Definition of done per PR

- Lint clean, Jest green, Code Analyzer no new High findings.
- Manual UI checklist run in a scratch org for the touched area.
- Matching document updated.

## Risks

| Risk | Mitigation |
|---|---|
| Behaviour change hidden in a refactor | Characterisation tests first; one concern per PR |
| Managed-package upgrade conflicts | Review package-contract rules before renames/removals |
| Rich-text editor behaviour is hard to test in Jest | Keep a manual checklist, consider Playwright/UTAM later (**Unverified:** tooling choice) |
| Long-running branch drift | Merge small PRs often |
