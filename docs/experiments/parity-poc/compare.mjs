// PARITY PoC step 3b: compare the Visualforce PDF (baseline) with the Blob.toPdf PDF (candidate) of each template.
// For each pair: page count, page size, word counts, words missing from / added to the candidate (as a multiset, so repeated words count),
// the words that are missing, how the first-page text lines up (x of each line), fonts, images painted, and file sizes.
// Usage: node compare.mjs <dir with 'vf X.pdf' and 'toPdf X.pdf'> > report.md      (needs pdfjs-dist, legacy build, 3.x or 4.x)
import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js';
const dir = process.argv[2];
const names = fs.readdirSync(dir).filter(f => f.startsWith('vf ') && f.endsWith('.pdf')).map(f => f.slice(3, -4)).sort();

async function read(file) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), disableFontFace: true, verbosity: 0 }).promise;
  const pages = [];
  let images = 0; const fonts = new Set();
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p); const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const lines = {};
    for (const it of tc.items) {
      if (!it.str.trim()) continue;
      const y = Math.round(vp.height - it.transform[5]);
      (lines[y] = lines[y] || []).push({ x: Math.round(it.transform[4]), s: it.str });
    }
    const ops = await page.getOperatorList();
    images += ops.fnArray.filter(f => f === pdfjs.OPS.paintImageXObject || f === pdfjs.OPS.paintInlineImageXObject).length;
    for (const k of Object.keys(page.commonObjs._objs || {})) { const o = page.commonObjs._objs[k]; if (o && o.data && o.data.name) fonts.add(o.data.name.replace(/^[A-Z]{6}\+/, '')); }
    pages.push({ w: Math.round(vp.width), h: Math.round(vp.height), lines, text: tc.items.map(i => i.str).join(' ') });
  }
  const words = pages.flatMap(p => p.text.split(/\s+/).filter(Boolean));
  return { pages, words, images, fonts: [...fonts].sort(), bytes: fs.statSync(file).size };
}
// PDFs of the same input differ in the creation date and the document ID, so mask those before comparing bytes.
const masked = f => fs.readFileSync(f).toString('latin1').replace(/\/(CreationDate|ModDate)\s*\([^)]*\)/g, '').replace(/\/ID\s*\[[^\]]*\]/g, '');
const count = ws => ws.reduce((m, w) => m.set(w, (m.get(w) || 0) + 1), new Map());
function diff(a, b) { // words of a that b has fewer of
  const cb = count(b), out = [];
  for (const [w, n] of count(a)) { const d = n - (cb.get(w) || 0); if (d > 0) out.push(d > 1 ? `${w}×${d}` : w); }
  return out;
}

console.log('# Parity: Visualforce PDF vs Blob.toPdf\n');
console.log('| Template | Pages VF / toPdf | Words VF / toPdf | Missing in toPdf | Added in toPdf | Images VF / toPdf | Bytes VF / toPdf | Same bytes (dates masked) | Same text positions on every page |');
console.log('|---|---|---|---|---|---|---|---|---|');
const details = [];
for (const n of names) {
  const vfFile = `${dir}/vf ${n}.pdf`, tpFile = `${dir}/toPdf ${n}.pdf`;
  if (!fs.existsSync(tpFile)) { console.log(`| ${n} | no toPdf result | | | | | | | |`); continue; }
  const a = await read(vfFile), b = await read(tpFile);
  const missing = diff(a.words, b.words), added = diff(b.words, a.words);
  console.log(`| ${n} | ${a.pages.length} / ${b.pages.length} | ${a.words.length} / ${b.words.length} | ${missing.length} | ${added.length} | ${a.images} / ${b.images} | ${a.bytes} / ${b.bytes} | ${masked(vfFile) === masked(tpFile) ? 'yes' : 'no'} | ${JSON.stringify(a.pages.map(p => p.lines)) === JSON.stringify(b.pages.map(p => p.lines)) ? 'yes' : 'NO'} |`);
  details.push({ n, a, b, missing, added });
}
console.log('\n## Details\n');
for (const { n, a, b, missing, added } of details) {
  console.log(`### ${n}\n`);
  console.log(`- page size VF ${a.pages[0].w}x${a.pages[0].h}, toPdf ${b.pages[0].w}x${b.pages[0].h}`);
  console.log(`- fonts VF: ${a.fonts.join(', ') || '-'}; toPdf: ${b.fonts.join(', ') || '-'}`);
  if (missing.length) console.log(`- missing in toPdf (${missing.length}): ${missing.slice(0, 40).join(' ')}`);
  if (added.length) console.log(`- added in toPdf (${added.length}): ${added.slice(0, 40).join(' ')}`);
  const lineXs = side => Object.keys(side.pages[0].lines).map(Number).sort((x, y) => x - y).slice(0, 8).map(y => `${y}: ${side.pages[0].lines[y].map(i => i.x).join(',')}`);
  console.log('- first-page line positions (y: x of each item)\n  - VF     ' + lineXs(a).join(' | ') + '\n  - toPdf  ' + lineXs(b).join(' | '));
  console.log();
}
