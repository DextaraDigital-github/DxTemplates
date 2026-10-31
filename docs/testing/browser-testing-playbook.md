# Browser testing playbook (Claude in Chrome + scratch org)

Written 2026-10-29 from a long working session. Read this first, then use [scratch-org-ui-test-runbook.md](scratch-org-ui-test-runbook.md) only if the org has to be rebuilt. Everything here was observed in this project; items marked **(unverified)** are guesses.

## 0. Fast path for a new session (about 5 minutes to first click)

1. `sf org list` and confirm `dxtemplates-scratch-30d` is `Connected` (expires 2026-11-27). If it is gone, rebuild with the runbook (always `--duration-days 30`).
2. Load every browser tool in **one** `ToolSearch` call: `select:mcp__claude-in-chrome__tabs_context_mcp,navigate,computer,find,read_page,get_page_text,tabs_create_mcp,tabs_close_mcp,read_console_messages,read_network_requests,javascript_tool,browser_batch` (prefix each with `mcp__claude-in-chrome__`).
3. `tabs_context_mcp` with `createIfEmpty: true`, then `tabs_create_mcp` for **your own** tab. Do not reuse tabs from an earlier session; the ids and the tab group change (see 2).
4. Get a login link: `sf org open --target-org dxtemplates-scratch-30d --url-only` (PowerShell). Navigate your tab to it, adding `&retURL=%2Flightning%2Fn%2FDxCPQ__DxTemplates` to land on the designer. The link is single-use; generate a new one each time. Sessions expire, and an expired tab shows the Login page.
   Re-login worked in about 25 s with this recipe (2026-10-29): `tabs_context_mcp`, then `navigate` the group's **selected** tab (the one in front) to the link with `force: true`, wait 10 s three times, and `tabs_context_mcp` again; the tab title changes to "Lightning Experience | Salesforce". A "Permission denied for this action on this domain" error while the tab is on `*.my.salesforce.com` (the redirect hop) is transient; wait and check the tab list instead of retrying the action. The new session also revives the other open Lightning tabs; stale tabs that still show "Login | Salesforce" can be ignored.
5. Wait for the page (section 3), then work.

Deploy, test and lint in one go with `docs/tools/verify-lwc.ps1` (section 8).

## 1. What to expect (measured, scratch org, one Lightning tab)

| Step | Typical time |
|---|---|
| Cold load of the DXTemplates tab until the toolbar exists (`find` succeeds) | 40 to 60 s |
| Same, with 4 or more Lightning tabs open | 100 s or more; `get_page_text` and `find` fail with "Page still loading ... document_idle" |
| Click a template in the list until sections show | 4 to 8 s |
| Click "Section : Context" until the editor shows | about 4 s |
| Open a dialog (Add Merge Field, Page Properties, Export) | 2 to 4 s |
| Designer **Refresh** button until the app has re-initialised | about 8 s (8 Apex calls) |
| `sf project deploy start` of the whole `lwc` folder | 15 to 30 s |
| `npx sfdx-lwc-jest` (all suites) | 15 to 25 s |
| ESLint over `lwc` | about 20 s |

Close extra Lightning tabs before testing. Five open tabs made every call slow or time out.

## 2. Tabs and the extension

- Tab ids change, and the tab group can be replaced between turns or when the user touches the browser. Symptoms: "Tab ... is not in Claude's tab group" or "Couldn't determine which page this action targets". Fix: `tabs_context_mcp` again and use a fresh id. Never reuse an id from earlier.
- The **same** browser tabs can come back with new ids on the next `tabs_context_mcp` (in one turn 945, 942 and 1143 reappeared as 1146, 1149 and 1155). An id from the previous call may be dead; re-read the context before every burst of actions.
- Tabs pile up (every session leaves a Lightning tab), and with five open `find` fails with "Chrome blocked the extension ... still navigating". Ask the user to close old Salesforce tabs, or close the ones you created, before testing.
- **A tab that is not in front does not render.** In a background tab, screenshots time out (`Page.captureScreenshot timed out after 30000ms`) and `left_click` by ref reports success but nothing happens (the page text did not change after three clicks). Even the selected tab of the group behaved the same when the Chrome window was not in front. A page loads in about 20 s in the foreground and 60 s or more in the background. Tell the user to bring the Chrome window with the Salesforce tab to the front (and leave it alone) before UI work; `get_page_text` and `find` still work in the background, so they show whether a click really changed anything.
- `javascript_tool` output can come back as `[BLOCKED: Cookie/query string data]` for some scripts, so do not rely on it for driving the page. It worked for setting and reading a `window` marker.
- Make your own tab (`tabs_create_mcp`) and close it at the end. Do not close tabs you did not create without asking.
- If the user says they need the browser, **stop browser use and do not deploy** (a deploy changes what they see). Resume when told.
- Another extension (React DevTools, `installHook.js`) is active. Effects: console shows masked `Script error. null` entries that come from its hook, and screenshots sometimes fail with "Cannot access a chrome-extension:// URL of different extension". Both are noise; retry or use `get_page_text`.

## 3. Waiting for a page

There is no reliable "loaded" event. Use this loop:

1. `navigate` (use `force: true`, section 5).
2. `computer wait` 10 s, up to 4 times.
3. `find` for a known element (for example the "Section : Context" button, or a template link). Success means the app is ready.
4. If `find` says "still loading" or "blocked ... still navigating", wait 20 s more. After three such failures, stop and tell the user (close tabs, check Chrome is awake).

`browser_batch` is useful for sequences of clicks, types and screenshots. Keep a batch **short**: one with `navigate` plus four 10 s waits plus a screenshot timed out ("did not respond in time"). Batches of a few clicks and one or two short waits work. Coordinates in a batch refer to the screenshot taken before the call, and refs from `find` cannot be created inside the same batch.

## 4. Seeing and reading the page

| Need | Tool | Notes |
|---|---|---|
| Visual state | `computer screenshot` with `scale: 0.5` or `0.6` | 0.5 is enough for layout; use `zoom` with a region to read small text such as a pasted value |
| Text state (lists, sections, toasts) | `get_page_text` | Cheap and works when screenshots fail; lists template names and section names |
| Find a control | `find` with a plain description | Returns a ref such as `ref_245`; click with `ref` instead of coordinates |
| Console | `read_console_messages` with `pattern` (for example `EXPERIMENT\|rror`) and `clear: true` to start fresh | Tracking starts at the first call, so call it **before** the action; `onlyErrors: true` for a quick health check |
| Network | `read_network_requests` with `urlPattern: aura` | Starts at the first call; call it with `clear: true` before the action. Apex calls appear as `aura.ApexAction.execute=N`; the method name is not shown |
| Did the page reload? | `javascript_tool`: set `window.__marker='x'` before, read it after | If the marker survives, the browser did not reload (this proved the Refresh button re-initialises the app without a browser reload) |
| Clipboard contents | Click a text field and press `ctrl+v`, then `zoom` | Use a **different** value each time so a stale clipboard cannot pass |

## 5. Pitfalls (each cost time this session)

1. **The designer registers a "Leave site?" prompt.** `navigate` is blocked and the tab looks frozen. Use `force: true` on `navigate` (it discards the unsaved state). This was the cause of the "frozen tab" problem in early sessions.
2. **Browser `alert()` / `confirm()` block the extension.** The footer merge-field copy shows an alert; avoid clicking it. Grep for `alert(`, `confirm(` first.
3. **Do not type before the dialog has opened.** Typing into a not-yet-rendered dialog goes nowhere and leaves the field empty. Click, wait 2 to 4 s, screenshot, then type.
4. **Dialog layout shifts after a selection.** In the merge-field dialog, selecting a field adds a label or a second list and moves the buttons. Take a screenshot after selecting, then click the button.
5. **Coordinates are not portable.** A new tab had a 1568x698 viewport; earlier tabs were 1280x495. Prefer `find` + `ref`. The coordinates below are for 1280x495 unless marked.
6. **Table cells are separate rich-text editors.** Clicking cell coordinates does not focus them; `find` the "Compose text" textbox and click by ref.
7. **Creating a template opens the Watermark Settings dialog.** Cancel it (Cancel at about (952, 448) in 1280x495). The template is already created.
8. **After a deploy, reload the page** (force). Do not trust a page opened before the deploy.
9. **Activation is one-way for editing.** Activating a template sets `Previously_Active__c`; the template stays read-only in the designer. Use a throwaway template for activation tests.
10. **Downloads need the user's permission** (Export "Download" saves a file). Do not click it.
11. **Do not delete data yourself.** Leave throwaway templates (`ZZ ...`) for the user to delete, or ask.
12. **Experiment deploys can mislead.** Two instrumented builds produced a masked "Script error" and a dialog that did not close, while the committed code worked on a clean retest. Always compare with a clean baseline (section 7).

## 6. Recipes (copy these)

### 6.1 Create a throwaway template (about 40 s plus load)
`find` "+ New template button" (aria label "Creates a New Document Template") → click. Wait 3 s, screenshot. Name field about (419, 105): click, type. "Related To Type" dropdown about (844, 105): click, then "Account" about (698, 195). Save about (1021, 391). Wait 8 s. A Watermark dialog appears: Cancel about (952, 448). The new template is first in the list with Header and Footer.

### 6.2 Add a section and open its editor
`find` "Section : Context toolbar button" (also "Section : Table", "Section : Related Objects", "Section : Clause") → click by ref. Wait 4 s. In a Table, `find` "Compose text" for cell refs.
Open an existing section: `find` the section name in the "Template Sections" list, click by ref.

### 6.3 Merge field copy and paste check
Context section → `find` "Add Merge Field button" → click → wait 4 s → click a field in the list (Account Name about (257, 222), Account Type about (254, 244) in 1280x495) → wait 2 s → click CopyToClipboard about (991, 368) → the dialog should close → click the Name field about (355, 193) → `ctrl+v` → zoom on the field. Expect `{!Account.<Field>}`.

### 6.4 What does the Refresh button do?
`read_network_requests` (clear) and `read_console_messages` (clear); set `window.__marker`; click Refresh; wait 8 s; read both. Expect 8 `ApexAction.execute` requests, the marker still present, and the table editor logging "Cannot set properties of null (setting 'checked')" twice (existing behaviour).

### 6.5 Activate and deactivate
`find` "Activate button" → click → wait 6 s → verify with `sf data query` on `DxCPQ__Document_Template__c` (`DxCPQ__IsActive__c`, `DxCPQ__Previously_Active__c`). The button's label becomes Deactivate; click again to reverse. Needs `isSaved` true, which is normal after load.

### 6.6 Page Properties
`find` "Configure Page properties gear icon button" → click → wait 4 s. Tabs: Page, Header, Footer Properties (Footer tab about (463, 323) in a 1568x698 viewport). Cancel about (1065, 458) there. Opening it on a template with no saved properties logs a caught `JSON.parse` error; that is existing behaviour.

### 6.8 Check every section editor (worked in about 3 minutes once the window was in front)
1. Use the group's **selected** tab (`selectedTabId` from `tabs_context_mcp`), `navigate` with `force: true`, then two 10 s waits; it was ready in about 20 s. A screenshot in the same `browser_batch` confirms it renders.
2. The template list is long and the viewport short (1280x495), so a ref click on a low item lands on the **To Do List** utility bar and opens its panel (close it with the `_` at about (390, 33)). Instead click the list's search box (about (95, 160)), type the template name, then click the single result (about (70, 235)).
3. Newsletter has all the editor types: Header (about (1053, 273) in 1280x495), Table "Contents" (about (1053, 317)), Context "CEO's Message" (about (1075, 360)), Context "Upcoming Events" (about (1085, 405)). For Footer, `find` "Footer item", `scroll_to` it, click by ref, then scroll the page back up (15 ticks) to see its editor.
4. Screenshot after each click (`scale: 0.6`), then `read_console_messages` with `onlyErrors: true`.
5. Programmatic `scroll_to` plus a click can leave the section-list highlight on the wrong item for a moment; clicking an item normally restores it, so do not treat that as a defect.

### 6.7 Quick health check after any change
Reload (force), wait for `find` to succeed, `get_page_text` (template list and sections present), open one Context and one Table section (Newsletter has both: "CEO's Message" and "Contents"), `read_console_messages` with `onlyErrors: true`.

## 7. How to run an experiment without fooling yourself

- **Baseline first.** Do the action with the committed code and record the result before changing anything.
- **Change one variable.** My first clipboard experiment changed the code *and* the selected field; the result was meaningless.
- **Instrument, then restore.** Use a distinctive log tag (for example `EXPERIMENT`) so leftovers are greppable, and finish with `git checkout HEAD -- <file>`, a redeploy and a grep for the tag.
- **Prove a test is meaningful.** Run the new test against the original source with `git stash push -- <files>`, `npx sfdx-lwc-jest ...`, `git stash pop` (never copy the file through PowerShell; encoding breaks it). If it also passes before the fix, say so and do not call it proof.
- **Check why a platform rule exists before removing code.** The page-refresh `eval` exists because the compiler rejects `$A` (`LWC1503`); a one-minute deploy of a direct call proved it.
- **A failed deploy changes nothing in the org.** It is a safe way to ask the compiler a question.

## 8. Commands

| Task | Command (PowerShell, repo root) |
|---|---|
| Everything (tests, lint count, deploy) | `.\docs\tools\verify-lwc.ps1` |
| Jest only | `npx sfdx-lwc-jest` (add `-- --verbose <name>` to filter) |
| ESLint count | `$env:ESLINT_USE_FLAT_CONFIG='false'; npx eslint force-app/main/default/lwc --ext .js` |
| Deploy LWC | `sf project deploy start --source-dir force-app/main/default/lwc --target-org dxtemplates-scratch-30d` |
| Query | `sf data query --target-org dxtemplates-scratch-30d --query "..."` (PowerShell, not Git Bash) |
| Parent-child analysis | `node docs/tools/parent_child2.js force-app/main/default/lwc` |

Jest facts: runner `@salesforce/sfdx-lwc-jest` 1.4.1 (Jest 27). It prints "Invalid sourceApiVersion ... Expected 58.0, found 61.0" but runs. `jest.mock` factories must be written inline (no shared helper). Files under `__tests__/` are all treated as tests, so put stub components in `jest-mocks/` at the repo root. `lightning/actions` needs `jest.mock('lightning/actions', ..., {virtual: true})`. See `jest-mocks/designer/` and `templateDesignerCMP/__tests__/` for a working pattern (stub children that record calls).

## 9. Current state of the test org (2026-10-29)

Alias `dxtemplates-scratch-30d`, user `test-theng94s5l6s@example.com`, URL `https://energy-speed-4475-dev-ed.scratch.lightning.force.com`. Sample templates plus two throwaway templates created in testing: `ZZ Smoke Test` (activated once, now read-only) and `ZZ Clip Test` (editable). Newsletter is active and has Context and Table sections. The `DXTemplates PDF Generator` component is on the Account and Opportunity record pages.

## Added 2026-10-31

- A "first click is ignored" on Save was a stale click position: the Chrome window had become taller (854 to 910 px) and the Save button was below the visible area, so the click hit the chart. Take a screenshot before clicking after any pause, and install a click logger (`lightning-button` with `label === 'Save'`, capture listener) before concluding the app drops clicks.
- `browser_batch` runs on the current tab only (omit `tabId`; items are `{"name":"computer","input":{...}}`); single calls accept `tabId`.
- A saved Related Objects section needs 5 to 15 s to open completely on a cold load; wait for the category box before acting.
- When the corporate DNS cannot resolve the scratch org host from PowerShell or curl (browser still works), read an Attachment in an anonymous Apex run: `EncodingUtil.base64Encode(body)`, print it in 12,000 character `System.debug` chunks, rebuild the file with `[Convert]::FromBase64String`, then run `readpdf.mjs`.
- A table header in the Related Objects editor shows its tick and cross buttons only after a second click on it.

## Stale component after a deploy (root cause found 2026-10-31)

**What happens:** after `sf project deploy` a plain reload keeps running the OLD component. It is not the server and not the Session Setting (that is off in this org): it is the browser's HTTP cache. Lightning loads the code of the page's top component (the DxTemplates tab: `markup://DxCPQ:dxTemplateSetup`, which includes the designer and all section editors) from `/auraCmpDef?...&_def=markup://DxCPQ:<name>&_cl=<number>&_uid=LATEST`. That address does not change when the code changes (`_cl` is the `ccv` value in the page's Aura settings and stayed the same through 8 deploys), and the server answers with `Cache-Control: private, max-age=31536000, immutable`: keep for a year, never recheck, not even on reload. The server itself serves the new code about 5 seconds after the deploy (measured).

**Evidence (marker experiment with a hidden span in the designer, EXP1 to EXP8):**
- The server served the new marker 5 seconds after the org saved it.
- The browser cache entry for the exact address held the old marker.
- Refreshing that one entry with `fetch(address, {cache: 'reload'})` made the next plain reload show the new marker; without the refresh the plain reload showed the old one (control, same conditions).
- Clearing localStorage, sessionStorage, IndexedDB and the Cache API does not touch the HTTP cache, which is why those steps never worked reliably.
- A hard reload (Ctrl+Shift+R) worked 3 times out of 4 (probably because the code is requested after the page's load event, which a hard reload may not cover); do not rely on it.

**Recipe after every deploy:**
1. `.\docs\tools\deploy-and-verify.ps1 <component>`: MATCH means the org has the code (otherwise the deploy failed).
2. In the page, run `docs/tools/refresh-cached-component-code.js` (it refreshes the cached code of `dxTemplateSetup`; pass other top-level component names for other pages).
3. Reload the page normally. The new code runs on the first reload.
4. Manually, without the snippet: open Chrome DevTools with Network > "Disable cache" ticked while testing (standard for Lightning development).

Open follow-ups are in [../roadmap/review-later.md](../roadmap/review-later.md) (RL-2).
