@IsTest
private class DisplayRelatedObjects_Test {
    // The Related Objects table of the Generate PDF screen. A field of a standard parent (Opportunity > Account.NumberOfEmployees) was
    // looked up on the User object, so its type was unknown and an exception was logged for every table.

    @IsTest
    static void aFieldOfAStandardParentGetsItsOwnType() {
        Map<String, String> types = DisplayRelatedObjects.getObjectFieldTypeMap('Opportunity', new List<String>{ 'Name', 'Account.NumberOfEmployees' });

        System.assertEquals('INTEGER', types.get('Account.NumberOfEmployees'));
        System.assertEquals(0, [SELECT COUNT() FROM TransactionLog__c WHERE LogType__c = 'Exception']);
    }

    @IsTest
    static void theTableShowsTheValueOfAStandardParentField() {
        Account account = new Account(Name = 'Acme', NumberOfEmployees = 4242);
        insert account;
        insert new Opportunity(AccountId = account.Id, Name = 'Deal 1', StageName = 'Prospecting', CloseDate = Date.today().addDays(5), Amount = 100);
        Document_Template__c template = new Document_Template__c(Name = 'RO screen', Related_To_Type__c = 'Account');
        insert template;
        Document_Template_Section__c section = new Document_Template_Section__c(Name = 'Deals', Document_Template__c = template.Id, Type__c = 'Related Objects', Sequence__c = 1,
            Section_Content__c = '{"whereClause":"()","mainChildObject":"Opportunity","childLookupfieldAPIname":"AccountId","mainparentObject":"","SerialNumber":false,"subTotal":[],"newPage":false,"displayChart":false,"tablelistValues":["Name","Account.NumberOfEmployees"],"tablelistLabels":["Name","Employees"],"grouping":"","dateFormat":"654/*","timeFormat":"124","numberFormat":"2","currencyFormat":"2","style":{"category":{"fontcolor":"","backgroundColor":"#e0f0ff","fontfamily":"courier, monospace","fontsize":"10px"},"header":{"fontcolor":"#cc0000","backgroundColor":"#ffcc00","fontfamily":"courier, monospace","fontsize":"10px"}}}');
        insert section;

        String html = DisplayRelatedObjects.getsectionData(account.Id, section.Id);

        System.assert(html.contains('Deal 1'), html);
        System.assert(html.contains('4242'), 'the parent value is printed: ' + html);
        System.assertEquals(0, [SELECT COUNT() FROM TransactionLog__c WHERE LogType__c = 'Exception']);
    }
}
