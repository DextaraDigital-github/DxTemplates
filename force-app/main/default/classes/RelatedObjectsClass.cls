global with sharing class RelatedObjectsClass {
    
    public static Safely safe = new Safely();
	private static Savepoint sp1;
    
    //Below method will return the list of child object names for the selectedobject
    @AuraEnabled
    public static map<string,string> getRelatedObjects(string selectedObject){
        try{
            system.debug('Selected Parent SObject Name '+ selectedObject);
            map<string,string> relatedObjectsMap = new map<string,string>();
            list<Schema.Childrelationship> relatedObjectsList = Schema.getGlobalDescribe().get(selectedObject).getdescribe().getChildRelationships();
            for (Schema.Childrelationship relatedObject : relatedObjectsList) 
            {
                if(relatedObject.getChildSObject().getDescribe().getKeyPrefix()!=null
                &&
                !relatedObject.getChildSObject().getDescribe().isCustomSetting())
                {
                    String objectName=relatedObject.getChildSObject().getDescribe().getName();
                    if(!objectName.endsWithIgnoreCase('__Share') || !objectName.endsWithIgnoreCase('ChangeEvent') )
                    {
                        relatedObjectsMap.put(objectName,String.Valueof(relatedObject.getField()));
                    }
                }
            }
            return relatedObjectsMap;
        }
        catch (Exception ex) {
            LogHandler.createLog((Id) null,'RelatedObjectsClass.getRelatedObjects()','selectedObject -> '+selectedObject+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
            return null;
        }  
    }
    
    //Below method will return the list of field names present in the selected object
    @AuraEnabled
    public static Map<string,string> getFields(String selectedObject){
    try{
        Map<string,string> reqFieldsMap=new Map<string,string>();
        List<String> reqFields = new List<String>();
        Map <String,Schema.SObjectType> gd = Schema.getGlobalDescribe();
        Schema.SObjectType sobjType = gd.get(selectedObject);
        Schema.DescribeSObjectResult r = sobjType.getDescribe();
        Map<String, Schema.SObjectField> MapofField = r.fields.getMap();        
        
        for(String fieldName : MapofField.keySet()) {
            Schema.SObjectField field = MapofField.get(fieldName);
            Schema.DescribeFieldResult F = field.getDescribe();
            reqFields.add(String.ValueOf(field));
            reqFieldsMap.put(String.ValueOf(field),String.Valueof(F.getLabel()));
        }
        System.debug(reqFields);
        return reqFieldsMap;
    }
    catch (Exception ex) {
        LogHandler.createLog((Id) null,'RelatedObjectsClass.getFields()','selectedObject -> '+selectedObject+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
        return null;
    }  
    }
    
    @AuraEnabled
    public static Document_Template__c getRelatedObjectForSelectedDocumentTemplate(Id docTempId){
        Document_Template__c docTemp = [SELECT Id, Name, Related_To_Type__c, IsActive__c FROM Document_Template__c WHERE Id=:docTempId WITH SECURITY_ENFORCED LIMIT 1];
        return docTemp;
    }
    
    @AuraEnabled
    public static Map<String,Object> getGroupingValues(String selectedObject){
        try{
            Map<String,Object> reqFields = new Map<String,Object>();
            Map <String,Schema.SObjectType> gd = Schema.getGlobalDescribe();
            Schema.SObjectType sobjType = gd.get(selectedObject);
            Schema.DescribeSObjectResult r = sobjType.getDescribe();
            Map<String, Schema.SObjectField> MapofField = r.fields.getMap();
            for(String fieldName : MapofField.keySet()) {
                Schema.SObjectField field = MapofField.get(fieldName);
                Schema.DescribeFieldResult F = field.getDescribe();
                if(f.getType()+''=='PICKLIST')
                {                
                    List<Object> lst = new List<Object>();
                    for(Integer i=0;i<F.getPicklistValues().size();i++)
                    {
                        Map<String,String> mp = new Map<String,String>();
                        mp.put('label',F.getPicklistValues()[i].getLabel());
                        mp.put('value',F.getPicklistValues()[i].getValue());
                        lst.add(mp);
                    }
                    reqFields.put(fieldName,lst);
                }        	
            }
            System.debug(reqFields);
            return reqFields;
        }
        catch (Exception ex) {
            LogHandler.createLog((Id) null,'RelatedObjectsClass.getGroupingValues()','selectedObject -> '+selectedObject+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
            return null;
        }  
    }    
    
    /* TemplateRelatedObjects LWC Calls - Intended for Filtering Rules - Modified by Rahul*/
    @AuraEnabled	
    public static List<ConditionObjectWrapper> getSObjectListFiltering(String selectedChildObjectLabel){        	
        List<ConditionObjectWrapper> conditionObjectList = new List<ConditionObjectWrapper>();	
        System.debug(selectedChildObjectLabel);
        ConditionObjectWrapper cWrap =  new ConditionObjectWrapper();	
                cWrap.objectLabelName = selectedChildObjectLabel;	
                cWrap.objectAPIName = selectedChildObjectLabel;	
                cWrap.fieldSet = getFieldsWrapper(cWrap.objectAPIName);	
        conditionObjectList.add(cWrap);	
        return conditionObjectList;	
    }
    
    public static List<FieldWrap> getFieldsWrapper(String selectedObject){
        try{
            Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe(); 
            Schema.SObjectType ctype = gd.get(selectedObject); 
            Map<String, Schema.SobjectField> fmap = ctype.getDescribe().fields.getMap();   
            List<FieldWrap> strList = new List<FieldWrap>();        
            for(String fieldName: fmap.keySet()) {
                String dType = String.valueOf(fmap.get(fieldName).getDescribe().getType());
                if(dType== 'PICKLIST' || dType == 'BOOLEAN' || dType == 'INTEGER' || dType == 'DOUBLE' || dType=='CURRENCY' || dType=='PERCENT' || dType=='STRING' || dType=='TEXT'){
                //if(dType== 'PICKLIST' || dType == 'BOOLEAN' || dType == 'INTEGER' || dType == 'DOUBLE' || dType=='CURRENCY' || dType=='PERCENT'){	
                    FieldWrap wmp = new FieldWrap();
                    wmp.name = fmap.get(fieldName).getDescribe().getLabel(); 
                    wmp.apiName = fieldName;
                    wmp.dataType = String.valueOf(fmap.get(fieldName).getDescribe().getType());
                    if(wmp.dataType=='PICKLIST'){
                        List<String> plistValues = new List<String> ();
                        List<Schema.PicklistEntry> plist = fmap.get(fieldName).getDescribe().getPickListValues();
                        for(Schema.PicklistEntry pl : plist){
                            plistValues.add(pl.getValue());
                        }
                        wmp.values = plistValues;
                    }
                    strList.add(wmp);
                }
            }
            System.debug(strList);
            return strList;   
        }
        catch (Exception ex) {
            LogHandler.createLog((Id) null,'RelatedObjectsClass.getFieldsWrapper()','selectedObject -> '+selectedObject+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
            return null;
        }   
    }
    
    @AuraEnabled
    public static List<Rule_Condition__c> getExistingConditions(String ruleName){
        List<Rule_Condition__c> existingConditions = RuleSelector.getRuleConditions(ruleName);
        return existingConditions;
    }
    
    public static Id cloneRulesFromParentTemplate(Id parentTempSecId){
        return cloneRulesFromParentTemplate(parentTempSecId, null);
    }

    // ruleType 'Section Visibility Rule' copies the visibility rule of the section; anything else copies its data filter rule
    public static Id cloneRulesFromParentTemplate(Id parentTempSecId, String ruleType){
        try{

            Document_Template_Section__c parentSection = [Select ruleId__c, Section_Visibility_Rule__c from document_template_section__c where id=:parentTempSecId WITH SECURITY_ENFORCED limit 1];
            Id docRule = ruleType == 'Section Visibility Rule' ? parentSection.Section_Visibility_Rule__c : parentSection.ruleId__c;
            Rule__c tempRule = [Select Id, Rule_Expression__c,Rule_Description__c, (Select Condition_Field__c,ConditionIndex__c,DataType__c,Evaluation_Object__c,Value__c,Name,Operator__c from Rule_Conditions__r) from rule__c where Id=:docRule WITH SECURITY_ENFORCED];
            List<Map<String,Object>> condsArr = new List<Map<String,Object>> {};
            for(Rule_Condition__c item : tempRule.Rule_Conditions__r) {
                Map<String,Object> condMap = new Map<String,Object> {};
                condMap.put('Id',null);
                condMap.put('conditionIndex',item.ConditionIndex__c);
                condMap.put('selectedObject',item.Evaluation_Object__c);
                condMap.put('value',item.Value__c);
                condMap.put('operator',item.Operator__c);
                condMap.put('conditionName',item.Name);
                condMap.put('selectedField',item.Condition_Field__c);
                condMap.put('dataType',item.DataType__c);
                condsArr.add(condMap);
            }
            String condString = JSON.serializePretty(condsArr);
            String cloneRule = createRuleCondition(condString, tempRule.Rule_Expression__c, null, null,null);
            return cloneRule;
        }
        catch (Exception ex) {
            LogHandler.createLog((Id) null,'RelatedObjectsClass.cloneRulesFromParentTemplate()','parentTempSecId -> '+parentTempSecId+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
            return null;
        }  
    }
    
    @AuraEnabled
    public static String createRuleCondition(String ruleConditions, String ruleExpression, List<Id> deleteIds , String sectionrecordid,String ruleType){
        try{
            System.debug(deleteIds);
            Id RuleId;
            Id tempruleId;
            Id tempexternalruleId;
            String ruleName;
            //System.debug(deleteIds.size());
            if(deleteIds != null && deleteIds.size() > 0){
                RuleSelector.deleteRuleConditions(deleteIds); 
            }
            ruleExpression = ruleExpression.replaceAll('"','');

            if(sectionrecordid!=null &&!sectionrecordid.contains('NotSaved')){
                Document_Template_Section__c tsobj = [select Section_Visibility_Rule__c,RuleId__c,Name from Document_Template_Section__c where id=:sectionrecordid WITH SECURITY_ENFORCED];
                tempruleId = ruleType == 'Section Visibility Rule' ? tsobj.Section_Visibility_Rule__c : tsobj.RuleId__c;
                //tempruleId = tsobj.RuleId__c;
                if(tempruleId==null){
                    Rule__c newRule = new Rule__c();
                    newRule.Rule_Expression__c = ruleExpression;
                    newRule.Rule_Description__c = 'Template Filtering Rule';
                    //insert newRule;      

                    Database.SaveResult[] srLst1 = safe.doInsert(new List<Rule__C> {newRule});
                    List<String> errorList1 = Safely.safeClassExceptionHandlerInsert(srLst1);
                    if(errorList1.size()>0){
                        throw new SafeClassException(String.join( errorList1, ', ' ));
                    } else{
                        newRule.Id = srLst1[0].Id;
                        // Created Id is inserted into External Id field. Used for Export Import functionality
                        newRule.External_Id__c = newRule.Id;
                        Database.SaveResult[] updateResult = safe.doUpdate(new List<Rule__C> {newRule});
        				List<String> errorList2 = Safely.safeClassExceptionHandlerInsert(updateResult);
                        if (errorList2.size() > 0) {
                            throw new SafeClassException(String.join(errorList2, ', '));
                        }
                    }
                
                
                    tempruleId = newRule.Id;
                    tempexternalruleId = newRule.External_Id__c;
                    //Rule__c arr = [Select Name from Rule__c where Id=:tempruleId WITH SECURITY_ENFORCED];
                    //ruleName = arr.Name;
                    ruleName = tempruleId;
                }
                else{
                    Rule__c arr = [Select Name,Rule_Expression__c from Rule__c where Id=:tempruleId WITH SECURITY_ENFORCED];
                    arr.Rule_Expression__c = ruleExpression;
                    //update arr;

                    Database.SaveResult[] srLst1 = safe.doUpdate(new List<Rule__c> {arr});
                    List<String> errorList1 = Safely.safeClassExceptionHandlerInsert(srLst1);
                    if(errorList1.size()>0){
                        throw new SafeClassException(String.join( errorList1, ', ' ));
                    }
                }
            }
            else{
                Rule__c newRule = new Rule__c();
                newRule.Rule_Expression__c = ruleExpression;
                newRule.Rule_Description__c = 'Template Filtering Rule';
                //insert newRule;
                
                Database.SaveResult[] srLst1 = safe.doInsert(new List<Rule__C> {newRule});
                List<String> errorList1 = Safely.safeClassExceptionHandlerInsert(srLst1);
                if(errorList1.size()>0){
                    throw new SafeClassException(String.join( errorList1, ', ' ));
                } else{
                    newRule.Id = srLst1[0].Id;
                }
                
                tempruleId = newRule.Id;
                //Rule__c arr = [Select Name from Rule__c where Id=:tempruleId WITH SECURITY_ENFORCED];
                //ruleName = arr.Name;
                ruleName = tempruleId;
            }        
            
            List<Rule_Condition__c> conditions = new List<Rule_Condition__c>();
            List<Rule_Condition__c> insertConditionsList = new List<Rule_Condition__c>();
            List<Rule_Condition__c> updateConditionsList = new List<Rule_Condition__c>();
            String jsonStr = ruleConditions;
            
            JSONParser conditionParser = JSON.createParser(jsonStr);
            System.debug('ConditionParser is:'+conditionParser);
            while (conditionParser.nextToken() != null) {
                if (conditionParser.getCurrentToken() == JSONToken.START_OBJECT) {
                    RuleConditionWrapper ruleCondition = (RuleConditionWrapper)conditionParser.readValueAs(RuleConditionWrapper.class);
                    Rule_Condition__c condition = new  Rule_Condition__c();
                    if(!String.isBlank(ruleCondition.Id)){
                        condition.Id = ruleCondition.Id;
                    }
                    condition.Name = ruleCondition.conditionName;
                    if(condition.Id==null){
                        condition.Rule__c= tempruleId;
                        condition.External_Id__c = tempexternalruleId;
                    }               
                    
                    condition.Operator__c= ruleCondition.operator;
                    condition.Evaluation_Object__c= ruleCondition.selectedObject;
                    condition.DataType__c= ruleCondition.dataType;
                    condition.Condition_Field__c= ruleCondition.selectedField;
                    condition.Value__c= ruleCondition.value;
                    condition.ConditionIndex__c = ruleCondition.conditionIndex;
                    conditions.add(condition);
                }
            }
            System.debug(conditions);
            if(conditions.size()>0){
                for(Rule_Condition__c rulCond : conditions) {
                    if (rulCond.Id==null) {                                        
                        insertConditionsList.add(rulCond);
                    } else {                        
                        updateConditionsList.add(rulCond);
                    }
                }
                if(insertConditionsList.size()>0){
                    if (sp1 == null) sp1 = Database.setSavepoint();
                    Database.SaveResult[] srLst1 = safe.doInsert(insertConditionsList);
                    List<String> errorList1 = Safely.safeClassExceptionHandlerInsert(srLst1);
                    if(errorList1.size()>0){
                        Database.rollback(sp1);
                        throw new SafeClassException(String.join( errorList1, ', ' ));
                    }
                }
                if(updateConditionsList.size()>0){
                    if (sp1 == null) sp1 = Database.setSavepoint();
                    Database.SaveResult[] srList2 = safe.doUpdate(updateConditionsList);
                    List<String> errorList2 = Safely.safeClassExceptionHandlerInsert(srList2);
                    if(errorList2.size()>0){
                        Database.rollback(sp1);
                        throw new SafeClassException(String.join( errorList2, ', ' ));
                    }
                }
            }
            System.debug('The rule condition list is: '+conditions);
            return ruleName;
        }
        catch (Exception ex) {
            LogHandler.createLog((Id) null,'RelatedObjectsClass.createRuleCondition()','sectionrecordid -> '+sectionrecordid+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
            return 'Error';
        }  
    }
    
    public class RuleConditionWrapper{
        @AuraEnabled
        public String Id {get;set;}
        @AuraEnabled
        public String conditionName {get;set;}
        @AuraEnabled
        public String operator {get;set;}
        @AuraEnabled
        public String selectedObject {get;set;}
        @AuraEnabled
        public String dataType {get;set;}
        @AuraEnabled
        public String selectedField {get;set;}
        @AuraEnabled
        public String value {get;set;}
        @AuraEnabled
        public String conditionIndex {get;set;}
	}
    
    public class ConditionObjectWrapper{
        @AuraEnabled
        public String objectLabelName{get;set;}
        @AuraEnabled
        public String objectAPIName{get;set;}
        @AuraEnabled
        public List<FieldWrap> fieldSet{get;set;}
    }
	
   	public class FieldWrap{
        @AuraEnabled
        public String name{get;set;}
        @AuraEnabled
        public String apiName{get;set;}
        @AuraEnabled
        public String dataType{get;set;}
        @AuraEnabled
        public List<String> values{get;set;}
    }
    
    public class SafeClassException extends Exception{        
	}
    
    @AuraEnabled
    public static String handleTemplateRuleResetCondition(Id templateRuleId) {
        try{
            Rule__c templateRule = [Select Id from Rule__c Where Id=:templateRuleId WITH SECURITY_ENFORCED limit 1];        
            List<Rule__c> deleteRule = new List<Rule__c> {templateRule};
            
            Savepoint sp = Database.setSavepoint();
            List<Database.DeleteResult> deleteResult = safe.doDelete(deleteRule);
            List<String> errorList = Safely.safeClassExceptionHandlerDelete(deleteResult);
            if(errorList.size()>0){
                Database.rollback(sp);
                throw new SafeClassException(String.join( errorList, ', ' ));
            } 
            return 'Success';
        } catch(Exception ex){
            LogHandler.createLog((Id) null,'RelatedObjectsClass.handleTemplateRuleResetCondition()','Rule Id -> '+ templateRuleId +' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
        	return 'Error';
        }
    }
}