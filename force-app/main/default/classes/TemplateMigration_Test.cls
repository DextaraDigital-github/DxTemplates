@IsTest
private class TemplateMigration_Test {
    private static final String PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    private static String relatedType() {
        return Document_Template__c.Related_To_Type__c.getDescribe().getPicklistValues()[0].getValue();
    }

    private static ContentVersion makeFile(String title) {
        ContentVersion cv = new ContentVersion(Title = title, PathOnClient = title + '.png', VersionData = EncodingUtil.base64Decode(PNG));
        insert cv;
        return [SELECT Id, Title FROM ContentVersion WHERE Id = :cv.Id];
    }

    // One template with every kind of link: a visibility rule, a Related Objects rule (both WITHOUT an external id, as
    // rules saved later are), a clause, a picture in the text, a watermark file and translations.
    private static Document_Template__c makeSource(String name, ContentVersion picture, ContentVersion watermark) {
        Document_Template__c template = new Document_Template__c(Name = name, Related_To_Type__c = relatedType(), Version_Number__c = 1, Description__c = 'Source description');
        insert template;
        template.Watermark_Data__c = '[{"name":"Text","isPrimary":true,"contentVersionID":"' + watermark.Id + '"}]';
        update template;

        Rule__c visibility = new Rule__c(Rule_Expression__c = 'Condition1', Rule_Description__c = 'visibility');
        Rule__c related = new Rule__c(Rule_Expression__c = 'Condition1', Rule_Description__c = 'related objects');
        insert new List<Rule__c>{ visibility, related };
        insert new List<Rule_Condition__c>{
            new Rule_Condition__c(Name = 'Condition1', Rule__c = visibility.Id, Condition_Field__c = 'type', Operator__c = '==', Value__c = 'Customer'),
            new Rule_Condition__c(Name = 'Condition1', Rule__c = related.Id, Condition_Field__c = 'amount', Operator__c = '>', Value__c = '10')
        };
        Document_Clause__c clause = new Document_Clause__c(Name = 'Payment', Body__c = '<p>Pay</p>', IsActive__c = true, External_ID__c = name + '-clause');
        insert clause;

        insert new List<Document_Template_Section__c>{
            new Document_Template_Section__c(Name = 'Header', Document_Template__c = template.Id, Type__c = 'Header', Sequence__c = -1),
            new Document_Template_Section__c(Name = 'Intro', Document_Template__c = template.Id, Type__c = 'Context', Sequence__c = 0,
                Section_Content__c = '<p><img src="/sfc/servlet.shepherd/version/download/' + picture.Id + '"></p>', Section_Visibility_Rule__c = visibility.Id),
            new Document_Template_Section__c(Name = 'Opps', Document_Template__c = template.Id, Type__c = 'Related Objects', Sequence__c = 1, RuleId__c = related.Id),
            new Document_Template_Section__c(Name = 'Terms', Document_Template__c = template.Id, Type__c = 'Clause', Sequence__c = 2, Document_Clause__c = clause.Id),
            new Document_Template_Section__c(Name = 'Plain', Document_Template__c = template.Id, Type__c = 'Context', Sequence__c = 3, Section_Content__c = '<p>Plain</p>')
        };
        insert new List<Translator__c>{
            new Translator__c(Name = 'Hello', DocumentTemplate__c = template.Id, FieldValue__c = 'Hello', Language__c = 'fr', Translated_Value__c = 'Bonjour'),
            new Translator__c(Name = 'Bye', DocumentTemplate__c = template.Id, FieldValue__c = 'Bye', Language__c = 'fr', Translated_Value__c = 'Au revoir')
        };
        return template;
    }

    private static Id sectionId(Id templateId, String name) {
        return [SELECT Id FROM Document_Template_Section__c WHERE Document_Template__c = :templateId AND Name = :name].Id;
    }

    @IsTest
    static void exportCarriesOnlySelectedTemplatesAndTheirFiles() {
        ContentVersion picture = makeFile('Logo');
        ContentVersion watermark = makeFile('Mark');
        Document_Template__c selected = makeSource('Selected', picture, watermark);
        Document_Template__c other = makeSource('Other', picture, watermark);

        Map<String, Object> file = (Map<String, Object>) JSON.deserializeUntyped(TemplateMigration.exportData(new List<String>{ selected.Id }));

        System.assertEquals(1, ((List<Object>) file.get('Templates')).size());
        System.assertEquals(5, ((List<Object>) file.get('Template Sections')).size());
        System.assertEquals(2, ((List<Object>) file.get('Translations')).size(), 'only the translations of the selected template');
        System.assertEquals(2, ((List<Object>) file.get('Rules')).size());
        System.assertEquals(2, ((List<Object>) file.get('Rule Conditions')).size(), 'conditions travel although the rules have no external id');
        System.assertEquals(1, ((List<Object>) file.get('Document Clauses')).size());
        System.assertEquals(2, ((List<Object>) file.get('Files')).size(), 'the picture and the watermark file');
        System.assertNotEquals(null, other.Id);
    }

    @IsTest
    static void importRebuildsEveryLinkOnTheNewRecords() {
        ContentVersion picture = makeFile('Logo');
        ContentVersion watermark = makeFile('Mark');
        Document_Template__c source = makeSource('Quote', picture, watermark);
        String file = TemplateMigration.exportData(new List<String>{ source.Id });

        Map<String, Object> result = TemplateMigration.importData(file);

        Document_Template__c copy = [SELECT Id, Version_Number__c, Description__c, IsActive__c, Watermark_Data__c FROM Document_Template__c WHERE Name = 'Quote' AND Id != :source.Id];
        System.assertEquals(2, copy.Version_Number__c, 'next version of the template with the same name');
        System.assertEquals('Source description', copy.Description__c);
        System.assertEquals(false, copy.IsActive__c);
        System.assertEquals(1, ((List<Object>) result.get('templates')).size());

        Map<String, Document_Template_Section__c> sections = new Map<String, Document_Template_Section__c>();
        for (Document_Template_Section__c section : [SELECT Name, RuleId__c, Section_Visibility_Rule__c, Document_Clause__c, Section_Content__c FROM Document_Template_Section__c WHERE Document_Template__c = :copy.Id]) {
            sections.put(section.Name, section);
        }
        System.assertEquals(5, sections.size());

        // the Related Objects rule only on the Related Objects section, the visibility rule only on its section
        System.assertNotEquals(null, sections.get('Opps').RuleId__c);
        for (String name : new List<String>{ 'Header', 'Intro', 'Terms', 'Plain' }) {
            System.assertEquals(null, sections.get(name).RuleId__c, name + ' must not get the Related Objects rule');
        }
        System.assertNotEquals(null, sections.get('Intro').Section_Visibility_Rule__c);
        System.assertEquals(null, sections.get('Plain').Section_Visibility_Rule__c);
        System.assertNotEquals(sectionId(source.Id, 'Opps'), sections.get('Opps').Id);

        // each condition belongs to the copy of its own rule
        Rule_Condition__c visibilityCondition = [SELECT Condition_Field__c FROM Rule_Condition__c WHERE Rule__c = :sections.get('Intro').Section_Visibility_Rule__c];
        Rule_Condition__c relatedCondition = [SELECT Condition_Field__c FROM Rule_Condition__c WHERE Rule__c = :sections.get('Opps').RuleId__c];
        System.assertEquals('type', visibilityCondition.Condition_Field__c);
        System.assertEquals('amount', relatedCondition.Condition_Field__c);

        // the clause is the existing clause of the same external id, not a second copy
        System.assertEquals(1, [SELECT COUNT() FROM Document_Clause__c]);
        System.assertEquals(source.Id == null ? null : [SELECT Id FROM Document_Clause__c].Id, sections.get('Terms').Document_Clause__c);

        // translations
        System.assertEquals(2, [SELECT COUNT() FROM Translator__c WHERE DocumentTemplate__c = :copy.Id]);

        // the picture and the watermark file were re-created and the references point to the new files
        List<ContentVersion> copies = [SELECT Id, Title FROM ContentVersion WHERE Id NOT IN :new List<Id>{ picture.Id, watermark.Id }];
        System.assertEquals(2, copies.size());
        Map<String, Id> byTitle = new Map<String, Id>();
        for (ContentVersion cv : copies) { byTitle.put(cv.Title, cv.Id); }
        System.assert(sections.get('Intro').Section_Content__c.contains(byTitle.get('Logo')));
        System.assert(!sections.get('Intro').Section_Content__c.contains(picture.Id));
        System.assert(copy.Watermark_Data__c.contains(byTitle.get('Mark')));
        System.assert(!copy.Watermark_Data__c.contains(watermark.Id));
    }

    @IsTest
    static void importingTheSameFileAgainMakesTheNextVersion() {
        Document_Template__c source = makeSource('Quote', makeFile('Logo'), makeFile('Mark'));
        String file = TemplateMigration.exportData(new List<String>{ source.Id });

        TemplateMigration.importData(file);
        TemplateMigration.importData(file);

        System.assertEquals(3, [SELECT COUNT() FROM Document_Template__c WHERE Name = 'Quote']);
        System.assertEquals(3, [SELECT MAX(Version_Number__c) m FROM Document_Template__c WHERE Name = 'Quote'][0].get('m'));
    }

    @IsTest
    static void aFileOfTheOldFormatIsStillAccepted() {
        String oldFile = '{"Templates":[{"Id":"a00000000000001AAA","Name":"Old format","DxCPQ__Related_To_Type__c":"' + relatedType() + '"}],'
            + '"Template Sections":[{"Name":"S1","DxCPQ__Document_Template__c":"a00000000000001AAA","DxCPQ__Type__c":"Context","DxCPQ__Sequence__c":0,"DxCPQ__External_Document_Template__c":"a00000000000001AAA"}],'
            + '"Rules":[],"Rule Conditions":[],"Document Clauses":[]}';

        TemplateMigration.importData(oldFile);

        System.assertEquals(1, [SELECT COUNT() FROM Document_Template_Section__c WHERE Document_Template__r.Name = 'Old format']);
    }

    @IsTest
    static void importIgnoresFieldsThatAreNotPartOfATemplate() {
        String file = '{"Templates":[{"Id":"a00000000000001AAA","Name":"Tampered","DxCPQ__Related_To_Type__c":"' + relatedType() + '","DxCPQ__IsActive__c":true,"DxCPQ__Previously_Active__c":true,"CreatedDate":"2001-01-01T00:00:00.000Z"}],"Template Sections":[]}';

        TemplateMigration.importData(file);

        Document_Template__c copy = [SELECT IsActive__c, Previously_Active__c, CreatedDate FROM Document_Template__c WHERE Name = 'Tampered'];
        System.assertEquals(false, copy.IsActive__c);
        System.assertEquals(false, copy.Previously_Active__c);
        System.assert(copy.CreatedDate.year() > 2001);
    }

    @IsTest
    static void aProblemRollsBackEverything() {
        String file = '{"Templates":[{"Id":"a00000000000001AAA","Name":"Good","DxCPQ__Related_To_Type__c":"' + relatedType() + '"},'
            + '{"Id":"a00000000000002AAA","Name":"Bad","DxCPQ__Related_To_Type__c":"NoSuchObject__c"}],"Template Sections":[]}';

        try {
            TemplateMigration.importData(file);
            System.assert(false, 'must fail');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('NoSuchObject__c'), e.getMessage());
        }
        System.assertEquals(0, [SELECT COUNT() FROM Document_Template__c], 'nothing may be left behind');
    }

    @IsTest
    static void aFileThatIsNotATemplateFileIsRefusedWithAMessage() {
        for (String bad : new List<String>{ 'not json', '[]', '{"Other":1}' }) {
            try {
                TemplateMigration.importData(bad);
                System.assert(false, 'must fail: ' + bad);
            } catch (AuraHandledException e) {
                System.assert(String.isNotBlank(e.getMessage()));
            }
        }
    }

    @IsTest
    static void theTemplateListOffersNameAndVersion() {
        makeSource('Listed', makeFile('Logo'), makeFile('Mark'));
        List<Map<String, Object>> rows = TemplateMigration.listTemplates();
        System.assertEquals(1, rows.size());
        System.assertEquals('Listed', rows[0].get('name'));
        System.assertEquals(1, rows[0].get('version'));
    }

    @IsTest
    static void aClassOrFlowOfTheSourceIsReportedAsSomethingToSetAgain() {
        Document_Template__c source = makeSource('WithFlow', makeFile('Logo'), makeFile('Mark'));
        source.FlowId__c = 'SomeFlowId';
        update source;
        String file = TemplateMigration.exportData(new List<String>{ source.Id });

        Map<String, Object> result = TemplateMigration.importData(file);

        List<Object> warnings = (List<Object>) result.get('warnings');
        System.assertEquals(1, warnings.size());
        System.assert(((String) warnings[0]).contains('WithFlow'));
    }
}
