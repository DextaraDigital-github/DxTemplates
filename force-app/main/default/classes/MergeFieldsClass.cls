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
     * @description    The language key of the translations to apply, as stored in Translator__c.Language__c (a user
     *                 language key such as en_US or fr). The language of the record is used as it is; the key was
     *                 split at the underscore before, which turned en_US into US and so never matched a translation.
     *                 Without a language on the record the translations of en_US apply.
     * @param          documentLanguage  value of the language field of the record, or null
     * @return         String language key
     */
    @TestVisible
    private static String resolveLocale(String documentLanguage) {
        return String.isBlank(documentLanguage) ? 'en_US' : documentLanguage.trim();
    }

    /**
     * @description    Merges fields from the specified record into the selected template contents
     * @param          selectedTemplateContents  List of Document_Template_Section__c representing selected template contents
     * @param          recordId                  Id of the record from which fields will be merged
     * @return         List<Document_Template_Section__c> The modified template contents with merged fields
     */
      
     public static List<Document_Template_Section__c> mergefieldsMethod(List<Document_Template_Section__c> selectedTemplateContents, Id recordId, Map<String,Object> replaceData) {   
        try{
            Id templateSectionId;
            String objectName = recordId.getSObjectType().getDescribe().getName();
            String mainstr;
            templateSectionId = selectedTemplateContents[0].Id;
            Id  docTemplate = [Select id,Document_Template__c from Document_Template_Section__c where Id =: templateSectionId].Document_Template__c;
            Map<String, String> nameTransValueMap = new map<String, String>();
            //getting Document Language from the Custom Metadata
            String userLanguage = LanguageTranslatorClass.getLanguageSelected(recordId);
            String locale = resolveLocale(userLanguage);
            
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
            String mainObject=objectName;
            // A table placed inside another section with ##Section name## is embedded first (tables of this template only), then the
            // values of a Flow or Apex class (%%token%%) are placed; the merge fields of the record come last so that fields inside
            // an embedded table are found too.
            Set<String> embeddedNames = embedTables(selectedTemplateContents);
            for (Document_Template_Section__c sec : selectedTemplateContents) {
                sec.Section_Content__c = customLogic(replaceData == null ? new Map<String, Object>() : replaceData, sec.Section_Content__c);
            }
            List<String> childTablesNames = new List<String>(embeddedNames);
            selectedTemplateContents = withoutEmbeddedTables(selectedTemplateContents, embeddedNames);
            mainstr = null;
            for (Document_Template_Section__c sec : selectedTemplateContents) {
                mainstr = mainstr == null ? sec.Section_Content__c : mainstr + sec.Section_Content__c;
            }
            if (mainstr == null) { mainstr = ''; }
            
                        String mainfields;
            Set<String> mainfieldsList = new Set<String>();
            for (String mergeField : mergeFieldsIn(mainstr)) {
                String strReplace = '{!'+mainObject+'.';
                String str = mergeField.replace(strReplace,'').replace('}',', ');
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
            selectedTemplateContents = withoutEmbeddedTables(selectedTemplateContents, embedTables(selectedTemplateContents));   // ##Section## tables, as in the single record path
            for (Document_Template_Section__c section : selectedTemplateContents) { section.Section_Content__c = customLogic(new Map<String, Object>(), section.Section_Content__c); }   // values of a Flow or class belong to one record: no placeholder text is left over
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
				
								String mainfields;
				Set<String> mainfieldsList = new Set<String>();
				for (String mergeField : mergeFieldsIn(mainstr)) {
					String strReplace = '{!'+mainObject+'.';
					String str = mergeField.replace(strReplace,'').replace('}',', ');
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
            selectedTemplateContents = withoutEmbeddedTables(selectedTemplateContents, embedTables(selectedTemplateContents));   // ##Section## tables, as in the single record path
            for (Document_Template_Section__c section : selectedTemplateContents) { section.Section_Content__c = customLogic(new Map<String, Object>(), section.Section_Content__c); }   // values of a Flow or class belong to one record: no placeholder text is left over
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
                        String mainfields;
            Set<String> mainfieldsList = new Set<String>();
            for (String mergeField : mergeFieldsIn(mainstr)) {
                String strReplace = '{!'+mainObject+'.';
                String str = mergeField.replace(strReplace,'').replace('}',', ');
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
    
     /* <customLogic places the values of a Flow or an Apex class (the map mp) into the text of one section:
         - %%List.Field%% in the row of a table: one row for each item of the list (the first row of the table is the pattern),
         - %%Name%% (or %%Path.To.Value%%) anywhere else: the value, and nothing when there is none.
         Text of the data is made safe for the PDF page (& and < are escaped), a value that is HTML is kept.> */
     public static String customLogic(Map<String, Object> mp, String mainstr) {
        if (String.isBlank(mainstr) || !mainstr.contains('%%')) { return mainstr; }
        String result = mainstr;

        // The table body is found by position: a regular expression over a long table fails with "Regex too complicated".
        Integer bodyOpen = mainstr.indexOf('<tbody');
        Integer bodyStart = bodyOpen < 0 ? -1 : mainstr.indexOf('>', bodyOpen) + 1;
        Integer bodyEnd = bodyStart > 0 ? mainstr.indexOf('</tbody>', bodyStart) : -1;
        if (bodyStart > 0 && bodyEnd >= 0) {
            String body = mainstr.substring(bodyStart, bodyEnd);
            List<String> tokens = tokensIn(body);
            List<String> listTokens = new List<String>();
            for (String token : tokens) { if (token.contains('.')) { listTokens.add(token); } }

            if (!listTokens.isEmpty()) {
                Matcher trMatcher = Pattern.compile('<tr([^>]*)>').matcher(body);
                String trAttributes = trMatcher.find() ? trMatcher.group(1) : '';
                Boolean hasSNoColumn = mainstr.contains('S.No');
                Matcher tdMatcher = Pattern.compile('<td([^>]*)>([\\s\\S]*?)</td>').matcher(body);
                List<String> tdAttributes = new List<String>();
                List<String> tdContent = new List<String>();
                while (tdMatcher.find()) {
                    tdAttributes.add(tdMatcher.group(1));
                    tdContent.add(tdMatcher.group(2));
                }

                List<String> rows = new List<String>();
                Integer serialNumber = 1;
                for (Map<String, Object> data : getDataFromMap(mp, listTokens)) {
                    List<String> rowCells = new List<String>();
                    Integer index = 0;
                    if (hasSNoColumn) {
                        rowCells.add('<td' + (tdAttributes.size() > index ? tdAttributes[index] : '') + '>' + serialNumber + '</td>');
                        index++;
                    }
                    for (String token : tokens) {
                        String value = token.contains('.') ? getTokenValue(data, token) : valueOf(mp, token);
                        String tdAttr = tdAttributes.size() > index ? tdAttributes[index] : '';
                        String tdInnerContent = tdContent.size() > index ? tdContent[index] : '';
                        tdInnerContent = tdInnerContent.replace('%%' + token + '%%', safeText(value));
                        rowCells.add('<td' + tdAttr + '>' + tdInnerContent + '</td>');
                        index++;
                    }
                    while (index < tdContent.size()) {
                        rowCells.add('<td' + (tdAttributes.size() > index ? tdAttributes[index] : '') + '></td>');
                        index++;
                    }
                    rows.add('<tr' + trAttributes + '>' + String.join(rowCells, '') + '</tr>');
                    serialNumber++;
                }
                result = mainstr.substring(0, bodyStart) + String.join(rows, '') + mainstr.substring(bodyEnd);
            }
        }
        return replaceScalars(mp, result).trim();
    }

    // Every {!Object.Field} merge field of a text (the text of the match, braces included). Found by position, not by a regular
    // expression: a regular expression over a long text fails with "Regex too complicated".
    private static List<String> mergeFieldsIn(String text) {
        List<String> fields = new List<String>();
        Integer start = text.indexOf('{!');
        while (start >= 0) {
            Integer finish = text.indexOf('}', start + 2);
            if (finish < 0) { break; }
            String inside = text.substring(start + 2, finish);
            if (!inside.contains('\n') && !inside.contains('\r') && inside.length() > 0) {
                fields.add(text.substring(start, finish + 1));
                start = text.indexOf('{!', finish + 1);
            } else {
                start = text.indexOf('{!', start + 2);
            }
        }
        return fields;
    }

    // The next %%token%% at or after fromIndex on one line: {start of the opening %%, end after the closing %%}, or null.
    // Found by position and not by a regular expression, which fails with "Regex too complicated" on a long text.
    private static List<Integer> nextToken(String text, Integer fromIndex) {
        Integer start = text.indexOf('%%', fromIndex);
        while (start >= 0) {
            Integer finish = text.indexOf('%%', start + 2);
            if (finish < 0) { return null; }
            String name = text.substring(start + 2, finish);
            if (!name.contains('\n') && !name.contains('\r')) { return new List<Integer>{ start, finish + 2 }; }
            start = text.indexOf('%%', start + 1);
        }
        return null;
    }

    private static List<String> tokensIn(String text) {
        List<String> tokens = new List<String>();
        List<Integer> found = nextToken(text, 0);
        while (found != null) {
            tokens.add(text.substring(found[0] + 2, found[1] - 2));
            found = nextToken(text, found[1]);
        }
        return tokens;
    }

    // The value of a token that is not a list: a plain name, or a path through nested maps. Lists and maps give nothing.
    private static String valueOf(Map<String, Object> mp, String token) {
        Object value = token.contains('.') ? getDataFromMap(mp, token.split('\\.'), 0) : mp.get(token);
        return (value == null || value instanceof List<Object> || value instanceof Map<String, Object>) ? '' : String.valueOf(value);
    }

    // Every %%token%% that is still in the text becomes its value, or nothing.
    private static String replaceScalars(Map<String, Object> mp, String text) {
        List<String> parts = new List<String>();
        Integer startAt = 0;
        List<Integer> found = nextToken(text, 0);
        while (found != null) {
            parts.add(text.substring(startAt, found[0]));
            parts.add(safeText(valueOf(mp, text.substring(found[0] + 2, found[1] - 2))));
            startAt = found[1];
            found = nextToken(text, startAt);
        }
        parts.add(text.substring(startAt));
        return String.join(parts, '');
    }

    // Text from a Flow or Apex class goes into XHTML: & and < must not break the PDF page. A value that holds real HTML tags (a known list, not any <word>) is kept.
    private static String safeText(String value) {
        if (value == null) { return ''; }
        String safe = Pattern.compile('&(?!#?\\w+;)').matcher(value).replaceAll('&amp;');
        if (!Pattern.compile('(?i)</?(p|br|b|i|u|s|strong|em|span|div|a|img|ul|ol|li|table|thead|tbody|tfoot|tr|th|td|h[1-6]|sub|sup|font|hr|blockquote|pre|code|small|big)(\\s[^>]*)?/?>').matcher(safe).find()) {
            safe = safe.replace('<', '&lt;').replace('>', '&gt;');
        }
        return safe;
    }

    // ##Section name## inside a section is replaced by the Table section of that name in the same template (never one of another
    // template or version). A table inside a paragraph on its own replaces the paragraph. Tables may contain further placeholders.
    // Returns the names of the tables that were embedded (they are not printed a second time).
    private static Set<String> embedTables(List<Document_Template_Section__c> sections) {
        Map<String, String> tables = new Map<String, String>();
        for (Document_Template_Section__c section : sections) {
            if (!section.isSet('Name') || !section.isSet('Type__c')) { continue; }
            if (section.Type__c == 'Table' && String.isNotBlank(section.Section_Content__c) && !tables.containsKey(section.Name)) {
                tables.put(section.Name, section.Section_Content__c);
            }
        }
        Set<String> used = new Set<String>();
        for (Integer pass = 0; pass < 5; pass++) {
            Boolean changed = false;
            for (Document_Template_Section__c section : sections) {
                String content = section.Section_Content__c;
                if (!section.isSet('Name') || String.isBlank(content) || !content.contains('##')) { continue; }
                for (String name : tables.keySet()) {
                    String token = '##' + name + '##';
                    if (name == section.Name || !content.contains(token)) { continue; }
                    content = replaceToken(content, token, tables.get(name));
                    used.add(name);
                    changed = true;
                }
                section.Section_Content__c = content;
                if (section.Type__c == 'Table' && tables.containsKey(section.Name)) { tables.put(section.Name, content); }
            }
            if (!changed) { break; }
        }
        return used;
    }

    private static List<Document_Template_Section__c> withoutEmbeddedTables(List<Document_Template_Section__c> sections, Set<String> embeddedNames) {
        List<Document_Template_Section__c> kept = new List<Document_Template_Section__c>();
        for (Document_Template_Section__c section : sections) {
            if (!(section.isSet('Name') && section.Type__c == 'Table' && embeddedNames.contains(section.Name))) { kept.add(section); }
        }
        return kept;
    }

    // Literal replacement (no regular expression, so $ and \ in the table are kept); a paragraph that holds only the token goes away with it.
    private static String replaceToken(String content, String token, String replacement) {
        String result = '';
        Integer startAt = 0;
        while (true) {
            Integer at = content.indexOf(token, startAt);
            if (at < 0) { break; }
            Integer pOpen = content.lastIndexOf('<p', at);
            Integer pOpenEnd = pOpen >= 0 ? content.indexOf('>', pOpen) : -1;
            Integer pClose = content.indexOf('</p>', at + token.length());
            Boolean alone = pOpen >= startAt && pOpenEnd >= 0 && pOpenEnd < at && pClose >= 0
                && (content.substring(pOpen, pOpen + 3) == '<p>' || content.substring(pOpen, pOpen + 3) == '<p ')
                && blankText(content.substring(pOpenEnd + 1, at)) && blankText(content.substring(at + token.length(), pClose));
            if (alone) {
                result += content.substring(startAt, pOpen) + replacement;
                startAt = pClose + 4;
            } else {
                result += content.substring(startAt, at) + replacement;
                startAt = at + token.length();
            }
        }
        return result + content.substring(startAt);
    }

    private static Boolean blankText(String text) {
        return String.isBlank(text.replace('<br>', '').replace('<br/>', '').replace('<br />', '').replace('&nbsp;', ''));
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
}
