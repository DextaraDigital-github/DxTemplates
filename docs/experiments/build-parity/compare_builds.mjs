// BUILD PARITY (step 5, first slice): the same template and record built by the two pipelines that exist today.
//   browser build  = the record-page widget: the browser merges the sections and posts the HTML (baselines in docs/testing/baseline, 2026-10-28)
//   server build   = the Flow / Apex route: documentAutomationController builds the HTML in Apex (parity PoC run of 2026-11-24)
// Both are rendered by the same Visualforce page, so every difference comes from the BUILD, not the PDF engine.
// Usage: node compare_builds.mjs <baseline dir> <server dir> > report.md      (needs pdfjs-dist, legacy build)
import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js';
const [baseDir, serverDir] = process.argv.slice(2);
const labels = fs.readdirSync(serverDir).filter(f => f.endsWith('.pdf')).map(f => f.slice(0, -4)).sort();

async function read(file) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), disableFontFace: true, verbosity: 0 }).promise;
  const pages = []; const fonts = new Set();
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    await page.getOperatorList();
    for (const k of Object.keys(page.commonObjs._objs || {})) { const o = page.commonObjs._objs[k]; if (o && o.data && o.data.name) fonts.add(o.data.name.replace(/^[A-Z]{6}\+/, '')); }
    const lines = {};
    for (const it of tc.items) { if (!it.str.trim()) continue; const y = Math.round(page.getViewport({ scale: 1 }).height - it.transform[5]); (lines[y] = lines[y] || []).push(it.str); }
    pages.push(Object.keys(lines).map(Number).sort((a, b) => a - b).map(y => lines[y].join(' ')));
  }
  const words = pages.flat().join(' ').split(/\s+/).filter(Boolean);
  return { pages, words, fonts: [...fonts].sort() };
}
const count = ws => ws.reduce((m, w) => m.set(w, (m.get(w) || 0) + 1), new Map());
const diff = (a, b) => { const cb = count(b), out = []; for (const [w, n] of count(a)) { const d = n - (cb.get(w) || 0); if (d > 0) out.push(d > 1 ? `${w}×${d}` : w); } return out; };

console.log('# Build parity: browser build (widget) vs server build (Flow/Apex), same Visualforce renderer\n');
console.log('| Template | Pages browser / server | Words browser / server | Only in browser build | Only in server build | Fonts browser | Fonts server |');
console.log('|---|---|---|---|---|---|---|');
const details = [];
for (const l of labels) {
  const bf = `${baseDir}/${l}.pdf`;
  if (!fs.existsSync(bf)) continue;
  const a = await read(bf), b = await read(`${serverDir}/${l}.pdf`);
  const onlyA = diff(a.words, b.words), onlyB = diff(b.words, a.words);
  console.log(`| ${l} | ${a.pages.length} / ${b.pages.length} | ${a.words.length} / ${b.words.length} | ${onlyA.length} | ${onlyB.length} | ${a.fonts.join(', ')} | ${b.fonts.join(', ')} |`);
  details.push({ l, a, b, onlyA, onlyB });
}
console.log('\n## Details\n');
for (const { l, a, b, onlyA, onlyB } of details) {
  console.log(`### ${l}\n`);
  if (onlyA.length) console.log(`- only in the browser build (${onlyA.length}): ${onlyA.slice(0, 50).join(' ')}`);
  if (onlyB.length) console.log(`- only in the server build (${onlyB.length}): ${onlyB.slice(0, 50).join(' ')}`);
  console.log(`- first lines, browser: ${a.pages[0].slice(0, 4).join(' / ').slice(0, 300)}`);
  console.log(`- first lines, server:  ${b.pages[0].slice(0, 4).join(' / ').slice(0, 300)}`);
  console.log();
}
