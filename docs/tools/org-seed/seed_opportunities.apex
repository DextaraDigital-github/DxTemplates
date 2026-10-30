// Seeds 9 more Opportunities on the Account "Datamatics" across several stages, so Related Objects sections
// (grouping, sub totals, grand total, chart) have real variety. Safe to re-run: it replaces the "RO Seed" ones.
// Run: sf apex run --file docs/tools/org-seed/seed_opportunities.apex --target-org dxtemplates-scratch-30d
Account acc = [SELECT Id FROM Account WHERE Name = 'Datamatics' LIMIT 1];
delete [SELECT Id FROM Opportunity WHERE AccountId = :acc.Id AND Name LIKE 'RO Seed%'];
List<Opportunity> opps = new List<Opportunity>();
String[] stages = new String[]{ 'Prospecting', 'Prospecting', 'Qualification', 'Qualification', 'Needs Analysis', 'Proposal/Price Quote', 'Negotiation/Review', 'Closed Won', 'Closed Lost' };
Decimal[] amounts = new Decimal[]{ 1500.50, 2200, 35000.75, 4100, 98000, 12000.25, 56000, 250000, 7800.10 };
for (Integer i = 0; i < stages.size(); i++) {
    opps.add(new Opportunity(
        AccountId = acc.Id, Name = 'RO Seed ' + (i + 1), StageName = stages[i], Amount = amounts[i],
        CloseDate = Date.today().addDays(10 * (i + 1))
    ));
}
insert opps;
System.debug('Seeded ' + opps.size() + ' opportunities');
