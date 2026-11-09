// Experiment E: charts and layout features
String png = 'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAAEklEQVR4nGP4z8CAFTEMLQkAQ1ZgEdYVkYAAAAAASUVORK5CYII=';
String svg = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="#007CBA"/><circle cx="60" cy="30" r="20" fill="#ffcc00"/></svg>';
String html = '<html><head><style>'
  + '@page { size: A4; margin: 80px 40px; @top-center { content: "NORMAL HEADER"; } }'
  + '@page :first { @top-center { content: "FIRST PAGE HEADER"; } margin-top: 140px; }'
  + '.wm { position: fixed; top: 300px; left: 120px; opacity: 0.2; font-size: 60px; color: #999; }'
  + '.cell { float: left; width: 30%; padding: 4px; border: 1px solid #555; margin-right: 2%; }'
  + '.rot { -webkit-transform: rotate(-30deg); transform: rotate(-30deg); }'
  + '</style></head><body>'
  + '<div class="wm">WATERMARK</div>'
  + '<p>Inline SVG: ' + svg + '</p>'
  + '<p>SVG as data URI img: <img src="data:image/svg+xml;base64,' + EncodingUtil.base64Encode(Blob.valueOf(svg)) + '" width="120" height="60"/></p>'
  + '<p>PNG data URI: <img src="data:image/png;base64,' + png + '" width="30" height="30"/></p>'
  + '<div><div class="cell">float col 1</div><div class="cell">float col 2</div><div class="cell">float col 3</div></div>'
  + '<p style="clear:both;" class="rot">rotated text (transform)</p>'
  + '<p style="page-break-before: always;">page 2 body</p><p style="page-break-before: always;">page 3 body</p>'
  + '</body></html>';
try {
  Blob pdf = Blob.toPdf(html);
  System.debug('PDFE size ' + pdf.size());
  String b64 = EncodingUtil.base64Encode(pdf);
  Integer size = 12000; Integer n = (Integer) Math.ceil(b64.length() / (Decimal) size);
  for (Integer i = 0; i < n; i++) { System.debug('PDFB64 ' + i + ' ' + b64.substring(i * size, Math.min(b64.length(), (i + 1) * size))); }
} catch (Exception e) { System.debug('PDFE ERROR ' + e.getMessage()); }
