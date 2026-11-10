// SPIKE 1: does Blob.toPdf accept @font-face when the font is a Salesforce File or a static resource (relative URL), not a data: or https URL?
// Earlier result: data: and https font URLs crash the engine ("Error accessing PDF resource"). Needs: ContentVersion <fontCv> (a .ttf) and a static resource ZZSpikeFont (same file).
// Each variant is tried alone and the PDF (or the error) is recorded as an Attachment on the Account for download and inspection.
String fontCv = '068RL00000OXyNlYAL';
Id acc = '001RL00003CoThZYAV';
Map<String, String> variants = new Map<String, String>{
    'a file + fs-embed'   => '@font-face { font-family: ZZFont; src: url(/sfc/servlet.shepherd/version/download/' + fontCv + '); -fs-pdf-font-embed: embed; -fs-pdf-font-encoding: Identity-H; }',
    'b file plain'        => '@font-face { font-family: ZZFont; src: url(/sfc/servlet.shepherd/version/download/' + fontCv + '); }',
    'c resource + fs-embed' => '@font-face { font-family: ZZFont; src: url(/resource/ZZSpikeFont); -fs-pdf-font-embed: embed; -fs-pdf-font-encoding: Identity-H; }',
    'd resource plain'    => '@font-face { font-family: ZZFont; src: url(/resource/ZZSpikeFont); }',
    'e file + format'     => '@font-face { font-family: ZZFont; src: url(/sfc/servlet.shepherd/version/download/' + fontCv + ') format("truetype"); -fs-pdf-font-embed: embed; -fs-pdf-font-encoding: Identity-H; }',
    'z control (no font-face)' => ''
};
List<Attachment> out = new List<Attachment>();
List<String> log = new List<String>();
for (String k : variants.keySet()) {
    String html = '<html><head><style>@page { size: A4; margin: 40px; } ' + variants.get(k) + ' p.zz { font-family: ZZFont, Helvetica; font-size: 20px; } p.hv { font-family: Helvetica; font-size: 20px; }</style></head>'
        + '<body><p class="zz">The quick brown fox 0123456789 (custom)</p><p class="hv">The quick brown fox 0123456789 (Helvetica)</p></body></html>';
    try {
        Blob pdf = Blob.toPdf(html);
        out.add(new Attachment(Name = 'spike1 ' + k + '.pdf', ParentId = acc, Body = pdf));
        log.add('OK   ' + k + ' bytes=' + pdf.size());
    } catch (Exception e) {
        log.add('FAIL ' + k + ' : ' + e.getMessage());
    }
}
insert out;
for (String l : log) { System.debug('SPIKE1 ' + l); }
