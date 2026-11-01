@IsTest
private class AutomationGeneration_Test {
    // Generation without the browser (the Flow action, the API, the chained Queueable) loads the sections of ONE record the way the
    // Generate PDF screen does: values from the template's Apex class, embedded tables, merge fields, visibility rules.

    private static Document_Template__c makeTemplate(String name) {
        Document_Template__c template = new Document_Template__c(Name = name, Related_To_Type__c = 'Account');
        insert template;
        return template;
    }

    private static Document_Template_Section__c makeSection(Document_Template__c template, String name, String type, Integer sequence, String content) {
        Document_Template_Section__c section = new Document_Template_Section__c(Name = name, Document_Template__c = template.Id, Type__c = type, Sequence__c = sequence, Section_Content__c = content);
        insert section;
        return section;
    }

    private static String contentOf(List<Document_Template_Section__c> sections, String name) {
        for (Document_Template_Section__c section : sections) { if (section.Name == name) { return section.Section_Content__c; } }
        return null;
    }

    @IsTest
    static void aSectionWhoseVisibilityRuleIsNotMetIsLeftOut() {
        Account account = new Account(Name = 'Acme', Type = 'Prospect');
        insert account;
        Document_Template__c template = makeTemplate('Visible');
        Rule__c rule = new Rule__c(Rule_Expression__c = 'Condition1');
        insert rule;
        insert new Rule_Condition__c(Name = 'Condition1', Rule__c = rule.Id, Condition_Field__c = 'type', Operator__c = '==', Value__c = 'Customer - Direct');
        makeSection(template, 'Always', 'Context', 0, '<p>Always</p>');
        Document_Template_Section__c conditional = makeSection(template, 'Customers only', 'Context', 1, '<p>Customers only</p>');
        conditional.Section_Visibility_Rule__c = rule.Id;
        update conditional;

        List<Document_Template_Section__c> hidden = DisplayPDFController.getTemplateSectionsMulRecords(template.Id, new List<String>{ account.Id }, null);
        System.assertNotEquals(null, contentOf(hidden, 'Always'));
        System.assertEquals(null, contentOf(hidden, 'Customers only'), 'the rule is not met for a prospect');

        account.Type = 'Customer - Direct';
        update account;
        List<Document_Template_Section__c> shown = DisplayPDFController.getTemplateSectionsMulRecords(template.Id, new List<String>{ account.Id }, null);
        System.assertNotEquals(null, contentOf(shown, 'Customers only'), 'the rule is met for a customer');
    }

    @IsTest
    static void valuesOfTheTemplatesApexClassAreMergedIntoTheSections() {
        Account account = new Account(Name = 'Acme');
        insert account;
        Document_Template__c template = makeTemplate('With class');
        template.ClassId__c = [SELECT Id FROM ApexClass WHERE Name = 'PlaceholderTestHandler' LIMIT 1].Id;
        update template;
        makeSection(template, 'Letter', 'Context', 0, '<p>%%Greeting%% (record %%Seen%%) {!Account.Name}</p>');

        List<Document_Template_Section__c> sections = DisplayPDFController.getTemplateSectionsMulRecords(template.Id, new List<String>{ account.Id }, null);

        System.assertEquals('<p>Hello from the class (record ' + account.Id + ') Acme</p>', contentOf(sections, 'Letter'));
    }

    // The screen keeps a copy of the class values on the Document__c; when they are bigger than that field the insert failed, no
    // document was made and the PDF could not be generated at all.
    @IsTest
    static void valuesLargerThanTheFieldThatKeepsThemDoNotStopTheDocumentFromBeingCreated() {
        Account account = new Account(Name = 'Acme');
        insert account;
        Document_Template__c template = makeTemplate('Big class values');
        template.ClassId__c = [SELECT Id FROM ApexClass WHERE Name = 'PlaceholderBigHandler' LIMIT 1].Id;
        update template;
        makeSection(template, 'Lines', 'Table', 0, '<table><thead><tr><th>P</th></tr></thead><tbody><tr><td>%%Lines.Product%%</td></tr></tbody></table>');

        Map<String, Object> data = DisplayPDFController.getTemplateSections(template.Id, account.Id, 'Account');

        System.assertNotEquals(null, data, 'sections are returned');
        System.assertNotEquals(null, data.get('documentId'), 'the document is created');
        List<Document_Template_Section__c> sections = (List<Document_Template_Section__c>) data.get('selectedTemplateContents');
        System.assertEquals(3001, contentOf(sections, 'Lines').countMatches('<tr'), 'all 3000 rows and the header row are printed');
    }

    @IsTest
    static void translationsApplyToGenerationWithoutTheBrowser() {
        Account account = new Account(Name = 'Acme');
        insert account;
        Document_Template__c template = makeTemplate('Translated');
        makeSection(template, 'Letter', 'Context', 0, '<p>&lt;&lt;Hello&gt;&gt;</p>');
        insert new Translator__c(Name = 'Hello', DocumentTemplate__c = template.Id, FieldValue__c = 'Hello', Language__c = 'en_US', Translated_Value__c = 'Welcome');

        List<Document_Template_Section__c> sections = DisplayPDFController.getTemplateSectionsMulRecords(template.Id, new List<String>{ account.Id }, null);

        System.assertEquals('<p>Welcome</p>', contentOf(sections, 'Letter'));
    }

    @IsTest
    static void withSeveralRecordsATokenIsNotLeftAsPlaceholderText() {
        Account first = new Account(Name = 'One');
        Account second = new Account(Name = 'Two');
        insert new List<Account>{ first, second };
        Document_Template__c template = makeTemplate('Several');
        makeSection(template, 'Letter', 'Context', 0, '<p>Dear %%Customer%%</p>');

        List<Document_Template_Section__c> sections = DisplayPDFController.getTemplateSectionsMulRecords(template.Id, new List<String>{ first.Id, second.Id }, null);

        System.assert(!contentOf(sections, 'Letter').contains('%%'), contentOf(sections, 'Letter'));
    }
}
