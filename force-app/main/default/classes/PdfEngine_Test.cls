// Tests of the engine switch (PdfEngine): the setting, the choice of route, the HTML clean-up for Blob.toPdf and the fall back to Visualforce.
// See docs/experiments/parity-poc/README.md for why the clean-up is needed and docs/architecture for the switch.
@IsTest
private class PdfEngine_Test {
    // bytes of a Blob as text, one character per byte (Blob.toString() fails on the binary parts of a PDF)
    private static String latin1(Blob b) {
        String hex = EncodingUtil.convertToHex(b);
        String digits = '0123456789abcdef';
        List<Integer> chars = new List<Integer>();
        for (Integer i = 0; i < hex.length(); i += 2) { chars.add(digits.indexOf(hex.substring(i, i + 1)) * 16 + digits.indexOf(hex.substring(i + 1, i + 2))); }
        return String.fromCharArray(chars);
    }

    @IsTest
    static void theDirectEngineIsOffUntilTheAdminTurnsItOn() {
        System.assertEquals(false, PdfEngine.useDirectEngine(), 'the packaged Default record is off');
        PdfEngine.testSetting = true;
        System.assertEquals(true, PdfEngine.useDirectEngine());
    }

    @IsTest
    static void withTheSwitchOffTheVisualforceRouteIsUsedAsBefore() {
        // in a test the Visualforce route returns the placeholder text, as the code did before the switch existed
        Blob pdf = PdfEngine.render('a00000000000000', 'A4', 'Portrait');
        System.assertEquals('Test', pdf.toString());
    }

    @IsTest
    static void withTheSwitchOnABlobToPdfPdfIsMade() {
        PdfEngine.testSetting = true;
        PdfEngine.testHtml = '<html><head><style media="print">@page { size: A4; margin: 40px; }</style></head><body><p>Direct engine</p></body></html>';
        Blob pdf = PdfEngine.render('a00000000000000', 'A4', 'Portrait');
        String text = latin1(pdf);
        System.assert(text.startsWith('%PDF-'), 'a real PDF: ' + text.left(20));
        System.assert(text.contains('/MediaBox[0 0 595.28 841.88]'), 'the page rule inside media="print" was applied (A4)');
    }

    // A failure of the direct engine must not lose the document: the Visualforce route takes over and the failure is logged.
    @IsTest
    static void ifTheDirectEngineFailsTheVisualforceRouteTakesOverAndTheFailureIsLogged() {
        PdfEngine.testSetting = true;
        PdfEngine.testFailDirect = true;
        Blob pdf = PdfEngine.render('a00000000000000', 'A4', 'Portrait');
        System.assertEquals('Test', pdf.toString(), 'the Visualforce route answered');
        List<TransactionLog__c> logs = [SELECT Process_Name__c, LogMessage__c FROM TransactionLog__c];
        System.assertEquals(1, logs.size());
        System.assertEquals('PdfEngine.render()', logs[0].Process_Name__c);
    }

    @IsTest
    static void theHtmlOfTheVisualforcePageIsRebuiltAsOneHeadWithAllStylesAndOneBodyWithoutScripts() {
        String page = '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">'
            + '<head><script src="/static/stub.js"></script><script>try{ x(); }catch(e){}</script><style>@page { size: A4; }</style></head>'
            + '<head><meta http-equiv="Content-Type" content="text/html;charset=UTF-8" /><link rel="stylesheet" href="/resource/x.css"/>'
            + '<style type="text/css" media="print">p { margin: 0; } @page :first { margin: 0; }</style></head>'
            + '<header>keep this tag</header><div class="content"><p>Body text</p></div>';
        String result = PdfEngine.normalizeForToPdf(page);
        System.assert(result.startsWith('<html><head><style>'), result.left(60));
        System.assert(result.contains('@page { size: A4; }') && result.contains('@page :first'), 'both style blocks kept');
        System.assert(!result.contains('media='), 'the media attribute is gone, so the page rules apply');
        System.assert(!result.contains('<script') && !result.contains('<meta') && !result.contains('<link') && !result.containsIgnoreCase('<!doctype'), result);
        System.assertEquals(1, result.split('<head>').size() - 1, 'one head');
        System.assert(result.contains('<header>keep this tag</header>'), 'a tag that only starts with "head" is not removed');
        System.assert(result.contains('<p>Body text</p>') && result.endsWith('</body></html>'));
    }

    // A regex fails with "Regex too complicated" on documents of about 1 MB and more; the clean-up must not use one on the body.
    @IsTest
    static void aVeryLargeDocumentIsCleanedWithoutAnyRegexLimit() {
        String row = '<tr><td>' + 'x'.repeat(40) + '</td><td>y</td></tr>';
        String body = '<table>' + row.repeat(30000) + '</table>';          // about 1.6 million characters
        String result = PdfEngine.normalizeForToPdf('<head><style>p{}</style></head><meta charset="utf-8"/>' + body);
        System.assert(result.length() > 1500000, 'size ' + result.length());
        System.assert(result.contains('<style>p{}</style>') && !result.contains('<meta'));
    }

    @IsTest
    static void thePageAsksForHtmlOnlyWithTheEngineParameter() {
        System.assertEquals(true, DisplayPDFController.isHtmlRequested(new Map<String, String>{ 'engine' => 'html' }));
        System.assertEquals(false, DisplayPDFController.isHtmlRequested(new Map<String, String>{ 'engine' => 'pdf' }));
        System.assertEquals(false, DisplayPDFController.isHtmlRequested(new Map<String, String>()));
        System.assertEquals(false, DisplayPDFController.isHtmlRequested(null));
    }

    @IsTest
    static void theTableStylesheetIsAvailableAsPlainTextForTheDirectEngine() {
        String css = PdfEngine.rteTableCss();
        System.assert(css.length() > 1000, 'static resource DxRteTableCss is read: ' + css.length());
        System.assert(css.contains('.dxqt'), 'it is the rte_tbl1.css text');
    }
}
