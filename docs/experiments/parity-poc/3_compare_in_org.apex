// PARITY PoC step 3 (in the org, no download): for each Document, compare the OLDEST 'vf <template>.pdf' attachment (the baseline, made before a change)
// with the NEWEST one (made after it). Same size and the same bytes except the creation date, the modification date and the document ID (masked in maskHex)
// means the change did not alter the PDF. Files over 300 KB are compared by size only (heap limit of a synchronous run).
// Blanks the values that differ between two renderings of the same input: /CreationDate(..), /ModDate(..) (19 bytes each) and /ID [<..><..>] (68 bytes).
String maskHex(String h) {
    Map<String, Integer> spans = new Map<String, Integer>{ '2f4372656174696f6e44617465' => 38, '2f4d6f6444617465' => 38, '2f4944205b' => 136 };
    for (String marker : spans.keySet()) {
        Integer i = h.lastIndexOf(marker);
        if (i >= 0) { Integer tailStart = i + marker.length(); h = h.left(tailStart) + '0'.repeat(spans.get(marker)) + h.substring(tailStart + spans.get(marker)); }
    }
    return h;
}
Map<Id, List<Attachment>> byDoc = new Map<Id, List<Attachment>>();
for (Attachment a : [SELECT Id, Name, ParentId, BodyLength, CreatedDate FROM Attachment WHERE Name LIKE 'vf %.pdf' AND CreatedDate = TODAY ORDER BY CreatedDate]) {
    if (!byDoc.containsKey(a.ParentId)) { byDoc.put(a.ParentId, new List<Attachment>()); }
    byDoc.get(a.ParentId).add(a);
}
Integer same = 0; Integer different = 0; Integer notPaired = 0;
for (Id docId : byDoc.keySet()) {
    List<Attachment> pair = byDoc.get(docId);
    if (pair.size() < 2) { notPaired++; continue; }
    Attachment older = pair[0]; Attachment newer = pair[pair.size() - 1];
    String verdict;
    if (older.BodyLength != newer.BodyLength) {
        verdict = 'DIFFERENT SIZE ' + older.BodyLength + ' vs ' + newer.BodyLength;
    } else if (older.BodyLength > 300000) {
        verdict = 'same size ' + older.BodyLength + ' (not compared byte by byte: over 300 KB)';
    } else {
        String h1 = EncodingUtil.convertToHex([SELECT Body FROM Attachment WHERE Id = :older.Id].Body);
        String h2 = EncodingUtil.convertToHex([SELECT Body FROM Attachment WHERE Id = :newer.Id].Body);
        h1 = maskHex(h1); h2 = maskHex(h2);
        if (h1 == h2) {
            verdict = 'IDENTICAL except the dates and the document ID (' + older.BodyLength + ' bytes)';
        } else {
            Integer at = 0; while (at < h1.length() && h1.substring(at, at + 1) == h2.substring(at, at + 1)) { at++; }
            verdict = 'DIFFERENT BYTES (' + older.BodyLength + ' bytes), first difference at byte ' + (at / 2);
        }
    }
    if (verdict.startsWith('DIFFERENT')) { different++; } else { same++; }
    System.debug('CMP ' + older.Name + ' : ' + verdict);
}
System.debug('CMP summary: unchanged=' + same + ' changed=' + different + ' notPaired=' + notPaired);
