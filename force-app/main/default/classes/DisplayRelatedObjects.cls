/* Class			: DisplayRelatedObjects
* Developer			:          
* Created Date		: 05/01/2023
* Description		: This class creates the data-wrapper require for the pdf generation. This class performs the dataquery, numerical calculation on QLIs, gathers the ConfigAttributes thereby passing it to the VF Page.
The associated test class is in SectionSetupCtrl_Test
* Last Modified Date: 15/02/2023
*/
public with sharing class DisplayRelatedObjects {    
    
    public static Map<String,Decimal> currencyFieldSubTotals; 
    public static Map<String,Decimal> currencyFieldTotals; 
    public static String errType = null;
    public static Id currTemplate;
    public static String ROHtmlContent = '<tbody>';
    
    @AuraEnabled
    public static string getsectionData(String recordid,String templatesectionid){
        currTemplate = templatesectionid;
        List<RowWrapper> rowWrapperList=new List<RowWrapper>(); 
        
        List<sObject> childRecords=new List<sObject>();
        try
        {
            Document_Template_Section__c dsrec=[select id,Section_Content__c from Document_Template_Section__c where id=:templatesectionid WITH SECURITY_ENFORCED];
            Map<string,Object> jsonMap = (Map<string,Object>)JSON.deserializeUntyped(dsrec.Section_Content__c);   
            String objectName = 'Document_Template_Section__c';
            List<Object> fieldsObjList = (List<Object>) jsonMap.get('tablelistValues');
            List<Object> fieldsObjListValues = (List<Object>) jsonMap.get('tablelistLabels');
            Map<String,Object> tableStyleList = (Map<String,Object>) jsonMap.get('style');
            
            // User Selected fields for Subtotal Calculation
            List<Object> subTotFieldNames = (List<Object>) jsonMap.get('subTotal');
            list<string> productIds = new list<String>();
            
            Boolean newPage = (Boolean) jsonMap.get('newPage');
            Boolean serialNumber = (Boolean) jsonMap.get('SerialNumber');
            String dateFormat = (String) jsonMap.get('dateFormat');
            String timeFormat = (String) jsonMap.get('timeFormat');
            String numberFormat = (String) jsonMap.get('numberFormat');
            String currencyFormat = (String) jsonMap.get('currencyFormat');
            String phoneFormat = (String) jsonMap.get('phoneFormat');
            String selGraphvalue = (String) jsonMap.get('selGraphvalue');
            Boolean displayChart = (Boolean) jsonMap.get('displayChart');
            String chartLabel = (String) jsonMap.get('chartLabel');
            Boolean chartNewPage = (Boolean) jsonMap.get('chartNewPage');
            String grpby = String.valueof(jsonMap.get('grouping'));
            String childObject = String.valueof(jsonMap.get('mainChildObject'));
            String barChartColor = String.valueOf(jsonMap.get('chartBarColor'));
            
            // Where Clause in the Query
            String whereClauseinQuery = '';
            if(jsonMap.get('whereClause')!='' && jsonMap.get('whereClause')!=null &&  jsonMap.get('whereClause')!='()'){
                whereClauseinQuery = ' AND ' + (String) jsonMap.get('whereClause');
            }
            
            List<String> headerStyles = new List<String>();
            List<String> recordStyles = new List<String>();
            
            for(Object styleType : tableStyleList.keySet())
            {
                String atrType = (String) styleType;
                Map<String,Object> styleAttributes = (Map<String,Object>) tableStyleList.get(atrType);
                for(Object attribute : styleAttributes.keySet())
                {
                    String attributeType = (String) attribute;
                    String attributeVal = (String) styleAttributes.get(attributeType);
                    if(atrType == 'header')
                    {
                        headerStyles.add(attributeVal);
                    }
                    else
                    {
                        recordStyles.add(attributeVal);
                    }
                }
            }                        
            List<string> fieldsList= new List<string> ();
            for(Object rec: fieldsObjList){
                fieldsList.add(String.valueOf(rec));
            }
            string fieldString = string.join(fieldsList,',');
            Map<String,String> fieldNameType = getObjectFieldTypeMap(childObject, fieldsList);
            
            currencyFieldTotals = new Map<String,Decimal> {};
                for(Object currTempField : subTotFieldNames)
            {
                currencyFieldTotals.put((String) currTempField,0);
            }
            currencyFieldSubTotals = currencyFieldTotals.clone();
            
            List<string> headerValues= new List<string> ();
            for(Object rec: fieldsObjListValues){
                headerValues.add(String.valueOf(rec));
            }
            
            String securityEnforced=' WITH SECURITY_ENFORCED';
            //if grouping category is selected
            if(grpby!=null && grpby!='')
            {
                Set<String> fieldStringSet = new Set<String>();
                for(String field : fieldsList)
                {
                    fieldStringSet.add(field.tolowercase());
                }
                fieldStringSet.add(grpby.tolowercase());
                
                String fieldStringquery = String.join(new List<String>(fieldStringSet), ', ');    
                String recordsQuery = 'select '+String.escapeSingleQuotes(fieldStringquery)+' from '+String.escapeSingleQuotes(childObject)+' where '+String.escapeSingleQuotes(string.valueof(jsonMap.get('childLookupfieldAPIname')))+'='+'\''+String.escapeSingleQuotes(recordid)+'\''+' '+ whereClauseinQuery+' '+String.escapeSingleQuotes(securityEnforced)+' order by '+String.escapeSingleQuotes(grpby)+' asc nulls last';
                ChildRecords = Database.query(recordsQuery);
                
                Map<Object, List<SObject>> recordCategoryMap = new Map<Object, List<SObject>>();
                String ptrfield = (String) grpby;
                for(Sobject ptrRecord : ChildRecords){
                    
                    if(!recordCategoryMap.containsKey(ptrRecord.get(ptrfield)) && ptrRecord.get(ptrfield)!=null){
                        List<SObject> recordList = new  List<SObject>();
                        recordList.add(ptrRecord);
                        recordCategoryMap.put(ptrRecord.get(ptrfield),recordList);
                    }
                    else if(recordCategoryMap.containsKey(ptrRecord.get(ptrfield)) && ptrRecord.get(ptrfield)!=null){
                        List<SObject> recordList= recordCategoryMap.get(ptrRecord.get(ptrfield));
                        recordList.add(ptrRecord); 
                        recordCategoryMap.put(ptrRecord.get(ptrfield),recordList);
                    }
                    else{
                        if(recordCategoryMap.containsKey('Others')){
                            List<SObject> recordList= recordCategoryMap.get('Others');
                            recordList.add(ptrRecord); 
                            recordCategoryMap.put('Others',recordList);    
                        }
                        else{
                            List<SObject> recordList = new  List<SObject>();
                            recordList.add(ptrRecord);
                            recordCategoryMap.put('Others',recordList);
                        }
                    }
                }      
                                
                for(Object key: recordCategoryMap.keyset()){
                    RowWrapper catType = new RowWrapper();
                    catType.addValue(key);
                    catType.type='Category';
                    rowWrapperList.add(catType);
                    
                    String ptrKey = (String) key;
                    List<Object> recordListofKey = recordCategoryMap.get(ptrKey);
                    
                    Integer count = recordListofKey.size();
                    for(Integer i=0; i<count; i++){
                        Sobject currRecord = (Sobject) recordListofKey[i];
                        //Function Call
                        RowWrapper recType = RecordDataWrapperCreation(fieldsObjList, currRecord, fieldNameType);
                        //Function Call
                        rowWrapperList.add(recType);
                    }
                    
                    //Total and SubTotal insertion in RowWrapper
                    RowWrapper totSubType = new RowWrapper();
                    totSubType.type='SubTotal';
                    for(Object ptrFieldSubTotal : fieldsObjList){
                        if(currencyFieldSubTotals.containsKey((String) ptrFieldSubTotal) && subTotFieldNames.contains(ptrFieldSubTotal)){
                            totSubType.addValue(currencyFieldSubTotals.get((String) ptrFieldSubTotal));
                        } else {
                            totSubType.addValue('Empty');
                        }
                    }
                    
                    if(subTotFieldNames.size() > 0){
                        rowWrapperList.add(totSubType);
                    }                    
                    
                    // Resetting the Subtotals to zero for next Category sub-total Calculation
                    for(String currTempField : currencyFieldTotals.keySet()){
                        currencyFieldSubTotals.put(currTempField,0);
                    }
                }
                
                //GrandTotals to wrapper
                RowWrapper totType = new RowWrapper();
                totType.type='Total';
                for(Object ptrFieldTotal : fieldsObjList)
                {
                    if(currencyFieldTotals.containsKey((String) ptrFieldTotal) && subTotFieldNames.contains(ptrFieldTotal)){
                        totType.addValue(currencyFieldTotals.get((String) ptrFieldTotal));
                    }
                    else{
                        totType.addValue('Empty');
                    }
                }
                
                if(subTotFieldNames.size() > 0){
                    rowWrapperList.add(totType);
                }
            }
            else{
                String recordsQuery = 'select '+String.escapeSingleQuotes(fieldString)+' from '+String.escapeSingleQuotes(childObject)+' where '+String.escapeSingleQuotes(string.valueof(jsonMap.get('childLookupfieldAPIname')))+'='+'\''+String.escapeSingleQuotes(recordid)+'\''+' '+ whereClauseinQuery+' '+String.escapeSingleQuotes(securityEnforced);
                ChildRecords = Database.query(recordsQuery);
                for(Sobject currRecord: ChildRecords) {
                    //qliRecIds.add(currRecord.get('Id'));
                    //Function Call
                    RowWrapper recType = RecordDataWrapperCreation(fieldsObjList, currRecord, fieldNameType);
                    //Function Call
                    rowWrapperList.add(recType);
                }
                //Adding GrandTotals to WrapperList
                RowWrapper totType = new RowWrapper();
                //totType.addValue('End');
                totType.type='Total';
                for(Object ptrFieldTotal : fieldsObjList) {
                    if(currencyFieldTotals.containsKey((String) ptrFieldTotal) && subTotFieldNames.contains(ptrFieldTotal)) {
                        totType.addValue(currencyFieldTotals.get((String) ptrFieldTotal));
                    }
                    else {
                        totType.addValue('Empty');
                    }
                }
                if(subTotFieldNames.size() > 0){
                    rowWrapperList.add(totType);
                }                
            }
            
            //Wrapper Creation
            Wrapper  masterWrapper =new Wrapper();
            masterWrapper.headers = headerValues;
            masterWrapper.rowWrapperList = rowWrapperList ;
            masterWrapper.newPage = newPage;
            
            masterWrapper.catFontClr = recordStyles[0]; 
            masterWrapper.catBgClr = recordStyles[1]; 
            masterWrapper.catFontFam = recordStyles[2];
            masterWrapper.catFontSize = recordStyles[3];
            
            masterWrapper.headFontClr = headerStyles[0]; 
            masterWrapper.headBgClr = headerStyles[1];
            masterWrapper.headFontFam = headerStyles[2]; 
            masterWrapper.headFontSize = headerStyles[3];
            
            masterWrapper.showSlNo = serialNumber;
            masterWrapper.dateFormat = dateFormat;
            masterWrapper.timeFormat = timeFormat;
            masterWrapper.numberFormat = numberFormat;
            masterWrapper.currencyFormat = currencyFormat;
            masterWrapper.phoneFormat = phoneFormat;
            masterWrapper.barChartColor = barChartColor;
            
            masterWrapper.selGraphvalue = selGraphvalue;
            masterWrapper.displayChart = displayChart;
            masterWrapper.chartLabel = chartLabel;
            masterWrapper.chartNewPage = chartNewPage;
              
            string jsonstring = JSON.serialize(masterWrapper);
            ROHtmlContent += '</tbody>'; 
            //return ROHtmlContent;
            return jsonstring;
        }
        catch(Exception ex)
        {
            LogHandler.createLog((Id) templatesectionid,'DisplayRelatedObjects.getsectionData()','Template Id- '+currTemplate+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');   
        }
        return '';
    }
    
    public class Wrapper{
        public List<RowWrapper> rowWrapperList;
        public List<String> headers;
        public Boolean newPage;
        
        public String catFontClr;
        public String catBgClr;
        public String catFontFam;
        public String catFontSize;
        
        public String headFontClr;
        public String headBgClr;
        public String headFontFam;
        public String headFontSize;
        
        public Boolean showSlNo;
        public Boolean displayChart;
        public String dateFormat;
        public String timeFormat;
        public String numberFormat;
        public String currencyFormat;
        public String phoneFormat;
        public String barChartColor;
        
        // Chart Params
        public Boolean chartNewPage;
        public String selGraphvalue;
        public String chartLabel;
    }
    
    
    public class RowWrapper{
        // the values (cells) making up this row
        public List<Object> values;
        public String type;
        
        // constructor
        public RowWrapper(){
            values=new List<object>();
        }
        
        // append a value (cell) to the row
        public void addValue(Object value){
            values.add(value);
        }
    }
    
    public static Map<String,String> getObjectFieldTypeMap(String objName, List<String> fieldList){
        Map<String,String> fieldNameType = new Map<String,String>();
        try {
            Map<String, Schema.SObjectType> schemaMap = Schema.getGlobalDescribe();
            Schema.SObjectType leadSchema = schemaMap.get(objName);
            Map<String, Schema.SObjectField> fieldMap = leadSchema.getDescribe().fields.getMap();
            
            for (String selfield: fieldList) {
                if(selfield.contains('.')){
                    if(selfield.contains('__r')){
                        String fieldcstm = selfield.replace('__r' , '__c');
                        List<String> tempfield = fieldcstm.split('\\.');
                        
                        // Related Object other than User Object
                        String objNameLkp = getLkpObjectApi(objName,tempfield[0]);
                        
                        tempfield.remove(0);
                        Map<String,String> FieldnameTypeLookup = getObjectFieldTypeMap(objNameLkp,tempfield);
                        fieldNameType.put(selfield,FieldnameTypeLookup.get(tempfield[0]));
                    }
                    else{
                        List<String> tempfield = selfield.split('\\.');
                        String lookupObject = ROsectionAutomationController.referencedObjectOfRelationship(fieldMap, tempfield[0]);
                        tempfield.remove(0);
                        Map<String,String> FieldnameTypeLookup = getObjectFieldTypeMap(lookupObject,tempfield);
                        fieldNameType.put(selfield,FieldnameTypeLookup.get(tempfield[0]));
                    }
                }
                else{
                    String fielddataType = String.valueof(fieldMap.get(selfield).getDescribe().getType());
                    fieldNameType.put(selfield,fielddataType);
                }
            }}
        catch(Exception ex){
            LogHandler.createLog((Id) null,'DisplayRelatedObjects.getObjectFieldTypeMap()','Template Id- '+currTemplate+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');   
        }
        return fieldNameType;
    }
    
    public static string getLkpObjectApi(String fromObjName, String lkpField){
        try{
            
            Schema.DescribeFieldResult scehmaMap = Schema.getGlobalDescribe().get(fromObjName).getDescribe().fields.getMap().get(lkpField).getDescribe();
            for(Schema.SObjectType reference : scehmaMap.getReferenceTo()) 
            {
                return reference.getDescribe().getName();
            }
        }
        catch(Exception ex){
            LogHandler.createLog((Id) null,'DisplayRelatedObjects.getLkpObjectApi()','Template Id- '+currTemplate+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
        }
        return '';
    }
    
    public Static RowWrapper RecordDataWrapperCreation(List<Object> fieldsObjList, Sobject currRecord, Map<String,String> fieldNameType){
        RowWrapper recType = new RowWrapper();
        recType.type='Record';
        TransactionLog__c[] logList = new TransactionLog__c[] {};
        	try{
                // The record as a map, once for the row (it was rebuilt for every cell, which made long tables very slow).
                Map<String, Object> currRecordLkpData = (Map<String, Object>) JSON.deserializeUntyped(JSON.serialize(currRecord));
                for(Object field : fieldsObjList){
                    String fieldStr = (String) field;
                    Object recVal;             
                    recType.addValue(fieldNameType.get(fieldStr));
                    
                    if(fieldStr.contains('__r')) {
                        List<String> lkpFieldSplit = fieldStr.split('\\.');
                        if(currRecordLkpData.containsKey(lkpFieldSplit[0])) {	
                            Map<String, Object> childLkpData = (Map<String, Object>) currRecordLkpData.get(lkpFieldSplit[0]);
                            recVal = childLkpData.get(lkpFieldSplit[1]);
                            
                            if(currencyFieldTotals.containsKey(fieldStr))
                            {
                                if(recVal == null) {recVal = 0;}
                                
                                Decimal tempValueTotal = currencyFieldTotals.get(fieldStr) + (Decimal) recVal;
                                currencyFieldTotals.put(fieldStr, tempValueTotal);
                                
                                Decimal tempValueSubTotal = currencyFieldSubTotals.get(fieldStr) + (Decimal) recVal;
                                currencyFieldSubTotals.put(fieldStr, tempValueSubTotal);
                            } 
                        }
                        else{
                            recVal = ' ';
                        }
                    }
                    else if(!fieldStr.contains('__r') && fieldStr.contains('.')){
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
                    recType.addValue(recVal);
                }
            }
        Catch(Exception ex) {
            if(errType==null){
                errType = ex.getTypeName();
                LogHandler.createLog((Id) null,'DisplayRelatedObjects.RecordDataWrapperCreation()','Template Id- '+currTemplate+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
            }
            else if(ex.getTypeName()!=errType) {
                LogHandler.createLog((Id) null,'DisplayRelatedObjects.RecordDataWrapperCreation()','Template Id- '+currTemplate+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
            }
            else { // same error repeating multiple times
                System.debug('Error Type : '+ ex.getTypeName());
                System.debug('Error Message : ' + ex.getMessage());
                System.debug('Error Line Number : ' + ex.getLineNumber());
            }
        }
        return recType;
    }
}