// Turns a seed written for the dev scratch org (namespace DxCPQ, so the code says Document_Template__c) into one for an org where the
// package is installed (every package object, field, relationship, class and flow needs the DxCPQ__ prefix there).
// Usage: node docs/tools/org-seed/prefix_seed.js seed_clauses.apex > seed_clauses.prefixed.apex
// Rules: Name__c / Name__r / Name__mdt not already prefixed get DxCPQ__ in front; an apex class reference like DisplayPDFController. is
// not rewritten (seeds in this folder only touch data). Standard fields and objects are untouched. Review the result before running.
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.error('usage: node prefix_seed.js <seed.apex>'); process.exit(1); }
const text = fs.readFileSync(file, 'utf8');
const prefixed = text.replace(/(^|[^A-Za-z0-9_])((?!DxCPQ__)[A-Za-z][A-Za-z0-9_]*__(?:c|r|mdt))\b/g, '$1DxCPQ__$2');
process.stdout.write(prefixed);
