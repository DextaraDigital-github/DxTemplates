// Seeds the templates for the placeholder tests: values from an Apex class (%%token%%), values from a Flow, a table inside a Context
// section and a table inside a table (##Section name##). Needs the zzpack (docs/tools/org-seed/zzpack: ZZPlaceholderHandler,
// ZZ_Placeholder_Flow) and an Account called Datamatics. Written with DxCPQ__ names so the same file runs in the dev scratch org
// and in a subscriber org that has the package installed.
// Run: sf apex run --file docs/tools/org-seed/seed_placeholders.apex --target-org <alias>
String relatedType = 'Account';

String tbl(String head, String bodyRow) {
    return '<div style=""><table class="mytable" style="font-family: Verdana, sans-serif; table-layout:fixed; width:100%;"><thead><tr>' + head + '</tr></thead><tbody>' + bodyRow + '</tbody></table></div>';
}
DxCPQ__Document_Template__c makeTemplate(String name) {
    DxCPQ__Document_Template__c t = new DxCPQ__Document_Template__c(Name = name, DxCPQ__Related_To_Type__c = relatedType);
    insert t;
    t.DxCPQ__Parent_Template__c = t.Id; t.DxCPQ__Version_Number__c = 1; t.DxCPQ__External_ID__c = t.Id;
    update t;
    return t;
}
void section(DxCPQ__Document_Template__c t, String name, String type, Integer seq, String content) {
    insert new DxCPQ__Document_Template_Section__c(Name = name, DxCPQ__Document_Template__c = t.Id, DxCPQ__Type__c = type, DxCPQ__Sequence__c = seq, DxCPQ__Section_Content__c = content);
}


// A template made in the designer always has a Header and a Footer section; the PDF page expects them.
String headerJson = '{"sectionsCount":"3","sectionsFirstCount":null,"sectionsContent":[{"value":"<p>ZZ placeholder test</p>","indexvar":0,"key":"1:0"},{"value":"<p>{!Account.Name}</p>","indexvar":1,"key":"1:1"},{"value":"<p>Header right</p>","indexvar":2,"key":"1:2"}]}';
String footerJson = '{"sectionsCount":"3","sectionsContent":[{"value":"<p>Footer left</p>","indexvar":0,"key":"2:0"},{"value":"<p>Footer centre</p>","indexvar":1,"key":"2:1"},{"value":"<p>Footer right</p>","indexvar":2,"key":"2:2"}],"displaypagesequence":true}';
void headerAndFooter(DxCPQ__Document_Template__c t) {
    section(t, 'Header', 'Header', -1, headerJson);
    section(t, 'Footer', 'Footer', 99, footerJson);
}

delete [SELECT Id FROM DxCPQ__Document_Template__c WHERE Name IN ('ZZ Placeholders', 'ZZ Flow Placeholders')];

// ---- values from an Apex class
DxCPQ__Document_Template__c a = makeTemplate('ZZ Placeholders');
a.DxCPQ__ClassId__c = [SELECT Id FROM ApexClass WHERE Name = 'ZZPlaceholderHandler' LIMIT 1].Id;
update a;
headerAndFooter(a);
section(a, 'Letter', 'Context', 0, '<p>Dear %%CustomerName%%,</p><p>Customer city: %%Customer.City%%</p><p>Total due: %%Total%% for {!Account.Name} ({!Account.Industry})</p><p>No value: [%%Nobody%%]</p>');
section(a, 'Lines', 'Table', 1, tbl('<th>Product</th><th>Qty</th><th>Price</th>', '<tr><td>%%Items.Product%%</td><td>%%Items.Qty%%</td><td>%%Items.Price%%</td></tr>'));
section(a, 'ZZ Facts', 'Table', 2, tbl('<th>Fact</th><th>Value</th>', '<tr><td>Industry</td><td>{!Account.Industry}</td></tr><tr><td>Type</td><td>{!Account.Type}</td></tr>'));
section(a, 'Summary', 'Context', 3, '<p>Facts as a block:</p><p>##ZZ Facts##</p><p>Facts inline: ##ZZ Facts## end.</p>');
section(a, 'Outer', 'Table', 4, tbl('<th>Left</th><th>Right</th>', '<tr><td><p>##ZZ Facts##</p></td><td>Plain cell</td></tr>'));

// ---- values from a Flow (the flow has to be active; the id is its DurableId)
DxCPQ__Document_Template__c f = makeTemplate('ZZ Flow Placeholders');
f.DxCPQ__FlowId__c = [SELECT DurableId FROM FlowDefinitionView WHERE ApiName = 'ZZ_Placeholder_Flow' LIMIT 1].DurableId;
update f;
headerAndFooter(f);
section(f, 'Flow letter', 'Context', 0, '<p>%%FlowGreeting%%, total %%FlowTotal%%.</p>');
section(f, 'Flow lines', 'Table', 1, tbl('<th>Product</th><th>Qty</th>', '<tr><td>%%FlowItems.Product%%</td><td>%%FlowItems.Qty%%</td></tr>'));

System.debug('SEEDED ' + a.Id + ' ' + f.Id);
