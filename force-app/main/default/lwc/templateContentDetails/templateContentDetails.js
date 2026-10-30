import { LightningElement, track, api, wire } from 'lwc';
import saveDocumentTemplateSectionDetails from '@salesforce/apex/SaveDocumentTemplatesection.saveDocumentTemplateSectionDetails';
import ClauseBody from '@salesforce/apex/SaveDocumentTemplatesection.ClauseBody';
import deletetemplate from '@salesforce/apex/SaveDocumentTemplatesection.deletetemplate';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import gettemplatesectiondata from '@salesforce/apex/SaveDocumentTemplatesection.gettemplatesectiondata';
import createLog from '@salesforce/apex/LogHandler.createLog';
import getSObjectListFiltering from '@salesforce/apex/RelatedObjectsClass.getSObjectListFiltering';
import createRuleCondition from '@salesforce/apex/RelatedObjectsClass.createRuleCondition';
import getConditions from '@salesforce/apex/RelatedObjectsClass.getExistingConditions';
import { getDomainUrl } from 'c/dxApexCache';
import deleteContentVersions from '@salesforce/apex/ScreenshotController.deleteContentVersions'; 
import getSearchedContentVersions from '@salesforce/apex/FooterClass.getSearchedContentVersions';
import { createRuleConditionHierarcy } from 'c/conditionUtil';
import resetRulesForTemplate from '@salesforce/apex/RelatedObjectsClass.handleTemplateRuleResetCondition';
import getContentVersions from '@salesforce/apex/FooterClass.getContentVersions';
import { copyText } from 'c/dxClipboard';
export default class TemplateContentDetails extends NavigationMixin(LightningElement) {
  @track showSectionCss = false;
  sectioncssval = '';
  //variables added by Bhavya for Resizing Image in Context Section
  @track showResizeModal = false;
  process = '';
  cvLst = [];
  imagesJSON = [];
  resizedData = '';
  @track showMergeField = false;
  showimages = false;
  imagesfound = false;
  attributes = {};
  styleString = '';
  @track srcs = [];
  reload = false;
  @track key = 0;
  updatedImg = false;
  @track updatedRichTextVal;
  showAddedImages = false;
  @track showPreview = false;
  @track storeRichTextVal;
  @track reloadVar = false;
  domainbaseUrl;
  @track showNoImgErr = false;
  typingTimer;
  doneTypingInterval = 1000;
  updateClicked = 'No';
  imageUrls = [];
  mainimageUrls = [];
  isLoaded = false;
  isModalOpen = false;
  showMergeFields = false;
  newpage = false;
  @api pdfLinks;
  @api documenttemplaterecord;
  @api selectedObjectName;
  @track relatedtoTypeObjChild;
  @api showdetails = false;
  @api recordidtoedit = '';
  @api showclausescreen = false;
  @api disableButton = false;
  @api disabledeleteButton = false;
  @api sectiontype = '';
  @api rowcount;
  @api recordidvalueprop;
  @api sectionrecordid;
  @track showBool = false;
  @track clauseId = '';
  @track richtextVal = 'Hello';
  @track value = [];
  @track mergefieldname;
  @track savedRecordID;
  isDisabled = false;
  selectedClauseId;
  @track ruleCondition = false;
  @track globalItems;
  @track selectedMergefields = [];
  @api whereCondition ="";
  whereClause = " IsActive__c = true";

  @api isSaved;
  @track Recorddetailsnew = {
    Name: '',
    DxCPQ__Section_Content__c: '',
    DxCPQ__DisplaySectionName__c: false,
    DxCPQ__New_Page__c: false,
    DxCPQ__Document_Template__c: '',
    DxCPQ__Sequence__c: 0,
    DxCPQ__Type__c: '',
    Id: '',
    DxCPQ__RuleId__c: '',
    DxCPQ__Document_Clause__c: '',
    DxCPQ__Section_Visibility_Rule__c:'',
    DxCPQ__Resized_Images_Data__c : ''
  };
    formats = [
        'font',
        'size',
        'bold',
        'italic',
        'underline',
        'strike',
        'list',
        'indent',
        'align',
        'link',
        'image',
        'table',
        'header',
        'color',
        'code-block',
        'script', 'direction',
        'image'
    ];
 //filter
  @track listOfExistingConditions = [];
  @track fieldWrapper;
  ruleExpression;
  ruleConditions = [];
  ruleExists = false;
  allConditions=[];
  conditionExists=false;
  conditionsArr = [];
  mapOfRC = new Map();

  @wire(getContentVersions) wiredcontentversions({ error, data }) {
    if (data) {
        if (data != null) {
            data.forEach((val) => {
                this.imageUrls.push({ Id: val.Id, URL: '/sfc/servlet.shepherd/version/download/' + val.Id, title: val.Title, width: null, height: null, cvId: val.Id });
            });
            this.showimages = true;
            this.mainimageUrls = this.imageUrls;
            if (this.imageUrls.length > 0) {
                this.imagesfound = true;
            }
            // console.log('this.imageUrls before width and height ---> ', this.imageUrls);
        }
    } else if (error) {
        console.log('error in Content Versions Fetch' + JSON.stringify(error));
    }
  }

  renderedCallback() {
    if (this.documenttemplaterecord && this.documenttemplaterecord.DxCPQ__Previously_Active__c == true) {
      this.handleActivateTemplate(true, this.selectedObjectName);
    }
    const richTextEditor = this.template.querySelector('[data-id="dev-richtext"]');
    // console.log('richtexteditor ---> ', richTextEditor);
    if(richTextEditor && this.reloadVar == false){
      this.reload = true;
      // console.log('call refresh');
    }
  }

  handlename(event) {
    this.Recorddetailsnew.Name = event.detail.value;
    const saveEvent = new CustomEvent('datasaved', {detail: false });
    this.dispatchEvent(saveEvent);
  }

  selectItemEventHandler(event) {
    this.clauseId = event.detail.selectedRecord.recordId;
    this.selectedClauseId = event.detail.selectedRecord.recordId;
    this.richtextVal = event.detail.selectedRecord.recordObject.DxCPQ__Body__c;
    this.updatedRichTextVal = this.richtextVal;
    this.Recorddetailsnew.Name = event.detail.selectedRecord.recordName;
  }
  /*filter*/

  connectedCallback() {
    this.reload = true;
      getDomainUrl()
      .then(result => {
        if (result != null) {
          this.domainbaseUrl = result;
          // console.log('domain base url ---> ', this.domainbaseUrl);
        }
      })
      .catch(error => {
        console.log('error while retrieving domain base url ---> ' , error);
      })
    this.handleRuleWrapperMaking();
   // this.whereCondition = `DxCPQ__Document_Template__r.DxCPQ__Related_To_Type__c = '${this.selectedObjectName}' AND DxCPQ__Type__c = 'Context'`;
    this.whereClause = this.whereCondition;
    console.log('sectionrecordid',this.sectionrecordid);
    this.template.addEventListener("closemodal", (evt) => {
      console.log("Notification event", evt);
    });
  }
   handleFiltering() {
      this.ruleCondition = true;
      this.template.querySelector('[data-id="filter"]').show();
  }
   closePreviewModal() {
      this.ruleCondition = false;
      this.template.querySelector('[data-id="filter"]').hide();
  }
  handleRuleWrapperMaking() {
    if (this.selectedObjectName !== undefined) {
      getSObjectListFiltering({
        selectedChildObjectLabel: this.selectedObjectName
        })
      .then((result) => {
          this.fieldWrapper = result;
      })
      .catch((error) => {
          console.log('error while Filtering the Object -> handleRuleWrapperMaking', error);
      });
    }
  }
     handleCreateRules(event) {
      const conditionChild = this.template.querySelector('c-conditioncmp').getConditionDetails();
      this.ruleExpression = conditionChild.expression;
      this.createRuleConditionObjects(conditionChild.listOfConditions);
      let listOfConditions = JSON.stringify(this.ruleConditions);
      let deleteIds = null;
      let ruleExp = JSON.stringify(this.ruleExpression);
      createRuleCondition({
              ruleConditions: listOfConditions,
              ruleExpression: ruleExp,
              deleteIds: deleteIds,
              sectionrecordid: this.sectionrecordid
          })
          .then(result => {
              this.ruleIdCreated = result;
              this.ruleExists = true;
              let event = new Object();
              this.getExistingConditions(event);
          })
          .catch(error => {
              console.log('Error -> createRuleCondition' + JSON.stringify(error));
          });
      this.template.querySelector('[data-id="filter"]').hide();
  }
   createRuleConditionObjects(arrayList) {
      this.hasSpecialCharacter = false;
      let regExpr = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/;
      arrayList.forEach(condition => {
          let tempObj = {};
          tempObj.Id = condition.Id;
          tempObj.conditionName = condition.conditionName;
          tempObj.dataType = condition.dataType;
          if (condition.operator == '==') {
              tempObj.operator = '==';
          } else {
              tempObj.operator = condition.operator;
          }
          tempObj.selectedObject = condition.selectedObject;
          tempObj.selectedField = condition.selectedField;
          tempObj.value = condition.value;
          if (regExpr.test(tempObj.value)) {
              this.hasSpecialCharacter = true;
          }
          tempObj.conditionIndex = condition._index;
          this.ruleConditions.push(tempObj);
          if (condition.children && condition.children.length > 0) {
              condition.children.forEach(child => {
                  if (child.group && child.group.length > 0) {
                      this.createRuleConditionObjects(child.group);
                  }
              })
          }
      })
  }
   handleRuleUpdates(event) {
      this.ruleConditions = [];
      const conditionChild = this.template.querySelector('c-conditioncmp').getConditionDetails();
      this.createRuleConditionObjects(conditionChild.listOfConditions);
      let listOfConditions = JSON.stringify(this.ruleConditions);
      let expression = JSON.stringify(conditionChild.expression);
      let deleteIds = this.removeDeletedConditions(this.ruleConditions, this.conditionsArr);
      if (!this.hasSpecialCharacter) {
          createRuleCondition({
                  ruleConditions: listOfConditions,
                  ruleExpression: expression,
                  deleteIds: deleteIds,
                  sectionrecordid: this.sectionrecordid
              })
              .then(result => {
                  this.ruleExists = true;
                  this.ruleExpression = expression;

                  let event = new Object();
                  this.getExistingConditions(event);
              })
              .catch(error => {
                  console.log('createRuleCondition error occurred' + JSON.stringify(error));
              });
      }
      this.template.querySelector('[data-id="filter"]').hide();
  }
   getExistingConditions(event) {
      this.mapOfRC = new Map();
      this.conditionsArr = [];
      this.conditionExists = false;
      this.allConditions = [];
      this.listOfExistingConditions = [];
      getConditions({ ruleName: this.ruleIdCreated })
        .then(result => {
            if (result.length > 0) {
                this.conditionsArr = JSON.parse(JSON.stringify(result));
                this.lstofactualConditions = this.conditionsArr;
                this.conditionsArr.forEach(con => {
                    this.mapOfRC.set(con.Name, con);
                });
                if (this.fieldWrapper !== undefined) {
                    let conditionResult = createRuleConditionHierarcy(this.ruleExpression, this.mapOfRC, this.fieldWrapper);
                    this.listOfExistingConditions = conditionResult.listOfConditions;
                    this.selectedGlobalValue = conditionResult.selectedGlobalValue;
                    this.conditionExists = true;
                }
            }
        })
        .catch(error => {
            console.log('Apex Call getExistingConditions Erroneous');
            console.log(error);
        })
  }
  removeDeletedConditions(listOfConditions, receivedConditions) {
      let existingIds = [];
      let receivedIds = [];
      listOfConditions.forEach(con => {
          if (con.Id) {
              existingIds.push(con.Id);
          }
      })
      receivedConditions.forEach(con => {
          receivedIds.push(con.Id);
      })
      receivedIds = receivedIds.filter(el => {
          return !existingIds.includes(el);
      });
      return receivedIds;
  }
    handleFilterRuleReset() {

      resetRulesForTemplate({
              templateRuleId: this.ruleIdCreated
          })
          .then(result => {
              if (result == 'Success') {

                  this.ruleIdCreated = null;

                  this.listOfExistingConditions = [];
                  this.conditionsArr = [];
                  this.ruleExists = false;
                  this.filteringCondition = '';
                  this.ruleConditions = [];
                  this.ruleCondition = false;

                  this.handlesectionsave(null);
              } else {
                  const Errormsg = new ShowToastEvent({
                      title: 'Error',
                      message: 'Reset didn\'t work',
                      variant: 'Error'
                  });
                  this.dispatchEvent(Errormsg);
              }
          })
          .catch(error => {
              console.log('reset Rules error occurred' + JSON.stringify(error));
          });
      this.ruleCondition = false;
      this.template.querySelector('c-modal').hide();
  }

  /*filter*/
  updateItemEventHandler(event) {
    this.selectedClauseId = undefined;
    this.richtextVal = '';
    this.updatedRichTextVal = this.richtextVal;
    this.Recorddetailsnew.Name = '';
  }

  handleClauseSelection(event) {
    this.clauseId = event.detail.value;
    const clauseIdstring = JSON.stringify(this.clauseId)
    ClauseBody({ inputparam: clauseIdstring })
      .then(result => {
        if (result != null) {
          this.richtextVal = result.DxCPQ__Body__c;
          this.updatedRichTextVal = this.richtextVal;
          this.Recorddetailsnew.Name = result.Name;
        }
      })
      .catch(error => {
        let errorMessage = error.message || 'Unknown error message';
          let tempError = error.toString();
          createLog({ recordId: '', className: 'TemplateContentDetails LWC Component - connectedCallback()', exceptionMessage: errorMessage, logData: tempError, logType: 'Exception' });
        });
  }

  @api handleObjectNameSelection(objName) {
    this.selectedObjectName = objName;
    this.handleRuleWrapperMaking();
  }

  @api handleActivateTemplate(isActive, objName) {
    this.selectedObjectName = objName;
    this.isDisabled = isActive;
    this.disableButton = isActive;
    this.disabledeleteButton = isActive;
    this.handleRuleWrapperMaking();
  }

  handlechange(event) {
    this.newpage = event.detail.checked;
    const saveEvent = new CustomEvent('datasaved', {detail: false });
    this.dispatchEvent(saveEvent);
  }

  handleclauseremoval() {
    this.richtextVal = '';
    this.updatedRichTextVal = this.richtextVal;
    this.Recorddetailsnew.Name = '';
  }

  //code added by Bhavya to preserve the spaces in Context section
  handleWhiteSpacesinText(str){
    str = str.replace(/  /g, '&nbsp;&nbsp;');
    return str;
  }  

  // The PDF engine prints a lone lowercase `courier` in Times; a stack ending in a generic name gives Courier.
  upgradeLegacyFonts(str) {
    return str.replace(/font-family:\s*courier\s*;/gi, 'font-family: courier, monospace;');
  }

  // A New Page section is stored inside a page-break div and reopens with that div in the editor, so take the
  // old wrapper(s) off before the save adds one back (otherwise they nest more deeply on every save).
  removePageBreakWrappers(str) {
    const wrapper = /^\s*<div style="page-break-before\s*:\s*always;?">([\s\S]*)<\/div>\s*$/i;
    while (wrapper.test(str)) { str = str.replace(wrapper, '$1'); }
    return str;
  }

  handlesectionsave(event) {
    this.richtextVal = this.removePageBreakWrappers(this.upgradeLegacyFonts(this.handleWhiteSpacesinText(this.richtextVal)));
    var richtextvalvar = this.richtextVal;
    this.updatedRichTextVal = this.richtextVal;
    var mergefieldsfinalList = [];

    this.selectedMergefields.forEach(val => {
      if (richtextvalvar.localeCompare(val) == 0) {
        mergefieldsfinalList.push(val);
      }
    });

    var currecid = this.sectionrecordid;
    if (this.richtextVal != '' && this.richtextVal != null) {
      if (this.newpage) {
        this.Recorddetailsnew.DxCPQ__Section_Content__c = "<div style=\"page-break-before : always;\">" + this.richtextVal + "</div>";
      } else if(this.sectioncssval) {
        this.Recorddetailsnew.DxCPQ__Section_Content__c = `<div style="${this.sectioncssval}">` + this.richtextVal + `</div>`;
      }
      else{
        this.Recorddetailsnew.DxCPQ__Section_Content__c = this.richtextVal;
      }
      this.Recorddetailsnew.DxCPQ__New_Page__c = this.newpage;
    }
    this.updatedRichTextVal = this.richtextVal;
    if (currecid != '' && this.sectionrecordid.indexOf('NotSaved') == -1) {
      this.Recorddetailsnew.Id = this.sectionrecordid;
    }
    this.Recorddetailsnew.DxCPQ__Sequence__c = this.rowcount;
    this.Recorddetailsnew.DxCPQ__Type__c = this.sectiontype;
    this.Recorddetailsnew.DxCPQ__RuleId__c = '';
    this.Recorddetailsnew.DxCPQ__Section_Visibility_Rule__c = this.ruleIdCreated;
    this.Recorddetailsnew.DxCPQ__Resized_Images_Data__c = JSON.stringify(this.imagesJSON);

    let clauseCheck = true;
    if (this.Recorddetailsnew.DxCPQ__Type__c == 'Clause') {
      if (this.clauseId != '' && this.clauseId != null) {
        this.Recorddetailsnew.DxCPQ__Document_Clause__c = JSON.stringify(this.clauseId);
      }
      else {
        clauseCheck = false;
      }
    }

    this.Recorddetailsnew.DxCPQ__Document_Template__c = this.documenttemplaterecord.Id;
    if (this.Recorddetailsnew.Name != '' && this.Recorddetailsnew.Name != null && clauseCheck) {
      saveDocumentTemplateSectionDetails({ Recorddetails: this.Recorddetailsnew })
        .then(result => {
          if (result != null) {
            this.savedRecordID = result;
            this.updatingContentVersions().then(() => {
                const event4 = new ShowToastEvent({
                  title: 'Success',
                  message: 'Section "' + this.Recorddetailsnew.Name + '"' + ' was Saved',
                  variant: 'success',
                });
                this.dispatchEvent(event4);
                var firecustomevent = new CustomEvent('savesectiondata', { detail: this.savedRecordID });
                this.dispatchEvent(firecustomevent);
                const saveEvent = new CustomEvent('datasaved', {detail: true });
                this.dispatchEvent(saveEvent);
                this.translateEnabled = false;
              })
              .catch(error =>{
                console.log('Error in updatingContentVersions() ' + JSON.stringify(error));
              });
            
          }
        })
        .catch(error => {
          let errorMessage = error.message || 'Unknown error message';
          let tempError = error.toString();
          createLog({ recordId: '', className: 'TemplateContentDetails LWC Component - connectedCallback()', exceptionMessage: errorMessage, logData: tempError, logType: 'Exception' });
        });
      this.clickedfirsttime = true;
    }
    else {
      var error = 'Please enter the required details to save this section.';
      if(!clauseCheck){ error = 'Please select a pre-defined Clause to save this section.'}
      const Errormsg = new ShowToastEvent({
        title: 'Error',
        message: error,
        variant: 'Error',
      });
      this.dispatchEvent(Errormsg);
    }
    this.newpage = false;
  }
  updatingContentVersions(){
     return new Promise((resolve, reject) => {
      let rCVIDs = this.imagesJSON.map(img => img.rCVID);
      console.log('rCVIDs found inside the updatingContentVersions ----> ',rCVIDs);
      //delete extra contentversions
      deleteContentVersions({rCVIDs : rCVIDs, allCVs: this.cvLst})
      .then(result => {
          console.log('ContentVersions deleted successfully.');    
          resolve();
      })
      .catch(error => {
          console.error('Error deleting ContentVersions:', error);
          reject(error);
      });
    });
  }

  handlecheckboxChange(event) {
    const mystring = JSON.stringify(event.detail.value);

    if (mystring.includes('New Page')) {
      this.Recorddetailsnew.DxCPQ__New_Page__c = true;
    } else {
      this.Recorddetailsnew.DxCPQ__New_Page__c = false;
    }

    if (mystring.includes('Display Section Name')) {
      this.Recorddetailsnew.DxCPQ__DisplaySectionName__c = true;
    } else {
      this.Recorddetailsnew.DxCPQ__DisplaySectionName__c = false;
    }
  }


  handlemergefieldselection(event) {
    this.mergefieldname = '{!' + this.documenttemplaterecord.DxCPQ__Related_To_Type__c + '.' + event.detail.value + '}';
  }

  handlemergefieldadd() {
    this.isTranslateModalOpen = false;
    this.template.querySelector('c-modal').show();
    this.showimages = false;
    this.showMergeField = true;
    this.isModalOpen = false;
    this.showAddedImages = false;
  }

  handlerowlevelmerge(event) {
    this.selectedRowIndex = event.currentTarget.dataset.index;
    this.isTranslateModalOpen = false;
    this.rowlevelmerge = true;
    this.template.querySelector('c-modal').show();
  }

  getMergeFieldCopy() {
    const mergeField = this.template.querySelector('c-dx-lookup-fields-displaycmp').getMergeField();
    if (mergeField != undefined) {
      this.mergefieldname = '{!' + this.selectedObjectName + '.' + mergeField + '}';
      copyText(this.mergefieldname);
      this.selectedMergefields.push(this.mergefieldname);
    }
    this.template.querySelector('c-modal').hide();
    this.showMergeField = false;
  }

  getMergeField() {
    const mergeField = this.template.querySelector('c-dx-lookup-fields-displaycmp').getMergeField();
    if (mergeField != undefined) {
      this.mergefieldname = '{!' + this.selectedObjectName + '.' + mergeField + '}';
      if(this.rowlevelmerge){
        //let rowIndex = this.selectedRowIndex;
            this.isTranslateModalOpen = true;
            let updatedRecords = [...this.translatedRecords];
                updatedRecords[this.selectedRowIndex] = {
                    ...updatedRecords[this.selectedRowIndex],
                    Name: this.mergefieldname
                };
                this.translatedRecords = updatedRecords;
            //this.translatedRecords[this.selectedRowIndex].Name = this.mergefieldname; // Update the "Field Label" column
            this.rowlevelmerge = false;
      }
      else{
        this.richtextVal += this.mergefieldname;
        this.updatedRichTextVal = this.richtextVal;
        this.template.querySelector('c-modal').hide();
      }
      this.selectedMergefields.push(this.mergefieldname);
    }
    this.template.querySelector('c-modal').hide();
    this.showMergeField = false;
  }

  handleRichTextArea(event) {
    this.Recorddetailsnew.DxCPQ__Section_Content__c = event.detail.value;
    if(this.richtextVal != event.detail.value){
    this.richtextVal = event.detail.value;
    this.translateEnabled = this.richtextVal != null || this.richtextVal != ''? false: true;
     this.updatedRichTextVal = event.detail.value;
      const saveEvent = new CustomEvent('datasaved', {detail: false });
      this.dispatchEvent(saveEvent);
    }
  }

  handlesectionDelete(event) {
    if (this.sectionrecordid.indexOf('NotSaved') !== -1) {
      var firecustomevent = new CustomEvent('deletesectiondata', { detail: this.sectionrecordid });
      this.dispatchEvent(firecustomevent);
    }
    else {
      deletetemplate({ secidtobedeleted: this.sectionrecordid, doctemplateid: this.documenttemplaterecord.Id })
        .then(result => {
          if (result != null) {
            var firecustomevent = new CustomEvent('deletesectiondata', { detail: this.sectionrecordid });
            this.dispatchEvent(firecustomevent);
          }
        })
        .catch(error => {
          let errorMessage = error.message || 'Unknown error message';
          let tempError = error.toString();
          createLog({ recordId: '', className: 'TemplateContentDetails LWC Component - connectedCallback()', exceptionMessage: errorMessage, logData: tempError, logType: 'Exception' });
        });
    }
  }

  @api resetvaluesonchildcmp() {
    this.dispatchEvent(new CustomEvent('datasaved', {detail: true }));
    this.showclause = false;
    this.ukey = (new Date()).getTime();
    this.Recorddetailsnew.Id = '';
    this.Recorddetailsnew.Name = '';
    this.richtextVal = '';
    this.updatedRichTextVal = '';
    this.Recorddetailsnew.DxCPQ__DisplaySectionName__c = '';
    this.clauseId = '';
    this.Recorddetailsnew.DxCPQ__New_Page__c = false;
    this.Recorddetailsnew.DxCPQ__Section_Visibility_Rule__c = '';
    this.Recorddetailsnew.DxCPQ__Resized_Images_Data__c = '';
    this.newpage = false;
    this.isTranslateModalOpen = false;
    this.rowlevelmerge = false;
    this.selectedRowIndex;
    this.Recorddetailsnew = {
    Name: '',
    DxCPQ__Section_Content__c: '',
    DxCPQ__DisplaySectionName__c: false,
    DxCPQ__New_Page__c: false,
    DxCPQ__Document_Template__c: '',
    DxCPQ__Sequence__c: 0,
    DxCPQ__Type__c: '',
    Id: '',
    DxCPQ__RuleId__c: '',
    DxCPQ__Document_Clause__c: '',
    DxCPQ__Section_Visibility_Rule__c:''
  };
  this.handleRuleWrapperMaking();
  this.ruleCondition = false;
  this.listOfExistingConditions = [];
  this.fieldWrapper=[];
  this.ruleIdCreated='';
  this.ruleExpression = '';
  this.ruleConditions = [];
  this.ruleExists = false;
  this.allConditions=[];
  this.conditionExists=false;
  this.conditionsArr = [];
  this.mapOfRC = new Map();
    this.template.querySelectorAll('lightning-input-rich-text').forEach(element => {
      if (element.value != null) {
        element.value = '';
      }
    });
    this.updatedRichTextVal = this.richtextVal;
    this.template.querySelectorAll('lightning-checkbox-group ').forEach(element => {
      if (element.value != null) {
        element.value = '';
      }
    });
    setTimeout(() => { 
      try{
        this.template.querySelector('[data-id="newpage"]').checked = this.newpage; 
        this.dispatchEvent(new CustomEvent('datasaved', {detail: true }));
      }
      catch(error){
        console.log('error in setTimeout for checked error >> ', error.message);
      }
      });
  }

  @api loadsectionsectionvaluesforedit(recordID) {
    this.isLoaded = true;
    this.value = [];
    this.ruleExists = false;
    this.sectionrecordid = recordID;
    this.Recorddetailsnew.Id = recordID;
    gettemplatesectiondata({ editrecordid: recordID })
      .then(result => {
        this.isLoaded = false;
        if (result != null) {
          this.Recorddetailsnew.Name = result.Name;
          this.Recorddetailsnew.DxCPQ__Document_Template__c = result.DxCPQ__Document_Template__c;
          this.Recorddetailsnew.DxCPQ__Sequence__c = result.DxCPQ__Sequence__c;
          this.Recorddetailsnew.DxCPQ__Type__c = result.DxCPQ__Type__c;
          this.Recorddetailsnew.DxCPQ__New_Page__c = result.DxCPQ__New_Page__c;
          this.Recorddetailsnew.DxCPQ__DisplaySectionName__c = result.DxCPQ__DisplaySectionName__c;
          this.Recorddetailsnew.DxCPQ__Section_Content__c = result.DxCPQ__Section_Content__c;
          this.Recorddetailsnew.DxCPQ__Section_Visibility_Rule__c = result.DxCPQ__Section_Visibility_Rule__c;
          this.Recorddetailsnew.DxCPQ__Resized_Images_Data__c =  result.DxCPQ__Resized_Images_Data__c;
          if(this.Recorddetailsnew.DxCPQ__Resized_Images_Data__c  != '' || this.Recorddetailsnew.DxCPQ__Resized_Images_Data__c  != null){
            this.resizedData = this.Recorddetailsnew.DxCPQ__Resized_Images_Data__c;
            console.log('this.Recorddetailsnew.DxCPQ__Resized_Images_Data__c ', this.resizedData);
          }
          this.sectiontype = result.DxCPQ__Type__c;
          this.storeRichTextVal = result.DxCPQ__Section_Content__c;
          if (this.Recorddetailsnew.DxCPQ__Type__c == 'Clause' && result.DxCPQ__Document_Clause__c != null) {
            this.clauseId = result.DxCPQ__Document_Clause__c;
            let tempObj = { recordId: result.DxCPQ__Document_Clause__c, recordName: result.DxCPQ__Document_Clause__r.Name }
            this.template.querySelector('c-multi-lookup-component').selectedRecordHandler(tempObj);
            this.ukey = (new Date()).getTime();
          }
          this.newpage = result.DxCPQ__New_Page__c;
          setTimeout(() => { 
            try{
              this.template.querySelector('[data-id="newpage"]').checked = this.newpage; 
            }
            catch(error){
              console.log('error in setTimeout for checked error >> ', error.message);
            }
              
            });

          if (result.DxCPQ__Section_Content__c != null) {
            this.richtextVal = result.DxCPQ__Section_Content__c;
            this.translateEnabled = false;
          } else if (result.DxCPQ__Section_Content__c == undefined) {
            this.richtextVal = '';
          }
          this.updatedRichTextVal = this.richtextVal;
          if (result.DxCPQ__Section_Visibility_Rule__c != null && result.DxCPQ__Section_Visibility_Rule__c != '') {
                      this.Recorddetailsnew.DxCPQ__Section_Visibility_Rule__c = result.DxCPQ__Section_Visibility_Rule__c;
                      this.ruleExpression = result.DxCPQ__Section_Visibility_Rule__r.DxCPQ__Rule_Expression__c;
                  } else {
                      this.Recorddetailsnew.DxCPQ__Section_Visibility_Rule__c = '';
                  }
          if (result.DxCPQ__Section_Visibility_Rule__c != null) {
                      this.ruleIdCreated = result.DxCPQ__Section_Visibility_Rule__c;
                      this.ruleExists = true;
                  } else {
                      this.ruleIdCreated = null;
                      this.listOfExistingConditions = [];
                      this.conditionsArr = [];
                      this.ruleExists = false;
                      this.filteringCondition = '';
                  }

                  if (this.ruleIdCreated != null && this.ruleIdCreated != '') {
                      this.handleRuleWrapperMaking();
                      let event = new Object();
                      this.getExistingConditions(event);
                      this.ruleExists = true;
          }
          this.template.querySelectorAll('lightning-checkbox-group ').forEach(element => {
            if (result.DxCPQ__New_Page__c == true) {
              this.value.push('New Page');
            }
            if (result.DxCPQ__DisplaySectionName__c == true) {
              this.value.push('Display Section Name');
            }
          });
        }
      })
      .catch(error => {
        this.isLoaded = false;
        let errorMessage = error.message || 'Unknown error message';
        let tempError = error.toString();
        createLog({ recordId: '', className: 'TemplateContentDetails LWC Component - connectedCallback()', exceptionMessage: errorMessage, logData: tempError, logType: 'Exception' });
      });
  }


  handlehelp(){
    let urlLink;
        if(this.showclausescreen){ //for clause screen
      let relatedObjectsMap = this.pdfLinks.find(item => item.MasterLabel === 'Clause');
      urlLink = relatedObjectsMap ? relatedObjectsMap.DxCPQ__Section_PDF_URL__c : null;
          }
    else{//for context screen
      let relatedObjectsMap = this.pdfLinks.find(item => item.MasterLabel === 'Context');
      urlLink = relatedObjectsMap ? relatedObjectsMap.DxCPQ__Section_PDF_URL__c : null;
          }
    const config = {
        type: 'standard__webPage',
        attributes: {
            url: urlLink
          }
    };
    this[NavigationMixin.Navigate](config);
  }

  
  //code added by Bhavya for adding Custom Font-family list - compatible with VF PDF generation
  get fontFamilies() {
    return [
        { label: 'Times New Roman', value: 'serif' },
        { label: 'Arial', value: 'sans-serif' },
        { label: 'Serif', value: 'serif' },
        { label: 'Courier', value: 'courier, monospace' },
    ];
  }

  handleFontFamilySelection(event){
    let applySelectedFormats = {
        font: event.target.value,
    };
    let selection = window.getSelection().toString();
    let editor = this.template.querySelector('lightning-input-rich-text');
    editor.setFormat(applySelectedFormats);
  }

  //code added by Bhavya for images in Rich Text Area
  handleAddImage() {
    this.template.querySelector('[data-id="filter"]').hide();
    this.template.querySelector('c-modal[data-id="images"]').show();
    this.isModalOpen = true;
    this.showmergefield = false;
    this.showimages = true;
  }

  modifyRichTextVal(){
    // console.log('storeRichTextVal ----> ', this.storeRichTextVal);
    // console.log('richtextVal ----> ', this.richtextVal);
    const imgTagRegex = /<img\s+([^>]*?)src="([^"]+)"([^>]*?)>/gi;
    const storeImgMatch = imgTagRegex.exec(this.storeRichTextVal);
    if (storeImgMatch) {
      const storeImgSrc = storeImgMatch[2];
      const storeImgStyleMatch = /style="([^"]*?)"/i.exec(storeImgMatch[0]);

      if (storeImgStyleMatch) {
          const storeImgStyle = storeImgStyleMatch[1];
          
          this.richtextVal = this.richtextVal.replace(imgTagRegex, (match, pre, src, post) => {
              if (src === storeImgSrc) {
                  return `<img ${pre}src="${src}" style="${storeImgStyle}"${post}>`;
              }
              return match;
          });
      }
    }
    //this.reload = false;
    this.reloadVar = false;
  }

  //to update this.ImageURLS list with width and height
  handleImageLoad(event){
    const imgElement = event.target;
    const imageId = imgElement.dataset.id;
    const imageWidth = imgElement.naturalWidth;
    const imageHeight = imgElement.naturalHeight;

    this.imageUrls = this.imageUrls.map(image => {
        if (image.Id === imageId) {
            return {
                ...image,
                width: imageWidth,
                height: imageHeight
            };
        }
        return image;
    });
  }

  handleSearch(event) {
    var searchlabel = event.currentTarget.value;
    if (searchlabel !== '') {
        getSearchedContentVersions({ searchlabel: searchlabel })
            .then(result => {
                this.searchData = result;
                this.imageUrls = [];
                result.forEach((val) => {
                    this.imageUrls.push({ Id: val.Id, URL: '/sfc/servlet.shepherd/version/download/' + val.Id, title: val.Title });
                });
                this.showimages = true;
            })
            .catch(error => {
                this.searchData = undefined;
                if (error) {
                    console.log('templateheadertype handleSearch' + JSON.stringify(error));
                }
            })
    } else {
        this.imageUrls = this.mainimageUrls;
    }
}
    

  handleselectedImage(event) {
    this.selectedimageid = event.currentTarget.dataset.id;
    this.isModalOpen = false;
    this.imageselected = true;
    this.selectedimageurl = '/sfc/servlet.shepherd/version/download/' + this.selectedimageid;
    this.imagebuttonlabel = 'Change Image';
    this.showImage = true;
    this.richtextVal = this.richtextVal + '<img src="' + this.selectedimageurl + '"/>';
   this.updatedRichTextVal = this.richtextVal; this.template.querySelector('c-modal[data-id="images"]').hide();
    this.isModalOpen = false;
this.modifyRichTextVal();
  }

  handleRTAClick(event){
    console.log('this.richtextVal ----> ', this.richtextVal);
    console.log('this.updatedRichTextVal ----> ', this.updatedRichTextVal);
    console.log('event.target.value -----> ', event.target.value);
    //console.log('event.detail.value -----> ', event.detail.value);
    //this.reload = false;
  }


  handleResizeImage(event) {
    this.reloadVar = false;
    const imgTagRegexWithStyle = /<img[^>]+src="([^">]+)"[^>]*style="([^"]*)"/g;
    const imgTagRegexWithoutStyle = /<img[^>]+src="([^">]+)"/g;
    this.srcs = [];
    let matches;
    let val = 0;
    const processedUrls = new Set();

    // First process images with style attributes
    while ((matches = imgTagRegexWithStyle.exec(this.updatedRichTextVal)) !== null) {
        const src = matches[1];
        const styleString = matches[2];

        let width = null;
        let height = null;

        const widthMatch = /width:\s*(\d+)px/.exec(styleString);
        const heightMatch = /height:\s*(\d+)px/.exec(styleString);

        if (widthMatch) {
            width = widthMatch[1];
        }

        if (heightMatch) {
            height = heightMatch[1];
        }

        this.srcs.push({
          id: val,
          // URL: src.includes(this.domainbaseUrl) ? src : this.domainbaseUrl + src,
          URL :src,
          width: width,
          height: height,
          cvId: src.split('/').pop()
        });

        processedUrls.add(src);
        val++;
    }

    // Now process images without style attributes, skipping already processed URLs
    while ((matches = imgTagRegexWithoutStyle.exec(this.updatedRichTextVal)) !== null) {
        const src = matches[1];

        if (!processedUrls.has(src)) {
            this.srcs.push({
                id: val,
                URL :src,
                // URL: src.includes(this.domainbaseUrl) ? src : this.domainbaseUrl + src,
                width: null,
                height: null,
                cvId: src.split('/').pop()
            });

            val++;
        }
    }

    this.showNoImgErr = this.srcs.length > 0 ? false : true;

    this.fetchImageDimensions().then(() => {
        if (this.Recorddetailsnew.DxCPQ__Resized_Images_Data__c) {
            const resizedImagesData = JSON.parse(this.Recorddetailsnew.DxCPQ__Resized_Images_Data__c);
            this.srcs = this.srcs.map(src => {
                const resizedImageData = resizedImagesData.find(image => image.rCVID === src.cvId);
                if (resizedImageData) {
                    return {
                        ...src,
                        width: resizedImageData.oWidth,
                        height: resizedImageData.oHeight,
                        rwidth: resizedImageData.rWidth,
                        rheight: resizedImageData.rHeight,
                        cvId: resizedImageData.oCVID,
                        rcvid: resizedImageData.rCVID,
                        URL: src.URL.replace(/[^/]+$/, resizedImageData.oCVID)
                    };
                }
                return src;
            });
        }
        else if(this.imagesJSON.length > 0){
          console.log('this.imagesJSON inside fetchImageDimensions ---> ', this.imagesJSON);
          this.srcs = this.srcs.map(src => {
                const resizedImageData = this.imagesJSON.find(image => image.rCVID === src.cvId);
                if (resizedImageData) {
                    return {
                        ...src,
                        width: resizedImageData.oWidth,
                        height: resizedImageData.oHeight,
                        rwidth: resizedImageData.rWidth,
                        rheight: resizedImageData.rHeight,
                        cvId: resizedImageData.oCVID,
                        rcvid: resizedImageData.rCVID,
                        URL: src.URL.replace(/[^/]+$/, resizedImageData.oCVID)
                    };
                }
                return src;
            });
        }

        this.showMergeField = false;
        this.isModalOpen = false;
        this.showResizeModal = this.srcs.length > 0? true : false;
        this.template.querySelector('[data-id="poc"]').show();
    }).catch(error => {
      console.error('Error fetching image dimensions:', error);
  });

    console.log('srcs list -----> ', this.srcs);
  }




  fetchImageDimensions() {
      const promises = this.srcs.map((image, index) => {
          if (image.width && image.height) {
              return Promise.resolve();
          }
          return new Promise((resolve, reject) => {
              const img = new Image();
              img.src = image.URL;
              img.onload = () => {
                  this.srcs[index] = {
                      ...image,
                      width: img.naturalWidth,
                      height: img.naturalHeight
                  };
                  console.log('this.srcs after width and height update ---------> ', this.srcs);
                  resolve();
              };
              img.onerror = () => {
                  console.error(`Failed to load image: ${image.URL}`);
                  resolve();
              };
          });
      });

      return Promise.all(promises);
  }

  handleImageProperties(event) {
    const inputElement = event.target;
    const imageUrl = event.currentTarget.dataset.url;
    const label = event.currentTarget.dataset.label;
    let value = event.target.value;
    // Reset value to 0 if it's negative
    if (value < 0) {
        this.showToastMsg('No Negative Number allowed!', 'Please add a positive number. Negative numbers are not allowed!', 'error');
        value = 0;
        inputElement.value = value;
    }

    // Update the srcs list
    this.srcs = this.srcs.map(img => {
        if (img.URL === imageUrl) {
            if (label === 'width') {
                img.width = value;
            } else if (label === 'height') {
                img.height = value;
            }
        }
        return img;
    });

    console.log('this.srcs after updating with the user given width and height -----> ', this.srcs);

    // Update the rich text value
    let updatedRich = this.modifyImageAttributes(this.updatedRichTextVal, imageUrl, label, value);
    this.updatedRichTextVal = updatedRich;
    this.storeRichTextVal = this.updatedRichTextVal;
    this.showPreview = true;
  }


  modifyImageAttributes(htmlString, targetUrl, attributeLabel, attributeValue) {
    let domainStr = this.domainbaseUrl + '/';
    const targetPath = new URL(targetUrl, domainStr).pathname;
    const imgTagRegex = /<img([^>]*src="([^">]+)"[^>]*)>/g;
    let updatedHtmlString = htmlString;
    let matches;

    while ((matches = imgTagRegex.exec(htmlString)) !== null) {
        const fullMatch = matches[0];
        const attributesPart = matches[1];
        const srcValue = matches[2]; 
        const srcPath = new URL(srcValue,domainStr).pathname;

        if (srcPath === targetPath) {
            const attributeRegex = /(\w+)=["']([^"']*)["']/g;
            let attributeMatches;
            const attributes = {};

            while ((attributeMatches = attributeRegex.exec(attributesPart)) !== null) {
                attributes[attributeMatches[1]] = attributeMatches[2];
            }

            attributes[attributeLabel] = attributeValue;
            this.styleString = attributes.style || '';
            const widthRegex = /width:\s*\d+px;/;
            const heightRegex = /height:\s*\d+px;/;

            if (widthRegex.test(this.styleString) && attributes.width > 0) {
                this.styleString = this.styleString.replace(widthRegex, `width:${attributes.width}px;`);
            } else if (attributes.width > 0) {
                this.styleString += `width:${attributes.width}px;`;
            }

            if (heightRegex.test(this.styleString) && attributes.height > 0) {
                this.styleString = this.styleString.replace(heightRegex, `height:${attributes.height}px;`);
            } else if (attributes.height > 0) {
                this.styleString += `height:${attributes.height}px;`;
            }
            let newAttributesPart = `src="${attributes.src}"`;
            if (this.styleString) {
                newAttributesPart += ` style="${this.styleString}"`;
            }

            const newImgTag = `<img ${newAttributesPart}>`;
            updatedHtmlString = updatedHtmlString.replace(fullMatch, newImgTag);
        }
    }
    return updatedHtmlString;
  }



 
  handleResizeUpdate(event){
    this.reload = false;
    this.richtextVal =  JSON.parse(JSON.stringify(this.updatedRichTextVal));
    this.showAddedImages = false;
    this.key++;
    this.template.querySelector('c-modal').hide();
    //this.updatedImg = true;
    this.handlecloseModal();

  }

  hideModal() {
      const modal = this.template.querySelector('c-modal');
      if (modal) {
          return modal.hidePopup();
      } else {
          return Promise.reject(new Error('Modal not found'));
      }
  }


  handlecloseModal(event){
    //this.reload = true;
    this.reloadVar = false;
    this.showAddedImages = false;
    this.richtextVal = this.updatedRichTextVal;
    // setTimeout(() => {
        this.reload= true;
      //  }, 4); 
  }

  showToastMsg(title, msg, variant){
    const event4 = new ShowToastEvent({
      title: title,
      message: msg,
      variant: variant,
    });
    this.dispatchEvent(event4);
  }
  
  
  updateImageSrc(str, imagesJSON) {
    const imgTagRegex = /<img\s+[^>]*src=["']([^"']*)["'][^>]*>/g;
    let imgSrcs = [];
    let match;
    while ((match = imgTagRegex.exec(str)) !== null) {
        imgSrcs.push(match[1]);
    }
    imgSrcs.forEach((src, index) => {
        let idRegex = /\/([a-zA-Z0-9]+)$/;
        let idMatch = src.match(idRegex);
        if (idMatch && imagesJSON[index]) {
            let newId = imagesJSON[index].rCVID != null ? imagesJSON[index].rCVID : imagesJSON[index].oCVID;
            let newSrc = src.replace(idMatch[1], newId);
            str = str.replace(src, newSrc);
        }
    });

    return str;
  }

  //poc 

  // handleOpenPoc(event){
  //    this.template.querySelector('[data-id="poc"]').show();
  // }

  //poc crop

  handleCropImage(event){
     this.template.querySelector('[data-id="crop"]').show();
  }

  handleCVIds(){

  }
  
  //code added by Bhavya for gettting the ImagesJSON from pocRTA cmp

  handleModalClose(event) {
    this.process = event.detail? event.detail.process : '';
    this.imagesJSON = event.detail ? event.detail.imagesJSON : null;
    let lstData = event.detail ? event.detail.cvLst : null;
    if (lstData) {
        let newSet = new Set(this.cvLst);
        lstData.forEach(item => {
            newSet.add(item); 
        });

        this.cvLst = Array.from(newSet);
    }
    console.log('Received this.cvLst from child:', this.cvLst);
    console.log('Received imagesJSON from child:', this.imagesJSON);
    if (this.imagesJSON.length > 0 && this.process !== 'Cancel') {   
      console.log('printing richtextval inside the handleModalclose --> ', this.richtextVal);
      //code to modify the richTextVal with the updated resized CVIDs
      let modifiedHtml = this.richtextVal;
      // let imgTagRegex = /<img\s+[^>]*src="([^"]+)"[^>]*>/g;
      // let matches = [...modifiedHtml.matchAll(imgTagRegex)];
      // matches.forEach(match => {
      //     let src = match[1];
      //     let imgId = src.substring(src.lastIndexOf('/') + 1);
      //     let image = this.imagesJSON.find(img => img.oCVID === imgId);

      //     if (image && image.rCVID) {
      //         let newSrc = src.replace(imgId, image.rCVID);
      //         modifiedHtml = modifiedHtml.replace(src, newSrc);
      //     }
      // });

      modifiedHtml = this.updateImageSrc(modifiedHtml, this.imagesJSON);
      this.richtextVal = modifiedHtml;
      console.log('richtextVal updated in handleModalClose', this.richtextVal);
    }

    this.template.querySelector('[data-id="poc"]').hide();
  }


    handleSectionCss(event){
        this.showSectionCss = true;
        this.isModalOpen = false;
        this.template.querySelector('c-modal[data-id="images"]').show();
        
    }

    handleSectionCSSInput(event){
        this.sectioncssval = event.target.value;
        console.log('section css --> ', this.sectioncssval);
    }

    handleSecCSSSave(event){
        console.log('inside handleSecCSSSave sectioncssval --> ', this.sectioncssval);
        this.template.querySelector('c-modal[data-id="images"]').hide();
    }

    handleSecCSSCancel(event){
        console.log('inside handleSecCSSCancel sectioncssval --> ', this.sectioncssval);
        this.sectioncssval = '';
        this.template.querySelector('c-modal[data-id="images"]').hide();
    }


}