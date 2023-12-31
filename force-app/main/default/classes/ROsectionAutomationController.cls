/* 
* Class			    : ROsectionAutomationController
* Developer			: Rahul Bejgam (ASE - Dextara)
* Created Date		: 08/03/2023
* Description		: This class creates the data-wrapper. This class performs the dataquery for header HTML and related object record, numerical calculation and formats data. 
                      The class is for only Autogeneration of pdf.
* Last Modified Date: 08/11/2023
*/

public with sharing class ROsectionAutomationController {

    /* User Selected Styles from Template Builder */
    public static String dateFormat;
    public static String timeFormat;
    public static String numberFormat;
    public static String currencyFormat;

    public static Id relatedObjectSectionID;
    public static String errorTypeCaught = null;
    public static String ROHtmlContent = '<tbody>';

    /* Variables to hold the Sum Calculations of field records */
    public static Map<String,Decimal> currencyFieldTotals;
    public static Map<String,Decimal> currencyFieldSubTotals; 

    /* Function that returns the HTML Version of the Related Object section content */
    public static string getSectionDataAsHTML(String recordid,String templatesectionid)  {
        relatedObjectSectionID = templatesectionid;                
        List<sObject> relatedObjectQueriedRecords = new List<sObject>();

        try {
            Document_Template_Section__c relatedObjectSection = [select id,Section_Content__c from Document_Template_Section__c where id=:templatesectionid WITH SECURITY_ENFORCED];
            Map<string,Object> contentAndStylingMap = (Map<string,Object>)JSON.deserializeUntyped(relatedObjectSection.Section_Content__c);

            /* Object and Fields for Query Formation */
            String relatedObjectAPIName = String.valueof(contentAndStylingMap.get('mainChildObject'));   
            String relatedObjectFieldNameToGroupRecords = String.valueof(contentAndStylingMap.get('grouping'));                     
            List<Object> selectedFieldAsHeaderAPIList = (List<Object>) contentAndStylingMap.get('tablelistValues');
            System.debug('selectedFieldAsHeaderAPIList >> ' + selectedFieldAsHeaderAPIList);
            List<Object> selectedFieldsAsHeaderLabelList = (List<Object>) contentAndStylingMap.get('tablelistLabels');

            /* "Where" Condition - from filtering option of Template Builder */
            String whereClauseinQuery = '';
            if(contentAndStylingMap.get('whereClause')!='' && contentAndStylingMap.get('whereClause')!=null &&  contentAndStylingMap.get('whereClause')!='()')  {
                whereClauseinQuery = ' AND ' + (String) contentAndStylingMap.get('whereClause');
            }

            /* Serial Number to display on the Table */
            Integer tableSerialNumber = 1;

            /* Subtotal and Total Fields for Calculation */
            List<Object> subTotFieldNames = (List<Object>) contentAndStylingMap.get('subTotal');

            /* Styling Options given for the user from Template Builder */
            dateFormat = (String) contentAndStylingMap.get('dateFormat');
            timeFormat = (String) contentAndStylingMap.get('timeFormat');
            numberFormat = (String) contentAndStylingMap.get('numberFormat');
            currencyFormat = (String) contentAndStylingMap.get('currencyFormat');
            Boolean ROSectionInNewPage = (Boolean) contentAndStylingMap.get('newPage');
            Boolean displaySerialNumber = (Boolean) contentAndStylingMap.get('SerialNumber');

            /* Inline Styles for SubTotal and GrandTotal */
            String subTotalTDTextColor;
            String subTotalTDbackground;
            String grandTotalTDTextColor;
            String grandTotalTDbackground;
            
            /* Html Inline style for Category <td> */
            Map<String,Object> tableStyleList = (Map<String,Object>) contentAndStylingMap.get('style');  
            Map<String,Object> categoryStyleAttributes = (Map<String,Object>) tableStyleList.get('category');
            String categoryInlineStyle = 'border: 1px solid black ; background-color:' + categoryStyleAttributes.get('backgroundColor') + '; color:'+ categoryStyleAttributes.get('fontcolor') +'; font-size:' + categoryStyleAttributes.get('fontsize') + '; font-family:'+ categoryStyleAttributes.get('fontfamily') + ';' ;
            Integer dataColSpanForCategory = (displaySerialNumber) ? selectedFieldsAsHeaderLabelList.size()+1 : selectedFieldsAsHeaderLabelList.size();
            System.debug(dataColSpanForCategory);         
            
            /* fieldlist String preparation for Querying */
            List<string> fieldsList= new List<string> ();
            for(Object rec: selectedFieldAsHeaderAPIList)  {
                fieldsList.add(String.valueOf(rec));
            }
            string fieldString = string.join(fieldsList,','); 

            /* Map that contains field(Key) - field type (value)*/                       
            Map<String,String> fieldNameType = getObjectFieldTypeMap(relatedObjectAPIName, fieldsList);
			
            /* Fields selected to calculate the Total and Sub Total */
            currencyFieldTotals = new Map<String,Decimal> {};
            for(Object currTempField : subTotFieldNames) {
                currencyFieldTotals.put((String) currTempField,0);
            }
            currencyFieldSubTotals = currencyFieldTotals.clone();
            
            String securityEnforced=' WITH SECURITY_ENFORCED';
            /*grouping field was selected*/
            if(relatedObjectFieldNameToGroupRecords!=null && relatedObjectFieldNameToGroupRecords!='') {
                
                Set<String> fieldStringSet = new Set<String>();
                for(String field : fieldsList)    {
                    fieldStringSet.add(field.tolowercase());
                }
                fieldStringSet.add(relatedObjectFieldNameToGroupRecords.tolowercase());
                String fieldStringquery = String.join(new List<String>(fieldStringSet), ', ');             
                String recordsQuery = 'select '+String.escapeSingleQuotes(fieldStringquery)+' from '+String.escapeSingleQuotes(relatedObjectAPIName)+' where '+String.escapeSingleQuotes(string.valueof(contentAndStylingMap.get('childLookupfieldAPIname')))+'='+'\''+String.escapeSingleQuotes(recordid)+'\''+' '+ whereClauseinQuery+' '+String.escapeSingleQuotes(securityEnforced)+' order by '+String.escapeSingleQuotes(relatedObjectFieldNameToGroupRecords)+' desc';
                System.debug('recordsQuery  >> ' + recordsQuery);
                relatedObjectQueriedRecords = Database.query(recordsQuery);
                System.debug('relatedObjectQueriedRecords >> ' + relatedObjectQueriedRecords);
                
                String ptrfield = (String) relatedObjectFieldNameToGroupRecords;  
                System.debug('ptrfield >> ' + ptrfield);
                Map<Object, List<SObject>> recordCategoryMap = new Map<Object, List<SObject>>();
                
                for(Sobject ptrRecord : relatedObjectQueriedRecords)  {
                    System.debug('ptrRecord >> ' + ptrRecord);
                    Map<String, Object> maprec = (Map<String, Object>) JSON.deserializeUntyped(JSON.serialize(ptrRecord));
                    
                    if(!recordCategoryMap.containsKey(ptrRecord.get(ptrfield)) && ptrRecord.get(ptrfield)!=null)  {
                        List<SObject> recordList = new  List<SObject>();
                        recordList.add(ptrRecord);
                        recordCategoryMap.put(ptrRecord.get(ptrfield),recordList);
                    }
                    else if(recordCategoryMap.containsKey(ptrRecord.get(ptrfield)) && ptrRecord.get(ptrfield)!=null)  {
                        List<SObject> recordList= recordCategoryMap.get(ptrRecord.get(ptrfield));
                        recordList.add(ptrRecord); 
                        recordCategoryMap.put(ptrRecord.get(ptrfield),recordList);
                    }
                    else {
                        if(recordCategoryMap.containsKey('Others'))  {
                            List<SObject> recordList= recordCategoryMap.get('Others');
                            recordList.add(ptrRecord); 
                            recordCategoryMap.put('Others',recordList);    
                        }
                        else {
                            List<SObject> recordList = new  List<SObject>();
                            recordList.add(ptrRecord);
                            recordCategoryMap.put('Others',recordList);
                        }
                    }
                }      
                Boolean firstTDblock ;

                for(Object key: recordCategoryMap.keyset())  {
                    ROHtmlContent = ROHtmlContent + '<tr> <td  colspan=\"'+ dataColSpanForCategory +'\" scope="col" Style = \"'+ categoryInlineStyle + '\">' + String.valueOf(key).toUpperCase() + '</td> </tr> ';
                                        
                    String ptrKey = (String) key;
                    List<Object> recordListofKey = recordCategoryMap.get(ptrKey);
                    tableSerialNumber = 1;

                    Integer count = recordListofKey.size();
                    for(Integer i=0; i<count; i++)  {
                        Sobject currRecord = (Sobject) recordListofKey[i];
                        ROHtmlContent += '<tr>';
                        if(displaySerialNumber)  {
                            ROHtmlContent = ROHtmlContent + '<td scope="col" style="border: 1px solid black; text-align: center;">' + tableSerialNumber  + '</td>';
                        }
                        System.debug('selectedFieldAsHeaderAPIList before calling dataFetchFromCurrentRecord >> ' + selectedFieldAsHeaderAPIList);
                        dataFetchFromCurrentRecord(selectedFieldAsHeaderAPIList, currRecord, fieldNameType);
                        ROHtmlContent += '</tr>';
                        tableSerialNumber+=1; 
                    }                 
                    
                    firstTDblock = displaySerialNumber;
                    if(currencyFieldTotals.size() > 0) {
                        ROHtmlContent += '<tr>';
                        ROHtmlContent = ROHtmlContent + '<td colspan="1" scope="col" style="border: 1px solid black; background-color:#0077b6 ; color: white; border-right-style: none; font-size: 12px">Sub Total</td>';
                        for(Object ptrFieldSubTotal : selectedFieldAsHeaderAPIList) {
                            if(currencyFieldTotals.containsKey((String) ptrFieldSubTotal) && subTotFieldNames.contains(ptrFieldSubTotal)) {
                                ROHtmlContent += '<td colspan="1" scope="col" style="border: 1px solid black; color:#ffffff; background-color:#0077b6; text-align: center; border-right-style:none; border-left-style:none;\">' + currencyFieldSubTotals.get((String) ptrFieldSubTotal) + '</td>';
                            }
                            else {
                                if(firstTDblock)  {
                                    ROHtmlContent += '<td colspan="1" scope="col" style="border: 1px solid black; background-color:#0077b6 ;border-right-style: none;border-left-style:none;\"> </td>';
                                }                                
                                firstTDblock = true;
                            }
                        }
                        ROHtmlContent += '</tr>';
                    }                                      
                    
                    /*Resetting the Subtotals to zero for next Category Sub-Total Calculation*/
                    for(String currTempField : currencyFieldTotals.keySet())  {
                        currencyFieldSubTotals.put(currTempField,0);
                    }
                }
                
                firstTDblock = displaySerialNumber;
                if(currencyFieldTotals.size() > 0)  {
                    ROHtmlContent += '<tr>';
                    ROHtmlContent += '<td colspan="1" scope="col" style="border: 1px solid black; background-color:#03045e ; color: white; border-right-style: none; font-size: 12px">Grand Total</td>';
                    
                    for(Object ptrFieldTotal : selectedFieldAsHeaderAPIList) {
                        if(currencyFieldTotals.containsKey((String) ptrFieldTotal) && subTotFieldNames.contains(ptrFieldTotal)) {
                            ROHtmlContent += '<td colspan="1" scope="col" style="border: 1px solid black; color:#ffffff; background-color:#03045e; border-right-style:none; text-align: center; border-left-style:none;\">' + currencyFieldTotals.get((String) ptrFieldTotal) + '</td>';
                        }
                        else {
                            if(firstTDblock)  {
                                ROHtmlContent += '<td colspan="1" scope="col" style="border: 1px solid black; background-color:#03045e ;border-right-style: none;border-left-style:none;\"> </td>';
                            }
                            firstTDblock = true;
                        }
                    }
                    ROHtmlContent += '</tr>';
                }
            }

            /*No Grouping field was selected*/
            else {
                String recordsQuery = 'select '+String.escapeSingleQuotes(fieldString)+' from '+String.escapeSingleQuotes(relatedObjectAPIName)+' where '+String.escapeSingleQuotes(string.valueof(contentAndStylingMap.get('childLookupfieldAPIname')))+'='+'\''+String.escapeSingleQuotes(recordid)+'\''+' '+ whereClauseinQuery +' '+String.escapeSingleQuotes(securityEnforced);
                System.debug('recordsQuery without grouping >> '+ recordsQuery);
                relatedObjectQueriedRecords = Database.query(recordsQuery);      

                for(Sobject currRecord: relatedObjectQueriedRecords) {
                    ROHtmlContent += '<tr>';
                    if(displaySerialNumber)  {
                        ROHtmlContent = ROHtmlContent + '<td scope="col" style="border: 1px solid black; text-align: center;">' + tableSerialNumber  + '</td>';
                    }
                    Map<String, Object> maprec = (Map<String, Object>) JSON.deserializeUntyped(JSON.serialize(currRecord));  
                    dataFetchFromCurrentRecord(selectedFieldAsHeaderAPIList, currRecord, fieldNameType);                  
                    ROHtmlContent += '</tr>';
                    tableSerialNumber += 1;
                }

                /*Adding GrandTotals to WrapperList*/
                Boolean firstTDblock = displaySerialNumber;
                if(currencyFieldTotals.size() > 0)  {
                    ROHtmlContent += '<tr>';
                    ROHtmlContent += '<td colspan="1" scope="col" style="border: 1px solid black; background-color:#03045e ; color: white; border-right-style: none; font-size: 12px">Grand Total</td>';
                    for(Object ptrFieldTotal : selectedFieldAsHeaderAPIList) {
                        if(currencyFieldTotals.containsKey((String) ptrFieldTotal) && subTotFieldNames.contains(ptrFieldTotal)) {
                            ROHtmlContent += '<td colspan="1" scope="col" style="border: 1px solid black; color:#ffffff; background-color:#03045e; border-right-style:none; border-left-style:none;\">' + currencyFieldTotals.get((String) ptrFieldTotal) + '</td>';
                        }
                        else {
                            if(firstTDblock)  {
                                ROHtmlContent += '<td colspan="1" scope="col" style="border: 1px solid black; background-color:#03045e ;border-right-style: none;border-left-style:none;\"> </td>';
                            }                            
                            firstTDblock = true;
                        }
                    }
                    ROHtmlContent += '</tr>';  
                }              
            }
            ROHtmlContent += '</tbody>'; 
            return ROHtmlContent;
        }
        catch(Exception ex) {
            System.debug('No Values to assign ' + ex.getLineNumber());
            LogHandler.createLog((Id) templatesectionid,'ROsectionAutomationController.getsectionData()','Template Id- '+ relatedObjectSectionID + ' ' + ex.getLineNumber() + ex.getStackTraceString() + ex.getCause(),ex.getMessage(),'Exception');   
        }
        return '';
    }
    
    /* Function that formulates each Object's Field and Type */
    public static Map<String,String> getObjectFieldTypeMap(String objName, List<String> fieldList)  {
        Map<String,String> fieldNameType = new Map<String,String>();
        try {
            Map<String, Schema.SObjectType> schemaMap = Schema.getGlobalDescribe();
            Schema.SObjectType leadSchema = schemaMap.get(objName);
            Map<String, Schema.SObjectField> fieldMap = leadSchema.getDescribe().fields.getMap();
            System.debug('fieldList >> ' + fieldList);
            for (String selfield: fieldList) {
                if(selfield.contains('.'))  {
                    System.debug('inside selfield.contains(.) '+ selfield);
                    if(selfield.contains('__r'))  {
                        System.debug('inside selfield.contains(__r) '+ selfield);
                        String fieldcstm = selfield.replace('__r' , '__c');
                        List<String> tempfield = fieldcstm.split('\\.');
                        
                        // Related Object other than User Object
                        String objNameLkp = getReferenceObjectAPIName(objName,tempfield[0]);
                        
                        tempfield.remove(0);
                        Map<String,String> FieldnameTypeLookup = getObjectFieldTypeMap(objNameLkp,tempfield);
                        fieldNameType.put(selfield,FieldnameTypeLookup.get(tempfield[0]));
                    }
                    else {
                        List<String> tempfield = selfield.split('\\.');
                        tempfield.remove(0);
                        Map<String,String> FieldnameTypeLookup = getObjectFieldTypeMap('User',tempfield);
                        fieldNameType.put(selfield,FieldnameTypeLookup.get(tempfield[0]));
                    }
                }
                else {
                    String fielddataType = String.valueof(fieldMap.get(selfield).getDescribe().getType());
                    fieldNameType.put(selfield,fielddataType);
                }
            }
        }
        catch(Exception ex) {
            LogHandler.createLog((Id) null,'ROsectionAutomationController.getObjectFieldTypeMap()','Template Id- '+ relatedObjectSectionID + ' ' + ex.getLineNumber() + ex.getStackTraceString() + ex.getCause(),ex.getMessage(),'Exception');   
        }
        return fieldNameType;
    }
    
    public static string getReferenceObjectAPIName(String fromObjName, String lkpField)  {
        try {            
            Schema.DescribeFieldResult scehmaMap = Schema.getGlobalDescribe().get(fromObjName).getDescribe().fields.getMap().get(lkpField).getDescribe();
            for(Schema.SObjectType reference : scehmaMap.getReferenceTo()) {
                return reference.getDescribe().getName();
            }
        }
        catch(Exception ex)  {
            LogHandler.createLog((Id) null,'ROsectionAutomationController.getReferenceObjectAPIName()','Template Id- '+ relatedObjectSectionID + ' ' + ex.getLineNumber() + ex.getStackTraceString() + ex.getCause(),ex.getMessage(),'Exception');
        }
        return '';
    } 
    
    public static void dataFetchFromCurrentRecord(List<Object> selectedFieldAsHeaderAPIList, Sobject currRecord, Map<String,String> fieldNameType)  {
        TransactionLog__c[] logList = new TransactionLog__c[] {};
        try{
            for(Object field : selectedFieldAsHeaderAPIList) {
                Object recVal;   
                String fieldStr = (String) field;
                String fieldTypeAsText = ((String) fieldNameType.get(fieldStr)).toUpperCase();

                Map<String, Object> currRecordLkpData = (Map<String, Object>) JSON.deserializeUntyped(JSON.serialize(currRecord));
                
                if(fieldStr.contains('__r')) {
                    List<String> lkpFieldSplit = fieldStr.split('\\.');
                    if(currRecordLkpData.containsKey(lkpFieldSplit[0])) {	
                        Map<String, Object> childLkpData = (Map<String, Object>) currRecordLkpData.get(lkpFieldSplit[0]);
                        recVal = childLkpData.get(lkpFieldSplit[1]);
                        
                        if(currencyFieldTotals.containsKey(fieldStr))  {
                            if(recVal == null) {recVal = 0;}
                            
                            Decimal tempValueTotal = currencyFieldTotals.get(fieldStr) + (Decimal) recVal;
                            currencyFieldTotals.put(fieldStr, tempValueTotal);
                            
                            Decimal tempValueSubTotal = currencyFieldSubTotals.get(fieldStr) + (Decimal) recVal;
                            currencyFieldSubTotals.put(fieldStr, tempValueSubTotal);
                        } 
                    }
                    else {
                        recVal = ' ';
                    }
                }
                else if(!fieldStr.contains('__r') && fieldStr.contains('.'))  {
                    List<String> lkpFieldSplit = fieldStr.split('\\.');
                    Map<String, Object> childLkpData = (Map<String, Object>) currRecordLkpData.get(lkpFieldSplit[0]);
                    recVal = childLkpData.get(lkpFieldSplit[1]);
                    
                    if(currencyFieldTotals.containsKey(fieldStr)) {
                        if(recVal == null) {recVal = 0;}
                        
                        Decimal tempValueTotal = currencyFieldTotals.get(fieldStr) + (Decimal) recVal;
                        currencyFieldTotals.put(fieldStr, tempValueTotal);
                        
                        Decimal tempValueSubTotal = currencyFieldSubTotals.get(fieldStr) + (Decimal) recVal;
                        currencyFieldSubTotals.put(fieldStr, tempValueSubTotal);
                    }
                }
                else {
                    recVal = currRecord.get(fieldStr);
                    if(currencyFieldTotals.containsKey(fieldStr))  {
                        if(recVal == null) {recVal = 0;}
                        
                        Decimal tempValueTotal = currencyFieldTotals.get(fieldStr) + (Decimal) recVal;
                        currencyFieldTotals.put(fieldStr, tempValueTotal);
                        
                        Decimal tempValueSubTotal = currencyFieldSubTotals.get(fieldStr) + (Decimal) recVal;
                        currencyFieldSubTotals.put(fieldStr, tempValueSubTotal);
                    } 
                }
                String cellTDwidth = '70px';

                if(recVal!=null){
                    String returnedFormattedValue = String.valueOf(recVal);
                    cellTDwidth = (fieldTypeAsText == 'BOOLEAN') ? '30px' : '70px';

                    if(fieldTypeAsText == 'DATETIME') {
                        List<String> dateList = returnedFormattedValue.split(' ')[0].split('-');
                        String timeStr = returnedFormattedValue.split(' ')[1];
                        returnedFormattedValue = handleDateTimeFormatAsSelectedbyUser(dateList,timeStr,-1);
                    }
                    else if (fieldTypeAsText == 'TIME') {
                        String timeStr = returnedFormattedValue.split('\\.')[0];
                        returnedFormattedValue = handleDateTimeFormatAsSelectedbyUser(null,timeStr,0);
                    }
                    else if (fieldTypeAsText == 'DATE') {
                        List<String> dateList = returnedFormattedValue.split(' ')[0].split('-');
                        returnedFormattedValue = handleDateTimeFormatAsSelectedbyUser(dateList,null,0);
                    }
                    else if (fieldTypeAsText == 'NUMBER') {
                        returnedFormattedValue = String.valueOf(handleCurrencyNumberFormat(returnedFormattedValue, numberFormat));
                        cellTDwidth = '30px';
                    }
                    else if (fieldTypeAsText == 'CURRENCY') {
                        returnedFormattedValue = String.valueOf(handleCurrencyNumberFormat(returnedFormattedValue, currencyFormat));
                        cellTDwidth = '30px';
                    }
                    
                    /* Check for Image and styling the TD accordingly */
                    if(returnedFormattedValue.contains('servlet.shepherd/version/download/')){
                        ROHtmlContent = ROHtmlContent + '<td scope="col" width="100px" style="border: 1px solid black; text-align: center;"> <img style="max-height:100% ; max-width:100%; height:40px; width:40px;" src= '+ returnedFormattedValue +'> </td>';
                    } else {
                        ROHtmlContent = ROHtmlContent + '<td scope="col" width=\"' + cellTDwidth +'\" style="border: 1px solid black; text-align: center;">' + returnedFormattedValue + '</td>';
                    }
                } else {
                    ROHtmlContent = ROHtmlContent + '<td scope="col" width=\"' + cellTDwidth +'\" style="border: 1px solid black; text-align: center;"> </td>';
                }                 
            }
        }
        catch(Exception ex) {
            if(errorTypeCaught==null) {
                errorTypeCaught = ex.getTypeName();
                System.debug(errorTypeCaught);
                LogHandler.createLog((Id) null,'ROsectionAutomationController.dataFetchFromCurrentRecord()','Template Id- '+ relatedObjectSectionID + ' ' + ex.getLineNumber() + ex.getStackTraceString() + ex.getCause(),ex.getMessage(),'Exception');
            }
            else if(ex.getTypeName()!=errorTypeCaught) {
                LogHandler.createLog((Id) null,'ROsectionAutomationController.dataFetchFromCurrentRecord()','Template Id- '+ relatedObjectSectionID + ' ' + ex.getLineNumber() + ex.getStackTraceString() + ex.getCause(),ex.getMessage(),'Exception');
            }
            else { // same error repeating multiple times
                System.debug('Error Type : '+ ex.getTypeName());
                System.debug('Error Message : ' + ex.getMessage());
                System.debug('Error Line Number : ' + ex.getLineNumber());
            }
        }
    }

    
    /*Functions to handle to the Date Time Style for the field value.*/
    public static String handleDateTimeFormatAsSelectedbyUser(List<String> dateList, String timeStr, Integer valKey)  { 
        String dateFormatSep; 
        String dateFormatted = '';
        String timeFormatted = '';     
        Integer numDateFormat ; 
        String dateFormatStr = dateFormat;  
        String timeFormatStr = timeFormat;
        List<String> timer = new List<String> {};
        List<Integer> dateIndex = new List<Integer> {};
        List<String> monthLstHalf = new List<String>{'', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'};
        List<String> monthLstFull = new List<String>{'', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'};
        
        try{
            if (dateList != null && dateFormatStr != null) {          
                
                if(dateFormatStr.contains('*'))  {
                    numDateFormat = Integer.valueOf(dateFormatStr.substring(0, dateFormatStr.length() - 2));
                    Integer charIndex = (dateFormatStr.length() - 2); 
                    dateFormatSep = dateFormatStr.substring(charIndex,charIndex+1);
                }
                else {
                    numDateFormat = Integer.valueOf(dateFormatStr.substring(0, dateFormatStr.length() - 1));
                    Integer charIndex = (dateFormatStr.length() - 2); 
                    dateFormatSep = dateFormatStr.substring(charIndex+1); 
                }  
                
                while (numDateFormat > 0) {
                    Integer rem = Math.mod(numDateFormat, 10);
                    if (((Integer)(rem - 4)) <= 0) { dateIndex.add(0); }
                    else {
                        Integer key = rem - 4;
                        dateIndex.add(key);
                    }
                    numDateFormat = (Integer)Math.floor(numDateFormat / 10);
                }
                
                if (dateFormatStr.contains('4') && !dateFormatStr.contains('*')) {             
                    dateFormatted = dateList[dateIndex[2]] + dateFormatSep + dateList[dateIndex[1]] + dateFormatSep + dateList[dateIndex[0]];
                }
                else if (dateFormatStr.contains('2') && !dateFormatStr.contains('*')) {
                    dateFormatted = dateList[dateIndex[2]] + dateFormatSep + dateList[dateIndex[1]] + dateFormatSep + dateList[dateIndex[0]].substring(2);
                }
                else if (dateFormatStr.contains('4') && dateFormatStr.contains('*')) {
                    Integer mnthIndex = dateIndex.indexOf(1);
                    dateList[dateIndex[mnthIndex]] = monthLstHalf[(Integer.valueOf(dateList[1]))];
                    dateFormatted = dateList[dateIndex[2]] + dateFormatSep + dateList[dateIndex[1]] + dateFormatSep + dateList[dateIndex[0]];
                }
                else if (dateFormatStr.contains('2') && dateFormatStr.contains('*')) {
                    Integer mnthIndex = dateIndex.indexOf(1);
                    dateList[dateIndex[mnthIndex]] = monthLstHalf[(Integer.valueOf(dateList[1]))];
                    dateFormatted = dateList[dateIndex[2]] + dateFormatSep + dateList[dateIndex[1]] + dateFormatSep + dateList[dateIndex[0]].substring(2);
                }
            }
            
            if (timeStr != null && timeFormatStr != null) {
                if (timeFormatStr.contains('4')) {                    
                    timer = (List<String>)(timeStr).split(':');
                    Integer hr = (Integer.valueOf((timeStr).split(':')[0]));

                    if (hr <= 12) {
                        if (timeFormatStr.contains('3')) { timeFormatted = timeStr + ' AM'; }
                        else { timeFormatted = timer[0] + ':' + timer[1] + ' AM'; }
                    }
                    else {
                        hr = (Integer.valueOf(timeStr.split(':')[0])); 
                        hr = (Integer)hr - 12;                     
                        if (timeFormatStr.contains('3')) { timeFormatted = String.valueOf(hr + ':' + (String)timeStr.split(':')[1]) + ':' + (String)timeStr.split(':')[2] + ' PM'; }
                        else { timeFormatted = String.valueOf(hr) + ':' +(String)timeStr.split(':')[1]  + ' PM'; }
                    }
                }
                else {
                    if (timeFormatStr.contains('3')) { timeFormatted = timeStr; }
                    else { timeFormatted = (String)timeStr.split(':')[0] + ':' + (String)timeStr.split(':')[1] ; }
                }
            }
            
            if (valKey == 0) {
                return dateFormatted + ' ' + timeFormatted;
            }
            else if (valKey < 0) {
                return dateFormatted;
            }
            else if (valKey > 0) {
                return timeFormatted;
            }
        }
        catch(Exception ex)  {
            System.debug('Exception occured at ' + ex.getLineNumber());
            System.debug('Error Message : ' + ex.getMessage());
            throw new AuraHandledException(ex.getMessage());
        }
        return '';
    }        
    
    /* Format the Number or Currency Field Value to User Selected Format */
    public static Object handleCurrencyNumberFormat(String fieldValue, String roundPattern)  {
        try {
            Decimal value = (Decimal.valueOf(fieldValue)).setScale(Integer.valueOf(roundPattern));
            return (Object) value;
        }
        catch(Exception ex)  {
            return (Object) 'Error';
        }
    }

    /* Header Content Stored on the RO Template Section Record - called from Automation Class */
    public static String getHeaderContent(Id ROTemplateSectionId)  {
        try {
            String query = 'Select Header_Content__c from Document_Template_Section__c where Id =\'' + ROTemplateSectionId +'\' limit 1';
            Document_Template_Section__c ROTemplateSection = Database.query(query);
            return ROTemplateSection.Header_Content__c;
        }
        catch(Exception ex)  {
            LogHandler.createLog((Id) null,'ROsectionAutomationController.getHeaderContent()','Template Id- '+ ROTemplateSectionId + ' ' + ex.getLineNumber() + ex.getStackTraceString() + ex.getCause(),ex.getMessage(),'Exception');   
            return '<p> Error while querying header Content through Automation - Log is generated </p>';
        }
    }
    
    public class SafeClassException extends Exception { }
}