// PARITY PoC step 2 (ONE template per run, token TEMPLATE_NAME): from the newest Document__c that step 1 made for the template, render
//   (a) the BASELINE: the production page renderAsPdfLWC through the Visualforce PDF engine (getContentAsPDF),
//   (b) the CANDIDATE: the exact HTML of the same page (page zzRenderHtml = same markup without renderas) through Blob.toPdf.
// Stored as Attachments on the Document: 'vf <tpl>.pdf', 'toPdf <tpl>.pdf', 'html <tpl>.html' (Description = timings).
// DML is only done at the end (the renderers refuse to run after DML in the same transaction).
// Takes every <tag ...>inner</tag> block out of html and returns the rest; the inner texts are added to 'kept' (when given).
String takeOut(String html, String tag, List<String> kept) {
    String low = html.toLowerCase(); String open = '<' + tag; String close = '</' + tag + '>';
    List<String> parts = new List<String>(); Integer pos = 0;
    while (true) {
        Integer s = low.indexOf(open, pos);
        if (s < 0) { break; }
        Integer gt = low.indexOf('>', s); Integer e = gt < 0 ? -1 : low.indexOf(close, gt);
        if (e < 0) { break; }
        parts.add(html.substring(pos, s));
        if (kept != null) { kept.add(html.substring(gt + 1, e)); }
        pos = e + close.length();
    }
    parts.add(html.substring(pos));
    return String.join(parts, '');
}
// Removes every tag that starts with 'prefix' (for example '<meta'), up to its closing '>'. The character after the name must end the name,
// so '<head' does not remove '<header'.
String dropTags(String html, String prefix) {
    String low = html.toLowerCase();
    List<String> parts = new List<String>(); Integer pos = 0;
    while (true) {
        Integer s = low.indexOf(prefix, pos);
        if (s < 0) { break; }
        String next = low.substring(s + prefix.length(), Math.min(low.length(), s + prefix.length() + 1));
        if (next != '>' && next != '/' && !next.isWhitespace()) { parts.add(html.substring(pos, s + prefix.length())); pos = s + prefix.length(); continue; }
        Integer gt = low.indexOf('>', s);
        if (gt < 0) { break; }
        parts.add(html.substring(pos, s));
        pos = gt + 1;
    }
    parts.add(html.substring(pos));
    return String.join(parts, '');
}
String normalizeForToPdf(String html) {
    List<String> styles = new List<String>();
    String rest = takeOut(takeOut(html, 'script', null), 'style', styles);
    for (String tag : new List<String>{ '<!doctype', '<head', '</head', '<meta', '<link' }) { rest = dropTags(rest, tag); }
    return '<html><head><style>' + String.join(styles, ' ') + '</style></head><body>' + rest + '</body></html>';
}

DxCPQ__Document__c d = [SELECT Id, DxCPQ__Document_Template__r.Name FROM DxCPQ__Document__c
                        WHERE DxCPQ__Sequence__c = -1 AND DxCPQ__Document_Template__r.Name = 'TEMPLATE_NAME' ORDER BY CreatedDate DESC LIMIT 1];
String tpl = d.DxCPQ__Document_Template__r.Name;
Map<String, String> params = new Map<String, String>{ 'documentid' => d.Id, 'selectedPageSize' => 'A4', 'selectedPageOrientation' => 'Portrait' };

PageReference prod = new PageReference('/apex/DxCPQ__renderAsPdfLWC'); prod.getParameters().putAll(params);
Long t0 = System.currentTimeMillis(); Integer c0 = Limits.getCpuTime();
Blob vfPdf = prod.getContentAsPDF();
String vfInfo = 'vf ' + (System.currentTimeMillis() - t0) + ' ms, cpu ' + (Limits.getCpuTime() - c0);

PageReference cand = new PageReference('/apex/DxCPQ__zzRenderHtml'); cand.getParameters().putAll(params);
Long t1 = System.currentTimeMillis(); Integer c1 = Limits.getCpuTime();
String html = cand.getContent().toString();
// ADAPTER (findings of the first runs): the HTML that Salesforce returns for the page is a full Salesforce page: two <head> blocks, scripts, no <body>,
// and the page CSS inside <style media="print">. Blob.toPdf then ignored the page rules (Letter instead of A4, no margins, no header/footer boxes).
// Rebuilt as one <head> with every <style> block and one <body> without scripts it renders like the Visualforce engine (verified on Invoice Template:
// same size and identical text positions). indexOf loops, not lazy regexes: a regex fails ("Regex too complicated") on very large documents.
html = normalizeForToPdf(html);
Long t2 = System.currentTimeMillis(); Integer c2 = Limits.getCpuTime();
Blob tpPdf = Blob.toPdf(html);
String tpInfo = 'html ' + (t2 - t1) + ' ms, toPdf ' + (System.currentTimeMillis() - t2) + ' ms, cpu ' + (Limits.getCpuTime() - c2) + ', html ' + html.length() + ' chars';

insert new List<Attachment>{
    new Attachment(Name = 'vf ' + tpl + '.pdf', ParentId = d.Id, Body = vfPdf, Description = vfInfo),
    new Attachment(Name = 'toPdf ' + tpl + '.pdf', ParentId = d.Id, Body = tpPdf, Description = tpInfo),
    new Attachment(Name = 'html ' + tpl + '.html', ParentId = d.Id, Body = Blob.valueOf(html))
};
System.debug('PARITY done ' + tpl + ' | ' + vfInfo + ' | ' + tpInfo + ' | vf bytes ' + vfPdf.size() + ' toPdf bytes ' + tpPdf.size());

