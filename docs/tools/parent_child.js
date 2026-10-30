const fs = require('fs');
const path = require('path');
const root = process.argv[2];
const kebab = n => n.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const comps = fs.readdirSync(root).filter(d => fs.existsSync(path.join(root, d, d + '.js')));
const info = {};
for (const c of comps) {
    const js = fs.readFileSync(path.join(root, c, c + '.js'), 'utf8');
    const htmlP = path.join(root, c, c + '.html');
    const html = fs.existsSync(htmlP) ? fs.readFileSync(htmlP, 'utf8') : '';
    info[c] = { js, html };
}
const tags = {};
for (const c of comps) tags['c-' + kebab(c)] = c;

// 1. nesting
console.log('## NESTING (parent -> children used in template)');
const children = {};
for (const c of comps) {
    const used = new Set();
    for (const t of Object.keys(tags)) if (new RegExp('<' + t + '[\\s>/]').test(info[c].html)) used.add(tags[t]);
    children[c] = [...used];
    if (used.size) console.log(c + ' -> ' + [...used].join(', '));
}

// 2. @api surface per component
console.log('\n## @api MEMBERS PER COMPONENT (properties / methods) and events dispatched');
const rows = [];
for (const c of comps) {
    const js = info[c].js;
    const apiProps = (js.match(/@api\s+(?!get|set)[A-Za-z_$][\w$]*\s*(=|;|\n)/g) || []).length;
    const apiMethods = (js.match(/@api\s+(async\s+)?[A-Za-z_$][\w$]*\s*\(/g) || []).length;
    const events = [...new Set([...js.matchAll(/new CustomEvent\(\s*['"`]([^'"`]+)['"`]/g)].map(m => m[1]))];
    const lines = js.split(/\r?\n/).length;
    rows.push({ c, lines, apiProps, apiMethods, events });
}
rows.sort((a, b) => b.apiMethods - a.apiMethods);
rows.forEach(r => console.log(`${r.c.padEnd(34)} lines=${String(r.lines).padStart(5)} @apiProps=${String(r.apiProps).padStart(2)} @apiMethods=${String(r.apiMethods).padStart(2)} events=[${r.events.join(', ')}]`));

// 3. parent -> child imperative calls via querySelector('c-xxx').method(
console.log('\n## IMPERATIVE PARENT->CHILD CALLS: querySelector("c-child").method(...)');
for (const c of comps) {
    const js = info[c].js;
    const calls = {};
    for (const m of js.matchAll(/querySelector\(\s*['"`]\s*(c-[a-z0-9-]+)\s*['"`]\s*\)\s*\.\s*([A-Za-z_$][\w$]*)\s*\(/g)) {
        const k = `${m[1]}.${m[2]}`; calls[k] = (calls[k] || 0) + 1;
    }
    const total = Object.values(calls).reduce((a, b) => a + b, 0);
    if (total) console.log(`${c}: ${total} calls -> ` + Object.entries(calls).map(([k, v]) => `${k}(x${v})`).join(', '));
}

// 4. events: dispatched by child, handled by which parent (on<event>=)
console.log('\n## EVENT WIRING: events dispatched but never handled by any parent template that uses the component');
for (const r of rows) {
    for (const ev of r.events) {
        const parents = comps.filter(p => children[p].includes(r.c));
        const handledBy = parents.filter(p => new RegExp('<c-' + kebab(r.c) + '[^>]*on' + ev.replace(/[-]/g, '') + '\\s*=', 'is').test(info[p].html));
        if (parents.length && !handledBy.length) console.log(`${r.c} fires '${ev}' - used by [${parents.join(', ')}] but no on${ev} handler found`);
    }
}

// 5. children that talk to Apex directly
console.log('\n## APEX IMPORTS PER COMPONENT');
for (const c of comps) {
    const n = (info[c].js.match(/@salesforce\/apex\//g) || []).length;
    if (n) console.log(`${c}: ${n}`);
}

// 6. props handed down through the chain (pdf-links etc.)
console.log('\n## ATTRIBUTES PASSED DOWN BY templateDesignerCMP');
const dh = info['templateDesignerCMP'].html;
for (const m of dh.matchAll(/<(c-[a-z0-9-]+)([^>]*)>/gis)) {
    const attrs = [...m[2].matchAll(/([a-z-]+)\s*=\s*\{([^}]+)\}/gi)].map(a => `${a[1]}={${a[2]}}`);
    console.log(m[1] + ': ' + attrs.length + ' attrs  ' + attrs.filter(a => !/^on/.test(a)).map(a => a.split('=')[0]).join(', '));
}
