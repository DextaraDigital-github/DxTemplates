// Removes ONLY unused import specifiers reported by ESLint no-unused-vars. Preserves each file's line endings.
const fs = require('fs');
const path = require('path');
const kinds = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const root = process.argv[3]; // .../force-app/main/default/lwc
const byFile = {};
for (const r of [...kinds.importSingle, ...kinds.importMulti]) (byFile[r.file] = byFile[r.file] || []).push(r);

let changed = 0;
for (const [rel, recs] of Object.entries(byFile)) {
    const file = path.join(root, rel);
    const raw = fs.readFileSync(file, 'utf8');
    const eol = raw.includes('\r\n') ? '\r\n' : '\n';
    const lines = raw.split(/\r?\n/);
    // process bottom-up so line numbers stay valid
    for (const r of recs.sort((a, b) => b.line - a.line)) {
        const i = r.line - 1;
        const text = lines[i];
        if (!/^\s*import\b/.test(text)) throw new Error(`not an import: ${rel}:${r.line}`);
        if (/import\s*\{/.test(text)) {
            const m = text.match(/^(\s*import\s*\{)([^}]*)(\}\s*from\s*.*)$/);
            if (!m) throw new Error(`cannot parse: ${rel}:${r.line}`);
            const specs = m[2].split(',').map(s => s.trim()).filter(Boolean);
            const kept = specs.filter(s => s !== r.name);
            if (kept.length === specs.length) throw new Error(`specifier ${r.name} not found: ${rel}:${r.line}`);
            if (kept.length === 0) { lines.splice(i, 1); changed++; console.log(`${rel}:${r.line} removed whole import (${r.name} was the only specifier)`); continue; }
            lines[i] = `${m[1]} ${kept.join(', ')} ${m[3]}`;
        } else {
            if (!new RegExp(`^\\s*import\\s+${r.name}\\s+from\\s+['"]`).test(text)) throw new Error(`unexpected default import: ${rel}:${r.line}`);
            lines.splice(i, 1);
        }
        changed++;
        console.log(`${rel}:${r.line} removed ${r.name}`);
    }
    fs.writeFileSync(file, lines.join(eol));
}
console.log('edits applied:', changed);
