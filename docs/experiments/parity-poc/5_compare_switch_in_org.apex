// PARITY PoC step 5 (in the org): for each case of 4_switch_cases.ps1 compare the PDF made with the switch OFF ('off <case>.pdf', Visualforce route) with the one made with the
// switch ON ('on <case>.pdf', direct Blob.toPdf route). Both were made by the real Flow action in a Queueable. Dates and the document ID are masked, and so is the random
// 6-letter tag of embedded font names (it differs between any two runs). Also prints the page box of each PDF, to show that page size and orientation were honoured.
String latin1(String hex, Integer fromByte, Integer len) {
    String digits = '0123456789abcdef'; List<Integer> chars = new List<Integer>();
    for (Integer b = fromByte; b < fromByte + len && b * 2 + 1 < hex.length(); b++) { Integer v = digits.indexOf(hex.substring(b * 2, b * 2 + 1)) * 16 + digits.indexOf(hex.substring(b * 2 + 1, b * 2 + 2)); chars.add((v >= 32 && v < 127) ? v : 46); }
    return String.fromCharArray(chars);
}
String maskHex(String h) {
    Map<String, Integer> spans = new Map<String, Integer>{ '2f4372656174696f6e44617465' => 38, '2f4d6f6444617465' => 38, '2f4944205b' => 136 };
    for (String marker : spans.keySet()) {
        Integer i = h.lastIndexOf(marker);
        if (i >= 0) { Integer tailStart = i + marker.length(); h = h.left(tailStart) + '0'.repeat(spans.get(marker)) + h.substring(tailStart + spans.get(marker)); }
    }
    // font subset tags: /FontName/ABCDEF+Name : the 6 letters after the slash are random per run
    Integer pos = 0;
    String marker2 = '2f466f6e744e616d652f';   // /FontName/
    while (true) {
        Integer i = h.indexOf(marker2, pos);
        if (i < 0) { break; }
        Integer tagStart = i + marker2.length();
        h = h.left(tagStart) + '0'.repeat(12) + h.substring(tagStart + 12);
        pos = tagStart + 12;
    }
    return h;
}
String pageBox(String hex) { Integer i = hex.indexOf('2f4d65646961426f78'); return i < 0 ? 'no MediaBox' : latin1(hex, i / 2, 36); }   // /MediaBox
for (String c : new List<String>{ 'invoice-A4-portrait', 'grant-A4-portrait', 'invoice-Letter-landscape', 'newsletter-A4-portrait' }) {
    List<Attachment> offList = [SELECT Id, BodyLength FROM Attachment WHERE Name = :('off ' + c + '.pdf') ORDER BY CreatedDate DESC LIMIT 1];
    List<Attachment> onList = [SELECT Id, BodyLength FROM Attachment WHERE Name = :('on ' + c + '.pdf') ORDER BY CreatedDate DESC LIMIT 1];
    if (offList.isEmpty() || onList.isEmpty()) { System.debug('SWCMP ' + c + ': not run in this org'); continue; }   // a case that was not generated here
    Attachment offAtt = offList[0]; Attachment onAtt = onList[0];
    String h1 = EncodingUtil.convertToHex([SELECT Body FROM Attachment WHERE Id = :offAtt.Id].Body);
    String h2 = EncodingUtil.convertToHex([SELECT Body FROM Attachment WHERE Id = :onAtt.Id].Body);
    String verdict = h1 == h2 ? 'byte-identical' : (maskHex(h1) == maskHex(h2) ? 'IDENTICAL except dates, document ID and random font tags' : 'DIFFERENT');
    if (verdict == 'DIFFERENT') { String m1 = maskHex(h1); String m2 = maskHex(h2); Integer at = 0; while (at < m1.length() && m1.substring(at, at + 1) == m2.substring(at, at + 1)) { at++; } System.debug('SWDIFF ' + c + ' first difference at byte ' + (at / 2) + ' old: ' + latin1(h1, Math.max(0, at / 2 - 30), 90) + ' new: ' + latin1(h2, Math.max(0, at / 2 - 30), 90)); }
    System.debug('SWCMP ' + c + ': off ' + offAtt.BodyLength + ' / on ' + onAtt.BodyLength + ' bytes: ' + verdict + ' | box off ' + pageBox(h1) + ' | box on ' + pageBox(h2));
}
