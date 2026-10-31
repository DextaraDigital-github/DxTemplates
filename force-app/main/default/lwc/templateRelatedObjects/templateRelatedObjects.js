import { LightningElement, track, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { loadStyle } from 'lightning/platformResourceLoader';
import { createRuleConditionHierarcy } from 'c/conditionUtil';
import { DEFAULT_FONT_FAMILY, COURIER_FONT_FAMILY, upgradeLegacyFontFamily } from 'c/dxPdfFonts';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import rte_tbl from '@salesforce/resourceUrl/rte_tbl';
import getFields from '@salesforce/apex/MergeFieldsClass.getFields';
import dexcpqcartstylesCSS from '@salesforce/resourceUrl/dexcpqcartstyles';
import getRelatedObjects from '@salesforce/apex/RelatedObjectsClass.getRelatedObjects';
import getConditions from '@salesforce/apex/RelatedObjectsClass.getExistingConditions';
import getGroupingOptions from '@salesforce/apex/RelatedObjectsClass.getGroupingValues';
import deletetemplate from '@salesforce/apex/SaveDocumentTemplatesection.deletetemplate';
import createRuleCondition from '@salesforce/apex/RelatedObjectsClass.createRuleCondition';
import getSObjectListFiltering from '@salesforce/apex/RelatedObjectsClass.getSObjectListFiltering';
import gettemplatesectiondata from '@salesforce/apex/SaveDocumentTemplatesection.gettemplatesectiondata';
import resetRulesForTemplate from '@salesforce/apex/RelatedObjectsClass.handleTemplateRuleResetCondition';
import saveDocumentTemplateSectionDetails from '@salesforce/apex/SaveDocumentTemplatesection.saveDocumentTemplateSectionDetails';

// Field types the Sub Total, Grand Total and chart can add up (the server sums them as Decimal).
const TOTALABLE_DATA_TYPES = ['NUMBER', 'CURRENCY', 'DOUBLE', 'INTEGER', 'LONG', 'PERCENT'];

export default class TemplateRelatedObjects extends NavigationMixin(LightningElement) {

  @api pdfLinks;
  @api selectedObjectName;
  @api showrelatedobjectdetails;
  @api documenttemplaterecordid;
  @api documenttemplaterecord;
  @api showdetails = false;
  @api recordidtoedit = '';
  @api disableButton = false;
  @api disabledeleteButton = false;
  @api sectiontype = '';
  @api rowcount;
  @api sectionrecordid;
  @track showPicklist = false;
  @track catStyle;
  @track showCalculatorFields = false;
  @track tempbool = false;
  @track flagVar = false;
  @track relatedObjName1;
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
      DxCPQ__Section_Visibility_Rule__c:''
  };

  ruleCondition = false;
  visibilityRuleCondition = false;
  selectedTableRow;
  childobjects;
  changedHeaders = [];
  lstofchngedLabel = [];
  @track showDone = false;
  changedLabel;
  displayfields = false;
  fieldoptions = [];
  values = [];
  loadUp = false;
  value = null;
  @track tabsection = [];
  show = false;
  showpicklistValues = false;
  fieldsinlst = [];
  getGroupingValues = [];
  getpicklistdata = [];
  getselectionfieldvalues = [];
  checkTotals = [];
  dateFormatvalue = '564/';
  timeFormatvalue = '124';
  numFormatvalue = '2';
  pendingUi = [];
  curFormatvalue = '2';
  @track renderedData = false;

  // Filtering params
   ruleModalLabel='';
  listOfExistingConditions = [];
  visibilityListOfExistingConditions = [];
  conditionsArr;
   visibilityConditionsArr;
  selectedGlobalValue;
  visibilitySelectedGlobalValue;
  ruleExpression;
  visibilityRuleExpression;
  ruleConditions = [];
  visibilityRuleConditions = [];
  mapOfRC;
  visibilityLstofactualConditions;
  lstofactualConditions;
  conditionExists = false;
  allConditions = [];
  ruleIdCreated = '';
  ruleExists = false;
  visibilityRuleExists = false;
  hasSpecialCharacter = false;
  relationName = new Map();
  @track formats = ['font'];

  get numformats() {
      return [{
              label: 'x',
              value: '0'
          },
          {
              label: 'x.y',
              value: '1'
          },
          {
              label: 'x.yz',
              value: '2'
          },
          {
              label: 'x.yza',
              value: '3'
          }
      ];
  }

  get curformats() {
      return [{
              label: 'x',
              value: '0'
          },
          {
              label: 'x.y',
              value: '1'
          },
          {
              label: 'x.yz',
              value: '2'
          },
          {
              label: 'x.yza',
              value: '3'
          }
      ];
  }

  get timeformats() {
      return [{
              label: 'HH : MM XM (12 hr)',
              value: '124'
          },
          {
              label: 'HH : MM : SS XM (12 hr)',
              value: '1234'
          },
          {
              label: 'HH : MM (24 hr)',
              value: '12'
          },
          {
              label: 'HH : MM : SS (24 hr)',
              value: '123'
          }
      ];
  }

  get dateformats() {
      return [{
              label: 'mm/dd/yyyy',
              value: '564/'
          }, {
              label: 'MMM/dd/yyyy',
              value: '564/*'
          },
          {
              label: 'dd/mm/yyyy',
              value: '654/'
          }, {
              label: 'dd/MMM/yyyy',
              value: '654/*'
          },
          {
              label: 'yyyy/dd/mm',
              value: '465/'
          }, {
              label: 'yyyy/mm/dd',
              value: '456/'
          },
          {
              label: 'mm-dd-yyyy',
              value: '564-'
          }, {
              label: 'MMM-dd-yyyy',
              value: '564-*'
          },
          {
              label: 'dd-mm-yyyy',
              value: '654-'
          }, {
              label: 'dd-MMM-yyyy',
              value: '654-*'
          },
          {
              label: 'yyyy-dd-mm',
              value: '465-'
          },
          {
              label: 'yyyy-mm-dd',
              value: '456-'
          }, {
              label: 'yyyy-MMM-dd',
              value: '456-*'
          },
          {
              label: 'mm/dd/yy',
              value: '562/'
          }, {
              label: 'MMM/dd/yy',
              value: '562/*'
          },
          {
              label: 'dd/mm/yy',
              value: '652/'
          }, {
              label: 'dd/MMM/yy',
              value: '652/*'
          },
          {
              label: 'mm-dd-yy',
              value: '562-'
          }, {
              label: 'MMM-dd-yy',
              value: '562-*'
          },
          {
              label: 'dd-mm-yy',
              value: '652-'
          },
      ];
  }


  @track allNumericalFields = [];
  @track allnumValues = [];
  @track numfieldvalue;
  @track sectionSpan;
  selectchildpicklist = null;
  calculateOptions = [{
          label: 'Calculate grand total',
          value: 'CalculateGrandTotal'
      },
      {
          label: 'calculate SubTotal',
          value: 'calculateSubTotal'
      }
  ];
  @track lstOfObjects = [];
  @track lstofaddedfields = [];
  lstofremovedFields = [];
  chartLabel = 'Chart';
  selectedBarChartColor = '#007CBA';

  selectRemoveField;
  selectedField;
  showStatement = false;
  showLstOfObj = false;
  requiredOptions = [];
  selectedfields;
  showChartBox = true;
  showtablecontent = false;
  @track tableheaders = [];
  @track tablerows = [];
  @track objectTypeOptions;
  displaySaveTableButton = false;
  fieldsdatamap = [];
  selChildObjName;
  @track savedRecordID;
  isLoaded = false;
  //isDisabled = false;

  fontsize = "10px";
  fontsizeoptions = [{
          value: '8px',
          label: '8'
      }, {
          value: '9px',
          label: '9'
      }, {
          value: '10px',
          label: '10'
      }, {
          value: '12px',
          label: '12'
      },
      {
          value: '13px',
          label: '13'
      }, {
          value: '14px',
          label: '14'
      }, {
          value: '15px',
          label: '15'
      }, {
          value: '16px',
          label: '16'
      },
  ];

  fontfamily = DEFAULT_FONT_FAMILY;
  fontfamilyoptions = [{
          value: 'Arial',
          label: 'Arial'
      },
      {
          value: 'Verdana',
          label: 'Verdana'
      },
      {
          value: 'Times New Roman',
          label: 'Times New Roman'
      },
      {
          value: 'Georgia',
          label: 'Georgia'
      },
      {
          value: 'Courier New',
          label: 'Courier New'
      },
      {
          value: 'Brush Script MT',
          label: 'Brush Script MT'
      }
  ];

  selectedHFontColor = 'black';
  selectedBFontColor = 'black';
  selectedHbgColor = 'white';
  selectedBBgcolor = 'white';
  SerialNumber = false;
  subtotal = false;
  @track showNumberFields = [];
  @track showNumberFieldsOptions = [];
  showdate = true;
  showtime = true;
  shownumber = true;
  showcurrency = true;
  subtotalField = [];
  subtotalFieldValue;
  noGrouping = false;
  nosubTotal = false;

  displayChart = false;
  chartControl = false;
  chartNewPage = true;
  newPage = false;

  // Attribute Styling
  /*
  attributeCheckboxValue = false;
  attrStyleOpt1 = false;
  attrStyleOpt2 = false;
  attrStyleOpt3 = false;
  attrStyle='';
  */

  chartLst = [{
          "label": "group-1",
          "percent": "23%",
          "height": "height:21%;",
          "width": "width : 13.571428571428571%;",
          "value": 2367510
      },
      {
          "label": "group-2",
          "percent": "32%",
          "height": "height:47%;",
          "width": "width : 13.571428571428571%;",
          "value": 256372
      },
      {
          "label": "group-3",
          "percent": "20%",
          "height": "height:35%",
          "width": "width : 13.571428571428571%;",
          "value": 2867396
      },
      {
          "label": "group-4",
          "percent": "9%",
          "height": "height:14%;",
          "width": "width : 13.571428571428571%;",
          "value": 1257704
      },
      {
          "label": "Others",
          "percent": "16%",
          "height": "height:61%;",
          "width": "width : 13.571428571428571%;",
          "value": 2327405
      }
  ];

  //Template specific fix
  childLookupAPI = '';

  sectionItemsToselect = [{
          label: 'New Page',
          value: 'New Page'
      },
      {
          label: 'Display Section Name',
          value: 'Display Section Name'
      }
  ];

  connectedCallback() {
      this.tableheaders = [];
      this.tabsection = [];
      this.renderedData = false;
  }

  @api clearChildObjSelection() {
      this.renderedData = false;
      this.showPicklist = false;
      this.displayfields = false;
      this.showtablecontent = false;
  }

  /*
    Styles are getting loaded here
  */
  renderedCallback() {
      Promise.all([
              loadStyle(this, rte_tbl + '/rte_tbl1.css'),
              loadStyle(this, dexcpqcartstylesCSS),
          ])
          .then(() => {})
          .catch(error => {});

      this.newfontsize();
      this.applyPendingUi();
  }

  /*
    A loaded section sets some values on elements (checkboxes, the pickers) that are only rendered after the data
    has arrived. Those settings wait here and are applied as soon as their element exists, instead of after a fixed delay.
  */
  setWhenRendered(selector, apply) {
      this.pendingUi.push({ selector, apply });
      this.applyPendingUi();
  }

  applyPendingUi() {
      this.pendingUi = this.pendingUi.filter(pending => {
          const element = this.template.querySelector(pending.selector);
          if (!element) {
              return true;
          }
          pending.apply(element);
          return false;
      });
  }

  /*
    Puts the fields of a saved section back into the chosen-fields list, in the order they were saved. A field of a
    parent object (path such as Account.AnnualRevenue) needs a second Apex call, so the list is built when all calls are done.
  */
  restoreAddedFields(parsedJson) {
      const available = this.lstOfObjects[0].fieldList;
      const restored = [];
      const parentLoads = [];

      parsedJson.tablelistValues.forEach((path, position) => {
          if (path.includes('.')) {
              const relationshipName = path.split('.')[0];
              const lookup = this.lstOfObjects[0].fieldWrap.find(field => field.relationshipName == relationshipName);
              if (lookup) {
                  parentLoads.push(getFields({ selectedObject: lookup.sObjectName }).then(parentFields => {
                      const parentField = parentFields.find(field => field.apiName.toLowerCase() == path.split('.')[1].toLowerCase());
                      if (parentField) {
                          const label = lookup.name.substring(0, lookup.name.length - 1) + '.' + parentField.name;
                          restored[position] = { label, value: path, dataType: parentField.dataType };
                      }
                  }));
              }
              return;
          }
          const index = available.findIndex(field => field.value.toLowerCase() == path.toLowerCase());
          if (index > -1) {
              restored[position] = available[index];
              available.splice(index, 1);
          }
      });

      return Promise.all(parentLoads).then(() => {
          restored.filter(field => field).forEach(field => {
              this.lstofaddedfields.push(field);
              if (TOTALABLE_DATA_TYPES.includes(field.dataType)) {
                  this.showNumberFields.push(field);
                  this.showCalculatorFields = true;
              }
              // The pills show the labels, the save writes the values: restore both (R-D6, R-D7).
              if (parsedJson.subTotal.some(key => key.toLowerCase() == field.value.toLowerCase())) {
                  this.allNumericalFields.push(field.label);
                  this.allnumValues.push(field.value);
              }
          });
          // The Sub Total and chart lists offer only what is not chosen yet (U-R13).
          this.showNumberFieldsOptions = [...this.showNumberFields];
          this.modifyOptions();
      });
  }

  // Changes by Kapil 
  @api handleObjectNameSelection(objName) {
      //setTimeout(() => { this.selectedObjectName = objName; }, 2000);
      getRelatedObjects({
              selectedObject: objName
          })
          .then(result => {
              if (result != null) {
                  let options = [];
                  for (var key in result) {
                      options.push({
                          label: key,
                          value: key
                      });
                  }
                  if (options != null && options != undefined) {
                      this.objectTypeOptions = options;
                      this.childobjects = result;
                      if (!!this.objectTypeOptions && !!this.childobjects) {
                          this.renderedData = true;
                      }
                  } else {
                      console.error('Options is not being entered');
                  }
              }
          })
          .catch(error => {
              console.log('error probably while sObj passing dynamically - null ', error);
          })
  }

  @api handleActivateTemplate(isActive, objName) {
      this.selectedObjectName = objName;
      this.relatedObjName1 = this.selectedObjectName;
      this.isDisabled = isActive;
      this.disableButton = isActive;
      this.disabledeleteButton = isActive;
  }

  /*
  This function deals with the new page part in the sections.
  We have a new page checkbox on template creation UI.
  Once the user selects the new page for a particular section, then that section appears in the next page.
  */
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

  /*
  This function handles the deletion part of a section
  */
  handlesectionDelete(event) {
      if (this.sectionrecordid.indexOf('NotSaved') !== -1) {
          var firecustomevent = new CustomEvent('deletesectiondata', {
              detail: this.sectionrecordid
          });
          this.dispatchEvent(firecustomevent);
      } else {
          deletetemplate({
                  secidtobedeleted: this.sectionrecordid,
                  doctemplateid: this.documenttemplaterecordid
              })
              .then(result => {
                  if (result != null) {
                      var firecustomevent = new CustomEvent('deletesectiondata', {
                          detail: this.sectionrecordid
                      });
                      this.dispatchEvent(firecustomevent);
                  }
              })
              .catch(error => {
                  console.log('Error while deleting the Template' + error);
              })
      }
  }

  // This function takes the user input for the section name 
  handlename(event) {
    this.Recorddetailsnew.Name = event.detail.value;
    const saveEvent = new CustomEvent('datasaved', {detail: false });
    this.dispatchEvent(saveEvent);
  }

  @api assignDocTempId(recordID) {
      this.documenttemplaterecordid = recordID;
  }

  // This function resets all the listed parameters below
  @api resetvaluesonchildcmp() {
      this.isLoaded = true;
      this.documenttemplaterecordid = '';
      this.Recorddetailsnew = {
          Name: '',
          DxCPQ__Section_Content__c: '',
          DxCPQ__DisplaySectionName__c: false,
          DxCPQ__New_Page__c: false,
          DxCPQ__Document_Template__c: '',
          DxCPQ__Sequence__c: 0,
          DxCPQ__Type__c: '',
          DxCPQ__RuleId__c: '',
          Id: '',
      };
      this.value = null;
      this.values = [];
      this.selectedfields = '';
      this.selChildObjName = '';
      this.displayfields = false;
      this.showtablecontent = false;
      this.displaySaveTableButton = false;
      this.tableheaders = [];
      this.tabsection = [];
      this.noGrouping = false;
      this.allnumValues = [];
      this.chartControl = false;
      this.chartNewPage = true;
      this.lstOfObjects = [];
      this.chartLabel = 'Chart';
      this.allNumericalFields = [];
      this.showCalculatorFields = false;
      this.displayChart = false;
      this.subtotalFieldValue = '';
      this.selectchildpicklist = '';
      this.showPicklist = false;
      this.showNumberFields = [];
      this.pendingUi = [];
      this.subtotalField = [];
      this.numfieldvalue = '';
      this.newPage = false;
      this.changedHeaders = [];

      // Attribute Style reset
      /*
      this.attributeCheckboxValue = false;
      this.attrStyleOpt1 = false;
      this.attrStyleOpt2 = false;
      this.attrStyleOpt3 = false;
      this.attrStyle = '';
      */

      // Filtering QLIs reset
      this.filteringCondition = '';
      this.mapOfRC = new Map();
      this.conditionsArr = [];
      this.visibilityConditionsArr = [];
      this.conditionExists = false;
      this.visibilityConditionExists = false;
      this.allConditions = [];
      this.listOfExistingConditions = [];
      this.visibilityListOfExistingConditions = [];
      this.ruleIdCreated = '';
      this.visibilityRuleIdCreated = '';
      this.hasSpecialCharacter = false;
      this.ruleExists = false;
      this.visibilityRuleExists = false;

      // reset values for styles
      this.selectedHFontColor = '';
      this.selectedHbgColor = '';
      this.selectedBFontColor = '';
      this.selectedBBgcolor = '';
      this.dateFormatvalue = '564/';
      this.timeFormatvalue = '124';
      this.numFormatvalue = '2';
      this.curFormatvalue = '2';
      this.fontfamily = DEFAULT_FONT_FAMILY;
      this.fontsize = '10px';
      this.SerialNumber = false;
      this.catStyle = '';

      this.template.querySelectorAll('lightning-checkbox-group ').forEach(element => {
          if (element.value != null) {
              element.value = '';
          }
      });
      this.isLoaded = false;
      this.childLookupAPI = '';

      // Changes by Kapil - Onload Fix
      this.handleObjectNameSelection(this.selectedObjectName);
  }

  /*
    This function is used to display the data onload. 
    It displays the data related to the various sections
    a. Object Name
    b. Selected Fields
    c. Rules 
    d. Date Format
    e. Number Format
    f. Chart 
    g. Table
    h. Colors
    i. Attributes
  */
  @api loadsectionsectionvaluesforedit(recordID) {

      // Changes by Kapil - Onload Fix
      this.handleObjectNameSelection(this.selectedObjectName);
      this.isLoaded = true;
      this.sectionrecordid = recordID;
      this.Recorddetailsnew.Id = recordID;

      this.tableheaders = [];
      this.tabsection = [];
      this.getGroupingValues = [];
      this.newPage = false;
      this.ruleExists = false;
      this.visibilityRuleExists = false;
      this.changedHeaders = [];

      gettemplatesectiondata({
              editrecordid: recordID
          })
          .then(result => {
              if (result != null) {
                  this.isLoaded = false;
                  this.Recorddetailsnew.Name = result.Name;
                  this.Recorddetailsnew.DxCPQ__Document_Template__c = result.DxCPQ__Document_Template__c;
                  this.Recorddetailsnew.DxCPQ__Sequence__c = result.DxCPQ__Sequence__c;
                  this.Recorddetailsnew.DxCPQ__Type__c = result.DxCPQ__Type__c;
                  this.Recorddetailsnew.DxCPQ__New_Page__c = result.DxCPQ__New_Page__c;
                  this.Recorddetailsnew.DxCPQ__DisplaySectionName__c = result.DxCPQ__DisplaySectionName__c;
                  this.Recorddetailsnew.DxCPQ__Section_Content__c = result.DxCPQ__Section_Content__c;
                  this.Recorddetailsnew.DxCPQ__Section_Visibility_Rule__c = result.DxCPQ__Section_Visibility_Rule__c;

                  if (result.DxCPQ__RuleId__c != null && result.DxCPQ__RuleId__c != '') {
                      this.Recorddetailsnew.DxCPQ__RuleId__c = result.DxCPQ__RuleId__r.Id;
                      this.ruleExpression = result.DxCPQ__RuleId__r.DxCPQ__Rule_Expression__c;
                  } else {
                      this.Recorddetailsnew.DxCPQ__RuleId__c = '';
                  }
                  if (result.DxCPQ__Section_Visibility_Rule__c != null && result.DxCPQ__Section_Visibility_Rule__c != '') {
                      this.Recorddetailsnew.DxCPQ__Section_Visibility_Rule__c = result.DxCPQ__Section_Visibility_Rule__c;
                      this.visibilityRuleExpression = result.DxCPQ__Section_Visibility_Rule__r.DxCPQ__Rule_Expression__c;
                  } else {
                      this.Recorddetailsnew.DxCPQ__Section_Visibility_Rule__c = '';
                  }
                  this.sectiontype = result.DxCPQ__Type__c;

                  // Filtering On Load 
                  if (result.DxCPQ__RuleId__r != null) {
                      this.ruleIdCreated = result.DxCPQ__RuleId__r.Id;
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
                  if (result.DxCPQ__Section_Visibility_Rule__c != null) {
                      this.visibilityRuleIdCreated = result.DxCPQ__Section_Visibility_Rule__c;
                      this.visibilityRuleExists = true;
                  } else {
                      this.visibilityRuleIdCreated = null;
                      this.visibilityListOfExistingConditions = [];
                      this.visibilityConditionsArr = [];
                      this.visibilityRuleExists = false;
                      this.visibilityFilteringCondition = '';
                  }

                  if (this.visibilityRuleIdCreated != null && this.visibilityRuleIdCreated != '') {
                      this.handleRuleWrapperMaking();
                      let event = new Object();
                      this.getExistingConditions(event);
                      this.visibilityRuleExists = true;
                  }

                  this.newPage = result.DxCPQ__New_Page__c;

                  if (result.DxCPQ__Section_Content__c != null && result.DxCPQ__Section_Content__c != undefined) {
                      var parsedJson = JSON.parse(result.DxCPQ__Section_Content__c);
                      this.showPicklist = true;
                      this.value = parsedJson.mainChildObject;
                      var attribute = [];
                      this.lstOfObjects = [];
                      this.loadUp = false;
                      this.lstofaddedfields = [];
                      this.showNumberFields = [];
                      this.showCalculatorFields = false;

                      // What the loaded section sets on elements that may not be rendered yet; see applyPendingUi.
                      this.pendingUi = [];

                      if (parsedJson.mainChildObject) {
                          attribute.push({
                              label: parsedJson.mainChildObject,
                              value: parsedJson.mainChildObject,
                              selected: true
                          });
                          this.setWhenRendered('[data-id="childObject"]', el => el.setupOptions(attribute));
                      }

                      if (parsedJson.grouping) {
                          this.showPicklist = true;
                      }

                      //this.handlegettingfields(parsedJson.mainChildObject, true, parsedJson.tablelistLabels);
                      this.handleTableDisplay(parsedJson.tablelistLabels, true);
                      this.selectedfields = parsedJson.tablelistLabels;
                      this.selChildObjName = parsedJson.mainChildObject;
                      this.childLookupAPI = parsedJson.childLookupfieldAPIname;
                      this.displayfields = true;

                      const cust = {
                          detail: {
                              values: [parsedJson.mainChildObject]
                          }
                      };
                      const objectLoaded = this.handleObjectselection(cust);

                      // Added Fields
                      this.loadUp = true;
                      this.allNumericalFields = [];
                      this.allnumValues = [];

                      // The field list comes from Apex: the saved fields are restored when it has arrived, not after a fixed delay (U-R14).
                      objectLoaded.then(() => {
                          if (parsedJson.grouping) {
                              const groupingOption = this.getGroupingValues.find(option => option.value === parsedJson.grouping);
                              this.setWhenRendered('[data-id="picklist"]', el => el.setupOptions([{
                                  label: groupingOption ? groupingOption.label : parsedJson.grouping,
                                  value: parsedJson.grouping,
                                  selected: true
                              }]));
                          }
                          return this.restoreAddedFields(parsedJson);
                      }).catch(error => {
                          console.log(error);
                      });

                      this.selectchildpicklist = parsedJson.grouping;
                      if (parsedJson.grouping != null && parsedJson.grouping != "") {
                          this.noGrouping = true;
                          this.nosubTotal = false;
                          this.chartControl = false;

                          for (let i = 0; i < parsedJson.groupingCatVals.length; i++) {
                              this.tabsection.push(parsedJson.groupingCatVals[i].label.toUpperCase());
                          }
                      } else {
                          this.noGrouping = false;
                      }

                      // Styles on Load
                      this.selectedHFontColor = parsedJson.style.header.fontcolor;
                      this.selectedHbgColor = parsedJson.style.header.backgroundColor;
                      this.selectedBFontColor = parsedJson.style.category.fontcolor;
                      this.selectedBBgcolor = parsedJson.style.category.backgroundColor;
                      this.dateFormatvalue = parsedJson.dateFormat;
                      this.timeFormatvalue = parsedJson.timeFormat;
                      this.numFormatvalue = parsedJson.numberFormat;
                      this.curFormatvalue = parsedJson.currencyFormat;
                      this.fontfamily = upgradeLegacyFontFamily(parsedJson.style.header.fontfamily);
                      this.fontsize = parsedJson.style.header.fontsize;
                      //this.attributeCheckboxValue = parsedJson.getAttributes;

                      // Filtering Conditions On Load
                      if (this.ruleIdCreated != '') {
                          this.filteringCondition = parsedJson.whereClause.substring(1, parsedJson.whereClause.length - 1);
                      }
                       if (this.visibilityRuleIdCreated != '') {
                          this.visibilityFilteringCondition = parsedJson.whereClause.substring(1, parsedJson.whereClause.length - 1);
                      }

                      // Serial Number On Load
                      this.SerialNumber = parsedJson.SerialNumber;
                      this.setWhenRendered('[data-id="serialNumber"]', el => { el.checked = parsedJson.SerialNumber; });

                      // New Page on Load
                      this.newPage = parsedJson.newPage;
                      this.setWhenRendered('[data-id="newPageRO"]', el => { el.checked = parsedJson.newPage; });

                      //Chart things On Load
                      if (parsedJson.subTotal != null && parsedJson.subTotal != "" && parsedJson.displayChart == true) {
                          this.displayChart = parsedJson.displayChart;
                          this.chartLabel = parsedJson.chartLabel;
                          this.subtotalFieldValue = parsedJson.selGraphvalue;
                          this.chartControl = true;
                          this.showCalculatorFields = true;

                          this.setWhenRendered('[data-id="chartBox"]', el => { el.checked = parsedJson.displayChart; });
                          // The chart field list (subtotalField) is filled by restoreAddedFields; the value is bound.
                          this.setWhenRendered('[data-id="newChartPage"]', el => { el.checked = parsedJson.chartNewPage; });
                      } else {
                          this.allnumValues = []
                          this.displayChart = false;
                          this.chartLabel = "Chart";
                          this.subtotalFieldValue = null;
                          this.chartControl = false;
                      }
                  }
              }
          })
          .catch(error => {
              console.log('Error - gettemplatesectiondetails' + error);
              this.isLoaded = false;
          })
  }

  /*
    Based on the user selection on "Object Fields", the picklist fields available in that object will be displayed in another picklist
  */
  handleObjectselection(event) {
      let loaded = Promise.resolve();
      this.showPicklist = false;
      let val = event.detail.values;

      const selObjName = (val && val.length > 0) ? val[0] : "";
      if (event.detail.values == '') {
          this.lstOfObjects = [];
      }

      if (selObjName == null || selObjName == '') {
          this.displayfields = false;
          this.showtablecontent = false;
          this.values = [];
          this.tableheaders = [];
          this.tablerows = [];
      } else {
          this.selChildObjName = selObjName;
          this.lstofaddedfields = [];
          this.tabsection = [];
          this.getGroupingValues = [];

          const groupingLoaded = getGroupingOptions({
                  selectedObject: this.selChildObjName
              })
              .then((result) => {
                  this.getpicklistdata = result;
                  return result;
              })
              .catch((error) => {
                  console.log(error);
              });

          const fieldsLoaded = getFields({
              selectedObject: this.selChildObjName
          }).then(result => {
              if (result) {
                  let tempObj = {};
                  let index = 0;
                  tempObj.index = index;
                  tempObj.fieldList = [];
                  result.forEach(field => {
                      if (field.apiName != this.selectchildpicklist)
                          tempObj.fieldList.push({
                              label: field.name,
                              value: field.apiName,
                              dataType: field.dataType
                          });
                  });
                  tempObj.fieldWrap = result;
                  tempObj.uKey = (new Date()).getTime() + ":" + index;
                  this.lstOfObjects.push(tempObj);
                  if (this.lstOfObjects.length > 0) {
                      this.showLstOfObj = true;
                  }
                  this.displayfields = true;
              }
              return result;
          }).catch(error => {
              console.log('error while retrieving the fields' + error)
          });

          // The Category list shows the field labels (the picklist API names only as values), so it waits for both calls (U-R2).
          loaded = Promise.all([groupingLoaded, fieldsLoaded]).then(([groups, fields]) => {
              const labelOf = {};
              (fields || []).forEach(field => { labelOf[field.apiName.toLowerCase()] = field.name; });
              const options = [];
              for (let temp in groups) {
                  options.push({ 'label': labelOf[temp.toLowerCase()] || temp, 'value': temp });
              }
              this.getGroupingValues = options;
              if (groups) {
                  this.showPicklist = true;
              }
          });
      }
      this.handleRuleWrapperMaking();
      return loaded;
  }

  /*
  Based on the user selection on the picklist field, the selected picklist field will be used in grouping the data in the table.
  */
    handleSelectedGroupingValue(event) {
        if (event.detail.values.length != 0) {
            this.noGrouping = true;
            this.selectchildpicklist = event.detail.values[0];
            this.getselectionfieldvalues = this.getpicklistdata[this.selectchildpicklist];
            this.showpicklistValues = true;
            this.tabsection = [];
            for (let i = 0; i < this.getselectionfieldvalues.length; i++) {
                this.tabsection.push(this.getselectionfieldvalues[i].value.toUpperCase());
            }
            if (this.tabsection.length > 0) {
                this.showChartBox = true;
            }
        } else {
            this.tabsection = [];
            this.noGrouping = false;
            this.selectchildpicklist = '';
        }
        this.chartControl = this.noGrouping && this.displayChart && this.nosubTotal;
        const saveEvent = new CustomEvent('datasaved', {detail: false });
        this.dispatchEvent(saveEvent);
    }

    get options() {
        return this.calculateOptions;
    }

  /*
   Based on the user input on Object, the related fields are displayed in the dual list box.
   Once the user selects the fields in dual list box they will be displayed in the preview table
  */
  handleTableDisplay(selectedfieldsArray, isonload) {
      if (isonload == true) {
          if (selectedfieldsArray.length > 1 && selectedfieldsArray.includes(',')) {
              if (selectedfieldsArray.includes(',')) {
                  let arr = selectedfieldsArray.split(',');
                  for (let i = 0; i < arr.length; i++) {
                      this.tableheaders.push(arr[i]);
                  }
              } else {
                  this.tableheaders.push(selectedfieldsArray);
              }
          }
          if (this.tableheaders.length < 1) {
              if (selectedfieldsArray.length > 1) {
                  for (let i = 0; i < selectedfieldsArray.length; i++) {
                      this.tableheaders.push(selectedfieldsArray[i]);
                  }
              } else {
                  this.tableheaders.push(selectedfieldsArray);
              }
          }
      } else {
          let selectedfieldlabel;
          let selectedremovingfield;

          for (let i = 0; i < this.lstofaddedfields.length; i++) {
              if (this.lstofaddedfields[i].value == selectedfieldsArray) {
                  selectedfieldlabel = this.lstofaddedfields[i].label;
              }
          }

          for (let i = 0; i < this.lstofremovedFields.length; i++) {
              if (this.lstofremovedFields[i][0].value == selectedfieldsArray) {
                  selectedremovingfield = this.lstofremovedFields[i][0].label;
              }
          }

          if (this.tableheaders.includes(selectedremovingfield)) {
              for (let i = 0; i < this.tableheaders.length; i++) {
                  if (this.tableheaders[i] == selectedremovingfield) {
                      const t = this.tableheaders.splice(i, 1);
                  }
              }
          } else {
              this.tableheaders.push(selectedfieldlabel);
          }
      }
      this.sectionSpan = this.tableheaders.length;
      this.catStyle = "background-color :" + this.selectedBBgcolor + "; color:" + this.selectedBFontColor + ';font-size:' + this.fontsize + ';font-family:' + this.fontfamily + ';';
      this.tablerows = [];
      for (var i = 0; i < 1; i++) {
          const myObj = new Object();
          myObj.rownumber = 'row' + i;
          var columns = [];
          for (var j = 0; j < this.tableheaders.length; j++) {
              columns.push('<data>');
          }
          myObj.columns = columns;
          this.tablerows.push(myObj);
      }
      this.showtablecontent = true;
      this.displaySaveTableButton = true;
  }

  handlerelatedobjectSave() {
      for (var i = 0; i < 1; i++) {
          const myObj = new Object();
          myObj.rownumber = 'row' + i;
          var columns = [];
          for (var j = 0; j < this.tableheaders.length; j++) {
              columns.push('row' + i + 'col' + j);
          }
          myObj.columns = columns;
          this.tablerows.push(myObj);
      }
      this.showtablecontent = true;
      this.displaySaveTableButton = true;
  }

  /*
  All the data entered above will be stored in the JSON Format and will get saved in the Document Template section 
  */
  handlesectionsave(event) {
      if (this.selChildObjName == '' || this.Recorddetailsnew.Name == '' || this.lstofaddedfields == '') {
          const Errormsg = new ShowToastEvent({
              title: 'Error',
              message: 'Please Enter Name, Select Object & Fields before Saving',
              variant: 'Error'
          });
          this.dispatchEvent(Errormsg);
      } else {
          var childloopkupfieldAPIname;
          var jsonString = '';
          const saveEvent = new CustomEvent('datasaved', {detail: true });
          this.dispatchEvent(saveEvent);
          var obj = {};

          if (this.ruleIdCreated != '' && this.ruleIdCreated != null) {
              this.ruleCondition = true;
              this.getExistingConditions(obj);
              this.filteringCondition = this.handleFilterClauseMaking(this.ruleExpression, this.lstofactualConditions);
          } else {
              this.filteringCondition = '';
          }
           if (this.visibilityRuleIdCreated != '' && this.visibilityRuleIdCreated != null) {
              this.visibilityRuleCondition = true;
              this.getExistingConditions(obj);
              this.visibilityFilteringCondition = this.handleFilterClauseMaking(this.visibilityRuleExpression, this.visibilityLstofactualConditions);
          } else {
              this.visibilityFilteringCondition = '';
          }
          this.ruleCondition = this.visibilityRuleCondition = false;

          if (this.selChildObjName != undefined) {
              if (this.childobjects.hasOwnProperty(this.selChildObjName)) {
                  childloopkupfieldAPIname = this.childobjects[this.selChildObjName];
                  this.childLookupAPI = childloopkupfieldAPIname;
              }
              //JSON construction logic START
              var obj = {};
              obj.whereClause = '(' + this.filteringCondition + ')';
              obj.mainChildObject = this.selChildObjName;
              obj.childLookupfieldAPIname = childloopkupfieldAPIname;
              obj.mainparentObject = this.documenttemplaterecord.DxCPQ__Related_To_Type__c;
              obj.SerialNumber = this.SerialNumber;
              obj.subTotal = this.allnumValues;
              obj.newPage = this.newPage;

              obj.displayChart = this.displayChart;
              obj.selGraphvalue = this.subtotalFieldValue;
              obj.chartLabel = this.chartLabel;
              obj.chartNewPage = this.chartNewPage;
              obj.chartBarColor = this.selectedBarChartColor;

              // Attribute Styles
              //obj.getAttributes = this.attributeCheckboxValue;
              //obj.attributeStyle = this.attrStyle;

              let optValues = [];
              let optLabels = [];
              for (let i = 0; i < this.lstofaddedfields.length; i++) {
                  optValues.push(this.lstofaddedfields[i].value);
                  optLabels.push(this.lstofaddedfields[i].label);
              }

              obj.tablelistValues = optValues;
              obj.tablelistLabels = optLabels;
              obj.grouping = this.selectchildpicklist;
              obj.dateFormat = this.dateFormatvalue;
              obj.timeFormat = this.timeFormatvalue;
              obj.numberFormat = this.numFormatvalue;
              obj.currencyFormat = this.curFormatvalue;

              const category = new Object();
              category.fontcolor = this.selectedBFontColor;
              category.backgroundColor = this.selectedBBgcolor;
              category.fontfamily = this.fontfamily;
              category.fontsize = this.fontsize;

              const head = new Object();
              head.fontcolor = this.selectedHFontColor;
              head.backgroundColor = this.selectedHbgColor;
              head.fontfamily = this.fontfamily;
              head.fontsize = this.fontsize;

              const styles = new Object();
              styles.category = category;
              styles.header = head;
              obj.style = styles;
              obj.groupingCatVals = this.getpicklistdata[this.selectchildpicklist];
              jsonString = JSON.stringify(obj);
          }

          var currecid = this.sectionrecordid;
          if (jsonString != '' && jsonString != null) {
              this.Recorddetailsnew.DxCPQ__Section_Content__c = jsonString;
          }

          if (currecid != '' && this.sectionrecordid.indexOf('NotSaved') == -1) {
              this.Recorddetailsnew.Id = this.sectionrecordid;
          }

          this.Recorddetailsnew.DxCPQ__Sequence__c = this.rowcount;
          this.Recorddetailsnew.DxCPQ__Type__c = this.sectiontype;
          this.Recorddetailsnew.DxCPQ__Document_Template__c = this.documenttemplaterecordid;
          this.Recorddetailsnew.DxCPQ__New_Page__c = this.newPage;

          // Filtering Conditions
          this.Recorddetailsnew.DxCPQ__RuleId__c = this.ruleIdCreated;
          this.Recorddetailsnew.DxCPQ__Section_Visibility_Rule__c = this.visibilityRuleIdCreated;

          if (this.Recorddetailsnew.Name != '' && this.Recorddetailsnew.Name != null) {
              saveDocumentTemplateSectionDetails({
                      Recorddetails: this.Recorddetailsnew
                  })
                  .then(result => {
                      if (result != null) {
                          this.savedRecordID = result;
                          const event4 = new ShowToastEvent({
                              title: 'Success',
                              message: 'Section "' + this.Recorddetailsnew.Name + '"' + ' was Saved',
                              variant: 'success',
                          });
                          this.dispatchEvent(event4);
                          var firecustomevent = new CustomEvent('savesectiondata', {
                              detail: this.savedRecordID
                          });
                          this.dispatchEvent(firecustomevent);
                          this.template.querySelector('c-hidden-component').callFromComponent(result.Id, this.tableheaders, this.selectedHbgColor, this.selectedHFontColor, this.fontsize, this.fontfamily, this.SerialNumber);
                      }
                  })
                  .catch(error => {
                      console.log('Error while saving ', error);
                  })
          }
      }
      // The designer (the parent, not a child of this template) shows its Preview button itself when it receives
      // the savesectiondata event, so nothing is needed here.
  }

  /*
    1. When the user selects a field in the dual list box, the below function handles the functionality part to display the user selected fields in the right most dual list box.
    2. It also includes the code for displaying the lookup fields
  */
  handleSelectedField(event) {
      let selectedField = event.currentTarget.value;
      let index = event.currentTarget.dataset.id;
      this.lstOfObjects.splice(parseInt(index) + 1);
      this.lstOfObjects.forEach(obj => {
          if (obj.index == index) {
              obj.value = selectedField;
              obj.fieldWrap.forEach(field => {

                  if (field.apiName == selectedField) {
                      obj.selectedFieldAPIName = field.apiName;
                      obj.selectedFieldName = field.name;
                      obj.dataType = field.dataType;
                      if (field.dataType == 'REFERENCE') {
                          this.showStatement = false;
                          obj.selectedObject = field.sObjectName;
                          obj.relationshipName = field.relationshipName;

                          let existingValues = [];
                          let fieldArray = this.lstofaddedfields.filter((obj) => obj.value.includes(field.relationshipName));
                          if (fieldArray.length > 0) {
                              fieldArray.forEach(temp => {
                                  existingValues.push(temp.value.split('.')[1])
                              });
                          }

                          getFields({
                                  selectedObject: field.sObjectName
                              })
                              .then(result => {
                                  if (result) {
                                      let tempObj = {};
                                      let index = this.lstOfObjects.length;
                                      tempObj.index = index;
                                      tempObj.fieldList = [];

                                      result.forEach(field => {
                                          if (field.dataType != 'REFERENCE' && !existingValues.includes(field.apiName))
                                              tempObj.fieldList.push({
                                                  label: field.name,
                                                  value: field.apiName,
                                                  dataType: field.dataType
                                              });
                                      });

                                      tempObj.fieldWrap = result;
                                      tempObj.uKey = (new Date()).getTime() + ":" + index;
                                      this.lstOfObjects.push(tempObj);

                                  }
                              })
                              .catch(error => {
                                  console.log('error while retrieving the fields' + error)
                              })
                      } else {
                          let tempstr;
                          for (let i = 0; i < this.lstOfObjects.length; i++) {
                              if (i == this.lstOfObjects.length - 1) {
                                  if (tempstr) {
                                      tempstr = tempstr + '.' + this.lstOfObjects[i].value;
                                  } else {
                                      tempstr = this.lstOfObjects[i].value;
                                  }
                              } else {
                                  if (tempstr) {
                                      tempstr = tempstr + '.' + this.lstOfObjects[i].relationshipName;
                                  } else {
                                      tempstr = this.lstOfObjects[i].relationshipName;
                                  }
                              }
                          }
                          this.selectedField = tempstr;
                          this.showStatement = true;
                      }
                  }
              })
          }
      })
      const saveEvent = new CustomEvent('datasaved', {detail: false });
      this.dispatchEvent(saveEvent);
  }

  /*
  This piece of code deals in displaying the fields for selecting the calculation of  grandtotals and subtotals of the available number and currency fields 
  */
  handlenumberfields(bool) {
      this.showNumberFields = [];
      if (bool) {
          for (let i = 0; i < this.lstofaddedfields.length; i++) {
              if (TOTALABLE_DATA_TYPES.includes(this.lstofaddedfields[i].dataType)) {
                  this.showNumberFields.push(this.lstofaddedfields[i]);
              }
          }
      }
      if (this.showNumberFields.length > 0) {
          this.showCalculatorFields = true;
          this.showNumberFieldsOptions = this.showNumberFields;
      }

  }

  /*
    Based on the selection of subtotals and grandtotals, the functionality to display the fields required for Graph creation is listed below
   */
  modifyOptions() {
      this.showNumberFields = this.showNumberFieldsOptions.filter(elem => {
          if (!this.allNumericalFields.includes(elem.label))
              return elem;
      });
      this.SubtotalfieldOptions();
  }

  /**
   The selected fields for the calculation of subtotals and grandtotals are omitted from the picklist. Addition and removal of the picklist fields is handled here (as the input is of multi-select type)
   */
  SubtotalfieldOptions() {
      this.subtotalField = [];
      for (let i = 0; i < this.allNumericalFields.length; i++) {
          this.subtotalField.push({
              'label': this.allNumericalFields[i],
              'value': this.allNumericalFields[i]
          });
      }
      if (this.subtotalField.length > 0) {
          this.nosubTotal = true;
      }
  }

  /*
    this piece of code displays the picklist for showing the values for displaying the chart/graph
   */
  chartValueChange(event) {
      this.subtotalFieldValue = event.detail.value;
      if (this.subtotalFieldValue.length == 0 || (!this.noGrouping) || !(this.nosubTotal)) {
          this.chartControl = false;
      } else {
          this.chartControl = true;
      }
      this.unsavedChanges();
  }

  /*
    The piece of code is to store the value of selected Subtotal feld calculation.
   */
  handleNumCalfields(event) {
      this.numfieldvalue = event.target.value;
      let numfieldlabel;
      for (let i = 0; i < this.showNumberFields.length; i++) {
          if (this.showNumberFields[i].value == this.numfieldvalue) {
              numfieldlabel = this.showNumberFields[i].label;
          }
      }
      if (!(this.allNumericalFields.includes(numfieldlabel))) {
          this.allNumericalFields.push(numfieldlabel);
          this.allnumValues.push(this.numfieldvalue);
      }

      this.modifyOptions();
      this.unsavedChanges();
  }

  /*
    Removing the selected subtotal fields from pill container and moving it back to picklist is donw by the below code
   */
  handleRemovenumField(event) {
      this.numfieldvalue = "";
      const valueRemoved = event.target.name;
      let index = this.allNumericalFields.indexOf(valueRemoved);
      this.allNumericalFields.splice(index, 1);
      this.allnumValues.splice(index, 1);
      if (this.allNumericalFields.length == 0 || !(this.allNumericalFields.includes(this.subtotalFieldValue)) || (!this.noGrouping)) {
          this.chartControl = false;
      } else {

          this.chartControl = true;
      }
      this.modifyOptions();
      this.unsavedChanges();
  }

  /*
  Adding the selected fields in the dual list box and the reciprocates on the table preview
   */
  addition() {
      if (this.selectedField != '') {
          let selectedVal = this.selectedField;
          var checkDuplicate = false;
          this.loadUp = true;
          let label;

          let selectedFieldLabel;
          for (let i = 0; i < this.lstOfObjects[0].fieldList.length; i++) {
              if (this.lstOfObjects[0].fieldList[i].value == selectedVal) {
                  this.lstofaddedfields.push(this.lstOfObjects[0].fieldList[i]);
                  selectedFieldLabel = this.lstOfObjects[0].fieldList[i].label;
                  const tem = this.lstOfObjects[0].fieldList.splice(i, 1);
              }
          }
          if (selectedVal.includes('.')) {
              let arr = selectedVal.split('.');
              let selected2 = arr[1];
              let fieldlabel;
              for (let i = 0; i < this.lstOfObjects[0].fieldWrap.length; i++) {
                  if (this.lstOfObjects[0].fieldWrap[i].relationshipName == arr[0]) {
                      fieldlabel = this.lstOfObjects[0].fieldWrap[i].name;
                      fieldlabel = fieldlabel.replace('>', '');
                  }
              }
              for (let i = 0; i < this.lstOfObjects[1].fieldList.length; i++) {
                  label = this.lstOfObjects[1].fieldList[i].label;
                  let temp = fieldlabel + '.' + label;
                  if (this.tableheaders.includes(temp)) {
                      checkDuplicate = true;
                  }
                  if (this.lstOfObjects[1].fieldList[i].value == selected2 && !checkDuplicate) {
                      this.lstofaddedfields.push({
                          "label": fieldlabel + '.' + label,
                          "value": selectedVal,
                          "dataType": this.lstOfObjects[1].fieldList[i].dataType
                      });
                      this.lstOfObjects[1].fieldList.splice(i, 1);
                  }
              }
          }
          this.handlenumberfields(true);
          if (!checkDuplicate) {
              this.handleTableDisplay(selectedVal, false);
          }
      }
      this.selectedField = '';
      if (this.showNumberFields.length === 0) {
          this.showCalculatorFields = false;
      }

  }

  /*
     Selecting the field from the list of selected fields from the right most dual list box  
   */
  handleSelectedFieldsBox(event) {
      this.selectRemoveField = event.currentTarget.value;
  }

  /*
    Removing the selected field from the list of selected fields from dual list box
   */
  Removal() {
      if (this.selectRemoveField != '') {
          if (this.changedHeaders.length > 0) {
              for (let i = 0; i < this.lstofaddedfields.length; i++) {
                  for (let j = 0; j < this.changedHeaders.length; j++) {
                      if (this.lstofaddedfields[i].label == this.changedHeaders[j].current) {
                          this.lstofaddedfields[i].label = this.changedHeaders[j].previous;
                      }
                  }
              }
          }

          for (let i = 0; i < this.lstofaddedfields.length; i++) {
              if (this.lstofaddedfields[i].value == this.selectRemoveField) {
                  if (this.lstofaddedfields[i].value.includes('.')) {
                      this.lstOfObjects[1].fieldList.unshift({
                          "label": this.lstofaddedfields[i].label.split('.')[1],
                          "value": this.lstofaddedfields[i].value.split('.')[1]
                      });
                      let t = this.lstofaddedfields.splice(i, 1);
                      this.lstofremovedFields.push(t);
                      break;
                  } else {
                      this.lstOfObjects[0].fieldList.unshift(this.lstofaddedfields[i]);
                      const t = this.lstofaddedfields.splice(i, 1);
                      this.lstofremovedFields.push(t);
                      break;
                  }
              }
          }

          if (this.changedHeaders.length > 0) {
              for (let i = 0; i < this.lstofaddedfields.length; i++) {
                  for (let j = 0; j < this.changedHeaders.length; j++) {
                      if (this.lstofaddedfields[i].label == this.changedHeaders[j].previous) {
                          this.lstofaddedfields[i].label = this.changedHeaders[j].current;
                      }
                  }
              }
          }
          this.handlenumberfields(true);
          this.handleTableDisplay(this.selectRemoveField, false);
      }
      this.selectRemoveField = '';
      if (this.showNumberFields.length === 0) {
          this.showCalculatorFields = false;
      }
  }

  /*
  Swapping the selected fields upwards in the dual list box and the change can be seen in the preview table
   */
  moveUpward() {
      this.loadUp = true;
      let selectedVal = this.selectRemoveField;
      let addedfields = this.lstofaddedfields;
      for (let i = 0; i < this.lstofaddedfields.length; i++) {

          if (selectedVal == addedfields[i].value && i != 0) {
              let temp = addedfields[i - 1];
              addedfields[i - 1] = addedfields[i];
              addedfields[i] = temp;
              break;
          }
      }
      this.lstofaddedfields = addedfields;
      let opt = [];
      for (let i = 0; i < this.lstofaddedfields.length; i++) {
          opt.push(this.lstofaddedfields[i].label);
      }
      this.tableheaders = opt;
      //if(this.lstOfObjects[0].fieldList.length) 
  }

  /*
  Swapping the selected fields downwards in the dual list box and the change can be seen in the preview table
   */
  moveDownward() {
      this.loadUp = true;
      let selectedVal = this.selectRemoveField;
      let addedfields = this.lstofaddedfields;
      for (let i = 0; i < this.lstofaddedfields.length; i++) {
          if (selectedVal == addedfields[i].value && i != (this.lstofaddedfields.length - 1)) {
              let temp = addedfields[i + 1];
              addedfields[i + 1] = addedfields[i];
              addedfields[i] = temp;
              break;
          }
      }
      this.lstofaddedfields = addedfields;
      let opt = [];
      for (let i = 0; i < this.lstofaddedfields.length; i++) {
          opt.push(this.lstofaddedfields[i].label);
      }
      this.tableheaders = opt;
  }

  selectTotalCheckBox(event) {
      this.checkTotals = event.detail.value;
  }

  /* Chart Header Changes by Rahul */

  /*
  This piece of code is used for getting the selected header value
   */
  handleRichTextArea(event) {
      this.changedLabel = event.detail.value;
      this.unsavedChanges();
  }

  /*
  This function gets the row data-id of the selected header
   */
  getSelectedTableRowHandler(event) {
      this.selectedTableRow = event.target.dataset.id;
      let select = event.target.id;
      let a = this.template.querySelectorAll('[data-id="' + this.selectedTableRow + '"]')[0];
      this.handleActionButtonsVisibility(this.selectedTableRow);
      this.unsavedChanges();
  }

  /*
  This functions displays the save and cancel buttons on the selected table header
   */
  handleActionButtonsVisibility(dataId) {
      let allSaveButtons = this.template.querySelectorAll('[data-id][data-okay]');
      let allCancelButtons = this.template.querySelectorAll('[data-id][data-cancel]');
      this.setActionButtonsVisibility(dataId, allSaveButtons);
      this.setActionButtonsVisibility(dataId, allCancelButtons);
  }

  /*
  This piece of code hides the save and cancel buttons on save/cancel
   */
  setActionButtonsVisibility(dataId, buttons) {
      if (!!buttons && buttons.length > 0) {
          for (let sbCounter = 0; sbCounter < buttons.length; sbCounter++) {


              let button = buttons[sbCounter];
              if (button.dataset.id == dataId) {
                  button.classList.add('slds-show');
                  button.classList.remove('slds-hide');
              } else {
                  button.classList.remove('slds-show');
                  button.classList.add('slds-hide');
              }
          }
      }
  }

  /*
  This piece of code reverts the previous value of the selected header on hitting cancel
   */
  previousVal(event) {
      for (let j = 0; j < this.changedHeaders.length; j++) {
          let ind = this.changedHeaders[j].index;
          if (this.lstofaddedfields[ind].label == this.changedHeaders[j].current) {
              let temp = this.changedHeaders[j].previous;
              this.lstofaddedfields[ind].label = this.changedHeaders[j].previous;
              this.renameSubtotalLabel(this.changedHeaders[j].current, this.changedHeaders[j].previous);
              this.tableheaders[ind] = '' + temp + '';
          }
      }

      let headerLabelsBeforeChange = this.tableheaders;
      this.tableheaders = [];
      setTimeout(() => {
          this.tableheaders = headerLabelsBeforeChange;
      }, 100);

      this.handleActionButtonsVisibility(null);
  }

  /*
  This piece of code saves the updated value of the selected header on hitting save
   */
  saveLabel(event) {
      const selectedRecordId = event.target.dataset.id;
      const len = this.changedLabel.length;
      this.changedLabel = this.changedLabel.substring(3, len - 4);
      let bool = false;
      let ind = this.tableheaders.indexOf(selectedRecordId);

      for (let i = 0; i < this.changedHeaders.length; i++) {
          if (this.changedHeaders[i].previous == selectedRecordId) {
              bool = true;
              this.changedHeaders[i].current = this.changedLabel;
              break;
          }
      }

      if (!bool) {
          this.changedHeaders.push({
              previous: selectedRecordId,
              current: this.changedLabel,
              index: ind
          });
      }

      for (let i = 0; i < this.lstofaddedfields.length; i++) {
          if (this.lstofaddedfields[i].label == selectedRecordId) {
              this.lstofaddedfields[i].label = this.changedLabel;
              this.renameSubtotalLabel(selectedRecordId, this.changedLabel);
          }
      }

      this.handleActionButtonsVisibility(null);
  }

  /*
    The chart finds its column by comparing the chart field with the table headers (both saved as text), so a
    renamed header has to rename the Sub Total pill, the chart field list and the chosen chart field with it.
  */
  renameSubtotalLabel(oldLabel, newLabel) {
      const position = this.allNumericalFields.indexOf(oldLabel);
      if (position > -1) {
          this.allNumericalFields[position] = newLabel;
          this.SubtotalfieldOptions();
      }
      if (this.subtotalFieldValue === oldLabel) {
          this.subtotalFieldValue = newLabel;
      }
  }

  /* Table Style Controllers - Changes by Rahul */

  handlefontcolorchange(event) {
      this.selectedfontcolor = event.target.value;
  }

  handlebgcolorchange(event) {
      this.selectedbgcolor = event.target.value;
  }

  handlerowchange(event) {
      this.rownumber = event.target.value;
  }

  handlecolchange(event) {
      this.colnumber = event.target.value;
  }

  handleSerialNumber(event) {
      this.SerialNumber = event.detail.checked;
      this.unsavedChanges();
  }

  handleDisplayChart(event) {
      this.displayChart = event.detail.checked;
      this.chartControl = !this.noGrouping && this.displayChart && this.nosubTotal;
      this.unsavedChanges();

      if (this.displayChart) {
          var _this = this;
          let chartContainer = this.template.querySelector('[data-id="ChartSection1"]');
          //chartContainer.scrollIntoView();
          this.template.querySelector('.borderdiv').style.border = '3px solid #C90D0D';

          setTimeout(function() {
              _this.template.querySelector('.borderdiv').style.border = '0px solid transparent';
              _this.template.querySelector('.borderdiv').style.transition = '1s';
          }, 2000);
      }
  }

  handleChartLabel(event) {
      this.chartLabel = event.detail.value;
  }

  handleChartNewPage(event) {
      this.chartNewPage = event.detail.checked;
      this.unsavedChanges();
  }

  handleHFontColorChange(event) {
      this.selectedHFontColor = event.detail.value;
      this.unsavedChanges();
  }

  handleHbgColorChange(event) {
      this.selectedHbgColor = event.detail.value;
      this.unsavedChanges();
  }

  handlesubtotal(event) {
      this.subtotal = event.detail.checked;
  }

  handlefontfamilyChange(event) {
      this.fontfamily = event.detail.value.replace('&quot;', '');
      this.template.querySelectorAll('.mytable')[0].style.fontFamily = this.fontfamily;
      this.catStyle = "background-color :" + this.selectedBBgcolor + "; color:" + this.selectedBFontColor + ';font-size:' + this.fontsize + ';font-family:' + this.fontfamily + ';';
      this.unsavedChanges();
  }

  handleBFontColorChange(event) {
      this.selectedBFontColor = event.detail.value;
      this.template.querySelectorAll('.mytable')[0].style.color = this.selectedBFontColor;
      this.unsavedChanges();
  }

  handleBBgColorchange(event) {
      this.selectedBBgcolor = event.detail.value;
      this.template.querySelectorAll('.mytable')[0].style.backgroundColor = this.selectedBBgcolor;
      this.unsavedChanges();
  }

  handleBDRbgColorchange(event) {
      this.selectedBDRbgcolor = event.detail.value;
      this.template.querySelectorAll('.mytable').style.border = "5px solid" + this.selectedBDRbgcolor;
      this.unsavedChanges();
  }

  handleBarChartColorChange(event) {
      this.selectedBarChartColor = event.detail.value;
      let dataIdArray = ['group-1', 'group-2', 'group-3', 'group-4', 'Others'];
      dataIdArray.forEach((item) => {
          this.template.querySelector(`[data-id=${item}]`).style.background = this.selectedBarChartColor;
      });
      this.unsavedChanges();
  }

  newfontsize() {
      let lenth = this.template.querySelectorAll('th').length;
      for (let i = 0; i < lenth; i++) {
          this.template.querySelectorAll('th')[i].style.fontSize = this.fontsize;
          this.template.querySelectorAll('th')[i].style.color = this.selectedHFontColor;
          this.template.querySelectorAll('th')[i].style.backgroundColor = this.selectedHbgColor;
      }
      this.catStyle = "background-color :" + this.selectedBBgcolor + "; color:" + this.selectedBFontColor + ';font-size:' + this.fontsize + ';font-family:' + this.fontfamily + ';';
  }

  handlefontsizeChange(event) {
      this.fontsize = event.detail.value;
      let lenth = this.template.querySelectorAll('th').length;
      for (let i = 0; i < lenth; i++) {
          this.template.querySelectorAll('th')[i].style.fontSize = this.fontsize;
      }
      this.catStyle = "background-color :" + this.selectedBBgcolor + "; color:" + this.selectedBFontColor + ';font-size:' + this.fontsize + ';font-family:' + this.fontfamily + ';';
      this.unsavedChanges();
  }

  handleDateFormat(event) {
      this.dateFormatvalue = event.detail.value;
      this.unsavedChanges();
  }

  handleTimeFormat(event) {
      this.timeFormatvalue = event.detail.value;
      this.unsavedChanges();
  }

  handleNumFormat(event) {
      this.numFormatvalue = event.detail.value;
      this.unsavedChanges();
  }

  handlecurFormat(event) {
      this.curFormatvalue = event.detail.value;
      this.unsavedChanges();
  }

  handleNewPage(event) {
      this.newPage = event.detail.checked;
      this.unsavedChanges();
  }

  /* Filtering based on Objects -> All changes by Rahul */

  /*Closeing the modal box for filter rules creation*/
  closePreviewModal() {
      this.ruleCondition = false;
      this.visibilityRuleCondition = false;
      this.template.querySelector('c-modal').hide();
  }

  /* this is to show the rules popup window on selecting the fileter label */
  handleFiltering(event) {
      this.ruleCondition = event.target.title == 'Apply Filter(s)' ? true: false;;
      this.visibilityRuleCondition = event.target.title == 'Apply Visibility Filter(s)' ? true: false;
      this.ruleModalLabel = event.target.title;
      this.template.querySelector('c-modal').show();
      this.unsavedChanges();
  }

  /* The piece of code is to get the object names for selection in rules */
  handleRuleWrapperMaking() {
    if (this.selChildObjName !== undefined) {
      getSObjectListFiltering({
        selectedChildObjectLabel: this.selChildObjName
        })
      .then((result) => {
          this.fieldWrapper = result;
      })
      .catch((error) => {
          console.log('error while Filtering the Object -> handleRuleWrapperMaking', error);
      });
    }
    if (this.selectedObjectName != undefined){
        getSObjectListFiltering({
        selectedChildObjectLabel: this.selectedObjectName
        })
      .then((result) => {
          //this.visibilityRuleFieldWrapper = this.visibilityRuleCondition==true? result:this.visibilityRuleFieldWrapper;
          //this.fieldWrapper = this.ruleCondition ? result: this.fieldWrapper;
          this.visibilityRuleFieldWrapper = result;
          //this.fieldWrapper = result;
      })
      .catch((error) => {
          console.log('error while Filtering the Object -> handleRuleWrapperMaking for visibility- ', error);
      });
    }
  }

  /*
  The piece of code is to create the rules after entering the conditions in rules popup window.
  */
  handleCreateRules(event) {
      const conditionChild = this.template.querySelector('c-conditioncmp').getConditionDetails();
      this.ruleExpression = this.ruleCondition == true?  conditionChild.expression: this.ruleExpression;
      this.visibilityRuleExpression = this.visibilityRuleCondition== true? conditionChild.expression: this.visibilityRuleExpression;

      this.createRuleConditionObjects(conditionChild.listOfConditions);
      let listOfConditions = this.ruleCondition == true? JSON.stringify(this.ruleConditions): JSON.stringify(this.visibilityRuleConditions);

      let deleteIds = null;
      let ruleExp = this.ruleCondition == true? JSON.stringify(this.ruleExpression): JSON.stringify(this.visibilityRuleExpression);
      let ruleType = this.visibilityRuleCondition == true? 'Section Visibility Rule': '';
      createRuleCondition({
              ruleConditions: listOfConditions,
              ruleExpression: ruleExp,
              deleteIds: deleteIds,
              sectionrecordid: this.sectionrecordid,
              ruleType: ruleType
          })
          .then(result => {
               if (this.ruleCondition){
                  this.ruleIdCreated = result;
                  this.ruleExists = true;
              }
              else if (this.visibilityRuleCondition){
                  this.visibilityRuleIdCreated = result;
                  this.visibilityRuleExists = true;
              }
              let event = new Object();
              this.getExistingConditions(event);
          })
          .catch(error => {
              console.log('Error -> createRuleCondition' + JSON.stringify(error));
          });

      this.template.querySelector('c-modal').hide();
  }

  /*
  The piece of code is to delete the rules aftere entering the conditions in rules popup window.
  */
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

  /*
  The piece of code is to delete the rules condition aftere entering the coditions in rules popup window.
  (As condition1 && condition2 || condition3)
  */
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
          if (this.ruleCondition){
              this.ruleConditions.push(tempObj);
          }
          else if (this.visibilityRuleCondition){
              this.visibilityRuleConditions.push(tempObj);
          }
          
          if (condition.children && condition.children.length > 0) {
              condition.children.forEach(child => {
                  if (child.group && child.group.length > 0) {
                      this.createRuleConditionObjects(child.group);
                  }
              })
          }
      })
  }

  handleFilterRuleReset() {
let ruleIdtoReset = this.ruleCondition == true ? this.ruleIdCreated: this.visibilityRuleIdCreated;
      resetRulesForTemplate({
              templateRuleId: ruleIdtoReset
          })
          .then(result => {
              if (result == 'Success') {

                   this.ruleIdCreated = this.ruleCondition == true ? null: this.ruleIdCreated;
                  this.visibilityRuleIdCreated = this.visibilityRuleCondition == true ? null: this.visibilityRuleIdCreated;

                 this.listOfExistingConditions = this.ruleCondition == true ? [] : this.listOfExistingConditions;
                  this.visibilityListOfExistingConditions = this.visibilityRuleCondition == true ? [] : this.visibilityListOfExistingConditions;
                  this.conditionsArr = [];
                   this.visibilityConditionsArr = this.visibilityConditionsArr;
                  this.ruleExists = this.ruleCondition == true ? false: this.ruleExists;
                  this.visibilityRuleExists = this.visibilityRuleCondition == true ? false: this.visibilityRuleExists;
                  this.filteringCondition = this.ruleCondition == true ? '': this.filteringCondition;
                  this.visibilityFilteringCondition = this.visibilityRuleCondition == true ? '': this.visibilityFilteringCondition;
                  this.ruleConditions = [];
                  this.ruleCondition = false;
                  this.visibilityRuleCondition = false;

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
      this.visibilityRuleCondition = false;
      this.template.querySelector('c-modal').hide();
  }

  /*
  The piece of code is to update  the rules wnich are already saved aftere entering the coditions in rules popup window .
  (As condition1 && condition2 || condition3)
  */
  handleRuleUpdates(event) {
      this.ruleConditions = this.ruleCondition == true? []: this.ruleConditions;
      this.visibilityRuleConditions = this.visibilityRuleCondition == true? [] : this.visibilityRuleConditions;
      const conditionChild = this.template.querySelector('c-conditioncmp').getConditionDetails();
      this.createRuleConditionObjects(conditionChild.listOfConditions);
     let listOfConditions = this.ruleCondition == true? JSON.stringify(this.ruleConditions): JSON.stringify(this.visibilityRuleConditions);
      let expression = JSON.stringify(conditionChild.expression);
     let deleteIds;
      let ruleType = this.visibilityRuleCondition == true? 'Section Visibility Rule': '';
      if (this.ruleCondition){
        deleteIds = this.removeDeletedConditions(this.ruleConditions, this.conditionsArr);
      }
      else if (this.visibilityRuleCondition){
        deleteIds = this.removeDeletedConditions(this.visibilityRuleConditions, this.visibilityConditionsArr);
      }
      if (!this.hasSpecialCharacter) {
          createRuleCondition({
                  ruleConditions: listOfConditions,
                  ruleExpression: expression,
                  deleteIds: deleteIds,
                  sectionrecordid: this.sectionrecordid,
                  ruleType: ruleType
              })
              .then(result => {
                  this.ruleExists = this.ruleCondition == true? true:this.ruleExists;
                  this.visibilityRuleExists = this.visibilityRuleCondition == true? true : this.visibilityRuleExists;
                  this.ruleExpression = this.ruleCondition == true? expression:this.ruleExpression;
                  this.visibilityRuleExpression = this.visibilityRuleCondition == true? expression : this.visibilityRuleExpression;

                  let event = new Object();
                  this.getExistingConditions(event);
              })
              .catch(error => {
                  console.log('createRuleCondition error occurred' + JSON.stringify(error));
              });
      }
      this.template.querySelector('c-modal').hide();
  }

  /*
    The piece of code is to get the conditions of templates in onload
  */
  getExistingConditions(event) {
      if (this.ruleCondition){
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
      if (this.visibilityRuleCondition){
          this.mapOfRC = new Map();
          this.visibilityConditionsArr = [];
          this.visibilityConditionExists = false;
          this.allConditions = [];
          this.visibilityListOfExistingConditions = [];
          getConditions({ ruleName: this.visibilityRuleIdCreated})
            .then(result => {
                if (result.length > 0) {
                    this.visibilityConditionsArr = JSON.parse(JSON.stringify(result));
                    this.visibilityLstofactualConditions = this.visibilityConditionsArr;

                    this.visibilityConditionsArr.forEach(con => {
                        this.mapOfRC.set(con.Name, con);
                    });

                    if (this.visibilityRuleFieldWrapper !== undefined) {
                        let conditionResult = createRuleConditionHierarcy(this.visibilityRuleExpression, this.mapOfRC, this.visibilityRuleFieldWrapper);
                        this.visibilityListOfExistingConditions = conditionResult.listOfConditions;
                        this.visibilitySelectedGlobalValue = conditionResult.selectedGlobalValue;
                        this.visibilityConditionExists = true;
                    }
                }
            })
            .catch(error => {
                console.log('Apex Call getExistingConditions Erroneous');
                console.log(error);
            })
      }  
  }

  /*
  This function is to send the rules according to rule cnditions to apex to run SOQL Queries
  */
  handleFilterClauseMaking(ruleExpression, lstOfConditions) {
      let actualResult = ruleExpression;
      let lst = [];
      for (let i = 0; i < lstOfConditions.length; i++) {
          let res = '' + lstOfConditions[i].DxCPQ__Condition_Field__c + ' ';

          if (lstOfConditions[i].DxCPQ__DataType__c == 'STRING' || lstOfConditions[i].DxCPQ__DataType__c == 'TEXT') {
              if (lstOfConditions[i].DxCPQ__Operator__c != '!=') {
                  res = res + 'LIKE' + ' ' + '\'%' + lstOfConditions[i].DxCPQ__Value__c + '%\'';
              } else {
                  res = '( NOT ' + lstOfConditions[i].DxCPQ__Condition_Field__c + ' LIKE' + ' ' + '\'%' + lstOfConditions[i].DxCPQ__Value__c + '%\' )';
              }
          } else if (lstOfConditions[i].DxCPQ__DataType__c == 'PICKLIST') {
              res = res + lstOfConditions[i].DxCPQ__Operator__c + ' ' + '\'' + lstOfConditions[i].DxCPQ__Value__c + '\'';
          } else {
              res = res + lstOfConditions[i].DxCPQ__Operator__c + ' ' + lstOfConditions[i].DxCPQ__Value__c;
          }
          lst.push(res);
      }

      for (let i = 0; i < lst.length; i++) {
          let ind = i + 1;
          let con = 'Condition' + ind;
          ruleExpression = actualResult.replace(con, lst[i]);
          actualResult = ruleExpression;
      }
      ruleExpression = actualResult.replaceAll('==', '=').replaceAll('&&', 'and').replaceAll('||', 'or').replaceAll('"', '');
      return ruleExpression;
  }

    handlehelp(){
        let relatedObjectsMap = this.pdfLinks.find(item => item.MasterLabel === 'Related Objects');
        let pdfUrl = relatedObjectsMap ? relatedObjectsMap.DxCPQ__Section_PDF_URL__c : null;
        const config = {
            type: 'standard__webPage',
            attributes: {
                url: pdfUrl
                }
        };
        this[NavigationMixin.Navigate](config);
    }

    unsavedChanges(){
        const saveEvent = new CustomEvent('datasaved', {detail: false });
        this.dispatchEvent(saveEvent);
    }

    //code added by Bhavya for adding Custom Font-family list - compatible with VF PDF generation
    get fontFamilies() {
        const families = [
            { label: 'Times New Roman', value: 'serif' },
            { label: 'Arial', value: 'sans-serif' },
            { label: 'Serif', value: 'serif' },
            { label: 'Verdana', value: DEFAULT_FONT_FAMILY },
            { label: 'Courier', value: COURIER_FONT_FAMILY },
        ];
        // Times New Roman and Serif share a value: only the first match is shown as selected (U-R9).
        const current = families.findIndex(family => family.value === this.fontfamily);
        return families.map((family, index) => ({ ...family, selected: index === current }));
    }

    handleFontFamilySelection(event){
        const selectedFontFamily = event.target.value;
        const table = this.template.querySelector('.tableMainClass');
        if (table) {
            table.style.fontFamily = selectedFontFamily;
        }
        this.fontfamily = event.target.value.replace('&quot;', '');
        this.template.querySelectorAll('.mytable')[0].style.fontFamily = this.fontfamily;
        this.catStyle = "background-color :" + this.selectedBBgcolor + "; color:" + this.selectedBFontColor + ';font-size:' + this.fontsize + ';font-family:' + this.fontfamily + ';';
        this.unsavedChanges();
    }
}