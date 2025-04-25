import { LightningElement, track, wire, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import saveDocumentTemplateSectionSequences from '@salesforce/apex/SaveDocumentTemplatesection.saveDocumentTemplateSectionSequences';
import CloneTemplateSection from '@salesforce/apex/SaveDocumentTemplatesection.CloneTemplateSection';
import getAllDocumentTemplateSections from '@salesforce/apex/SaveDocumentTemplatesection.getAllDocumentTemplateSections';
import activateTemplate from '@salesforce/apex/SaveDocumentTemplate.activateTemplate';
import deleteTemplate from '@salesforce/apex/SaveDocumentTemplate.deleteTemplate';
import { loadStyle } from 'lightning/platformResourceLoader';
import dxQuoteTemplate from '@salesforce/resourceUrl/dxQuoteTemplate';
import dexcpqcartstylesCSS from '@salesforce/resourceUrl/dexcpqcartstyles';
import getAllPopupMessages from '@salesforce/apex/PopUpMessageSelector.getAllConstants';
import saveContentVersion from '@salesforce/apex/DisplayPDFController.saveContentVersion';
import { updateRecord } from 'lightning/uiRecordApi';
import DOCUMENTTEMPLATEID_FIELD from '@salesforce/schema/Document_Template__c.Id';
import WATERMARKDATA_FIELD from '@salesforce/schema/Document_Template__c.Watermark_Data__c';
import getSFDomainBaseURL from '@salesforce/apex/PdfDisplay.getDomainUrl';
import getDocumentTemplateData from '@salesforce/apex/DisplayPDFController.getDocumentTemplateData';
import createLog from '@salesforce/apex/LogHandler.createLog';
import getClassNames from '@salesforce/apex/SaveDocumentTemplate.getClassNames';
import getFlowNames from '@salesforce/apex/SaveDocumentTemplate.getFlowNames';
import updateTemplateDetails from '@salesforce/apex/SaveDocumentTemplate.updateTemplateDetails';
import gettemplatedata from '@salesforce/apex/SaveDocumentTemplate.gettemplatedata';
import getPDFLinks from '@salesforce/apex/ProductSetupCtrl.getPDFLinks';
import getOriginalImageCVID from '@salesforce/apex/ProductSetupCtrl.getOriginalImageCVID';
import insertTranslatedRecords from '@salesforce/apex/LanguageTranslatorClass.insertTranslatedRecords';
import createUpdateMethod from '@salesforce/apex/LanguageTranslatorClass.createUpdateMethod';
import deleteMethod from '@salesforce/apex/LanguageTranslatorClass.deleteMethod';
import selectedLangMethod from '@salesforce/apex/LanguageTranslatorClass.selectedLangMethod';
import getAllUserLanguages from '@salesforce/apex/LanguageTranslatorClass.getAllUserLanguages';
//import getTranslatedText from '@salesforce/apex/LanguageTranslatorClass.translateText';
//import translateTextBatchList from '@salesforce/apex/LanguageTranslatorClass.translateTextBatchList';
import currectUserLang from '@salesforce/apex/LanguageTranslatorClass.currectUserLang';

import { savingPageProperties , updatePropertiesFromJSON} from "./templateDesignerCMPUtils";


export default class TemplateDesignerCMP extends NavigationMixin(LightningElement) {
  //variables added by Bhavya for page properties configuration
  jsonStr = '';
  @track showPageProperties = false;
  @track showFirstHeaderProperties = false;
  //variables added by Bhavya for Import Translations
  @track showTranslations = false;
  @track disableCreate = true;
  @track columns = [];
  @track data = [];
  @track showLoadingSpinner = false;
  @track errorMessages = [];
  originalData = [];
  languageMap = {
      'English': 'en_US',
      'German': 'de',
      'Spanish': 'es',
      'French': 'fr',
      'Italian': 'it',
      'Japanese': 'ja',
      'Swedish': 'sv',
      'Korean': 'ko',
      'Chinese (Traditional)': 'zh_TW',
      'Chinese (Simplified)': 'zh_CN',
      'Portuguese (Brazil)': 'pt_BR',
      'Dutch': 'nl_NL',
      'Danish': 'da',
      'Thai': 'th',
      'Finnish': 'fi',
      'Russian': 'ru',
      'Spanish (Mexico)': 'es_MX',
      'Norwegian': 'no'
  };
  @track isTranslateModalOpen = false;
  @track translatedRecords=[{
        'Name': '',
        'DxCPQ__FieldValue__c': '',
        'DxCPQ__Translated_Value__c': '',
        'Id': ''
    }]; 
  @track languages = [];
  @track selectedLanguage; 
  uniqueIdentifierVal = 0;
  get uniqueIdentifier() {
        this.uniqueIdentifierVal = this.uniqueIdentifierVal + 1;
        return this.uniqueIdentifierVal;
  }
  @track dataArray = [{
              'Name': '',
              'DxCPQ__FieldValue__c': '',
              'DxCPQ__Translated_Value__c': '',
              'Id': this.uniqueIdentifier
          }]; 
  @track extractedWords = [];
  transRecordNameArray = [];
  translateEnabled = false;

  @api recordId; // Selected Template ID
  @track pdfLinksData;
  @track isActivateTemplateDisabled = true;// to disable the Activate
  @api isSaved; //to check for unsaved changes
  @track whereCondition = '';
  //variables added by Bhavya for watermark starts here
  currentSequence = 0;
  sectionsData;
  @track isSectionClone = true;
  step = 1; // progress bar increases with a step value 1
  currentStep = "1"; // It reflects the current (or) active step in the progress bar
  baseURL; // domain base url of the ORG
  imageUrl = ''; // it stores the data of the uploaded image
  originalImageCvId; //stores the contenversion Id of the original image uploaded
  contentVersion; //stores the Image watermark - Original Image ContentVersion Information
  @track activeTab = ''; // It stores the active tab value
  @track outerContainer = ''; //The styling of the container which holds the canvas
  @track watermarkText = ''; // The input text value with which text watermark is being created
  @track showwatermarkbtn = false; // This variable controls the display of the Watermark Popup in HTML
  @track fontSizeValue = '22'; // Default Font Size = 22
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
  @track readonlyVal = false; // Boolean to make the Image fields readonly
    baseDataLst = []; //list that stores the dataURl of Watermark Images
  hasOriginalImage = false; // Boolean to show if the watermark is new one or edit on previous one
  prevoriginalImageCvId;//stores the previously saved original watermark Content Version ID
  callImage = 0;
  //watermarkPageOptionsText combobox options for Text Watermark
  watermarkPageOptionsText = [
    { label: 'All Pages', value: 'All Pages - Text', checked: true },
    { label: 'All Pages Except First Page', value: 'All Pages Except First Page - Text', checked: false },
    { label: 'Only First Page', value: 'Only First Page - Text', checked: false },
  ];
  //watermarkPageOptionsImage combobox options for Image Watermark
  watermarkPageOptionsImage = [
    { label: 'All Pages', value: 'All Pages - Image', checked: true },
    { label: 'All Pages Except First Page', value: 'All Pages Except First Page - Image', checked: false },
    { label: 'Only First Page', value: 'Only First Page - Text', checked: false },
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

  value = ''; // Variable used to store the event value.
  rowCount = -1; // Section count/index of the section in the sections stack.
  selectedOption; // Variable for storing selected options.
  isLoaded = false; // Flag to indicate whether the component is loaded.
  SectionTypename; // Variable to store the section type name.
  recordidtoedit = ''; // ID of the record to edit.
  firstsectionrecord; // First section record.
  editTemplate = false; // Flag to indicate whether to show the edit the template screen or not.
  opensection = false; // Flag to indicate whether to open a section.
  disableEditing = false; // Flag to indicate whether editing is disabled.
  showtabledetails = false; // Flag to indicate whether to show/hide table details.
  showclausescreen = false; // Flag to indicate whether to show/hide the clause screen.
  showheaderdetails = false; // Flag to indicate whether to show/hide header details.
  showfooterdetails = false; // Flag to indicate whether to show/hide footer details.
  showCloneTemplate = false; // Flag to indicate whether to show the clone template popup.
  showAddNewTemplate = false; // Flag to indicate whether to show the add new template popup.
  showDeleteTemplate = false; // Flag to indicate whether to show the delete template popup.
  documenttemplaterecordid; // ID of the document template record.
  showcontextdetails = false; // Flag to indicate whether to show the context details section.
  selectedSectionRecordID = ''; // ID of the selected section record.
  isconnectedcalledonLoad = false; // Flag to indicate whether connected is called on load.
  showrelatedobjectdetails = false; // Flag to indicate whether to show related object details section.
  activateTemplateLabel = 'Activate'; // Label for activating the template.
  @track showPreview = false; // Flag to indicate whether to show/hide the preview.
  @track previewModal = false; // Flag to indicate whether to show/hide the preview modal.
  previewLabel = ''; // Label for the preview.
  @track showTemplate = false; // Flag to indicate whether to show/hide the template.
  isconnectedcalledondeletion = false; // Flag to indicate whether connected is called on deletion.
  previewRecordId; // ID of the preview record.
  templateId; // ID of the template.
  templatename; // Name of the template.
  sectionToClone;
  @api relatedtoTypeObjName; // Related to type object name.
  @track relatedtoTypeObjChild; // Child of the related to type object.
  quoteName; // Name of the quote.
  popUpMessage; // Popup message.
  // variables added by reethika regarding dynamic flow or class selection
  @track classTypeOptions = [];
  @track flowTypeOptions = [];
  @track classIdData = [];
  @track flowIdData = [];
  @track editTemp = {};
  @track isBundled = false;
  //variables added by reethika regarding dynamic flow or class selection ends here
  @wire(getAllPopupMessages)
  allConstants({ error, data }) {
    if (data) {
      this.popUpMessage = data;
          } else {
      this.error = error;
    }
  }

  @track doctemplatedetails = {
    Id: '',
    Name: '',
    DxCPQ__ClassId__c: '',
    DxCPQ__FlowId__c: '',
    DxCPQ__Related_To_Type__c: '',
    DxCPQ__IsActive__c: false,
    DxCPQ__Version_Number__c: '', DxCPQ__Previously_Active__c: false, DxCPQ__Parent_Template__c: ''
  };

  constructor() {
    super();
  }

  /**
  * Sets the record ID and related field values based on the provided document information.
  * Calls the connectedCallback method.
  * @param {Object} doc The document information.
  */
  @api handleConnectedCallback(doc) {
    this.recordId = doc.Id;
    this.doctemplatedetails.Id = doc.Id;
    this.doctemplatedetails.DxCPQ__Related_To_Type__c = doc.DxCPQ__Related_To_Type__c;
    this.relatedtoTypeObjName = doc.DxCPQ__Related_To_Type__c;
    this.relatedtoTypeObjChild = this.relatedtoTypeObjName;
    this.isconnectedcalledonLoad = false;
    this.connectedCallback();
  }

  /**
  * Method to receive an object name and perform related actions based on the object name.
  * Sets the object name received as the value for the relatedtoTypeObjChild property in the component.
  * Calls the handleObjectNameSelection method of the c-template-content-details and c-template-related-objects components with the object name as a parameter.
  * (Commented out) Calls the handleObjectNameSelection method of the c-template-footer-type and c-template-header-type components with the object name as a parameter.
  * @param {String} objName The name of the object being passed.
  * @returns The object name passed as a parameter.
  */
  @api passingObject(objName) {
    this.relatedtoTypeObjChild = objName;
    this.template.querySelector("c-template-content-details").handleObjectNameSelection(this.relatedtoTypeObjName);
    this.template.querySelector("c-template-related-objects").handleObjectNameSelection(this.relatedtoTypeObjName);
    /* Commented by Rahul -> Merge Fields in Header and Footer */
    // this.template.querySelector("c-template-footer-type").handleObjectNameSelection(this.relatedtoTypeObjName);
    // this.template.querySelector("c-template-header-type").handleObjectNameSelection(this.relatedtoTypeObjName);
  }

  /**
    * Method to handle child components based on the selected option, new section status, and section ID.
    * @param {String} selectedOption The selected option for the section ('Clause', 'Context', 'Related Objects', 'Table', 'Header', or 'Footer').
    * @param {Boolean} isNewSection Indicates whether the section is new or not.
    * @param {String} sectionid The ID of the section.
    */
  handlechildcomponents(selectedOption, isNewSection, sectionid) {
    if (selectedOption == 'Clause') {
      this.showclausescreen = true;
      this.showtabledetails = false;
      this.showrelatedobjectdetails = false;
      this.SectionTypename = 'Clause';
      this.opensection = true;
      this.showcontextdetails = true;
      this.showheaderdetails = false;
      this.showfooterdetails = false;
      if (isNewSection == true) {
        this.rowCount += 1;
        this.optionsList.push({ Id: selectedOption + 'NotSaved', Type: selectedOption, rowCount: this.rowCount });
        this.selectedSectionRecordID = selectedOption + 'NotSaved';
        this.connectedCallback();
      } else {
        this.template.querySelector("c-template-content-details").loadsectionsectionvaluesforedit(sectionid);
        this.showPreview = true;
      }
    }
    else if (selectedOption == 'Context') {
      this.showclausescreen = false;
      this.showtabledetails = false;
      this.showrelatedobjectdetails = false;
      this.SectionTypename = 'Context';
      this.opensection = true;
      this.showcontextdetails = true;
      this.showheaderdetails = false;
      this.showfooterdetails = false;
      if (isNewSection == true) {
        this.rowCount += 1;
        this.optionsList.push({ Id: selectedOption + 'NotSaved', Type: selectedOption, rowCount: this.rowCount });
        this.selectedSectionRecordID = selectedOption + 'NotSaved';
        this.connectedCallback();
      } else {
        this.template.querySelector("c-template-content-details").loadsectionsectionvaluesforedit(sectionid);
        this.showPreview = true;
      }
    }
    else if (selectedOption == 'Related Objects') {
      this.relatedtoTypeObjChild = this.relatedtoTypeObjName;
      this.showclausescreen = false;
      this.showtabledetails = false;
      this.showrelatedobjectdetails = true;
      this.SectionTypename = 'Related Objects';
      this.opensection = true;
      this.showcontextdetails = false;
      this.showheaderdetails = false;
      this.showfooterdetails = false;
      if (isNewSection == true) {
        this.rowCount += 1;
        this.optionsList.push({ Id: selectedOption + 'NotSaved', Type: selectedOption, rowCount: this.rowCount });
        this.selectedSectionRecordID = selectedOption + 'NotSaved';
        this.connectedCallback();
      } else {
        this.template.querySelector("c-template-related-objects").loadsectionsectionvaluesforedit(sectionid);
        this.showPreview = true;
      }
    }

    else if (selectedOption == 'Table') {
      this.showclausescreen = false;
      this.showtabledetails = true;
      this.showrelatedobjectdetails = false;
      this.SectionTypename = 'Table';
      this.opensection = true;
      //this.isModalOpen = false;
      this.showcontextdetails = false;
      this.showheaderdetails = false;
      this.showfooterdetails = false;
            if (isNewSection == true) {
        this.rowCount += 1;
        this.optionsList.push({ Id: selectedOption + 'NotSaved', Type: selectedOption, rowCount: this.rowCount });
        this.selectedSectionRecordID = selectedOption + 'NotSaved';
        this.connectedCallback();
      } else {
        this.template.querySelector("c-template-table-details").loadsectionsectionvaluesforedit(sectionid);
        this.showPreview = true;

      }
    }
    else if (selectedOption == 'Header') {
      this.showclausescreen = false;
      this.showtabledetails = false;
      this.showrelatedobjectdetails = false;
      this.SectionTypename = 'Header';
      this.opensection = true;
      this.showcontextdetails = false;
      this.showheaderdetails = true;
      this.showfooterdetails = false;

      if (isNewSection == true) {
        this.template.querySelector("c-template-header").loadsectionsvaluesforCreation();
      } else {
        this.template.querySelector("c-template-header").loadsectionvaluesforedit(this.header.Id);
        this.showPreview = true;
      }
    } else if (selectedOption == 'Footer') {
      this.showclausescreen = false;
      this.showtabledetails = false;
      this.showrelatedobjectdetails = false;
      this.opensection = true;
      this.showcontextdetails = false;
      this.showheaderdetails = false;
      this.showfooterdetails = true;
      if (isNewSection == true) {
        this.template.querySelector("c-template-footer").loadsectionsvaluesforCreation();
      } else {
        this.template.querySelector("c-template-footer").loadsectionvaluesforedit(this.footer.Id);
        this.showPreview = true;
      }
    }
  }

  handleDataSaved(event){
    //window.addEventListener('beforeunload', this.handleBeforeUnload);
    console.log('handleDataSaved triggered', event.detail);
    this.isSaved = event.detail;
    const saveEvent = new CustomEvent('datasaved', {detail: event.detail });
    this.dispatchEvent(saveEvent);
  }

  handleAllButtonsClicked(event){
    if (this.isSaved == true){
      if (event.target.label == 'Activate' || event.target.label == 'Deactivate'){
        this.handleActiveTemplate(event);
      }
      else if (event.target.label == 'Clone'){
        this.handleCloneTemplate(event);
      }
      else if (event.target.label == 'Delete'){
        this.handleDeleteTemplateHandler(event);
      }
      else if (event.target.label == 'Refresh'){
        this.handleRefreshTemplateHandler(event);
      }
      else if (event.target.label == 'Preview'){
        this.handlePreview(event);
      }
      else if (event.target.title == 'Section : Context'){
        this.handleNewContext(event);
      }
      else if (event.target.title == 'Section : Related Objects'){
        this.handleNewRelatedObjects(event);
      }
      else if (event.target.title == 'Section : Clause'){
        this.handleNewClause(event);
      }
      else if (event.target.title == 'Section : Table'){
        this.handleNewTable(event);
      }
      else if (event.target.title == 'Edit Properties'){
        this.handleEditTemplate(event);
      }
      else if (event.currentTarget.dataset.sectiontype == 'Header'){
        this.handleHeaderClick(event);
      }
      else if (event.currentTarget.dataset.sectiontype!='Header'&&event.currentTarget.dataset.sectiontype!='Footer'){
        this.handleSectionClick(event);
      }
      else if (event.currentTarget.dataset.sectiontype == 'Footer'){
        this.handleFooterClick(event);
      }
    }
    else{
      event.preventDefault();
      if (confirm("Changes not saved. Please click Cancel and save the changes or Ok to continue.") == true){
        this.isSaved = true;
        const saveEvent = new CustomEvent('datasaved', {detail: this.isSaved});
        this.dispatchEvent(saveEvent)
        this.handleConfirmScreen(event);
      }
    }
  }

  handleConfirmScreen(event){
    this.handleAllButtonsClicked(event);
  }


  /**
   * Method to add a new Context section to the sections stack
  */
  handleNewContext() {
    this.selectedSectionRecordID = '';
    this.template.querySelector("c-template-content-details").resetvaluesonchildcmp();
    const selectedOption = 'Context';
    this.isconnectedcalledondeletion = false;
    this.handlechildcomponents(selectedOption, true, null);
    const saveEvent = new CustomEvent('datasaved', {detail: false });
    this.dispatchEvent(saveEvent);
  }
  /**
   * Method to add a new Related Objects section to the sections stack
  */
  handleNewRelatedObjects() {
    this.relatedtoTypeObjChild = this.relatedtoTypeObjName;
    this.selectedSectionRecordID = '';
    this.template.querySelector("c-template-related-objects").resetvaluesonchildcmp();
    this.template.querySelector("c-template-related-objects").assignDocTempId(this.doctemplatedetails.Id);
    const selectedOption = 'Related Objects';
    this.isconnectedcalledondeletion = false;
    this.handlechildcomponents(selectedOption, true, null);
    const saveEvent = new CustomEvent('datasaved', {detail: false });
    this.dispatchEvent(saveEvent);
  }
  /**
   * Method to add a new Clause section to the sections stack
  */
  handleNewClause() {
    this.selectedSectionRecordID = '';
    this.template.querySelector("c-template-content-details").resetvaluesonchildcmp();
    const selectedOption = 'Clause';
    this.isconnectedcalledondeletion = false;
    this.handlechildcomponents(selectedOption, true, null);
    const saveEvent = new CustomEvent('datasaved', {detail: false });
    this.dispatchEvent(saveEvent);
  }

  /**
   * Method to add a new Table section to the sections stack
  */
  handleNewTable() {
    this.selectedSectionRecordID = '';
    this.template.querySelector("c-template-table-details").resetvaluesonchildcmp();
    this.template.querySelector("c-template-table-details").assignDocTempId(this.doctemplatedetails.Id);
    const selectedOption = 'Table';
    this.isconnectedcalledondeletion = false;
    this.handlechildcomponents(selectedOption, true, null);
    const saveEvent = new CustomEvent('datasaved', {detail: false });
    this.dispatchEvent(saveEvent);
  }

  /**
    * Method to handle the data saved for a section.
    * Retrieves the saved section record ID from the event detail.
    * Iterates through the optionsList array to update the section name if the ID contains 'NotSaved' or matches the saved section record ID.
    * Sets the selected section record ID to the saved section record ID.
    * Calls the connectedCallback method to refresh the component.
    * If the showPreview property is false, sets it to true.
    * @param {CustomEvent} event The event containing the saved section record ID and name.
    */
  handlesavedsectiondata(event) {
    var secrecordId = event.detail.Id;
    this.optionsList.forEach(function (val) {
      var str = val.Id;
      if (str.indexOf('NotSaved') !== -1) {
        val.sectionNameEntered = event.detail.Name;
        val.Id = event.detail.Id;
        val.visibility = event.detail.DxCPQ__Section_Visibility_Rule__c;
      }
      else if (str.indexOf(secrecordId) !== -1) {
        val.sectionNameEntered = event.detail.Name;
        val.visibility = event.detail.DxCPQ__Section_Visibility_Rule__c;
      }
    });
    this.selectedSectionRecordID = secrecordId;
    this.connectedCallback();
    if (this.showPreview == false) { this.showPreview = true; }
    if (this.isActivateTemplateDisabled == true) { this.isActivateTemplateDisabled = false; }
  }

  /**
   * Method to save the Header data when clicked Save/update
   */
  handlesavedheaderdata(event) {
    this.header.Id = event.detail.Id;
    if (this.showPreview == false) { this.showPreview = true; }
      }

  /**
   * Method to save the footer data when clicked Save/update
   */
  handlesavedfooterdata(event) {
    this.footer.Id = event.detail.Id;
    if (this.showPreview == false) { this.showPreview = true; }
      }

  /**
 * Method to delete the section of the current template
 */
  handledeletesectiondata() {
    this.isconnectedcalledondeletion = true;
    this.connectedCallback();
  }

  /**
   * Method to handle a header click event. 
   * Adds the "active" class to the element with the data-id attribute equal to this.header.Id.
   * Removes the "active" class from all elements with data-id attributes equal to index in this.sections.
   * Removes the "active" class from the element with the data-id attribute equal to this.footer.Id.
   * Calls the displaysectionbasedontype method with this.header.Id and this.header.Type as parameters.
   */
  handleHeaderClick() {
    const elm = this.template.querySelector(`[data-id="${this.header.Id}"]`);
    elm.classList.add("active");
    this.sections.forEach((loopvar, index) => {
      const elm2 = this.template.querySelector(`[data-id="${index}"]`);
      elm2.classList.remove("active");
    });
    const elmfooter = this.template.querySelector(`[data-id="${this.footer.Id}"]`);
    elmfooter.classList.remove("active");
    this.displaysectionbasedontype(this.header.Id, this.header.Type);
  }

  /**
    * Method to handle the click event on the footer section.
    * Retrieves the footer element using the footer ID and adds the 'active' class to it.
    * Removes the 'active' class from all other sections.
    * Retrieves the header element using the header ID and removes the 'active' class from it.
    * Calls the displaysectionbasedontype method to display the footer section.
    */
  handleFooterClick() {
    const elm = this.template.querySelector(`[data-id="${this.footer.Id}"]`);
    elm.classList.add("active");
    this.sections.forEach((loopvar, index) => {
      const elm2 = this.template.querySelector(`[data-id="${index}"]`);
      elm2.classList.remove("active");
    });
    const elmheader = this.template.querySelector(`[data-id="${this.header.Id}"]`);
    elmheader.classList.remove("active");
    this.displaysectionbasedontype(this.footer.Id, this.footer.Type);
  }

  /**
    * Method triggered when a section is clicked.
    * Adds the 'active' class to the clicked section.
    * Removes the 'active' class from all other sections.
    * Removes the 'active' class from the header and footer sections.
    * Sets the 'selectedSectionRecordID' and 'recordidtoedit' variables based on the clicked section.
    * Calls the displaysectionbasedontype method to display the section based on its type and ID.
    * @param {Event} event The event object containing information about the click event.
    * @returns undefined.
    */
  handleSectionClick(event) {
    const itemIndex = event.currentTarget.dataset.id;
    const elm = this.template.querySelector(`[data-id="${itemIndex}"]`);
    elm.classList.add("active");
    this.sections.forEach((loopvar, index) => {
      if (itemIndex != index) {
        const elm2 = this.template.querySelector(`[data-id="${index}"]`);
        elm2.classList.remove("active");
      }
    });

    const elmheader = this.template.querySelector(`[data-id="${this.header.Id}"]`);
    elmheader.classList.remove("active");

    const elmfooter = this.template.querySelector(`[data-id="${this.footer.Id}"]`);
    elmfooter.classList.remove("active");

    const rowData = this.sections[itemIndex];
    this.selectedSectionRecordID = rowData.Id;
    this.recordidtoedit = rowData.Id;
    this.displaysectionbasedontype(this.recordidtoedit, rowData.Type);
  }

  /**
    * Method to display a section based on its type and ID.
    * If the section type is 'Header' or 'Footer', checks if the section ID contains the string 'NotSaved' to determine if the section is new.
    * Calls the handlechildcomponents method with the section type, new status, and section ID as parameters.
    * If the section type is not 'Header' or 'Footer', calls the handlechildcomponents method with the section type as the first parameter and false as the second parameter.
    * @param {String} sectionid The ID of the section.
    * @param {String} sectiontype The type of the section ('Header', 'Footer', or other).
    * @returns value of the field based on their respective format.
    */
  displaysectionbasedontype(sectionid, sectiontype) {
    if (sectiontype == 'Header' || sectiontype == 'Footer') {
      var isnew = true;
      if (sectionid.indexOf('NotSaved') !== -1) {
        isnew = true;
      } else {
        isnew = false;
      }
      this.handlechildcomponents(sectiontype, isnew, sectionid);
    } else {
      this.handlechildcomponents(sectiontype, false, sectionid);
    }
  }

  /**
  * Method to give dynamic styling to element
  */
  get itemStyle() {
    return `background-color:${this.backgroundColor}; color: ${this.color}; padding:10px 10px 20px 10px; width:100%; box-shadow:0px 0px 2px rgb(229, 229, 229)`
  }

  /**
  * Method to prevent the default behavior of the action
  */
  preventDefault(event) {
    return event.preventDefault()
  }

  /**
  * Method to reset all the values on all the section components
  */
  @api resetallvaluesonAllcmp() {
    //this.isSaved = true;
    this.documenttemplaterecordid = '';
    this.doctemplatedetails.Id = '';
    this.doctemplatedetails.Name = '';
    this.doctemplatedetails.DxCPQ__Related_To_Type__c = '';
    this.relatedtoTypeObjChild = '',
    this.doctemplatedetails.DxCPQ__IsActive__c = false;
    this.doctemplatedetails.DxCPQ__Version_Number__c = '';
    this.doctemplatedetails.DxCPQ__Previously_Active__c = false;
    this.doctemplatedetails.DxCPQ__Parent_Template__c = '';
    this.showcontextdetails = false;
    this.showtabledetails = false;
    this.showrelatedobjectdetails = false;
    this.showheaderdetails = false;
    this.showfooterdetails = false;
    this.disableEditing = false;
    this.readonlyVal = false;
    this.imageUrl = '';
    this.originalImageCvId = '';
    this.contentVersion = '';
    this.disableEditingHandler(this.disableEditing);
    this.readonlyVal = false;
    this.activateTemplateLabel = 'Activate';
    this.rowCount = -1;
    this.template.querySelector("c-template-content-details").resetvaluesonchildcmp();
    this.header = { Id: 'headerNotSaved', Type: 'Header', rowCount: this.rowCount, sectionNameEntered: 'Header' };
    this.footer = { Id: 'footerNotSaved', Type: 'Footer', rowCount: this.rowCount, sectionNameEntered: 'Footer' };
    this.showPreview = false;
    const saveEvent = new CustomEvent('datasaved', {detail: true});
    this.dispatchEvent(saveEvent);
  }

  resetImageWatermarkFields() {
    this.rotationImagevalue = '0';
    this.imageScalingValue = '100';
    this.opacityImageValue = '1.0';
    this.callImage = 0;
  }

  /**
  * Method to disable the preview option when made active
  */
  handlePreviewBackButton() {
    this.showTemplate = false;
    this.previewModal = true;
    this.previewRecordId = undefined;
  }

  /**
  * Method to disable the preview option when made active
  */
  get navigateToPreview() {
    return this.previewRecordId == undefined;
  }



  //--------------------------------DRAG FUNCTIONALITY START - VIVEK---------------------------------------------------------------
  sections = []; // Variable used to store the event value
  @api sectionMap; // Variable used to store the event value
  @api dragMap; // Variable used to store the event value
  optionsList = []; // Variable used to store the event value
  @track header = { Id: 'headerNotSaved', Type: 'Header', rowCount: this.rowCount, sectionNameEntered: 'Header' }; // Variable used to store the event value
  @track footer = { Id: 'footerNotSaved', Type: 'Footer', rowCount: this.rowCount, sectionNameEntered: 'Footer' }; // Variable used to store the event value
  @track isTemplateSectionsFetched = false; 

  connectedCallback() {
    this.isActivateTemplateDisabled = true;
    getSFDomainBaseURL()
      .then(result => {
          this.baseURL = result;
      })
      .catch(error => {
        console.log('error while retrieving the org base URL --- > ', error);
      })
      
    //code added by Bhavya to get user languages
     getAllUserLanguages()
      .then(result =>{
        this.languages = result.map(option => {
        return { label: option.label, value: option.value };
        });
      }).catch(error=>{
        let errorMessage = error.message || 'Unknown error message';
        let tempError = error.toString();
        createLog({ recordId: '', className: 'TemplateContentDetails LWC Component - connectedCallback()', exceptionMessage: errorMessage, logData: tempError, logType: 'Exception' });
      });
      console.log('Languages----',this.languages);
    //get PDFlinks from custom metdata
    getPDFLinks()
      .then(result => {
          this.pdfLinksData = result;
      })
      .catch(error => {
        console.log('error while retrieving the PDF Links --- > ', error);
      })
    this.relatedtoTypeObjChild = this.relatedtoTypeObjName;
    this.documenttemplaterecordid = this.recordId;
    this.doctemplatedetails.Id = this.recordId;
    if (this.isconnectedcalledonLoad == false || this.isconnectedcalledondeletion == true) {
      this.optionsList = [];
      this.isLoaded2 = true;
      this.firstsectionrecord = '';
      getAllDocumentTemplateSections({ docTempId: this.documenttemplaterecordid })
        .then(result => {
          //console.log('getAllDocumentTemplateSections result --> ', result);
          if (result != null) {
            if(result.length > 0 ){
              this.jsonStr = result[0].DxCPQ__Document_Template__r.DxCPQ__PDF_Page_Properties__c !== '' || result[0].DxCPQ__Document_Template__r.DxCPQ__PDF_Page_Properties__c !== null? result[0].DxCPQ__Document_Template__r.DxCPQ__PDF_Page_Properties__c : '';
            }
            this.sectionsData = result;
            this.isTemplateSectionsFetched = true;
            if (result.length > 0) {
              result.forEach(res => {
                if (res.DxCPQ__Type__c !== 'Header' && res.DxCPQ__Type__c !== 'Footer' && this.isActivateTemplateDisabled) {
                  this.isActivateTemplateDisabled = false;
                }
              });
             
            }
            var headerselected = false;
            this.isconnectedcalledonLoad = true;
            this.footer.rowCount = result.length;
            result.forEach((val, index) => {
              if (val.DxCPQ__Type__c == 'Header') {
                headerselected = true;
                this.header.Id = val.Id;
                this.header.Type = val.DxCPQ__Type__c;
                this.header.rowCount = val.DxCPQ__Sequence__c;
                this.header.sectionNameEntered = val.Name;
                try {
                  let sectionContentObject = JSON.parse(val.DxCPQ__Section_Content__c);
                  let sectionsFirstCount = sectionContentObject.sectionsFirstCount;
                  console.log('sectionsFirstCount in connectedCallback:', sectionsFirstCount);
                  this.showFirstHeaderProperties = sectionsFirstCount !== null ? true : false;
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                }
              }
              else if (val.DxCPQ__Type__c == 'Footer') {
                this.footer.Id = val.Id;
                this.footer.Type = val.DxCPQ__Type__c;
                this.footer.rowCount = val.DxCPQ__Sequence__c;
                this.footer.sectionNameEntered = val.Name;
              }
              else {
                var indexposition;
                if (headerselected == true) { indexposition = 1; }
                else { indexposition = 0; }

                if (index == indexposition) {
                  this.firstsectionrecord = val;
                  this.doctemplatedetails.Name = val.DxCPQ__Document_Template__r.Name;
                  this.doctemplatedetails.Related_To_Type__c = val.DxCPQ__Document_Template__r.DxCPQ__Related_To_Type__c;
                  this.relatedtoTypeObjName = val.DxCPQ__Document_Template__r.DxCPQ__Related_To_Type__c;
                  this.relatedtoTypeObjChild = this.relatedtoTypeObjName;
                  this.doctemplatedetails.DxCPQ__IsActive__c = val.DxCPQ__Document_Template__r.DxCPQ__IsActive__c;
                  this.doctemplatedetails.DxCPQ__Version_Number__c = val.DxCPQ__Document_Template__r.DxCPQ__Version_Number__c;
                  this.doctemplatedetails.DxCPQ__Parent_Template__c = val.DxCPQ__Document_Template__r.DxCPQ__Parent_Template__c;
                  if (this.doctemplatedetails.DxCPQ__IsActive__c == true) {
                    this.activateTemplateLabel = 'Deactivate';
                    this.showPreview = true;
                  }
                }
                this.rowCount = val.DxCPQ__Sequence__c;
                this.optionsList.push({ Id: val.Id, Type: val.DxCPQ__Type__c, rowCount: val.DxCPQ__Sequence__c, sectionNameEntered: val.Name, visibility: val.DxCPQ__Section_Visibility_Rule__c });
              }
              this.disableEditing = val.DxCPQ__Document_Template__r.DxCPQ__Previously_Active__c;
              this.disableEditingHandler(this.disableEditing);
            });
            this.sections = this.optionsList;
            this.isLoaded2 = false;
            this.opensection = true;
            this.connectedCallbackHandler();
            if (this.firstsectionrecord) {
              this.displaysectionbasedontype(this.firstsectionrecord.Id, this.firstsectionrecord.DxCPQ__Type__c);
            }
          }

          // On load header section loading - by Rahul
          if (result.length < 1) {
            this.handlechildcomponents('Header', true, null);
            var _this = this;

            let sectionContainer = this.template.querySelector('[data-id="section menu"]');
            sectionContainer.innerHTML = '<span class="slds-form-element__label"> You can add sections to this template from here ➡️ &nbsp;</span>'

            let sectionItemContainer = this.template.querySelector('[data-id="section menu items"]');
            sectionItemContainer.style.border = '3px solid red';

            setTimeout(function () {
              const elm = _this.template.querySelector(`[data-id="headerNotSaved"]`);
              elm.classList.add("active");
            }, 1000);

            setTimeout(function () {
              _this.template.querySelector('[data-id="section menu"]').innerHTML = '';
              _this.template.querySelector('[data-id="section menu items"]').style.border = '0px solid transparent';
              _this.template.querySelector('[data-id="section menu items"]').style.transition = '1s';
            }, 2000);

          }
          else {
            let headerArray = result.filter((tempSection) => tempSection.DxCPQ__Type__c == 'Header');
            if (headerArray.length > 0) {
              this.handlechildcomponents('Header', false, headerArray[0].Id);
              setTimeout(() => {
                const elm = this.template.querySelector(`[data-onload="templateHeader"]`);
                elm.classList.add("active");
              }, 1000);
            }
            else {
              this.handlechildcomponents(result[0].DxCPQ__Type__c, false, result[0].Id);

              if (this.template.querySelector(`[data-onload="templateHeader"]`) != null) {
                const elm = this.template.querySelector(`[data-onload="templateHeader"]`);
                elm.classList.remove("active");
              }


              if (this.template.querySelector(`[data-onload="templateFooter"]`) != null) {
                const elm = this.template.querySelector(`[data-onload="templateFooter"]`);
                elm.classList.remove("active");
              }

              setTimeout(() => {
                const elm = this.template.querySelector(`[data-id="0"]`);
                elm.classList.add("active");
              }, 1000);
            }
          }
          // On load header section loading - by Rahul

        })
        .catch(error => {
          this.isLoaded2 = false;
          let tempError = error.toString();
          let errorMessage = error.message || 'Unknown error message';
          createLog({ recordId: '', className: 'templateDesignerCMP LWC Component - connectedCallback()', exceptionMessage: errorMessage, logData: tempError, logType: 'Exception' });
        })
    } else if (this.isconnectedcalledonLoad == true) {
      this.sections = this.optionsList;
      this.connectedCallbackHandler();
      var _this = this;

      setTimeout(() => {

        const elm_ = this.template.querySelector(`[data-onload="templateHeader"]`);
        elm_.classList.remove("active");

        const elm = this.template.querySelector(`[data-onload="templateFooter"]`);
        elm.classList.remove("active");

        this.sections.forEach((loopvar, index) => {
          const elm0 = this.template.querySelector(`[data-id="${index}"]`);
          elm0.classList.remove("active");
        });

        const newSectionAdded = (element) => element.Id == _this.selectedSectionRecordID;
        let newSectionIndex = this.optionsList.findLastIndex(newSectionAdded);
        const elm1 = this.template.querySelector(`[data-id="${newSectionIndex}"]`);
        elm1.classList.add("active");
      }, 2000)

    }

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

    /* @description this getFlowNames function is used to fetch
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
  * Method to update the section variable 
  */
  connectedCallbackHandler() {
    if (!!this.sections) {
      this.sectionMap = new Map();
      let tempArray = JSON.parse(JSON.stringify(this.sections));
      tempArray.forEach((arrayElement, index) => {
        arrayElement.index = index;
        arrayElement.rowCount = index + 1;
        this.sectionMap.set(arrayElement.Id, arrayElement);
      });
      this.sections = JSON.parse(JSON.stringify(tempArray));
    }
  }

  /**
  * Method to active the template selected 
  */
  handleActiveTemplate() {
    let isActive;
    if (this.activateTemplateLabel == 'Activate') {
      this.activateTemplateLabel = 'Deactivate';
      isActive = true;
    } else {
      this.activateTemplateLabel = 'Activate';
      isActive = false;
    }
    if (this.disableEditing == false) {
      this.template.querySelector("c-template-content-details").handleObjectNameSelection(this.relatedtoTypeObjName);
      this.template.querySelector("c-template-related-objects").handleObjectNameSelection(this.relatedtoTypeObjName);
      this.template.querySelector('c-template-content-details').handleActivateTemplate(isActive, this.relatedtoTypeObjName);
      this.template.querySelector('c-template-table-details').handleActivateTemplate(isActive, this.relatedtoTypeObjName);
      this.template.querySelector('c-template-related-objects').handleActivateTemplate(isActive, this.relatedtoTypeObjName);
      this.template.querySelector('c-template-header').handleActivateTemplate(isActive, this.relatedtoTypeObjName);
      this.template.querySelector('c-template-footer').handleActivateTemplate(isActive, this.relatedtoTypeObjName);
    }
    activateTemplate({ templateId: this.documenttemplaterecordid, parentId: this.doctemplatedetails.DxCPQ__Parent_Template__c, isActive: isActive }).then(result => {
      if (result != null) {
        this.disableEditing = result.DxCPQ__Previously_Active__c;
        this.readonlyVal = this.disableEditing ? true : false;
      }
    }).catch(error => {
      console.log('error activation', error);
    })
  }

  /**
  * Method to disable editing for the all sections under the selected template when the template is made active
  */
  disableEditingHandler(isActive) {
    this.template.querySelector('c-template-content-details').handleActivateTemplate(isActive, this.relatedtoTypeObjName);
    this.template.querySelector('c-template-table-details').handleActivateTemplate(isActive, this.relatedtoTypeObjName);
    this.template.querySelector('c-template-related-objects').handleActivateTemplate(isActive, this.relatedtoTypeObjName);
    this.template.querySelector('c-template-header').handleActivateTemplate(isActive, this.relatedtoTypeObjName);
    this.template.querySelector('c-template-footer').handleActivateTemplate(isActive, this.relatedtoTypeObjName);
    this.readonlyVal = isActive ? true : false;
  }

  /**
  * Method to open the clone popup and show the cloned template
  */
  handleCloneTemplate() {
    this.showAddNewTemplate = false;
    this.editTemplate = false;
    this.showwatermarkbtn = false;
    this.showDeleteTemplate = false;
    this.showCloneTemplate = true;
    this.previewModal = false;
    this.showTemplate = false;
    this.template.querySelector('c-modal').show();
  }

  /**
  * Method to show the preview of the template for the selected record ID
  */
  showpreviewtemplate() {
    this.previewModal = false;
    this.showAddNewTemplate = false;
    this.editTemplate = false;
    this.showwatermarkbtn = false;
    this.showDeleteTemplate = false;
    this.showCloneTemplate = false;
    this.showTemplate = true;
    this.template.querySelector('c-modal').show();
  }

  /**
   * Method to open the preview modal to select the record ID for previewing the selected template
   */
  handlePreview() {
    this.previewLabel = `Search a ${this.relatedtoTypeObjName} for this template to preview`;
    if (this.relatedtoTypeObjName.toLowerCase().startsWith("a") || this.relatedtoTypeObjName.toLowerCase().startsWith("e") ||
      this.relatedtoTypeObjName.toLowerCase().startsWith("i") || this.relatedtoTypeObjName.toLowerCase().startsWith("o") || this.relatedtoTypeObjName.toLowerCase().startsWith("a") || this.relatedtoTypeObjName.toLowerCase().startsWith("u")) {
      this.previewLabel = `Search an ${this.relatedtoTypeObjName} for this template to preview`;
    }
    this.previewModal = true;
    this.showAddNewTemplate = false;
    this.editTemplate = false;
    this.showwatermarkbtn = false;
    this.showDeleteTemplate = false;
    this.showCloneTemplate = false;
    this.showTemplate = false;
    this.template.querySelector('c-modal').show();
  }

  /**
   * Method to open the edit template screen. It also triggers the getSavedDocTempWatermarkData() to get the information of the watermark if saved any on this selected template
   */
  handleEditTemplate() {
    var attribute = [];
    var attribute1 = [];
    this.showAddNewTemplate = false;
    this.showCloneTemplate = false;
    this.showDeleteTemplate = false;
    this.editTemplate = true;
    this.showwatermarkbtn = false;
    this.previewModal = false;
    this.showTemplate = false;
    /**
     * @description this is used to get the selected class name and 
     * flow name when you click on edit icon on onload.
     * Author : Reethika
     */
    gettemplatedata({ editrecordid: this.recordId })
      .then(result => {
        console.log('result', result);
        if (typeof result[0].DxCPQ__ClassId__c !== 'undefined') {
         
          this.classTypeOptions.forEach(className => {
            if (className.value == result[0].DxCPQ__ClassId__c) {
              console.log('result1', className.value);
              this.isBundled = true;
              attribute.push({ label: className.label, value: className.value, selected: true });
              setTimeout(()=>{
                this.template.querySelector('[data-id="search"]').setupOptions(attribute);
              },500             
              )
               
            }
          })
        }
        if (typeof result[0].DxCPQ__FlowId__c !== 'undefined') {
         
          this.flowTypeOptions.forEach(flowName => {
            if (flowName.value == result[0].DxCPQ__FlowId__c) {
               this.isBundled = false;
              attribute1.push({ label: flowName.label, value: flowName.value, selected: true });
               this.template.querySelector('[data-id="object"]').setupOptions(attribute1);
            }
          })
        }
       
       
      })
      .catch(error => {
      });

    this.template.querySelector('c-modal').show();
    this.template.querySelector('c-template-related-objects').clearChildObjSelection();
    this.resetWatermarkValues();
    //  this.getSavedDocTempWatermarkData();
  }

  /**
  * Method to close the preview modal screen
  */
  closePreviewModal() {
    this.showCloneTemplate = false;
    this.editTemplate = false;
    this.showwatermarkbtn = false;
    this.showAddNewTemplate = false;
    this.showDeleteTemplate = false;
    this.previewModal = false;
    this.showTemplate = false;
    this.previewRecordId = undefined;
    this.template.querySelector('c-modal').hide();
  }

  /**
  * Method to show the delete template popup
  */
  handleDeleteTemplateHandler() {
    this.showCloneTemplate = false;
    this.editTemplate = false;
    this.showwatermarkbtn = false;
    this.showAddNewTemplate = false;
    this.showDeleteTemplate = true;
    this.previewModal = false;
    this.showTemplate = false;
    this.template.querySelector('c-modal').show();
  }

  /**
  * Method to refresh the selected template
  */
  handleRefreshTemplateHandler() {
    setTimeout(() => {
      eval("$A.get('e.force:refreshView').fire();");
    }, 100);
  }

  /**
  * Method to select the record ID to preview the template for that record ID
  * @param {Object} event
  */
  selectItemEventHandler(event) {
    this.previewRecordId = event.detail.selectedRecord.recordId;
    this.templateId = this.doctemplatedetails.Id;
    this.templatename = this.doctemplatedetails.Name;
     this.sectionToClone = event.detail.selectedRecord;
  }

  handleClone(event) {
     let sectionObj ={'sobjectType':'DxCPQ__Document_Template_Section__c'};
     sectionObj.Name = this.sectionToClone.sectionName;
     sectionObj.DxCPQ__Document_Template__c = this.templateId;
     sectionObj.DxCPQ__Section_Content__c = this.sectionToClone.recordObject.DxCPQ__Section_Content__c;
     sectionObj.DxCPQ__Type__c = this.sectionToClone.recordObject.DxCPQ__Type__c;
     
    //  this.sectionsData.forEach(res=>{
    //     if (res.DxCPQ__Type__c !== 'Header' && res.DxCPQ__Type__c !== 'Footer') {
    //       if(res.DxCPQ__Sequence__c >= this.currentSequence) {
    //         this.currentSequence = res.DxCPQ__Sequence__c;
    //       }      
    //     }
       this.sections.forEach(res=>{
        if (res.Type !== 'Header' && res.Type !== 'Footer') {
          if(res.rowCount >= this.currentSequence) {
            this.currentSequence = res.rowCount;
          }      
        }
        if(this.sectionToClone.recordObject.DxCPQ__Section_Details__c != null) {
          sectionObj.DxCPQ__Section_Details__c = this.sectionToClone.recordObject.DxCPQ__Section_Details__c;
        }
        else if(this.sectionToClone.recordObject.DxCPQ__Header_Content__c != null) {
          sectionObj.DxCPQ__Header_Content__c = this.sectionToClone.recordObject.DxCPQ__Header_Content__c;
        }
     });
     sectionObj.DxCPQ__Sequence__c = this.currentSequence+1;

     CloneTemplateSection({Recorddetails : sectionObj}).then(result=>{
       if(result) {
         const successEvent = new ShowToastEvent({
              title: 'Success',
              message: 'Section "' + result.Name + '"' + ' was Cloned',
              variant: 'success',
            });
            this.dispatchEvent(successEvent);
            const newSection = {Id: result.Id,Type: result.DxCPQ__Type__c,rowCount: result.DxCPQ__Sequence__c,sectionNameEntered: result.Name,index: this.sections.length};
            this.sections = [...this.sections, newSection];
            this.previewRecordId = undefined;
            this.template.querySelector("c-multi-lookup-component").clearPills();;
         console.log('CloneTemplateSection result ',result);
         console.log('this.sections ',this.sections);
       }
     }).catch(error=>{});
  }

  /**
  * Method to update the value of previewRecordId when the selected Record ID is removed
  * @param {Object} event
  */
  updateItemEventHandler() {
    this.previewRecordId = undefined;
  }

  /**
  * Method to edit the saved document template information 
  * @param {Object} event
  */
  handleEditSuccess(event) {
    /**
    * @description this updateTemplateDetails function is used to update
    * the class and flow selected for the template
    * Author : Reethika
    */
    updateTemplateDetails({ templateData: this.editTemp, idval: this.recordId })
    .then(result1 => { })
    .catch(error => {
        console.log('error', error);
    })
      
    const toastEvt = new ShowToastEvent({
      title: 'Success',
      message: 'Template "' + event.detail.fields.Name.value + '"' + this.popUpMessage.TEMPLATE_DESIGN_UPDATED,//'Edited Successfully',
      variant: 'Success',
    });

    this.dispatchEvent(toastEvt);
    let createdDocumentTemplateId = event.detail.id;
    let name = event.detail.fields.Name.value;
    let versionno = event.detail.fields.DxCPQ__Version_Number__c.value;
    const newDocTempEvt = new CustomEvent('docedited', {
      detail: { id: createdDocumentTemplateId, name: name, version: versionno }, bubbles: true
    });
    this.dispatchEvent(newDocTempEvt);
    this.template.querySelector('c-modal').hide();
  }

  /**
  * Method to clone the existing template in to a new template with the same data as that of the exiting one
  * @param {Object} event
  */
  cloneTemplateHandler(event) {
    const newDocTempEvt = new CustomEvent('doccreated', {
      detail: { id: event.detail.id, name: event.detail.name, templateObj: event.detail.templateObj }, bubbles: true
    });
    this.dispatchEvent(newDocTempEvt);
    const toastEvt = new ShowToastEvent({
      title: 'Success',
      message: 'Created Successfully',
      variant: 'Success',
    });
    this.dispatchEvent(toastEvt);
    this.template.querySelector('c-modal').hide();
  }

  /**
  * Method called to cancel the delete the document template action when delete template pop up opens
  */
  cancelDeleteHandler() {
    this.template.querySelector('c-modal').hide();
  }

  /**
  * Method called to delete the document template
  */
  permanantDeleteHandler() {
    deleteTemplate({ templateId: this.documenttemplaterecordid }).then(result => {
            const toastEvt = new ShowToastEvent({
        title: 'Success',
        message: 'Template ' + this.popUpMessage.TEMPLATE_DESIGN_DELETED,//'Deleted Successfully',
        variant: 'Success',
      });
      this.dispatchEvent(toastEvt);
      const delEvt = new CustomEvent('deletetemplate', {
        detail: { id: this.documenttemplaterecordid }, bubbles: true
      });
      this.dispatchEvent(delEvt);
      this.template.querySelector('c-modal').hide();
    }).catch(error => {
      console.log('error handleDeleteTemplateHandler', JSON.stringify(error));
      let tempError = error.toString();
      let errorMessage = error.message || 'Unknown error message';
      createLog({ recordId: '', className: 'templateDesignerCMP LWC Component - permanantDeleteHandler()', exceptionMessage: errorMessage, logData: tempError, logType: 'Exception' });
    })
  }

  renderedCallback() {
    this.relatedtoTypeObjChild = this.relatedtoTypeObjName;
    Promise.all([
      loadStyle(this, dxQuoteTemplate + '/dxQuoteTemplate.css'),
      loadStyle(this, dexcpqcartstylesCSS),
    ])
      .then(() => { })
      .catch(error => { console.log(error.body.message); });
  }

  /**
  * Method called to save the document template sections in the same sequence they are arranged on the UI
  */
  handleSubmit() {
    var allRecords = [];
    this.sections.forEach(function (val) {
      var Recorddetails = { Name: '', DxCPQ__Sequence__c: 0, DxCPQ__Type__c: '', Id: '' };
      Recorddetails.Id = val.Id;
      Recorddetails.Name = val.sectionNameEntered;
      Recorddetails.DxCPQ__Sequence__c = val.index;
      Recorddetails.DxCPQ__Type__c = val.Name;
      allRecords.push(Recorddetails);
    });
    this.isLoaded = true;
    saveDocumentTemplateSectionSequences({ allSectionRecords: allRecords })
      .then(result => {
        if (result != null) { this.isLoaded = false; }
      })
      .catch(error => {
        this.isLoaded = false;
        let tempError = error.toString();
        let errorMessage = error.message || 'Unknown error message';
        createLog({ recordId: '', className: 'templateDesignerCMP LWC Component - handleSubmit()', exceptionMessage: errorMessage, logData: tempError, logType: 'Exception' });
      })
  }

  /**
  * Method assigns the Sections sequence after the drag and drop action is completed
  */
  processRowNumbers() {
    const trs = this.template.querySelectorAll(".myIndex");
    const ids = this.template.querySelectorAll(".myId");
    for (let i = 0; i < trs.length; i++) {
      let currentRowId = ids[i].innerText;
      let currentRowRef = this.sectionMap.get(currentRowId);
      currentRowRef.index = i;
      currentRowRef.rowCount = i + 1;
      this.sectionMap.set(currentRowId, currentRowRef);
      trs[i].innerText = i;
    }
    this.sections = Array.from(this.sectionMap.values());
    this.handleSubmit();
  }
  /**
 * Method called when the onDragStart action is performed, this method assigns the necessary attributes to the event evt
 * @param {Object} evt
 */
  onDragStart(evt) {
    this.dragMap = new Map();
    let eventRowDataId = evt.currentTarget.dataset.dragId;
    evt.dataTransfer.setData("dragId", eventRowDataId);
    evt.dataTransfer.setData("sy", evt.pageY);
    evt.dataTransfer.effectAllowed = "move";
    evt.currentTarget.classList.add("grabbed");
    if (this.dragMap.has(eventRowDataId)) {
      this.dragMap.forEach((value) => value.classList.add("grabbed"));
    }
  }
  /**
  * Method called when the dragOver action is performed, this method assigns the dropEffect
  * @param {Object} evt
  */
  onDragOver(evt) {
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "move";
  }

  /**
  * Method to restack the created sections in a document template
  * @param {Object} evt
  */
  onDrop(evt) {
    evt.preventDefault();
    let sourceId = evt.dataTransfer.getData("dragId");
    const sy = evt.dataTransfer.getData("sy");
    const cy = evt.pageY;

    if (sy > cy) {
      if (this.dragMap.has(sourceId)) {
        Array.from(this.dragMap).reverse().forEach(element => {
          let key = element[0];
          const elm = this.template.querySelector(`[data-drag-id="${key}"]`);
          if (!!elm) {
            elm.classList.remove("grabbed");
          }
          evt.currentTarget.parentElement.insertBefore(elm, evt.currentTarget);
        });
      } else {
        const elm = this.template.querySelector(`[data-drag-id="${sourceId}"]`);
        if (!!elm) {
          elm.classList.remove("grabbed");
        }
        evt.currentTarget.parentElement.insertBefore(elm, evt.currentTarget);
      }
    } else {
      if (this.dragMap.has(sourceId)) {
        this.dragMap.forEach((key) => {
          const elm = this.template.querySelector(`[data-drag-id="${key}"]`);
          if (!!elm) {
            elm.classList.remove("grabbed");
          }
          evt.currentTarget.parentElement.insertBefore(
            elm,
            evt.currentTarget.nextElementSibling
          );
        });
      } else {
        const elm = this.template.querySelector(`[data-drag-id="${sourceId}"]`);
        if (!!elm) {
          elm.classList.remove("grabbed");
        }
        evt.currentTarget.parentElement.insertBefore(
          elm,
          evt.currentTarget.nextElementSibling
        );
      }
    }
    this.processRowNumbers();
  }



  //code added by Bhavya for Watermark
  /**
  * Method to display the Watermark Screen when "Watermark Settings" button is clicked on Edit Screen
  */
  handleWatermarkSettings() {
    this.editTemplate = false;
    this.showwatermarkbtn = true;
    this.getSavedDocTempWatermarkData();
    //this.generateCanvas();

  }

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
      autofit: 'autofit',
      imagescaling: 'imageScalingValue',
      textPrimary: "checkedValText",
      imagePrimary: "checkedValImage",
      opacityImage: "opacityImageValue"
    };

    if (fieldMap[fieldName]) {
      this[fieldMap[fieldName]] = value;
    }
        if (this.activeTab == 'Text') {
      this.generateCanvas();
    }
    else {
      this.drawOnCanvas(this.imageUrl);
    }
  }

  /**
    * Method to store the clicked tab name in the variable called "activeTab"
    * @param {Object} event
    */
  handleTabChange(event) {
    this.activeTab = event.currentTarget.dataset.name;
    if (this.activeTab == 'Image' && this.imageOriginalImage != '' && this.callImage == 0) {
      this.getSavedDocTempWatermarkData();
      this.callImage++;
    }
  }

  /**
    * Method to create the image of the text watermark for the given user inputs
    * @param {Object} event
    */
  generateCanvas() {
    try{
        const canvas = this.template.querySelector('canvas');
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        if (this.rotationValue !== this.previousRotationValue) {
          context.translate(canvas.width / 2, canvas.height / 2);
          context.rotate((this.rotationValue - this.previousRotationValue) * Math.PI / 180);
          context.translate(-canvas.width / 2, -canvas.height / 2);
          this.previousRotationValue = this.rotationValue;
        }
        context.globalAlpha = this.opacityValue;
        context.font = this.fontSizeValue + 'px Arial';
        let textWidth = context.measureText(this.watermarkText).width;
        context.fillStyle = this.colorValue;
        context.fillText(this.watermarkText, (canvas.width/2 - textWidth/2), canvas.height / 2);
    } catch(error){
      console.log('error while getting canvas line 1193 templatedesignerCMP --> ', error);
    } 
  }

  /**
  * Method to handle rotation values for Text and Image Watermarks seperately
  * Once the rotation values are captured then the respective canvas drawing methods are called to update the final output for the captured rotation values
  * @param {Object} event
  */
  handleRotationChange(event) {
        let slectedRotation = event.currentTarget.dataset.type;
    if (slectedRotation == 'Text') {
      this.rotationValue = event.target.value;
      this.outerDabba = `transform: rotate(${this.rotationValue}deg);`;
      this.generateCanvas();
    }
    else if (slectedRotation == 'Image') {
      this.rotationImagevalue = event.target.value;
      this.outerDabba = `transform: rotate(${this.rotationImagevalue}deg);`;
      this.drawOnCanvas(this.imageUrl);
    }
  }

  /**
   * Method to save the created Text & Image watermarks for the user given inputs
   * Once the images drawn in both cases - text & image are saved then their contentversion IDs are captured and using the updateRecord the Watermark_Data__c field on Document_Template__c object is updated based on the selected ID
   */

  handleWaterMarkSave() {
    try{
      let canvasText = this.template.querySelector('.canvasText');
      if (canvasText && this.watermarkText !== '') {
        let dataURLText = canvasText.toDataURL();
        this.baseDataLst.push({ 'text': dataURLText.split(',')[1], title:'Text' });
      }

      let canvasImage = this.template.querySelector('.canvasImage');
      if (canvasImage && this.imageUrl) {
        let dataURLImage = canvasImage.toDataURL();
        this.baseDataLst.push({ 'Image': dataURLImage.split(',')[1], title:'Image' });
      }
    }
    catch(error){
      console.log('error while getting canvas line 1230 templatedesignerCMP --> ', error);
    }

    const originalImageMap = this.baseDataLst.find(entry => entry.title === 'OriginalImg');
    this.hasOriginalImage = originalImageMap != undefined ? true : false;
    if(this.baseDataLst.length > 0){
      saveContentVersion({ title: "WatermarkImage", base64DataList: this.baseDataLst, templateId: this.documenttemplaterecordid, wtImage : this.hasOriginalImage })
      .then(result => {
                this.imageSavedId = result;
        const fields = {};
        this.baseDataLst =[];
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
          originalImageCVId: this.originalImageCvId
        };
        fields[DOCUMENTTEMPLATEID_FIELD.fieldApiName] = this.documenttemplaterecordid;
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
            this.previousImgRotationValue = '0';
            //resetting previous Text Totation & Image Rotation values
            this.previousRotationValue = '0';
            this.showwatermarkbtn = false;
            this.fontSizeValue = '22';
            this.opacityValue = '1.0';
            this.watermarkText = '';
            this.colorValue = '';
            this.rotationValue = '0';
            this.checkedValText = true;
            this.checkedValImage = false;
            this.pageTextOption = 'All Pages - Text';
            this.pageImageOption = 'All Pages -  Image';
            this.imageScalingValue = '100';
            this.rotationImagevalue = '0';
            this.opacityImageValue = '1.0';
            this.callImage = 0;
            this.updateCheckedValue(this.pageTextOption, this.watermarkPageOptionsText);
            this.updateCheckedValue(this.pageImageOption, this.watermarkPageOptionsImage);
            this.imageUrl =  '';
            this.template.querySelector('c-modal').hide();
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
  handleWaterMarkCancel() {
    this.showwatermarkbtn = false;
    this.previousImgRotationValue = '0';
    this.editTemplate = true;
    this.fontSizeValue = '22';
    this.colorValue = '#000000';
    this.watermarkText = '';
    this.opacityValue = '1.0';
    this.rotationValue = '0';
    this.checkedValText = true;
    this.checkedValImage = false;
    this.rotationImagevalue = '0';
    this.opacityImageValue = '1.0';
    this.imageScalingValue = '100';
    this.activeTab = '';
    this.previousRotationValue = '0';
    this.previousImgRotationValue = '0';
    this.callImage = 0;
  }

  /**
  * Method to catch the data of the uploaded image files 
  * @param {Object} event
  */
  handleUploadFinished(event) {
this.previousRotationValue = '0';
    this.previousImgRotationValue = '0';
    this.imageScalingValue = '0';
    const file = event.target.files[0];
this.resetImageWatermarkFields();
    const reader = new FileReader();
    reader.onload = () => {
      this.imageUrl = reader.result;
      try {
        this.drawOnCanvas(this.imageUrl).then(() => {
          this.baseDataLst = [];
          let canvasImage = this.template.querySelector('.canvasImage');
          if (canvasImage && this.imageUrl) {
            let dataURLImage = canvasImage.toDataURL();
            this.baseDataLst.push({ 'OriginalImg': dataURLImage.split(',')[1], title: 'OriginalImg' });
          }
        });
      }
      catch (error) {
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
      try {
        const canvas = this.template.querySelector('.canvasImage');
        const ctx = canvas.getContext('2d');
        const image = new Image();
        image.src = imageUrl;
        image.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          if (this.rotationImagevalue !== this.previousImgRotationValue) {
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((this.rotationImagevalue - this.previousImgRotationValue) * Math.PI / 180);
            ctx.translate(-canvas.width / 2, -canvas.height / 2);
            this.previousImgRotationValue = this.rotationImagevalue;
          }
          ctx.globalAlpha = this.opacityImageValue;
          let imgwidth = this.imageScalingValue == 0 ? image.width : image.width * (this.imageScalingValue / 100);
          let imgheight = this.imageScalingValue == 0 ? image.height : image.height * (this.imageScalingValue / 100);
          ctx.drawImage(image, (canvas.width - imgwidth) / 2, (canvas.height - imgheight) / 2, this.imageScalingValue == 0 ? image.width : image.width * (this.imageScalingValue / 100), this.imageScalingValue == 0 ? image.height : image.height * (this.imageScalingValue / 100));
          resolve();
        };
      }
      catch (error) {
        console.log('error while getting canvas line 1387 templatedesignerCMP --> ', error);
      }

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

  /**
  * Method to get the already saved watermark data from apex and assign them to the respective variables
  */
  getSavedDocTempWatermarkData() {
    try{
      getDocumentTemplateData({ templateId: this.recordId }).then(result => {
        if (result != null) {
          
          let savedWaterMarkData = JSON.parse(result.DxCPQ__Watermark_Data__c);
        if(this.activeTab == ''){
          this.fontSizeValue = savedWaterMarkData[0].fontsize;
          this.opacityValue = savedWaterMarkData[0].opacity;
          this.checkedValText = savedWaterMarkData[0].isPrimary;
          this.pageTextOption = savedWaterMarkData[0].pageTextOption;
          this.watermarkText = savedWaterMarkData[0].textVal;
          this.colorValue = savedWaterMarkData[0].color;
          this.rotationValue = savedWaterMarkData[0].rotation;
          this.updateCheckedValue(this.pageTextOption, this.watermarkPageOptionsText);
          this.rotationImagevalue = savedWaterMarkData[1].rotation;
          this.imageScalingValue = savedWaterMarkData[1].imageScale;
          this.pageImageOption = savedWaterMarkData[1].pageImageOption;
          this.checkedValImage = savedWaterMarkData[1].isPrimary;
          this.opacityImageValue = savedWaterMarkData[1].opacity;
          let imageOriginalImage = savedWaterMarkData[1].originalImageCVId;
          this.prevoriginalImageCvId = savedWaterMarkData[1].originalImageCVId;
          this.updateCheckedValue(this.pageImageOption, this.watermarkPageOptionsImage);
          }
          if(this.activeTab == 'Text'){
            this.fontSizeValue = savedWaterMarkData[0].fontsize;
            this.opacityValue = savedWaterMarkData[0].opacity;
            this.checkedValText = savedWaterMarkData[0].isPrimary;
            this.checkedValImage = !this.checkedValText;
            this.pageTextOption = savedWaterMarkData[0].pageTextOption;
            this.watermarkText = savedWaterMarkData[0].textVal;
            this.colorValue = savedWaterMarkData[0].color;
            this.rotationValue = savedWaterMarkData[0].rotation;
            this.updateCheckedValue(this.pageTextOption, this.watermarkPageOptionsText);
          this.generateCanvas();
}
          else if(this.activeTab == 'Image'){
            this.rotationImagevalue = savedWaterMarkData[1].rotation;
            this.imageScalingValue = savedWaterMarkData[1].imageScale;
            this.pageImageOption = savedWaterMarkData[1].pageImageOption;
            this.checkedValImage = savedWaterMarkData[1].isPrimary;
            this.checkedValText = !this.checkedValImage;
            this.opacityImageValue = savedWaterMarkData[1].opacity;
            let imageOriginalImage = savedWaterMarkData[1].originalImageCVId;
            this.prevoriginalImageCvId = savedWaterMarkData[1].originalImageCVId;
            this.updateCheckedValue(this.pageImageOption, this.watermarkPageOptionsImage);
            //displaying the image watermark - original image on canvas
            if(imageOriginalImage != ''){
              getOriginalImageCVID({ contentVersionId : imageOriginalImage }).then(result => {
                if (result != null) {
                  this.contentVersion = result;
                  this.imageUrl = 'data:image/png;base64,' + this.contentVersion;
                  this.drawOnCanvas(this.imageUrl).then(() => {});
                }
              }).catch(error => {
                console.log('error activation', error);
              })
            }
          }
        }
      }).catch(error => {
        console.log('error activation', error);
      })
    } catch(error) {
      console.log('error' + error);
    }
  }

/**
  * Method to show up the Template/Watermark help document
  * @param {Object} event
  */
  handlehelp(event){
    let relatedObjectsMap = this.pdfLinksData.find(item => item.MasterLabel === event.currentTarget.dataset.val);
    let pdfUrl = relatedObjectsMap ? relatedObjectsMap.DxCPQ__Section_PDF_URL__c : null;
     const config = {
      type: 'standard__webPage',
      attributes: {
        url: pdfUrl
      }
    };
    this[NavigationMixin.Navigate](config);
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
    this.color = '#000000';
    this.rotationValue = '0';
    this.rotationImagevalue = '0';
    this.imageScalingValue = '100';
    this.checkedValText = true;
    this.watermarkText = '';
    this.callImage = 0;
    this.checkedValImage = false;
    this.imageUrl =  '';
    this.showPageProperties = false;
  }

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
    this.imageScalingValue = '100';
    this.opacityImageValue = '1.0';
    this.rotationImagevalue = '0';
    this.pageImageOption = 'All Pages - Image';
    this.callImage = 0;
    this.imageUrl =  '';
    this.updateCheckedValue(this.pageTextOption, this.watermarkPageOptionsText);
    this.updateCheckedValue(this.pageImageOption, this.watermarkPageOptionsImage);
  }

  /**
   * @description this handleClassselection event is used to get
   * the id of the class selected
   * Author : Reethika
   */
  handleClassselection(event) {
    this.classIdData = event.detail.values;
    this.editTemp.classId = this.classIdData[0];
    if (this.classIdData.length === 0) {
      this.editTemp.classId = ' ';
    }
  }

  /**
   * @description this handleClassselection event is used to get
   * the durableid of the flow selected
   * Author : Reethika
   */
  handleFlowselection(event) {
    this.flowIdData = event.detail.values;
    this.editTemp.flowId = this.flowIdData[0];
    if (this.flowIdData.length === 0) {
      this.editTemp.flowId = ' ';
    }
  }
     
  /**
  * @description this handleRelationshipType event is used to get
  * whether the flow is selected or class is selected
  * Author : Reethika
  */
  handleRelationshipType(event){
    this.isBundled= event.target.checked;
      this.editTemp.flowId = ' ';
        this.editTemp.classId = ' ';
  }

  //code added by Bhavya for translate screen
  
  handleTranslate(event) {
      this.extractedWords = [];
      //this.extractWords();
      this.isTranslateModalOpen = true;
      this.template.querySelector('c-modal[data-id="translation"]').show();

      currectUserLang()
      .then(result => {
        this.selectedLanguage = this.getLanguageValueByLabel(result); // Set the default value to English
        this.transRecordsRetrive();
      })
      .catch(error => {
        console.log('Error--',error.message);
        let errorMessage = error.message || 'Unknown error message';
        let tempError = error.toString();
        createLog({ recordId: '', className: 'TemplateContentDetails LWC Component - connectedCallback()', exceptionMessage: errorMessage, logData: tempError, logType: 'Exception' });
      });
  }

  getLanguageValueByLabel(label) {
    const language = this.languages.find(lang => lang.label === label);
    return language ? language.value : null;
  }

  //code added by Bhavya for extracting the merge fields along with the tokens
  // extractWords(){
  //   let decodedRichtextVal = this.richtextVal.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  //   let regex = /<<([^>]+?)>>|({![^}]+?})/g;
  //   let m;
  //   while ((m = regex.exec(decodedRichtextVal)) !== null) {
  //     if (m.index === regex.lastIndex) {
  //       regex.lastIndex++;
  //     }
  //     if (m[1]) {
  //       this.extractedWords.push(m[1]);
  //     } else if (m[2]) {
  //       this.extractedWords.push(m[2]);
  //     }
  //   }
  //   console.log('this.extractedWords after extractwords ----> ', this.extractedWords);
  // }

  transRecordsRetrive(){
    selectedLangMethod({language : this.selectedLanguage, extractedWords : JSON.stringify(this.extractedWords), docTempId : this.recordId })
          .then(result => {
          if (result && result.length > 0) {
            this.translatedRecords = [];
            this.transRecordNameArray = [];
              result.forEach(record => {
                  // Iterate over each record and push it into translatedRecords array
                  this.transRecordNameArray.push(record.Name);
                  this.translatedRecords.push({
                      'Name': record.Name,
                      'DxCPQ__FieldValue__c': record.DxCPQ__FieldValue__c,
                      'DxCPQ__Translated_Value__c': record.DxCPQ__Translated_Value__c,
                      'Id': record.Id
                  });
              });
              // if(this.transRecordNameArray.length != this.extractedWords.length){
              //   this.extractedWords.forEach((extraxtElem) => {
              //   if(!this.transRecordNameArray.includes(extraxtElem)){
              //     this.translatedRecords.push({
              //       'Name': extraxtElem,
              //       'DxCPQ__FieldValue__c': '',
              //       'DxCPQ__Translated_Value__c': '',
              //       'Id':''
              //     });
              //   }})
              // }
              // else{
              //   //code for when this.transRecordNameArray & this.extractedwords are of same length
              //   this.extractedWords.forEach(word => {
              //   if (!this.transRecordNameArray.includes(word)) 
              //   {
              //     this.transRecordNameArray.push(word);
              //     this.translatedRecords.push({
              //       'Name': word,
              //       'DxCPQ__FieldValue__c': '',
              //       'DxCPQ__Translated_Value__c': '',
              //       'Id':''
              //     });
              //   }
              //   });
              // }
              //this.selectedLanguage = this.translatedRecords[0].DxCPQ__Language__c;
          } 
          else {
            this.translatedRecords = [];
            // if(this.extractedWords.length>0){
            //   this.extractedWords.forEach((extraxtElem) => {
            //   this.translatedRecords.push({
            //     'Name': extraxtElem,
            //     'DxCPQ__FieldValue__c': '',
            //     'DxCPQ__Translated_Value__c': '',
            //     'Id': ''
            //     });
            //   })
            // } else {
              this.translatedRecords = this.dataArray;
            // }
          }
          this.originalData = JSON.parse(JSON.stringify(this.translatedRecords));
          console.log('this.originalData 1017--? ', this.originalData);
          })
          .catch(error => {
            let errorMessage = error.message || 'Unknown error message';
            let tempError = error.toString();
            createLog({ recordId: '', className: 'TemplateContentDetails LWC Component - connectedCallback()', exceptionMessage: errorMessage, logData: tempError, logType: 'Exception' });
          });
  }

  handleClick() {
  const newDataArray = {
          'Name': '',
          'DxCPQ__FieldValue__c': '',
          'DxCPQ__Translated_Value__c': '',
          'Id' : this.uniqueIdentifier
      };
      this.translatedRecords.push(newDataArray);
  }

  handleRemoveRow(event) {
      event.preventDefault();
      const indexVal = event.target.dataset.index;
      var id = this.translatedRecords[indexVal].Id;
      var regex = /^([a-zA-Z0-9_-]){18}$/;

      if(regex.test(id)){
          deleteMethod({deleteRecordId : id })
          .then(result => {
            if(result){
              this.translatedRecords.splice(indexVal, 1);
              this.translatedRecords = [...this.translatedRecords];
              this.showToast('Success', 'Record deleted successfully', 'success'); 
            }else{
              this.showToast('Error', 'Error in deleting records, please check the logs', 'error');
            }    
          }).catch(error => {
            this.showToast('Error', 'An error occurred while deliting the record', 'error');   
            let errorMessage = error.message || 'Unknown error message';
            let tempError = error.toString();
            createLog({ recordId: '', className: 'TemplateContentDetails LWC Component - connectedCallback()', exceptionMessage: errorMessage, logData: tempError, logType: 'Exception' });
          });
      }else{
          this.translatedRecords.splice(indexVal, 1);
          this.translatedRecords = [...this.translatedRecords];
      }
      this.originalData = JSON.parse(JSON.stringify(this.translatedRecords));
      console.log('this.originalData 1071--? ', this.originalData);
  }

  handleLanguageChange(event) {
    this.selectedLanguage = event.detail.value;
    this.transRecordsRetrive();
  }

  handleCellOneInputChange(event) {
    const indexVal = parseInt(event.target.dataset.index);
    // Check if indexVal is valid
    if (isNaN(indexVal) || indexVal < 0 || indexVal >= this.translatedRecords.length) {
      console.error('Invalid index:', indexVal);
      return;
    } 
    this.translatedRecords[indexVal].Name = event.target.value; 
    this.originalData = JSON.parse(JSON.stringify(this.translatedRecords));
    console.log('this.originalData 1088--? ', this.originalData);
  }

  handleCellTwoInputChange(event) {
    const indexVal = parseInt(event.target.dataset.index);
    if(isNaN(indexVal) || indexVal<0 || indexVal >= this.translatedRecords.length){
      console.error('Invalid index:', indexVal);
      return;
    }
    this.translatedRecords[indexVal].DxCPQ__FieldValue__c = event.target.value; 
    this.originalData = JSON.parse(JSON.stringify(this.translatedRecords));
    console.log('this.originalData 1099--? ', this.originalData);
  }

  handleCellThreeInputChange(event) {
    const indexVal = parseInt(event.target.dataset.index);
    if(isNaN(indexVal) || indexVal<0 || indexVal >= this.translatedRecords.length){
      console.error('Invalid index:', indexVal);
    }
    this.translatedRecords[indexVal].DxCPQ__Translated_Value__c = event.target.value; 
    this.originalData = JSON.parse(JSON.stringify(this.translatedRecords));
    console.log('this.originalData 1109--? ', this.originalData);
  }

  updateTranslatedValues(list) {
     list.forEach(function(item) {
        if (!(item.Name.startsWith('{!') && item.Name.endsWith('}'))) {
            if (!item.TranslatedValue) {
                item.TranslatedValue = item.Name;
            }
            if (!item.FieldValue) {
                item.FieldValue = item.Name;
            }
        }
    });
    return list;
  }

  handleClickCancel(){
    this.template.querySelector('c-modal').hide();
  }

  handleSave() {
    this.translatedRecords.forEach(record => {
      if (record.Name === null || record.Name === '') {
        this.showToast('Error','Some of the row(s) Name has no values','error');
      }
    });

    let fieldNameRequire = true;
    this.translatedRecords.forEach(record => {
      if (!record.Name) {
        fieldNameRequire = false;
      }
    });

    if(fieldNameRequire){
      this.translatedRecords.forEach(record => {
        // Rename DxCPQ__FieldValue__c to FieldValue
        if (record.hasOwnProperty('DxCPQ__FieldValue__c')) {
          record.FieldValue = record['DxCPQ__FieldValue__c'];
          delete record['DxCPQ__FieldValue__c'];
        }
        
        // Rename DxCPQ__Translated_Value__c to TranslatedValue
        if (record.hasOwnProperty('DxCPQ__Translated_Value__c')) {
          record.TranslatedValue = record['DxCPQ__Translated_Value__c'];
          delete record['DxCPQ__Translated_Value__c'];
        }
      });
      let updatedStrLst = this.updateTranslatedValues(this.translatedRecords);
      console.log('Updated translatedRecords:', updatedStrLst);

      createUpdateMethod({ 
        jsonStringData: JSON.stringify(updatedStrLst), 
        language: this.selectedLanguage,
        docTemplateId: this.recordId
      })
      .then(result => {
        this.showToast('Success', 'Record saved successfully', 'success'); 
        this.isTranslateModalOpen = false;
        this.translatedRecords = [];
      })
      .catch(error => {
        this.showToast('Error', 'An error occurred while saving the record', 'error');
        let errorMessage = error.message || 'Unknown error message';
        let tempError = error.toString();
        createLog({ recordId: '', className: 'TemplateContentDetails LWC Component - connectedCallback()', exceptionMessage: errorMessage, logData: tempError, logType: 'Exception' });});
      }

      /* else{
        this.showToast('Error', 'Please fill Field Names in all rows', 'error');
      } */
      this.template.querySelector('c-modal[data-id="translation"]').hide();
    }
    
  
  showToast(title, message, variant) {
    const toastEvent = new ShowToastEvent({
        title: title,
        message: message,
        variant: variant
    });
    this.dispatchEvent(toastEvent);
  }

  closeTranslateModal() {
      if(this.isTranslateModalOpen){
        this.translatedRecords = [];
        this.transRecordNameArray = [];
        this.extractedWords = [];
        this.isTranslateModalOpen = false;
      }
      this.template.querySelector('c-modal[data-id="translation"]').hide();
  }

  handleTranslationsSearch(event){
    let searchTerm = event.target.value.toLowerCase();
    if (searchTerm) {
      this.translatedRecords = this.originalData.filter(record => {
          return Object.values(record).some(value =>
              value && value.toLowerCase().includes(searchTerm)
          );
      });
    } else {
      this.translatedRecords = [...this.originalData];
    }
    console.log('this.data inside handleImportTranslationsSearch --> ', this.data);
  }

  //code added by Bhavya for Import Translations
  handleImportTranslation(event){
    this.template.querySelector('c-modal').hide();
    this.template.querySelector('c-modal[data-id="translation"]').hide();
    this.showTranslations = true;
    this.template.querySelector('c-modal[data-id="importTranslation"]').show();
  }

  get acceptedFormats() {
    return ['.csv','.xlsx'];
  }

  handleCreateTranslations(){
    console.log('handleCreateTranslations clicked --> ');
    if (this.translatedRecords.length === 0) {
      console.error('No records to insert');
      return;
    }
    this.showLoadingSpinner = true
    insertTranslatedRecords({ translatedRecords: this.translatedRecords })
    .then(result => {
        if (result) {
          console.log('Records inserted successfully');
          this.showToastMsg('Success', 'Translations saved successfully!', 'success');
          this.template.querySelector('c-modal[data-id="importTranslation"]').hide();
          this.template.querySelector('c-modal[data-id="translation"]').show();
          this.showTranslations = false;
          this.showLoadingSpinner = false;
          this.data = [];
        } else {
          console.error('Failed to insert records');
          this.showToastMsg('Error', 'Error saving translations. Please Contact Administrator.', 'Error');
          this.showLoadingSpinner = false;
        }
    })
    .catch(error => {
        console.error('Error inserting records:', error);
        this.showToastMsg('Error', 'Error saving translations. Please Contact Administrator.', 'Error');
        this.showLoadingSpinner = false;
    });
  }

  handleCloseImportTranslations(){
    this.template.querySelector('c-modal[data-id="importTranslation"]').hide();
    this.template.querySelector('c-modal[data-id="translation"]').show();
    this.showTranslations = false;
    this.data = [];
  }

  handleFileUpload(event) {
    let file = event.target.files[0];
    if (file && file.type === 'text/csv') {
        let reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                let csv = e.target.result;
                this.parseCSV(csv);
                this.createTranslatedRecords();
            } catch (error) {
                console.error('Error parsing CSV:', error);
                this.showToastMsg('Error', 'CSV file is broken. Cannot view it.', 'Error');
            }
        };
        
        reader.onerror = (error) => {
            console.error('Error reading file:', error);
            this.showToastMsg('Error', 'Failed to read the file. Please try again.', 'Error');
        };
        
        reader.readAsText(file);
    } else {
        console.error('Please upload a valid CSV file.');
        this.showToastMsg('Error', 'Please upload a valid CSV file.', 'Error');
    }
  }

parseCSV(csv) {
    const lines = csv.split('\n');

    const parseLine = (line) => {
        const result = [];
        let inQuotes = false;
        let value = '';
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(value.trim());
                value = '';
            } else {
                value += char;
            }
        }
        result.push(value.trim());
        return result;
    };

    if (lines.length > 0) {
        const headers = parseLine(lines[0]);
        const headerMap = {};
        headers.forEach((header, index) => {
            headerMap[header.trim()] = index;
        });
        this.columns = headers;
        console.log('columns --> ', this.columns);
        this.data = lines.slice(1).map(line => parseLine(line));
        let emptyNameRows = [];
        let translatedValueWithoutLanguageRows = [];

        // Filter out rows where all columns are null or empty
        this.data = this.data.filter(row => row.some(cell => cell.trim() !== ''));

        this.data.forEach((row, index) => {
            const rowNumber = index + 2; // Adjust row number for error messages
            const nameIndex = headerMap['Name'];
            const languageIndex = headerMap['DxCPQ__Language__c'];
            const translatedValueIndex = headerMap['DxCPQ__Translated_Value__c'];

            if (!row[nameIndex]) {
                emptyNameRows.push(rowNumber);
            }
            if (row[translatedValueIndex] && !row[languageIndex]) {
                translatedValueWithoutLanguageRows.push(rowNumber);
            }
        });

        this.errorMessages = [];

        if (emptyNameRows.length > 0) {
            this.errorMessages.push(`Rows ${emptyNameRows.join(', ')}: Name is empty. Please check the CSV file and re-upload.`);
        }

        if (translatedValueWithoutLanguageRows.length > 0) {
            this.errorMessages.push(`Rows ${translatedValueWithoutLanguageRows.join(', ')}: Translated Value is present without Language. Please check the CSV file and re-upload.`);
        }

        if (this.errorMessages.length > 0) {
            this.disableCreate = true;
            this.showToastMsg('Error', this.errorMessages.join(' '), 'Error');
            this.data = [];
        } else {
            this.disableCreate = false;
            this.data = this.data.filter(row => row.length > 1 && row[headerMap['Name']] !== "");
        }
        console.log('this.data in parseCSV  ---> ', this.data);
    }
}



createTranslatedRecords() {
    const headers = this.columns;
    const headerMap = {};
    headers.forEach((header, index) => {
        headerMap[header.trim()] = index;
    });

    this.translatedRecords = this.data.map(row => {
        return {
            'Name': row[headerMap['Name']] ? row[headerMap['Name']].trim() : '',
            'DxCPQ__FieldValue__c': row[headerMap['DxCPQ__FieldValue__c']] ? row[headerMap['DxCPQ__FieldValue__c']].trim() : '',
            'DxCPQ__Translated_Value__c': row[headerMap['DxCPQ__Translated_Value__c']] ? row[headerMap['DxCPQ__Translated_Value__c']].trim() : '',
            'DxCPQ__Language__c': row[headerMap['DxCPQ__Language__c']] ? this.getLanguageCode(row[headerMap['DxCPQ__Language__c']].trim()) : '',
            'DxCPQ__DocumentTemplate__c': this.recordId
        };
    });
    console.log('this.translatedRecords list inside createTranslatedRecords fn ---> ', this.translatedRecords);
}


  getLanguageCode(language) {
    return this.languageMap[language] || '';
  }

  showToastMsg(title, msg, variant){
    const event4 = new ShowToastEvent({
      title: title,
      message: msg,
      variant: variant,
    });
    this.dispatchEvent(event4);
  }

  //   handleTextTranslateLanguage(event) {
  //   let translationIndex = event.currentTarget.dataset.index;
  //   // console.log('translationIndex ' + translationIndex);
  //   // console.log(' this.translatedRecords[translationIndex] ' + this.translatedRecords[translationIndex].DxCPQ__FieldValue__c);
  //   // console.log('selected lang ' + this.selectedLanguage);

  //   if (this.translatedRecords[translationIndex].DxCPQ__FieldValue__c) {
  //     getTranslatedText({
  //       textToTranslate: this.translatedRecords[translationIndex].DxCPQ__FieldValue__c,
  //       targetLanguage: this.selectedLanguage
  //     })
  //       .then(result => {
  //         //alert(result);
  //         if (result != 'Error in getting Translated Text') {
  //           let data = JSON.parse(result);
  //           this.translatedRecords[translationIndex].DxCPQ__Translated_Value__c = data.translations[0].translatedText;
  //         }
  //       })
  //       .catch(error => {
  //         this.showToast('Error', 'An error occurred', 'error');
  //         let errorMessage = error.message || 'Unknown error message';
  //         let tempError = error.toString();
  //         createLog({ recordId: '', className: 'TemplateDesigner LWC ', exceptionMessage: errorMessage, logData: tempError, logType: 'Exception' });
  //       });
  //   }
  //   // else if(!(this.translatedRecords[translationIndex].Name.startsWith('{!').endsWith('}').includes('.'))) {
  //   else if (this.translatedRecords[translationIndex].Name) {

  //     getTranslatedText({
  //       textToTranslate: this.translatedRecords[translationIndex].Name,
  //       targetLanguage: this.selectedLanguage
  //     })
  //       .then(result => {
  //         if (result != 'Error in getting Translated Text') {
  //           let data = JSON.parse(result);
  //           console.log(data);
  //           this.translatedRecords[translationIndex].DxCPQ__Translated_Value__c = data.translations[0].translatedText;
  //         }
  //         else {
  //           alert('Error in getting Translalted text data');
  //         }
  //       })
  //       .catch(error => {
  //         this.showToast('Error', 'An error occurred', 'error');
  //         let errorMessage = error.message || 'Unknown error message';
  //         let tempError = error.toString();
  //         createLog({ recordId: '', className: 'TemplateDesigner LWC ', exceptionMessage: errorMessage, logData: tempError, logType: 'Exception' });
  //       });
  //   }

  // }


  // handleTextListTranslateLanguage(event) {
  //   let textsToTranslate = [];
  //   this.translatedRecords.forEach(record => {
  //     if (record.DxCPQ__FieldValue__c) {
  //       textsToTranslate.push(record.DxCPQ__FieldValue__c);
  //     } else if (record.Name) {
  //       textsToTranslate.push(record.Name);
  //     }
  //   });

  //   //console.log('texts to translate ' + textsToTranslate);

  //   if (textsToTranslate.length > 0) {

  //     translateTextBatchList({
  //       textsToTranslate: textsToTranslate,
  //       selectedLanguage: this.selectedLanguage,
  //       templateId : this.documenttemplaterecordid
  //     })
  //       .then(result => {
  //         this.showToast('Success', 'Translation is in progress. Please check back after some time', 'success');
  //         this.template.querySelector('c-modal').hide();
  //         this.template.querySelector('c-modal[data-id="translation"]').hide();

  //       })
  //       .catch(error => {
  //         this.showToast('Error', 'An error occurred', 'error');
  //         let errorMessage = error.message || 'Unknown error message';
  //         let tempError = error.toString();
  //         createLog({ recordId: '', className: 'TemplateDesignerDetails LWC ', exceptionMessage: errorMessage, logData: tempError, logType: 'Exception' });
  //       });
  //   }
  // }

  //code added by Bhavya for taking inputs from user for page, header & header properties

  handlePageProperties(event){
    console.log('handlePageProperties clicked');
    this.previewModal =  false;
    this.showTemplate = false;
    this.showCloneTemplate = false;
    this.showDeleteTemplate = false;
    this.editTemplate = false;
    this.showwatermarkbtn = false;
    this.jsonStr = this.jsonStr != null ? this.jsonStr : this.sectionsData[0].DxCPQ__Document_Template__r.DxCPQ__PDF_Page_Properties__c;
    updatePropertiesFromJSON(this, this.jsonStr);
    this.showPageProperties = true;
    this.template.querySelector('c-modal').show();
  }

  // Page Properties
    @track pageType = 'A4';
    @track pageOrientation = 'Portrait';
    @track pageMargins = {
        leftMargin: { value: 10, unit: 'px' },
        rightMargin: { value: 10, unit: 'px' },
        topMargin: { value: 10, unit: 'px' },
        bottomMargin: { value: 10, unit: 'px' },
        lineheight: {value: 1.2, unit: 'px' }
    };

    // Header Properties
    @track headerProperties = {
        height: { value: 50, unit: 'mm' },
        margins: {
            left: { value: 10, unit: 'mm' },
            right: { value: 10, unit: 'mm' },
            top: { value: 10, unit: 'mm' },
            bottom: { value: 10, unit: 'mm' }
        },
        lineHeight: { value: 10, unit: 'px' },
        borderColor: '#000000',
        // borderRadius: { value: 0, unit: 'mm' },
        borderOpacity: 1,
        borderWeight: { value: 1, unit: 'px' },
        separateBorders: []
    };

    // Footer Properties
    @track footerProperties = {
        height: { value: 80, unit: 'px' },
        margins: {
            leftMargin: { value: 10, unit: 'px' },
            rightMargin: { value: 10, unit: 'px' },
            topMargin: { value: 10, unit: 'px' },
            bottomMargin: { value: 10, unit: 'px' },
            lineHeight: {value: 1.2}
        },
        paddings:{
          topPadding:{value: 10, unit: 'px'},
          bottomPadding:{value: 10, unit: 'px'},
          leftPadding:{value: 10, unit: 'px'},
          rightPadding:{value: 10, unit: 'px'}
       },
        lineHeight: { value: 15, unit: 'px' },
        borderColor:  { value: '#000000' },
        // borderRadius: { value: 0, unit: 'px' },
        borderOpacity: 1,
        borderWeight: { value: 1, unit: 'px' },
        separateBorders: []
    };

    // Options
    get pageTypeOptions() {
      return [
        { label: 'A4', value: 'A4' },
        { label: 'Letter', value: 'Letter' },
        { label: 'Legal', value: 'Legal' }
      ];
    }

    get pageOrientationOptions() {
      return [
        { label: 'Portrait', value: 'Portrait' },
        { label: 'Landscape', value: 'Landscape' }
      ];
    }

    get unitOptions() {
      return [
        { label: 'px', value: 'px' },
        { label: 'mm', value: 'mm' },
        { label: 'cm', value: 'cm' },
        { label: 'inch', value: 'inch' },
        { label: '%', value: '%' }
      ];
    }

    get borderOptions() {
      return [
        { label: 'Top', value: 'top' },
        { label: 'Right', value: 'right' },
        { label: 'Bottom', value: 'bottom' },
        { label: 'Left', value: 'left' }
      ];
    }

    //JS code to store data of Page Settings

    handleUserInputChange(event) {
      const field = event.target.dataset.id;
      const value = event.target.value;
      const isUnitChange = field.includes('Unit');
      const marginType = field.replace('Unit', '').replace('Val', '');
      if (isUnitChange) {
          this.pageMargins[marginType].unit = value;
      } else {
          this.pageMargins[marginType].value = parseFloat(value);
      }
      console.log('pageMargins map after val changing --> ', this.pageMargins);
    }

    handleFooterInputChange(event) {
      const { value, dataset, name, type } = event.target;
      const propertyType = dataset.id || dataset.footer;
      let propName;
      let targetObject;

      if (propertyType.includes('Margin') || propertyType.includes('height') || propertyType === 'lineHeightVal' || propertyType.includes('borderWeight')) {
          if (propertyType.includes('Margin')) {
              propName = propertyType.replace('Val', '').replace('Unit', '');
              targetObject = this.footerProperties.margins[propName];
          } else if (propertyType === 'lineHeightVal') {
              targetObject = this.footerProperties.margins.lineHeight;
          } else {
              propName = propertyType.replace('Val', '').replace('Unit', '').toLowerCase();
              targetObject = this.footerProperties[propName];
          }
      } else if (propertyType === 'borderColor') {
          this.footerProperties.borderColor.value = value;
          return;
      } else if (propertyType === 'borderOpacity') {
          this.footerProperties.borderOpacity = parseFloat(value);
          return;
      }
       else if (propertyType === 'borderWeight') {
          this.footerProperties.borderWeight = parseFloat(value);
          return;
      }
      if (targetObject) {
          if (name === 'unit') {
              targetObject.unit = value;
          } else {
              targetObject.value = type === 'number' ? parseFloat(value) : value;
          }
      }
      console.log('footerProperties --> ', this.footerProperties);
  }

    @track firstHeaderProperties = {
        height: { value: '80', unit: 'px' },
        margins: { 
            leftMargin: { value: '10', unit: 'px' }, 
            rightMargin: { value: '10', unit: 'px' }, 
            topMargin: { value: '10', unit: 'px' }, 
            bottomMargin: { value: '10', unit: 'px' } 
        },
        paddings:{
           topPadding:{value: 10, unit: 'px'},
           bottomPadding:{value: 10, unit: 'px'},
           leftPadding:{value: 10, unit: 'px'},
           rightPadding:{value: 10, unit: 'px'}
        },
        lineHeight: { value: '1' },
        borderColor:  { value: '#000000' },
        bgColor:  { value: '#FFFFFF' },
        // borderRadius: { value: '0', unit: 'px' },
        borderOpacity: '1',
        borderWeight: { value: '1', unit: 'px' },
        separateBorders: []
    };

    @track secondHeaderProperties = {
        height: { value: '80', unit: 'px' },
        margins: { 
            leftMargin: { value: '10', unit: 'px' }, 
            rightMargin: { value: '10', unit: 'px' }, 
            topMargin: { value: '10', unit: 'px' }, 
            bottomMargin: { value: '10', unit: 'px' } 
        },
        paddings:{
          topPadding:{value: 10, unit: 'px'},
          bottomPadding:{value: 10, unit: 'px'},
          leftPadding:{value: 10, unit: 'px'},
          rightPadding:{value: 10, unit: 'px'}
       },
        lineHeight: { value: '1', unit: 'px' },
        borderColor:  { value: '#000000' },
        bgColor:  { value: '#FFFFFF' },
        // borderRadius: { value: '0', unit: 'px' },
        borderOpacity: '1',
        borderWeight: { value: '1', unit: 'px' },
        separateBorders: []
    };

    // unitOptions = [
    //   { label: 'px', value: 'px' },
    //   { label: '%', value: '%' },
    // ];

    borderOptions = [
      { label: 'Left Border', value: 'left' },
      { label: 'Right Border', value: 'right' },
      { label: 'Top Border', value: 'top' },
      { label: 'Bottom Border', value: 'bottom' }
    ];

  handlePropertyChange(event, targetProperties) {
    const { value, dataset, name, type } = event.target;
    const propertyType = dataset.id;
    let propName;
    let targetObject;

    if (propertyType.includes('Margin') || propertyType.includes('height')  || propertyType.includes('borderRadius') ||  propertyType.includes('borderWeight') || propertyType.includes('Padding')) {
        propName = propertyType.replace('Val', '').replace('Unit', '');
        if(propertyType.includes('Margin')){
          targetObject = targetProperties.margins[propName];
        }
        else if(propertyType.includes('Padding')){
          targetObject = targetProperties.paddings[propName];
        }
        else if(propertyType.includes('height') || propertyType.includes('borderRadius') || propertyType.includes('borderWeight') ){
          targetObject = targetProperties[propName];
        }
    } else if (propertyType === 'lineHeight') {
        targetObject = targetProperties.lineHeight;
    } else if (propertyType === 'borderWeight') {
        targetObject = targetProperties.borderWeight;
    } else if (propertyType === 'borderColor') {
        targetProperties.borderColor.value = value;
        return;
    } else if (propertyType === 'bgColor') {
      targetProperties.bgColor.value = value;
      return;
    } else if (propertyType === 'borderOpacity') {
        targetProperties.borderOpacity = parseFloat(value);
        return;
    } else {
        propName = propertyType.toLowerCase();
        targetObject = targetProperties[propName];
    }

    if (targetObject) {
        if (name === 'unit') {
            targetObject.unit = value;
        } else if (name === 'value') {
            targetObject.value = type === 'number' ? parseFloat(value) : value;
        }
    }

    console.log(`${JSON.stringify(targetProperties, null, 2)}`);
}

handleFirstHeaderPropertiesChange(event) {
    this.handlePropertyChange(event, this.firstHeaderProperties);
    console.log('firstHeaderProperties --> ', this.firstHeaderProperties);
}

handleSecondHeaderPropertiesChange(event) {
    this.handlePropertyChange(event, this.secondHeaderProperties);
    console.log('secondHeaderProperties --> ', this.secondHeaderProperties);
}
  
    handlePageTypeChange(event) {
        this.pageType = event.detail.value;
    }

    handlePageOrientationChange(event) {
        this.pageOrientation = event.detail.value;
    }

    handleMarginChange(event) {
        const margin = event.target.dataset.margin;
        this.pageMargins[margin].value = event.target.value;
    }

    handleMarginUnitChange(event) {
        const margin = event.target.dataset.margin;
        this.pageMargins[margin].unit = event.detail.value;
    }

    handleHeaderChange(event) {
        const field = event.target.dataset.header;
        const value = event.target.value;
        if (field.startsWith('border')) {
            this.headerProperties[field] = value;
        } else if (field === 'border-color') {
            this.headerProperties.borderColor = value;
        } else if (field.includes('margin')) {
            this.headerProperties.margins[field.replace('margin-', '')].value = value;
        } else {
            this.headerProperties[field].value = value;
        }
    }

    handleHeaderUnitChange(event) {
        const field = event.target.dataset.header;
        this.headerProperties[field].unit = event.detail.value;
    }

    handleHeaderBorderChange(event) {
        this.headerProperties.separateBorders = event.detail.value;
    }

    handleFooterChange(event) {
        const field = event.target.dataset.footer;
        const value = event.target.value;
        if (field.startsWith('border')) {
            this.footerProperties[field] = value;
        } else if (field === 'border-color') {
            this.footerProperties.borderColor = value;
        } else if (field.includes('margin')) {
            this.footerProperties.margins[field.replace('margin-', '')].value = value;
        } else {
            this.footerProperties[field].value = value;
        }
    }

    handleFooterUnitChange(event) {
        const field = event.target.dataset.footer;
        this.footerProperties[field].unit = event.detail.value;
    }

    handleFooterBorderChange(event) {
        this.footerProperties.separateBorders = event.detail.value;
    }

    combineValueAndUnit(valueObj) {
        return valueObj.value !== undefined && valueObj.unit ? `${valueObj.value}${valueObj.unit}` : null;
    }

    handleSavePageProperties() {
      console.log('edited values page --> ',this.pageType, this.pageOrientation, this.pageMargins);
      console.log('this.firstheaderproperties --> ', this.firstHeaderProperties);
      console.log('this.secondheaderproperties --> ', this.secondHeaderProperties);
      console.log('this.footerproperties --> ', this.footerProperties);     
      try {
        savingPageProperties(this);

      }
      catch (error) {
          console.log('error found in utils method >> ', error);
      }   
    }

    //code added by Bhavya
    handleFirstUniqueHeader(event){
      console.log('has first header --> ', event.detail);
      this.showFirstHeaderProperties = event.detail;  
    }

    handleCancelPageSettings(event){
      this.showPageProperties = false;
      this.template.querySelector('c-modal').hide();
    }

}