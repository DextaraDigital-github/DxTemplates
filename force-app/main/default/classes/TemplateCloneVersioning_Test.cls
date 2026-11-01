@IsTest
private class TemplateCloneVersioning_Test {
    private static String relatedType() {
        return Document_Template__c.Related_To_Type__c.getDescribe().getPicklistValues()[0].getValue();
    }

    // A template as "New template" makes it: its own parent, version 1, its own id as external id.
    private static Document_Template__c makeRoot(String name) {
        Document_Template__c root = new Document_Template__c(Name = name, Related_To_Type__c = relatedType());
        insert root;
        root.Parent_Template__c = root.Id;
        root.Version_Number__c = 1;
        root.External_ID__c = root.Id;
        update root;
        return root;
    }

    // What the clone dialog sends for "New Version": the parent of the selected template.
    private static Document_Template__c newVersionOf(Document_Template__c selected, String name) {
        Document_Template__c sent = new Document_Template__c(Name = name, Related_To_Type__c = relatedType(), Parent_Template__c = selected.Parent_Template__c);
        return SaveDocumentTemplate.cloneDocumentTemplate(sent, selected.Id);
    }

    // What the dialog sends for "New Template": no parent (the new template starts its own family).
    private static Document_Template__c newTemplateFrom(Document_Template__c selected, String name) {
        Document_Template__c sent = new Document_Template__c(Name = name, Related_To_Type__c = relatedType());
        return SaveDocumentTemplate.cloneDocumentTemplate(sent, selected.Id);
    }

    private static Document_Template__c reload(Id templateId) {
        return [SELECT Id, Version_Number__c, Parent_Template__c, External_ID__c FROM Document_Template__c WHERE Id = :templateId];
    }

    @IsTest
    static void newVersionOfTheFirstTemplateIsVersionTwoOfTheSameFamily() {
        Document_Template__c root = makeRoot('Quote');

        Document_Template__c made = reload(newVersionOf(root, 'Quote').Id);

        System.assertEquals(2, made.Version_Number__c);
        System.assertEquals(root.Id, made.Parent_Template__c);
        System.assertEquals(made.Id, made.External_ID__c);
    }

    @IsTest
    static void newVersionOfALaterVersionContinuesTheNumbering() {
        Document_Template__c root = makeRoot('Quote');
        Document_Template__c second = reload(newVersionOf(root, 'Quote').Id);

        Document_Template__c third = reload(newVersionOf(second, 'Quote').Id);

        System.assertEquals(3, third.Version_Number__c);
        System.assertEquals(root.Id, third.Parent_Template__c);
    }

    @IsTest
    static void aNewTemplateStartsItsOwnFamilyAndDoesNotJoinTheSource() {
        Document_Template__c source = makeRoot('Quote');

        Document_Template__c made = reload(newTemplateFrom(source, 'Order form').Id);

        System.assertEquals(1, made.Version_Number__c);
        System.assertEquals(made.Id, made.Parent_Template__c, 'its own root');
        System.assertEquals(made.Id, made.External_ID__c);
        System.assertNotEquals(source.Parent_Template__c, made.Parent_Template__c);
    }

    @IsTest
    static void aNewVersionOfAnewTemplateBelongsToThatTemplateNotToTheSource() {
        Document_Template__c source = makeRoot('Quote');
        Document_Template__c made = reload(newTemplateFrom(source, 'Order form').Id);

        Document_Template__c version = reload(newVersionOf(made, 'Order form').Id);

        System.assertEquals(2, version.Version_Number__c);
        System.assertEquals(made.Id, version.Parent_Template__c);
    }
}
