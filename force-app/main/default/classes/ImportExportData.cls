// Used by the install script (PostInstallDataCreation) to create the sample templates. The designer import and export run through
// TemplateMigration; the create methods below are deliberately not AuraEnabled, because they insert whatever fields they are given.
public class ImportExportData {
    public class templateWrapper{
        @AuraEnabled
        public sobject document_template {get;set;}
    }
    
    public static templateWrapper templateData(){
        templateWrapper tWrapper = new templateWrapper();
        List<sObject> allData = new List<sObject>();
        return twrapper;
    }
    
    public static List<sObject> allDocTemps(){
        List<Document_Template__c> docTemp= [SELECT id from Document_Template__c WITH SECURITY_ENFORCED];
        return docTemp;
    }
    
    @AuraEnabled
    public static List<Map<String,String>> getAllRelatedToTypeOptions(){
        Schema.SObjectType templateType = Schema.getGlobalDescribe().get('DxCPQ__Document_Template__c');
        Schema.DescribeFieldResult fieldResult = templateType.getDescribe().fields.getMap().get('DxCPQ__Related_To_Type__c').getDescribe();
        List<Schema.PicklistEntry> picklistEntries = fieldResult.getPicklistValues();
        List<Map<String,String>> picklistOptions = new List<Map<String,String>>();
        for (Schema.PicklistEntry entry : picklistEntries) {
            map<string,string> option = new map<string,string>();
            option.put('label', entry.getLabel());
            option.put('value', entry.getValue());
            picklistOptions.add(option);
        }
        System.debug('Picklist: '+ picklistOptions);
        return picklistOptions;
    }
    
    public static List<Map<String,String>> templateExternalList(){
		List<Document_Template__c> docTemp = [SELECT Name, isactive__c, Related_To_Type__c, Version_Number__c, Previously_Active__c, Parent_Template__c, Watermark_Data__c, External_Id__c FROM Document_Template__c WITH SECURITY_ENFORCED order by CreatedDate Desc limit 50000];
        List<Map<String,String>> recordIds = new List<Map<String,String>>();
        for (Document_Template__c obj : docTemp) {
            map<String,String> newRecords = new Map<String,String>();
            newRecords.put('Id', String.valueOf(obj.Id));
            newRecords.put('ExternalId', obj.External_Id__c);
            recordIds.add(newRecords);
        }
        return recordIds;
    }
    
    public static String getAllDocumentTemplatesData(){
        try{
            Map<String, Object> dTMap = new Map<String, Object>();
            Map<String,String> holdCVData = new Map<String,String>();
            List<Document_Template__c> docTemp = [SELECT Name, Related_To_Type__c, Version_Number__c, Parent_Template__c, Watermark_Data__c, PDF_Page_Properties__c, External_Id__c FROM Document_Template__c WITH SECURITY_ENFORCED order by CreatedDate Desc limit 50000];

            //document template sections
            List<Document_Template_Section__c> dts = [select Name, DisplaySectionName__c, Document_Template__c, ChildObject__c,  Document_Clause__c, External_Document_Template__c, External_RuleID__c, External_SecVis_Rule_ID__c, Header_Content__c, IsActive__c, IsEditable__c, New_Page__c, Parent_Section__c, RuleId__c, Section_Content__c, Section_Details__c, Section_Visibility_Rule__c,  Sequence__c, Type__c  from Document_Template_Section__c with USER_MODE LIMIT 50000];
            List<Translator__c> translations = [Select Id, Name, DocumentTemplate__c, FieldValue__c, Language__c, Translated_Value__c from Translator__c];
            List<String> templatesectionclauses = new List<String>();
            List<String> templatesectionrules = new List<String>();
            for(Document_Template_Section__c dtSection : dts){
                if (dtSection.Document_Clause__c!=null){
                	templatesectionclauses.add(dtSection.Document_Clause__c);
                }
                if(dtSection.RuleId__c!=null){
                    templatesectionrules.add(dtSection.RuleId__c);
                }
                if(dtSection.Section_Visibility_Rule__c != null){
                    templatesectionrules.add(dtSection.Section_Visibility_Rule__c);
                }
            }
            //document clauses
            List<Document_Clause__c> dc = [select Id, Name, Body__c, Category__c, IsActive__c, Product__c, Status__c, External_Id__c from Document_Clause__c where id IN:templatesectionclauses with USER_MODE LIMIT 50000];
            List<Rule__c> rules = [select Rule_Description__c,Rule_Expression__c,External_Id__c from Rule__c  where id IN:templatesectionrules WITH SECURITY_ENFORCED];
            List<String> ruleIds = new List<String>();
            for(Rule__c rId : rules){
				ruleIds.add(rId.External_Id__c);
            }
            List<Rule_Condition__c> ruleConditions = [select Name, Evaluation_Object__c, Condition_Field__c,ConditionIndex__c,DataType__c,Is_Cart_Item_Condition__c,Operator__c,Value__c,Rule__c, External_Id__c from Rule_Condition__c where External_Id__c IN:ruleIds WITH SECURITY_ENFORCED];

            dTMap.put('Templates', docTemp);
            dTMap.put('Template Sections', dts);
            dTMap.put('Document Clauses', dc);
            dTMap.put('Rules',rules);
            dTMap.put('Rule Conditions',ruleConditions);
            dTMap.put('Translations',translations);
            String finalMap = JSON.serialize(dTMap); 
            return finalMap;
        }
        catch(exception e){
            return '';
        }
       
    }
    
    public static Map<String,Object> getWatermarkContent(List<String> idList){
    	List<ContentVersion> cvLst = [select Id, FirstPublishLocationId,VersionData, FileExtension, FileType, PathOnClient, External_Id__c from ContentVersion where FirstPublishLocationId IN:idList WITH SECURITY_ENFORCED];
        Map<String,Object> holdCVData = new Map<String,Object>();
        for(ContentVersion cvdt : cvLst){
            String cvImageData = EncodingUtil.base64Encode(cvdt.VersionData);
            String cvId = (String)cvdt.id;
            Map<String, Object> cvDataMap = new Map<String, Object>();
            cvDataMap.put('ImageData', cvImageData);
            cvDataMap.put('ContentVersionData', cvdt);
            holdCVData.put(cvId, cvDataMap);
        }
        return holdCVData;
    }
    
    public static List<Map<String,String>> createImportedTemplates(String tempLst){
        List<Map<String,String>> recordIds = new List<Map<String,String>>();
        List<Document_Template__c> templateLst = (List<Document_Template__c>) JSON.deserialize(tempLst, List<Document_Template__c>.class);
        List<Document_Template__c> createdRecords = new List<Document_Template__c>();
        List<Document_Template__c> docTemplst = [SELECT ID, Name,Version_Number__c,Watermark_Data__c FROM Document_Template__c WITH SECURITY_ENFORCED];
		for (Document_Template__c obj : templateLst) {
            decimal tempVersion= 0;
            for (Document_Template__c objdoc : docTemplst) {
                if (obj.name == objdoc.name && tempVersion<objdoc.Version_Number__c){
                    tempVersion = objdoc.Version_Number__c;
                }
            }
            obj.Version_Number__c = tempVersion+1;
            createdRecords.add(obj);
        }
		insert createdRecords;
		for (Document_Template__c obj : createdRecords) {
            map<String,String> newRecords = new Map<String,String>();
            newRecords.put('Id', String.valueOf(obj.Id));
            newRecords.put('ExternalId', obj.External_Id__c);
            recordIds.add(newRecords);   
        }
        return recordIDs;
    }
    
    public static List<String> createImportedTemplateSections(String tempSecLst){
        List<String> recordIds = new List<String>();
        List<Document_Template_Section__c> templateSecLst = (List<Document_Template_Section__c>) JSON.deserialize(tempSecLst, List<Document_Template_Section__c>.class);
        List<Document_Template_Section__c> createdRecords = new List<Document_Template_Section__c>();
		for (Document_Template_Section__c obj : templateSecLst) {
            createdRecords.add(obj);
        }
		insert createdRecords;

		for (Document_Template_Section__c obj : createdRecords) {
            recordIds.add(obj.Id);
        }
        
        return recordIds;
        
    }
    
    public static List<Map<String,String>> createImportedClauses(String tempClausesLst){
        List<Map<String,String>> recordIds = new List<Map<String,String>>();
        List<Document_Clause__c> existingClauses = [Select id,External_ID__c from Document_Clause__c WITH SECURITY_ENFORCED];
        List<Document_Clause__c> templateClausesLst = (List<Document_Clause__c>) JSON.deserialize(tempClausesLst, List<Document_Clause__c>.class);
        List<Document_Clause__c> createdRecords = new List<Document_Clause__c>();
        List<Document_Clause__c> existingrecords = new List<Document_Clause__c>();
		for (Document_Clause__c obj : templateClausesLst) {
            Boolean checkIfExist = false;
            for (Document_Clause__c existClause : existingClauses){
                if (existClause.External_ID__c == obj.External_ID__c){
                	existingrecords.add(existClause);
                    checkIfExist = true;
                    break;
                }
            }
            if (checkIfExist == false){
            	createdRecords.add(obj);
            }
        }
		insert createdRecords;
        createdRecords.addAll(existingrecords);
		for (Document_Clause__c obj : createdRecords) {
            map<String,String> newRecords = new Map<String,String>();
            newRecords.put('Id', String.valueOf(obj.Id));
            newRecords.put('ExternalId', obj.External_Id__c);
            recordIds.add(newRecords);
        }
        return recordIds;     
    }
    
    public static List<Map<String,String>> createImportedRules(String tempRuleLst){
        List<Map<String,String>> recordIds = new List<Map<String,String>>();
        List<Rule__c> templateRulesLst = (List<Rule__c>) JSON.deserialize(tempRuleLst, List<Rule__c>.class);
        List<Rule__c> createdRecords = new List<Rule__c>();
		for (Rule__c obj : templateRulesLst) {
            createdRecords.add(obj);
        }
		insert createdRecords;
		for (Rule__c obj : createdRecords) {
            map<String,String> newRecords = new Map<String,String>();
            newRecords.put('Id', String.valueOf(obj.Id));
            newRecords.put('ExternalId', obj.External_Id__c);
            recordIds.add(newRecords);
        }
        return recordIds;        
    }
    
    public static List<Map<String,String>> createImportedRuleConditions(String tempRuleCondLst){
        List<Map<String,String>> recordIds = new List<Map<String,String>>();
        List<Rule_Condition__c> templateRuleCondLst = (List<Rule_Condition__c>) JSON.deserialize(tempRuleCondLst, List<Rule_Condition__c>.class);
        List<Rule_Condition__c> createdRecords = new List<Rule_Condition__c>();
		for (Rule_Condition__c obj : templateRuleCondLst) {
            createdRecords.add(obj);
        }
		insert createdRecords;
		for (Rule_Condition__c obj : createdRecords) {
            map<String,String> newRecords = new Map<String,String>();
            newRecords.put('Id', String.valueOf(obj.Id));
            newRecords.put('ExternalId', obj.External_Id__c);
            recordIds.add(newRecords);
        }
        return recordIds;        
    }
    
    public static List<ContentVersion> createImportedWatermark(String watermarkLst){
        List<Map<String,String>> recordIds = new List<Map<String,String>>();
        Map<String,Object> imageMap = (Map<string,Object>) JSON.deserializeuntyped(watermarkLst);
        List<ContentVersion> createdRecords = new List<ContentVersion>();
        List<ContentVersion> contentVersionsToInsert = new List<ContentVersion>();
        List<Document_Template__c> docTempList1 = [SELECT Id, Name, Watermark_Data__c, External_Id__c FROM Document_Template__c WITH SECURITY_ENFORCED];
        List<String> docTempLst = new List<String>();
        for (String imageDataId : imageMap.keySet()){
            Map<String, Object> imageData = (Map<String, Object>) imageMap.get(imageDataId);
    		Map<String, Object> contentVersionData = (Map<String, Object>) imageData.get('ContentVersionData');
            String oldImageId = (String)contentVersionData.get('DxCPQ__External_Id__c');
            Id docTempId;
            for (Document_Template__c dtImg: docTempList1){
                if (dtImg.Watermark_Data__c != null && dtImg.Watermark_Data__c.contains(oldImageId)){
                    docTempId = dtImg.id;
                    break;
                }
            }
            ContentVersion cv = new ContentVersion(
                FirstPublishLocationId = docTempId,
                Title = (string) contentVersionData.get('Title'),
                PathOnClient = (String) contentVersionData.get('PathOnClient'),
                External_Id__c = (String) contentVersionData.get('DxCPQ__External_Id__c'),
            	VersionData = EncodingUtil.base64Decode((String) imageData.get('ImageData'))
    		);
            contentVersionsToInsert.add(cv);
            docTempLst.add(cv.FirstPublishLocationId); 
        }

		insert contentVersionsToInsert;
        List<Document_Template__c> templatesToUpdate = new List<Document_Template__c>();
        List<Document_Template__c> docTempList = [SELECT Id, Name, Watermark_Data__c, External_Id__c FROM Document_Template__c where Id IN: docTempLst WITH SECURITY_ENFORCED];
        for (Document_Template__c dt: docTempList){
            String watermarkData = dt.Watermark_Data__c;
            for (ContentVersion cvId : contentVersionsToInsert) {
                if (cvId.FirstPublishLocationId == dt.Id){
        			watermarkData = watermarkData.replace(cvId.External_Id__c, cvId.Id);
                }
    		}
            dt.Watermark_Data__c = watermarkData;
            templatesToUpdate.add(dt);
        }
        update templatesToUpdate;
        return createdRecords;
    }
}