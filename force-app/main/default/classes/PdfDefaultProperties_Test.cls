@IsTest
private class PdfDefaultProperties_Test {
    // A template that was never opened in the designer has no saved Page Properties. Generation from a Flow, the API or the
    // chained automation reads the template straight away, so the PDF page must work with the designer's defaults.
    @IsTest
    static void aTemplateWithoutSavedPagePropertiesStillGivesThePdfPageItsContent() {
        Document_Template__c template = new Document_Template__c(Name = 'Never opened', Related_To_Type__c = 'Account');
        insert template;
        Document__c document = new Document__c(Document_Template__c = template.Id, Document_Body__c = '<p>Body text</p>', Sequence__c = 0);
        insert document;

        Test.setCurrentPage(Page.renderAsPdfLWC);
        ApexPages.currentPage().getParameters().put('documentid', document.Id);
        ApexPages.currentPage().getParameters().put('selectedPageSize', 'A4');
        ApexPages.currentPage().getParameters().put('selectedPageOrientation', 'Portrait');

        DisplayPDFController controller = new DisplayPDFController();

        System.assertNotEquals(null, controller.displayText, 'the body is read');
        System.assert(controller.displayText.contains('Body text'), controller.displayText);
        System.assertNotEquals(null, controller.marPadList, 'the page margins come from the defaults');
        System.assertNotEquals(null, controller.marPadList.get('Margin-left'));
    }

    // A footer whose cells have no side padding is laid out by the PDF engine with the left cell squeezed, the middle cell at the
    // page edge and the right cell cut off the page (found in the real PDF), so the defaults keep the footers padded like the headers.
    @IsTest
    static void theDefaultFooterCellsHaveSidePadding() {
        Map<String, Object> footers = (Map<String, Object>) ((Map<String, Object>) JSON.deserializeUntyped(DefaultPageProperties.JSON_TEXT)).get('footerJSONVal');
        for (String cell : new List<String>{ 'footer_left', 'footer_center', 'footer_right' }) {
            String css = (String) footers.get(cell);
            System.assert(css.contains('padding-left: 10px'), cell + ': ' + css);
            System.assert(css.contains('padding-right: 10px'), cell + ': ' + css);
        }
    }

    // The first-page header cells of the defaults must be padded like the others and have the designer's white background
    // (they were black behind black text, and unpadded cells are laid out wrongly by the PDF engine).
    @IsTest
    static void theDefaultFirstPageHeaderCellsArePaddedAndWhite() {
        Map<String, Object> headers = (Map<String, Object>) ((Map<String, Object>) JSON.deserializeUntyped(DefaultPageProperties.JSON_TEXT)).get('headerJSONVal');
        for (String cell : new List<String>{ 'first_header_left', 'first_header_center', 'first_header_right' }) {
            String css = (String) headers.get(cell);
            System.assert(css.contains('padding-left: 10px'), cell + ': ' + css);
            System.assert(css.contains('padding-right: 10px'), cell + ': ' + css);
            System.assert(css.contains('background-color:#FFFFFF'), cell + ': ' + css);
        }
    }

    // A header or footer cell without side padding puts its text on the page edge and the PDF engine lays such a cell out wrongly
    // (found in the real PDF), so the server raises left and right padding given in px to at least the minimum. Larger values stay.
    @IsTest
    static void smallSidePaddingOfAHeaderOrFooterCellIsRaisedToTheMinimum() {
        String css = DisplayPDFController.ensureMinimumSidePadding('div.footer_left { padding-left: 0px; padding-right:5px; padding-top: 0px; }');
        System.assert(css.contains('padding-left: 10px'), css);
        System.assert(css.contains('padding-right:10px'), css);
        System.assert(css.contains('padding-top: 0px'), 'top padding is not touched: ' + css);
        String large = DisplayPDFController.ensureMinimumSidePadding('div.header_left { padding-left: 100px; padding-right: 70.5px; }');
        System.assertEquals('div.header_left { padding-left: 100px; padding-right: 70.5px; }', large);
    }

    @IsTest
    static void aCellWithoutSidePaddingGetsTheMinimumAndAPaddingShorthandIsLeftAlone() {
        String added = DisplayPDFController.ensureMinimumSidePadding('div.header_left { width: 100%; }');
        System.assert(added.contains('padding-left: 10px') && added.contains('padding-right: 10px'), added);
        System.assert(added.endsWith('}'), added);
        String shorthand = 'div.header_left { padding: 0px 3px; }';
        System.assertEquals(shorthand, DisplayPDFController.ensureMinimumSidePadding(shorthand));
        System.assertEquals(null, DisplayPDFController.ensureMinimumSidePadding(null));
    }

    @IsTest
    static void onlyHeaderAndFooterStylesAreChangedWhenThePageStylesAreSanitized() {
        Map<String, String> result = DisplayPDFController.getSanitizedHeaderJSON(new Map<String, String>{
            'footer_left' => 'div.footer_left { padding-left: 0px; }',
            'first_header_right' => 'div.first_header_right {\n padding-left: 1px;\n padding-right: 1px; }',
            'Table' => 'table { padding-left: 0px; }'
        });
        System.assert(result.get('footer_left').contains('padding-left: 10px'), result.get('footer_left'));
        System.assert(result.get('first_header_right').contains('padding-left: 10px') && result.get('first_header_right').contains('padding-right: 10px'), result.get('first_header_right'));
        System.assertEquals('table { padding-left: 0px; }', result.get('Table'));
    }
}
