const fs = require('fs');
const path = require('path');
const lint = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const groups = {};
const add = (k, r) => (groups[k] = groups[k] || []).push(r);
for (const f of lint) {
    const lines = fs.readFileSync(f.filePath, 'utf8').split(/\r?\n/);
    for (const m of f.messages) {
        if (m.ruleId !== 'no-unused-vars') continue;
        const text = (lines[m.line - 1] || '').trim();
        const name = (m.message.match(/'([^']+)'/) || [])[1];
        const assigned = /assigned a value/.test(m.message);
        const file = path.basename(f.filePath);
        const rec = { file, line: m.line, name, text: text.slice(0, 120), assigned };
        let kind;
        if (/^\s*(async\s+)?[A-Za-z_$][\w$]*\s*\([^)]*\b(event|evt|e|error|err|result|data|row)\b[^)]*\)\s*\{/.test(text) && !/^\s*(let|const|var)\b/.test(text)) kind = 'unused function parameter';
        else if (/\)\s*=>|function\s*\(/.test(text) && /\b(event|evt|e|error|err|result|data|row|index|idx|i)\b/.test(text) && !/^\s*(let|const|var)\b/.test(text)) kind = 'unused callback parameter';
        else if (/^\s*(let|const|var)\b/.test(text)) {
            const init = text.split('=').slice(1).join('=');
            const hasCall = /\(/.test(init);
            kind = hasCall ? 'unused local with call in initializer (side effects possible)' : 'unused local with literal/simple initializer';
        } else if (/^\s*this\./.test(text)) kind = 'other';
        else kind = assigned ? 'assigned but never read' : 'other';
        add(kind, rec);
    }
}
for (const [k, v] of Object.entries(groups).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${v.length}  ${k}`);
}
console.log('--- safe-looking: unused local with literal/simple initializer (all)');
(groups['unused local with literal/simple initializer'] || []).forEach(r => console.log(`${r.file}:${r.line} ${r.text}`));
console.log('--- side-effect candidates (first 8)');
(groups['unused local with call in initializer (side effects possible)'] || []).slice(0, 8).forEach(r => console.log(`${r.file}:${r.line} ${r.text}`));
console.log('--- other (first 8)');
(groups['other'] || []).slice(0, 8).forEach(r => console.log(`${r.file}:${r.line} ${r.name} | ${r.text}`));
fs.writeFileSync(process.argv[3], JSON.stringify(groups, null, 1));
