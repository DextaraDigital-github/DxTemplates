@IsTest
private class TemplateLifecycle_Test {
    private static String relatedType() {
        return Document_Template__c.Related_To_Type__c.getDescribe().getPicklistValues()[0].getValue();
    }

    private static Document_Template__c makeRoot(String name) {
        Document_Template__c root = new Document_Template__c(Name = name, Related_To_Type__c = relatedType());
        insert root;
        root.Parent_Template__c = root.Id;
        root.Version_Number__c = 1;
        root.External_ID__c = root.Id;
        update root;
        return root;
    }

    private static Document_Template__c makeVersion(Document_Template__c root, Integer version) {
        Document_Template__c v = new Document_Template__c(Name = root.Name, Related_To_Type__c = relatedType(), Parent_Template__c = root.Id, Version_Number__c = version);
        insert v;
        return v;
    }

    private static Document_Template__c reload(Id templateId) {
        return [SELECT Id, IsActive__c, Previously_Active__c, Parent_Template__c, Version_Number__c FROM Document_Template__c WHERE Id = :templateId];
    }

    @IsTest
    static void activatingTemplateLocksItAndStaysLockedWhenActivatedAgain() {
        Document_Template__c root = makeRoot('Quote');

        SaveDocumentTemplate.activateTemplate(root.Id, root.Parent_Template__c, true);
        System.assertEquals(true, reload(root.Id).Previously_Active__c, 'locked once it was active');
        SaveDocumentTemplate.activateTemplate(root.Id, root.Parent_Template__c, false);
        System.assertEquals(true, reload(root.Id).Previously_Active__c, 'deactivating does not unlock');
        SaveDocumentTemplate.activateTemplate(root.Id, root.Parent_Template__c, true);

        Document_Template__c again = reload(root.Id);
        System.assertEquals(true, again.IsActive__c);
        System.assertEquals(true, again.Previously_Active__c, 'a second activation must not unlock the template');
    }

    @IsTest
    static void activatingAVersionDeactivatesOnlyTheOtherVersionsOfItsOwnTemplate() {
        Document_Template__c root = makeRoot('Quote');
        Document_Template__c version2 = makeVersion(root, 2);
        Document_Template__c other = makeRoot('Order form');
        SaveDocumentTemplate.activateTemplate(root.Id, root.Parent_Template__c, true);
        SaveDocumentTemplate.activateTemplate(other.Id, other.Parent_Template__c, true);

        SaveDocumentTemplate.activateTemplate(version2.Id, version2.Parent_Template__c, true);

        System.assertEquals(false, reload(root.Id).IsActive__c, 'the other version is switched off');
        System.assertEquals(true, reload(version2.Id).IsActive__c);
        System.assertEquals(true, reload(other.Id).IsActive__c, 'another template is not touched');
    }

    // Templates made before families existed (or by seed scripts) have no parent; activating one of them switched every
    // other template without a parent off.
    @IsTest
    static void activatingATemplateWithoutParentLeavesOtherTemplatesAlone() {
        Document_Template__c a = new Document_Template__c(Name = 'A', Related_To_Type__c = relatedType(), IsActive__c = true);
        Document_Template__c b = new Document_Template__c(Name = 'B', Related_To_Type__c = relatedType(), IsActive__c = true);
        Document_Template__c c = new Document_Template__c(Name = 'C', Related_To_Type__c = relatedType());
        insert new List<Document_Template__c>{ a, b, c };

        SaveDocumentTemplate.activateTemplate(c.Id, null, true);

        System.assertEquals(true, reload(a.Id).IsActive__c);
        System.assertEquals(true, reload(b.Id).IsActive__c);
        System.assertEquals(true, reload(c.Id).IsActive__c);
    }

    @IsTest
    static void deletingATemplateAlsoRemovesItsRulesTranslationsAndWatermarkFiles() {
        Document_Template__c template = makeRoot('Quote');
        Rule__c related = new Rule__c(Rule_Expression__c = 'Condition1');
        Rule__c visibility = new Rule__c(Rule_Expression__c = 'Condition1');
        insert new List<Rule__c>{ related, visibility };
        insert new List<Rule_Condition__c>{
            new Rule_Condition__c(Name = 'Condition1', Rule__c = related.Id, Condition_Field__c = 'amount', Operator__c = '>', Value__c = '1'),
            new Rule_Condition__c(Name = 'Condition1', Rule__c = visibility.Id, Condition_Field__c = 'type', Operator__c = '==', Value__c = 'x')
        };
        insert new List<Document_Template_Section__c>{
            new Document_Template_Section__c(Name = 'Opps', Document_Template__c = template.Id, Type__c = 'Related Objects', Sequence__c = 0, RuleId__c = related.Id),
            new Document_Template_Section__c(Name = 'Intro', Document_Template__c = template.Id, Type__c = 'Context', Sequence__c = 1, Section_Visibility_Rule__c = visibility.Id)
        };
        insert new Translator__c(Name = 'Hello', DocumentTemplate__c = template.Id, FieldValue__c = 'Hello', Language__c = 'fr', Translated_Value__c = 'Bonjour');
        insert new ContentVersion(Title = 'Mark', PathOnClient = 'mark.png', VersionData = Blob.valueOf('x'), FirstPublishLocationId = template.Id);
        Document_Template__c survivor = makeRoot('Other');
        Rule__c survivorRule = new Rule__c(Rule_Expression__c = 'Condition1');
        insert survivorRule;

        SaveDocumentTemplate.deleteTemplate(template.Id);

        System.assertEquals(0, [SELECT COUNT() FROM Document_Template__c WHERE Id = :template.Id]);
        System.assertEquals(0, [SELECT COUNT() FROM Rule__c WHERE Id IN :new List<Id>{ related.Id, visibility.Id }], 'filter and visibility rules of the template');
        System.assertEquals(0, [SELECT COUNT() FROM Rule_Condition__c WHERE Rule__c IN :new List<Id>{ related.Id, visibility.Id }]);
        System.assertEquals(0, [SELECT COUNT() FROM Translator__c WHERE FieldValue__c = 'Hello'], 'its translations');
        System.assertEquals(0, [SELECT COUNT() FROM ContentDocument WHERE Title = 'Mark'], 'its watermark file');
        System.assertEquals(1, [SELECT COUNT() FROM Document_Template__c WHERE Id = :survivor.Id], 'other templates stay');
        System.assertEquals(1, [SELECT COUNT() FROM Rule__c WHERE Id = :survivorRule.Id], 'rules of other templates stay');
    }

    @IsTest
    static void deletingTheFirstVersionMakesTheLowestRemainingVersionTheRoot() {
        Document_Template__c root = makeRoot('Quote');
        Document_Template__c v3 = makeVersion(root, 3);
        Document_Template__c v2 = makeVersion(root, 2);

        SaveDocumentTemplate.deleteTemplate(root.Id);

        System.assertEquals(v2.Id, reload(v2.Id).Parent_Template__c, 'version 2 is the new root');
        System.assertEquals(v2.Id, reload(v3.Id).Parent_Template__c);
    }

    @IsTest
    static void deletingALaterVersionLeavesTheOthersWhereTheyAre() {
        Document_Template__c root = makeRoot('Quote');
        Document_Template__c v2 = makeVersion(root, 2);
        Document_Template__c v3 = makeVersion(root, 3);

        SaveDocumentTemplate.deleteTemplate(v2.Id);

        System.assertEquals(root.Id, reload(root.Id).Parent_Template__c);
        System.assertEquals(root.Id, reload(v3.Id).Parent_Template__c);
        System.assertEquals(2, [SELECT COUNT() FROM Document_Template__c]);
    }
}
