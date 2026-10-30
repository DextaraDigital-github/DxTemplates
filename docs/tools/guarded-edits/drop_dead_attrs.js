// Removes three attributes the section editors never read from the designer template. Aborts if counts differ.
const fs = require('fs');
const p = process.argv[2];
let s = fs.readFileSync(p, 'utf8');
const rules = [
    [/[ \t]*recordidvalueprop=\{recordIDValueprop\}/g, 5],
    [/[ \t]*recordidtoedit=\{recordidtoedit\}/g, 5],
    [/[ \t]*wherecondition\s*=\s*\{whereCondition\}/g, 1]
];
for (const [re, expected] of rules) {
    const n = (s.match(re) || []).length;
    if (n !== expected) { console.error(`ABORT: ${re} matched ${n}, expected ${expected}`); process.exit(1); }
    s = s.replace(re, '');
}
fs.writeFileSync(p, s);
console.log('removed 11 attribute occurrences');
