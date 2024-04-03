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

import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAllPopupMessages from '@salesforce/apex/PopUpMessageSelector.getAllConstants';
import saveContentVersion from '@salesforce/apex/DisplayPDFController.saveContentVersion';
import { updateRecord } from 'lightning/uiRecordApi';
import DOCUMENTTEMPLATEID_FIELD from '@salesforce/schema/Document_Template__c.Id';
import WATERMARKDATA_FIELD from '@salesforce/schema/Document_Template__c.Watermark_Data__c';
import getSFDomainBaseURL from '@salesforce/apex/PdfDisplay.getDomainUrl';
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
  allTemplates;
  templatesOptions=[];
  previewLabel='Show Preview'
  @track jsonData;


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
            console.log('domain base URL ----> ', result);
            this.baseURL = result;
        })
        .catch(error => {
            console.log('error while retrieving the org base URL --- > ', error);
        })
        this.documentsExist = false;
        this.docGridData = [];
        this.getRelatedToTypeOptionValues();
        this.getDocumentTemplatesMethod();
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
                if (this.templateRelatedTo != null) {
                    const tempEvent = {'detail':{'row':{'Name':this.selectedDocumentId}}};
                    this.handleTemplateSelection(tempEvent);
                }
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
        this.templateRelatedTo = event.detail.value;
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
    exportTemplate(){
        this.showAllTemplates=true;
        this.showAddNewTemplate=false;
        getAllDocumentTemplatesData()
        .then(data => {
            let exportTemplateData = JSON.parse(data);
            console.log('exportTemplate', exportTemplateData);
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

    importTemplate(){
        this.showImportTemplates=true;
        this.showAddNewTemplate=false;
        getDocumentTemplates()
        .then(data => {
            console.log('exportTemplate', data);
        })
        .catch(error => {
            console.log('Error -> exportTemplate' + error);
        })
        this.template.querySelector('c-modal').show();
    }

    handleJSONUpload(event){
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const jsonContent = JSON.parse(reader.result);
                this.jsonData = JSON.stringify(jsonContent, null, 4);
            } catch (error) {
                console.error('Error parsing JSON file:', error);
            }
        };
        reader.readAsText(file);
    }
    createTemplateData(){
        console.log('createTemplateData got triggered');
        try{
            let createImportedRecords = JSON.parse(this.jsonData);
            createImportedRecords.Templates.forEach(importTemplates => {
                importTemplates.DxCPQ__External_ID__c=importTemplates.Id;
                importTemplates.Id= undefined;
            });
            let templatesjson = JSON.stringify(createImportedRecords.Templates);
            createImportedTemplates({tempLst:templatesjson})
            .then(data=> {
                data.forEach(item =>{
                    let newTempId= item.Id;
                    let oldTempId= item.ExternalId;
                    createImportedRecords['Template Sections'].forEach(tempSecItem => {
                        if (tempSecItem.DxCPQ__Document_Template__c == oldTempId){
                            tempSecItem.DxCPQ__Document_Template__c= newTempId;
                        }
                        tempSecItem.Id=undefined;
                    });
                });
            })
            .then(()=>{
                createImportedRecords.Rules.forEach(importRules => {
                    importRules.DxCPQ__External_Id__c= importRules.Id;
                    importRules.Id= undefined;
                })
                let rulesjson = JSON.stringify(createImportedRecords.Rules);
                createImportedRules({tempRuleLst:rulesjson})
                .then(data => {
                    data.forEach(item=>{
                        let newTempId = item.Id;
                        let oldTempId= item.ExternalId;
                        createImportedRecords['Template Sections'].forEach(tempSecItem =>{
                            if(tempSecItem.DxCPQ__RuleId__c == oldTempId){
                                tempSecItem.DxCPQ__RuleId__c = newTempId;
                            }
                        })
                        createImportedRecords['Rule Conditions'].forEach(importRuleConds => {
                            if(importRuleConds.DxCPQ__Rule__c == oldTempId){
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
            .then(()=>{
                createImportedRecords['Document Clauses'].forEach(importClauses => {
                    importClauses.DxCPQ__External_ID__c= importClauses.Id;
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
                })
            })
        }
        catch (error){
            console.error('Error in creating the data- ',error);
        }
    }

    handleExportTemplateList(event){
        this._selected = event.detail.value;
        const exportTmpList= JSON.parse(JSON.stringify(this.allTemplates));;
        //this.exportList= this.allTemplates;
        exportTmpList.Templates= exportTmpList.Templates.filter(item => this._selected.includes(item.Id));
        exportTmpList['Template Sections']= exportTmpList['Template Sections'].filter(item => this._selected.includes(item.DxCPQ__Document_Template__c));
        this.exportList= JSON.stringify(exportTmpList,null, 4);
        console.log('The selected templates are- ',this._selected);
        console.log('The json data is', this.exportList);
    }

    exportTemplateList(e){
        console.log('The selected templates are- ',this._selected);
        this.previewLabel = this.previewLabel === 'Show Preview' ? 'Hide Preview' : 'Show Preview';
        this.showTextArea = !this.showTextArea;
    }

    // jsonDataAssign(event){
    //     this.jsonData=event.target.value;
    // }

    downloadJson(){
        const element = document.createElement('a');
        const file = new Blob([this.exportList], {type: 'application/json'});
        element.href = URL.createObjectURL(file);
        element.download = 'Templates Information.json';
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
        this.exportList='';
        this.showAddNewTemplate=false;
        this.showwatermarkbtn=false;
        this.previewLabel='Show Preview';
        this.showTextArea=false;
        this.jsonData='';
    }
}