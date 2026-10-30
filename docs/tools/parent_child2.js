const fs = require('fs');
const path = require('path');
const root = process.argv[2];
const read = (c, ext) => { const p = path.join(root, c, c + ext); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; };
const camel = s => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const editors = { templateHeader: 'c-template-header', templateContentDetails: 'c-template-content-details', templateTableDetails: 'c-template-table-details', templateRelatedObjects: 'c-template-related-objects', templateFooter: 'c-template-footer' };
const dHtml = read('templateDesignerCMP', '.html');

console.log('## 1. ATTRIBUTES THE DESIGNER PASSES vs WHAT EACH EDITOR DECLARES AND USES');
for (const [comp, tag] of Object.entries(editors)) {
    const js = read(comp, '.js'), html = read(comp, '.html');
    const m = dHtml.match(new RegExp('<' + tag + '\\b([^>]*)>', 'is'));
    const passed = [...(m ? m[1] : '').matchAll(/(?<![a-z-])((?!on)[a-z][a-z-]*)\s*=\s*\{/gi)].map(a => camel(a[1]));
    const declared = new Set([...js.matchAll(/@api\s+(?:get\s+|set\s+)?([A-Za-z_$][\w$]*)/g)].map(a => a[1]));
    const rows = passed.map(p => {
        const decl = declared.has(p);
        const uses = (js.match(new RegExp('\\bthis\\.' + p + '\\b', 'g')) || []).length + (html.match(new RegExp('\\{' + p + '[\\w.]*\\}', 'g')) || []).length;
        return { p, decl, uses };
    });
    console.log(`${comp}: passes ${passed.length}`);
    rows.forEach(r => console.log(`   ${r.p.padEnd(26)} declared=${r.decl}  usesInEditor=${r.uses}${!r.decl ? '   <-- passed but not declared' : (r.uses === 0 ? '   <-- declared but never read' : '')}`));
}

console.log('\n## 2. METHOD NAMES SHARED BY THE THREE LARGE EDITORS');
const big = ['templateContentDetails', 'templateRelatedObjects', 'templateTableDetails'];
const methods = c => new Set([...read(c, '.js').matchAll(/^\s{2,4}(?:@api\s+)?(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/gm)].map(m => m[1]).filter(n => !['if', 'for', 'while', 'switch', 'catch', 'function'].includes(n)));
const ms = big.map(methods);
big.forEach((c, i) => console.log(`${c}: ${ms[i].size} methods`));
const inAll = [...ms[0]].filter(n => ms[1].has(n) && ms[2].has(n));
const inTwo = [...new Set([...ms[0], ...ms[1], ...ms[2]])].filter(n => ms.filter(s => s.has(n)).length === 2);
console.log(`in all three (${inAll.length}): ${inAll.join(', ')}`);
console.log(`in exactly two (${inTwo.length}): ${inTwo.join(', ')}`);

console.log('\n## 3. METHOD NAMES SHARED BY HEADER AND FOOTER EDITORS (and their *Type children)');
const pair = (a, b) => { const x = methods(a), y = methods(b); const both = [...x].filter(n => y.has(n)); console.log(`${a} (${x.size}) vs ${b} (${y.size}): ${both.length} shared: ${both.join(', ')}`); };
pair('templateHeader', 'templateFooter');
pair('templateHeaderType', 'templateFooterType');

console.log('\n## 4. APEX METHODS IMPORTED BY MORE THAN ONE COMPONENT');
const apex = {};
for (const c of fs.readdirSync(root)) {
    for (const m of read(c, '.js').matchAll(/^import\s+\w+\s+from\s+'@salesforce\/apex\/([\w.]+)'/gm)) (apex[m[1]] = apex[m[1]] || []).push(c);
}
Object.entries(apex).filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length).forEach(([k, v]) => console.log(`${String(v.length).padStart(2)}  ${k}  <- ${v.join(', ')}`));
console.log('distinct Apex methods used:', Object.keys(apex).length, '| distinct classes:', new Set(Object.keys(apex).map(k => k.split('.')[0])).size);

console.log('\n## 5. CHILD REACHING INTO PARENT / DOCUMENT');
for (const c of fs.readdirSync(root)) {
    const js = read(c, '.js');
    const hits = {};
    for (const re of [/\.parentElement/g, /\.parentNode/g, /\.closest\(/g, /getRootNode\(/g, /this\.template\.host/g, /document\.querySelector/g, /document\.getElementById/g, /window\.\w+/g]) {
        const n = (js.match(re) || []).length; if (n) hits[re.source] = n;
    }
    if (Object.keys(hits).length) console.log(c + ': ' + JSON.stringify(hits));
}

console.log('\n## 6. EVENT PAYLOADS FIRED BY THE FIVE EDITORS');
for (const comp of Object.keys(editors)) {
    const js = read(comp, '.js');
    for (const m of js.matchAll(/new CustomEvent\(\s*['"]([^'"]+)['"]\s*,\s*\{([^}]*)\}/g)) console.log(`${comp} -> ${m[1]} ${m[2].replace(/\s+/g, ' ').trim().slice(0, 90)}`);
}

console.log('\n## 7. SIZE AND API SURFACE (current)');
for (const c of fs.readdirSync(root).filter(d => fs.existsSync(path.join(root, d, d + '.js')))) {
    const js = read(c, '.js');
    const lines = js.split(/\r?\n/).length;
    if (lines > 400) console.log(`${c.padEnd(26)} lines=${String(lines).padStart(5)} apex=${(js.match(/@salesforce\/apex\//g) || []).length}  @api=${(js.match(/@api\b/g) || []).length}  setTimeout=${(js.match(/setTimeout\(/g) || []).length}  querySelector=${(js.match(/querySelector/g) || []).length}`);
}

console.log('\n## 8. EXPOSURE (isExposed and targets); internal-only components are free to change');
const internal = [];
for (const c of fs.readdirSync(root)) {
    const mp = path.join(root, c, c + '.js-meta.xml');
    if (!fs.existsSync(mp)) continue;
    const xml = fs.readFileSync(mp, 'utf8');
    const exposed = /<isExposed>true<\/isExposed>/.test(xml);
    const targets = [...xml.matchAll(/<target>([^<]+)<\/target>/g)].map(m => m[1].replace('lightning__', '').replace('lightningCommunity__', 'community:'));
    if (exposed) console.log(`${c.padEnd(36)} exposed  targets: ${targets.join(', ')}`); else internal.push(c);
}
console.log('internal only: ' + internal.join(', '));
