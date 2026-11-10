// SPIKE 1b: more URL forms for the font, plus the Visualforce PDF engine for comparison. Same font as spike 1 (Liberation Sans Regular, SIL OFL).
Id acc = '001RL00003CoThZYAV';
StaticResource sr = [SELECT Id, SystemModstamp FROM StaticResource WHERE Name = 'ZZSpikeFont' LIMIT 1];
String stamp = String.valueOf(sr.SystemModstamp.getTime());
Attachment fontAtt = [SELECT Id FROM Attachment WHERE Name = 'ZZSpikeFont.ttf' LIMIT 1];
String fs = ' -fs-pdf-font-embed: embed; -fs-pdf-font-encoding: Identity-H; }';
Map<String, String> variants = new Map<String, String>{
    'f resource with timestamp' => '@font-face { font-family: ZZFont; src: url(/resource/' + stamp + '/ZZSpikeFont);' + fs,
    'g attachment FileDownload' => '@font-face { font-family: ZZFont; src: url(/servlet/servlet.FileDownload?file=' + fontAtt.Id + ');' + fs,
    'h resource quoted'         => '@font-face { font-family: ZZFont; src: url("/resource/ZZSpikeFont");' + fs,
    'i font-family unquoted+weight' => '@font-face { font-family: ZZFont; font-weight: normal; font-style: normal; src: url(/resource/' + stamp + '/ZZSpikeFont);' + fs
};
List<Attachment> out = new List<Attachment>();
for (String k : variants.keySet()) {
    String html = '<html><head><style>@page { size: A4; margin: 40px; } ' + variants.get(k) + ' p.zz { font-family: ZZFont, Helvetica; font-size: 20px; } p.hv { font-family: Helvetica; font-size: 20px; }</style></head>'
        + '<body><p class="zz">The quick brown fox 0123456789 (custom)</p><p class="hv">The quick brown fox 0123456789 (Helvetica)</p></body></html>';
    try {
        Blob pdf = Blob.toPdf(html);
        out.add(new Attachment(Name = 'spike1 ' + k + '.pdf', ParentId = acc, Body = pdf));
        System.debug('SPIKE1B OK   ' + k + ' bytes=' + pdf.size());
    } catch (Exception e) { System.debug('SPIKE1B FAIL ' + k + ' : ' + e.getMessage()); }
}
Blob vf;
try { vf = new PageReference('/apex/DxCPQ__zzFontSpike').getContentAsPDF(); out.add(new Attachment(Name = 'spike1 VF page.pdf', ParentId = acc, Body = vf)); System.debug('SPIKE1B OK   VF page bytes=' + vf.size()); }
catch (Exception e) { System.debug('SPIKE1B FAIL VF page : ' + e.getMessage()); }
insert out;
