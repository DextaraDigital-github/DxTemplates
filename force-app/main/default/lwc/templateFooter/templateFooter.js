import { LightningElement, wire, api, track } from 'lwc';
import getContentVersions from '@salesforce/apex/FooterClass.getContentVersions';
import saveDocumentTemplateSectionDetails from '@salesforce/apex/SaveDocumentTemplatesection.saveDocumentTemplateSectionDetails';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import gettemplatesectiondata from '@salesforce/apex/SaveDocumentTemplatesection.gettemplatesectiondata';
import { NavigationMixin } from 'lightning/navigation';

export default class TemplateFooter extends NavigationMixin(LightningElement) {
  imageUrls = [];
  showimages = false;
  isModalOpen = false;
  selectedimageid;
  imageselected = false;
  imagebuttonlabel = 'Select Image';
  @api showfooterdetails = false;
  @api sectiontype;
  @api documenttemplaterecord;
  @api rowcount;
  @api sectionrecordid;
  @api isDisabled = false;
  @api selectedObjectName;
  @api pdfLinks;

  richtextVal = 'All Right Reserved.';
  sectionItemsToselect = [{ label: 'Display Page Number Sequence', value: 'Display Page Number Sequence' }];
  @track value = [];
  displaypagesequence = false;
  countoptions = [{ label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' }];
  columnvalue;
  columnvalueList = [];
  footerSectionsMap = [];
  oldFooterColumnList = {};

  @track Recorddetailsnew = {
    Name: '',
    DxCPQ__Section_Content__c: '',
    DxCPQ__DisplaySectionName__c: false,
    DxCPQ__New_Page__c: false,
    DxCPQ__Document_Template__c: '',
    DxCPQ__Sequence__c: 0,
    DxCPQ__Type__c: '',
    Id: '',
    DxCPQ__Document_Clause__c: ''
  };

  @wire(getContentVersions) wiredcontentversions({ error, data }) {
    if (data) {
      if (data != null) {
        data.forEach((val) => {
          this.imageUrls.push({ Id: val.Id, URL: '/sfc/servlet.shepherd/version/download/' + val.Id, title: val.Title });
        });
        this.showimages = true;
      }
    }
    else if (error) { }
  }

  @api handleActivateTemplate(isActive) {
    this.isDisabled = isActive;
  }

  handlecolumncomboChange(event) {
    this.columnvalueList = [];
    this.columnvalue = event.detail.value;
    this.handlecolumnsClass(this.columnvalue);
    if (this.footerSectionsMap.length > 0) {
      if (this.footerSectionsMap.length < this.columnvalue) {
        for (var i = this.footerSectionsMap.length; i < this.columnvalue; i++) {
          if (this.oldFooterColumnList[i]) {
            this.footerSectionsMap.push(this.oldFooterColumnList[i]);
          }
          else {
            this.columnvalueList.push(i);
            this.footerSectionsMap.push({ "value": "", "indexvar": i, "key": (new Date()).getTime() + ":" + i , "columnCount": this.columnvalue, "footerVal": '' })
          }
        }
      }
      else if (this.footerSectionsMap.length > this.columnvalue) {
        this.handleColumnRemoval();
      }
    }
    else {
      for (var i = 0; i < this.columnvalue; i++) {
        this.columnvalueList.push(i);
        this.footerSectionsMap.push({ "value": "", "indexvar": i, "key": (new Date()).getTime() + ":" + i, "columnCount": this.columnvalue, "footerVal": '' })
      }
    }
    let refData = {
      "0":{"0":""},
      "1":{"0":"Left", "1":"Right"},
      "2":{"0":"Left", "1":"Center", "2":"Right"}
    }
    this.footerSectionsMap.forEach(item => {
        item.columnCount = this.columnvalue;
        item.footerVal = refData[this.columnvalue - 1][item.indexvar];
    });
    const saveEvent = new CustomEvent('datasaved', {detail: false });
    this.dispatchEvent(saveEvent);
  }

  /* Footer Changes Start by Rahul*/
  handleColumnRemoval() {
    let headerColumnsList = {};
    let size = 0;

    for (let i = 0; i < this.footerSectionsMap.length; i++) {
      let tempColumnDetail = this.footerSectionsMap[i];
      if (tempColumnDetail.indexvar < this.columnvalue) {
        headerColumnsList[tempColumnDetail.indexvar] = tempColumnDetail;
        size += 1;
      }
      else {
        this.oldFooterColumnList[tempColumnDetail.indexvar] = tempColumnDetail;
      }
    }

    this.footerSectionsMap = [];
    for (let i = 0; i < size; i++) {
      if (headerColumnsList[i]) {
        this.footerSectionsMap.push(headerColumnsList[i]);
      }
    }
    let refData = {
      "0":{"0":""},
      "1":{"0":"Left", "1":"Right"},
      "2":{"0":"Left", "1":"Center", "2":"Right"}
    }
    this.footerSectionsMap.forEach(item => {
        item.columnCount = this.columnvalue;
        item.footerVal = refData[this.columnvalue - 1][item.indexvar];
    });
  }
  /* Footer Changes End by Rahul */

  handlecolumnsClass(columncount) {
    this.classvar = 'slds-col slds-size_1-of-' + columncount;
  }

  saverichtextfooter(event) {
    var data = event.detail;
    this.footerSectionsMap.forEach((loopvar, index) => {
      if (loopvar.indexvar == data.indexvar) {
        this.footerSectionsMap.splice(index, 1);
        this.footerSectionsMap.push(data);
      }
    });
    const saveEvent = new CustomEvent('datasaved', {detail: false });
    this.dispatchEvent(saveEvent);
  }

  handlecheckboxChange(event) {
    const mystring = JSON.stringify(event.detail.value);
    if (mystring.includes('Display Page Number Sequence')) {
      this.displaypagesequence = true;
    }
    else {
      this.displaypagesequence = false;
    }
    const saveEvent = new CustomEvent('datasaved', {detail: false });
    this.dispatchEvent(saveEvent);
  }

  @api loadsectionsvaluesforCreation() {
    this.showfooterdetails = true;
    this.columnvalue = null;
    this.columnvalueList = [];
    this.footerSectionsMap = [];
    this.value = [];
    this.Recorddetailsnew = {
      Name: '', DxCPQ__Section_Content__c: '', DxCPQ__DisplaySectionName__c: false,
      DxCPQ__New_Page__c: false,
      DxCPQ__Document_Template__c: '',
      DxCPQ__Sequence__c: 0,
      DxCPQ__Type__c: '',
      Id: '',
      DxCPQ__Document_Clause__c: ''
    };
    const saveEvent = new CustomEvent('datasaved', {detail: true });
    this.dispatchEvent(saveEvent);
  }

  @api loadsectionvaluesforedit(recordID) {
    this.showfooterdetails = true;
    gettemplatesectiondata({ editrecordid: recordID })
      .then(result => {
        if (result != null) {
          // Start from an empty footer, so nothing of the footer that was open before stays when this one has no content.
          this.columnvalue = null;
          this.footerSectionsMap = [];
          this.oldFooterColumnList = {};
          this.displaypagesequence = false;
          this.value = [];
          if (!result.DxCPQ__Section_Content__c) {
            const emptyEvent = new CustomEvent('datasaved', {detail: true });
            this.dispatchEvent(emptyEvent);
            return;
          }
          var sectioncontent = JSON.parse(result.DxCPQ__Section_Content__c);

          /* Fix for Header Onload Alignment by Rahul*/
          let sectionsMapTemp = sectioncontent.sectionsContent;
          sectionsMapTemp.sort((a, b) => {
            return a.indexvar - b.indexvar;
          });
          this.footerSectionsMap = sectionsMapTemp;
          /* Fix for Header Onload Alignment by Rahul*/

          this.columnvalue = sectioncontent.sectionsCount;
          this.handlecolumnsClass(this.columnvalue);

          this.displaypagesequence = sectioncontent.displaypagesequence;
          if (this.displaypagesequence == true) {
            this.value = ['Display Page Number Sequence'];
          }
          const saveEvent = new CustomEvent('datasaved', {detail: true });
          this.dispatchEvent(saveEvent);
        }
      })
      .catch(error => {
        console.log('error loadsectionvaluesforedit footer' + JSON.stringify(error));
      })
  }

  handlesectionsave(event) {
    this.Recorddetailsnew.Name = this.sectiontype;
    var currecid = this.sectionrecordid;
    this.footerSectionsMap.forEach((loopvar) => {
      var sectionval = loopvar.value;
      if (sectionval.includes('img') && !sectionval.includes('style')) {
        const styletag = 'style=\"max-height:35px; max-width:100%; height:35px; margin:10px 20px;\"';
        sectionval = sectionval.slice(0, sectionval.lastIndexOf('"') + 1) +
          ' ' + styletag + sectionval.slice(sectionval.lastIndexOf('"') + 1, sectionval.length);
        loopvar.value = sectionval;
      }
    });
    // Written even without a column: a footer that only shows page numbers is a valid footer.
    var obj = {};
    // '0' (not empty): the PDF controller reads the count as an Integer.
    obj.sectionsCount = this.columnvalue || '0';
    obj.sectionsContent = this.footerSectionsMap;
    obj.displaypagesequence = this.displaypagesequence;
    this.Recorddetailsnew.DxCPQ__Section_Content__c = JSON.stringify(obj);

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
              message: 'Section "' + this.Recorddetailsnew.Name + '"' + ' was Saved',
              variant: 'success',
            });
            this.dispatchEvent(event4);
            var firecustomevent = new CustomEvent('savesectiondata', { detail: this.savedRecordID });
            this.dispatchEvent(firecustomevent);
            const saveEvent = new CustomEvent('datasaved', {detail: true });
            this.dispatchEvent(saveEvent);
          }
        })
        .catch(error => {
          console.log('Footer Saving Error' + JSON.stringify(error));
        })
    }
    else {
      const Errormsg = new ShowToastEvent({
        title: 'Error',
        message: 'Please Enter Name',
        variant: 'Error',
      });
      this.dispatchEvent(Errormsg);
    }
  }

    handlehelp(){
      let relatedObjectsMap = this.pdfLinks.find(item => item.MasterLabel === 'Footer');
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