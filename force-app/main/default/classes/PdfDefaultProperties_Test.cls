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
}
