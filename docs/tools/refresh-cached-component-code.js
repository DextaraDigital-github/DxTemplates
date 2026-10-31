// Refreshes the browser's cached copy of the code of DxCPQ components after a deploy.
//
// Why: Lightning requests the code of a component at an address that does not change when the code does
// (".../auraCmpDef?...&_def=markup://DxCPQ:<name>&_cl=<number>&_uid=LATEST") and the server answers with
// "Cache-Control: private, max-age=31536000, immutable". The browser therefore keeps the old copy for a year and does not
// recheck it, not even on a normal reload. The server itself serves new code about 5 seconds after a deploy.
// Fetching those addresses with `cache: 'reload'` replaces the cached copies; the next plain reload then runs the new code.
// Details and measurements: docs/roadmap/review-later.md (RL-1, closed) and docs/testing/browser-testing-playbook.md.
//
// Use: run this in the Lightning page you are testing (browser console, or the javascript tool of the browser automation)
// AFTER `sf project deploy`, then reload the page normally. Pass the top-level components the page loads in `names`:
//   DxTemplates tab (designer and all section editors): 'dxTemplateSetup'
//   Generate PDF page:                                  'dxShowSelectedTemplate'   (check the network log for the exact name)
// It builds the addresses from the page's own requests, so no parameter is hard-coded. With the browser automation
// tool, paste the body with top-level `await` instead of the async wrapper so that the result is returned.
// Measured effect (2026-10-31): deploy a change, reload plainly: old code; run this, reload plainly: new code.
(async (names) => {
    const sample = performance.getEntriesByType('resource')
        .find(e => /\/auraCmpDef\?/.test(e.name) && /[?&]_cl=\d+/.test(e.name) && /&_def=/.test(e.name));
    if (!sample) {
        return 'No component request found in this page: wait until it has finished loading, then run again.';
    }
    const query = sample.name.split('?')[1];
    const cl = query.match(/[?&]_cl=(\d+)/)[1];
    const head = query.split('&_def=')[0]; // everything before the component name
    const encodedHead = head.replace('aura.app=markup://one:one', 'aura.app=markup%3A%2F%2Fone%3Aone');
    const statuses = [];
    for (const name of names) {
        // The page uses these two spellings of the same address; both are cached separately.
        const addresses = [
            `${location.origin}/auraCmpDef?${head}&_def=markup://DxCPQ:${name}&_cl=${cl}&_uid=LATEST`,
            `${location.origin}/auraCmpDef?${encodedHead}&_def=markup%3A%2F%2FDxCPQ%3A${name}&_uid=LATEST&_cl=${cl}`
        ];
        for (const address of addresses) {
            const response = await fetch(address, { cache: 'reload' });
            await response.arrayBuffer();
            statuses.push(response.status);
        }
    }
    return `Refreshed ${statuses.length} cached entries (HTTP ${[...new Set(statuses)].join(', ')}). Reload the page now.`;
})(['dxTemplateSetup']).then(message => { console.log(message); return message; });
