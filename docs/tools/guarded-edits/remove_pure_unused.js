// Removes unused local declarations that are provably no-ops:
//  - flagged by ESLint as "defined but never used" (never assigned or read),
//  - a standalone single-line `let name;` / `let name = <literal or variable>;` with no call/property access,
//  - the identifier appears exactly once in the whole file.
const fs = require('fs');
const path = require('path');
const groups = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const root = process.argv[3];
const cands = groups['unused local with literal/simple initializer'] || [];
const byFile = {};
for (const r of cands) (byFile[r.file] = byFile[r.file] || []).push(r);
let removed = 0, skipped = 0;
for (const [fname, recs] of Object.entries(byFile)) {
    const file = fs.readdirSync(root).map(d => path.join(root, d, fname)).find(p => fs.existsSync(p));
    const raw = fs.readFileSync(file, 'utf8');
    const eol = raw.includes('\r\n') ? '\r\n' : '\n';
    const lines = raw.split(/\r?\n/);
    for (const r of recs.sort((a, b) => b.line - a.line)) {
        const text = lines[r.line - 1];
        const occurrences = (raw.match(new RegExp(`\\b${r.name.replace(/\$/g, '\\$')}\\b`, 'g')) || []).length;
        const simple = new RegExp(`^\\s*(let|const|var)\\s+${r.name}\\s*(=\\s*(\\[\\s*\\]|\\{\\s*\\}|''|""|[0-9]+|[A-Za-z_$][\\w$]*))?\\s*;?\\s*$`).test(text);
        if (occurrences !== 1 || !simple) {
            console.log(`SKIP ${fname}:${r.line} ${r.name} (assigned=${r.assigned}, occurrences=${occurrences}, simple=${simple}) | ${text.trim()}`);
            skipped++;
            continue;
        }
        lines.splice(r.line - 1, 1);
        removed++;
        console.log(`REMOVE ${fname}:${r.line} ${text.trim()}`);
    }
    fs.writeFileSync(file, lines.join(eol));
}
console.log(`removed=${removed} skipped=${skipped}`);
