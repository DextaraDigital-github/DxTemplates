// Heavy-data seed: 400 Opportunities and 250 Contacts on the Account "Datamatics" and the template "ZZ Heavy Combined" that mixes every
// section type (Header with first-page header, long Context, a 300-row table from the Apex class ZZHeavyHandler, a 120-row static table,
// Related Objects with 400 records grouped, a long Clause, nested table, Footer). Needs the zzpack (ZZHeavyHandler) and the
// "ZZ Clone RO" template (its Related Objects settings are copied). DxCPQ__ names, so it runs in a subscriber org too.
// Run: sf apex run --file docs/tools/org-seed/seed_heavy.apex --target-org <alias>
Account acc = [SELECT Id FROM Account WHERE Name = 'Datamatics' LIMIT 1];
delete [SELECT Id FROM Opportunity WHERE AccountId = :acc.Id AND Name LIKE 'Heavy %'];
delete [SELECT Id FROM Contact WHERE AccountId = :acc.Id AND LastName LIKE 'Heavy%'];
String[] stages = new String[]{ 'Prospecting', 'Qualification', 'Needs Analysis', 'Proposal/Price Quote', 'Negotiation/Review', 'Closed Won', 'Closed Lost' };
List<Opportunity> opps = new List<Opportunity>();
for (Integer i = 1; i <= 400; i++) {
    opps.add(new Opportunity(AccountId = acc.Id, Name = 'Heavy Opp ' + i, StageName = stages[Math.mod(i, stages.size())], Amount = 1000 + i * 37.25, CloseDate = Date.today().addDays(i)));
}
insert opps;
List<Contact> contacts = new List<Contact>();
for (Integer i = 1; i <= 250; i++) { contacts.add(new Contact(AccountId = acc.Id, FirstName = 'Person' + i, LastName = 'Heavy' + i, Email = 'heavy' + i + '@example.com')); }
insert contacts;

delete [SELECT Id FROM DxCPQ__Document_Template__c WHERE Name = 'ZZ Heavy Combined'];
DxCPQ__Document_Template__c t = new DxCPQ__Document_Template__c(Name = 'ZZ Heavy Combined', DxCPQ__Related_To_Type__c = 'Account');
insert t;
t.DxCPQ__Parent_Template__c = t.Id; t.DxCPQ__Version_Number__c = 1; t.DxCPQ__External_ID__c = t.Id;
t.DxCPQ__ClassId__c = [SELECT Id FROM ApexClass WHERE Name = 'ZZHeavyHandler' LIMIT 1].Id;
update t;

void section(String name, String type, Integer seq, String content, Boolean newPage) {
    insert new DxCPQ__Document_Template_Section__c(Name = name, DxCPQ__Document_Template__c = t.Id, DxCPQ__Type__c = type, DxCPQ__Sequence__c = seq, DxCPQ__Section_Content__c = content, DxCPQ__New_Page__c = newPage);
}
String tbl(String head, String body) {
    return '<div style=""><table class="mytable" style="font-family: Verdana, sans-serif; table-layout:fixed; width:100%;"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>';
}

section('Header', 'Header', -1, '{"sectionsCount":"3","sectionsFirstCount":"3","sectionsContent":[{"value":"<p>Heavy report</p>","indexvar":0,"key":"1:0"},{"value":"<p>{!Account.Name}</p>","indexvar":1,"key":"1:1"},{"value":"<p>Header right</p>","indexvar":2,"key":"1:2"},{"value":"<p>FIRST PAGE left</p>","indexvar":3,"key":"1:3"},{"value":"<p>FIRST PAGE centre</p>","indexvar":4,"key":"1:4"},{"value":"<p>FIRST PAGE right</p>","indexvar":5,"key":"1:5"}]}', false);
section('Footer', 'Footer', 99, '{"sectionsCount":"3","sectionsContent":[{"value":"<p>Footer left</p>","indexvar":0,"key":"2:0"},{"value":"<p>Footer centre</p>","indexvar":1,"key":"2:1"},{"value":"<p>Footer right</p>","indexvar":2,"key":"2:2"}],"displaypagesequence":true}', false);

String longText = '<p><b>%%Headline%%</b> for {!Account.Name} &amp; partners.</p>';
for (Integer i = 1; i <= 60; i++) {
    longText += '<p>Paragraph ' + i + ': Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Special: &lt;tag&gt; &amp; "quotes" $100 %.</p>';
}
section('Intro', 'Context', 0, longText, false);

section('Lines', 'Table', 1, tbl('<th>#</th><th>Product</th><th>Qty</th><th>Price</th>', '<tr><td>%%Lines.No%%</td><td>%%Lines.Product%%</td><td>%%Lines.Qty%%</td><td>%%Lines.Price%%</td></tr>'), true);

String staticRows = '';
for (Integer i = 1; i <= 120; i++) { staticRows += '<tr><td>Row ' + i + '</td><td>{!Account.Name}</td><td>' + (i * 11) + '</td></tr>'; }
section('Static', 'Table', 2, tbl('<th>Row</th><th>Account</th><th>Value</th>', staticRows), true);

DxCPQ__Document_Template_Section__c ro = [SELECT DxCPQ__Section_Content__c, DxCPQ__Header_Content__c FROM DxCPQ__Document_Template_Section__c WHERE DxCPQ__Document_Template__r.Name = 'ZZ Clone RO' AND DxCPQ__Type__c = 'Related Objects' LIMIT 1];
// Header_Content__c is the header row the designer saves with a Related Objects section; the server-side generation prints it.
insert new DxCPQ__Document_Template_Section__c(Name = 'Heavy Opps', DxCPQ__Document_Template__c = t.Id, DxCPQ__Type__c = 'Related Objects', DxCPQ__Sequence__c = 3, DxCPQ__New_Page__c = true,
    DxCPQ__Header_Content__c = ro.DxCPQ__Header_Content__c,
    DxCPQ__Section_Content__c = ro.DxCPQ__Section_Content__c.replace('(amount > 10000)', '(name like \'Heavy%\')').replace('"mainparentObject":""', '"mainparentObject":"Account"'));

String clause = '<div style="page-break-before : always;"><p><b>Long clause</b></p>';
for (Integer i = 1; i <= 40; i++) { clause += '<p>Clause paragraph ' + i + ': The parties agree that obligations number ' + i + ' continue after termination, including confidentiality &amp; payment.</p>'; }
section('Long Clause', 'Clause', 4, clause + '</div>', true);

section('Nest', 'Table', 5, tbl('<th>Static again</th><th>Note</th>', '<tr><td>##Static##</td><td>Nested table with 120 rows</td></tr>'), true);
System.debug('HEAVY SEEDED ' + t.Id);
