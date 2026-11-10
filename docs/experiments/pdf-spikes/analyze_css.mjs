// SPIKE 2 analysis: for every page of spike2_css.pdf print what was drawn, to compare each CSS feature with the control page (page 1).
// Usage: node analyze_css.mjs <spike2 css.pdf>        (needs pdfjs-dist, legacy build)
import fs from 'fs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js';
const OPS = pdfjs.OPS; const name = {}; for (const [k, v] of Object.entries(OPS)) name[v] = k;
const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(process.argv[2])), disableFontFace: true, verbosity: 0 }).promise;
console.log('pages', doc.numPages);
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p);
  const tc = await page.getTextContent();
  const label = tc.items.length ? tc.items[0].str : '';
  const list = await page.getOperatorList();
  const hist = {};
  let curveSeen = 0; const boxes = []; const images_ = []; let curColor = ''; let lastPath = null; let lastMatrix = null;
  let curves = 0, rects = 0, lines = 0, fills = 0, strokes = 0;
  const fillColors = new Set(); const alphas = new Set(); let images = 0, shadings = 0, clips = 0, dashes = 0;
  list.fnArray.forEach((fn, i) => {
    const n = name[fn]; hist[n] = (hist[n] || 0) + 1;
    const a = list.argsArray[i];
    if (fn === OPS.setFillRGBColor) curColor = a.join(',');
    if (fn === OPS.transform) lastMatrix = a;
    if (fn === OPS.constructPath) { const xs = [], ys = []; for (let k = 0; k < a[1].length; k += 2) { xs.push(a[1][k]); ys.push(a[1][k + 1]); } lastPath = xs.length ? { w: Math.round(Math.max(...xs) - Math.min(...xs)), h: Math.round(Math.max(...ys) - Math.min(...ys)) } : null; }
    if ((fn === OPS.fill || fn === OPS.eoFill) && lastPath && lastPath.w > 3 && lastPath.h > 3) boxes.push(`${lastPath.w}x${lastPath.h}#${curColor}`);
    if (fn === OPS.paintImageXObject && lastMatrix) images_.push(`${Math.round(lastMatrix[0])}x${Math.round(Math.abs(lastMatrix[3]))}`);
    if (fn === OPS.constructPath) { for (const o of a[0]) { if (o === OPS.curveTo || o === OPS.curveTo2 || o === OPS.curveTo3) curves++; if (o === OPS.rectangle) rects++; if (o === OPS.lineTo) lines++; } }
    if (fn === OPS.fill || fn === OPS.eoFill || fn === OPS.fillStroke || fn === OPS.eoFillStroke) fills++;
    if (fn === OPS.stroke || fn === OPS.fillStroke) strokes++;
    if (fn === OPS.setFillRGBColor) fillColors.add(a.join(','));
    if (fn === OPS.setGState) for (const [k, v] of a[0]) if (k === 'ca' || k === 'CA') alphas.add(k + '=' + v);
    if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) images++;
    if (fn === OPS.shadingFill || fn === OPS.paintShading) shadings++;
    if (fn === OPS.clip || fn === OPS.eoClip) clips++;
    if (fn === OPS.setDash && a[0] && a[0].length) dashes++;
  });
  const rotated = tc.items.filter(i => Math.abs(i.transform[1]) > 0.01 || Math.abs(i.transform[2]) > 0.01).length;
  const textLines = {};
  for (const it of tc.items) { if (!it.str.trim()) continue; const y = Math.round(842 - it.transform[5]); (textLines[y] = textLines[y] || []).push(Math.round(it.transform[4]) + ':' + it.str.slice(0, 22)); }
  const body = Object.keys(textLines).map(Number).sort((x, y) => x - y).slice(1, 4).map(y => `${y}[${textLines[y].join(' | ')}]`).join(' ');
  console.log(`\n${String(p).padStart(2)} ${label}`);
  console.log(`   rect=${rects} line=${lines} curve=${curves} fill=${fills} stroke=${strokes} clip=${clips} dash=${dashes} image=${images} shading=${shadings} alpha=[${[...alphas].join(' ')}] rotatedText=${rotated} fillColors=${fillColors.size}`);
  console.log(`   filled boxes (w x h # color): ${[...new Set(boxes)].slice(0, 6).join('  ')}  | images: ${images_.join(' ')}`);
  console.log(`   text: ${body}`);
}
