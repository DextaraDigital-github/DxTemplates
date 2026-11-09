import { LightningElement } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import PDFJS from '@salesforce/resourceUrl/ZZPdfJs';
import renderPdf from '@salesforce/apex/ZZPdfPreview.renderPdf';

// Experiment: does a server-made PDF show in a Lightning page, how fast, and does pdf.js run under Lightning Web Security?
export default class ZzPdfProbe extends LightningElement {
    rows = 40;
    status = 'Press Render.';
    log = [];
    ready = false;

    handleRows(event) { this.rows = Number(event.target.value); }

    buildHtml() {
        let body = '';
        for (let i = 1; i <= this.rows; i++) { body += '<tr><td>' + i + '</td><td>Product ' + i + '</td><td>A description that changes length ' + 'x'.repeat(i % 40) + '</td><td>$' + (i * 3) + '.50</td></tr>'; }
        return '<html><head><style>@page { size: A4; margin: 50px; @bottom-center { content: "Page " counter(page) " of " counter(pages); } } table { width: 100%; border-collapse: collapse; } td, th { border: 1px solid #333; padding: 3px; font-size: 10px; }</style></head><body><h3>Probe document</h3><table><thead><tr><th>#</th><th>Product</th><th>Description</th><th>Amount</th></tr></thead><tbody>' + body + '</tbody></table></body></html>';
    }

    async ensureLibrary() {
        if (this.ready) { return; }
        await loadScript(this, PDFJS + '/pdf.min.js');
        const lib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
        if (!lib) { throw new Error('pdfjsLib not found after loading the script'); }
        lib.GlobalWorkerOptions.workerSrc = PDFJS + '/pdf.worker.min.js';
        this.lib = lib;
        this.ready = true;
    }

    async handleRender() {
        this.log = [];
        try {
            const t0 = performance.now();
            await this.ensureLibrary();
            const t1 = performance.now();
            const result = await renderPdf({ html: this.buildHtml() });
            const t2 = performance.now();
            const bytes = Uint8Array.from(atob(result.pdf), (c) => c.charCodeAt(0));
            const doc = await this.lib.getDocument({ data: bytes }).promise;
            const page = await doc.getPage(1);
            const viewport = page.getViewport({ scale: 1.2 });
            const host = this.template.querySelector('.host');
            host.innerHTML = '';
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width; canvas.height = viewport.height; canvas.style.border = '1px solid #999';
            host.appendChild(canvas);
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            const t3 = performance.now();
            this.status = 'OK: pages ' + doc.numPages + ', pdf ' + result.bytes + ' bytes';
            this.log = [
                'load pdf.js ' + Math.round(t1 - t0) + ' ms (first time only)',
                'Apex round trip ' + Math.round(t2 - t1) + ' ms (server toPdf ' + result.serverMs + ' ms)',
                'decode + draw page 1 ' + Math.round(t3 - t2) + ' ms',
                'total after library ready ' + Math.round(t3 - t1) + ' ms'
            ];
        } catch (e) {
            this.status = 'ERROR: ' + (e && e.message ? e.message : JSON.stringify(e));
        }
    }
}
