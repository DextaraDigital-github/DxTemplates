import { LightningElement, wire, api } from 'lwc';
import saveDocumentTemplateSectionDetails from '@salesforce/apex/SaveDocumentTemplatesection.saveDocumentTemplateSectionDetails';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import gettemplatesectiondata from '@salesforce/apex/SaveDocumentTemplatesection.gettemplatesectiondata';
import getAllPopupMessages from '@salesforce/apex/PopUpMessageSelector.getAllConstants';
import { NavigationMixin } from 'lightning/navigation';

export default class TemplateHeader extends NavigationMixin(LightningElement) {

  columnvalue;
  columnfirstvalue;
  @api pdfLinks;
  @api rowcount;
  @api sectiontype;
  columnvalueList = [];
  columnfirstvalueList=[];
  @api selectedObjectName;
  @api sectionrecordid;
  @api isDisabled = false;
  headerMap =[];
  headerSectionsMap = [];
  headerFirstSectionsMap=[];
  @api documenttemplaterecord;
  @api showheaderdetails = false;
  classvar = 'slds-col slds-size_1-of-3';
  classfirstvar = 'slds-col slds-size_1-of-3';
  showfirstpageheader=false;
  popUpMessage;
  oldHeaderColumnList = {};
  oldHeaderFirstColumnList={};
  whereCondition ="";
  whereClause = " IsActive__c = true";

  Recorddetailsnew = {
    Name: '', DxCPQ__Section_Content__c: '', DxCPQ__DisplaySectionName__c: false,
    DxCPQ__New_Page__c: false,
    DxCPQ__Document_Template__c: '',
    DxCPQ__Sequence__c: 0,
    DxCPQ__Type__c: '',
    Id: '',
    DxCPQ__Document_Clause__c: ''
  };
  countoptions = [{ label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' }];


  @wire(getAllPopupMessages)
  allConstants({ error, data }) {
    if (data) {
      this.popUpMessage = data;
    } else {
      this.error = error;
    }
  }

  connectedCallback() {
    this.whereCondition = "DxCPQ__Document_Template__r.DxCPQ__Related_To_Type__c = " + "\'" + this.selectedObjectName + "\'" + " AND DxCPQ__Type__c = " + "\'" + this.sectiontype + "\'";
    this.whereClause = this.whereCondition;
  }

  handleDiffHeader(event){
    this.showfirstpageheader = event.detail.checked;
    const firstHeaderEvent = new CustomEvent('firstheader', {detail: event.detail.checked });
    this.dispatchEvent(firstHeaderEvent);
  }

  handlefirstcolumncomboChange(event){
    this.columnfirstvalueList = [];
    this.columnfirstvalue = event.detail.value;
    this.handlefirstcolumnsClass(this.columnfirstvalue);
    if (this.headerFirstSectionsMap.length > 0) {
      if (this.headerFirstSectionsMap.length < this.columnfirstvalue) {
        for (var i = this.headerFirstSectionsMap.length; i < this.columnfirstvalue; i++) {
          if (this.oldHeaderFirstColumnList[i]) {
            this.headerFirstSectionsMap.push(this.oldHeaderFirstColumnList[i]);
          }
          else {
            this.columnfirstvalueList.push(i);
            this.headerFirstSectionsMap.push({ "value": "", "indexvar": i+3, "columnFirstCount":this.columnfirstvalue, "key": (new Date()).getTime() + ":" + i, "headerVal": "" })
            //this.headerSectionsMap.push({ "value": "", "indexvar": i+3,  "key": (new Date()).getTime() + ":" + i })
          }
        }
      }
      else if (this.headerFirstSectionsMap.length > this.columnfirstvalue) {
        this.handleColumnRemoval();
      }
    }
    else {
      for (var i = 0; i < this.columnfirstvalue; i++) {
        this.columnfirstvalueList.push(i);
        this.headerFirstSectionsMap.push({ "value": "", "indexvar": i+3, "columnFirstCount":this.columnfirstvalue, "key": (new Date()).getTime() + ":" + i, "headerVal": "" })
        //this.headerSectionsMap.push({ "value": "", "indexvar": i+3, "key": (new Date()).getTime() + ":" + i })
      }
    } 
    //this.headerSectionsMap.push (this.headerFirstSectionsMap) 
    let refData = {
      "0":{"0":""},
      "1":{"0":"Left", "1":"Right"},
      "2":{"0":"Left", "1":"Center", "2":"Right"}
    }
    this.headerFirstSectionsMap.forEach(item => {
        item.columnFirstCount = this.columnfirstvalue;
        item.headerVal = refData[this.columnfirstvalue - 1][item.indexvar-3];
    });
    const saveEvent = new CustomEvent('datasaved', {detail: false });
    this.dispatchEvent(saveEvent);
  }

  handlefirstcolumnsClass(columncount) {
    this.classfirstvar = 'slds-col slds-size_1-of-' + columncount;
  }

  handlecolumnsClass(columncount) {
    this.classvar = 'slds-col slds-size_1-of-' + columncount;
  }

  handlecolumncomboChange(event) {
    this.columnvalueList = [];    
    this.columnvalue = event.detail.value;
    this.handlecolumnsClass(this.columnvalue);
    if (this.headerSectionsMap.length > 0) {
      if (this.headerSectionsMap.length < this.columnvalue) {
        for (var i = this.headerSectionsMap.length; i < this.columnvalue; i++) {
          if (this.oldHeaderColumnList[i]) {
            this.headerSectionsMap.push(this.oldHeaderColumnList[i]);
          }
          else {
            this.columnvalueList.push(i);          
            this.headerSectionsMap.push({ "value": "", "indexvar": i, "key": (new Date()).getTime() + ":" + i , "columnCount": this.columnvalue, "headerVal": ''})
          }
        }
      }
      else if (this.headerSectionsMap.length > this.columnvalue) {
        this.handleColumnRemoval();
      }
    }
    else {
      for (var i = 0; i < this.columnvalue; i++) {
        this.columnvalueList.push(i);     
        this.headerSectionsMap.push({ "value": "", "indexvar": i, "key": (new Date()).getTime() + ":" + i , "columnCount": this.columnvalue, "headerVal": '' })
      }
    }
    //adding headval in headerSectionsMap
    let refData = {
      "0":{"0":""},
      "1":{"0":"Left", "1":"Right"},
      "2":{"0":"Left", "1":"Center", "2":"Right"}
    }
    this.headerSectionsMap.forEach(item => {
        item.columnCount = this.columnvalue;
        item.headerVal = refData[this.columnvalue - 1][item.indexvar];
    });
    const saveEvent = new CustomEvent('datasaved', {detail: false });
    this.dispatchEvent(saveEvent);
    //console.log('columnvalueList ---> ', this.columnvalueList);
    console.log('headerSectionsMap after column value changed ---> ', this.headerSectionsMap);
  }

  /* Header Changes Start*/
  handleColumnRemoval() {
    let headerColumnsList = {};
    let headerFirstColumnsList ={};
    let size = 0;
    const tempColumnfirstValue = +this.columnfirstvalue+3;

    for (let i = 0; i < this.headerFirstSectionsMap.length; i++) {
      let tempColumnDetail = this.headerFirstSectionsMap[i];
      // if (tempColumnDetail.indexvar < this.columnvalue && tempColumnDetail.uniqueFirst == null) {
      //   headerColumnsList[tempColumnDetail.indexvar] = tempColumnDetail;
      //   size += 1;
      // }
      if(tempColumnDetail.indexvar < tempColumnfirstValue){
        //headerColumnsList[tempColumnDetail.indexvar] = tempColumnDetail;
        let tempindexvar = +tempColumnDetail.indexvar-3;
        headerFirstColumnsList[tempindexvar] = tempColumnDetail;
        size += 1;
      }
      else {
        let tempindexvar = +tempColumnDetail.indexvar-3;
        this.oldHeaderFirstColumnList[tempindexvar] = tempColumnDetail;
      }
    }

    for (let i = 0; i < this.headerSectionsMap.length; i++) {
      let tempColumnDetail = this.headerSectionsMap[i];
      if (tempColumnDetail.indexvar < this.columnvalue) {
        headerColumnsList[tempColumnDetail.indexvar] = tempColumnDetail;
        size += 1;
      }
      else {
        this.oldHeaderColumnList[tempColumnDetail.indexvar] = tempColumnDetail;
      }
    }
    
    this.headerSectionsMap = [];
    this.headerFirstSectionsMap = [];
    for (let i = 0; i < 6; i++) {
      if (headerColumnsList[i]) {
        this.headerSectionsMap.push(headerColumnsList[i]);
      }
      if (headerFirstColumnsList[i]){
        //this.headerSectionsMap.push(headerColumnsList[i]);
        this.headerFirstSectionsMap.push(headerFirstColumnsList[i]);
      }
    }
    let headerVal='';
    let refData = {
      "0":{"0":""},
      "1":{"0":"Left", "1":"Right"},
      "2":{"0":"Left", "1":"Center", "2":"Right"}
    }
    this.headerSectionsMap.forEach(item => {
        item.columnCount = this.columnvalue;
        item.headerVal = refData[this.columnvalue - 1][item.indexvar];
    });
    this.headerFirstSectionsMap.forEach(item => {
        item.columnFirstCount = this.columnfirstvalue;
        item.headerVal = refData[this.columnfirstvalue - 1][item.indexvar];
    });
  }
  /* Header Changes End by Rahul */

  @api
  handleActivateTemplate(isActive) {
    this.isDisabled = isActive;
  }

  //Custom Event Method which will be called from templateHeaderType Child
  saverichtextheader(event) {
    var data = event.detail;
    this.headerSectionsMap.forEach((loopvar, index) => {
      if (loopvar.indexvar == data.indexvar) {
        this.headerSectionsMap.splice(index, 1);
        this.headerSectionsMap.push(data);
      }
    });
    this.headerFirstSectionsMap.forEach((loopvar, index) => {
      if (loopvar.indexvar == data.indexvar) {
        this.headerFirstSectionsMap.splice(index, 1);
        this.headerFirstSectionsMap.push(data);
      }
    });
    const saveEvent = new CustomEvent('datasaved', {detail: false });
    this.dispatchEvent(saveEvent);
  }

  @api loadsectionsvaluesforCreation() {
    this.showheaderdetails = true;
    this.columnvalue = null;
    this.columnfirstvalue = null;
    this.columnvalueList = [];
    this.columnfirstvalueList = [];
    this.headerSectionsMap = [];
    this.headerFirstSectionsMap = [];
    this.showfirstpageheader = false;

    this.Recorddetailsnew = {
      Name: '', DxCPQ__Section_Content__c: '', DxCPQ__DisplaySectionName__c: false,
      DxCPQ__New_Page__c: false,
      DxCPQ__Document_Template__c: '',
      DxCPQ__Sequence__c: 0,
      DxCPQ__Type__c: '',
      Id: '',
      DxCPQ__Document_Clause__c: ''
    };
  }

  @api loadsectionvaluesforedit(recordID) {
    const saveEvent = new CustomEvent('datasaved', {detail: true});
    this.dispatchEvent(saveEvent);
    this.showheaderdetails = true;
    this.headerSectionsMap = [];
    this.headerFirstSectionsMap = [];
    this.showfirstpageheader = false;
    gettemplatesectiondata({ editrecordid: recordID })
      .then(result => {
        if (result != null) {
          var sectioncontent = JSON.parse(result.DxCPQ__Section_Content__c);
          this.columnvalue = sectioncontent.sectionsCount;
          this.translateEnabled = this.columnvalue > 0? false: true;
          this.columnfirstvalue = sectioncontent.sectionsFirstCount;
          if (sectioncontent.sectionsFirstCount>0){
            this.showfirstpageheader = true;
          }
          //this.showfirstpageheader = true;
          setTimeout(() => { 
            try{
              this.template.querySelector('[data-id="uniqueheader"]').checked = this.showfirstpageheader; 
              // this.columnfirstvalue = sectioncontent.sectionsFirstContent;
              // this.template.querySelector('[data-id="firstcombobox"]').value = this.columnfirstvalue;
              //this.columnfirstvalue = sectioncontent.sectionsFirstContent;
              this.handlefirstcolumnsClass(this.columnfirstvalue);
            }
            catch(error){
              console.log('error in setTimeout for checked error >> ', error.message);
            }
          });

           /* Fix for Header Onload Alignment by Rahul*/
          let sectionsMapTemp = sectioncontent.sectionsContent;
          sectionsMapTemp.sort((a, b) => {
            return a.indexvar - b.indexvar;
          });
          let firstSectionsMap =[];
          let sectionsMap=[];
          sectionsMapTemp.forEach((sectionmap)=>{
            if (sectionmap.indexvar>2){
              firstSectionsMap.push(sectionmap)
            }
            else sectionsMap.push(sectionmap)
          })
          this.headerFirstSectionsMap= firstSectionsMap;
          this.headerSectionsMap = sectionsMap; 
          //this.headerSectionsMap = sectionsMapTemp;
           /* Fix for Header Onload Alignment by Rahul*/
          this.handlecolumnsClass(this.columnvalue);
          //this.handlefirstcolumnsClass(this.columnfirstvalue);
        }
      })
      .catch(error => {
        console.log('error loadsectionsectionvaluesforedit header' + JSON.stringify(error));
      })
  }

  //code added by Bhavya to check if the style attribute is present in the Img tag
  identifyStyleTag(str){
    const regex = /<img\b[^>]*\bstyle\s*=\s*["'][^"']*["']/i;
    return regex.test(str);
    
  }

  handlesectionsave(event) {
    this.Recorddetailsnew.Name = this.sectiontype;
    var currecid = this.sectionrecordid;
    this.headerMap = this.headerSectionsMap.concat(this.headerFirstSectionsMap);
    if (this.headerMap.length > 0) {
      this.headerMap.forEach((loopvar) => {

        var sectionval = loopvar.value;
        if (sectionval.includes('img') && !this.identifyStyleTag(sectionval)) {
          const styleTag = 'style="max-height:100%; max-width:100%; width:80%; margin:0 50px 0 0;"';
          sectionval = sectionval.replace(/(<img\b[^>]*)(style\s*=\s*["'][^"']*["'])?([^>]*>)/i, (match, p1, p2, p3) => {
              if (p2) {
                  return `${p1}${p2.slice(0, -1)}; ${styleTag.slice(7)}`;
              }
              return `${p1} ${styleTag}${p3}`;
          });

          console.log('Updated sectionVal:', sectionval);
          loopvar.value = sectionval;
        }
      });

      console.log('this.headerMap after adding styles ---> ', this.headerMap);
      var obj = {};
      obj.sectionsCount = this.columnvalue;
      obj.sectionsFirstCount = this.columnfirstvalue;
      obj.sectionsContent = this.headerMap;
      this.Recorddetailsnew.DxCPQ__Section_Content__c = JSON.stringify(obj);
    }

    if (currecid != '' && this.sectionrecordid.indexOf('NotSaved') == -1) {
      this.Recorddetailsnew.Id = this.sectionrecordid;
    }
    this.Recorddetailsnew.DxCPQ__Sequence__c = this.rowcount;
    this.Recorddetailsnew.DxCPQ__Type__c = this.sectiontype;
    this.Recorddetailsnew.DxCPQ__Document_Template__c = this.documenttemplaterecord.Id;

    if (this.Recorddetailsnew.Name != '' && this.Recorddetailsnew.Name != null) {
      saveDocumentTemplateSectionDetails({ Recorddetails: this.Recorddetailsnew })
        .then(result => {
          if (result != null) {
            this.savedRecordID = result;
            this.sectionrecordid = this.savedRecordID.Id;
            const event4 = new ShowToastEvent({
              title: 'Success',
              message: 'Section "' + this.Recorddetailsnew.Name + '"' + this.popUpMessage.TEMPLATEHEADER_CREATED,
              variant: 'success',
            });

            this.dispatchEvent(event4);
            const saveEvent = new CustomEvent('datasaved', {detail: true });
            this.dispatchEvent(saveEvent);
            var firecustomevent = new CustomEvent('savesectiondata', { detail: this.savedRecordID });
            this.dispatchEvent(firecustomevent);
            this.translateEnabled = false;
          }
        })
        .catch(error => {
          console.log('Header Save Event Error', JSON.stringify(error));
        })
    }
    //this.template.querySelector('c-template-designer-cmp').showPreview = true;
  }

  handlehelp(){
    let relatedObjectsMap = this.pdfLinks.find(item => item.MasterLabel === 'Header');
    let pdfUrl = relatedObjectsMap ? relatedObjectsMap.DxCPQ__Section_PDF_URL__c : null;
    const config = {
      type: 'standard__webPage',
      attributes: {
          url: pdfUrl
        }
    };
    this[NavigationMixin.Navigate](config);
  }

    
  showToast(title, message, variant) {
    const toastEvent = new ShowToastEvent({
        title: title,
        message: message,
        variant: variant
    });
    this.dispatchEvent(toastEvent);
  }

}