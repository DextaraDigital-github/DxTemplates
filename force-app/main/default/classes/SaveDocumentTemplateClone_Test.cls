@isTest
private class SaveDocumentTemplateClone_Test {

    private static Rule__c insertRuleWithCondition(String expression, String value) {
        Rule__c rule = new Rule__c(Rule_Expression__c = expression, Rule_Description__c = 'Test rule');
        insert rule;
        insert new Rule_Condition__c(Rule__c = rule.Id, Name = 'Condition1', Operator__c = '==', Evaluation_Object__c = 'Account',
            Condition_Field__c = 'name', DataType__c = 'STRING', Value__c = value, ConditionIndex__c = '1');
        return rule;
    }

    // Cloning a template must copy both rules of a section: the data filter (RuleId__c) and the section visibility rule.
    // Each copy is its own Rule record with its own conditions, so editing the clone does not change the original.
    @isTest
    static void cloneTemplateCopiesFilterAndVisibilityRulesOfASection() {
        User us = DexUtilTestDataFactory.CreateTestUser();
        System.runAs(us) {
            Document_Template__c original = DexUtilTestDataFactory.createDocumentTemplate(1, true, null)[0];
            Rule__c filterRule = insertRuleWithCondition('1', 'filterValue');
            Rule__c visibilityRule = insertRuleWithCondition('1', 'visibilityValue');
            insert new Document_Template_Section__c(Name = 'RO', Document_Template__c = original.Id, Type__c = 'Related Objects',
                Sequence__c = 1, RuleId__c = filterRule.Id, Section_Visibility_Rule__c = visibilityRule.Id);

            Test.startTest();
            Document_Template__c cloneRequest = new Document_Template__c(Name = 'Clone of test', Related_To_Type__c = original.Related_To_Type__c,
                Parent_Template__c = original.Id, Version_Number__c = 1);
            Document_Template__c cloned = SaveDocumentTemplate.cloneDocumentTemplate(cloneRequest, original.Id);
            Test.stopTest();

            System.assertNotEquals(null, cloned, 'the template should have been cloned');
            List<Document_Template_Section__c> sections = [SELECT RuleId__c, Section_Visibility_Rule__c FROM Document_Template_Section__c WHERE Document_Template__c = :cloned.Id];
            System.assertEquals(1, sections.size());

            System.assertNotEquals(null, sections[0].RuleId__c, 'the filter rule should be copied');
            System.assertNotEquals(filterRule.Id, sections[0].RuleId__c, 'the filter rule should be a separate record');
            System.assertNotEquals(null, sections[0].Section_Visibility_Rule__c, 'the visibility rule should be copied');
            System.assertNotEquals(visibilityRule.Id, sections[0].Section_Visibility_Rule__c, 'the visibility rule should be a separate record');
            System.assertNotEquals(sections[0].RuleId__c, sections[0].Section_Visibility_Rule__c, 'the two copies should not be mixed up');

            List<Rule_Condition__c> visibilityCopy = [SELECT Value__c FROM Rule_Condition__c WHERE Rule__c = :sections[0].Section_Visibility_Rule__c];
            System.assertEquals(1, visibilityCopy.size());
            System.assertEquals('visibilityValue', visibilityCopy[0].Value__c, 'the visibility copy keeps its own condition, not the filter condition');
            List<Rule_Condition__c> filterCopy = [SELECT Value__c FROM Rule_Condition__c WHERE Rule__c = :sections[0].RuleId__c];
            System.assertEquals('filterValue', filterCopy[0].Value__c);
        }
    }

    @isTest
    static void cloneTemplateKeepsSectionsWithoutRulesWithoutRules() {
        User us = DexUtilTestDataFactory.CreateTestUser();
        System.runAs(us) {
            Document_Template__c original = DexUtilTestDataFactory.createDocumentTemplate(1, true, null)[0];
            insert new Document_Template_Section__c(Name = 'Plain', Document_Template__c = original.Id, Type__c = 'Context', Sequence__c = 1);

            Test.startTest();
            Document_Template__c cloneRequest = new Document_Template__c(Name = 'Clone of plain', Related_To_Type__c = original.Related_To_Type__c,
                Parent_Template__c = original.Id, Version_Number__c = 1);
            Document_Template__c cloned = SaveDocumentTemplate.cloneDocumentTemplate(cloneRequest, original.Id);
            Test.stopTest();

            List<Document_Template_Section__c> sections = [SELECT RuleId__c, Section_Visibility_Rule__c FROM Document_Template_Section__c WHERE Document_Template__c = :cloned.Id];
            System.assertEquals(1, sections.size());
            System.assertEquals(null, sections[0].RuleId__c);
            System.assertEquals(null, sections[0].Section_Visibility_Rule__c);
        }
    }
}
