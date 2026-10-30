# DxTemplates Documentation

Living documentation for DxTemplates, a Salesforce-native PDF template designer and document generator (namespace `DxCPQ`, shipped as a 2GP managed package on AppExchange).

Measured against branch `dev-active-managed`, commit `b99ae1f`, on 2026-10-29. Each document states what was measured and what was not.

| Document | Read it to... |
|---|---|
| [architecture/overview.md](architecture/overview.md) | Learn what the product does, its data model, how a PDF is produced, and how the LWC components fit together. Start here if you are new. |
| [assessment/lwc-code-quality-assessment.md](assessment/lwc-code-quality-assessment.md) | See the evidence-based findings on the LWC/JS/CSS code: metrics, risks, and what to fix first. |
| [assessment/parent-child-review.md](assessment/parent-child-review.md) | See how the components nest, what the parent-child contracts look like, and the ordered list of improvements. |
| [assessment/performance-findings.md](assessment/performance-findings.md) | See why first load is slow (hypotheses from code, measurement pending). |
| [roadmap/cleanup-log.md](roadmap/cleanup-log.md) | Follow each cleanup batch: what changed, how it was verified, what was not covered. |
| [testing/baseline/README.md](testing/baseline/README.md) | Use the PDF regression baselines (9 templates) and their limits. |
| [roadmap/refactoring-plan.md](roadmap/refactoring-plan.md) | Follow the phased plan to refactor safely (tests first, then split the large components). |
| [research/parked-multi-framework-notes.md](research/parked-multi-framework-notes.md) | Facts gathered about React/Angular on Salesforce and 2GP. **Parked:** no recommendation, to be discussed after the existing-code work. |
| [testing/browser-testing-playbook.md](testing/browser-testing-playbook.md) | **Start here for any UI test:** fast start, timings, tab handling, recipes, pitfalls, how to run an experiment, Jest commands. |
| [testing/scratch-org-ui-test-runbook.md](testing/scratch-org-ui-test-runbook.md) | Build a scratch org from nothing and seed it. |
| [tools/README.md](tools/README.md) | Saved scripts: `verify-lwc.ps1`, the parent-child analysis, the org seed Apex, and the guarded-edit templates. |

## Conventions

- Findings are labelled **Verified** (seen in code, org, or an official source) or **Unverified** (inferred or from a secondary source).
- Severity: **High** = security, data-loss, or release risk. **Medium** = stability or maintainability. **Low** = style or polish.
- Update these documents in the same pull request as the code change they describe.
