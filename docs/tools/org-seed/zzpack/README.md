# zzpack: test pack for DxTemplates (not part of the managed package)

A separate, un-namespaced SFDX project (`sfdx-project.json` here) that plays the role of a **customer's** code in an org where DxTemplates
is installed (or in the namespaced dev scratch org). Nothing in this folder ships to customers.

## Why it exists
Customers extend DxTemplates with their own Apex classes and Flows. To test the real customer experience (and not just the package's own
tests) we need customer-style code next to the package.

## Contents
| Item | Purpose |
|---|---|
| `ZZPlaceholderHandler`, `ZZHeavyHandler`, `ZZHeavyHandlerBig`, `ZZChainHandler` | Handler classes (`implements DxCPQ.DXHandlerInterface`) for the "Apex class" process type and for the chained generation. They are written `global`, but that is not required: `ZZPublicHandler` (a deliberately `public` class, `public` execute) is found and used by the installed package too (verified 2026-11-10 in package 0.23.0.4, see the 3c section of `docs/testing/placeholders-and-chaining-test-log.md`). What is required is the namespace-aware lookup (`TypeLookup`). |
| `ZZPublicHandler` | Evidence that a `public` customer handler class works (see above). |
| `flows/ZZ_Placeholder_Flow` | Autolaunched Flow that returns values as JSON in `genericData`. |
| `customMetadata/DxCPQ__DXTemplates_HandlerClass.HandlerClass` | Names the handler class called after a chained PDF is saved. |
| `ZZToPdfProbe`, `ZZPdfPreview`, `lwc/zzPdfProbe`, `flexipages`, `tabs` | **Experiments** for `Blob.toPdf` and in-page PDF preview (see `docs/roadmap/product-vision-and-architecture.md` and `docs/experiments/`). Safe to delete; kept so the findings can be reproduced. |

## Deploy
```
cd docs/tools/org-seed/zzpack
sf project deploy start -o <org alias> -d force-app
```
The seed scripts that create templates for these handlers are in the parent folder (`seed_placeholders.apex`, `seed_heavy.apex`).

## The pdf.js static resource (not committed)
`lwc/zzPdfProbe` needs a static resource `ZZPdfJs` (zip with `pdf.min.js` and `pdf.worker.min.js` of `pdfjs-dist@3.11.174`, Apache-2.0).
It is a third-party binary, so it is ignored by git. Rebuild it with:
```
npm pack pdfjs-dist@3.11.174   # unpack, zip build/pdf.min.js + build/pdf.worker.min.js as staticresources/ZZPdfJs.resource
```
