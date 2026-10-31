# To review later

Items the owner asked to keep on a list and look at later. Add new ones at the top; move an item to "Closed" with the date and the reason when it is settled.

## Open

### RL-1: Browser serves the old component for 2 to 3 reloads after a deploy (raised 2026-10-31)

- **What is seen:** after `sf project deploy` the page keeps running the previous version of a component for two or three reloads, even after clearing localStorage, sessionStorage, IndexedDB and the Cache API. Seen several times (Clause lookup filter, Related Objects). The org itself holds the new code every time: `docs/tools/deploy-and-verify.ps1` reports `MATCH` for every file.
- **What is ruled out:** the Session Setting "Enable secure and persistent browser caching to improve performance" is already switched off in this scratch org (confirmed by the owner, 2026-10-31), so that is not the cause here. A scratch org definition cannot set it anyway.
- **What is not known:** which cache serves the old bundle (Lightning's component cache on the server side, the browser HTTP cache, or the extension's tab). Not investigated yet.
- **Ideas to try when it is picked up:** compare the component bundle URL (`_lrmc` / version parameters) in the network log before and after a deploy; test a hard reload with the browser cache disabled in DevTools; test in a private window; check whether the first reload after the deploy fetches the old bundle from the server (response body) or from disk cache; test a different browser.
- **Meanwhile:** run `docs/tools/deploy-and-verify.ps1 <component>` to prove the deploy, then reload up to three times and confirm with a property that only the new code has (see the playbook section "Stale component after a deploy").
- **Why it matters:** it cost many minutes per cycle in the test sessions and makes a correct fix look broken.

## Other lists that wait for the UI discussion

The "Observations for the UI discussion" tables in `docs/testing/table-ui-test-log.md`, `context-ui-test-log.md`, `related-objects-ui-test-log.md` and `clause-ui-test-log.md` hold design questions (not defects) that are waiting for the owner.

## Closed

(none yet)
