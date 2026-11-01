@IsTest
private class SectionVisibility_Test {
    // The same cases as lwc/dxShowSelectedTemplate/__tests__/visibilityRules.test.js: the browser decides which sections the
    // Generate PDF screen shows, this class decides it for generation that runs on the server (Flow action, API, chained).
    private static Rule_Condition__c cond(String name, String field, String op, String value) {
        return new Rule_Condition__c(Name = name, Condition_Field__c = field, Operator__c = op, Value__c = value);
    }

    private static Map<String, Object> record() {
        return new Map<String, Object>{ 'Type' => 'Customer - Direct', 'Industry' => 'Technology', 'AnnualRevenue' => 5000000, 'NumberOfEmployees' => 10,
            'IsPartner' => true, 'Description' => null };
    }

    @IsTest
    static void aSingleConditionShowsOrHidesTheSection() {
        List<Rule_Condition__c> c = new List<Rule_Condition__c>{ cond('Condition1', 'type', '==', 'Customer - Direct') };
        System.assertEquals(true, SectionVisibility.isVisible('Condition1', c, record()));
        Map<String, Object> other = record();
        other.put('Type', 'Prospect');
        System.assertEquals(false, SectionVisibility.isVisible('Condition1', c, other));
    }

    @IsTest
    static void eitherSideOfAnOrIsEnough() {
        List<Rule_Condition__c> c = new List<Rule_Condition__c>{ cond('Condition1', 'type', '==', 'Prospect'), cond('Condition2', 'industry', '==', 'Technology') };
        System.assertEquals(true, SectionVisibility.isVisible('Condition1 || Condition2', c, record()));
        System.assertEquals(false, SectionVisibility.isVisible('Condition1 && Condition2', c, record()));
    }

    @IsTest
    static void andBindsTighterThanOrAndParenthesesGroup() {
        List<Rule_Condition__c> c = new List<Rule_Condition__c>{ cond('Condition1', 'industry', '==', 'Technology'), cond('Condition2', 'type', '==', 'Prospect'), cond('Condition3', 'type', '==', 'Prospect') };
        System.assertEquals(true, SectionVisibility.isVisible('Condition1 || Condition2 && Condition3', c, record()));
        System.assertEquals(false, SectionVisibility.isVisible('(Condition1 || Condition2) && Condition3', c, record()));
        System.assertEquals(true, SectionVisibility.isVisible('(Condition1 || Condition2) && Condition1', c, record()));
    }

    @IsTest
    static void numbersCheckboxesAndEmptyFieldsAreComparedAsTheyAre() {
        System.assertEquals(true, SectionVisibility.isVisible('Condition1', new List<Rule_Condition__c>{ cond('Condition1', 'annualrevenue', '==', '5000000') }, record()));
        System.assertEquals(true, SectionVisibility.isVisible('Condition1', new List<Rule_Condition__c>{ cond('Condition1', 'numberofemployees', '>', '9') }, record()));
        System.assertEquals(false, SectionVisibility.isVisible('Condition1', new List<Rule_Condition__c>{ cond('Condition1', 'numberofemployees', '<=', '9') }, record()));
        System.assertEquals(true, SectionVisibility.isVisible('Condition1', new List<Rule_Condition__c>{ cond('Condition1', 'numberofemployees', '>=', '10') }, record()));
        System.assertEquals(false, SectionVisibility.isVisible('Condition1', new List<Rule_Condition__c>{ cond('Condition1', 'numberofemployees', '<', '10') }, record()));
        System.assertEquals(true, SectionVisibility.isVisible('Condition1', new List<Rule_Condition__c>{ cond('Condition1', 'ispartner', '==', 'true') }, record()));
        System.assertEquals(false, SectionVisibility.isVisible('Condition1', new List<Rule_Condition__c>{ cond('Condition1', 'ispartner', '!=', 'true') }, record()));
        System.assertEquals(true, SectionVisibility.isVisible('Condition1', new List<Rule_Condition__c>{ cond('Condition1', 'description', '!=', 'x') }, record()));
        System.assertEquals(false, SectionVisibility.isVisible('Condition1', new List<Rule_Condition__c>{ cond('Condition1', 'description', '==', 'x') }, record()));
    }

    @IsTest
    static void condition10IsNotConfusedWithCondition1() {
        List<Rule_Condition__c> c = new List<Rule_Condition__c>{ cond('Condition1', 'type', '==', 'Prospect'), cond('Condition10', 'industry', '==', 'Technology') };
        System.assertEquals(true, SectionVisibility.isVisible('Condition1 || Condition10', c, record()));
        System.assertEquals(false, SectionVisibility.isVisible('Condition1 && Condition10', c, record()));
    }

    @IsTest
    static void aRuleWithoutExpressionOrConditionsShowsTheSection() {
        System.assertEquals(true, SectionVisibility.isVisible('', new List<Rule_Condition__c>(), record()));
        System.assertEquals(true, SectionVisibility.isVisible(null, null, record()));
        System.assertEquals(true, SectionVisibility.isVisible('Condition1', new List<Rule_Condition__c>(), record()));
    }
}
