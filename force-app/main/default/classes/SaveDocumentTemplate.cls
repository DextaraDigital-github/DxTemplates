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
                system.debug('inside update block');
                DocTemp.ID = hasRecordId;
                DocTemp.Description__c = Recorddetails.Description__c;
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
            throw new AuraHandledException(ex.getMessage());
        }
    }
        
    @AuraEnabled
    public static Document_Template__c cloneDocumentTemplate(Document_Template__c docTemp, Id docTempId){
        try{
            List<Document_Template_Section__c> docTempSec = [SELECT ID, Name, IsActive__c, New_Page__c, Section_Content__c, Sequence__c, Section_Details__c, Type__c, Document_Clause__c, ruleId__c, Header_Content__c FROM Document_Template_Section__c WHERE Document_Template__c=:docTempId WITH SECURITY_ENFORCED limit 50000];
            List<Document_Template__c> docTempList = [SELECT ID, Name,Version_Number__c FROM Document_Template__c WHERE Parent_Template__c= :docTemp.Parent_Template__c OR ID=:docTemp.Parent_Template__c WITH SECURITY_ENFORCED limit 50000];
            System.debug(docTempList);
            
            if(docTemp!=null){
                Decimal version=0;
                for(Document_Template__c dct : docTempList){
                    if(dct.Version_Number__c >= version){
                        version=dct.Version_Number__c+1;
                    }
                }
                
                System.debug('version is'+version);
                docTemp.Version_Number__c=version;
                List<Document_Template__c> listtobecreated=new List<Document_Template__c>();
                listtobecreated.add(docTemp);
                if (sp1 == null) sp1 = Database.setSavepoint();
                Database.SaveResult[] urListsave = safe.doInsert(listtobecreated);
                List<String> errorList1 = Safely.safeClassExceptionHandlerInsert(urListsave);
                if(errorList1.size()>0){
                Database.rollback(sp1);
                    throw new SafeClassException(String.join( errorList1, ', ' ));
                }

                for (Database.SaveResult sr : urListsave) {
                    if (sr.isSuccess()) {
                        docTemp.Id = sr.getId();
                    }
                    else {
                        for(Database.Error err : sr.getErrors()) {
                            System.debug('The following error has occurred.');                    
                            System.debug(err.getStatusCode() + ': ' + err.getMessage());
                            System.debug('fields that affected this error: ' + err.getFields());
                        }
                    }
                }
                System.debug('this is doctemp id'+docTemp.Id);
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
                if(dts.ruleId__c != null)
                {
                    Id clonedRuleId = RelatedObjectsClass.cloneRulesFromParentTemplate(dts.Id);
                    docSec.ruleId__c = clonedRuleId;
                }
                docTempSecCloneList.add(docSec);
            }
            if(docTempSecCloneList!=null && docTempSecCloneList.size()>0){
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
            System.debug(ex.getLineNumber());
            LogHandler.createLog((Id) null,'SaveDocumentTemplate.cloneDocumentTemplate()','Template Id- '+docTempId+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
            throw new AuraHandledException(ex.getMessage());
        }
    }
    
    @AuraEnabled
    public static List<Document_Template__c> getDocumentTemplates(String filterValue){
        List<Document_Template__c> docTemp = [SELECT Id, Name,isactive__c, Related_To_Type__c, Version_Number__c, Previously_Active__c, Parent_Template__c FROM Document_Template__c WITH SECURITY_ENFORCED order by CreatedDate Desc limit 50000];
        if(filterValue != null){
        	docTemp = [SELECT Id, Name,isactive__c, Related_To_Type__c, Version_Number__c, Previously_Active__c, Parent_Template__c FROM Document_Template__c WHERE Related_To_Type__c=:filterValue WITH SECURITY_ENFORCED order by CreatedDate Desc limit 50000];
        }
        System.debug(docTemp);
        return docTemp;
    }
    
    @AuraEnabled
    public static Document_Template__c activateTemplate(Id templateId, String parentId, Boolean isActive){
        try{
            System.debug('template id is '+templateId);
            System.debug('parent id is '+parentId);
            Map<Id,Document_Template__c> docTempMap = new Map<Id,Document_Template__c>([SELECT Id, Name,isactive__c, Previously_Active__c, Parent_Template__c FROM Document_Template__c WHERE id=:templateId OR Parent_Template__c=:parentId WITH SECURITY_ENFORCED limit 50000]);
            System.debug('these are initial doctemp values'+docTempMap.values());
            Document_Template__c docTemp = docTempMap.get(templateId);
            List<Document_Template__c> docTempList = new List<Document_Template__c>();
            if(isActive==true){
                if(docTemp.Previously_Active__c==false){
                    docTemp.Previously_Active__c=true;
                }
                for(Document_Template__c dct : docTempMap.values()){
                    if(dct.Id!=templateId){
                        dct.isactive__c=false;
                        docTempList.add(dct);
                    }
                }
            }
            docTemp.isactive__c=isActive;
            docTempList.add(docTemp);
            System.debug('this is doc temp list'+docTempList);
            
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
            throw new AuraHandledException(ex.getMessage());
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
            throw new AuraHandledException(ex.getMessage());
        }
    }
    
    @AuraEnabled
    public static Document_Template__c createDocumentTemplate(Document_Template__c docTemp){
        //insert docTemp;
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
            throw new AuraHandledException(ex.getMessage());
        }
    }
    
    //Filtering by Related to type in Template
    @AuraEnabled
    public static List<AggregateResult> getRelatedToTypeOptions(){
        String queryString = 'SELECT Related_To_Type__c FROM Document_Template__c WITH SECURITY_ENFORCED group by Related_To_Type__c limit 5000';
        List<AggregateResult> relatedTypeOptions = Database.query(queryString);
        return relatedTypeOptions;
    }

    public class SafeClassException extends Exception   { }
}