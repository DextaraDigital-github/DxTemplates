import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js';
const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(process.argv[2])), disableFontFace: true }).promise;
let all = '', footers = 0;
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p); const vp = page.getViewport({ scale: 1 }); const tc = await page.getTextContent();
  const items = tc.items.filter(i => i.str.trim());
  all += ' ' + items.filter(i => { const y = vp.height - i.transform[5]; return y >= 55 && y <= vp.height - 55; }).map(i => i.str).join(' ');
  if (items.some(i => /Page|Footer/.test(i.str) && vp.height - i.transform[5] > vp.height - 60)) footers++;
}
const c = (re) => (all.match(re) || []).length;
const nums = new Set([...all.matchAll(/Product\s*(\d+)/g)].map(m => +m[1]));
const rows = new Set([...all.matchAll(/Row\s*(\d+)/g)].map(m => +m[1]));
const missingRows = []; for (let i = 1; i <= 120; i++) if (!rows.has(i)) missingRows.push(i); console.log("missing nested rows", missingRows.join(","));
const missing = []; for (let i = 1; i <= 300; i++) if (!nums.has(i)) missing.push(i);
console.log('pages', doc.numPages, '| paragraphs', c(/Paragraph \d+:/g), '/60 | distinct product numbers', nums.size, '/300 | distinct nested rows', rows.size, '/120 | clause paragraphs', c(/Clause paragraph \d+:/g), '/40 | pages with footer', footers, '| missing products', missing.join(','));
