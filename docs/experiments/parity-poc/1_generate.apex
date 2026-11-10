// PARITY PoC step 1: create the Document__c records of ONE template through the real server route (the global entry point that Flows
// use). That call builds the merged body and header/footer JSON; the PDF it queues goes to the e-mail/Flow output, not to a record, so the
// baseline PDF is made in step 2. One template per run: a whole corpus in one transaction exceeds the CPU limit.
// run_parity.ps1 loops over the corpus and replaces TEMPLATE_NAME / RECORD_ID.
DxCPQ__Document_Template__c t = [SELECT Id, Name FROM DxCPQ__Document_Template__c WHERE Name = 'TEMPLATE_NAME' LIMIT 1];
DxCPQ.documentAutomationController.generateDocument(t.Id, new List<String>{ 'RECORD_ID' }, 'ZZ parity ' + t.Name);
System.debug('PARITY queued ' + t.Name);
