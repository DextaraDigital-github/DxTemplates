import { useCallback, useEffect, useRef, useState } from 'react';
import { createDataSDK } from '@salesforce/platform-sdk';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// SPIKE (2026-11): does a server-rendered PDF show in this app, how fast, can a click on the page be mapped back to content?
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const REST_PATH = '/services/apexrest/zzpdf';

function buildHtml(rows: number): string {
  let body = '';
  for (let i = 1; i <= rows; i++) {
    body += `<tr><td>${i}</td><td>Product ${i}</td><td>Description ${'x'.repeat(i % 40)}</td><td>$${i * 3}.50</td></tr>`;
  }
  return (
    '<html><head><style>@page { size: A4; margin: 50px; @bottom-center { content: "Page " counter(page) " of " counter(pages); } } ' +
    'table { width: 100%; border-collapse: collapse; } td, th { border: 1px solid #333; padding: 3px; font-size: 10px; } h3 { font-size: 13px; }</style></head><body>' +
    '<h3>SECTION-A heading</h3><p>SECTION-A paragraph with some text that can be clicked.</p>' +
    '<h3>SECTION-B table</h3><table><thead><tr><th>#</th><th>Product</th><th>Description</th><th>Amount</th></tr></thead><tbody>' +
    body +
    '</tbody></table></body></html>'
  );
}

type Timing = { label: string; ms: number };

export default function Preview() {
  const [rows, setRows] = useState(40);
  const [status, setStatus] = useState('Press Render.');
  const [timings, setTimings] = useState<Timing[]>([]);
  const [pageNo, setPageNo] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [clicked, setClicked] = useState('');
  const [blobUrl, setBlobUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const docRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const viewportRef = useRef<pdfjsLib.PageViewport | null>(null);

  const draw = useCallback(async (n: number) => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas) return;
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 1.2 });
    viewportRef.current = viewport;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    await page.render({ canvasContext: ctx, viewport }).promise;
  }, []);

  const render = useCallback(async () => {
    setStatus('Rendering...');
    setClicked('');
    try {
      const t0 = performance.now();
      const sdk = await createDataSDK();
      if (!sdk.fetch) throw new Error('sdk.fetch is not available on this surface');
      const response = await sdk.fetch(REST_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: buildHtml(rows) }),
      });
      if (!response.ok) throw new Error('HTTP ' + response.status + ' ' + (await response.text()).slice(0, 300));
      const buffer = await response.arrayBuffer();
      const t1 = performance.now();
      const serverMs = response.headers.get('X-Server-Ms') ?? '?';
      const copy = buffer.slice(0);
      const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
      docRef.current = doc;
      setPageCount(doc.numPages);
      setPageNo(1);
      await draw(1);
      const t2 = performance.now();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl(URL.createObjectURL(new Blob([copy], { type: 'application/pdf' })));
      setTimings([
        { label: 'REST round trip (server toPdf ' + serverMs + ' ms, ' + copy.byteLength + ' bytes)', ms: Math.round(t1 - t0) },
        { label: 'pdf.js parse + draw page 1', ms: Math.round(t2 - t1) },
      ]);
      setStatus('OK: ' + doc.numPages + ' pages');
    } catch (e) {
      setStatus('ERROR: ' + (e instanceof Error ? e.message : String(e)));
    }
  }, [rows, draw, blobUrl]);

  useEffect(() => {
    void draw(pageNo);
  }, [pageNo, draw]);

  const onCanvasClick = async (event: React.MouseEvent<HTMLCanvasElement>) => {
    const doc = docRef.current;
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!doc || !viewport || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) * canvas.width) / rect.width;
    const y = ((event.clientY - rect.top) * canvas.height) / rect.height;
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    let best = '';
    let bestDistance = Infinity;
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const [px, py] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
      const w = item.width * viewport.scale;
      const h = item.height * viewport.scale;
      const dx = x < px ? px - x : x > px + w ? x - (px + w) : 0;
      const dy = y < py - h ? py - h - y : y > py ? y - py : 0;
      const d = Math.hypot(dx, dy);
      if (d < bestDistance) { bestDistance = d; best = item.str; }
    }
    setClicked('Clicked near text: "' + best.slice(0, 60) + '" (distance ' + Math.round(bestDistance) + ' px)');
  };

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-semibold">Server-rendered PDF preview (spike)</h1>
      <div className="flex gap-3 items-center">
        <label>Table rows <input className="border px-2 w-24" type="number" value={rows} onChange={e => setRows(Number(e.target.value))} /></label>
        <button className="border px-3 py-1 rounded bg-blue-600 text-white" onClick={() => void render()}>Render</button>
        <button className="border px-3 py-1 rounded" disabled={pageNo <= 1} onClick={() => setPageNo(pageNo - 1)}>Prev</button>
        <span>page {pageNo} / {pageCount}</span>
        <button className="border px-3 py-1 rounded" disabled={pageNo >= pageCount} onClick={() => setPageNo(pageNo + 1)}>Next</button>
      </div>
      <p data-testid="status">{status}</p>
      {timings.map(t => <p key={t.label}>{t.label}: <b>{t.ms} ms</b></p>)}
      <p>{clicked}</p>
      <div className="flex gap-4 items-start">
        <canvas ref={canvasRef} className="border" onClick={e => void onCanvasClick(e)} />
        <div>
          <p className="font-medium">Native browser viewer (no library):</p>
          {blobUrl ? <iframe title="native" src={blobUrl} width={500} height={650} /> : <p>Render first.</p>}
        </div>
      </div>
    </div>
  );
}
