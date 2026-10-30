// Splits templateDesignerCMP.connectedCallback into loadLookups() + refreshSections(); manual callers use refreshSections().
const fs = require('fs');
const file = process.argv[2];
const raw = fs.readFileSync(file, 'utf8');
const eol = raw.includes('\r\n') ? '\r\n' : '\n';
const lines = raw.split(/\r?\n/);
const fail = m => { console.error('ABORT: ' + m); process.exit(1); };

const find = (pred, from = 0) => { for (let i = from; i < lines.length; i++) if (pred(lines[i], i)) return i; return -1; };

const cb = find(l => l === '  connectedCallback() {');
if (cb < 0 || lines[cb + 1].trim() !== 'this.isActivateTemplateDisabled = true;') fail('connectedCallback head not found');
const marker = find(l => l.trim() === 'this.relatedtoTypeObjChild = this.relatedtoTypeObjName;', cb);
if (marker < 0 || lines[marker + 1].trim() !== 'this.documenttemplaterecordid = this.recordId;') fail('marker not found');
const head = lines.slice(cb + 2, marker); // domain, languages, pdfLinks

const tailStart = find(l => l.trim() === '/**' && /getClassNames function/.test(lines[cb + (lines.indexOf(l) - cb) + 1] || ''), marker);
// locate by content instead
const tailDoc = find((l, i) => i > marker && /@description this getClassNames function/.test(l));
if (tailDoc < 0) fail('getClassNames doc not found');
const tailFrom = tailDoc - 1; // the "/**" line
if (lines[tailFrom].trim() !== '/**') fail('expected /** before getClassNames doc');
const handler = find((l, i) => i > tailDoc && l === '  connectedCallbackHandler() {');
const closeIdx = handler; // find the closing "  }" of connectedCallback before the handler doc
let end = -1;
for (let i = handler - 1; i > tailDoc; i--) { if (lines[i] === '  }') { end = i; break; } }
if (end < 0) fail('connectedCallback end not found');
const tail = lines.slice(tailFrom, end);
if (!tail.some(l => /getFlowNames\(\)/.test(l))) fail('tail does not contain getFlowNames');

// Build new text
const rebuilt = [];
rebuilt.push(...lines.slice(0, cb));
rebuilt.push('  connectedCallback() {');
rebuilt.push('    this.loadLookups();');
rebuilt.push('    this.refreshSections();');
rebuilt.push('  }');
rebuilt.push('');
rebuilt.push('  /**');
rebuilt.push('   * Loads the lookup data that does not change while the designer is open (domain URL, user languages,');
rebuilt.push('   * PDF links, Apex class and Flow names). The calls are cached by c/dxApexCache.');
rebuilt.push('   */');
rebuilt.push('  loadLookups() {');
rebuilt.push(...head.filter(l => !/console\.log\('Languages----'/.test(l)));
rebuilt.push(...tail);
rebuilt.push('  }');
rebuilt.push('');
rebuilt.push('  /**');
rebuilt.push('   * Reloads the template sections (from the server, or from the in-memory list when no reload is needed).');
rebuilt.push('   * Call this instead of connectedCallback() to refresh the designer.');
rebuilt.push('   */');
rebuilt.push('  refreshSections() {');
rebuilt.push('    this.isActivateTemplateDisabled = true;');
rebuilt.push(...lines.slice(marker, tailFrom));
// drop trailing blank lines inside the method body before the closing brace
while (rebuilt[rebuilt.length - 1].trim() === '') rebuilt.pop();
rebuilt.push('  }');
rebuilt.push(...lines.slice(end + 1));

let out = rebuilt.join(eol);

// Replace manual self-calls (everything except the one inside connectedCallback itself).
const before = (out.match(/this\.connectedCallback\(\);/g) || []).length;
out = out.replace(/this\.connectedCallback\(\);/g, 'this.refreshSections();');
console.log(`manual calls replaced: ${before}`);
fs.writeFileSync(file, out);
console.log('done');
