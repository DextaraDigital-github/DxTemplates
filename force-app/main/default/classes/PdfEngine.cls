// Chooses how a stored document (Document__c) becomes a PDF when no screen is involved: Flow, Apex and API generation (sendEmailAutomation).
// The widget on the record page does not use this class.
//
//   Setting off (default)  the Visualforce page renderAsPdfLWC makes the PDF, exactly as before.
//   Setting on             the same page is asked for its HTML (parameter engine=html) and Blob.toPdf makes the PDF. Faster, needs no Visualforce
//                          rendering of a PDF, and, unlike getContentAsPDF, may run after data was saved in the same transaction.
//                          If the direct engine fails, the Visualforce route is used and the failure is logged.
//
// The setting is the checkbox Use_Direct_Engine__c of the Custom Metadata record DXTemplates_PdfEngine.Default
// (Setup, Custom Metadata Types, DXTemplates_PdfEngine, Manage Records). Evidence that both routes give the same PDF, and why the HTML has to be
// cleaned up first: docs/experiments/parity-poc/README.md.
public with sharing class PdfEngine {
    // Tests switch the setting and the engine's inputs here (a test cannot write a Custom Metadata record, and cannot render a Visualforce page).
    @TestVisible private static Boolean testSetting;
    @TestVisible private static String testHtml;
    @TestVisible private static Boolean testFailDirect = false;

    public static Boolean useDirectEngine() {
        if (testSetting != null) {
            return testSetting;
        }
        DXTemplates_PdfEngine__mdt setting = DXTemplates_PdfEngine__mdt.getInstance('Default');
        return setting != null && setting.Use_Direct_Engine__c == true;
    }

    // The PDF of the stored document. pageSize and orientation are the values the page expects (A4, Letter ...; Portrait, Landscape).
    public static Blob render(String documentId, String pageSize, String orientation) {
        PageReference page = Page.renderAsPdfLWC;
        page.getParameters().put('documentId', documentId);
        page.getParameters().put('selectedPageSize', pageSize);
        page.getParameters().put('selectedPageOrientation', orientation);

        String directFailure;
        if (useDirectEngine()) {
            try {
                return renderDirect(page);
            } catch (Exception ex) {
                directFailure = ex.getTypeName() + ': ' + ex.getMessage() + ' ' + ex.getStackTraceString();
            }
            page.getParameters().remove('engine');
        }
        Blob pdf = Test.isRunningTest() ? Blob.valueOf('Test') : page.getContentAsPDF();
        if (directFailure != null) {
            // logged after the page was rendered: saving a record first would make the Visualforce render refuse to run
            LogHandler.createLog((Id) null, 'PdfEngine.render()', 'Document Id- ' + documentId + ' ' + directFailure, 'The direct PDF engine failed; the Visualforce route made the PDF.', 'Exception');
        }
        return pdf;
    }

    private static Blob renderDirect(PageReference page) {
        if (testFailDirect) {
            throw new PdfEngineException('forced failure (test)');
        }
        page.getParameters().put('engine', 'html');
        String html = Test.isRunningTest()
            ? (testHtml != null ? testHtml : '<html><body><p>Test</p></body></html>')
            : page.getContent().toString();
        return Blob.toPdf(normalizeForToPdf(html));
    }

    public class PdfEngineException extends Exception { }

    // The page, without renderAs, returns a full Salesforce page: two <head> blocks, <script> tags, no <body>, and its page CSS inside
    // <style media="print">. Given as it is, Blob.toPdf ignores the page rules (Letter instead of A4, no margins, no header or footer).
    // Rebuilt as one <head> with every <style> block and one <body> without scripts it gives the same PDF as the Visualforce engine.
    // indexOf loops, not regular expressions: a lazy regex fails with "Regex too complicated" on documents of about 1 MB and more.
    @TestVisible
    private static String normalizeForToPdf(String html) {
        List<String> styles = new List<String>();
        String rest = takeOut(takeOut(html, 'script', null), 'style', styles);
        for (String tag : new List<String>{ '<!doctype', '<head', '</head', '<meta', '<link' }) {
            rest = dropTags(rest, tag);
        }
        return '<html><head><style>' + String.join(styles, ' ') + '</style></head><body>' + rest + '</body></html>';
    }

    // Takes every <tag ...>inner</tag> block out of html and returns the rest; the inner texts are added to 'kept' (when given).
    private static String takeOut(String html, String tag, List<String> kept) {
        String low = html.toLowerCase();
        String open = '<' + tag;
        String close = '</' + tag + '>';
        List<String> parts = new List<String>();
        Integer pos = 0;
        while (true) {
            Integer start = low.indexOf(open, pos);
            if (start < 0) { break; }
            Integer gt = low.indexOf('>', start);
            Integer closeAt = gt < 0 ? -1 : low.indexOf(close, gt);
            if (closeAt < 0) { break; }
            parts.add(html.substring(pos, start));
            if (kept != null) { kept.add(html.substring(gt + 1, closeAt)); }
            pos = closeAt + close.length();
        }
        parts.add(html.substring(pos));
        return String.join(parts, '');
    }

    // Removes every tag that starts with 'prefix' (for example '<meta') up to its closing '>'. The character after the name must end the name,
    // so '<head' does not remove '<header'.
    private static String dropTags(String html, String prefix) {
        String low = html.toLowerCase();
        List<String> parts = new List<String>();
        Integer pos = 0;
        while (true) {
            Integer start = low.indexOf(prefix, pos);
            if (start < 0) { break; }
            Integer after = start + prefix.length();
            String next = low.substring(after, Math.min(low.length(), after + 1));
            if (next != '>' && next != '/' && !next.isWhitespace()) {
                parts.add(html.substring(pos, after));
                pos = after;
                continue;
            }
            Integer gt = low.indexOf('>', start);
            if (gt < 0) { break; }
            parts.add(html.substring(pos, start));
            pos = gt + 1;
        }
        parts.add(html.substring(pos));
        return String.join(parts, '');
    }

    // The text of rte_tbl/rte_tbl1.css. The page links that stylesheet from a static resource, which Blob.toPdf cannot fetch, so in HTML mode the
    // page writes it inline. DxRteTableCss is a plain-text copy of the same file (a Jest test keeps the two identical).
    public static String rteTableCss() {
        String full = PdfEngine.class.getName();
        String ns = full.contains('.') ? full.substringBefore('.') : null;
        List<StaticResource> copies = [SELECT Body FROM StaticResource WHERE Name = 'DxRteTableCss' AND NamespacePrefix = :ns WITH USER_MODE LIMIT 1];
        return copies.isEmpty() ? '' : copies[0].Body.toString();
    }
}
