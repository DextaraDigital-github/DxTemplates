import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js';
const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(process.argv[2])), disableFontFace: true }).promise;
const page = await doc.getPage(1);
const ops = await page.getOperatorList();
const names = [];
ops.fnArray.forEach((f, i) => { if (f === pdfjs.OPS.paintImageXObject) names.push(ops.argsArray[i][0]); });
for (const n of names) {
  const img = await new Promise((res) => page.objs.get(n, res));
  const d = img.data; const counts = {};
  const step = img.kind === 1 ? 1 : (d.length / (img.width * img.height));
  for (let p = 0; p < d.length; p += step) { const key = step >= 3 ? d[p] + ',' + d[p + 1] + ',' + d[p + 2] : String(d[p]); counts[key] = (counts[key] || 0) + 1; }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  console.log(n, img.width + 'x' + img.height, 'top colours', JSON.stringify(top));
}
