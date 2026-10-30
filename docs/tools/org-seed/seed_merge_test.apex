// Seed data for the PDF regression baseline (scratch org only).
Account acc = [SELECT Id FROM Account WHERE Name = 'Datamatics' LIMIT 1];
acc.Phone = '(555) 010-2000';
acc.Website = 'https://www.datamatics.example';
acc.Industry = 'Technology';
acc.Type = 'Customer - Direct';
acc.NumberOfEmployees = 4200;
acc.AnnualRevenue = 125000000;
acc.BillingStreet = '1 Test Street';
acc.BillingCity = 'Pune';
acc.BillingState = 'Maharashtra';
acc.BillingPostalCode = '411001';
acc.BillingCountry = 'India';
acc.Description = 'Baseline test account used for PDF regression checks.';
update acc;

Opportunity opp = new Opportunity(Name = 'Acme Renewal 2026', StageName = 'Prospecting', CloseDate = Date.newInstance(2026, 12, 31), Amount = 12345, AccountId = acc.Id);
insert opp;
Case cs = new Case(Subject = 'Baseline test claim', Status = 'New', Origin = 'Web', AccountId = acc.Id);
insert cs;

// Merge-field test template, modelled on the sample templates (page properties copied from Grant Proposal).
Document_Template__c src = [SELECT PDF_Page_Properties__c FROM Document_Template__c WHERE Name = 'Grant Proposal' LIMIT 1];
Document_Template__c t = new Document_Template__c(
    Name = 'Merge Field Test',
    Related_To_Type__c = 'Account',
    Description__c = 'Regression baseline for {!Account.*} merge fields',
    Version_Number__c = 1,
    IsActive__c = true,
    Previously_Active__c = true,
    PDF_Page_Properties__c = src.PDF_Page_Properties__c
);
insert t;
String html = '<p><strong>Merge test</strong></p>'
    + '<p>Name: {!Account.Name}</p>'
    + '<p>Phone: {!Account.Phone}</p>'
    + '<p>Website: {!Account.Website}</p>'
    + '<p>Industry: {!Account.Industry}</p>'
    + '<p>Type: {!Account.Type}</p>'
    + '<p>Employees: {!Account.NumberOfEmployees}</p>'
    + '<p>Annual revenue: {!Account.AnnualRevenue}</p>'
    + '<p>Billing city: {!Account.BillingCity}</p>'
    + '<p>Billing country: {!Account.BillingCountry}</p>'
    + '<p>Owner: {!Account.Owner.Name}</p>'
    + '<p>Blank field (Site): [{!Account.Site}]</p>'
    + '<p>Description: {!Account.Description}</p>';
Document_Template_Section__c s = new Document_Template_Section__c(
    Name = 'Merge Test Body',
    Document_Template__c = t.Id,
    Type__c = 'Context',
    Section_Content__c = html,
    Sequence__c = 0,
    IsActive__c = false,
    New_Page__c = false,
    DisplaySectionName__c = false
);
insert s;
System.debug('SEED account=' + acc.Id + ' opp=' + opp.Id + ' case=' + cs.Id + ' template=' + t.Id + ' section=' + s.Id);
