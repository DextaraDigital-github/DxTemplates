// SPIKE 3 check: does a PDF reader accept the incrementally updated PDF, and is the stamp / vector content there?
// Usage: node verify_postprocess.mjs <spike3 original.pdf> <spike3 postprocessed.pdf>        (needs pdfjs-dist, legacy build)
import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js';
const OPS = pdfjs.OPS;
async function summary(file) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), disableFontFace: true, verbosity: 0 }).promise;
  const out = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const list = await page.getOperatorList();
    let curves = 0, lines = 0, forms = 0, images = 0, formPaths = 0, insideForm = false;
    list.fnArray.forEach((fn, i) => {
      if (fn === OPS.paintFormXObjectBegin) { forms++; insideForm = true; }
      if (fn === OPS.paintFormXObjectEnd) insideForm = false;
      if (fn === OPS.paintImageXObject) images++;
      if (fn === OPS.constructPath) for (const o of list.argsArray[i][0]) { if (o === OPS.curveTo) curves++; if (o === OPS.lineTo) lines++; if (insideForm) formPaths++; }
    });
    out.push({ page: p, text: tc.items.map(i => i.str).filter(s => s.trim()).join(' | '), rotated: tc.items.filter(i => Math.abs(i.transform[1]) > 1).map(i => i.str), curves, lines, forms, images, formPaths });
  }
  return { pages: doc.numPages, out };
}
for (const f of process.argv.slice(2)) { console.log('\n' + f); const s = await summary(f); console.log(' pages', s.pages); for (const o of s.out) console.log(' ', JSON.stringify(o)); }
