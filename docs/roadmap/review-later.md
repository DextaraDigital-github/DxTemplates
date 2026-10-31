# To review later

Items the owner asked to keep on a list and look at later. Add new ones at the top; move an item to "Closed" with the date and the reason when it is settled.

## Open

### RL-4: Which translations apply when the record has no language? (raised 2026-10-31, discuss at the end)

- **Code:** `MergeFieldsClass.mergefieldsMethod` / `resolveLocale`. When the record has no language value the code ALWAYS uses the `en_US` translations (a leftover `if (locale != null) locale = 'en_US'` overrides the user's own language). The translation dialog opens in the user's own language, so a French user's translations are entered but never applied to the PDF unless the record has a language.
- **Question for the owner:** should the language of the user generating the PDF apply instead of `en_US`? (Behaviour change for customers who rely on `en_US` today.)
- Details: `docs/testing/translations-ui-test-log.md`, U-T1.

### RL-3: The language field named by the translation setting does not exist (raised 2026-10-31, discuss at the end)

- **Code:** custom metadata `Document_Translation.Account_Language_Field` names `DxCPQ__Document_Language__c` on Account. That field is not in the package source or in this org, so `LanguageTranslatorClass.getLanguageSelected` fails its query (caught) on every merge and returns null.
- **Question for the owner:** ship the field with the package, or document that customers create it, or remove the default metadata record?
- Details: `docs/testing/translations-ui-test-log.md`, U-T2.

### RL-2: Do customers see stale component code after a package upgrade? (raised 2026-10-31)

- **Why it matters:** RL-1 showed that this org's browsers keep component code for a year under an address (`_uid=LATEST&_cl=<ccv>`) that did NOT change through eight deploys. In a customer org the `ccv` presumably changes when the package is upgraded, but that is not verified. If it did not, users would keep running the old component until their browser cache is cleared.
- **How to check:** install version N of the package in a second org, open a page that uses a component (note the `ccv` value in the page source and a visible marker), upgrade to version N+1 with a visible change, reload plainly, and see whether the change shows and whether `ccv` changed.
- **Not done:** it needs a package version and a target org.

### Smaller unexplained points from the RL-1 investigation

- Why `ccv` never changed in this org after a deploy (the platform's rule is not documented; a web search found nothing).
- Why a plain reload showed new code in two early cases (the browser probably had no cached entry then, for example after eviction or a refresh from another tab).
- One hard reload out of four did not fetch the new code (the explanation in the playbook is a hypothesis).

## Other lists that wait for the UI discussion

The "Observations for the UI discussion" tables in `docs/testing/table-ui-test-log.md`, `context-ui-test-log.md`, `related-objects-ui-test-log.md` and `clause-ui-test-log.md` hold design questions (not defects) that are waiting for the owner.

## Closed

### RL-1: Browser serves the old component after a deploy (raised and closed 2026-10-31)

- **Root cause:** the browser's HTTP cache. Component code is requested at an address that does not change with the code and is answered with `Cache-Control: private, max-age=31536000, immutable`; the browser never rechecks it. The server serves new code about 5 seconds after a deploy. The Session Setting for persistent browser caching is not involved (it was already off).
- **Fix:** a deterministic recipe and tool. `docs/tools/refresh-cached-component-code.js` refreshes the cached code, then one plain reload runs the new code (tested with a control under the same conditions that showed the old code). `docs/tools/deploy-and-verify.ps1` first proves that the org holds the code. Steps and measurements: `docs/testing/browser-testing-playbook.md`.
- **Not a product defect:** it concerns how fresh code shows up in a browser, not what is deployed. RL-2 holds the one product-side question.
