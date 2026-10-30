# Parked: Multi-Framework (React / Angular) Notes

**Status: parked, not a proposal.** Decision (2026-10-29): review and refactor the existing LWC code first, then discuss. These notes only record facts gathered on 2026-10-29 so the research is not lost. They contain no recommendation.

## What was found

| Topic | Finding | Source / status |
|---|---|---|
| Availability | Salesforce Multi-Framework lets apps built with React or Angular run on the platform as a `UIBundle` metadata type. React GA July 2026, Angular GA October 2026 (Winter '27, API 68.0). | Salesforce developer blogs (Jul and Oct 2026). **Verified** by reading the Winter '27 developer guide. |
| 2GP packaging | Winter '27 states apps can be distributed with 2GP: unlocked packages (editable) or managed packages "to distribute locked, namespaced internal apps through AppExchange". | Winter '27 developer guide. **Verified.** |
| Packageable component | "UI Bundle" appears in the list of components available in second-generation managed packages. | Official 2GP packaging guide. **Verified** (entry only; the page gave no limits). |
| Scope of managed support | A search summary of a Salesforce blog said managed packaging applies to non-site apps only. | **Unverified** (secondary summary). |
| Embedding in Lightning pages | `lightning-ui-embedding` (Beta) hosts the app in a sandboxed iframe from the `*.salesforce.app` domain, for internal apps. | Winter '27 guide. **Verified.** |
| Embedding limits | The embedding guide (Beta) says: explicit full URL only; dynamic URL resolution and packaging not available; cannot drag a UI Bundle onto a page in App Builder; Trusted URL and CSP configured manually; Experience Cloud needs extra settings including turning off "Require first-party use of Salesforce cookies". It says React only. | Official page. **Verified**, but it appears to disagree with the Winter '27 blog (Angular, packaging). Which is current is **unknown**. |
| LWC alternatives | Winter '27 makes complex template expressions (API 66.0+) and `lwc:external` third-party web components (requires LWS) generally available. TypeScript for LWC is labelled Developer Preview in the docs and TypeScript cannot be deployed to the platform directly. | Winter '27 guide and LWC docs. Mixed status; check live docs. |

## Open questions (for a later discussion)

1. Does a managed package containing a UI Bundle pass AppExchange security review, and are there extra requirements?
2. Are there org prerequisites (Hyperforce, My Domain, Edge Network settings) that subscribers must meet?
3. Can a packaged UI Bundle be embedded in a record page or tab without per-org manual CSP steps?
4. Upgrade and ancestry behaviour for UI Bundles in managed packages.
5. Experience Cloud and community support for managed apps.

Answering these requires Salesforce partner support or a small spike in a test package. Nothing has been built or tested.

## Sources

- Salesforce Developers Blog, "The Salesforce Developer's Guide to the Winter '27 Release", Oct 2026: https://developer.salesforce.com/blogs/2026/10/developers-guide-to-the-winter-27-release
- "Components Available in Second-Generation Managed Packages": https://developer.salesforce.com/docs/platform/pkg2-dev/guide/packaging-packageable-components.html
- "Embed an Internally Hosted App as a UI Bundle (Beta)": https://developer.salesforce.com/docs/platform/microfrontend/guide/internal-ui-bundles.html
- Build with React on Salesforce: Multi-Framework Is Now GA: https://developer.salesforce.com/blogs/2026/07/build-with-react-on-salesforce-multi-framework-is-now-ga
- What's New in Salesforce Multi-Framework: Angular Is Now GA: https://developer.salesforce.com/blogs/2026/10/whats-new-in-salesforce-multi-framework-angular-is-now-ga (not read directly; the fetch was blocked)
