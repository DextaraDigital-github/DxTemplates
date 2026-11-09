// Experiment D: Blob.toPdf at scale, @@N@@ rows
List<String> parts = new List<String>{ '<html><head><style>@page { size: A4; margin: 70px 40px; @bottom-center { content: "Page " counter(page) " of " counter(pages); } } table { width:100%; border-collapse: collapse; table-layout: fixed; } td, th { border: 1px solid #333; padding: 2px; font-size: 9px; }</style></head><body><table><thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Price</th></tr></thead><tbody>' };
for (Integer i = 1; i <= @@N@@; i++) { parts.add('<tr><td>' + i + '</td><td>Product ' + i + ' &lt;special&gt; &amp; "quoted"</td><td>' + Math.mod(i, 9) + '</td><td>$' + (i * 3 + 0.5) + '</td></tr>'); }
parts.add('</tbody></table></body></html>');
String html = String.join(parts, '');
Long t0 = System.currentTimeMillis(); Integer c0 = Limits.getCpuTime();
Blob pdf = Blob.toPdf(html);
System.debug('PDFD rows @@N@@ html ' + html.length() + ' pdf ' + pdf.size() + ' ms ' + (System.currentTimeMillis() - t0) + ' cpu ' + (Limits.getCpuTime() - c0) + ' heap ' + Limits.getHeapSize() + '/' + Limits.getLimitHeapSize());
