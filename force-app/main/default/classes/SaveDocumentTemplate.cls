public with sharing class SaveDocumentTemplate {
    public static Safely safe = new Safely();
    private static Savepoint sp1;
    
    @AuraEnabled
    public static String saveDocumentTemplatedetails(Document_Template__c Recorddetails , String hasRecordId){
        String insertedID = '';
        String Updatedrecord = '';
        try{
            Document_Template__c DocTemp = new Document_Template__c();
            if( hasRecordId ==''){
                
                DocTemp.Name = Recorddetails.Name;
                DocTemp.Description__c = Recorddetails.Description__c;
                DocTemp.Related_To_Type__c = Recorddetails.Related_To_Type__c;
                DocTemp.DxCPQ__PDF_Page_Properties__c= Recorddetails.DxCPQ__PDF_Page_Properties__c;
                DocTemp.FlowId__c = Recorddetails.FlowId__c;
                DocTemp.ClassId__c = Recorddetails.ClassId__c;
                List<Document_Template__c> listtobecreated=new List<Document_Template__c>();
                listtobecreated.add(DocTemp);
                if (sp1 == null) sp1 = Database.setSavepoint();
                Database.SaveResult[] urListsave = safe.doInsert(listtobecreated);
                List<String> errorList1 = Safely.safeClassExceptionHandlerInsert(urListsave);
                if(errorList1.size()>0){
                    Database.rollback(sp1);
                    throw new SafeClassException(String.join( errorList1, ', ' ));
                }
                insertedID = DocTemp.ID;
            }
            else if (hasRecordId != null && hasRecordId != ''){
                DocTemp.ID = hasRecordId;
                DocTemp.Description__c = Recorddetails.Description__c;
                DocTemp.DxCPQ__PDF_Page_Properties__c= Recorddetails.DxCPQ__PDF_Page_Properties__c;
                List<Document_Template__c> listtobeupdated=new List<Document_Template__c>();
                listtobeupdated.add(DocTemp);
                if (sp1 == null) sp1 = Database.setSavepoint();
                Database.SaveResult[] urList2 = safe.doUpdate(listtobeupdated);
                List<String> errorList2 = Safely.safeClassExceptionHandlerInsert(urList2);
                if(errorList2.size()>0){
                    Database.rollback(sp1);
                    throw new SafeClassException(String.join( errorList2, ', ' ));
                }
                Updatedrecord = 'Record updated Succesfuly';
            }
            return (insertedID !=null && insertedID !='') ? insertedID : Updatedrecord;
        }
        catch (Exception ex) {
            LogHandler.createLog((Id) null,'SaveDocumentTemplate.saveDocumentTemplatedetails()','Template Id- '+insertedID+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
            return null;
        }
    }
        
    @AuraEnabled
    public static Document_Template__c cloneDocumentTemplate(Document_Template__c docTemp, Id docTempId)	{
        try	{
            List<Document_Template_Section__c> docTempSec = [SELECT ID, Name, IsActive__c, New_Page__c, Section_Content__c, Sequence__c, Section_Details__c, Type__c, Document_Clause__c, ruleId__c, Section_Visibility_Rule__c, Header_Content__c FROM Document_Template_Section__c WHERE Document_Template__c=:docTempId WITH SECURITY_ENFORCED limit 50000];
            // "New Version" comes with the parent of the selected template (the family); "New Template" comes with no parent and starts its own family.
            Boolean isNewTemplate = docTemp != null && docTemp.Parent_Template__c == null;
            List<Document_Template__c> docCloneTemplate = isNewTemplate ? new List<Document_Template__c>() : [SELECT ID, Name,Version_Number__c,Watermark_Data__c,PDF_Page_Properties__c, FlowId__c, ClassId__c  FROM Document_Template__c WHERE Parent_Template__c= :docTemp.Parent_Template__c WITH SECURITY_ENFORCED order by Version_Number__c desc limit 1];
            
            if(docTemp!=null){
                docTemp.Version_Number__c = docCloneTemplate.isEmpty() ? 1 : docCloneTemplate[0].Version_Number__c + 1;
                if (sp1 == null) sp1 = Database.setSavepoint();
                Database.SaveResult[] urListsave = safe.doInsert(new List<Document_Template__c> {docTemp});

                List<String> errorList1 = Safely.safeClassExceptionHandlerInsert(urListsave);
                if(errorList1.size()>0){
                Database.rollback(sp1);
                    throw new SafeClassException(String.join( errorList1, ', ' ));
                }

                for (Database.SaveResult sr : urListsave) {
                    if (sr.isSuccess()) {
                        docTemp.Id = sr.getId();
                        docTemp.External_ID__c = docTemp.Id;
                        if (isNewTemplate) { docTemp.Parent_Template__c = docTemp.Id; }
                        docTempId = docTemp.Id;
                        if (sp1 == null) sp1 = Database.setSavepoint();
                        Database.UpsertResult[] urList2 = safe.doupsert(docTemp);
                        List<String> errorList = Safely.safeClassExceptionHandlerUpsert(urList2);
                        if(errorList.size()>0){
                            Database.rollback(sp1);
                            throw new SafeClassException(String.join( errorList, ', ' ));
                        }

                    } else {
                        for(Database.Error err : sr.getErrors()) {
                            System.debug('The following error has occurred.');                    
                            System.debug(err.getStatusCode() + ': ' + err.getMessage());
                            System.debug('fields that affected this error: ' + err.getFields());
                        }
                    }
                }
                            }

            List<Document_Template_Section__c> docTempSecCloneList = new List<Document_Template_Section__c>();

            for(Document_Template_Section__c dts : docTempSec){
                Document_Template_Section__c docSec = new Document_Template_Section__c();
                docSec.Name = dts.Name;
                docSec.IsActive__c = dts.IsActive__c;
                docSec.Section_Content__c = dts.Section_Content__c;
                docSec.Sequence__c = dts.Sequence__c;
                docSec.Section_Details__c = dts.Section_Details__c;
                docSec.Type__c = dts.Type__c;
                docSec.Document_Clause__c = dts.Document_Clause__c;                
                docSec.New_Page__c = dts.New_Page__c;                
                docSec.Header_content__c = dts.Header_content__c;
                docSec.Document_Template__c = docTemp.Id;
                if(dts.ruleId__c != null) {
                    Id clonedRuleId = RelatedObjectsClass.cloneRulesFromParentTemplate(dts.Id);
                    docSec.ruleId__c = clonedRuleId;
                }
                if(dts.Section_Visibility_Rule__c != null) {
                    docSec.Section_Visibility_Rule__c = RelatedObjectsClass.cloneRulesFromParentTemplate(dts.Id, 'Section Visibility Rule');
                }
                docTempSecCloneList.add(docSec);
            }
            
            if(docTempSecCloneList!=null && docTempSecCloneList.size()>0)	{
                if (sp1 == null) sp1 = Database.setSavepoint();
                Database.SaveResult[] urListsave = safe.doInsert(docTempSecCloneList);
                List<String> errorList2 = Safely.safeClassExceptionHandlerInsert(urListsave);
                                if(errorList2.size()>0){
                                    Database.rollback(sp1);
                                    throw new SafeClassException(String.join( errorList2, ', ' ));
                                }
            }
            return docTemp;   
        }
        catch (Exception ex) {
            LogHandler.createLog((Id) null,'SaveDocumentTemplate.cloneDocumentTemplate()','Template Id- '+docTempId+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
            return null;
        }
    }
    
    @AuraEnabled
    public static List<Document_Template__c> getDocumentTemplates(String filterValue){
        List<Document_Template__c> docTemp = [SELECT Id, Name,isactive__c, Related_To_Type__c, Version_Number__c, Previously_Active__c, Parent_Template__c FROM Document_Template__c WITH SECURITY_ENFORCED order by CreatedDate Desc limit 50000];
        if(filterValue != null && filterValue != ''){
        	docTemp = [SELECT Id, Name,isactive__c, Related_To_Type__c, Version_Number__c, Previously_Active__c, Parent_Template__c FROM Document_Template__c WHERE Related_To_Type__c=:filterValue WITH SECURITY_ENFORCED order by CreatedDate Desc limit 50000];
        }
        return docTemp;
    }
    
    @AuraEnabled
    public static Document_Template__c activateTemplate(Id templateId, String parentId, Boolean isActive){
        try{
            
            List<Document_Template__c> docTempList = new List<Document_Template__c>();
            Map<Id,Document_Template__c> docTempMap = new Map<Id,Document_Template__c>([SELECT Id, Name, IsActive__c, Previously_Active__c, Version_Number__c, Parent_Template__c FROM Document_Template__c WHERE Id=:templateId OR Parent_Template__c=:parentId WITH SECURITY_ENFORCED limit 50000]);
            Document_Template__c docTemp = docTempMap.get(templateId);
            
                if(isActive){
                docTemp.Previously_Active__c = (!docTemp.Previously_Active__c) ? true: false ;
                
                for(Document_Template__c dct : docTempMap.values()) {
                    if(dct.Id != templateId) {
                        dct.IsActive__c = false;
                        docTempList.add(dct);
                    }
                }
            }
            docTemp.IsActive__c = isActive;
            docTempList.add(docTemp);
                        
            if (sp1 == null) sp1 = Database.setSavepoint();
            Database.UpsertResult[] urList2 = safe.doupsert(docTempList);
            List<String> errorList = Safely.safeClassExceptionHandlerUpsert(urList2);
                if(errorList.size()>0){
                    Database.rollback(sp1);
                    throw new SafeClassException(String.join( errorList, ', ' ));
                }
            return docTemp;
        }
        catch (Exception ex) {
            LogHandler.createLog((Id) null,'SaveDocumentTemplate.activateTemplate()','Template Id- '+templateId+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
            return null;
        }
    }
    
    @AuraEnabled
    public static void deleteTemplate(Id templateId){
        try{

            Map<ID,Document_Template__c> docTempMap = new Map<ID,Document_Template__c>([SELECT ID, Name,Version_Number__c,Parent_Template__c FROM Document_Template__c WHERE Parent_Template__c= :templateId OR ID=:templateId WITH SECURITY_ENFORCED ORDER BY Version_Number__c limit 50000]);
            Document_Template__c delDocTemp = docTempMap.get(templateId);
            list<Document_Template_section__c> rltdRO = [SELECT Id, Type__c, RuleId__c, Document_Template__c FROM Document_Template_Section__c where document_template__c=:templateId and Type__c='Related Objects' WITH SECURITY_ENFORCED limit 50000];
            list<Id> arrRuleIdtoDelete = new list<Id> {};        
                
            for(integer i=0; i<rltdRO.size(); i++){
                arrRuleIdtoDelete.add(rltdRO[i].RuleId__c);            
            }
            list<Rule__c> arrRuletoDelete = [Select Id from Rule__c where Id in: arrRuleIdtoDelete WITH SECURITY_ENFORCED limit 50000];
                
            if(arrRuletoDelete.size() > 0)
            {
                if (sp1 == null) sp1 = Database.setSavepoint();
                List<Database.DeleteResult> deleteResult = safe.doDelete(arrRuletoDelete);
                List<String> errorList = Safely.safeClassExceptionHandlerDelete(deleteResult);
                if(errorList.size()>0){
                    Database.rollback(sp1);
                    throw new SafeClassException(String.join( errorList, ', ' ));
                }
            }
                
            List<Document_Template__c> deletedts = new List<Document_Template__c>();
            deletedts.add(delDocTemp);
            if(deletedts.size()>0){
                if (sp1 == null) sp1 = Database.setSavepoint();
                List<Database.DeleteResult> deleteResult = safe.doDelete(deletedts);
                List<String> errorList = Safely.safeClassExceptionHandlerDelete(deleteResult);
                if(errorList.size()>0){
                    Database.rollback(sp1);
                    throw new SafeClassException(String.join( errorList, ', ' ));
                }
            }
            
            docTempMap.remove(templateId);
            for(Document_Template__c docTemp : docTempMap.values()){
                docTemp.Parent_Template__c=docTempMap.values()[0].ID;
            }

            if (sp1 == null) sp1 = Database.setSavepoint();
            Database.UpsertResult[] urList2 = safe.doupsert(docTempMap.values());
                List<String> errorList2 = Safely.safeClassExceptionHandlerUpsert(urList2);
                if(errorList2.size()>0){
                Database.rollback(sp1);
                throw new SafeClassException(String.join(errorList2, ', ' ));
            }
        }
        catch (Exception ex) {
            LogHandler.createLog((Id) null,'SaveDocumentTemplate.deleteTemplate()','Template Id- '+templateId+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
                    }
    }
    
    @AuraEnabled
    public static Document_Template__c createDocumentTemplate(Document_Template__c docTemp){
                String docTempId='';

        try{
            if (sp1 == null) sp1 = Database.setSavepoint();
            Database.SaveResult[] urListsave = safe.doInsert(docTemp);
            List<String> errorList1 = Safely.safeClassExceptionHandlerInsert(urListsave);
            if(errorList1.size()>0){
                Database.rollback(sp1);
                throw new SafeClassException(String.join( errorList1, ', ' ));
            }
            docTemp.Parent_Template__c = docTemp.Id;
            docTemp.Version_Number__c = 1;
            docTemp.External_ID__c = docTemp.Id;
            docTempId = docTemp.Id;
            if (sp1 == null) sp1 = Database.setSavepoint();
            Database.UpsertResult[] urList2 = safe.doupsert(docTemp);
            List<String> errorList = Safely.safeClassExceptionHandlerUpsert(urList2);
            if(errorList.size()>0){
                Database.rollback(sp1);
                throw new SafeClassException(String.join( errorList, ', ' ));
            }
            return docTemp;
        }
        catch (Exception ex) {
            LogHandler.createLog((Id) null,'SaveDocumentTemplate.createDocumentTemplate()','Template Id- '+docTempId+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
            return null;
        }
    }
    
    //Filtering by Related to type in Template
    @AuraEnabled
    public static List<AggregateResult> getRelatedToTypeOptions(){
        String queryString = 'SELECT Related_To_Type__c FROM Document_Template__c WITH SECURITY_ENFORCED group by Related_To_Type__c limit 5000';
        List<AggregateResult> relatedTypeOptions = Database.query(queryString);
        return relatedTypeOptions;
    }
    
    /**
    * @description this getClassNames method is used to get
    * the all the interface implemented classes
    * Author : Reethika
    */
    @AuraEnabled
    public static Map<string,string> getClassNames() {      
        List <ApexTypeImplementor> classnames= [SELECT ClassName, ApexClassId FROM ApexTypeImplementor WHERE InterfaceName ='DXHandlerInterface' WITH SECURITY_ENFORCED];
        Map<String,String> classId=new Map<string,string>();
        for(ApexTypeImplementor a:classnames)
        {
            classId.put(a.ApexClassId,a.ClassName);
        }     
        return classId;
    }
    
    /**
    * @description this getFlowNames method is used to get
    * the all the autolaunched flows
    * Author : Reethika
    */
    @AuraEnabled
    public static Map<string,string> getFlowNames() {        
       List <FlowDefinitionView> classnames= [SELECT  Label, ApiName, DurableId, NamespacePrefix, Id FROM FlowDefinitionView WHERE ProcessType='AutoLaunchedFlow' AND NamespacePrefix = '' AND IsActive=True WITH SECURITY_ENFORCED];
       Map<String,String> FlowId=new Map<string,string>();
        for(FlowDefinitionView a:classnames) {
            FlowId.put(a.DurableId,a.Label);
        }             
        return FlowId;
    }  
    
    /**
    * @description this gettemplatedata method is used to get
    * the template data
    * Author : Reethika
    */
    @AuraEnabled
    public static List<Document_Template__c> gettemplatedata(string editrecordid) {
        List<Document_Template__c> d=[SELECT ClassId__c,FlowId__c FROM Document_Template__c WHERE id=:editrecordid WITH SECURITY_ENFORCED];        
        return d;
    }

    /**
    * @description this updateTemplateDetails method is used to update
    * the template data
    * Author : Reethika
    */
    @AuraEnabled
    public static  void updateTemplateDetails(Map<String,String> templateData,string idval) {
        List<Document_Template__c> docTempList=[SELECT ClassId__c,FlowId__c FROM Document_Template__c WHERE id=:idval WITH SECURITY_ENFORCED];
        if(templateData.containsKey('classId')){
            docTempList[0].ClassId__c=templateData.get('classId');
        }
        if(templateData.containsKey('flowId')){
            docTempList[0].FlowId__c=templateData.get('flowId');
        }
        if (sp1 == null) sp1 = Database.setSavepoint();
        Database.SaveResult[] urList2 = safe.doUpdate(docTempList);
        List<String> errorList = Safely.safeClassExceptionHandlerUpdate(urList2);
        if(errorList.size()>0){
            Database.rollback(sp1);
            throw new SafeClassException(String.join( errorList, ', ' ));
        }
    }

    public class SafeClassException extends Exception   { }
}