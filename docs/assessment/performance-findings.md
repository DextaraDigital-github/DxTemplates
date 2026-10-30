# Performance findings (first load of the designer)

Status: **hypotheses from reading code, not yet measured.** Browser measurement (network timings per Apex call, time to first render) is still to do. Do not treat the causes below as confirmed.

## Observed (scratch org, 2026-10-28/29)

| Observation | Value |
|---|---|
| DXTemplates tab, cold load until the template list appears | about 40 s with another extension active; about 20 to 25 s after it was stopped |
| Account/Opportunity record page, until the PDF Generator widget renders | 30 s or more; once over 2 minutes without finishing |
| Selecting a template in the PDF Generator | 10 to 20 s before the Generate button appears |

The scratch org is small (9 templates, 60 sections), so these times are not caused by data volume. Standard Lightning page load in a scratch org is itself slow, so part of the time is the platform.

## Code that could contribute (from reading the code)

| # | Finding | Where | Why it may matter |
|---|---|---|---|
| P1 | Five Apex calls plus one wire on every load of the setup component | `dxTemplateSetup.connectedCallback`: `getSFDomainBaseURL`, `getRelatedToTypeOptionValues`, `getDocumentTemplatesMethod`, `getClassNames`, `getFlowNames`, plus `@wire getAllPopupMessages` | They run in parallel, but all are needed before the user can do anything. |
| P2 | `getClassNames` queries `ApexTypeImplementor`; `getFlowNames` queries `FlowDefinitionView` | `SaveDocumentTemplate.cls` lines 276 and 292 | Both are setup-metadata queries that are slower in orgs with many classes and flows. They only feed the Apex-class and Flow pickers, which a user needs only when editing template properties. Candidate: load on demand and cache. |
| P3 | The designer calls its own `connectedCallback()` manually in 7 places (and `dxTemplateSetup` once) | `templateDesignerCMP.js` | Each call re-runs all initialisation (domain URL, user languages, PDF links, class and flow names...), repeating Apex calls and resetting state. Lifecycle methods should not be called by hand; extract an `init()` or refresh only what changed. |
| P4 | `getSFDomainBaseURL` (`PdfDisplay.getDomainUrl`) is fetched by several components on every load | imported in 4 components (`dxTemplateSetup`, `templateDesignerCMP`, `templateContentDetails`, `generatePDF`); Apex method is `@AuraEnabled(cacheable=false)` | The value does not change within a session. Make it cacheable (`cacheable=true`) or fetch once in a shared module. |
| P5 | The first template is auto-selected and fully loaded right after the list arrives | `getDocumentTemplatesMethod` then `handleTemplateSelection` | Loading the designer and sections for a template the user did not choose adds a second sequential round trip. |
| P6 | One rich-text editor per Table cell | `templateTableDetails` | Large tables mean many editor instances. Not measured. |
| P7 | The end-user widget fetches the record's fields and builds the preview before the Generate button appears | `dxtemplateSelectorCmp` / `dxShowSelectedTemplate` (`getTemplateSections` queries every field of the record and creates a `Document__c` on selection) | Likely behind the 10 to 20 s wait. Selecting a template also writes a `Document__c` even if no PDF is generated. Not measured. |

## How to measure (next)

1. Load the DXTemplates tab with network capture on; list every `/aura` or `apex` call with its start, duration and order.
2. Time to first template list, time to designer content, and the number of Apex calls.
3. Repeat in the record page and for template selection in the PDF Generator.
4. Compare against a blank Lightning page in the same org to separate platform time from app time.
5. Then change one item at a time (P2 and P4 first; they are small and low risk) and re-measure.
