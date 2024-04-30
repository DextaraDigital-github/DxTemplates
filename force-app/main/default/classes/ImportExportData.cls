public class ImportExportData {
    public class templateWrapper{
        @AuraEnabled
        Public sobject document_template {get;set;}
    }
    
    public static templateWrapper templateData(){
        templateWrapper tWrapper = new templateWrapper();
        List<sObject> allData = new List<sObject>();
        return twrapper;
    }
    
    @AuraEnabled
    public static List<sObject> allDocTemps(){
        List<Document_Template__c> docTemp= [SELECT id from Document_Template__c];
        return docTemp;
    }
    
    @AuraEnabled
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
    
    @AuraEnabled
    public static String getAllDocumentTemplatesData(){
        try{
            Map<String, Object> dTMap = new Map<String, Object>();
            Map<String,String> holdCVData = new Map<String,String>();
            List<Document_Template__c> docTemp = [SELECT Name, isactive__c, Related_To_Type__c, Version_Number__c, Previously_Active__c, Parent_Template__c, Watermark_Data__c, External_Id__c FROM Document_Template__c WITH SECURITY_ENFORCED order by CreatedDate Desc limit 50000];
            //List<String> templateIds = new List<String>();
            //for(Document_Template__c dt : docTemp){
            //    templateIds.add(dt.External_Id__c);
            //}
            //System.debug('templateIds ---> '+ templateIds);
            //document template sections
            List<Document_Template_Section__c> dts = [select Name, DisplaySectionName__c, Document_Template__c, ChildObject__c,  Document_Clause__c, External_Document_Clause__c, External_Document_Template__c, External_RuleID__c, Header_Content__c, IsActive__c, IsEditable__c, New_Page__c, Parent_Section__c, RuleId__c, Section_Content__c, Section_Details__c, Sequence__c, Type__c  from Document_Template_Section__c with USER_MODE LIMIT 50000];
            System.debug('dts ---> '+ dts);
            List<String> templatesectionclauses = new List<String>();
            List<String> templatesectionrules = new List<String>();
            for(Document_Template_Section__c dtSection : dts){
                if (dtSection.DxCPQ__Document_Clause__c!=null){
                	templatesectionclauses.add(dtSection.DxCPQ__Document_Clause__c);
                }
                if(dtSection.DxCPQ__RuleId__c!=null){
                    templatesectionrules.add(dtSection.DxCPQ__RuleId__c);
                }
            }
            //document clauses
            List<Document_Clause__c> dc = [select Id, Name, Body__c, Category__c, IsActive__c, Product__c, Status__c, External_Id__c from Document_Clause__c where id IN:templatesectionclauses with USER_MODE LIMIT 50000];
            System.debug('dc ---> '+ dc);
            List<Rule__c> rules = [select Rule_Description__c,Rule_Expression__c,External_Id__c from Rule__c  where id IN:templatesectionrules];
            List<String> ruleIds = new List<String>();
            for(Rule__c rId : rules){
				ruleIds.add(rId.External_Id__c);
            }
            List<Rule_Condition__c> ruleConditions = [select Name, Evaluation_Object__c, Condition_Field__c,ConditionIndex__c,DataType__c,Is_Cart_Item_Condition__c,Operator__c,Value__c,Rule__c, External_Id__c from Rule_Condition__c where External_Id__c IN:ruleIds];
            
			//List<ContentVersion> cvLst = [select Id, ContentDocumentId, ContentBodyId, FirstPublishLocationId,VersionData,  FileExtension, FileType, PathOnClient from ContentVersion where FirstPublishLocationId IN:templateIds];
            //System.debug('cvLst ---> '+ cvLst);
            //for(ContentVersion cvdt : cvLst){
            //    String cvImageData = EncodingUtil.base64Encode(cvdt.VersionData);
            //    holdCVData.put(cvdt.Id, cvImageData);
            //}
            
            //System.debug('image CV data ---> '+ holdCVData);
            dTMap.put('Templates', docTemp);
            dTMap.put('Template Sections', dts);
            dTMap.put('Document Clauses', dc);
            dTMap.put('Rules',rules);
            dTMap.put('Rule Conditions',ruleConditions);
            //dTMap.put('Content Version', cvLst);
            //dTMap.put('Image CV Data', holdCVData);
            System.debug('dTMap -----> '+ dTMap);
            String finalMap = JSON.serialize(dTMap); 
            System.debug('finalMap ---> '+ finalMap);
            return finalMap;
        }
        catch(exception e){
            System.debug('error message ----> '+ e.getMessage());
            return '';
        }
       
    }
    
    @AuraEnabled
    public static Map<String,Object> getWatermarkContent(List<String> idList){
    	List<ContentVersion> cvLst = [select Id, FirstPublishLocationId,VersionData, FileExtension, FileType, PathOnClient, External_Id__c from ContentVersion where FirstPublishLocationId IN:idList];
        System.debug('cvLst ---> '+ cvLst);
        Map<String,Object> holdCVData = new Map<String,Object>();
        //List<ContentVersion> watermarkLst = new List<ContentVersion>();
        for(ContentVersion cvdt : cvLst){
            String cvImageData = EncodingUtil.base64Encode(cvdt.VersionData);
            String cvId = (String)cvdt.id;
            Map<String, Object> cvDataMap = new Map<String, Object>();
            cvDataMap.put('ImageData', cvImageData);
            cvDataMap.put('ContentVersionData', cvdt);
            holdCVData.put(cvId, cvDataMap);
        }
        //for(ContentVersion cvdt : cvLst){
        //    String cvImageData = EncodingUtil.base64Encode(cvdt.VersionData);
        //   String cvId = (String)cvdt.Id;
        //    //Map<String, Object> cvDataMap = new Map<String, Object>();
        //    cvdt.put('ImageData', cvImageData);
        //    //holdCVData.put(cvId, cvDataMap);
        //    watermarkLst.add(cvdt);
        //}
        //holdCVData.put('Watermark', watermarkLst);
        return holdCVData;
    }
    
    @AuraEnabled
    public static List<Map<String,String>> createImportedTemplates(String tempLst){
        List<Map<String,String>> recordIds = new List<Map<String,String>>();
        List<Document_Template__c> templateLst = (List<Document_Template__c>) JSON.deserialize(tempLst, List<Document_Template__c>.class);
        List<Document_Template__c> createdRecords = new List<Document_Template__c>();
        List<Document_Template__c> docTemplst = [SELECT ID, Name,Version_Number__c,Watermark_Data__c FROM Document_Template__c];
		for (Document_Template__c obj : templateLst) {
            decimal tempVersion= 0;
            for (Document_Template__c objdoc : docTemplst) {
                if (obj.name == objdoc.name && tempVersion<objdoc.Version_Number__c){
                    tempVersion = objdoc.Version_Number__c;
                    system.debug('tempVersion- '+ tempVersion);
                }
            }
            obj.Version_Number__c = tempVersion+1;
            createdRecords.add(obj);
        }
		insert createdRecords;
		for (Document_Template__c obj : createdRecords) {
            //newRecords.put(String.valueOf(obj.Id), obj.DxCPQ__External_ID__c); 
            map<String,String> newRecords = new Map<String,String>();
            newRecords.put('Id', String.valueOf(obj.Id));
            newRecords.put('ExternalId', obj.External_Id__c);
            recordIds.add(newRecords);   
        }
        return recordIDs;
    }
    
    @AuraEnabled
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
    
    @AuraEnabled
    public static List<Map<String,String>> createImportedClauses(String tempClausesLst){
        List<Map<String,String>> recordIds = new List<Map<String,String>>();
        List<Document_Clause__c> templateClausesLst = (List<Document_Clause__c>) JSON.deserialize(tempClausesLst, List<Document_Clause__c>.class);
        List<Document_Clause__c> createdRecords = new List<Document_Clause__c>();
		for (Document_Clause__c obj : templateClausesLst) {
            createdRecords.add(obj);
        }
		insert createdRecords;
		//map<String,String> newRecords = new Map<String,String>();
		for (Document_Clause__c obj : createdRecords) {
            map<String,String> newRecords = new Map<String,String>();
            newRecords.put('Id', String.valueOf(obj.Id));
            newRecords.put('ExternalId', obj.DxCPQ__External_ID__c);
            recordIds.add(newRecords);
        }
        return recordIds;       
    }
    
    @AuraEnabled
    public static List<Map<String,String>> createImportedRules(String tempRuleLst){
        List<Map<String,String>> recordIds = new List<Map<String,String>>();
        List<Rule__c> templateRulesLst = (List<Rule__c>) JSON.deserialize(tempRuleLst, List<Rule__c>.class);
        List<Rule__c> createdRecords = new List<Rule__c>();
		for (Rule__c obj : templateRulesLst) {
            createdRecords.add(obj);
        }
		insert createdRecords;
		//map<String,String> newRecords = new Map<String,String>();
		for (Rule__c obj : createdRecords) {
            map<String,String> newRecords = new Map<String,String>();
            newRecords.put('Id', String.valueOf(obj.Id));
            newRecords.put('ExternalId', obj.DxCPQ__External_Id__c);
            recordIds.add(newRecords);
        }
        return recordIds;        
    }
    
    @AuraEnabled
    public static List<Map<String,String>> createImportedRuleConditions(String tempRuleCondLst){
        List<Map<String,String>> recordIds = new List<Map<String,String>>();
        List<Rule_Condition__c> templateRuleCondLst = (List<Rule_Condition__c>) JSON.deserialize(tempRuleCondLst, List<Rule_Condition__c>.class);
        List<Rule_Condition__c> createdRecords = new List<Rule_Condition__c>();
		for (Rule_Condition__c obj : templateRuleCondLst) {
            createdRecords.add(obj);
        }
		insert createdRecords;
		//map<String,String> newRecords = new Map<String,String>();
		for (Rule_Condition__c obj : createdRecords) {
            map<String,String> newRecords = new Map<String,String>();
            newRecords.put('Id', String.valueOf(obj.Id));
            newRecords.put('ExternalId', obj.DxCPQ__External_Id__c);
            recordIds.add(newRecords);
        }
        return recordIds;        
    }
    
    @AuraEnabled
    public static List<ContentVersion> createImportedWatermark(String watermarkLst){
        List<Map<String,String>> recordIds = new List<Map<String,String>>();
        Map<String,Object> imageMap = (Map<string,Object>) JSON.deserializeuntyped(watermarkLst);
        //List<ContentVersion> templateWatermarkLst = (List<ContentVersion>) JSON.deserialize(watermarkLst, List<ContentVersion>.class);
        List<ContentVersion> createdRecords = new List<ContentVersion>();
        List<ContentVersion> contentVersionsToInsert = new List<ContentVersion>();
        List<Document_Template__c> docTempList1 = [SELECT Id, Name, Watermark_Data__c, External_Id__c FROM Document_Template__c];
        List<String> docTempLst = new List<String>();
        //System.debug ('For loop starts ');
        for (String imageDataId : imageMap.keySet()){
            Map<String, Object> imageData = (Map<String, Object>) imageMap.get(imageDataId);
    		Map<String, Object> contentVersionData = (Map<String, Object>) imageData.get('ContentVersionData');
            String oldImageId = (String)contentVersionData.get('DxCPQ__External_Id__c');
            Id docTempId;
            for (Document_Template__c dtImg: docTempList1){
                //System.debug ('2nd For loop starts for '+dtImg.id );
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
            //System.debug ('For loop iterating throught the data. External ID='+cv.External_Id__c);
            contentVersionsToInsert.add(cv);
            docTempLst.add(cv.FirstPublishLocationId); 
            //contentVersionData.put('VersionData',imageblob);
        }
        //System.debug ('For loop over ');
        //List<ContentVersion> templateWatermarkLst;
        //List<String> docTempLst = new List<String>();
        //for (ContentVersion obj : templateWatermarkLst) {
        //    createdRecords.add(obj);
        //    docTempLst.add(obj.External_Id__c); 
        //}
		insert contentVersionsToInsert;
        List<Document_Template__c> templatesToUpdate = new List<Document_Template__c>();
        List<Document_Template__c> docTempList = [SELECT Id, Name, Watermark_Data__c, External_Id__c FROM Document_Template__c where Id IN: docTempLst];
        for (Document_Template__c dt: docTempList){
            String watermarkData = dt.Watermark_Data__c;
            for (ContentVersion cvId : contentVersionsToInsert) {
                //System.debug ('For loop for replacing values for '+ watermarkData);
                if (cvId.FirstPublishLocationId == dt.Id){
        			watermarkData = watermarkData.replace(cvId.External_Id__c, cvId.Id);
                    //System.debug ('For loop has replaced values in '+ watermarkData);
                }
    		}
            dt.Watermark_Data__c = watermarkData;
            templatesToUpdate.add(dt);
        }
        update templatesToUpdate;
        return createdRecords;
    }
}