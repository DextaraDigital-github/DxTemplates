/**
* The LanguageTranslator class facilitates the conversion of content tokens into a user-selected language.
* It also retrieves the available organization languages that users can choose for their conversations.
* This class ensures robustness through comprehensive error handling mechanisms.
* It is designed to seamlessly integrate with Salesforce Lightning Web Components (LWC),
* providing versatile functionality for template customization and data presentation.
* By utilizing the LanguageTranslator class, data management within Salesforce applications is streamlined,
* enhancing the overall efficiency and user experience.
*/

/**
* @description Represents LanguageTranslatorClass, which is a class with sharing.
*              class facilitates the conversion of content tokens into a user-selected language.
*/
public with sharing class LanguageTranslatorClass {
    
    /**
	* @description    Retrieves all available user languages from the LanguageLocaleKey picklist on the User object.
	* @return         List<ComboBoxOption> List of available user languages as ComboBoxOption objects.
	*/
    @AuraEnabled(cacheable=true)
    public static List<ComboBoxOption> getAllUserLanguages(){
        List<ComboBoxOption> options = new List<ComboBoxOption>();
        try {
            for(PicklistEntry value: User.LanguageLocalekey.getDescribe().getPicklistValues()) {
                options.add(new ComboBoxOption(value.getValue(),value.getLabel()));
            }
        } catch (Exception ex) {
            LogHandler.createLog((Id) null,'LanguageTranslatorClass Error',ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
        }
        return options;
    }
    
    /**
 	* @description    Retrieves translation records for a specified language or the current user's language if none is provided.
 	* @param          language String representing the language for which to retrieve translation records.
 	* @return         List<DxCPQ__Translator__c> List of translation records for the specified language.
 	*/
    @AuraEnabled(cacheable=true)
    public static List<DxCPQ__Translator__c> langTransRecs(String language){ 
        String str;  
        if(language!=null){
            str = language;
        }else{
            str = [SELECT toLabel(LanguageLocaleKey) FROM User WHERE Id= :UserInfo.getUserId()].LanguageLocaleKey;
        }
        List<DxCPQ__Translator__c> translatedList = [select id, name, DxCPQ__FieldValue__c, DxCPQ__Translated_Value__c,DxCPQ__Language__c, DxCPQ__DocumentTemplate__c  from DxCPQ__Translator__c  WHERE DxCPQ__Language__c =: str];
        return translatedList;
    }
    
    /**
 	* @description    Retrieves translation records for a specified language.
 	* @param          language String representing the language for which to retrieve translation records.
 	* @return         List<DxCPQ__Translator__c> List of translation records for the specified language.
 	*/
    @AuraEnabled
    public static List<DxCPQ__Translator__c> selectedLangMethod(String language, String docTempId){
        List<DxCPQ__Translator__c> translatedList = [
            SELECT Id, Name, DxCPQ__FieldValue__c, DxCPQ__Translated_Value__c, DxCPQ__Language__c, DxCPQ__DocumentTemplate__c
            FROM DxCPQ__Translator__c
            WHERE DxCPQ__Language__c = :language AND DxCPQ__DocumentTemplate__c =:docTempId
            AND (NOT DxCPQ__FieldValue__c LIKE '%{%')
        ];
        
                return translatedList;
    }
    
    /**
 	* @description    Retrieves the current user's language setting.
 	* @return         String Current user's language setting.
 	*/
    @AuraEnabled(cacheable=true)
    public static String currectUserLang(){    
        return [SELECT toLabel(LanguageLocaleKey) FROM User WHERE Id= :UserInfo.getUserId()].LanguageLocaleKey;
    }  
    
    /**
    * @description    Creates or updates translation records based on provided JSON data, language, and section ID.
    * @param          jsonStringData String containing JSON data with translation records.
    * @param          language String representing the language for the translation records.
    * @param          sectionId Id of the section related to the translation records.
    * @return         Boolean True if the operation was successful, false otherwise.
    */
    @AuraEnabled
    public static Boolean createUpdateMethod(String jsonStringData, String language, Id docTemplateId){
        Boolean upsertSuccess = false;
        try{
            //Id docTemplateId = [Select id, DxCPQ__Document_Template__c from DxCPQ__Document_Template_Section__c where Id =: sectionId].DxCPQ__Document_Template__c;
            List<wrapperData> wrapdata=(List<wrapperData>)JSON.deserialize(jsonStringData, List<wrapperData>.class);
            String regex = '^[a-zA-Z0-9_-]{18}$'; 
            List<DxCPQ__Translator__c> upsertTransLanguages = new List<DxCPQ__Translator__c>();
            for(wrapperData wrapItem : wrapdata){
                DxCPQ__Translator__c transRec = new DxCPQ__Translator__c();
                if(wrapItem.Id != null && Pattern.matches(regex, wrapItem.Id)){
                    transRec.Id = wrapItem.Id;
                }
                transRec.Name = wrapItem.Name;
                transRec.DxCPQ__FieldValue__c = wrapItem.FieldValue !=null ? wrapItem.FieldValue : wrapItem.Name;
                transRec.DxCPQ__Translated_Value__c = wrapItem.TranslatedValue;
                transRec.DxCPQ__Language__c = language;
                transRec.DxCPQ__DocumentTemplate__c = docTemplateId;
                upsertTransLanguages.add(transRec);
            }
            if(upsertTransLanguages.size()>0){
                List<Database.upsertResult> uResults = Database.upsert(upsertTransLanguages,false);
                // Rows are saved one by one (a refused row does not stop the others), so the caller is only told "true" when every row was saved.
                upsertSuccess = true;
                for(Database.upsertResult uResult : uResults){
                    if(!uResult.isSuccess()){
                        upsertSuccess = false;
                        LogHandler.createLog((Id) null,'LanguageTranslatorClass Error','createUpdateMethod',String.valueOf(uResult.getErrors()),'Exception');
                    }
                }
            }
        } catch(exception ex){
            LogHandler.createLog((Id) null,'LanguageTranslatorClass Error',ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
        }
        return upsertSuccess;
    }
    
    /**
    * @description    Deletes a translation record identified by its ID.
    * @param          deleteRecordId Id of the translation record to be deleted.
    * @return         Boolean True if the operation was successful, false otherwise.
 	*/
    @AuraEnabled
    public static Boolean deleteMethod(Id deleteRecordId){
        Boolean deleteSuccess=false;
        try{
            DxCPQ__Translator__c translationRec = [SELECT Id, DxCPQ__Language__c FROM DxCPQ__Translator__c WHERE Id = :deleteRecordId LIMIT 1];
            if(translationRec!=null){
                Database.DeleteResult drRcord = Database.delete(translationRec, false);
                deleteSuccess = true;
            }
        } catch(Exception ex){
            LogHandler.createLog((Id) null,'LanguageTranslatorClass Error',ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');    
        }
        return deleteSuccess; 
    }
    
    /**
 	* @description    Wrapper class to hold data for translation records.
 	*/
    public class wrapperData{
        public String Id;
        public String Name;
        public String FieldValue;
        public String TranslatedValue;
    }
    
    /**
 	* @description    Class to represent options in a combo box.
 	*/
    public class ComboBoxOption {
        @AuraEnabled public String value { get; set; }
        @AuraEnabled public String label { get; set; }
        
        public ComboBoxOption(String value, String label) {
            this.value = value;
            this.label = label;
        }
    }
    
    /**
 	* @description    Retrieves the selected language from the custom Metadata
 	* @return         String selected language setting from Custom Metadata
 	*/
    @AuraEnabled(cacheable=true)
    public static String getLanguageSelected(Id recordId){  
        Schema.SObjectType objectType = recordId.getSObjectType();
        String objectAPIName = objectType.getDescribe().getName();
        System.debug('objectAPIName --> '+ objectAPIName);
        List<DxCPQ__Document_Translation__mdt> metadataRecords = [SELECT Field_API_Name__c FROM DxCPQ__Document_Translation__mdt  WHERE Object_API_Name__c = :objectAPIName];
        System.debug('metadataRecords --> '+ metadataRecords);
        if (metadataRecords.isEmpty()) {
            return null;
        }
        String fieldAPIName = metadataRecords[0].Field_API_Name__c;
        System.debug('fieldAPIName --> '+ fieldAPIName);
        String soql = 'SELECT ' + fieldAPIName + ' FROM ' + objectAPIName + ' WHERE Id = :recordId LIMIT 1';
        SObject record;

        try {
            record = Database.query(soql);
        } catch (Exception e) {
            System.debug('Error querying record: ' + e.getMessage());
            return null;
        }
        if (record != null) {
            return (String) record.get(fieldAPIName);
        }
        return null;
    }
    
    @AuraEnabled
    public static Boolean insertTranslatedRecords(List<Map<String, Object>> translatedRecords) {
        Boolean insertSuccess = false;
        List<Translator__c > recordsToInsert = new List<Translator__c >();
        
        if (translatedRecords == null || translatedRecords.isEmpty()) {
            return insertSuccess;
        }

        try {
            for (Map<String, Object> recordMap : translatedRecords) {
                Translator__c  newRecord = new Translator__c ();
                if (recordMap.containsKey('Name')) {
                    newRecord.Name = (String) recordMap.get('Name');
                }
                if (recordMap.containsKey('DxCPQ__FieldValue__c')) {
                    newRecord.DxCPQ__FieldValue__c = (String) recordMap.get('DxCPQ__FieldValue__c');
                }
                if (recordMap.containsKey('DxCPQ__Translated_Value__c')) {
                    newRecord.DxCPQ__Translated_Value__c = (String) recordMap.get('DxCPQ__Translated_Value__c');
                }
                if (recordMap.containsKey('DxCPQ__Language__c')) {
                    newRecord.DxCPQ__Language__c = (String) recordMap.get('DxCPQ__Language__c');
                }
                if (recordMap.containsKey('DxCPQ__DocumentTemplate__c')) {
                    newRecord.DxCPQ__DocumentTemplate__c = (String) recordMap.get('DxCPQ__DocumentTemplate__c');
                }
                
                recordsToInsert.add(newRecord);
            }

            if (!recordsToInsert.isEmpty()) {
                List<Database.SaveResult> saveResults = Database.insert(recordsToInsert, false);
                insertSuccess = true;
                for (Database.SaveResult result : saveResults) {
                    if (!result.isSuccess()) {
                        insertSuccess = false;
                        break;
                    }
                }
            }
        } catch (Exception ex) {
            LogHandler.createLog(null, 'LanguageTranslatorClass insertTranslatedRecords method Error', ex.getLineNumber() + ex.getStackTraceString() + ex.getCause(), ex.getMessage(), 'Exception');
        }
        
        return insertSuccess;
    }
    
    @AuraEnabled
    public static List<Translator__c> getAllTranslations(String docTempId) {
        List<Translator__c> transLst = [ SELECT Id, Name, FieldValue__c, Translated_Value__c, Language__c, DocumentTemplate__c FROM Translator__c where DocumentTemplate__c =:docTempId WITH USER_MODE ];
        return transLst;
    }    
}