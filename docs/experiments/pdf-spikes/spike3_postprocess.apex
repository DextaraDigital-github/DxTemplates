// SPIKE 3: post-process a Blob.toPdf PDF in Apex with an INCREMENTAL UPDATE (original bytes untouched, new objects + a new xref appended).
//  (a) STAMP every page: rotated text, a footer line, vector shapes (circle, polyline) in the page's own coordinates.
//  (b) IMAGE -> VECTOR: the <img> that the engine drew (a PNG File) has its Image XObject replaced by a Form XObject drawn in the unit square, so the
//      engine's own placement and scaling decide where and how big the vector drawing is. (This is the "placeholder image, then swap" idea for vector charts.)
// Works on the structure Blob.toPdf produces today: iText 2.0.8, classic xref table, page resources inline in the page object. Result: Attachment 'spike3 postprocessed.pdf'.
Id acc = '001RL00003CoThZYAV';
String pngFile = '/sfc/servlet.shepherd/version/download/068RL00000OXEmMYAX';

// ---------- helpers (anonymous Apex: declared before use) ----------
// bytes -> text, one char per byte (Latin-1), so binary stream data cannot break it (Blob.toString() throws "not a valid UTF-8 string")
String hexSlice(String hex, Integer startByte, Integer lenBytes) {
    List<Integer> chars = new List<Integer>();
    String digits = '0123456789abcdef';
    for (Integer i = startByte * 2; i < (startByte + lenBytes) * 2; i += 2) { chars.add(digits.indexOf(hex.substring(i, i + 1)) * 16 + digits.indexOf(hex.substring(i + 1, i + 2))); }
    return String.fromCharArray(chars);
}
// anonymous-Apex methods cannot see the script's local variables, so the collector is passed in: box[0] = appended text, offs = object number -> byte offset
void addObj(List<String> box, Map<Integer, Integer> offs, Integer total, Integer num, String objectText) { offs.put(num, total + box[0].length()); box[0] += objectText; }
Integer intAfter(String s, String key) { Integer i = s.indexOf(key); if (i < 0) { return null; } return Integer.valueOf(s.substring(i + key.length()).trim().split('[^0-9]')[0]); }
String objText(String hex, List<Integer> off, Integer n) {            // text of a dictionary object (ASCII), up to endobj
    Integer endHex = hex.indexOf('656e646f626a', off[n] * 2);
    return hexSlice(hex, off[n], (endHex / 2) + 6 - off[n]);
}
String pad10(Integer n) { String s = String.valueOf(n); while (s.length() < 10) { s = '0' + s; } return s; }
String stream(Integer num, String dictExtra, String body) {
    return num + ' 0 obj<<' + dictExtra + '/Length ' + body.length() + '>>stream\n' + body + '\nendstream\nendobj\n';
}

// ---------- make the source PDF: 2 pages, text and one image ----------
String html = '<html><head><style>@page { size: A4; margin: 50px; } body { font-family: Courier; font-size: 14px; }</style></head><body>'
    + '<p>Page one: original text, then an image that will become a vector chart.</p>'
    + '<img src="' + pngFile + '" width="300" height="150"/>'
    + '<p style="page-break-before: always;">Page two: original text.</p></body></html>';
Blob pdf = Blob.toPdf(html);
Integer total = pdf.size();
String hex = EncodingUtil.convertToHex(pdf);

// ---------- read the structure ----------
String tail = hexSlice(hex, Math.max(0, total - 400), Math.min(400, total));
Integer sx = tail.lastIndexOf('startxref');
Integer prevXref = Integer.valueOf(tail.substring(sx + 9).trim().split('\n')[0].trim());
String trailer = tail.substring(tail.lastIndexOf('trailer'), sx);
Integer size = intAfter(trailer, '/Size '); Integer rootNum = intAfter(trailer, '/Root ');
String xref = hexSlice(hex, prevXref, total - prevXref);
List<String> xl = xref.split('\n');
Integer count = Integer.valueOf(xl[1].split(' ')[1]);
List<Integer> off = new List<Integer>();
for (Integer i = 0; i < count; i++) { off.add(Integer.valueOf(xl[2 + i].substring(0, 10))); }
String pagesObj = objText(hex, off, intAfter(objText(hex, off, rootNum), '/Pages '));
List<Integer> pageNums = new List<Integer>();
String kids = pagesObj.substring(pagesObj.indexOf('/Kids'), pagesObj.indexOf(']'));
Matcher km = Pattern.compile('(\\d+) 0 R').matcher(kids);
while (km.find()) { pageNums.add(Integer.valueOf(km.group(1))); }
Integer imageNum = null;
for (Integer i = 1; i < count; i++) {
    if (off[i] == 0) { continue; }
    String head = hexSlice(hex, off[i], Math.min(160, total - off[i]));
    if (head.contains('/Subtype/Image')) { imageNum = i; break; }
}
System.debug('SPIKE3 structure: size=' + size + ' root=' + rootNum + ' pages=' + pageNums + ' imageObj=' + imageNum + ' prevXref=' + prevXref);

// ---------- build the appended objects ----------
Integer nextNum = size;
Integer fontNum = nextNum; nextNum++;
List<String> box = new List<String>{ '' };         // appended text; offsets are computed from total + its length
Map<Integer, Integer> newOff = new Map<Integer, Integer>();

addObj(box, newOff, total, fontNum, fontNum + ' 0 obj<</Subtype/Type1/Type/Font/BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding>>\nendobj\n');
for (Integer p = 0; p < pageNums.size(); p++) {
    Integer pn = pageNums[p];
    Integer openNum = nextNum; nextNum++; Integer closeNum = nextNum; nextNum++;
    String drawing = 'Q q '
        + '0.85 0.1 0.1 rg BT /ZZF 48 Tf 0.7071 0.7071 -0.7071 0.7071 150 300 Tm (CONFIDENTIAL) Tj ET '                       // rotated red text
        + '0 0.5 0 rg 520 780 m 520 793.8 508.8 805 495 805 c 481.2 805 470 793.8 470 780 c 470 766.2 481.2 755 495 755 c 508.8 755 520 766.2 520 780 c f '   // circle (4 Bezier curves)
        + '0 0 1 RG 2 w 50 60 m 100 90 l 150 70 l 200 110 l 250 80 S '                                                    // polyline
        + '0 g BT /ZZF 9 Tf 1 0 0 1 50 30 Tm (Stamped by Apex, page ' + (p + 1) + ' of ' + pageNums.size() + ') Tj ET Q';
    addObj(box, newOff, total, openNum, stream(openNum, '', 'q'));
    addObj(box, newOff, total, closeNum, stream(closeNum, '', drawing));
    String page = objText(hex, off, pn);
    Matcher cm = Pattern.compile('/Contents (\\d+) 0 R').matcher(page); cm.find();
    page = page.replace(cm.group(0), '/Contents [' + openNum + ' 0 R ' + cm.group(1) + ' 0 R ' + closeNum + ' 0 R]');
    page = page.contains('/Font<<') ? page.replace('/Font<<', '/Font<</ZZF ' + fontNum + ' 0 R') : page.replace('/Resources<<', '/Resources<</Font<</ZZF ' + fontNum + ' 0 R>>');
    addObj(box, newOff, total, pn, page.endsWith('\n') ? page : page + '\n');
}
if (imageNum != null) {   // a vector bar chart in the unit square: the engine scales it to the size and place of the image
    String vec = '0.93 g 0 0 1 1 re f 0.2 0.4 0.8 rg 0.08 0.05 0.14 0.55 re f 0.30 0.05 0.14 0.80 re f 0.52 0.05 0.14 0.40 re f 0.74 0.05 0.14 0.65 re f '
        + '0.8 0.1 0.1 RG 0.01 w 0.05 0.5 m 0.3 0.85 l 0.55 0.6 l 0.8 0.9 l S';
    addObj(box, newOff, total, imageNum, stream(imageNum, '/Type/XObject/Subtype/Form/BBox[0 0 1 1]', vec));
}
String body = box[0];
Integer xrefPos = total + body.length();
List<Integer> order = new List<Integer>(newOff.keySet()); order.sort();
String xr = 'xref\n0 1\n0000000000 65535 f \n';
for (Integer num : order) { xr += num + ' 1\n' + pad10(newOff.get(num)) + ' 00000 n \n'; }
String infoPart = trailer.contains('/Info') ? '/Info ' + intAfter(trailer, '/Info ') + ' 0 R' : '';
xr += 'trailer\n<</Size ' + nextNum + '/Root ' + rootNum + ' 0 R' + infoPart + '/Prev ' + prevXref + '>>\nstartxref\n' + xrefPos + '\n%%EOF\n';
Blob result = EncodingUtil.convertFromHex(hex + EncodingUtil.convertToHex(Blob.valueOf(body + xr)));
insert new List<Attachment>{ new Attachment(Name = 'spike3 original.pdf', ParentId = acc, Body = pdf), new Attachment(Name = 'spike3 postprocessed.pdf', ParentId = acc, Body = result) };
System.debug('SPIKE3 done original=' + total + ' bytes, postprocessed=' + result.size() + ' bytes, new objects=' + order.size() + ', cpu=' + Limits.getCpuTime() + ' ms');
