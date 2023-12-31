@isTest
private class Safely_Test {
	@isTest
    static void safelyTest(){
        
        Test.startTest();
        User us = DexUtilTestDataFactory.CreateTestUser();
		System.runAs(us){
        Safely safe = new Safely();
        safe.allOrNothing();
        List<Account> acc = DexUtilTestDataFactory.createAccounts(1, false, null); 
        safe.doInsert(acc);
        safe.doInsert(new List<Account>());
        safe.doUpdate(acc);
        safe.doUpdate(new List<Account>());
        safe.doUpsert(acc);
        safe.doUpsert(acc, Account.Fields.Id);
        safe.doUpsert(new List<Account>());
        safe.doDelete(acc);
        safe.doDelete(new List<Account>());
        safe.doQuery('SELECT Id FROM Account');
        }
        System.assert(true);
        Test.stopTest();
    }
}