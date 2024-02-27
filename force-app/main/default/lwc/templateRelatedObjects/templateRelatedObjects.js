import { LightningElement, track, api} from 'lwc';
import {loadStyle } from 'lightning/platformResourceLoader';
import { createRuleConditionHierarcy } from 'c/conditionUtil';
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
import createLog from '@salesforce/apex/LogHandler.createLog';

export default class TemplateRelatedObjects extends LightningElement {

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
        //DxCPQ__DisplaySectionName__c: false,
        DxCPQ__New_Page__c: false,
        DxCPQ__Document_Template__c: '',
        DxCPQ__Sequence__c: 0,
        DxCPQ__Type__c: '',
        Id: '',
        DxCPQ__RuleId__c: '',
    };

    ruleCondition = false;
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
    curFormatvalue = '1';
    @track renderedData = false;

    // Filtering params
    listOfExistingConditions = [];
    conditionsArr;
    selectedGlobalValue;
    ruleExpression;
    ruleConditions = [];
    mapOfRC;
    lstofactualConditions;
    conditionExists = false;
    allConditions = [];
    ruleIdCreated = '';
    ruleExists = false;
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
    @track listOfRelatedObjects = [];
    @track listOfAddedFields = [];
    lstofremovedFields = [];
    chartLabel = 'Chart';
    selectedBarChartColor = '#007CBA';

    selectedFieldToBeRemoved;
    selectedField;
    showStatement = false;
    showLstOfObj = false;
    requiredOptions = [];
    selectedfields;
    showChartBox = true;
    showtablecontent = false;
    @track tableHeaders = [];
    @track tablerows = [];
    @track objectTypeOptions;
    displaySaveTableButton = false;
    fieldsdatamap = [];
    selectedChildObjectName;
    @track savedRecordID;
    isLoaded = false;

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

    fontfamily = 'Verdana';
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

    displayChartSection = false;
    chartControl = false;
    chartNewPage = true;
    newPage = false;

    chartLst = [{
            "label": "group-1",
            "percent": "23%",
            "height": `height:23%; `,
            "width": "width : 13.571428571428571%;",
            "value": 2367510
        },
        {
            "label": "group-2",
            "percent": "32%",
            "height": `height:32%; `,
            "width": "width : 13.571428571428571%;",
            "value": 256372
        },
        {
            "label": "group-3",
            "percent": "20%",
            "height": `height:20%; `,
            "width": "width : 13.571428571428571%;",
            "value": 2867396
        },
        {
            "label": "group-4",
            "percent": "9%",
            "height": `height:9%; `,
            "width": "width : 13.571428571428571%;",
            "value": 1257704
        },
        {
            "label": "Others",
            "percent": "16%",
            "height": `height:16%; `,
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
        this.tableHeaders = [];
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
            .catch(error => {
                let tempError = error.toString();
                let errorMessage = error.message || 'Unknown error message';
                createLog({recordId:'', className:'templateRelatedObjects LWC Component', exceptionMessage:errorMessage, logData:tempError, logType:'Exception'});    
            });

        this.newfontsize();
    }

    // Changes by Kapil 
    @api handleObjectNameSelection(objName) {
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
                    }
                }
            })
            .catch(error => {
                let tempError = error.toString();
                let errorMessage = error.message || 'Unknown error message';
                createLog({recordId:'', className:'templateRelatedObjects LWC Component', exceptionMessage:errorMessage, logData:tempError, logType:'Exception'});    
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
    }

    /*
    This function handles the deletion part of a section
    */
    handlesectionDelete() {
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
                     let tempError = error.toString();
            let errorMessage = error.message || 'Unknown error message';
            createLog({recordId:'', className:'templateRelatedObjects LWC Component', exceptionMessage:errorMessage, logData:tempError, logType:'Exception'});
                })
        }
    }

    // This function takes the user input for the section name 
    handlename(event) {
        this.Recorddetailsnew.Name = event.detail.value;
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
        this.selectedChildObjectName = '';
        this.displayfields = false;
        this.showtablecontent = false;
        this.displaySaveTableButton = false;
        this.tableHeaders = [];
        this.tabsection = [];
        this.noGrouping = false;
        this.allnumValues = [];
        this.chartControl = false;
        this.chartNewPage = true;
        this.listOfRelatedObjects = [];
        this.chartLabel = 'Chart';
        this.selectedBarChartColor = '#007CBA';
        this.allNumericalFields = [];
        this.showCalculatorFields = false;
        this.displayChartSection = false;
        this.subtotalFieldValue = '';
        this.selectchildpicklist = '';
        this.showPicklist = false;
        this.showNumberFields = [];
        this.subtotalField = [];
        this.numfieldvalue = '';
        this.newPage = false;
        this.changedHeaders = [];

        // Filtering QLIs reset
        this.filteringCondition = '';
        this.mapOfRC = new Map();
        this.conditionsArr = [];
        this.conditionExists = false;
        this.allConditions = [];
        this.listOfExistingConditions = [];
        this.ruleIdCreated = '';
        this.hasSpecialCharacter = false;
        this.ruleExists = false;

        // reset values for styles
        this.selectedHFontColor = '';
        this.selectedHbgColor = '';
        this.selectedBFontColor = '';
        this.selectedBBgcolor = '';
        this.dateFormatvalue = '564/';
        this.timeFormatvalue = '124';
        this.numFormatvalue = '2';
        this.curFormatvalue = '1';
        this.fontfamily = "Verdana";
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

        this.tableHeaders = [];
        this.tabsection = [];
        this.getGroupingValues = [];
        this.newPage = false;
        this.ruleExists = false;
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
                    this.Recorddetailsnew.DxCPQ__Section_Content__c = result.DxCPQ__Section_Content__c;

                    if (result.DxCPQ__RuleId__c != null && result.DxCPQ__RuleId__c != '') {
                        this.Recorddetailsnew.DxCPQ__RuleId__c = result.DxCPQ__RuleId__r.Id;
                        this.ruleExpression = result.DxCPQ__RuleId__r.DxCPQ__Rule_Expression__c;
                    } else {
                        this.Recorddetailsnew.DxCPQ__RuleId__c = '';
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
                    this.newPage = result.DxCPQ__New_Page__c;

                    if (result.DxCPQ__Section_Content__c != null && result.DxCPQ__Section_Content__c != undefined) {
                        var sectionContentToLoad = JSON.parse(result.DxCPQ__Section_Content__c);
                        this.showPicklist = true;
                        this.value = sectionContentToLoad.mainChildObject;
                        var attribute = [];
                        var attribute1 = [];
                        this.listOfRelatedObjects = [];
                        this.loadUp = false;
                        this.listOfAddedFields = [];
                        this.showNumberFields = [];
                        this.showCalculatorFields = false;

                        if (sectionContentToLoad.mainChildObject) {
                            attribute.push({
                                label: sectionContentToLoad.mainChildObject,
                                value: sectionContentToLoad.mainChildObject,
                                selected: true
                            });
                            setTimeout(() => {
                                this.template.querySelector('[data-id="childObject"]').setupOptions(attribute);
                            }, 2000);
                        }

                        if (sectionContentToLoad.grouping) {
                            this.showPicklist = true;
                            attribute1.push({
                                label: sectionContentToLoad.grouping,
                                value: sectionContentToLoad.grouping,
                                selected: true
                            });
                            setTimeout(() => {
                                this.template.querySelector('[data-id="picklist"]').setupOptions(attribute1);
                            }, 1000);
                        }

                        this.handleTableDisplay(sectionContentToLoad.tablelistLabels, true);
                        this.selectedfields = sectionContentToLoad.tablelistLabels;
                        this.selectedChildObjectName = sectionContentToLoad.mainChildObject;
                        this.childLookupAPI = sectionContentToLoad.childLookupfieldAPIname;
                        this.displayfields = true;

                        const cust = {
                            detail: {
                                values: [sectionContentToLoad.mainChildObject]
                            }
                        };
                        this.handleObjectselection(cust);

                        // Added Fields
                        this.loadUp = true;
                        this.allNumericalFields = [];

                        setTimeout(() => {
                            for (let j = 0; j < sectionContentToLoad.tablelistValues.length; j++) {
                                let jump = true;

                                for (let i = 0; i < this.listOfRelatedObjects[0].fieldList.length; i++) {
                                    if (this.listOfRelatedObjects[0].fieldList[i].value.toLowerCase() == sectionContentToLoad.tablelistValues[j].toLowerCase()) {
                                        this.listOfAddedFields.push(this.listOfRelatedObjects[0].fieldList[i]);

                                        if (this.listOfRelatedObjects[0].fieldList[i].dataType == "NUMBER" || this.listOfRelatedObjects[0].fieldList[i].dataType == "CURRENCY" || this.listOfRelatedObjects[0].fieldList[i].dataType == "DOUBLE") {
                                            this.showNumberFields.push(this.listOfRelatedObjects[0].fieldList[i]);
                                            this.showCalculatorFields = true;
                                        }

                                        sectionContentToLoad.subTotal.forEach(key => {
                                            if (key.toLowerCase() == this.listOfRelatedObjects[0].fieldList[i].value.toLowerCase()) {
                                                this.allNumericalFields.push(this.listOfRelatedObjects[0].fieldList[i].label);
                                            }
                                        });
                                        this.listOfRelatedObjects[0].fieldList.splice(i, 1);
                                        break;
                                    }

                                    if (sectionContentToLoad.tablelistValues[j].includes('.') && jump) {
                                        let tempStr = sectionContentToLoad.tablelistValues[j].replace('.', '*');
                                        let tempCount = tempStr.indexOf('*');
                                        let strTemp = tempStr.replace(tempStr.substring(tempCount), '');

                                        let referenceObject = this.listOfRelatedObjects[0].fieldWrap.filter((obj) => obj.relationshipName == strTemp);

                                        if (referenceObject.length > 0 && jump) {
                                            getFields({
                                                    selectedObject: referenceObject[0].sObjectName
                                                })
                                                .then(result => {
                                                    let tempVar = tempStr.replace(tempStr.substring(0, tempCount + 1), '');
                                                    for (let key of result) {
                                                        if (tempVar.toLowerCase() == key.apiName.toLowerCase() && jump) {
                                                            if (this.listOfAddedFields.length < this.tableHeaders.length) {
                                                                this.listOfAddedFields.push({
                                                                    'label': referenceObject[0].name.substring(0, referenceObject[0].name.length - 1) + '.' + key.name,
                                                                    "value": sectionContentToLoad.tablelistValues[j],
                                                                    "dataType": key.dataType
                                                                });
                                                            }
                                                            jump = false;
                                                            if (key.dataType == "NUMBER" || key.dataType == "CURRENCY" || key.dataType == "DOUBLE") {
                                                                this.showNumberFields.push({
                                                                    'label': referenceObject[0].name.substring(0, referenceObject[0].name.length - 1) + '.' + key.name,
                                                                    "value": sectionContentToLoad.tablelistValues[j],
                                                                    "dataType": key.dataType
                                                                });
                                                                this.showCalculatorFields = true;
                                                            }
                                                        }
                                                        if (sectionContentToLoad.subTotal.includes(sectionContentToLoad.tablelistValues[j])) {
                                                            this.allNumericalFields.push(referenceObject[0].name.substring(0, referenceObject[0].name.length - 1) + '.' + key.name);
                                                        }
                                                    }
                                                })
                                                .catch((error) => {
                                                     let tempError = error.toString();
            let errorMessage = error.message || 'Unknown error message';
            createLog({recordId:'', className:'templateRelatedObjects LWC Component', exceptionMessage:errorMessage, logData:tempError, logType:'Exception'});
                                                })
                                        }
                                    }
                                }
                            }
                        }, 1000);

                        this.selectchildpicklist = sectionContentToLoad.grouping;
                        if (sectionContentToLoad.grouping != null && sectionContentToLoad.grouping != "") {
                            this.noGrouping = true;
                            this.nosubTotal = false;
                            this.chartControl = false;
                            sectionContentToLoad.groupingCatVals.forEach((item) => {
                                this.tabsection.push(item.label.toUpperCase());
                            })
                        } else {
                            this.noGrouping = false;
                        }

                        // Styles on Load
                        this.selectedHFontColor = sectionContentToLoad.style.header.fontcolor;
                        this.selectedHbgColor = sectionContentToLoad.style.header.backgroundColor;
                        this.selectedBFontColor = sectionContentToLoad.style.category.fontcolor;
                        this.selectedBBgcolor = sectionContentToLoad.style.category.backgroundColor;
                        this.dateFormatvalue = sectionContentToLoad.dateFormat;
                        this.timeFormatvalue = sectionContentToLoad.timeFormat;
                        this.numFormatvalue = sectionContentToLoad.numberFormat;
                        this.curFormatvalue = sectionContentToLoad.currencyFormat;


                        this.fontfamily = sectionContentToLoad.style.header.fontfamily;
                        this.fontsize = sectionContentToLoad.style.header.fontsize;

                        // Filtering Conditions On Load
                        if (this.ruleIdCreated != '') {
                            this.filteringCondition = sectionContentToLoad.whereClause.substring(1, sectionContentToLoad.whereClause.length - 1);
                        }

                        // Serial Number On Load
                        this.SerialNumber = sectionContentToLoad.SerialNumber;
                        setTimeout(() => {
                            this.template.querySelector('[data-id="serialNumber"]').checked = sectionContentToLoad.SerialNumber;
                        });

                        // New Page on Load
                        this.newPage = sectionContentToLoad.newPage;
                        setTimeout(() => {
                            this.template.querySelector('[data-id="newPageRO"]').checked = sectionContentToLoad.newPage;
                        });

                        //Chart things On Load
                        if (sectionContentToLoad.subTotal != null && sectionContentToLoad.subTotal != "" && sectionContentToLoad.displayChart == true) {
                            this.displayChartSection = sectionContentToLoad.displayChart;
                            this.chartLabel = sectionContentToLoad.chartLabel;
                            this.selectedBarChartColor = sectionContentToLoad.chartBarColor;
                            this.subtotalFieldValue = sectionContentToLoad.selGraphvalue;
                            this.chartControl = true;
                            this.showCalculatorFields = true;

                            setTimeout(() => {
                                this.template.querySelector('[data-id="chartBox"]').checked = sectionContentToLoad.displayChart;
                                this.template.querySelectorAll(`.chart-color`).forEach(item =>{
                                    item.style.background = this.selectedBarChartColor;
                                });
                            });

                            setTimeout(() => {
                                this.template.querySelector('[data-id="subtotalFieldValue"]').options = [{ 'label': this.subtotalFieldValue, 'value': this.subtotalFieldValue, selected: true }];
                                this.template.querySelector('[data-id="subtotalFieldValue"]').value = this.subtotalFieldValue
                                this.template.querySelector('[data-id="newChartPage"]').checked = sectionContentToLoad.chartNewPage;
                            });
                        } else {
                            this.allnumValues = []
                            this.displayChartSection = false;
                            this.chartLabel = "Chart";
                            this.subtotalFieldValue = null;
                            this.chartControl = false;
                        }
                    }
                }
            })
            .catch(error => {
                let tempError = error.toString();
            let errorMessage = error.message || 'Unknown error message';
            createLog({recordId:'', className:'templateRelatedObjects LWC Component', exceptionMessage:errorMessage, logData:tempError, logType:'Exception'});                     
                this.isLoaded = false;
            })
    }

    /*
      Based on the user selection on "Object Fields", the picklist fields available in that object will be displayed in another picklist
    */
    handleObjectselection(event) {
        this.showPicklist = false;

        const selectedRelatedObjectName = (event.detail.values && event.detail.values.length > 0) ? event.detail.values[0] : "";
        if (event.detail.values == '') {
            this.listOfRelatedObjects = [];
        }

        if (selectedRelatedObjectName == null || selectedRelatedObjectName == '') {
            this.displayfields = false;
            this.showtablecontent = false;
            this.values = [];
            this.tableHeaders = [];
            this.tablerows = [];
        } else {
            this.selectedChildObjectName = selectedRelatedObjectName;
            this.listOfAddedFields = [];
            this.tabsection = [];
            this.getGroupingValues = [];

            getGroupingOptions({
                    selectedObject: this.selectedChildObjectName
                })
                .then((result) => {
                    this.getpicklistdata = result;
                    this.showPicklist = true;
                    for (let temp in result) {
                        this.getGroupingValues.push({
                            'label': temp,
                            'value': temp
                        });
                    }
                })
                .catch((error) => {
                    let tempError = error.toString();
            let errorMessage = error.message || 'Unknown error message';
            createLog({recordId:'', className:'templateRelatedObjects LWC Component', exceptionMessage:errorMessage, logData:tempError, logType:'Exception'});
                })

            getFields({
                selectedObject: this.selectedChildObjectName
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
                    this.listOfRelatedObjects.push(tempObj);
                    if (this.listOfRelatedObjects.length > 0) {
                        this.showLstOfObj = true;
                    }
                    this.displayfields = true;
                }
            }).catch(error => {
                let tempError = error.toString();
            let errorMessage = error.message || 'Unknown error message';
            createLog({recordId:'', className:'templateRelatedObjects LWC Component', exceptionMessage:errorMessage, logData:tempError, logType:'Exception'});
            })
        }
        this.handleRuleWrapperMaking();
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
            this.getselectionfieldvalues.forEach(item =>{
                this.tabsection.push(item.value.toUpperCase());
            });
            if (this.tabsection.length > 0) {
                this.showChartBox = true;
            }
        } else {
            this.tabsection = [];
            this.noGrouping = false;
            this.selectchildpicklist = '';
        }
        this.chartControl = this.noGrouping && this.displayChartSection && this.nosubTotal;
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
                    this.tableHeaders = [...arr];
                } else {
                    this.tableHeaders.push(selectedfieldsArray);
                }
            }
            if (this.tableHeaders.length < 1) {
                if (selectedfieldsArray.length > 1) {
                    this.tableHeaders = [...selectedfieldsArray];
                } else {
                    this.tableHeaders.push(selectedfieldsArray);
                }
            }
        } else {
            let selectedfieldlabel;
            let selectedremovingfield;

            for (let i = 0; i < this.listOfAddedFields.length; i++) {
                if (this.listOfAddedFields[i].value == selectedfieldsArray) {
                    selectedfieldlabel = this.listOfAddedFields[i].label;
                }
            }

            for (let i = 0; i < this.lstofremovedFields.length; i++) {
                if (this.lstofremovedFields[i][0].value == selectedfieldsArray) {
                    selectedremovingfield = this.lstofremovedFields[i][0].label;
                }
            }

            if (this.tableHeaders.includes(selectedremovingfield)) {
                for (let i = 0; i < this.tableHeaders.length; i++) {
                    if (this.tableHeaders[i] == selectedremovingfield) {
                        this.tableHeaders.splice(i, 1);
                    }
                }
            } else {
                this.tableHeaders.push(selectedfieldlabel);
            }
        }
        this.sectionSpan = this.tableHeaders.length;
        this.catStyle = "background-color :" + this.selectedBBgcolor + "; color:" + this.selectedBFontColor + ';font-size:' + this.fontsize + ';font-family:' + this.fontfamily + ';';
        this.tablerows = [];
        for (var i = 0; i < 1; i++) {
            const myObj = new Object();
            myObj.rownumber = 'row' + i;
            var columns = [];
            for (var j = 0; j < this.tableHeaders.length; j++) {
                columns.push('<data>');
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
    handlesectionsave() {
        var obj = {};
        if (this.selectedChildObjectName == '' || this.Recorddetailsnew.Name == '' || this.listOfAddedFields == '') {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: 'Section name, Related Object and atleast one field are mandatory to choose!',
                variant: 'Error'
            }));
        } else {
            var childloopkupfieldAPIname;
            var jsonString = '';

            if (this.ruleIdCreated != '' && this.ruleIdCreated != null) {
                this.getExistingConditions({});
                this.filteringCondition = this.handleFilterClauseMaking(this.ruleExpression, this.lstofactualConditions);
            } else {
                this.filteringCondition = '';
            }

            if (this.selectedChildObjectName != undefined) {
                if (Object.prototype.hasOwnProperty.call(this.childobjects, this.selectedChildObjectName)) {
                    childloopkupfieldAPIname = this.childobjects[this.selectedChildObjectName];
                    this.childLookupAPI = childloopkupfieldAPIname;
                }

                //JSON construction logic START
                obj = {};
                obj.whereClause = '(' + this.filteringCondition + ')';
                obj.mainChildObject = this.selectedChildObjectName;
                obj.childLookupfieldAPIname = childloopkupfieldAPIname;
                obj.mainparentObject = this.documenttemplaterecord.DxCPQ__Related_To_Type__c;
                obj.SerialNumber = this.SerialNumber;
                obj.subTotal = this.allnumValues;
                obj.newPage = this.newPage;

                obj.displayChart = this.displayChartSection;
                obj.selGraphvalue = this.subtotalFieldValue;
                obj.chartLabel = this.chartLabel;
                obj.chartNewPage = this.chartNewPage;
                obj.chartBarColor = this.selectedBarChartColor;

                let optValues = [];
                let optLabels = [];
                for (let i = 0; i < this.listOfAddedFields.length; i++) {
                    optValues.push(this.listOfAddedFields[i].value);
                    optLabels.push(this.listOfAddedFields[i].label);
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

            if (jsonString != '' && jsonString != null) {
                this.Recorddetailsnew.DxCPQ__Section_Content__c = jsonString;
            }

            if (this.sectionrecordid != '' && this.sectionrecordid.indexOf('NotSaved') == -1) {
                this.Recorddetailsnew.Id = this.sectionrecordid;
            }

            this.Recorddetailsnew.DxCPQ__Sequence__c = this.rowcount;
            this.Recorddetailsnew.DxCPQ__Type__c = this.sectiontype;
            this.Recorddetailsnew.DxCPQ__Document_Template__c = this.documenttemplaterecordid;
            this.Recorddetailsnew.DxCPQ__New_Page__c = this.newPage;

            // Filtering Conditions
            this.Recorddetailsnew.DxCPQ__RuleId__c = this.ruleIdCreated;

            if (this.Recorddetailsnew.Name != '' && this.Recorddetailsnew.Name != null) {
                saveDocumentTemplateSectionDetails({
                        recordDetails: this.Recorddetailsnew
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
                            this.template.querySelector('c-hidden-component').callFromComponent(result.Id, this.tableHeaders, this.selectedHbgColor, this.selectedHFontColor, this.fontsize, this.fontfamily, this.SerialNumber);
                        }
                    })
                    .catch(error => {
                        let tempError = error.toString();
            let errorMessage = error.message || 'Unknown error message';
            createLog({recordId:'', className:'templateRelatedObjects LWC Component', exceptionMessage:errorMessage, logData:tempError, logType:'Exception'});
                    })
            }
        }
        this.template.querySelector('c-template-designer-cmp').showPreview = true;
    }

    /*
      1. When the user selects a field in the dual list box, the below function handles the functionality part to display the user selected fields in the right most dual list box.
      2. It also includes the code for displaying the lookup fields
    */
    handleSelectedField(event) {
        let selectedField = event.currentTarget.value;
        let index = event.currentTarget.dataset.id;
        this.listOfRelatedObjects.splice(parseInt(index) + 1);
        this.listOfRelatedObjects.forEach(obj => {
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
                            let fieldArray = this.listOfAddedFields.filter((obj) => obj.value.includes(field.relationshipName));
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
                                        let index = this.listOfRelatedObjects.length;
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
                                        this.listOfRelatedObjects.push(tempObj);

                                    }
                                })
                                .catch(error => {
                                    let tempError = error.toString();
            let errorMessage = error.message || 'Unknown error message';
            createLog({recordId:'', className:'templateRelatedObjects LWC Component', exceptionMessage:errorMessage, logData:tempError, logType:'Exception'});
                                })
                        } else {
                            let tempstr;
                            for (let i = 0; i < this.listOfRelatedObjects.length; i++) {
                                if (i == this.listOfRelatedObjects.length - 1) {
                                    if (tempstr) {
                                        tempstr = tempstr + '.' + this.listOfRelatedObjects[i].value;
                                    } else {
                                        tempstr = this.listOfRelatedObjects[i].value;
                                    }
                                } else {
                                    if (tempstr) {
                                        tempstr = tempstr + '.' + this.listOfRelatedObjects[i].relationshipName;
                                    } else {
                                        tempstr = this.listOfRelatedObjects[i].relationshipName;
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
    }

    /*
    This piece of code deals in displaying the fields for selecting the calculation of  grandtotals and subtotals of the available number and currency fields 
    */
    handlenumberfields(bool) {
        this.showNumberFields = [];
        if (bool) {
            for (let i = 0; i < this.listOfAddedFields.length; i++) {
                if (this.listOfAddedFields[i].dataType == 'DOUBLE' || this.listOfAddedFields[i].dataType == 'CURRENCY' ||
                    this.listOfAddedFields[i].dataType == 'NUMBER') {
                    this.showNumberFields.push(this.listOfAddedFields[i]);
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
    }

    /*
      Removing the selected subtotal fields from pill container and moving it back to picklist is donw by the below code
     */
    handleNumericFieldRemoval(event) {
        if(!this.isDisabled){
            this.numfieldvalue = "";
            let index = this.allNumericalFields.indexOf(event.target.name);
            this.allNumericalFields.splice(index, 1);
            this.allnumValues.splice(index, 1);
            this.chartControl = (this.allNumericalFields.length == 0 || !(this.allNumericalFields.includes(this.subtotalFieldValue)) || (!this.noGrouping)) ? false : true;
            this.modifyOptions();
        }
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
            for (let i = 0; i < this.listOfRelatedObjects[0].fieldList.length; i++) {
                if (this.listOfRelatedObjects[0].fieldList[i].value == selectedVal) {
                    this.listOfAddedFields.push(this.listOfRelatedObjects[0].fieldList[i]);
                    selectedFieldLabel = this.listOfRelatedObjects[0].fieldList[i].label;
                    this.listOfRelatedObjects[0].fieldList.splice(i, 1);
                }
            }
            if (selectedVal.includes('.')) {
                let arr = selectedVal.split('.');
                let selected2 = arr[1];
                let fieldlabel;
                for (let i = 0; i < this.listOfRelatedObjects[0].fieldWrap.length; i++) {
                    if (this.listOfRelatedObjects[0].fieldWrap[i].relationshipName == arr[0]) {
                        fieldlabel = this.listOfRelatedObjects[0].fieldWrap[i].name;
                        fieldlabel = fieldlabel.replace('>', '');
                    }
                }
                for (let i = 0; i < this.listOfRelatedObjects[1].fieldList.length; i++) {
                    label = this.listOfRelatedObjects[1].fieldList[i].label;
                    let temp = fieldlabel + '.' + label;
                    if (this.tableHeaders.includes(temp)) {
                        checkDuplicate = true;
                    }
                    if (this.listOfRelatedObjects[1].fieldList[i].value == selected2 && !checkDuplicate) {
                        this.listOfAddedFields.push({
                            "label": fieldlabel + '.' + label,
                            "value": selectedVal,
                            "dataType": this.listOfRelatedObjects[1].fieldList[i].dataType
                        });
                        this.listOfRelatedObjects[1].fieldList.splice(i, 1);
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
        this.selectedFieldToBeRemoved = event.currentTarget.value;
    }

    /*
      Removing the selected field from the list of selected fields from dual list box
     */
    Removal() {
        if (this.selectedFieldToBeRemoved != '') {
            if (this.changedHeaders.length > 0) {
                for (let i = 0; i < this.listOfAddedFields.length; i++) {
                    for (let j = 0; j < this.changedHeaders.length; j++) {
                        if (this.listOfAddedFields[i].label == this.changedHeaders[j].current) {
                            this.listOfAddedFields[i].label = this.changedHeaders[j].previous;
                        }
                    }
                }
            }

            for (let i = 0; i < this.listOfAddedFields.length; i++) {
                if (this.listOfAddedFields[i].value == this.selectedFieldToBeRemoved) {
                    if (this.listOfAddedFields[i].value.includes('.')) {
                        this.listOfRelatedObjects[1].fieldList.unshift({
                            "label": this.listOfAddedFields[i].label.split('.')[1],
                            "value": this.listOfAddedFields[i].value.split('.')[1]
                        });
                        let t = this.listOfAddedFields.splice(i, 1);
                        this.lstofremovedFields.push(t);
                        break;
                    } else {
                        this.listOfRelatedObjects[0].fieldList.unshift(this.listOfAddedFields[i]);
                        const t = this.listOfAddedFields.splice(i, 1);
                        this.lstofremovedFields.push(t);
                        break;
                    }
                }
            }

            if (this.changedHeaders.length > 0) {
                for (let i = 0; i < this.listOfAddedFields.length; i++) {
                    for (let j = 0; j < this.changedHeaders.length; j++) {
                        if (this.listOfAddedFields[i].label == this.changedHeaders[j].previous) {
                            this.listOfAddedFields[i].label = this.changedHeaders[j].current;
                        }
                    }
                }
            }
            this.handlenumberfields(true);
            this.handleTableDisplay(this.selectedFieldToBeRemoved, false);
        }
        this.selectedFieldToBeRemoved = '';
        if (this.showNumberFields.length === 0) {
            this.showCalculatorFields = false;
        }
    }

    /*
    Swapping the selected fields upwards in the dual list box and the change can be seen in the preview table
     */
    moveUpward() {
        this.loadUp = true;
        let selectedVal = this.selectedFieldToBeRemoved;
        let addedfields = this.listOfAddedFields;
        for (let i = 0; i < this.listOfAddedFields.length; i++) {

            if (selectedVal == addedfields[i].value && i != 0) {
                let temp = addedfields[i - 1];
                addedfields[i - 1] = addedfields[i];
                addedfields[i] = temp;
                break;
            }
        }
        this.listOfAddedFields = addedfields;
        let opt = [];
        for (let i = 0; i < this.listOfAddedFields.length; i++) {
            opt.push(this.listOfAddedFields[i].label);
        }
        this.tableHeaders = opt;
    }

    /*
    Swapping the selected fields downwards in the dual list box and the change can be seen in the preview table
     */
    moveDownward() {
        this.loadUp = true;
        let selectedVal = this.selectedFieldToBeRemoved;
        let addedfields = this.listOfAddedFields;
        for (let i = 0; i < this.listOfAddedFields.length; i++) {
            if (selectedVal == addedfields[i].value && i != (this.listOfAddedFields.length - 1)) {
                let temp = addedfields[i + 1];
                addedfields[i + 1] = addedfields[i];
                addedfields[i] = temp;
                break;
            }
        }
        this.listOfAddedFields = addedfields;
        let opt = [];
        for (let i = 0; i < this.listOfAddedFields.length; i++) {
            opt.push(this.listOfAddedFields[i].label);
        }
        this.tableHeaders = opt;
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
    }

    /*
    This function gets the row data-id of the selected header
     */
    getSelectedTableRowHandler(event) {
        this.selectedTableRow = event.target.dataset.id;
         this.template.querySelectorAll('[data-id="' + this.selectedTableRow + '"]')[0];
        this.handleActionButtonsVisibility(this.selectedTableRow);
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
    previousVal() {
        for (let j = 0; j < this.changedHeaders.length; j++) {
            let ind = this.changedHeaders[j].index;
            if (this.listOfAddedFields[ind].label == this.changedHeaders[j].current) {
                let temp = this.changedHeaders[j].previous;
                this.listOfAddedFields[ind].label = this.changedHeaders[j].previous;
                this.tableHeaders[ind] = '' + temp + '';
            }
        }

        let headerLabelsBeforeChange = this.tableHeaders;
        this.tableHeaders = [];
        setTimeout(() => {
            this.tableHeaders = headerLabelsBeforeChange;
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
        let ind = this.tableHeaders.indexOf(selectedRecordId);

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

        for (let i = 0; i < this.listOfAddedFields.length; i++) {
            if (this.listOfAddedFields[i].label == selectedRecordId) {
                this.listOfAddedFields[i].label = this.changedLabel;
            }
        }

        this.handleActionButtonsVisibility(null);
    }

    /* Table Style Controllers - Changes by Rahul */

    handleSerialNumber(event) {
        this.SerialNumber = event.detail.checked;
    }

    handleDisplayChart(event) {
        this.displayChartSection = event.detail.checked;
        this.chartControl = !this.noGrouping && this.displayChartSection && this.nosubTotal;
        if (this.displayChartSection) {
            var _this = this;
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
    }

    handleHFontColorChange(event) {
        this.selectedHFontColor = event.detail.value;
    }

    handleHbgColorChange(event) {
        this.selectedHbgColor = event.detail.value;
    }

    handlesubtotal(event) {
        this.subtotal = event.detail.checked;
    }

    handlefontfamilyChange(event) {
        this.fontfamily = event.detail.value.replace('&quot;', '');
        this.template.querySelectorAll('.mytable')[0].style.fontFamily = this.fontfamily;
        this.catStyle = "background-color :" + this.selectedBBgcolor + "; color:" + this.selectedBFontColor + ';font-size:' + this.fontsize + ';font-family:' + this.fontfamily + ';';
    }

    handleBFontColorChange(event) {
        this.selectedBFontColor = event.detail.value;
        this.template.querySelectorAll('.mytable')[0].style.color = this.selectedBFontColor;
    }

    handleBBgColorchange(event) {
        this.selectedBBgcolor = event.detail.value;
        this.template.querySelectorAll('.mytable')[0].style.backgroundColor = this.selectedBBgcolor;
    }

    handleBDRbgColorchange(event) {
        this.selectedBDRbgcolor = event.detail.value;
        this.template.querySelectorAll('.mytable').style.border = "5px solid" + this.selectedBDRbgcolor;
    }

    handleBarChartColorChange(event) {
        this.selectedBarChartColor = event.detail.value;
        let dataIdArray = ['group-1', 'group-2', 'group-3', 'group-4', 'Others'];
        dataIdArray.forEach((item) => {
            this.template.querySelector(`[data-id=${item}]`).style.background = this.selectedBarChartColor;
        });
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
    }

    handleDateFormat(event) {
        this.dateFormatvalue = event.detail.value;
    }

    handleTimeFormat(event) {
        this.timeFormatvalue = event.detail.value;
    }

    handleNumFormat(event) {
        this.numFormatvalue = event.detail.value;
    }

    handlecurFormat(event) {
        this.curFormatvalue = event.detail.value;
    }

    handleNewPage(event) {
        this.newPage = event.detail.checked;
    }

    /* Filtering based on Objects -> All changes by Rahul */

    /*Closing the modal box for filter rules creation*/
    closePreviewModal() {
        this.ruleCondition = false;
        this.template.querySelector('c-modal').hide();
    }

    /* this is to show the rules popup window on selecting the fileter label */
    handleFiltering() {
        this.ruleCondition = true;
        this.template.querySelector('c-modal').show();
    }

    /* The piece of code is to get the object names for selection in rules */
    handleRuleWrapperMaking() {
        if (this.selectedChildObjectName !== undefined) {
            getSObjectListFiltering({
                    selectedChildObjectLabel: this.selectedChildObjectName
                })
                .then((result) => {
                    this.fieldWrapper = result;
                })
                .catch((error) => {
                    let tempError = error.toString();
                    let errorMessage = error.message || 'Unknown error message';
                    createLog({recordId:'', className:'templateRelatedObjects LWC Component', exceptionMessage:errorMessage, logData:tempError, logType:'Exception'});
             });
        }
    }

    /*
    The piece of code is to create the rules after entering the conditions in rules popup window.
    */
    handleCreateRules() {
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
                let tempError = error.toString();
            let errorMessage = error.message || 'Unknown error message';
            createLog({recordId:'', className:'templateRelatedObjects LWC Component', exceptionMessage:errorMessage, logData:tempError, logType:'Exception'});                                             
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
                let tempError = error.toString();
            let errorMessage = error.message || 'Unknown error message';
            createLog({recordId:'', className:'templateRelatedObjects LWC Component', exceptionMessage:errorMessage, logData:tempError, logType:'Exception'});                                             
            });
        this.ruleCondition = false;
        this.template.querySelector('c-modal').hide();
    }

    /*
    The piece of code is to update  the rules wnich are already saved aftere entering the coditions in rules popup window .
    (As condition1 && condition2 || condition3)
    */
    handleRuleUpdates() {
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
                    let tempError = error.toString();
            let errorMessage = error.message || 'Unknown error message';
            createLog({recordId:'', className:'templateRelatedObjects LWC Component', exceptionMessage:errorMessage, logData:tempError, logType:'Exception'});                                             
                });
        }
        this.template.querySelector('c-modal').hide();
    }

    /*
      The piece of code is to get the conditions of templates in onload
    */
    getExistingConditions() {
        this.mapOfRC = new Map();
        this.conditionsArr = [];
        this.conditionExists = false;
        this.allConditions = [];
        this.listOfExistingConditions = [];
        getConditions({
                ruleName: this.ruleIdCreated
            })
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
                let tempError = error.toString();
                let errorMessage = error.message || 'Unknown error message';
                createLog({recordId:'', className:'templateRelatedObjects LWC Component', exceptionMessage:errorMessage, logData:tempError, logType:'Exception'});    
            })
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

}