// BUILD PARITY: which characters make the server-built document switch to the Arial Unicode MS font (DisplayPDFController.needsUnicodeFont)?
// Prints every character above 255 that is not Windows-1252 punctuation, with its code point and some text around it, for the newest server-built
// document of each template below (parent Document__c with Sequence -1; its body chunks have External_Id__c = parent Id).
Set<Integer> cp1252 = new Set<Integer>{ 8364, 8218, 402, 8222, 8230, 8224, 8225, 710, 8240, 352, 8249, 338, 381, 8216, 8217, 8220, 8221, 8226, 8211, 8212, 732, 8482, 353, 8250, 339, 382, 376 };
for (String tpl : new List<String>{ 'EMPLOYMENT CONTRACT', 'Claim Form' }) {
    DxCPQ__Document__c parent = [SELECT Id, DxCPQ__Document_Content__c FROM DxCPQ__Document__c WHERE DxCPQ__Sequence__c = -1 AND DxCPQ__Document_Template__r.Name = :tpl ORDER BY CreatedDate DESC LIMIT 1];
    String text = (parent.DxCPQ__Document_Content__c == null ? '' : parent.DxCPQ__Document_Content__c);
    for (DxCPQ__Document__c chunk : [SELECT DxCPQ__Document_Body__c FROM DxCPQ__Document__c WHERE DxCPQ__External_Id__c = :parent.Id ORDER BY DxCPQ__Sequence__c]) { text += chunk.DxCPQ__Document_Body__c; }
    Map<Integer, Integer> counts = new Map<Integer, Integer>(); Map<Integer, String> sample = new Map<Integer, String>();
    for (Integer i = 0; i < text.length(); i++) {
        Integer c = text.charAt(i);
        if (c > 255 && !cp1252.contains(c)) {
            counts.put(c, (counts.containsKey(c) ? counts.get(c) : 0) + 1);
            if (!sample.containsKey(c)) { sample.put(c, text.substring(Math.max(0, i - 40), Math.min(text.length(), i + 20)).replaceAll('[^\\x20-\\x7e]', '?')); }
        }
    }
    System.debug('UNI ' + tpl + ' length=' + text.length() + ' characters: ' + counts);
    for (Integer c : sample.keySet()) { System.debug('UNI   U+' + String.valueOf(c) + ' near: ' + sample.get(c)); }
}
