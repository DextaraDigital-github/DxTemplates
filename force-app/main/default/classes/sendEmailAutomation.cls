/* 
* Class			    : sendEmailAutomation
* Developer			: Rahul Bejgam (ASE - Dextara)
* Created Date		: 08/03/2023
* Description		: This class renders the pdf from Document__c record content and generated the pdf version.
* Last Modified Date: 08/10/2023
*/
global class sendEmailAutomation implements Queueable,Database.AllowsCallouts{
   
    String attachmentName;
    Id attachmentParentId;
    String emailStructure;
    String attachmentOrientation;
    String attachmentPageSize;
    Boolean isSpecificToFox;
    String documentRecordInserted;
    private static Savepoint sp1;
    Map<string,Object> inputMap;
    public static Safely safe = new Safely();
    public class SafeClassException extends Exception {}

    /* Deprecated method - removed for Fox Specific Changes. */
    @deprecated
    global sendEmailAutomation(Id docInserted, String attachmentName, String emailStructure) {
    }

    /* Constructor used for the context of general Organizations. */
    @deprecated
    global sendEmailAutomation(Id docInserted, String attachmentName, Id attachmentParentId) { 
    }

    /* Constructor used for the context of general Organizations. */
    global sendEmailAutomation(Id docInserted, String attachmentName, Id attachmentParentId, String ignorethistext) { 
		this.documentRecordInserted = (String) docInserted;
        this.attachmentName = attachmentName;
        this.attachmentParentId = attachmentParentId;
        this.isSpecificToFox = false;
        this.emailStructure = null;
        this.attachmentOrientation = 'Potrait';
        this.attachmentPageSize = 'A4';
    }
    
    global sendEmailAutomation(Id docInserted, String attachmentName, Id attachmentParentId, String attachmentOrientation, String attachmentPageSize) { 
		this.documentRecordInserted = (String) docInserted;
        this.attachmentName = attachmentName;
        this.attachmentParentId = attachmentParentId;
        this.isSpecificToFox = false;
        this.emailStructure = null;
        this.attachmentOrientation = attachmentOrientation;
        this.attachmentPageSize = attachmentPageSize;
    }
    
    /* Constructor used for the context of FOX Organization. */
    global sendEmailAutomation(Id docInserted, String attachmentName, String emailStructure, Boolean isSpecificToFox) {
    }
    
    /* Constructor used for the context of FOX Organization. */
    global sendEmailAutomation(Id docInserted, String attachmentName, Boolean isSpecificToFox) {
    }

    // Constructor used for the context of FOX Organization. 
    global sendEmailAutomation(String methodName,Map<string,Object> inputMap) {
        this.inputMap = inputMap;
        this.isSpecificToFox = (boolean) (inputMap.containsKey('isSpecificToFox')?inputMap.get('isSpecificToFox'):false);
        this.documentRecordInserted = (String) (inputMap.containsKey('insertedDocumentId')?inputMap.get('insertedDocumentId'):null);
        this.attachmentName = (String) (inputMap.containsKey('documentNameAfterGeneration')?inputMap.get('documentNameAfterGeneration'):null);
        this.attachmentOrientation = (String) (inputMap.containsKey('orientation')?inputMap.get('orientation'):'Potrait');
        this.attachmentPageSize = (String) (inputMap.containsKey('pageSize')?inputMap.get('pageSize'):'A4');
        this.emailStructure = (String) (inputMap.containsKey('emailStructure')?inputMap.get('emailStructure'):null);
    }

    public void execute(QueueableContext context) {
        try {
            List<String> errorList;
            Id insertedAttachmentId;
            List<Messaging.EmailFileAttachment> existingAttachments = new List<Messaging.EmailFileAttachment>();

            /* .pdf version of the Document__c record Content */
            Pagereference pg = Page.renderAsPdfLWC;
            pg.getParameters().put('documentId',documentRecordInserted);
            pg.getParameters().put('selectedPageSize',attachmentPageSize);
            pg.getParameters().put('selectedPageOrientation',attachmentOrientation);
            
            /* Attachment Generation and Insertion of the generated Document to Parent Record */
            if(!isSpecificToFox && emailStructure==null) {
                Attachment documentAttachment = new Attachment();
                    documentAttachment.Name = attachmentName;
                    documentAttachment.ParentId = attachmentParentId; 
                if(!Test.isRunningTest()){
                    documentAttachment.Body = pg.getContentAsPDF();
                } else {
                    documentAttachment.Body = Blob.valueOf('Test');
                }
                    documentAttachment.IsPrivate = false;
                Savepoint sp1 = Database.setSavepoint();

                Database.SaveResult attachmentDMLStatus = Database.insert(documentAttachment);
                if (attachmentDMLStatus.isSuccess()) {
                    insertedAttachmentId = attachmentDMLStatus.getId();
                }
                errorList = Safely.safeClassExceptionHandlerInsert(new Database.SaveResult[] {attachmentDMLStatus});
                if(errorList.size()>0) {
                    Database.rollback(sp1);
                    throw new SafeClassException(String.join( errorList, ', ' ));
                }

                DXTemplates_HandlerClass__mdt metaDataContent = [SELECT Id,Label,HandlerClassName__c FROM DXTemplates_HandlerClass__mdt where Label = 'HandlerClass'];
                if(metaDataContent != null) {
                    Type objectType = Type.forName(metaDataContent.HandlerClassName__c);
                    DXHandlerInterface api = (DXHandlerInterface)objectType.newInstance();
                    Map<String,Object> replaceData = api.execute(null);
                }  

            } else {
                Attachment documentAttachment = new Attachment();
                documentAttachment.Name = attachmentName +'.pdf';
                if(!Test.isRunningTest()){
                    documentAttachment.Body = pg.getContentAsPDF();
                } else {
                    documentAttachment.Body = Blob.valueOf('Test');
                }               

                Map<String,Object> outputMap = new Map<String,Object>();
                outputMap.put('PDFAttachment',documentAttachment);
                outputMap.putAll(inputMap);
                if (emailStructure == 'MultiRecordPDF'){
                    ContentVersion cv = new ContentVersion();
                    cv.VersionData = documentAttachment.Body;
                    cv.PathOnClient = documentAttachment.Name;
                    insert cv;
                }

                DXTemplates_HandlerClass__mdt metaDataContent = [SELECT Id,Label,HandlerClassName__c FROM DXTemplates_HandlerClass__mdt where Label = 'HandlerClass'];
                if(metaDataContent != null) {
                    Type objectType = Type.forName(metaDataContent.HandlerClassName__c);
                    DXHandlerInterface api = (DXHandlerInterface)objectType.newInstance();
                    Map<String,Object> replaceData = api.execute(outputMap);
                }         
            }
        }
        catch(Exception ex) {
            LogHandler.createLog((Id) null,'sendEmailAutomation.execute() Queueable Class','Document Id- '+ documentRecordInserted + ' ' + ex.getLineNumber() + ex.getStackTraceString() + ex.getCause(),ex.getMessage(),'Exception');
        }
    }
}