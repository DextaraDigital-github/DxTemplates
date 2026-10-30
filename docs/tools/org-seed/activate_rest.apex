// Mirrors what the designer's Activate button stores (IsActive__c and Previously_Active__c) for the remaining sample templates.
List<Document_Template__c> ts = [SELECT Id, Name, IsActive__c, Previously_Active__c FROM Document_Template__c WHERE Name IN ('Claim Form','Newsletter','EMPLOYMENT CONTRACT','Legal Notice','Contract Renewal')];
for (Document_Template__c t : ts) {
    t.IsActive__c = true;
    t.Previously_Active__c = true;
}
update ts;
System.debug('ACTIVATED ' + ts.size());
