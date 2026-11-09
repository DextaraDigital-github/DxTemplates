// Experiment A: what does Blob.toPdf(html) support? (run after a DML in the same transaction on purpose)
insert new Account(Name = 'toPdf experiment ' + System.currentTimeMillis());
String png = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAAEklEQVR4nGP4z8CAFTEMLQkAQ1ZgEdYVkYAAAAAASUVORK5CYII=';
String html = '<html><head><style>'
  + '@page { size: A4 landscape; margin: 90px 40px 80px 40px; @top-left { content: element(hdrL); } @top-right { content: element(hdrR); } @bottom-center { content: "Page " counter(page) " of " counter(pages); } }'
  + 'div.hdrL { position: running(hdrL); font-family: Courier; color: #cc0000; } div.hdrR { position: running(hdrR); text-align: right; }'
  + 'table { width:100%; border-collapse: collapse; } td, th { border: 1px solid #333; padding: 2px; } tr { page-break-inside: avoid; }'
  + '.bar { background:#007CBA; height:12px; display:block; }'
  + '</style></head><body>'
  + '<div class="hdrL">LEFT RUNNING HEADER</div><div class="hdrR">RIGHT RUNNING</div>'
  + '<h1>Heading in default font</h1>'
  + '<p style="font-family: Times; font-size: 14px;">Times, Cyrillic: Привет мир, accents: éèàü, Chinese: 谢谢你们，日本語 テスト</p>'
  + '<p style="font-family: Courier;">Courier font line</p><p style="font-family: Helvetica;">Helvetica font line</p><p style="font-family: Verdana;">Verdana font line</p>'
  + '<p>PNG data uri image: <img src="data:image/png;base64,' + png + '" width="40" height="40"/></p>'
  + '<p>CSS bar chart:</p><div class="bar" style="width:70%;">&nbsp;</div><div class="bar" style="width:40%; background:#cc0000;">&nbsp;</div>'
  + '<p style="page-break-before: always;">Second page start</p>'
  + '<table><thead><tr><th>#</th><th>Value</th></tr></thead><tbody>';
for (Integer i = 1; i <= 60; i++) { html += '<tr><td>' + i + '</td><td>Row ' + i + '</td></tr>'; }
html += '</tbody></table></body></html>';
Blob pdf = Blob.toPdf(html);
String b64 = EncodingUtil.base64Encode(pdf);
System.debug('PDFA size ' + pdf.size());
Integer size = 12000; Integer n = (Integer) Math.ceil(b64.length() / (Decimal) size);
for (Integer i = 0; i < n; i++) { System.debug('PDFB64 ' + i + ' ' + b64.substring(i * size, Math.min(b64.length(), (i + 1) * size))); }
