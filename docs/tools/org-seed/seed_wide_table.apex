// Seeds a 2 row x 10 column Table section ("Wide T") into the template "ZZ Clip Test": headers H1..H10 and body cells
// A1..J2. With 10 columns the ids "row1col1" and "row1col10" share a prefix, which exercised the D9 load defect.
// Safe to re-run: it replaces "Wide T".
// Run: sf apex run --file docs/tools/org-seed/seed_wide_table.apex --target-org dxtemplates-scratch-30d
Document_Template__c tpl = [SELECT Id FROM Document_Template__c WHERE Name = 'ZZ Clip Test' LIMIT 1];
delete [SELECT Id FROM Document_Template_Section__c WHERE Document_Template__c = :tpl.Id AND Name = 'Wide T'];

List<Object> info = new List<Object>();
for (Integer c = 1; c <= 10; c++) {
    info.add(new Map<String, Object>{ 'data-id' => 'Header ' + c, 'Content' => '<p>H' + c + '</p>' });
}
for (Integer r = 1; r <= 2; r++) {
    for (Integer c = 1; c <= 10; c++) {
        String label = String.fromCharArray(new List<Integer>{ 64 + c }) + r;
        info.add(new Map<String, Object>{ 'data-id' => 'row' + r + 'col' + c + 'div', 'Content' => '<p>' + label + '</p>' });
    }
}
Map<String, Object> details = new Map<String, Object>{
    'rownumber' => 2, 'colnumber' => 10, 'serialNumberColumn' => false, 'headersIncluded' => true,
    'colWidthChanged' => false, 'headerFont' => '', 'bodyFont' => '', 'headbackground' => '#FFFFFF',
    'bodybackground' => '#FFFFFF', 'fontsize' => '12px', 'fontfamily' => 'sans-serif', 'bordercolor' => '',
    'newPage' => false, 'sectionInfo' => info
};

Integer nextSeq = 0;
for (Document_Template_Section__c s : [SELECT Sequence__c FROM Document_Template_Section__c WHERE Document_Template__c = :tpl.Id AND Type__c NOT IN ('Header', 'Footer')]) {
    if (s.Sequence__c != null && s.Sequence__c >= nextSeq) { nextSeq = Integer.valueOf(s.Sequence__c) + 1; }
}
insert new Document_Template_Section__c(
    Document_Template__c = tpl.Id, Name = 'Wide T', Type__c = 'Table', Sequence__c = nextSeq,
    Section_Details__c = JSON.serialize(details),
    Section_Content__c = '<div style=""><table class="mytable"><tbody><tr><td>seeded</td></tr></tbody></table></div>'
);
System.debug('Seeded Wide T at sequence ' + nextSeq);
