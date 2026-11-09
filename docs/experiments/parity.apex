// Parity probe: the real merged sections of "ZZ Heavy Combined" (no Related Objects) through Blob.toPdf instead of the VF page.
Id tid = [SELECT Id FROM DxCPQ__Document_Template__c WHERE Name = 'ZZ Heavy Combined' LIMIT 1].Id;
Id acc = [SELECT Id FROM Account WHERE Name = 'Datamatics' LIMIT 1].Id;
Long t0 = System.currentTimeMillis(); Integer c0 = Limits.getCpuTime();
List<DxCPQ__Document_Template_Section__c> secs = DxCPQ.DisplayPDFController.getTemplateSectionsForRecord(tid, acc);
Integer cpuSections = Limits.getCpuTime() - c0;
String body = ''; List<String> hdr = new List<String>{ '', '', '' }; List<String> ftr = new List<String>{ '', '', '' };
for (DxCPQ__Document_Template_Section__c s : secs) {
    if (s.DxCPQ__Type__c == 'Header') {
        for (Object o : (List<Object>) ((Map<String, Object>) JSON.deserializeUntyped(s.DxCPQ__Section_Content__c)).get('sectionsContent')) { Map<String, Object> m = (Map<String, Object>) o; Integer ix = (Integer) m.get('indexvar'); if (ix < 3) { hdr[ix] = (String) m.get('value'); } }
    } else if (s.DxCPQ__Type__c == 'Footer') {
        for (Object o : (List<Object>) ((Map<String, Object>) JSON.deserializeUntyped(s.DxCPQ__Section_Content__c)).get('sectionsContent')) { Map<String, Object> m = (Map<String, Object>) o; Integer ix = (Integer) m.get('indexvar'); if (ix < 3) { ftr[ix] = (String) m.get('value'); } }
    } else if (s.DxCPQ__Type__c != 'Related Objects') {
        body += s.DxCPQ__Section_Content__c;
    }
}
String html = '<html><head><style>'
  + '@page { size: A4; margin: 70px 40px 70px 40px;'
  + ' @top-left { content: element(h0); } @top-center { content: element(h1); } @top-right { content: element(h2); }'
  + ' @bottom-left { content: element(f0); } @bottom-center { content: element(f1); } @bottom-right { content: element(f2); } }'
  + 'div.h0 { position: running(h0); } div.h1 { position: running(h1); } div.h2 { position: running(h2); }'
  + 'div.f0 { position: running(f0); } div.f1 { position: running(f1); } div.f2 { position: running(f2); }'
  + 'table.mytable { width: 100%; border-collapse: collapse; } table.mytable td, table.mytable th { border: 1px solid #333; font-size: 8px; padding: 2px; }'
  + '</style></head><body>'
  + '<div class="h0">' + hdr[0] + '</div><div class="h1">' + hdr[1] + '</div><div class="h2">' + hdr[2] + '</div>'
  + '<div class="f0">' + ftr[0] + '</div><div class="f1">' + ftr[1] + '</div><div class="f2">' + ftr[2] + '</div>'
  + body + '</body></html>';
Integer c1 = Limits.getCpuTime();
Blob pdf = Blob.toPdf(html);
System.debug('PARITY sections cpu ' + cpuSections + ' toPdf cpu ' + (Limits.getCpuTime() - c1) + ' total ms ' + (System.currentTimeMillis() - t0) + ' html ' + html.length() + ' pdf ' + pdf.size());
String b64 = EncodingUtil.base64Encode(pdf);
for (Integer i = 0; i * 12000 < b64.length(); i++) { System.debug('PDFB64 ' + i + ' ' + b64.substring(i * 12000, Math.min(b64.length(), (i + 1) * 12000))); }
