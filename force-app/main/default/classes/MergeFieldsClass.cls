/* The MergeFieldsClass assists in merging record fields into templates, handles title case conversions, 
 * and retrieves object fields for dynamic form generation.
 * Error handling ensures robustness. 
 * It integrates with Salesforce Aura components, offering versatile 
 * functionality for template customization and data presentation. 
 * With features like field merging and dynamic form 
 * generation, it enhances user experience and 
 * streamlines data management within Salesforce applications.
*/


/**
 * @description Represents the MergeFieldsClass, which is a class with sharing.
 *              This class provides functionality related to merging fields.
 */
public with sharing class MergeFieldsClass {
    /**
     * @description    Merges fields from the specified record into the selected template contents
     * @param          selectedTemplateContents  List of Document_Template_Section__c representing selected template contents
     * @param          recordId                  Id of the record from which fields will be merged
     * @return         List<Document_Template_Section__c> The modified template contents with merged fields
     */
      
     public static List<Document_Template_Section__c> mergefieldsMethod(List<Document_Template_Section__c> selectedTemplateContents, Id recordId,Map<String,Object> replaceData) {   
        try{
            Id templateSectionId;
            String objectName = recordId.getSObjectType().getDescribe().getName();
            String mainstr;
            templateSectionId = selectedTemplateContents[0].Id;
            Id  docTemplate = [Select id,Document_Template__c from Document_Template_Section__c where Id =: templateSectionId].Document_Template__c;
            Map<String, String> nameTransValueMap = new map<String, String>();
            //getting Document Language from the Custom Metadata
            String userLanguage = LanguageTranslatorClass.getLanguageSelected(recordId);
            String language = '';
            String locale = '';
            if(userLanguage != null){
                Integer underscoreIndex = userLanguage.indexOf('_');
                if (underscoreIndex != -1) {
                    language = userLanguage.substring(0, underscoreIndex);
                    locale = userLanguage.substring(underscoreIndex + 1);
                }
            }
            else{
                locale = [SELECT LanguageLocaleKey FROM User WHERE Id = : UserInfo.getUserId() WITH SECURITY_ENFORCED].LanguageLocaleKey;
                if(locale != null){
                    locale = 'en_US';
                }
            }
            
            List<Translator__c> translatorList = [select id, DocumentTemplate__c, Name, DxCPQ__FieldValue__c, Translated_Value__c, Language__c  from Translator__c where Language__c =:locale and DocumentTemplate__c=:docTemplate WITH SECURITY_ENFORCED];
            for(Translator__c transRec: translatorList){
                string value;
                if(transRec.Translated_Value__c != null  && transRec.Translated_Value__c.contains('<') && transRec.Translated_Value__c.contains('>')){
                   value = transRec.Translated_Value__c.replaceAll('<[^>]+>', '');  
                }else{
                    value = transRec.Translated_Value__c;
                }
                if(transRec.DxCPQ__FieldValue__c != null){
                    nameTransValueMap.put(transRec.DxCPQ__FieldValue__c, value);
                }
                else{
                    nameTransValueMap.put(transRec.Name, value);
                }
            }
            for (Document_Template_Section__c sec : selectedTemplateContents) {
                String sectionContent = sec.Section_Content__c;
                for(String str : nameTransValueMap.keySet()){
                    if(nameTransValueMap.get(str)!=null){
                      sectionContent = sectionContent.replace('&lt;&lt;' + str + '&gt;&gt;', nameTransValueMap.get(str));  
                    }
                }
                sec.Section_Content__c = sectionContent;
            }
            for(Document_Template_Section__c sec: selectedTemplateContents) {
                if(mainstr==null){
                    mainstr=sec.Section_Content__c;
                }else{
                    mainstr=mainstr+sec.Section_Content__c;
                }
            }
            String mainObject=objectName;
            /* <Checks if string contains %% if yes then customLogic method is called> */
            if(mainstr.contains('%%') && replaceData.size()>0)
            {           
                for(Document_Template_Section__c sec: selectedTemplateContents)
                {
                    String str =customLogic(replaceData,sec.Section_Content__c);
                    sec.Section_Content__c=sec.Section_Content__c.replace(sec.Section_Content__c, str);   
                }
            }
            else if(mainstr.contains('##'))
            {
                 for(Document_Template_Section__c sec: selectedTemplateContents)
                { 
                    String replaceStr = replaceTableSectionContent(sec.Section_Content__c);
                    sec.Section_Content__c=sec.Section_Content__c.replace(sec.Section_Content__c, replaceStr);   
                }
                
            }
            
            Pattern p = Pattern.compile('\\{!.+?\\}');
            Matcher m = p.matcher(mainstr);
            String mainfields;
            Set<String> mainfieldsList = new Set<String>();
            
            while(m.find()) {
                String strReplace = '{!'+mainObject+'.';
                String str = m.group(0).replace(strReplace,'').replace('}',', ');
                String str1 = str.replace(',','');
                mainfieldsList.add(str1);           
            }

            for(String str : mainfieldsList){
                if(mainfields==null){
                    mainfields=str;
                }else{
                    mainfields = mainfields+', '+str;  
                }
            }

            if(mainfields!=null) {
                mainfields = mainfields.removeEnd(', ');
                string mainSOQL='Select '+String.escapeSingleQuotes(mainfields)+' from '+String.escapeSingleQuotes(mainObject)+' where Id= \'' + recordId + '\' WITH SECURITY_ENFORCED';
                sObject qrec=Database.query(mainSOQL);
                Map<String, Object> mainMap = (Map<String, Object>) JSON.deserializeUntyped(JSON.serialize(qrec));           
                for(Document_Template_Section__c sec: selectedTemplateContents) {
                    for(String str:mainfieldsList)  {
                        str = str.replaceAll('(\\s+)', '');
                        if (mainMap.containsKey(str)) {
                            String mergefieldsyntaxWithBrackets = '&lt;&lt;{!' + mainObject + '.' + str + '}&gt;&gt;';
                            String mergefieldsyntax = '{!' + mainObject + '.' + str + '}';
                            String nameTransValue = String.valueOf(mainMap.get(str));
                            if (sec.Section_Content__c.contains(mergefieldsyntaxWithBrackets)) {
                                sec.Section_Content__c = nameTransValueMap.get(nameTransValue) != null ? 
                                    sec.Section_Content__c.replace(mergefieldsyntaxWithBrackets, String.valueOf(nameTransValueMap.get(nameTransValue))) : 
                                    sec.Section_Content__c.replace(mergefieldsyntaxWithBrackets, nameTransValue);
                            } else if (sec.Section_Content__c.contains(mergefieldsyntax)) {
                                sec.Section_Content__c = nameTransValueMap.get(nameTransValue) != null ? 
                                    sec.Section_Content__c.replace(mergefieldsyntax, String.valueOf(nameTransValueMap.get(nameTransValue))) : 
                                    sec.Section_Content__c.replace(mergefieldsyntax, nameTransValue);
                            }
                        }
                        else {
                            String finalvalue;
                            if(str.contains('.')){
                                List<String> strList = new List<string>();
                                strList=str.split('\\.');
                                Map<String, Object> tempObj=new Map<String, Object>();
                                tempObj=mainMap;
                                String resVal; 
                                for(Integer j=0; j<strList.size(); j++) {
                                    if(tempObj.containskey(strList[j]))  {
                                        if(j==strList.size()-1)   {
                                            finalvalue=String.valueOf(tempObj.get(strList[j]));
                                        }else  {
                                            tempObj=(Map<String, Object>)tempObj.get(strList[j]);                                            
                                        }
                                    }
                                }
                            }
                            if(finalvalue!=null)  {
                                string mergefieldsyntax='{!'+mainObject+'.'+str+'}';
                                sec.Section_Content__c= nameTransValueMap.get(finalvalue) != null ? sec.Section_Content__c.replace(mergefieldsyntax, nameTransValueMap.get(finalvalue)): sec.Section_Content__c.replace(mergefieldsyntax, finalvalue); 
                            }
                            else{
                                string mergefieldsyntax='{!'+mainObject+'.'+str+'}';
                                sec.Section_Content__c=sec.Section_Content__c.replace(mergefieldsyntax, ''); 
                            }
                        }
                    }
                }
            }
            
        } catch(Exception ex) {
            LogHandler.createLog((Id) null,'MergeFieldsClass Error',ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
        }        
        return selectedTemplateContents;
    }
    
    /**
     * @description    Converts a phrase to title case
     * @param          phrase String to be converted to title case
     * @return         String Phrase converted to title case
     */
    public static String toTitleCase(String phrase){
        String titlePhrase = '';
        try{
            Set<String> forceLower = new Set<String>{'of', 'the', 'for', 'and', 'a', 'to', 'at' ,'an', 'but', 'if', 'or', 'nor'};
                if(phrase != null && phrase.length() > 0){
                    String[] splitPhrase = phrase.trim().split(' ');                
                    for(integer i = 0; i < splitPhrase.size(); i++){
                        if(!forceLower.contains(splitPhrase[i].toLowerCase()) || i == 0 || i == (splitPhrase.size()-1) ){
                            titlePhrase += (splitPhrase[i].substring(0,1).toUpperCase())+(splitPhrase[i].substring(1).toLowerCase())+' ';
                        }else{
                            titlePhrase += splitPhrase[i].toLowerCase()+' ';
                        }
                    }
                }
        } catch(Exception ex){
            LogHandler.createLog((Id) null,'MergeFieldsClass Error',ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
        }
        return titlePhrase.trim();
    }
    
    /**
     * @description    Retrieves the fields of a selected object
     * @param          selectedObject String name of the selected object
     * @return         List<FieldWrap> List of FieldWrap objects representing the fields of the selected object
     */
    @AuraEnabled
    public static List<FieldWrap> getFields(String selectedObject){
        Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe(); 
        Schema.SObjectType ctype = gd.get(selectedObject); 
        Map<String, Schema.SobjectField> fmap = ctype.getDescribe().fields.getMap();   
        List<FieldWrap> strList = new List<FieldWrap>();
        try{
            for(String fieldName: fmap.keySet()) {
                FieldWrap wmp = new FieldWrap();
                String dType = String.valueOf(fmap.get(fieldName).getDescribe().getType());
                wmp.name = fmap.get(fieldName).getDescribe().getLabel(); 
                wmp.apiName = fmap.get(fieldName).getDescribe().getName();
                
                wmp.dataType = String.valueOf(fmap.get(fieldName).getDescribe().getType()); 
                if(dType== 'REFERENCE'){
                    wmp.name=wmp.name+'>';
                    Schema.DescribeFieldResult f = fmap.get(fieldName).getDescribe();
                    for(Schema.SObjectType reference : f.getReferenceTo()) {
                        wmp.sObjectName = String.valueOf(reference.getDescribe().getName());
                    }
                    wmp.relationshipName=String.valueOf(fmap.get(fieldName).getDescribe().getRelationshipName());
                }
                
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
        } catch(Exception ex) {
            LogHandler.createLog((Id) null,'MergeFieldsClass Error',ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
        }
        return strList;    
    }
    
    /**
     * @description Represents a wrapper class used to encapsulate field information.
     *              This class provides properties to store metadata about a field, such as its name, API name,
     *              data type, values, sObject name, and relationship name.
     */
    public class FieldWrap{
        /**
         * @description Represents the name of the field.
         */
        @AuraEnabled
        public String name{get;set;}
        
        /**
         * @description Represents the API name of the field.
         */
        @AuraEnabled
        public String apiName{get;set;}
        
        /**
         * @description Represents the data type of the field.
         */
        @AuraEnabled
        public String dataType{get;set;}
        
        /**
         * @description Represents the list of values associated with the field.
         */
        @AuraEnabled
        public List<String> values{get;set;}
        
        /**
         * @description Represents the API name of the sObject to which the field belongs.
         */
        @AuraEnabled
        public String sObjectName{get;set;}
        
        /**
         * @description Represents the relationship name of the field (if it's a related field).
         */
        @AuraEnabled
        public String relationshipName{get;set;}
    }    

     /**
     * @description    Merges fields from the specified record into the selected template contents
     * @param          selectedTemplateContents  List of Document_Template_Section__c representing selected template contents
     * @param          recordIds                  List of Ids of the records from which fields will be merged
     * @return         List<Document_Template_Section__c> The modified template contents with merged fields
     */
    public static List<Document_Template_Section__c> mergefieldsMethodMultiple(List<Document_Template_Section__c> selectedTemplateContents, List<String> recordIds) {   
        try{
            List<Document_Template_Section__c> docsTempLst = new List<Document_Template_Section__c>();
				String objectName = ((Id)recordIds[0]).getSObjectType().getDescribe().getName();
				String mainstr;
				for(Document_Template_Section__c sec: selectedTemplateContents) {
					if(mainstr==null){
						mainstr=sec.Section_Content__c;
					}else{
						mainstr=mainstr+sec.Section_Content__c;
					}
				}
				String mainObject=objectName;
				
				Pattern p = Pattern.compile('\\{!.+?\\}');
				Matcher m = p.matcher(mainstr);
				String mainfields;
				Set<String> mainfieldsList = new Set<String>();
            while(m.find()) {
					String strReplace = '{!'+mainObject+'.';
					String str = m.group(0).replace(strReplace,'').replace('}',', ');
					String str1 = str.replace(',','');
					mainfieldsList.add(str1);
				}
				for(String str : mainfieldsList){
					if(mainfields==null){
						mainfields=str;
					}else{
						mainfields = mainfields+', '+str;  
					}
				}
            Integer executeHeadFoot = 0;
            	string mainSOQL='Select '+String.escapeSingleQuotes(mainfields)+' from '+String.escapeSingleQuotes(mainObject)+' where Id IN :recordIds WITH SECURITY_ENFORCED';
            for(Sobject qrec : Database.query(mainSOQL)){
                    
                    Boolean executeVar = false;
                    if(mainfields!=null) {
                        mainfields = mainfields.removeEnd(', ');
                        Map<String, Object> mainMap = (Map<String, Object>) JSON.deserializeUntyped(JSON.serialize(qrec));
                        for(Document_Template_Section__c sec: selectedTemplateContents) {
                            Document_Template_Section__c tempSec = (Document_Template_Section__c) JSON.deserialize(JSON.serialize(sec), Document_Template_Section__c.class);
                            if(executeHeadFoot == 0){
                                executeVar = true;
                            } else{
                                if(!tempSec.Type__c.equals('Header') && !tempSec.Type__c.equals('Footer')){
                                    executeVar = true;
                            	} else{
                                    executeVar = false;
                                }
                            }
                            if(executeVar){
                                for(String str:mainfieldsList)  {
                                    str = str.replaceAll('(\\s+)', '');
                                    if(mainMap.containskey(str)) {
                                        string mergefieldsyntax='{!'+mainObject+'.'+str+'}';
                                        tempSec.Section_Content__c=tempSec.Section_Content__c.replace(mergefieldsyntax, String.valueOf(mainMap.get(str)));
                                    } else {
                                        String finalvalue;
                                        if(str.contains('.')){
                                            List<String> strList = new List<string>();
                                            strList=str.split('\\.');
                                            Map<String, Object> tempObj=new Map<String, Object>();
                                            tempObj=mainMap;
                                            String resVal; 
                                            for(Integer j=0; j<strList.size(); j++) {
                                                if(tempObj.containskey(strList[j]))  {
                                                    if(j==strList.size()-1)   {
                                                        finalvalue=String.valueOf(tempObj.get(strList[j]));
                                                    }else  {
                                                        tempObj=(Map<String, Object>)tempObj.get(strList[j]);                                            
                                                    }
                                                }
                                            }
                                        }
                                        if(finalvalue!=null)  {
                                            string mergefieldsyntax='{!'+mainObject+'.'+str+'}';
                                            tempSec.Section_Content__c=tempSec.Section_Content__c.replace(mergefieldsyntax, finalvalue); 
                                        } else{
                                            string mergefieldsyntax='{!'+mainObject+'.'+str+'}';
                                            tempSec.Section_Content__c=tempSec.Section_Content__c.replace(mergefieldsyntax, ''); 
                                        }
                                    }
                                }
                                docsTempLst.add(tempSec);
                            }
                            executeVar = false;
                            
                        }   
                        
                    } 
                   executeHeadFoot = executeHeadFoot + 1; 
                } 
                mainstr = '';
            selectedTemplateContents = docsTempLst;
        } catch(Exception ex) {
            LogHandler.createLog((Id) null,'MergeFieldsClass Error',ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
        }        
        return selectedTemplateContents;
    }
    
    public static Map<Id,List<Document_Template_Section__c>> mergefieldsMethodMultiplePdf(List<Document_Template_Section__c> selectedTemplateContents, List<String> recordIds) {
        Map<Id,List<Document_Template_Section__c>> docsTempLstMap = new Map<Id,List<Document_Template_Section__c>>();
        try{
            List<Document_Template_Section__c> docsTempLst = new List<Document_Template_Section__c>();
            //List<Map<String,Object>> docsTempLstMap = new List<Map<String,Object>>();
            String objectName = ((Id)recordIds[0]).getSObjectType().getDescribe().getName();
            String mainstr;
            for(Document_Template_Section__c sec: selectedTemplateContents) {
                if(mainstr==null){
                    mainstr=sec.Section_Content__c;
                }else{
                    mainstr=mainstr+sec.Section_Content__c;
                }
            }
            String mainObject=objectName;
            Pattern p = Pattern.compile('\\{!.+?\\}');
            Matcher m = p.matcher(mainstr);
            String mainfields;
            Set<String> mainfieldsList = new Set<String>();
            while(m.find()) {
                String strReplace = '{!'+mainObject+'.';
                String str = m.group(0).replace(strReplace,'').replace('}',', ');
                String str1 = str.replace(',','');
                mainfieldsList.add(str1);
            }
            for(String str : mainfieldsList){
                if(mainfields==null){
                    mainfields=str;
                }else{
                    mainfields = mainfields+', '+str;  
                }
            }
            Integer executeHeadFoot = 0;
            string mainSOQL='Select '+String.escapeSingleQuotes(mainfields)+' from '+String.escapeSingleQuotes(mainObject)+' where Id IN :recordIds WITH SECURITY_ENFORCED';
            for(Sobject qrec : Database.query(mainSOQL)){
                System.debug('qrec--+ '+qrec);
                Boolean executeVar = false;
                if(mainfields!=null) {
                    mainfields = mainfields.removeEnd(', ');
                    Map<String, Object> mainMap = (Map<String, Object>) JSON.deserializeUntyped(JSON.serialize(qrec));
                    for(Document_Template_Section__c sec: selectedTemplateContents) {
                        Document_Template_Section__c tempSec = (Document_Template_Section__c) JSON.deserialize(JSON.serialize(sec), Document_Template_Section__c.class);
                        if(executeHeadFoot == 0){
                            executeVar = true;
                        } else{
                            if(!tempSec.Type__c.equals('Header') && !tempSec.Type__c.equals('Footer')){
                                executeVar = true;
                            } else{
                                executeVar = false;
                            }
                        }
                        if(executeVar){
                            for(String str:mainfieldsList)  {
                                str = str.replaceAll('(\\s+)', '');
                                if(mainMap.containskey(str)) {
                                    string mergefieldsyntax='{!'+mainObject+'.'+str+'}';
                                    tempSec.Section_Content__c=tempSec.Section_Content__c.replace(mergefieldsyntax, String.valueOf(mainMap.get(str)));
                                } else {
                                    String finalvalue;
                                    if(str.contains('.')){
                                        List<String> strList = new List<string>();
                                        strList=str.split('\\.');
                                        Map<String, Object> tempObj=new Map<String, Object>();
                                        tempObj=mainMap;
                                        String resVal; 
                                        for(Integer j=0; j<strList.size(); j++) {
                                            if(tempObj.containskey(strList[j]))  {
                                                if(j==strList.size()-1)   {
                                                    finalvalue=String.valueOf(tempObj.get(strList[j]));
                                                }else  {
                                                    tempObj=(Map<String, Object>)tempObj.get(strList[j]);                                            
                                                }
                                            }
                                        }
                                    }
                                    if(finalvalue!=null)  {
                                        string mergefieldsyntax='{!'+mainObject+'.'+str+'}';
                                        tempSec.Section_Content__c=tempSec.Section_Content__c.replace(mergefieldsyntax, finalvalue); 
                                    } else{
                                        string mergefieldsyntax='{!'+mainObject+'.'+str+'}';
                                        tempSec.Section_Content__c=tempSec.Section_Content__c.replace(mergefieldsyntax, ''); 
                                    }
                                }
                            }
                            docsTempLst.add(tempSec);
                        }
                        executeVar = false;
                        
                    }   
                    
                } 
                //executeHeadFoot = executeHeadFoot + 1;
                docsTempLstMap.put(qrec.Id,docsTempLst);
                docsTempLst =  new List<Document_Template_Section__c>();
            }
            mainstr = '';
            system.debug('docsTempLstMap '+docsTempLstMap);
        } catch(Exception ex) {
            LogHandler.createLog((Id) null,'MergeFieldsClass Error',ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
        }        
        return docsTempLstMap;
    }
    
     /* <customLogic method is used to replace %%data%% with the respective value from the
         map mp which is constructed in the GenericController class as well as from the flow> */
        
     public static String customLogic(Map<String, Object> mp, String mainstr) {
        String result = '';
        Pattern tokenPattern = Pattern.compile('%%(.*?)%%');
        Matcher tokenMatcher = tokenPattern.matcher(mainstr);
        List<String> tokens = new List<String>();
    
        while (tokenMatcher.find()) {
            tokens.add(tokenMatcher.group(1));
        }
    
        if (!tokens.isEmpty()) {
            List<String> rows = new List<String>();
            String trPatternStr = '<tr([^>]*)>([\\s\\S]*?)</tr>';
            Pattern trPattern = Pattern.compile(trPatternStr);
            Matcher trMatcher = trPattern.matcher(mainstr);
            String trAttributes = '';
    
            if (trMatcher.find()) {
                trAttributes = trMatcher.group(1);
            }
            Boolean hasSNoColumn = mainstr.contains('S.No');
            
            String tdPatternStr = '<td([^>]*)>([\\s\\S]*?)</td>';
            Pattern tdPattern = Pattern.compile(tdPatternStr);
            Matcher tdMatcher = tdPattern.matcher(mainstr);
            List<String> tdAttributes = new List<String>();
            List<String> tdContent = new List<String>();

            while (tdMatcher.find()) {
                tdAttributes.add(tdMatcher.group(1));
                tdContent.add(tdMatcher.group(2));
            }
    
            List<Map<String, Object>> wrapperDataList = getDataFromMap(mp, tokens);
            Integer serialNumber = 1; 
            for (Map<String, Object> data : wrapperDataList) {
                List<String> rowCells = new List<String>();
                Integer index = 0;
                if (hasSNoColumn) {
                    rowCells.add('<td' + (tdAttributes.size() > index ? tdAttributes[index] : '') + '>' + serialNumber + '</td>');
                    index++;
                }

                for (String token : tokens) {
                    String value = '';
                    if (token.contains('.')) {
                        value = getTokenValue(data, token);
                    } else {
                        value = mp.containsKey(token) ? String.valueOf(mp.get(token)) : '';
                    }
    
                    String tdAttr = tdAttributes.size() > index ? tdAttributes[index] : '';
                    String tdInnerContent = tdContent.size() > index ? tdContent[index] : '';
                    if (!String.isBlank(token)) {
                        tdInnerContent = tdInnerContent.replace('%%' + token + '%%', value != null ? value : '');
                    }
                    rowCells.add('<td' + tdAttr + '>' + tdInnerContent + '</td>');
                    index++;
                }

                while (index < tdContent.size()) {
                    rowCells.add('<td' + (tdAttributes.size() > index ? tdAttributes[index] : '') + '></td>');
                    index++;
                }
    
                String row = '<tr' + trAttributes + '>' + String.join(rowCells, '') + '</tr>';
                rows.add(row);
                serialNumber++;
            }

            String tableBody = String.join(rows, '');
            result = mainstr.replaceAll('(<tbody[^>]*>).*?(</tbody>)', '$1' + tableBody + '$2');
        } else {
            result = mainstr;
        }
    
        result = result.trim();
        return result;
    }
    
    // Recursive method to navigate through the map or list structure
    private static Object getDataFromMap(Object current, List<String> path, Integer index) {
        if (index >= path.size()) {
            return null;
        }
        String keyOrIndex = path[index];
        if (index == path.size() - 1) {
            if (current instanceof Map<String, Object>) {
                return ((Map<String, Object>) current).get(keyOrIndex);
            } else {
                return current;
            }
        }
    
        if (current instanceof Map<String, Object>) {
            Map<String, Object> currentMap = (Map<String, Object>) current;
            current = currentMap.get(keyOrIndex);
            return getDataFromMap(current, path, index + 1);
        }
    
        if (current instanceof List<Object>) {
            try {
                Integer listIndex = Integer.valueOf(path[index + 1]);
                List<Object> currentList = (List<Object>) current;
                if (listIndex >= 0 && listIndex < currentList.size()) {
                    current = currentList.get(listIndex);
                    return getDataFromMap(current, path, index + 2);
                } else {
                    return null;
                }
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }
    
    // Method to retrieve data based on the token path
    private static List<Map<String, Object>> getDataFromMap(Map<String, Object> mp, List<String> tokens) {
        if (tokens.isEmpty()) {
            return new List<Map<String, Object>>();
        }
        List<String> path = tokens[0].split('\\.');
        Object result = getDataFromMap(mp, path, 0);
    
        if (result instanceof List<Object>) {
            List<Object> resultList = (List<Object>) result;
            List<Map<String, Object>> finalResultList = new List<Map<String, Object>>();
            for (Object item : resultList) {
                if (item instanceof Map<String, Object>) {
                    finalResultList.add((Map<String, Object>) item);
                } else {
                    System.debug('Item in list is not a Map<String, Object>: ' + item);
                }
            }
            return finalResultList;
        } else {
            return new List<Map<String, Object>>();
        }
    }
    
    // Helper method to get the token value from the data map
    private static String getTokenValue(Map<String, Object> data, String token) {
        List<String> parts = token.split('\\.');
        String lastPart = parts[parts.size() - 1];
        return data.containsKey(lastPart) ? String.valueOf(data.get(lastPart)) : '';
    }
    
    //Method Added for Nested Tables Implementation 
    public static String replaceTableSectionContent(String mainstr) {   
        Pattern pattern = Pattern.compile('##(.*?)##');
        Matcher matcher = pattern.matcher(mainstr);
        
        String modifiedStr = mainstr;
    
        while (matcher.find()) {
            String extractedValue = matcher.group(1);
    
            try {
                Document_Template_Section__c section = [
                    SELECT Section_Content__c
                    FROM Document_Template_Section__c
                    WHERE Type__c = 'Table' AND Name = :extractedValue
                    LIMIT 1
                ];
    
                if (section != null && String.isNotEmpty(section.Section_Content__c)) {
                    String sectionContent = section.Section_Content__c;
                    
                    modifiedStr = modifiedStr.replaceFirst('##' + extractedValue + '##', sectionContent);
                } else {
                    System.debug('No matching record found');
                }
            } catch (Exception e) {
                System.debug('Error during string replacement: ' + e.getMessage());
            }
        }    
        return modifiedStr;
    }
}