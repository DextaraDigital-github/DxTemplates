// Seeds three clauses for the Clause section tests: two active ones and an inactive one (the lookup offers only active clauses).
// Run: sf apex run --file docs/tools/org-seed/seed_clauses.apex --target-org dxtemplates-scratch-30d
delete [SELECT Id FROM Document_Clause__c WHERE Name LIKE 'ZZ %'];
List<Document_Clause__c> clauses = new List<Document_Clause__c>();
clauses.add(new Document_Clause__c(
    Name = 'ZZ Payment Terms', IsActive__c = true,
    Body__c = '<p><b>Payment Terms</b></p><ul><li>Invoices are due within 30 days.</li><li>Late payments carry a fee of 1.5% per month.</li></ul>'));
clauses.add(new Document_Clause__c(
    Name = 'ZZ Confidentiality', IsActive__c = true,
    Body__c = '<p>Both parties agree to keep the terms of this agreement confidential &amp; not to disclose them to third parties.</p>'
        + '<p><i>"Confidential information"</i> includes pricing, plans and customer lists.</p>'));
clauses.add(new Document_Clause__c(
    Name = 'ZZ Retired Clause', IsActive__c = false,
    Body__c = '<p>This clause is no longer in use.</p>'));
insert clauses;
System.debug('CLAUSES SEEDED ' + clauses.size());
