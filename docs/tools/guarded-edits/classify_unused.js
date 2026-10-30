const fs = require('fs');
const lint = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const kinds = { importSingle: [], importMulti: [], other: [] };
for (const f of lint) {
    const lines = fs.readFileSync(f.filePath, 'utf8').split(/\r?\n/);
    for (const m of f.messages) {
        if (m.ruleId !== 'no-unused-vars') continue;
        const text = lines[m.line - 1] || '';
        const name = (m.message.match(/'([^']+)'/) || [])[1];
        const rec = { file: f.filePath.split('lwc')[1].replace(/\\/g, '/'), line: m.line, name, text: text.trim().slice(0, 110) };
        if (/^\s*import\b/.test(text)) {
            (/import\s*\{/.test(text) ? kinds.importMulti : kinds.importSingle).push(rec);
        } else {
            kinds.other.push(rec);
        }
    }
}
console.log('single-line default imports unused:', kinds.importSingle.length);
console.log('named-import specifiers unused:', kinds.importMulti.length);
console.log('other unused (vars, params, functions):', kinds.other.length);
console.log('--- sample default imports');
kinds.importSingle.slice(0, 12).forEach(r => console.log(`${r.file}:${r.line} ${r.name} | ${r.text}`));
console.log('--- named imports');
kinds.importMulti.slice(0, 12).forEach(r => console.log(`${r.file}:${r.line} ${r.name} | ${r.text}`));
console.log('--- other (first 10)');
kinds.other.slice(0, 10).forEach(r => console.log(`${r.file}:${r.line} ${r.name} | ${r.text}`));
fs.writeFileSync(process.argv[3], JSON.stringify(kinds, null, 1));
