# Spike: server-rendered PDF preview inside a React UI bundle (2026-11)

**Question:** can the canvas designer show the REAL PDF (so preview = output) without a browser-built approximation, and can a click on the
page be mapped back to content? Constraint from the owner: no remote/CDN JavaScript; a free library bundled locally with its source is fine.

## What was built
* `Preview.tsx` — a React page (route `/preview`) added to a copy of the owner's React PoC bundle (`DxDesignerSpike`, in the PoC repo
  `SF Angular React PoC/force-app/main/default/uiBundles/DxDesignerSpike`). It POSTs HTML to Apex REST, gets PDF bytes back, draws page n
  with `pdfjs-dist@4.10.38` (Apache-2.0, bundled by Vite, worker included, no CDN), and also shows the same bytes in an `<iframe>` with a
  `blob:` URL (the browser's own PDF viewer, no library). Clicking the canvas finds the nearest text item (pdf.js text layer).
* `ZZPdfRest.cls` — Apex REST `POST /services/apexrest/zzpdf` `{html}` -> `application/pdf` using `Blob.toPdf` (the React bundle cannot call
  `@AuraEnabled`; it has GraphQL and a plain `fetch`).
* `DxDesignerSpike.app-meta.xml` — the Lightning app that launches the bundle.

## Results (scratch org, 2026-11-10) [Verified]
| Question | Result |
|---|---|
| Does the bundle run and call Apex REST with the user's session (`sdk.fetch('/services/apexrest/zzpdf')`)? | **Yes** |
| Does pdf.js (local, with worker) run in the bundle? | **Yes**, no CSP or Locker problem; worker is a local 1.4 MB asset |
| Does the browser's own viewer show the PDF from a `blob:` URL (no library)? | **Yes** |
| Click on the page -> content | **Yes**: clicking the heading returned "SECTION-A heading" at distance 0 px (text positions from pdf.js). Mapping to a block needs a marker or a text-to-block lookup |
| Latency, 1 page, cold (first call) | REST 1,899 ms + pdf.js 2,946 ms |
| Latency, 1 page, warm | REST 948 ms (server `toPdf` 12 ms, so about 0.9 s is network/platform overhead) + pdf.js 671 ms |
| Latency, 400 rows = 8 pages, warm | REST 1,118 ms (server 49 ms, 79 KB) + pdf.js page 1 1,389 ms |
| Bundle size | app 753 KB (230 KB gzip) + worker 1.4 MB, built in 5 s |

## What it means
* **Exact preview is possible**: the canvas can show the real engine output. Typing needs a debounce; expect about 1.5 to 2.5 s per refresh,
  so the canvas should also have an instant approximation, with the real PDF refreshing behind it.
* The 0.9 s REST overhead is the main cost, not the PDF step. To test: a persistent connection, GraphQL for reads, batching, and rendering
  only the changed page.
* The React bundle is a **full-page app on its own domain** (`<org>--c.<...>.salesforce.app/app/c__<Bundle>`), launched from the App Launcher
  into a new tab. Record-page widgets must stay LWC.

## How to rebuild and deploy
```
cd <PoC repo>/force-app/main/default/uiBundles/DxDesignerSpike
npm ci && npm i pdfjs-dist@4.10.38 && npm run build
# UI bundles need Salesforce CLI >= 2.157 (older CLIs say "Could not infer a metadata type"); no global install needed:
npx -y @salesforce/cli@2.157.8 project deploy start -o <org> -d force-app     # deploy dist + meta + app + permission set
sf apex ... deploy ZZPdfRest.cls (docs/tools/org-seed/zzpack)
```
Assign the permission set that shows the app, open the app from the App Launcher, go to `/preview`.
