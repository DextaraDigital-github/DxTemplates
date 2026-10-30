const fs = require('fs');
const path = require('path');
const r = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const want = ['no-dupe-class-members', 'no-redeclare', '@lwc/lwc/no-api-reassignments', 'no-undef', 'no-unreachable', 'no-dupe-keys', 'no-self-assign', '@lwc/lwc/no-document-query'];
const out = {};
const apiByFile = {};
for (const f of r) {
    const n = path.basename(f.filePath);
    for (const m of f.messages) {
        if (!want.includes(m.ruleId)) continue;
        (out[m.ruleId] = out[m.ruleId] || []).push(n + ':' + m.line + ' ' + m.message.slice(0, 90));
        if (m.ruleId === '@lwc/lwc/no-api-reassignments') apiByFile[n] = (apiByFile[n] || 0) + 1;
    }
}
for (const k of Object.keys(out)) {
    console.log('## ' + k + ' (' + out[k].length + ')');
    console.log(out[k].slice(0, 9).join('\n'));
}
console.log('## api-reassign by file', JSON.stringify(apiByFile));
