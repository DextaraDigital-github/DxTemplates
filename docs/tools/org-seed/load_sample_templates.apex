// Mirrors PostInstallDataCreation.createSampleTemplateAndTemplateSection() without the schedule/email parts.
List<StaticResource> res = [SELECT Body FROM StaticResource WHERE Name = 'TemplatesAndSectionData' AND ContentType = 'application/json' LIMIT 1];
StaticResource logoImg = [SELECT Name, Body FROM StaticResource WHERE Name = 'DextaraDatamaticsLogo' LIMIT 1];
Set<String> validObjects = new Set<String>();
for (EntityDefinition e : [SELECT QualifiedApiName FROM EntityDefinition WHERE QualifiedApiName IN ('Quote','Case','Account','Opportunity','Lead','Knowledge__kav')]) {
    validObjects.add(e.QualifiedApiName);
}
System.debug('Valid objects: ' + validObjects);

ContentVersion cv = new ContentVersion(Title = logoImg.Name, PathOnClient = logoImg.Name + '.png', VersionData = logoImg.Body);
insert cv;

Map<String, Object> data = (Map<String, Object>) JSON.deserializeUntyped(res[0].Body.toString());
List<Object> keptTemplates = new List<Object>();
for (Object o : (List<Object>) data.get('Templates')) {
    Map<String, Object> t = (Map<String, Object>) o;
    if (validObjects.contains((String) t.get('DxCPQ__Related_To_Type__c'))) {
        keptTemplates.add(o);
    }
}
List<Map<String, String>> tmplMap = ImportExportData.createImportedTemplates(JSON.serialize(keptTemplates));

List<Object> keptSections = new List<Object>();
for (Map<String, String> te : tmplMap) {
    for (Object so : (List<Object>) data.get('Template_Sections')) {
        Map<String, Object> s = (Map<String, Object>) so;
        if ('Header'.equals((String) s.get('DxCPQ__Type__c'))) {
            s.put('DxCPQ__Section_Content__c', ((String) s.get('DxCPQ__Section_Content__c')).replace('<contentversionid>', cv.Id));
        }
        if ((String) s.get('DxCPQ__External_Document_Template__c') == te.get('ExternalId')) {
            s.put('DxCPQ__Document_Template__c', te.get('Id'));
            keptSections.add(s);
        }
    }
}
List<String> secIds = ImportExportData.createImportedTemplateSections(JSON.serialize(keptSections));
System.debug('RESULT templates=' + tmplMap.size() + ' sections=' + secIds.size());
