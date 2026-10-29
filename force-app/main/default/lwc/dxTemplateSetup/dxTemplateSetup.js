import { LightningElement, track, wire, api } from 'lwc';
import getDocumentTemplates from '@salesforce/apex/SaveDocumentTemplate.getDocumentTemplates';
import createDocumentTemplate from '@salesforce/apex/SaveDocumentTemplate.createDocumentTemplate';
import getRelatedToTypeOptions from '@salesforce/apex/SaveDocumentTemplate.getRelatedToTypeOptions';
import getAllDocumentTemplatesData from '@salesforce/apex/ImportExportData.getAllDocumentTemplatesData';
import createImportedTemplates from '@salesforce/apex/ImportExportData.createImportedTemplates';
import createImportedTemplateSections from '@salesforce/apex/ImportExportData.createImportedTemplateSections';
import createImportedClauses from '@salesforce/apex/ImportExportData.createImportedClauses';
import createImportedRules from '@salesforce/apex/ImportExportData.createImportedRules';
import createImportedRuleConditions from '@salesforce/apex/ImportExportData.createImportedRuleConditions';
import templateExternalList from '@salesforce/apex/ImportExportData.templateExternalList';
import getWatermarkContent from '@salesforce/apex/ImportExportData.getWatermarkContent';
import createImportedWatermark from '@salesforce/apex/ImportExportData.createImportedWatermark';
import getAllRelatedToTypeOptions from '@salesforce/apex/ImportExportData.getAllRelatedToTypeOptions';

import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAllPopupMessages from '@salesforce/apex/PopUpMessageSelector.getAllConstants';
import saveContentVersion from '@salesforce/apex/DisplayPDFController.saveContentVersion';
import { updateRecord } from 'lightning/uiRecordApi';
import DOCUMENTTEMPLATEID_FIELD from '@salesforce/schema/Document_Template__c.Id';
import WATERMARKDATA_FIELD from '@salesforce/schema/Document_Template__c.Watermark_Data__c';
import { getDomainUrl as getSFDomainBaseURL, getClassNames, getFlowNames } from 'c/dxApexCache';
import { refreshPage } from 'c/dxPageRefresh';
import { copyText } from 'c/dxClipboard';
import createLog from '@salesforce/apex/LogHandler.createLog';

export default class DxTemplateSetup extends LightningElement {
  //variables added by Bhavya for watermark starts here
  step = 1; // progress bar increases with a step value 1
  currentStep = "1"; // It reflects the current (or) active step in the progress bar
  baseURL; // domain base url of the ORG
  imageUrl; // it stores the data of the uploaded image
  importedTemplates;
  _selected = [];
  showTextArea=false;
  exportList;
  showAllTemplates=false;
  showImportTemplates=false;
  showFirstImportScreen=false;
  showDuplicateTemplates=false;
  showTemplateMessage=false;
  showPreviewButton=false;
  allTemplates;
  allRelatedTypeOptions;
  templatesOptions=[];
  previewLabel='Show Preview';
  createDisabledButton=true;
  showDuplicate=false;
  errorMessage='';
  @track jsonData;
  @track isSaved = true;

  @track activeTab =''; // It stores the active tab value
  @track outerContainer = ''; //The styling of the container which holds the canvas
  @track watermarkText  = ''; // The input text value with which text watermark is being created
  @track showwatermarkbtn = false; // This variable controls the display of the Watermark Popup in HTML
  @track fontSizeValue  =  '22'; // Default Font Size = 22
  @track rotationValue = '0'; // Default Text Rotation Value = 0
  @track rotationImagevalue = '0'; // Default Image Rotation Value = 0
  previousRotationValue = '0'; // This variable stores the previous text rotation value, used for comparing with the current userinput text rotation value
  previousImgRotationValue = '0'; // This variable stores the previous image rotation value, used for comparing with the current userinput image rotation value
  @track colorValue = '#000000'; // Default watermark text color #000000
  @track opacityImageValue = '1.0'; // Default Image Opacity = 1
  @track checkedValText = true; // Default text watermark checkbox (isPrimary) is checked, true
  @track checkedValImage = false; // Default Image watermark checkbox (isPrimary) is unchecked, false
  @track imageScalingValue = 100; // Default Image scaling = 100
  @track opacityValue = '1.0'; // Default text Opacity = 1
  @track pageTextOption = 'All Pages - Text'; // Default text page Option for watermark is selected as "ALL PAGES"
  @track pageImageOption = 'All Pages - Image'; // Default Image page Option for watermark is selected as "ALL PAGES"
  baseDataLst = []; //stores the base 64 data of the images
  pageSettings = {"footerJSONVal":{"footer_right":"div.footer_right {             position:running(footer_right);             top: 0;             left: 0;             padding-bottom: 0px;            padding-left: 0px;            padding-right: 0px;            padding-top: 0px;            maring-left: 0px;            margin-right: 0px;            margin-top: 0px;            margin-bottom: 0px;            width: 100%;             border-top: 1px solid #000000;          }","footer_center":"div.footer_center {             position:running(footer_center);             top: 0;             left: 0;             padding-bottom: 0px;            padding-left: 0px;            padding-right: 0px;            padding-top: 0px;            maring-left: 0px;            margin-right: 0px;            margin-top: 0px;            margin-bottom: 0px;            width: 100%;             border-top: 1px solid #000000;          }","footer_left":"div.footer_left {             position:running(footer_left);             top: 0;             left: 0;             padding-bottom: 0px;            padding-left: 0px;            padding-right: 0px;            padding-top: 0px;            maring-left: 0px;            margin-right: 0px;            margin-top: 0px;            margin-bottom: 0px;            width: 100%;            border-top: 1px solid #000000;            }"},"headerJSONVal":{"header_right":"div.header_right { position: running(header_right); top: 0; left: 0; padding-bottom: 0px; padding-top: 50px; padding-right: 70px; padding-left: 100px; margin-bottom: 0px; margin-right: 0px; margin-left: 0px; margin-top: 0px; width: 100%; border-bottom:1px solid #000000; background-color:#FFFFFF; }","header_left":"div.header_left { position: running(header_left); top: 0; left: 0; padding-bottom: 0px; padding-top: 50px; padding-right: 70px; padding-left: 100px; margin-bottom: 0px; margin-right: 0px; margin-left: 0px; margin-top: 0px; width: 100%; border-bottom:1px solid #000000; background-color:#FFFFFF; }","header_center":"div.header_center { position: running(header_center); top: 0; left: 0; padding-bottom: 0px; padding-top: 50px; padding-right: 70px; padding-left: 100px; margin-bottom: 0px; margin-right: 0px; margin-left: 0px; margin-top: 0px; width: 100%; border-bottom:1px solid #000000; background-color:#FFFFFF; }","header_right_landscape":"div.header_right { position: running(header_right); top: 0; left: 0; padding-bottom: 0px; padding-top: 50px; padding-right: 70px; padding-left: 100px; margin-bottom: 0px; margin-right: 0px; margin-left: 0px; margin-top: 0px; width: 100%; border-bottom:1px solid #000000; background-color:#FFFFFF; }","header_center_landscape":"div.header_center { position: running(header_center); top: 0; left: 0; width: 100%; border-bottom:1px solid #000000; padding-bottom: 0px; padding-top: 50px; padding-right: 70px; padding-left: 100px; margin-bottom: 0px; margin-right: 0px; margin-left: 0px; margin-top: 0px; background-color:#FFFFFF; }","header_left_landscape":"div.header_left { position: running(header_left); top: 0; left: 0; width: 100%; border-bottom:1px solid #000000; padding-bottom: 0px; padding-top: 50px; padding-right: 70px; padding-left: 100px; margin-bottom: 0px; margin-right: 0px; margin-left: 0px; margin-top: 0px; background-color:#FFFFFF; }","first_header_right_landscape":"div.first_header_right { position: running(first_header_right); top: 0; left: 0; width: 100%; border-bottom:1px solid #000000; padding-bottom: 0px; padding-left: 0px; padding-right: 0px; padding-top: 0px; margin-bottom: 0px; margin-right: 0px; margin-left: 0px; margin-top: 0px; background-color:#000000; }","first_header_center_landscape":"div.first_header_center { position: running(first_header_center); top: 0; left: 0; width: 100%; border-bottom:1px solid #000000; padding-bottom: 0px; padding-left: 0px; padding-right: 0px; padding-top: 0px; margin-bottom: 0px; margin-right: 0px; margin-left: 0px; margin-top: 0px; background-color:#000000; }","first_header_left_landscape":"div.first_header_left { position: running(first_header_left); top: 0; left: 0; width: 100%; border-bottom:1px solid #000000; padding-bottom: 0px; padding-left: 0px; padding-right: 0px; padding-top: 0px; margin-bottom: 0px; margin-right: 0px; margin-left: 0px; margin-top: 0px; background-color:#000000; }","first_header_right":"div.first_header_right { position: running(first_header_right); top: 0; left: 0; width: 100%; border-bottom:1px solid #000000; padding-bottom: 0px; padding-left: 0px; padding-right: 0px; padding-top: 0px; margin-bottom: 0px; margin-right: 0px; margin-left: 0px; margin-top: 0px; background-color:#000000; }","first_header_center":"div.first_header_center { position: running(first_header_center); top: 0; left: 0; width: 100%; border-bottom:1px solid #000000; padding-bottom: 0px; padding-left: 0px; padding-right: 0px; padding-top: 0px; margin-bottom: 0px; margin-right: 0px; margin-left: 0px; margin-top: 0px; background-color:#000000; }","first_header_left":"div.first_header_left { position: running(first_header_left); top: 0; left: 0; width: 100%; border-bottom:1px solid #000000; padding-bottom: 0px; padding-left: 0px; padding-right: 0px; padding-top: 0px; margin-bottom: 0px; margin-right: 0px; margin-left: 0px; margin-top: 0px; background-color:#000000; }"},"pagePropCSS":{"defaultPageCSS":"@page {            size: A4;             margin-left: 0px;             margin-right: 0px;              margin-top: 90px;             margin-bottom: 80px;            <apex:outputText rendered=\"{!if(headersectionsCount== 1,true,false)}\">                @top-left { content:element(header_left);  width:100%;}            </apex:outputText>            <apex:outputText rendered=\"{!if(headersectionsCount== 2,true,false)}\">                @top-left { content:element(header_left);width:50%;}                @top-right { content:element(header_center);width:50%;}            </apex:outputText>            <apex:outputText rendered=\"{!if(headersectionsCount== 3,true,false)}\">                @top-left { content:element(header_left);}                @top-center { content:element(header_center);}                @top-right { content:element(header_right);}            </apex:outputText>            <apex:outputText rendered=\"{!if(footersectionsCount== 1,true,false)}\">                @bottom-left { content:element(footer_left); width:100%; }            </apex:outputText>            <apex:outputText rendered=\"{!if(footersectionsCount== 2,true,false)}\">                @bottom-left { content:element(footer_left); width:50%;}                @bottom-right { content:element(footer_center);width:50%; }            </apex:outputText>            <apex:outputText rendered=\"{!if(footersectionsCount== 3,true,false)}\">                @bottom-left { content:element(footer_left);}                @bottom-center { content:element(footer_center);}                @bottom-right { content:element(footer_right);}            </apex:outputText>                 }"},"footerProperties":{"separateBorders":[],"borderWeight":"1px","borderOpacity":1,"borderColor":{"value":"#FFFFFF"},"lineHeight":15,"paddingbottom":"0px","paddingtop":"0px","paddingright":"0px","paddingleft":"0px","marginbottom":"0px","margintop":"0px","marginright":"0px","marginleft":"0px","height":"80px"},"headerProperties":{"normalHeaders":{"bgColor":"#FFFFFF","borderBottom":"1px solid [object Object]","separateBorders":[],"borderWeight":"1px","borderOpacity":"1","borderColor":{"value":"#FFFFFF"},"lineHeight":"1px","paddingbottom":"0px","paddingtop":"0px","paddingright":"0px","paddingleft":"0px","marginbottom":"0px","margintop":"0px","marginright":"0px","marginleft":"0px","height":"100px"},"firstPageHeaders":{"bgColor":"#000000","borderBottom":"1px solid [object Object]","separateBorders":[],"borderWeight":"1px","borderOpacity":"1","borderColor":{"value":"#000000"},"lineHeight":"1px","paddingbottom":"0px","paddingtop":"0px","paddingright":"0px","paddingleft":"0px","marginbottom":"0px","margintop":"0px","marginright":"0px","marginleft":"0px","height":"100px"}},"pageMargins":{"line-height":"1.2px","margin-bottom":"80px","margin-top":"0px","margin-right":"0px","margin-left":"0px"}};

  //watermarkPageOptionsText combobox options for Text Watermark
  watermarkPageOptionsText = [
        { label: 'All Pages', value: 'All Pages - Text', checked : true },
        { label: 'All Pages Except First Page', value: 'All Pages Except First Page - Text' , checked : false},
    ];
  //watermarkPageOptionsImage combobox options for Image Watermark
  watermarkPageOptionsImage = [
        { label: 'All Pages', value: 'All Pages - Image' , checked : true},
        { label: 'All Pages Except First Page', value: 'All Pages Except First Page - Image', checked : false },
    ];
  //fontSizeOptions combobox options for Text Watermark
 get fontSizeOptions() {
    const options = [];
    for (let i = 8; i <= 28; i += 2) {
        options.push({
            label: i.toString(),
            value: i.toString()
        });
    }
    return options;
}
  //opacityOptions combobox options for both Text & Image Watermark
    get opacityOptions() {
        const options = [];
        for (let i = 1; i >= 0; i -= 0.1) {
            options.push({
                label: i.toFixed(1),
                value: i.toFixed(1)
            });
        }
        return options;
    }

    //Variables added for watermark by Bhavya ends here 
    @api relatedTypeOptions = []; // This variable holds the picklist options of related to Type field on Document_Template__c object
    @api templateRelatedTo // variable stores the selected Related to Type option

    @track docGridData = []; // stores the information about the newly being created document template
    @track selectedDocumentId; // stores the ID of the template selected

    allDocumentTemplates = []; // stores the data of all document templates available
    showAddNewTemplate = false; // shows/hides the Template Creation screen
    popUpMessage; //stores the popupmessages information that is used for displaying toast messages
    relatedtoTypeObj; // stores the SObject name to which the template is related to
    relatedToTypeBeforeSave; // stores the related to type information before saving the template
    documentsExist = false; // sets if the document template is created this information or not for that related to type 
    // variables added by reethika regarding dynamic flow or class selection
    @track classTypeOptions;
    @track flowTypeOptions;
    classname;
    flowname;
    @track isBundled=false;
    //variables added by reethika regarding dynamic flow or class selection ends here

    @wire(getAllPopupMessages)
    allConstants({ error, data }) {
        if (data) {
            this.popUpMessage = data;
            console.log('Success');
        } else {
            this.error = error;
        }
    }

    connectedCallback() {
        getSFDomainBaseURL()
        .then(result => {
                        this.baseURL = result;
        })
        .catch(error => {
            console.log('error while retrieving the org base URL --- > ', error);
        })
        this.documentsExist = false;
        this.docGridData = [];
        this.getRelatedToTypeOptionValues();
        this.getDocumentTemplatesMethod();
        /**
      * @description this getClassNames function is used to fetch
      * all interface implemented classess
      * Author : Reethika
      */
        getClassNames()
            .then(result => {
                if (result != null) {
                    let options = [];
                    for (var key in result) {
                        options.push({ label: result[key], value: key });
                    }
                    this.classTypeOptions = options;
                }
            })
            .catch(error => {
                console.log('error', error);
            })
            /**
      * @description this getFlowNames function is used to fetch
      * all autolaunched flows.
      * Author : Reethika
      */
        getFlowNames()
            .then(result => {
                if (result != null) {
                    let options = [];
                    for (var key in result) {
                        options.push({ label: result[key], value: key });
                    }
                    this.flowTypeOptions = options;
                }
            })
            .catch(error => {
                console.log('error', error);
            })
    }

    /**
    * Method to retrieve the related to type options from the document template - related to type field
    */ 
   getRelatedToTypeOptionValues()  {
        getRelatedToTypeOptions()
            .then(data => {
                if (data && data.length > 0) {
                    let optionList = [];
                    data.forEach(option => {
                        optionList.push({'label':option.DxCPQ__Related_To_Type__c,'value':option.DxCPQ__Related_To_Type__c});
                    })
                    optionList.unshift({ 'label': 'All Templates','value': 'ALL'});
                    this.relatedTypeOptions = optionList ;
                   // alert('relatedTypeOptions >> ', this.relatedTypeOptions);
                }
            })
            .catch(error => {
                console.log('Error -> relatedToTypeOptions' + JSON.stringify(error));
            })

    }

    /**
    * Method to retrieve the document templates on a particular related-to-type and stoes the data in the variable allDocumentTemplates. 
    */
    getDocumentTemplatesMethod() {
        getDocumentTemplates({ filterValue: this.templateRelatedTo })
        .then(data => {
            if (data && data.length > 0) {
                this.allDocumentTemplates = data;
                data.forEach(docTemp => {
                    this.docGridData.push({ label: docTemp.Name + ' - v' + docTemp.DxCPQ__Version_Number__c, Name: docTemp.Id, sObjectName: docTemp.DxCPQ__Related_To_Type__c });
                });
                this.selectedDocumentId = this.docGridData[0].Name;
                this.relatedtoTypeObj = this.docGridData[0].sObjectName;
                this.showAddNewTemplate = true;
                this.showwatermarkbtn = false;
                this.showUpdatedTemplate = true;
                this.documentsExist = true;
                // if (this.templateRelatedTo != null) {
                    const tempEvent = {'detail':{'row':{'Name':this.selectedDocumentId}}};
                    this.handleTemplateSelection(tempEvent);
                // }
            }
        })
        .catch(error => {
            console.log('error' + error);
        })
    }

    /**
    * Method to display the document templates that have the selected related-to-type 
    * @param {Object} event
    */
    handleFilterSelection(event) {
        this.templateRelatedTo = event.detail.value == 'ALL' ? '' : event.detail.value;
        this.connectedCallback();
    }

    /**
    * Method to display the selected template on the UI
    * @param {Object} event
    */
    handleTemplateSelection(event) {
        this.showUpdatedTemplate = false;
        this.selectedDocumentId = event.detail.row.Name;
        let templateRecord;
        this.allDocumentTemplates.forEach(temp => {
            if (temp.Id == this.selectedDocumentId) {
                templateRecord = temp;
            }
        })
        this.showUpdatedTemplate = true;
        this.template.querySelector('c-template-designer-c-m-p').resetallvaluesonAllcmp();
        this.template.querySelector('c-template-designer-c-m-p').handleConnectedCallback(templateRecord);
        this.template.querySelector('c-template-designer-c-m-p').passingObject(this.relatedtoTypeObj);
    }

    /**
    * Method to push the created document onto menu setup and create a new interface to create Sections
    * @param {Object} event
    */
    handleNewTemplateCreation(event) {
        this.selectedDocumentId = event.detail.id;
        let templateName = event.detail.name;
        this.relatedtoTypeObj = event.detail.templateObjName;
        this.allDocumentTemplates.splice(0, 0, event.detail.templateObj);
        this.documentsExist = false;
        this.docGridData.splice(0, 0, { label: templateName + ' - v' + event.detail.templateObj.DxCPQ__Version_Number__c, Name: this.selectedDocumentId, sObjectName: this.relatedtoTypeObj });
        this.template.querySelector('c-menu-setup').passOn(this.docGridData);
        this.documentsExist = true;
        this.template.querySelector('c-template-designer-c-m-p').resetallvaluesonAllcmp();
        this.template.querySelector('c-template-designer-c-m-p').handleConnectedCallback(event.detail.templateObj);
    }

    /**
    * Method to push the created document onto menu setup and create a new interface to create Sections, it is called from handleCreateSubmit function while saving the document template
    * @param {Object} event
    */
    handleNewTemplateCreationwithoutEvent(docid, docname, docObj, docrecord) {
        this.selectedDocumentId = docid;
        this.relatedtoTypeObj = docObj;
        let templateName = docname;
        this.allDocumentTemplates.splice(0, 0, docrecord);
        this.documentsExist = false;
        this.docGridData.splice(0, 0, { label: templateName + ' - v' + docrecord.DxCPQ__Version_Number__c, Name: this.selectedDocumentId, sObjectName: this.relatedtoTypeObj });
        this.template.querySelector('c-menu-setup').passOn(this.docGridData);
        this.documentsExist = true;
        this.template.querySelector('c-template-designer-c-m-p').resetallvaluesonAllcmp();
        this.template.querySelector('c-template-designer-c-m-p').handleConnectedCallback(docrecord);
    }

    /**
    * Method to delete a template and update the data in menu setup
    * @param {Object} event
    */
    deleteTemplateHandler(event) {
        let delTempId = event.detail.id;
        for (let i = 0; i < this.docGridData.length; i++) {
            if (this.docGridData[i].Name == delTempId) {
                this.docGridData.splice(i, 1);
            }
        }

        for (let i = 0; i < this.allDocumentTemplates.length; i++) {
            if (this.allDocumentTemplates[i].Id == delTempId) {
                this.allDocumentTemplates.splice(i, 1);
            }
        }

        this.template.querySelector('c-menu-setup').passOn(this.docGridData);
        this.selectedDocumentId = this.docGridData[0].Name;
        this.template.querySelector('c-template-designer-c-m-p').resetallvaluesonAllcmp();
        this.template.querySelector('c-template-designer-c-m-p').handleConnectedCallback(this.allDocumentTemplates[0]);
    }

    /**
    * Method to edit a template and update the data in menu setup
    * @param {Object} event
    */
    editTemplateHandler(event) {
        let editTempId = event.detail.id;
        let editTempName = event.detail.name;
        this.allDocumentTemplates.forEach(temp => {
            if (temp.Id == event.detail.Id) {
                temp = event.detail.templateObj;
            }
        })
        for (let i = 0; i < this.docGridData.length; i++) {
            if (this.docGridData[i].Name == editTempId) {
                this.docGridData[i].label = editTempName + ' - v' + event.detail.version;
            }
        }
        this.template.querySelector('c-menu-setup').passOn(this.docGridData);
    }

    /**
    * Method to show the new template creation screen on the UI
    * @param {Object} event
    */
    handleNewTemplateCreationscreen(event) {
        var createdoccheck = event.detail.newtemplatecreation;
        if (createdoccheck == true) {
            this.showAddNewTemplate = true;
            this.classname = [];
            this.flowname = [];
            this.showwatermarkbtn = false;
            this.template.querySelector('c-modal').show();
        } else {
            console.log('ELSE handleNewTemplateCreationscreen');
        }
    }

    /**
    * Method to store the related to type value in relatedToTypeBeforeSave variable that was selected by the user
    * @param {Object} event
    */
    handleRelatedToTypeChange(event) {
        this.relatedToTypeBeforeSave = event.target.value;
    }

    /**
    * Method to save the Document Template in backend with the user given inputs
    * Also the newly created document template data is passed to Menu Setup to update the list
    * The designer component is also triggered to show the interface to create sections
    * @param {Object} event
    */
    handleCreateSubmit(event) {
        event.preventDefault();
        let docTempObj = { 'sobjectType': 'Document_Template__c' };
        const fields = event.detail.fields;
        docTempObj.Name = fields.Name;
        docTempObj.DxCPQ__IsActive__c = fields.DxCPQ__IsActive__c;
        docTempObj.DxCPQ__Related_To_Type__c = fields.DxCPQ__Related_To_Type__c;
        docTempObj.DxCPQ__Description__c = fields.DxCPQ__Description__c;
        docTempObj.DxCPQ__Version_Number__c = fields.DxCPQ__Version_Number__c;
        docTempObj.DxCPQ__PDF_Page_Properties__c =  JSON.stringify(this.pageSettings);
        // Changes made by Reethika - < Assigning classId and FlowId to docTempObj >
        if (this.classname.length != 0) {
            docTempObj.DxCPQ__ClassId__c = this.classname[0];
        }
        if (this.flowname.length != 0) {
            docTempObj.DxCPQ__FlowId__c = this.flowname[0];
        }
        this.relatedtoTypeObj = this.relatedToTypeBeforeSave;

        createDocumentTemplate({ docTemp: docTempObj }).then(result => {
            if (result) {
                this.templateId = result.DxCPQ__Parent_Template__c;
                this.handleNewTemplateCreationwithoutEvent(result.Id, result.Name, result.DxCPQ__Related_To_Type__c, result);
                if (this.relatedtoTypeObj != null || this.relatedtoTypeObj != undefined) {
                    this.showUpdatedTemplate = true;
                    //this.template.querySelector('c-template-designer-c-m-p').resetallvaluesonAllcmp();
                    this.template.querySelector('c-template-designer-c-m-p').passingObject(this.relatedtoTypeObj);
                    this.showAddNewTemplate = false;
                }
                else {
                    console.log("Error occured in template loading");
                }
                const toastEvt = new ShowToastEvent({
                    title: 'Success!',
                    message: 'Template "' + docTempObj.Name + '" was Created',//this.popUpMessage.DXTEMPLATESETUP_CREATED,//'Created Successfully',
                    variant: 'Success',
                });
                this.dispatchEvent(toastEvt);
                this.showAddNewTemplate = false;
                this.showwatermarkbtn = true;
                this.step = 2;
                this.currentStep = "" + this.step;
                this.isBundled=false;
            }
        }).catch(error => {
            let tempError = error.toString();
            let errorMessage = error.message || 'Unknown error message';
            createLog({recordId:'', className:'templateSetup LWC Component - handleCreateSubmit()', exceptionMessage:errorMessage, logData:tempError, logType:'Exception'});
        })
    }

    //code added by Bhavya for Watermark
    /**
    * Method to store the user inputs for different inputs used for creating a watermark on Canvas
    * This method is used storing the variable related to both Text and Image Watermarks
    * Based on the user inputs and the activeTab value the respective draw on canvas methods are called to create a image watermark for the user given inputs
    * @param {Object} event
    */
      handleWatermarkChange(event) {
        const fieldName = event.target.dataset.label;
        const value = event.target.value;

        const fieldMap = {
            watermarkText: 'watermarkText',
            color: 'colorValue',
            fontSize: 'fontSizeValue',
            alignment: 'alignmentValue',
            direction: 'directionValue',
            rotation: 'rotationValue',
            opacity: 'opacityValue',
            autofit:'autofit',
            imagescaling:'imageScalingValue',
            textPrimary:"checkedValText",
            imagePrimary:"checkedValImage",
            opacityImage:"opacityImageValue"
        };

        if(fieldMap[fieldName]) {
            this[fieldMap[fieldName]] = value;
        }
                if(this.activeTab == 'Text'){
          this.generateCanvas();
        }
        else{
          this.drawOnCanvas(this.imageUrl);
        }
   }
    /**
    * Method to store the clicked tab name in the variable called "activeTab"
    * @param {Object} event
    */
    handleTabChange(event) {
        this.activeTab = event.currentTarget.dataset.name;
            }

    /**
    * Method to create the image of the text watermark for the given user inputs
    * @param {Object} event
    */
    generateCanvas() {
try{
      const canvas = this.template.querySelector('.canvasText');
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (this.rotationValue !== this.previousRotationValue) {
          context.translate(canvas.width / 2, canvas.height / 2);
          context.rotate((this.rotationValue - this.previousRotationValue )* Math.PI / 180);            
          context.translate(-canvas.width / 2, -canvas.height / 2);
          this.previousRotationValue = this.rotationValue;
      }
      context.globalAlpha = this.opacityValue;
      context.font = this.fontSizeValue + 'px Arial';
      let textWidth = context.measureText(this.watermarkText).width;
      context.fillStyle = this.colorValue;
      context.fillText(this.watermarkText, (canvas.width/2 - textWidth/2), canvas.height / 2);
}
        catch(error){
            console.log('error while getting canvas line 401 templateSetup --> ', error);
        }
    }
    
    /**
    * Method to handle rotation values for Text and Image Watermarks seperately
    * Once the rotation values are captured then the respective canvas drawing methods are called to update the final output for the captured rotation values
    * @param {Object} event
    */
    handleRotationChange(event){
            let slectedRotation = event.currentTarget.dataset.type;
      if(slectedRotation == 'Text'){
        this.rotationValue = event.target.value;
        this.outerContainer = `transform: rotate(${this.rotationValue}deg);`;
        this.generateCanvas();
      }
      else if(slectedRotation == 'Image'){
        this.rotationImagevalue = event.target.value;
        this.outerContainer = `transform: rotate(${this.rotationImagevalue}deg);`;
        this.drawOnCanvas(this.imageUrl);
      } 
    }

    /**
    * Method to save the created Text & Image watermarks for the user given inputs
    * Once the images drawn in both cases - text & image are saved then their contentversion IDs are captured and using the updateRecord the Watermark_Data__c field on Document_Template__c object is updated based on the selected ID
    */

    handleWaterMarkSave(){
        try{
            let canvasText = this.template.querySelector('.canvasText');
            if(canvasText && this.watermarkText !== ''){
                let dataURLText = canvasText.toDataURL();
                this.baseDataLst.push({ 'text': dataURLText.split(',')[1], title:'Text' });
            }
            let canvasImage = this.template.querySelector('.canvasImage');
            if(canvasImage && this.imageUrl){
                let dataURLImage = canvasImage.toDataURL();
                this.baseDataLst.push({ 'Image': dataURLImage.split(',')[1], title:'Image' });
            }
        }
        catch(error){
            console.log('error while getting canvas line 432 templateSetup --> ', error);
        }
        if(this.baseDataLst.length > 0){
            saveContentVersion({ title: "WatermarkImage", base64DataList: this.baseDataLst, templateId: this.documenttemplaterecordid, wtImage : true })
            .then(result => {
                const fields ={};
                let watermarkText = (result.filter(obj => Object.keys(obj).some(key => key.includes('Text'))) || [])[0];
                let watermarkImage = (result.filter(obj => Object.keys(obj).some(key => key.includes('Image'))) || [])[0];
                watermarkText = watermarkText ? watermarkText[Object.keys(watermarkText)[0]] : null;
                watermarkImage = watermarkImage? watermarkImage[Object.keys(watermarkImage)[0]] : null;
                let wtOriginalImage = (result.filter(obj => Object.keys(obj).some(key => key.includes('OriginalImg'))) || [])[0];
                wtOriginalImage = wtOriginalImage ? wtOriginalImage[Object.keys(wtOriginalImage)[0]] : null;
                this.originalImageCvId = wtOriginalImage? wtOriginalImage : this.prevoriginalImageCvId;
                const watermarkImageIdText = {
                    name: 'Text',
                    isPrimary: this.checkedValText,
                    contentVersionID: watermarkText,
                    pageOption: this.pageTextOption,
                    fontsize: this.fontSizeValue,
                    opacity: this.opacityValue,
                    color: this.colorValue,
                    rotation: this.rotationValue,
                    textVal: this.watermarkText,
                    pageTextOption: this.pageTextOption
                };

                const watermarkImageIdImage = {
                    name: 'Image',
                    isPrimary: this.checkedValImage,
                    contentVersionID: watermarkImage,
                    pageOption: this.pageImageOption,
                    opacity: this.opacityImageValue,
                    rotation: this.rotationImagevalue,
                    pageImageOption: this.pageImageOption,
                    imageScale: this.imageScalingValue,
                    originalImageCVId : this.originalImageCvId
                };
                fields[DOCUMENTTEMPLATEID_FIELD.fieldApiName] = this.templateId;
                let jsonDataLst = [watermarkImageIdText, watermarkImageIdImage];
                fields[WATERMARKDATA_FIELD.fieldApiName] = JSON.stringify(jsonDataLst);
                const recordInput = { fields };
                updateRecord(recordInput)
                    .then(() => {
                        const toastEvt = new ShowToastEvent({
                            title: 'Success!',
                            message: 'Watermark saved successfully',
                            variant: 'Success',
                        });
                        this.dispatchEvent(toastEvt);
                        this.showwatermarkbtn = false;
                        this.template.querySelector('c-modal').hide();
                        this.resetWatermarkValues();
                        this.baseDataLst = [];
                        this.imageUrl = '';
                    })
                    .catch(error => {
                        const toastEvt = new ShowToastEvent({
                            title: 'Error!',
                            message: 'Cannot save watermark Image',
                            variant: 'error',
                        });
                        this.dispatchEvent(toastEvt);
                        this.showwatermarkbtn = false;
                        this.template.querySelector('c-modal').hide();
                    });
            })
            .catch(error => {
                console.error('Error saving file:', error);
            });
        }
        else{
            this.showwatermarkbtn = false;
            this.template.querySelector('c-modal').hide();
            this.resetWatermarkValues();
            this.baseDataLst = [];
            this.imageUrl = '';
        }
    }

    /**
    * Method to hide the Watermark Screen from UI
    */
    handleWaterMarkCancel(){
        this.showwatermarkbtn = false;
        this.template.querySelector('c-modal').hide();
        this.resetImageWatermarkFields();
        this.resetWatermarkValues();
    }

    /**
    * Method to catch the data of the uploaded image files 
    * @param {Object} event
    */
    handleUploadFinished(event) {
        const file = event.target.files[0];
        this.resetImageWatermarkFields();
        const reader = new FileReader();
        reader.onload = () => {
            this.imageUrl = reader.result;
            try{
                this.drawOnCanvas(this.imageUrl).then(() => {
                this.baseDataLst = [];
                let canvasImage = this.template.querySelector('.canvasImage');
                if (canvasImage && this.imageUrl) {
                    let dataURLImage = canvasImage.toDataURL();
                    this.baseDataLst.push({ 'OriginalImg': dataURLImage.split(',')[1], title:'OriginalImg' });
                }
            });
        }
        catch(error){
            console.log(error);
        }
        };
        reader.readAsDataURL(file);
    }
    /**
    * Method to create the image of the Image watermark for the given user inputs
    * @param {Object} imageUrl
    */
    drawOnCanvas(imageUrl) {
        return new Promise((resolve, reject) => {
            const canvas = this.template.querySelector('.canvasImage');
            const ctx = canvas.getContext('2d');
            const image = new Image();
            image.src = imageUrl;
            image.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height); 
                if (this.rotationImagevalue !== this.previousImgRotationValue) {
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.rotate((this.rotationImagevalue - this.previousImgRotationValue )* Math.PI / 180);            
                    ctx.translate(-canvas.width / 2, -canvas.height / 2);
                    this.previousImgRotationValue =  this.rotationImagevalue;
                }
                ctx.globalAlpha = this.opacityImageValue;
                let imgwidth =  this.imageScalingValue == 0 ? image.width : image.width * (this.imageScalingValue / 100);
                let imgheight = this.imageScalingValue == 0 ? image.height : image.height * (this.imageScalingValue / 100);
                ctx.drawImage(image, (canvas.width-imgwidth)/2, (canvas.height-imgheight)/2, this.imageScalingValue == 0 ? image.width : image.width * (this.imageScalingValue / 100), this.imageScalingValue == 0 ? image.height : image.height * (this.imageScalingValue / 100));        
                resolve();       
            };
        });
    }

    /**
    * Method to store the Watermark Page Option i.e., on what pages the watermark should be visible is handled with the following method
    * @param {Object} event
    */
    handleWatermarkPageChange(event) {
        if (this.activeTab === "Text") {
            this.pageTextOption = event.target.value;
            this.updateCheckedValue(this.pageTextOption, this.watermarkPageOptionsText);
        } else if (this.activeTab === "Image") {
            this.pageImageOption = event.target.value;
            this.updateCheckedValue(this.pageImageOption, this.watermarkPageOptionsImage);
        }
    }

    /**
    * Method to store the information about which type of watermark should be used for displaying on the final PDF
    * By Default, the text watermark is made primary with option show on "All Pages"
    * @param {Object} event
    */
    handleWatermarkPrimary(event) {
        const isChecked = event.target.checked;
        if (this.activeTab === "Text") {
            this.checkedValText = isChecked;
            this.checkedValImage = !this.checkedValText;
        } else if (this.activeTab === "Image") {
            this.checkedValImage = isChecked;
            this.checkedValText = !this.checkedValImage;
        }
    }

    resetImageWatermarkFields(){
        this.rotationImagevalue = '0';
        this.imageScalingValue = '100';
        this.opacityImageValue = '1.0';
    }

    /* Import Export Functionality*/

    //Export button clicked. Fetches all relevent data and displays a pop up
    exportTemplate(){
        this.showAllTemplates=true;
        this.showAddNewTemplate=false;
        getAllDocumentTemplatesData()
        .then(data => {
            let exportTemplateData = JSON.parse(data);
            //console.log('exportTemplate', exportTemplateData);
            this.allTemplates= exportTemplateData;
            this.templatesOptions = exportTemplateData.Templates.map(exportTemplatelst => ({
                label: exportTemplatelst.Name + ' - v'+ exportTemplatelst.DxCPQ__Version_Number__c,
                value: exportTemplatelst.Id
            }));
        })
        .catch(error => {
            console.log('Error -> exportTemplate' + error);
        })
        this.template.querySelector('c-modal').show();
    }

    //Import button clicked. Displays a pop up
    importTemplate(){
        this.showImportTemplates=true;
        this.showAddNewTemplate=false;
        this.showFirstImportScreen=true;
        getAllRelatedToTypeOptions()
        .then(data => {
            this.allRelatedTypeOptions = data;
            //console.log('exportTemplate', data);
        })
        .catch(error => {
            //console.log('Error -> exportTemplate ' + error);
        })
        this.template.querySelector('c-modal').show();
    }

    //File uploaded for importing
    handleJSONUpload(event){
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const jsonContent = JSON.parse(reader.result);
                this.jsonData = JSON.stringify(jsonContent, null, 4);
                this.createDisabledButton=false;
            } catch (error) {
                console.error('Error parsing JSON file:', error);
            }
        };
        reader.readAsText(file);
    }

    //Handles the json data pasted in text area
    pastedjson(event){
        let pasteddata = event.target.value;
        this.jsonData = pasteddata;
        this.createDisabledButton=this.jsonData !="" ? false : true;
    }

    //Checks if there are valid related to type in the json
    checkValidRelatedType() {
        const checkRelatedTypeJSON = JSON.parse(this.jsonData);
        const hasInvalidType = checkRelatedTypeJSON.Templates.some(item => {
            const isValid = this.allRelatedTypeOptions.some(option => {
                return option.value === item.DxCPQ__Related_To_Type__c;
            })
            if (!isValid) {
                this.errorMessage = `${item.Name} has the "Related to Type" value - ${item.DxCPQ__Related_To_Type__c}. Please check if the value has been added in the picklist options.`;
                return true;
            }
            return false;
        });
        return !hasInvalidType;
    }

    //Checks if user pasted/inserted valid JSON data. We cant predict what the user can do ._.
    checkJsonInput(){
        try {
            let checkJSON = JSON.parse(this.jsonData);
            if (checkJSON && typeof checkJSON === "object" && checkJSON.Templates){ 
                return checkJSON;
            }
            else{
                this.errorMessage = 'Data is not in JSON format or does not contain Templates. Please check the data and try again';
                return null;
            }
        } catch (e) {
            this.errorMessage = 'Data is not in JSON format. Please try again';
            return null;
        }
    }

    //Checks if duplicate template records are being uploaded
    checkForDuplicate() {
        let importedRecords  = this.checkJsonInput();
        if (!importedRecords) return;
        let validTypes = this.checkValidRelatedType();
        if (!validTypes) return;
        return templateExternalList()
        .then(data => {
            this.showDuplicate = data.some(item => {
                let exterID = item.ExternalId;
                if (!exterID) {
                    return false;
                }
                return importedRecords.Templates.some(importTemplates => {
                    return importTemplates.DxCPQ__External_ID__c === exterID;
                });
            });
            return this.showDuplicate;
        })
        .catch(error => {
            console.error('Error:', error);
            return this.showDuplicate;
        });
    }

    //Create button clicked in Import functionality. Parses through the data to assign the related objects with one another
    createTemplateData(){   
        this.showFirstImportScreen=false;
        this.showDuplicateTemplates = true;
        this.currentStep = "2";
        // 1. Check if any uploaded template has already been uploaded
        this.checkForDuplicate()
        .then(()=>{
            if (this.showDuplicate == true){
                this.errorMessage = 'Duplicates found. Please check your file and make sure to upload the correct data'
            }
            else {
                this.errorMessage = 'Creating templates'
                // 2. Duplicate not found so the whole JSON file is checked and IDs for each record is manipulated.
                try{
                    let createImportedRecords = JSON.parse(this.jsonData);
                    createImportedRecords.Templates.forEach(importTemplates => {
                        importTemplates.Id= undefined;
                    });
                    let templatesjson = JSON.stringify(createImportedRecords.Templates);
                    // 3. Templates are created first and then their new ID is inserted into the Doc Temp Section and the Watermark Images
                    createImportedTemplates({tempLst:templatesjson})
                    .then(data=> {
                        data.forEach(item =>{
                            let newTempId= item.Id;
                            let oldTempId= item.ExternalId;
                            // 3.1 Template ID into Doc Temp Section
                            createImportedRecords['Template Sections'].forEach(tempSecItem => {
                                if (tempSecItem.DxCPQ__External_Document_Template__c == oldTempId){
                                    tempSecItem.DxCPQ__Document_Template__c= newTempId;
                                }
                                tempSecItem.Id=undefined;
                            })
                        });
                        let watermarkjson = JSON.stringify(createImportedRecords.Watermark);
                        // 4. Watermarks are created. No data to return so we just wait for this to finish.
                        createImportedWatermark({watermarkLst:watermarkjson})
                        .then(data =>{

                        })
                    })
                    // 5. After templates are created, Rules and Rule Conditions are created
                    .then(()=>{
                        createImportedRecords.Rules.forEach(importRules => {
                            //importRules.DxCPQ__External_Id__c= importRules.Id;
                            importRules.Id= undefined;
                        })
                        let rulesjson = JSON.stringify(createImportedRecords.Rules);
                        createImportedRules({tempRuleLst:rulesjson})
                        .then(data => {
                            data.forEach(item=>{
                                let newTempId = item.Id;
                                let oldTempId= item.ExternalId;
                                createImportedRecords['Template Sections'].forEach(tempSecItem =>{
                                    if(tempSecItem.DxCPQ__External_RuleID__c == oldTempId){
                                        tempSecItem.DxCPQ__RuleId__c = newTempId;
                                    }
                                    else if (tempSecItem.DxCPQ__External_SecVis_Rule_ID__c == oldTempId){
                                        tempSecItem.DxCPQ__Section_Visibility_Rule__c = newTempId;
                                    }
                                })
                                createImportedRecords['Rule Conditions'].forEach(importRuleConds => {
                                    if(importRuleConds.DxCPQ__External_Id__c == oldTempId){
                                        importRuleConds.DxCPQ__Rule__c = newTempId;
                                    }
                                    importRuleConds.Id= undefined;
                                })
                            })
                        })
                        .then(()=>{
                            let ruleConditionjson = JSON.stringify(createImportedRecords['Rule Conditions']);
                            createImportedRuleConditions({tempRuleCondLst:ruleConditionjson});
                            console.log('Rule Condtions Created');
                        })
                    })
                    // 6. Document clauses are created and linked to the necessary Doc Temp Sec
                    .then(()=>{
                        createImportedRecords['Document Clauses'].forEach(importClauses => {
                            importClauses.DxCPQ__External_Id__c= importClauses.Id;
                            //importClauses.DxCPQ__External_ID__c= importClauses.DxCPQ__External_ID__c!=null? importClauses.DxCPQ__External_ID__c : importClauses.Id;
                            importClauses.Id= undefined;
                        })
                        let clausesjson = JSON.stringify(createImportedRecords['Document Clauses']);
                        createImportedClauses({tempClausesLst:clausesjson})
                        .then(data=> {
                            data.forEach(item =>{
                                let newTempId= item.Id;
                                let oldTempId= item.ExternalId;
                                createImportedRecords['Template Sections'].forEach(tempSecItem => {
                                    if (tempSecItem.DxCPQ__Document_Clause__c == oldTempId){
                                        tempSecItem.DxCPQ__Document_Clause__c = newTempId;
                                    }
                                });
                            });
                        })
                        .then(()=>{
                            let templatesectionjson = JSON.stringify(createImportedRecords['Template Sections']);
                            createImportedTemplateSections({tempSecLst:templatesectionjson});
                            console.log('Template Section created!');
                            this.showDuplicateTemplates=false;
                            this.showTemplateMessage=true;
                            this.templateSuccessMessage = 'Templates have been successfully created';
                            this.currentStep="3";
                        })
                    })
                    .catch (error=>{
                        console.error('Error in creating the data- ',error);
                        this.showDuplicateTemplates=false;
                        this.showTemplateMessage=true;
                        this.templateSuccessMessage = 'The template creation process ran into some issue. Please check the data and try again';
                        this.currentStep="3";
                    });
                    // const toastTemplateCreated = new ShowToastEvent({
                    //         title: 'Success!',
                    //         message: 'Template information has been received and will take a while to create. Please refresh the page',//this.popUpMessage.DXTEMPLATESETUP_CREATED,//'Created Successfully',
                    //         variant: 'Success',
                    //     });
                    // this.dispatchEvent(toastTemplateCreated);
                    // this.template.querySelector('c-modal').hide();
                    // this.showImportTemplates=false;
                }
                catch (error){
                    console.error('Error in creating the data- ',error);
                    this.showDuplicateTemplates=false;
                    this.showTemplateMessage=true;
                    this.templateSuccessMessage = 'The template creation process ran into some issue. Please check the data and try again';
                    this.currentStep="3";
                }
            }
        })
        .catch (error=>{
            console.error('Error in creating the data- ',error);
            this.showDuplicateTemplates=false;
            this.showTemplateMessage=true;
            this.templateSuccessMessage = 'The template creation process ran into some issue. Please check the data and try again';
            this.currentStep="3";
        });
    }

    copyJsonData(){
        //navigator.clipboard.writeText(this.exportList)
        copyText(this.exportList);
    }

    refreshPageAfterCreate() {
        refreshPage();
    }

    handleExportTemplateList(event){
        let watermarkTempIds = [];
        this._selected = event.detail.value;
        this.showPreviewButton = this._selected!=0 ? true : false;
        const exportTmpList= JSON.parse(JSON.stringify(this.allTemplates));
        //this.exportList= this.allTemplates;
        exportTmpList.Templates= exportTmpList.Templates.filter(item => this._selected.includes(item.Id));
        exportTmpList['Template Sections']= exportTmpList['Template Sections'].filter(item => this._selected.includes(item.DxCPQ__Document_Template__c));
        //exportTmpList.Rules=exportTmpList.Rules.filter(item=> exportTmpList['Template Sections'].includes(item.Id));
        exportTmpList.Rules = exportTmpList.Rules.filter(rule => {
            return exportTmpList['Template Sections'].some(section => section.DxCPQ__RuleId__c === rule.Id || section.DxCPQ__Section_Visibility_Rule__c === rule.Id);
        });
        exportTmpList['Rule Conditions'] = exportTmpList['Rule Conditions'].filter(ruleCond => {
            return exportTmpList.Rules.some(rule => rule.Id === ruleCond.DxCPQ__Rule__c);
        });
        //exportTmpList['Rule Conditions']=exportTmpList['Rule Conditions'].filter(item=> exportTmpList['Rules'].includes(item.Rule__c));
        exportTmpList.Templates.forEach(tempID=>{
            if (tempID.DxCPQ__Watermark_Data__c !=null){
                watermarkTempIds.push(tempID.Id);
                console.log('watermarkTempIds- '+watermarkTempIds)
            }
        })
        getWatermarkContent({idList:watermarkTempIds})
        .then(data => {
            console.log('Watermark data has been achieved',data);
            exportTmpList.Watermark = data;
            this.exportList= JSON.stringify(exportTmpList,null, 4);
            console.log('The selected templates are- ',this._selected);
        })
        
        //console.log('The json data is', this.exportList);
    }

    //Handling the Show/Hide Preview button in Export
    exportTemplateList(e){
        console.log('The selected templates are- ',this._selected);
        this.previewLabel = this.previewLabel === 'Show Preview' ? 'Hide Preview' : 'Show Preview';
        this.showTextArea = !this.showTextArea;
    }

    // jsonDataAssign(event){
    //     this.jsonData=event.target.value;
    // }

    //Downloads the selected templates data as JSON file
    downloadJson(){
        const element = document.createElement('a');
        const file = new Blob([this.exportList], {type: 'application/json'});
        element.href = URL.createObjectURL(file);
        const currentDate = new Date();
        const day = currentDate.getDate();
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        const formattedDate = `${day}_${month}_${year}`;
        element.download = 'ExportedTemplates_'+formattedDate+'.json';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    /*Import Export Functionality End*/
/**
    * Method to reset the all Watermark fields both Text and Image Watermark
    */
    resetWatermarkValues(){
        this.fontSizeValue = '22';
        this.opacityValue = '1.0';
        this.colorValue = '#000000';
        this.rotationValue = '0';
        this.watermarkText = '';
        this.checkedValText = true;
        this.checkedValImage = false;
        this.pageTextOption = 'All Pages - Text';
        this.imageScalingValue ='100';
        this.opacityImageValue ='1.0';
        this.rotationImagevalue = '0';
        this.pageImageOption = 'All Pages - Image';
        this.previousImgRotationValue = '0';
        this.previousRotationValue = '0';
        this.imageUrl = '';
        this.updateCheckedValue(this.pageTextOption, this.watermarkPageOptionsText);
        this.updateCheckedValue(this.pageImageOption, this.watermarkPageOptionsImage);

    }

    /**
     * Method to update the checked value in the respective lists based on selected values
     * @param optionValue Either pageTextOption/ pageImageOption
     * @param optionsList Either watermarkPageOptionsText/ watermarkPageOptionsImage
     */
    updateCheckedValue(optionValue, optionsList) {
        optionsList = optionsList.map(option => {
            if (option.value === optionValue) {
                return { ...option, checked: true };
            } else {
                return { ...option, checked: false };
            }
        });
        if (optionValue.includes('Text')) {
            this.watermarkPageOptionsText = optionsList;
        } else if (optionValue.includes('Image')) {
            this.watermarkPageOptionsImage = optionsList;
        }
    }

/**
    * Method to clear the watermark fields when the modal is closed
    * @param {Object} event
    */
    handleDialogBoxClosed(event){
        this.previousImgRotationValue = '0';
        this.previousRotationValue = '0';
        this.fontSizeValue = '22';
        this.opacityImageValue = '1.0';
        this.opacityValue = '1.0';
        this.color ='#000000';
        this.rotationValue = '0';
        this.rotationImagevalue = '0';
        this.imageScalingValue = '100';
        this.checkedValText = true;
        this.watermarkText = '';
        this.checkedValImage = false;
        this.showAllTemplates=false;
        this.showImportTemplates=false;
        this.showFirstImportScreen=false;
        this.showDuplicateTemplates=false;
        this.showDuplicate=false;
        this.showTemplateMessage=false;
        this.showPreviewButton=false;
        this.currentStep="1";
        this.exportList='';
        this.showAddNewTemplate=false;
        this.showwatermarkbtn=false;
        this.previewLabel='Show Preview';
        this.showTextArea=false;
        this.jsonData='';
        this.errorMessage='';
        this.createDisabledButton=true;
    }

    /**
     * @description this handleClassselection event is used to get
     * the id of the class selected
     * Author : Reethika
     */
    handleClassselection(event) {
        let val = event.detail.values;
        this.classname = val;
    }

    /**
     * @description this handleFlowselection event is used to get
     * the durableid of the flow selected
     * Author : Reethika
     */
    handleFlowselection(event) {
        let val = event.detail.values;
        this.flowname = val;
    }
    
    /**
     * @description this handleRelationshipType event is used to get
     * whether the flow is selected or class is selected
     * Author : Reethika
     */
    handleRelationshipType(event){
        this.isBundled=event.target.checked;
        this.flowname=[];
        this.classname=[];

    }

    handleAllButtonsClicked(event){
        if (this.isSaved == true){
            if (event.target.dataset.id == 'import'){
                this.importTemplate(event);
            }
            else if (event.target.dataset.id == 'export'){
                this.exportTemplate(event);
            }
        }
        else{
            if (confirm("Changes not saved. Please click Cancel and save the changes or Ok to continue.") == true){
                this.isSaved = true;
                const saveEvent = new CustomEvent('datasaved', {detail: this.isSaved});
                this.dispatchEvent(saveEvent)
                this.handleAllButtonsClicked(event);
            }
        }
    }

    handleDataSaved(event){
        this.isSaved = event.detail;
        if (this.isSaved == false){
            window.addEventListener('beforeunload', this.handleBeforeUnload);
        }
        else {
            window.removeEventListener('beforeunload', this.handleBeforeUnload);
        }
    }
    
    handleBeforeUnload(event) {
    if (!this.isSaved) {
      event.preventDefault();
      event.returnValue = '';
    }
  }
}