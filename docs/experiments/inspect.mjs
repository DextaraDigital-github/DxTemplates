import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js';
const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(process.argv[2])), disableFontFace: true }).promise;
console.log('pages', doc.numPages);
const maxPages = +(process.argv[3] || 3);
for (let p = 1; p <= Math.min(doc.numPages, maxPages); p++) {
  const page = await doc.getPage(p); const vp = page.getViewport({ scale: 1 });
  const tc = await page.getTextContent();
  const rows = {};
  for (const it of tc.items) { if (!it.str.trim()) continue; const y = Math.round(vp.height - it.transform[5]); (rows[y] = rows[y] || []).push(Math.round(it.transform[4]) + ':' + it.str); }
  console.log('--- page', p, Math.round(vp.width) + 'x' + Math.round(vp.height));
  Object.keys(rows).map(Number).sort((a, b) => a - b).slice(0, 40).forEach(y => console.log(String(y).padStart(4), rows[y].join(' | ').slice(0, 170)));
  const ops = await page.getOperatorList();
  const imgs = ops.fnArray.filter(f => f === pdfjs.OPS.paintImageXObject || f === pdfjs.OPS.paintInlineImageXObject).length;
  console.log('images painted', imgs);
}
const fonts = new Set();
for (let p = 1; p <= Math.min(doc.numPages, maxPages); p++) { const page = await doc.getPage(p); await page.getOperatorList(); for (const k of Object.keys(page.commonObjs._objs || {})) { const o = page.commonObjs._objs[k]; if (o && o.data && o.data.name) fonts.add(o.data.name); } }
console.log('fonts', [...fonts].join(', '));
