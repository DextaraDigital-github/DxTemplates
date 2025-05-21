/* The DisplayPDFController class orchestrates 
 * PDF generation from templates, manages attachments
 * to records like Quotes, and handles content versions. 
 * With error handling and logging, it 
 * ensures smooth operations. Its integration with Aura components 
 * streamlines PDF management, offering a robust solution for 
 * generating, managing, and displaying PDF documents within 
 * Salesforce applications while maintaining data integrity and user experience.
 */


/**
 * @description Represents the DisplayPDFController class, which is a global class with sharing.
 *              This class provides functionality related to displaying PDF files.
 */
global with sharing class DisplayPDFController 
{
    /**
     * @description Instance of the Safely class for safe operations.
     */
    public static Safely safe = new Safely();
    
     public String sampleStyle {get; set;}
     public String marginHeightValue {get; set;}
     public String marginFirstHeightValue {get; set;}
     
    /**
     * @description URL of the image to be displayed.
     */
    public String imageURL {get; set;}
    
    /**
     * @description Flag indicating whether to display all pages.
     */
    public String showAllPages {get; set;}
    
    /**
     * @description Flag indicating whether to use default CSS styles.
     */
    public Boolean defaultCSS {get; set;}
    
    /**
     * @description Text to be displayed on the page.
     */
    public String displayText {get; set;}
    
    /**
     * @description Flag indicating whether to display page sequence.
     */
    public Boolean displaypagesequence {get; set;}
    
    /**
     * @description Number of header sections.
     */
    public Integer headersectionsCount {get; set;}
    
    /**
     * @description Number of first header sections.
     */
    public Integer headerfirstsectionsCount {get; set;}
    
    /**
     * @description Number of footer sections.
     */
    public Integer footersectionsCount {get; set;}
    
    /**
     * @description Text for the left side of the header.
     */
    public String leftheadertext {get; set;}
    public String leftheaderstyle {get; set;}
    public String headerHeight {get; set;}
    
    /**
     * @description Text for the center of the header.
     */
    public String centerheadertext {get; set;}
    
    /**
     * @description Text for the right side of the header.
     */
    public String rightheadertext {get; set;}
    
    /**
     * @description Text for the first left side of the header.
     */
    public String leftfirstheadertext {get; set;}
    
    /**
     * @description Text for the first center of the header.
     */
    public String centerfirstheadertext {get; set;}
    
    /**
     * @description Text for the first right side of the header.
     */
    public String rightfirstheadertext {get; set;}
    
    /**
     * @description Text for the left side of the footer.
     */
    public String leftfootertext {get; set;}
    
    /**
     * @description Text for the center of the footer.
     */
    public String centerfootertext {get; set;}
    
    /**
     * @description Text for the right side of the footer.
     */
    public String rightfootertext {get; set;}
    
    /**
     * @description Size of the page.
     */
    public static String pageSize {get;set;}
    /**
     * @description Array containing characters to be decoded in HTML entities.
     */
    private static final String[] html_DECODED  = new String[]{ '&', '<', '>', '"', '\''};
    /**
     * @description Array containing corresponding HTML encoded values.
     */
	private static final String[] html_ENCODED  = new String[]{ '&amp;', '&lt;', '&gt;', '&quot;', '&#39;' };
    
    public static String selectedPageSize {get;set;}
    public static String selectedSize {get;set;}
    public static String selectedPageOrientation {get;set;}
    public static Boolean isLandscape {get;set;}
    public static Boolean isNoHeader {get;set;}
    public static String headerRelative {get;set;}
    public static String headerFirstRelative {get;set;}
    public static String headerAbsolute {get;set;}
    public static String headerFirstAbsolute {get;set;}
    public Map<String,String> styleList {get; set;} 
    public Map<String,String> sanitizedHeaderJSON {get; set;}
    public Map<String,String> marPadList {get; set;}
    

    /**
    * @description Constructor for the DisplayPDFController class.
    *              This constructor initializes a new instance of the DisplayPDFController class.
    */
    public DisplayPDFController() {
        try {
            styleList = new Map<String,String>();
            showAllPages =  'All Pages';
            displaypagesequence = false;
            Document__c docrec = new Document__c();
            String inputparam = ApexPages.currentPage().getParameters().get('documentid');
            inputparam = String.escapeSingleQuotes(inputparam);
            if (inputparam.length()>20){
                List<String> inputparamlist = inputparam.split(','); 
                List<Document__c> docList= [SELECT Id, Document_Body__c, Document_Content__c, Document_Template__r.Watermark_Data__c, Document_Template__r.PDF_Page_Properties__c,Sequence__c      
                                  			FROM Document__c WHERE Id IN :inputparamlist WITH SECURITY_ENFORCED ORDER BY Sequence__c ];
                String contentData='';
                for (Document__c eachDocList: docList){
                    contentData += eachDocList.Document_Body__c;
                }
                docrec.Document_Body__c = contentData;
                docrec.Document_Content__c = docList[0].Document_Content__c;
                docrec.Document_Template__r = new Document_Template__c();
                docrec.Document_Template__r.PDF_Page_Properties__c = docList[0].Document_Template__r.PDF_Page_Properties__c;
                docrec.Document_Template__r.Watermark_Data__c = docList[0].Document_Template__r.Watermark_Data__c;
            }
            else if (inputparam != null){
                List<Document__c> docList= [SELECT Id, Document_Body__c, Document_Content__c, Document_Template__r.Watermark_Data__c, Document_Template__r.PDF_Page_Properties__c,Sequence__c      
                                  			FROM Document__c WHERE External_Id__c =: inputparam OR Id =: inputparam WITH SECURITY_ENFORCED ORDER BY Sequence__c ];
                String contentData='';
                for (Document__c eachDocList: docList){
                    contentData = eachDocList.Document_Body__c != null ? contentData + eachDocList.Document_Body__c : contentData;
                }
                docrec.Document_Body__c = contentData;
                docrec.Document_Content__c = docList[0].Document_Content__c;
                docrec.Document_Template__r = new Document_Template__c();
                docrec.Document_Template__r.PDF_Page_Properties__c = docList[0].Document_Template__r.PDF_Page_Properties__c;
                docrec.Document_Template__r.Watermark_Data__c = docList[0].Document_Template__r.Watermark_Data__c;
            }
            
            else {
            docrec = [SELECT Id, Document_Body__c, Document_Content__c, Document_Template__r.Watermark_Data__c, Document_Template__r.PDF_Page_Properties__c      
                                  FROM Document__c 
                                  WHERE Id = :inputparam WITH SECURITY_ENFORCED];
            }
            //System.debug('docrec -->'+ docrec);
            Map<String, Object> m =  (Map<String, Object>) JSON.deserializeUntyped(docrec.Document_Template__r.PDF_Page_Properties__c);
            Map<String,Object> m1 = (Map<String,Object>) JSON.deserializeUntyped(JSON.serialize(m.get('pagePropCSS')));
            Map<String,Object> pageProperries = (Map<String,Object>) JSON.deserializeUntyped(JSON.serialize(m.get('pageMargins'))); 
            Map<String,Object> footerMapJSON = (Map<String,Object>) JSON.deserializeUntyped(JSON.serialize(m.get('footerJSONVal')));
            Map<String,Object> headerMapJSON = (Map<String,Object>) JSON.deserializeUntyped(JSON.serialize(m.get('headerJSONVal')));
            Map<String,Object> headerPropertiesLst = (Map<String,Object>) JSON.deserializeUntyped(JSON.serialize(m.get('headerProperties')));
            Map<String, Object> normalHeaders = (Map<String, Object>) headerPropertiesLst.get('normalHeaders');
            Map<String, Object> firstPageHeaders = (Map<String, Object>) headerPropertiesLst.get('firstPageHeaders');
            Map<String,Object> footerPropertiesLst = (Map<String,Object>) JSON.deserializeUntyped(JSON.serialize(m.get('footerProperties')));
            String height = (String) normalHeaders.get('height');
            String firstPageHeight = (String) firstPageHeaders.get('height');

            Map<String, String> headerPropertiesMap = new Map<String, String>();
            styleList.put('header_left',  (String)headerMapJSON.get('header_left'));
            styleList.put('header_center',  (String)headerMapJSON.get('header_center'));
            styleList.put('header_right',  (String)headerMapJSON.get('header_right'));
            styleList.put('first_header_left',  (String)headerMapJSON.get('first_header_left'));
            styleList.put('first_header_center',  (String)headerMapJSON.get('first_header_center'));
            styleList.put('first_header_right',  (String)headerMapJSON.get('first_header_right'));
            styleList.put('header_right_landscape',  (String)headerMapJSON.get('header_left_landscape'));
            styleList.put('header_center_landscape',  (String)headerMapJSON.get('header_center_landscape'));
            styleList.put('header_left_landscape',  (String)headerMapJSON.get('header_right_landscape'));
            styleList.put('first_header_left_landscape',  (String)headerMapJSON.get('first_header_left_landscape'));
            styleList.put('first_header_center_landscape',  (String)headerMapJSON.get('first_header_center_landscape'));
            styleList.put('first_header_right_landscape',  (String)headerMapJSON.get('first_header_right_landscape'));
            styleList.put('footer_right',  (String)footerMapJSON.get('footer_right'));
            styleList.put('footer_center',  (String)footerMapJSON.get('footer_center'));
            styleList.put('footer_left',  (String)footerMapJSON.get('footer_left'));
            
            sanitizedHeaderJSON = DisplayPDFController.getSanitizedHeaderJSON(styleList);
            selectedPageSize = ApexPages.currentPage().getParameters().get('selectedPageSize');
            selectedPageOrientation = ApexPages.currentPage().getParameters().get('selectedPageOrientation');
            selectedSize= ApexPages.currentPage().getParameters().get('selectedPageSize') +' ' +ApexPages.currentPage().getParameters().get('selectedPageOrientation');
            isLandscape = selectedPageOrientation=='Landscape' ? true : false;

            DxTemplates_VF_Style__mdt[] stylesLst = [select Id, Label, MasterLabel,DeveloperName,  CSS_Style_List__c from DxTemplates_VF_Style__mdt with USER_MODE];
            for(DxTemplates_VF_Style__mdt style: stylesLst){
                styleList.put(style.label, style.CSS_Style_List__c);
            }
            if (docrec.Document_Template__r.Watermark_Data__c != null) {
                String inputStr =  docrec.Document_Template__r.Watermark_Data__c;
                String contentVersionID;
                String pageOption;
                
                List<Object> jsonObjectList = (List<Object>) JSON.deserializeUntyped(inputStr);
                
                for (Object obj : jsonObjectList) {
                    Map<String, Object> jsonObject = (Map<String, Object>) obj;
                    if (jsonObject.get('isPrimary') != null && (Boolean) jsonObject.get('isPrimary')) {
                        contentVersionID = (String) jsonObject.get('contentVersionID');
                        pageOption = (String) jsonObject.get('pageOption');
                        pageOption = pageOption.substring(0, pageOption.indexOf(' - '));
                    }
                }
				showAllPages = pageOption;
                deFaultCSS = false;
                imageURL = PdfDisplay.getDomainUrl() + '/sfc/servlet.shepherd/version/renditionDownload?rendition=ORIGINAL_Png&versionId=' + contentVersionID; 
            }
            else{
                showAllPages = 'All Pages';
                defaultCSS = true;  
            } 
            if(inputparam != null){
                displayText = String.escapeSingleQuotes(docrec.Document_Body__c).replace('\\', '');       
            } else {
                displayText = 'ID not found ' + inputparam;
            }
            if(docrec.Document_Content__c != null){
                Map<String, Object> mapjson = (Map<String, Object>) JSON.deserializeUntyped(docrec.Document_Content__c);  
                isNoHeader = mapjson.containsKey('header')?false:true;
                if(mapjson.containsKey('header')){
                    List<Object> headerListObject = new List<Object>();
                    Map<String, Object> headerMap = (Map<String, Object>) mapjson.get('header');
                    headersectionsCount = Integer.valueOf(headerMap.get('sectionsCount'));
                    headerfirstsectionsCount = Integer.valueOf(headerMap.get('sectionsFirstCount'));
                    headerListObject = (List<Object>) headerMap.get('sectionsContent'); 

                    if(!headerListObject.isEmpty()){
                        for(Object objrec : headerListObject){
                            Map<String, Object> wrec = (Map<String, Object>) objrec;  
                            if(wrec.get('indexvar') == 0){
                                leftheadertext = (String) wrec.get('value');
                            } else if(wrec.get('indexvar') == 1){
                                centerheadertext = (String) wrec.get('value');
                            } else if(wrec.get('indexvar') == 2){
                                rightheadertext = (String) wrec.get('value');
                            } else if(wrec.get('indexvar') == 3){
                                leftfirstheadertext = (String) wrec.get('value');
                            } else if(wrec.get('indexvar') == 4){
                                centerfirstheadertext = (String) wrec.get('value');
                            } else if(wrec.get('indexvar') == 5){
                                rightfirstheadertext = (String) wrec.get('value');
                            }
                        }
                        if (headerfirstsectionsCount == null){
                            leftfirstheadertext = leftheadertext;
                            centerfirstheadertext = centerheadertext;
                            rightfirstheadertext = rightheadertext;
                        }
                    }
                }
                if(mapjson.containsKey('footer')){
                    List<Object> footerListObject = new List<Object>();
                    Map<String, Object> footerMap = (Map<String, Object>) mapjson.get('footer');
                    footersectionsCount = Integer.valueOf(footerMap.get('sectionsCount'));
                    displaypagesequence = (Boolean) footerMap.get('displaypagesequence');
                    footerListObject = (List<Object>) footerMap.get('sectionsContent');
                   
                    if(!footerListObject.isEmpty()){
                        for(Object objrec : footerListObject){
                            Map<String, Object> wrec = (Map<String, Object>) objrec;  
                            if(wrec.get('indexvar') == 0){
                                leftfootertext = (String) wrec.get('value');
                            } else if(wrec.get('indexvar') == 1){
                                centerfootertext = (String) wrec.get('value');
                            } else if(wrec.get('indexvar') == 2){
                                rightfootertext = (String) wrec.get('value');
                            }
                        }
                    }
                }
            } else {
                displayText = 'ID not found';
            }
            Integer heightVal = Integer.valueOf(height.replace('px', ''));
            if(isLandscape == true) {
                //values for firstPage Header
                if(headerfirstsectionsCount != null){
                    headerFirstRelative = 'position:relative; width:100%;overflow:hidden;height:' + firstPageHeight +';';
                    headerFirstAbsolute = 'position:absolute; width:100%;overflow:hidden;height: '+ firstPageHeight+';';
                }
                //values for normal Headers
                //headerRelative = 'position:relative; width:100%;overflow:hidden;height:' +  (Integer.valueOf(height.replace('px', '')) + 80) + 'px;';
                //headerAbsolute = 'position:absolute; width:100%;overflow:hidden; height : '+  (Integer.valueOf(height.replace('px', '')) + 80) + 'px;';

                headerRelative = 'position:relative; width:100%;overflow:hidden; height:' + height + ';';
                headerAbsolute = 'position:absolute; width:100%;overflow:hidden; height: '+ height + ';';

                //marginHeightValue = (Integer.valueOf(height.replace('px', '')) + 80) + 'px';
                //marginFirstHeightValue = (Integer.valueOf(firstPageHeight.replace('px', '')) + 80) + 'px';

                marginHeightValue =  (Integer.valueOf(height.replace('px', '')) + 35) + 'px';
            }
            else {
                 //values for firstPage Header
                if(headerfirstsectionsCount != null){
                    headerFirstRelative = 'position:relative; width:100%;overflow:hidden;height:' + firstPageHeight +';';
                    headerFirstAbsolute = 'position:absolute; width:100%;overflow:hidden;height: '+ firstPageHeight+';';
                }
                //headerRelative = 'position:relative; width:100%;overflow:hidden;height: '+ (Integer.valueOf(height.replace('px', '')) + 30) + 'px;';
                //headerAbsolute = 'position:absolute; width:100%;overflow:hidden;height: '+ (Integer.valueOf(height.replace('px', '')) + 30) + 'px;';

                headerRelative = 'position:relative; width:100%;overflow:hidden;height:' + height + ';';
                headerAbsolute = 'position:absolute; width:100%;overflow:hidden; height : '+ height + ';';

                //marginHeightValue =  (Integer.valueOf(height.replace('px', '')) + 60) + 'px';
                //marginFirstHeightValue = (Integer.valueOf(firstPageHeight.replace('px', '')) + 40) + 'px';

                marginHeightValue =  (Integer.valueOf(height.replace('px', '')) + 30) + 'px'; //height;
            }
            //marginHeightValue =  (Integer.valueOf(height.replace('px', '')) + 10) + 'px';
            marginFirstHeightValue = firstPageHeight ; //(Integer.valueOf(firstPageHeight.replace('px', '')) + 40) + 'px';
            if (marPadList == null) {
                marPadList = new Map<String, String>();
            }
            marPadList.put('Margin-top', (String)pageProperries.get('margin-top'));
            marPadList.put('Margin-bottom', (String)pageProperries.get('margin-bottom'));
            marPadList.put('Margin-left', (String)pageProperries.get('margin-left'));
            marPadList.put('Margin-right', (String)pageProperries.get('margin-right'));
            marPadList.put('First-Page-Margin-top', (String)pageProperries.get('margin-top'));
            marPadList.put('First-Page-Margin-bottom', (String)pageProperries.get('margin-bottom'));
            marPadList.put('First-Page-Margin-left', (String)pageProperries.get('margin-left'));
            marPadList.put('First-Page-Margin-right', (String)pageProperries.get('margin-right'));
        } catch(Exception ex) {
            LogHandler.createLog((Id) null,'DisplayPDFController.DisplayPDFController() - Constructor','Template Id-  '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
        }
    }

    //Added by Vivek - Start
        
        /**
     * @description Encodes the input string by replacing specific characters with their corresponding HTML encoded values.
     * @param input The input string to be encoded.
     * @param fromArr Array containing characters to be replaced.
     * @param toArr Array containing corresponding HTML encoded values.
     * @return The encoded string.
     */
    private String encode(String input, String[] fromArr, String[] toArr) {
        if (input == null || input.length() == 0){ return input; }

		for (Integer i = 0; i < fromArr.size(); ++i) {
			input = input.replace(fromArr[i], toArr[i]);
		}
		
		return input; 
	}
    /**
     * @description Encodes the input string using SFDC HTML encoding.
     * @param input The input string to be encoded.
     * @return The encoded string.
     */
    public String SFDC_HTMLENCODE(String input) {
		return encode(input, html_DECODED, html_ENCODED);
	}
    //Added by Vivek- End
    
    /**
     * @description    Generates a document record and inserts it into Salesforce
     * @param          templateId       ID of the document template
     * @param          quoteId          ID of the associated quote
     * @param          pdfbody          Body content of the PDF document
     * @param          pdfheaderfooter  Header and footer content of the PDF document
     * @return         ID               ID of the inserted document record
     */
  /* changes done by reethika Parameter templatedId changed to documentId and document record Insertion
   logic changed to document updation logic*/
    @AuraEnabled
    public static string generateDocument(ID documentId, String quoteId, String pdfbody, String pdfheaderfooter){
        try{
            List<Document__c> doctobeinserted=new List<Document__c>();
            
            Document__c docrec=new Document__c();
            docrec.Document_Content__c=pdfheaderfooter;
            Integer bodyLength = 100000;
            Integer totalDocNumber = (pdfbody.length()/bodyLength) +1;
            List<Document__c> docList = new List<Document__c>();
            Integer startBody=0;
            Integer endBody = 0;
            for (integer i=0; i<totalDocNumber; i++){
                Document__c sectionContentRecord = new Document__c();
                endBody = startBody + bodyLength;
                endBody = endBody>pdfbody.length() ? pdfbody.length() : endBody;
                String contentChunk = pdfbody.substring(startBody, endBody);
                sectionContentRecord.Sequence__c = i;
                sectionContentRecord.Document_Body__c = contentChunk;
                sectionContentRecord.DxCPQ__External_Id__c = documentId;
            	//sectionContentRecord.Document_Template__c = templateId;
            	//sectionContentRecord.Document_Content__c = String.valueof(headerFooterSectionMap).replace('\"header\"=','\"header\":').replace('\"footer\"=','\"footer\":');
                docList.add(sectionContentRecord);
                startBody = endBody;
            }
            
            //docrec.Document_Body__c=pdfbody;
            //docrec.Document_Template__c=templateId;
            docrec.Object_Id__c=quoteId;
            docrec.Id=documentId;
            docrec.DxCPQ__Sequence__c = -1;
            doctobeinserted.add(docrec);
            Savepoint sp = Database.setSavepoint();
            List<Database.SaveResult> sResult = safe.doUpdate(doctobeinserted);
            List<String> errorList = Safely.safeClassExceptionHandlerInsert(sResult);
            if(errorList.size()>0) {
                Database.rollback(sp);
                throw new SafeClassException(String.join( errorList, ', ' ));
            }
            
            List<Database.SaveResult> sResult1 = safe.doInsert(docList);
            List<String> errorList1 = Safely.safeClassExceptionHandlerInsert(sResult1);
            
            if(errorList1.size()>0) {
                Database.rollback(sp);
                throw new SafeClassException(String.join( errorList1, ', ' ));
            }
            List <Id> insertedDocumentIds = new List<Id> ();
            for(Integer i=0;i<sResult1.size();i++) {
                if(sResult1.get(i).isSuccess()) {
                    if(sResult1.get(i).getId() != null) {
                        System.debug('sResult1- '+sResult1.get(i).getId());
                        insertedDocumentIds.add(sResult1.get(i).getId());
                    }
                } else if (!sResult1.get(i).isSuccess()) {
                    Database.Error error = sResult1.get(i).getErrors().get(0);
                    String failedDML = error.getMessage();
                    insertedDocumentIds[i] = null;
                    throw new SafeClassException(String.join( new List<String> {failedDML}, ', '));
                }
            }
            return documentId;
        } catch (Exception ex) {
            LogHandler.createLog((Id) null,'DisplayPDFController.generateDocument()','document Id- '+documentId+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
            return null;
        }     
    }
    
    /**
     * @description    Generates a PDF attachment for a given document ID and quote ID
     * @param          documentid  ID of the document for which the PDF is generated
     * @param          quoteId     Quote ID used for naming the PDF attachment
     * @return         ID          ID of the generated PDF attachment
     */
    @AuraEnabled
    public static string generatePDFAttachment(ID documentid, String quoteId, String pageProperties){
        try{
            Pagereference pg = Page.renderAsPdfLWC;
            pg.getParameters().put('documentid', documentid);

            if(pageProperties != null){
                Map<String, Object> jsonDataMap = (Map<String, Object>) JSON.deserializeUntyped(pageProperties);
				selectedPageSize = (String)jsonDataMap.get('pageSize');
                selectedPageOrientation = (String)jsonDataMap.get('pageOrientation');
                selectedSize= selectedPageSize +' ' + selectedPageOrientation;
                pg.getParameters().put('selectedPageSize', selectedPageSize);
                pg.getParameters().put('selectedPageOrientation', selectedPageOrientation);
            }
            Id insertedattachmentId;
            Attachment objAttachment = new Attachment();
            objAttachment.Name = quoteId+'.pdf';
            objAttachment.ParentId = documentid;
            
            if(!Test.isrunningTest()){
                objAttachment.Body = pg.getContentAsPDF(); 
            } else {
                objAttachment.Body = Blob.valueof('text');
            }
            
            objAttachment.IsPrivate = false;
            List<Attachment> atttobeinserted=new List<Attachment>();
            atttobeinserted.add(objAttachment);
            Savepoint sp = Database.setSavepoint();
            List<Database.SaveResult> sResult = safe.doInsert(atttobeinserted);
            List<String> errorList = Safely.safeClassExceptionHandlerInsert(sResult);
            
            if(errorList.size()>0){
                Database.rollback(sp);
                throw new SafeClassException(String.join( errorList, ', ' ));
            }
            
            for(Integer i=0;i<sResult.size();i++){
                if (sResult.get(i).isSuccess()){
                    Id attachmentid=sResult.get(i).getId();
                    if(attachmentid!=null) {
                        insertedattachmentId = attachmentid;
                    }
                }else if (!sResult.get(i).isSuccess()){
                    Database.Error error = sResult.get(i).getErrors().get(0);
                    LogHandler.createLog((Id) null,'DisplayPDFController.generatePDFAttachment()','documentid ->  '+documentid+' '+'Database Error while saving the result --> ',String.valueof(error),'Exception');
                }            
            }
            
            return insertedattachmentId;   
        }
        catch (Exception ex) {
            LogHandler.createLog((Id) null,'DisplayPDFController.generatePDFAttachment()','documentid ->  '+documentid+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
            throw new AuraHandledException(ex.getMessage());
        }        
    }
    
    /**
     * @description             Saves a PDF attachment to a Quote record.
     * @param     documentid    (ID) ID of the PDF document to be saved.
     * @param     quoteId       (String) ID of the Quote record to which the PDF will be attached.
     * @param     pdfMode       (String) Mode of the PDF operation.
     * @param     pdfName       (String) Name of the PDF file.
     * @return                  (String) ID of the inserted Attachment record.
     */
    @AuraEnabled
    public static string savePDFtoQuote(ID documentid, String quoteId, String pdfMode, String pdfName){ 
        try{ 
            Attachment arec = [SELECT Name, Body,id FROM Attachment WHERE id = :documentid WITH SECURITY_ENFORCED];
            Attachment objAttachment = New Attachment(Body = arec.Body); 
            objAttachment.name = pdfName+'.pdf';
            objAttachment.parentID = quoteId;
            
            List<Attachment> atttobedeleted=new List<Attachment>();
            atttobedeleted.add(arec);
            Savepoint sp = Database.setSavepoint();
            List<Database.DeleteResult> deleteResult = safe.doDelete(atttobedeleted);
            List<String> errorList = Safely.safeClassExceptionHandlerDelete(deleteResult);
            
            if(errorList.size()>0){
                Database.rollback(sp);
                throw new SafeClassException(String.join( errorList, ', ' ));
            }
            
            Id insertedattachmentId;
            List<Attachment> atttobeinserted=new List<Attachment>();
            atttobeinserted.add(objAttachment);
            List<Database.SaveResult> sResult = safe.doInsert(atttobeinserted);
            List<String> errorList1 = Safely.safeClassExceptionHandlerInsert(sResult);
            
            if(errorList1.size()>0){
                Database.rollback(sp);
                throw new SafeClassException(String.join( errorList1, ', ' ));
            }
            
            for(Integer i=0;i<sResult.size();i++){
                if (sResult.get(i).isSuccess()){
                    Id attachmentid=sResult.get(i).getId();
                    if(attachmentid!=null)
                    {
                        insertedattachmentId=attachmentid;
                    }
                }else if (!sResult.get(i).isSuccess()){
                    Database.Error error = sResult.get(i).getErrors().get(0);
                    LogHandler.createLog((Id) null,'DisplayPDFController.savePDFtoQuote()','documentid ->  '+documentid+' '+'Database Error while saving the result --> ',String.valueof(error),'Exception');
                }                
            }
            return String.Valueof(insertedattachmentId);
        } catch (Exception ex) {
            LogHandler.createLog((Id) null,'DisplayPDFController.savePDFtoQuote()','documentid ->  '+documentid+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
            throw new AuraHandledException(ex.getMessage());
        }       
    }    
    
    /**
    * @description    Retrieves the sections of a document template by its ID. changes done by Reethika - Dynamically selected class is called using interface and map is returned from that class
                        Dynamically selected flow will be executed and the string returned from flow is deserailised to map and final map
                        is constructed . mergefieldsclass parameters got changed from size 3 to 4, an extra parameter of replaceData (datatype-Map)
                        is added.
    * @param          templateId   ID of the document template
    * @param          recordId     ID of the record related to the document template
    * @param          objectApiName   API name of the object related to the document template
    * @return         Map<String,Object>  List of document template sections
    */
    @AuraEnabled
    public static Map<String,Object> getTemplateSections(ID templateId, String recordId, String objectApiName){ 
        try{
            Map<String,Object> templatecontentsData=new Map<String,Object>();
            List<Document_Template_Section__c> selectedTemplateContents=[select id,Section_Content__c, Type__c, New_Page__c, Sequence__c, Section_Visibility_Rule__c from Document_Template_Section__c where Document_Template__c=:templateId WITH SECURITY_ENFORCED ORDER BY Sequence__c ASC];
            //code added by Tanmayee and Bhavya
            List<Id> sectionVisibilityId = new List<Id>();
            for(Document_Template_Section__c sec:selectedTemplateContents){
                sectionVisibilityId.add(sec.Section_Visibility_Rule__c);
            }
            List<Rule__c> rules = [select Id, Name, Evaluation_Object__c,External_Id__c, Rule_Description__c, Rule_Expression__c, Rule_Service__c,Rule_Type__c, Service__c,(Select Id,Rule__c,Name,ConditionIndex__c,Condition_Field__c,DataType__c,Evaluation_Object__c,Is_Cart_Item_Condition__c,Operator__c,Value__c from Rule_Conditions__r)  from Rule__c WHERE Id IN: sectionVisibilityId];
            String queryString = 'SELECT ';
            Map<String, Schema.SObjectField> fieldMap = Schema.getGlobalDescribe().get(objectApiName).getDescribe().fields.getMap();
            for (String fieldName : fieldMap.keySet()) {
                queryString += fieldName + ', ';
            }
            queryString = queryString.removeEnd(', ') + ' FROM ' + objectApiName + ' WHERE Id = :recordId';
            List<sObject> records = Database.query(queryString);
            templatecontentsData.put('Rules',rules);            
            templatecontentsData.put('record',records);
            //Code added by Tanmayee and Bhavya ends here
            List<Document_Template__c> templateData=[SELECT ClassId__c,FlowId__c FROM Document_Template__c WHERE id=:templateId WITH SECURITY_ENFORCED];
            Map<String,Object> replaceData=new Map<String,Object>();
            if(!string.isEmpty(templateData[0].ClassId__c)) {
                List<ApexClass> classnames= [SELECT Name FROM ApexClass WHERE Id=:templateData[0].ClassId__c WITH SECURITY_ENFORCED];
                Type t = Type.forName(classnames[0].Name);
                DXHandlerInterface api = (DXHandlerInterface)t.newInstance();
                Map<String,Object> tempData= new Map<String,Object>();
                tempData.put('templateId',templateId);
                tempData.put('recordId',recordId);
                replaceData=api.execute(tempData);                
            }
            if(!string.isEmpty(templateData[0].FlowId__c)) {
                    List <FlowDefinitionView> flownames= [SELECT  Label, ApiName,Id,DurableId FROM FlowDefinitionView where ProcessType='AutoLaunchedFlow' AND IsActive=True AND DurableId=:templateData[0].FlowId__c WITH SECURITY_ENFORCED];   
                    Map<String,Object> inputs=new map<String,Object>{'recordIdVal'=>recordId};
                    Flow.Interview myFlow = Flow.Interview.createInterview(flownames[0].ApiName, inputs);
                    myFlow.start();
                    string data=(string)myFlow.getvariableValue('genericData');
                    if(!string.isEmpty(data)){
                    Map<String, Object>  mapdata =(Map<String, Object>) JSON.deserializeUntyped(data); 
                    replaceData.putAll(mapdata); 
                }                  
            }
            Id docid;
            List<Document__c> doclist=new List<Document__c>();
            Document__c doc= new Document__c();
            doc.Document_Template__c=templateId;
            if(!string.isEmpty(templateData[0].FlowId__c) || !string.isEmpty(templateData[0].ClassId__c)){
                doc.Token_Data__c=JSON.serialize(replaceData);
            }

            Savepoint sp = Database.setSavepoint();
            Database.SaveResult result = Database.insert(doc, false);
            if (result.isSuccess()) {
                docid= result.getId();
            } else {
                for (Database.Error error : result.getErrors()) {
                    LogHandler.createLog((Id) null,'DisplayPDFController.getTemplateSections()','Template Id- '+templateId+' '+'Database Error while saving the result --> ',String.valueof(error),'Exception');
                }
            }
            selectedTemplateContents = MergeFieldsClass.mergefieldsMethod(selectedTemplateContents,recordId,replaceData);
            templatecontentsData.put('selectedTemplateContents',selectedTemplateContents);            
            templatecontentsData.put('documentId',docid);
            return templatecontentsData;
        } catch (Exception ex) {
            LogHandler.createLog((Id) null,'DisplayPDFController.getTemplateSections()','templateId ->  '+templateId+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
            return null;
        }  
    }
        //To fetch the template sections and the rules related to the template sections
    @AuraEnabled
    public static Map<String,Object> getSectionConditions(Id templateId,String recordId,String objectApiName){
        Map<String,Object> sectionsMap = new Map<String,Object>();
        List<Document_Template_Section__c> selectedTemplateContents=[select id,Section_Content__c, Type__c, New_Page__c, Sequence__c,Section_Visibility_Rule__c from Document_Template_Section__c where Document_Template__c=:templateId WITH SECURITY_ENFORCED ORDER BY Sequence__c ASC];
        List<Id> sectionVisibilityId = new List<Id>();
        for(Document_Template_Section__c sec:selectedTemplateContents){
            sectionVisibilityId.add(sec.Section_Visibility_Rule__c);
        }
        List<Rule__c> rules = [select Id, Name, Evaluation_Object__c,External_Id__c, Rule_Description__c,Rule_Expression__c, DxCPQ__Rule_Service__c, DxCPQ__Rule_Type__c, DxCPQ__Service__c,(Select Id,DxCPQ__Rule__c,Name,DxCPQ__ConditionIndex__c,DxCPQ__Condition_Field__c,DxCPQ__DataType__c,DxCPQ__Evaluation_Object__c,DxCPQ__Is_Cart_Item_Condition__c,DxCPQ__Operator__c,DxCPQ__Value__c from DxCPQ__Rule_Conditions__r)  from DxCPQ__Rule__c WHERE Id IN: sectionVisibilityId];
        String queryString = 'SELECT ';
        Map<String, Schema.SObjectField> fieldMap = Schema.getGlobalDescribe().get(objectApiName).getDescribe().fields.getMap();
        for (String fieldName : fieldMap.keySet()) {
            queryString += fieldName + ', ';
        }
        queryString = queryString.removeEnd(', ') + ' FROM ' + objectApiName + ' WHERE Id = :recordId';
        List<sObject> records = Database.query(queryString);
        sectionsMap.put('TempSections',selectedTemplateContents);
        sectionsMap.put('Rules',rules); 
        sectionsMap.put('record',records);
        return sectionsMap;
    }
    //getting the template sections for the Multiple recordIds
    @AuraEnabled
    public static List<Document_Template_Section__c> getTemplateSectionsMulRecords(ID templateId, List<String> recordIdLst, String objectApiName){ 
        try{
            List<Document_Template_Section__c> selectedTemplateContents=[select id,Section_Content__c, Type__c, New_Page__c, Sequence__c from Document_Template_Section__c where Document_Template__c=:templateId WITH SECURITY_ENFORCED ORDER BY Sequence__c ASC];
            selectedTemplateContents = MergeFieldsClass.mergefieldsMethodMultiple(selectedTemplateContents,recordIdLst);
            return selectedTemplateContents;
        } catch (Exception ex) {
            LogHandler.createLog((Id) null,'DisplayPDFController.getTemplateSections()','templateId ->  '+templateId+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
            throw new AuraHandledException(ex.getMessage());
        }  
    }
    
    //getting the template sections for the Multiple recordIds with multiple PDFs
    @AuraEnabled
    public static Map<Id,List<Document_Template_Section__c>> getTemplateSectionsMulRecordsPDFs(ID templateId, List<String> recordIdLst, String objectApiName){ 
        try{
            Map<Id,List<Document_Template_Section__c>> docsTempLstMap = new Map<Id,List<Document_Template_Section__c>>();
            List<Document_Template_Section__c> selectedTemplateContents=[select id,Section_Content__c, Type__c, New_Page__c, Sequence__c from Document_Template_Section__c where Document_Template__c=:templateId WITH SECURITY_ENFORCED ORDER BY Sequence__c ASC];
            docsTempLstMap = MergeFieldsClass.mergefieldsMethodMultiplePdf(selectedTemplateContents,recordIdLst);
            return docsTempLstMap;
        } catch (Exception ex) {
            LogHandler.createLog((Id) null,'DisplayPDFController.getTemplateSections()','templateId ->  '+templateId+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
            throw new AuraHandledException(ex.getMessage());
        }  
    }
        
    /**
     * @description    Retrieves the PDF mode based on the provided wrapper data
     * @param          wrapperdata Map containing wrapper data with key-value pairs
     * @return         String PDF mode retrieved from the wrapper data
     */
    @AuraEnabled
    public static string pdfMode(Map<String,String> wrapperdata){
        try {
            String pageSize = wrapperdata.get('pdfModes1');
            DisplayPDFController.setName();
            return pageSize;
        } catch(Exception ex) {
            LogHandler.createLog((Id) null,'DisplayPDFController.pdfMode()','Wrapper data - '+wrapperdata+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
            throw new AuraHandledException(ex.getMessage());
        }
    }
    
    /**
     * @description    Retrieves a string containing the page size
     * @return         String A string containing the page size
     */
    @AuraEnabled
    public static string setName() {
        try {
            String pageSize = 'pageSize'; 
            return 'pageSize' + pageSize;
        } catch(Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }
    
    /**
     * @description    Retrieves the object name associated with a PDF by its ID
     * @param          id  String ID of the PDF
     * @return         String Object name associated with the PDF
     */
    @AuraEnabled
    public static string pdfObjectName(string id){
        try {
            return 'ObjectName is Returned';
        } catch(Exception ex) {
            throw new AuraHandledException(ex.getMessage());
        }
    }
    
    /**
     * @description    Property to store PDF modes 
     */
    @AuraEnabled
    public String pdfModes1 { get; set; }
    
    /**
     * @description Custom exception class used for handling exceptions in SafeClass.
     */    
    public class SafeClassException extends Exception{}
    
    /**
     * @description Wrapper class for header and footer values
     */
    public class HeaderFooterWrapper {

		/**
         * @description Represents a value associated with a header or footer section.
         */
        public String value { get; set; } 
        
        /**
         * @description Represents the index variable associated with a header or footer section.
         */
        public String indexvar { get; set; } 
        
        /**
         * @description Constructor for the HeaderFooterWrapper class.
         * @param value The value associated with a header or footer section.
         * @param indexvar The index variable associated with a header or footer section.
         */
        public HeaderFooterWrapper(String value, String indexvar) {
            this.value = value;
            this.indexvar = indexvar;
        }
    }
     
    /**
     * @description    Saves content versions (text or image) to Salesforce as ContentVersion records
     * @param          title           Title of the content version
     * @param          base64DataList List of maps containing base64-encoded data and record types (text or image)
     * @param          templateId      Id of the document template where the content versions should be associated
     * @return         List<Map<String, String>> List of maps containing saved record types and their corresponding Ids
     */
    @AuraEnabled(cacheable=false)
    public static List<Map<String, String>> saveContentVersion(String title, List<Map<String, String>> base64DataList, String templateId, Boolean wtImage) {
        try {
            
            List<ContentVersion> contentVersionsToInsert = new List<ContentVersion>(); 
            List<Map<String, String>> savedIds = new List<Map<String, String>>();
            List<Id> contentVersionIdsToDelete = new List<Id>();
            if(wtImage){
                for (ContentVersion cv : [SELECT Id, ContentDocumentId  FROM ContentVersion WHERE FirstPublishLocationId = :templateId  WITH USER_MODE]) {
                    contentVersionIdsToDelete.add(cv.ContentDocumentId);
                }
            } else {
                for (ContentVersion cv : [SELECT Id, ContentDocumentId  FROM ContentVersion WHERE FirstPublishLocationId = :templateId and Title != 'OriginalImg' WITH USER_MODE]) {
                    contentVersionIdsToDelete.add(cv.ContentDocumentId);
                } 
            }
            
            List<Id> contentDocumentIdsToDelete = new List<Id>();
            List<ContentDocument> cdlst = [SELECT Id FROM ContentDocument WHERE Id IN :contentVersionIdsToDelete WITH USER_MODE];
            if (!cdlst.isEmpty()) {
                delete cdlst;
            }
            
            for(Map<String, String> dataUrl : base64DataList) {
                String recordType = dataUrl.keySet().iterator().next();
                String data = dataUrl.get(recordType);
                if(recordType.equalsIgnoreCase('Text') || recordType.equalsIgnoreCase('Image') || recordType.equalsIgnoreCase('OriginalImg')) {
                    ContentVersion contentVersion = new ContentVersion(
                        Title = dataUrl.get('title'),
                        VersionData = EncodingUtil.base64Decode(data),
                        PathOnClient = title + '.png',
                        FirstPublishLocationId = templateId
                    );
                    
                    contentVersionsToInsert.add(contentVersion);
                }
            }
            if (Schema.sObjectType.ContentVersion.isCreateable()) {
                insert contentVersionsToInsert;
                for(ContentVersion contentVersion : contentVersionsToInsert) {
                    Map<String, String> savedId = new Map<String, String>();
                    savedId.put(contentVersion.Title, contentVersion.Id);
                    savedIds.add(savedId);
                }
                return savedIds;
            }else{
                LogHandler.createLog((Id) null,'DisplayPDFController.saveContentVersion()','Insufficient permissions to create ContentVersion records. ','Insufficient permissions to create ContentVersion records.', 'Insufficient permissions');
                return null;
            }        
       
    } catch(Exception ex) {
        LogHandler.createLog((Id) null,'DisplayPDFController.saveContentVersion()','Failed to create the Contentversion records '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Failed to create the Contentversion records');  
        return null;
            }
    }
    
   /**
     * @description   					Retrieves data of a document template by its ID
     * @param 			templateId 		String ID of the document template
     * @return           				Document_Template__c
     */
    @AuraEnabled
    public static Document_Template__c getDocumentTemplateData(String templateId) {
        try {
            Document_Template__c dtData = [SELECT Id, Name,Watermark_Data__c FROM Document_Template__c  
                                           WHERE Id = :templateId WITH USER_MODE LIMIT 1];
            return dtData;
        } catch(Exception ex) {
            LogHandler.createLog((Id) null,'DisplayPDFController.getDocumentTemplateData()','Template Id- '+templateId+' '+ex.getLineNumber()+ex.getStackTraceString()+ex.getCause(),ex.getMessage(),'Exception');
            return null;
        }
    }
    
    public static String sanitizeCss(String cssString) {
        cssString = cssString.replaceAll('\\s+', ' ');
        cssString = cssString.replaceAll('[\\n\\r]+', '');
        return cssString.trim();
    }
    
    public static Map<String, String> getSanitizedHeaderJSON(Map<String, String> headerProperties) {
        Map<String, String> sanitizedHeaderJSON = new Map<String, String>();
        for (String key : headerProperties.keySet()) {
            sanitizedHeaderJSON.put(key, sanitizeCss(headerProperties.get(key)));
        }
        return sanitizedHeaderJSON;
    }
}