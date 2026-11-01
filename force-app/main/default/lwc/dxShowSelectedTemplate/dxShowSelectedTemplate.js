import { LightningElement, api,wire,track} from 'lwc';
import getTemplateSections from '@salesforce/apex/DisplayPDFController.getTemplateSections';
import generateDocument from '@salesforce/apex/DisplayPDFController.generateDocument';
import generatePDFAttachment from '@salesforce/apex/DisplayPDFController.generatePDFAttachment';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAllPopupMessages from '@salesforce/apex/PopUpMessageSelector.getAllConstants';
import { loadStyle } from 'lightning/platformResourceLoader';
import rte_tbl from '@salesforce/resourceUrl/rte_tbl';
import { evaluateVisibility } from './visibilityRules';

export default class DxShowSelectedTemplate extends LightningElement {
    @api showHeader;
    @api showFooter;
    @api templateId;
    @api quoteId;
    @api objectRecordId;
    @api objectName;
    @api pageProperties;
    pdfheaderfooter;
    
    templatesectionid;
    sectionContentArr=[];
    headerArr =[];
    @track head1='';
    @track head2='';
    @track head3='';
    @track foot1='';
    @track foot2='';
    @track foot3='';
    footerArr=[];
    showrelatedobjectsdata=false;
    isModalOpen=false;
    isLoaded=false;
    isLoaded2=false;
    downloadURL;
    isSectionContentLoaded=false;
    headerfooter={};
    showpreviewbutton=false;
    showpreview=false;
    popUpMessage;
    documentIdVal='';
    noROSectionsForGivenTemplate = true;

    //section Visibility variables
    calculatedResults =[];
    ruleObjData =[];
    modifiedJson =[];
  

    @wire(getAllPopupMessages) 
        allConstants ({error, data}) {
            if (data) {
                this.popUpMessage = data;
                console.log('Success');
            } else {
                this.error = error;
            }
        }
    
    performCalculations() {
        const record = this.modifiedJson.record[0];
        for (let rule of this.ruleObjData) {
            const result = evaluateVisibility(rule.ruleExpression, rule.conditions, record);
            this.calculatedResults.push({ ruleId: rule.ruleId, result });
        }
        console.log('Calculated Results:', this.calculatedResults);
    }

    connectedCallback() {
        let ruleInfo = [];
        this.isLoaded=true;
        /*  returning map of resultdata from apex call
            which contains documentId and document template section data */
        getTemplateSections({templateId : this.templateId, recordId:this.objectRecordId, objectApiName: this.objectName}).then((resultdata) => {
            console.log('template sections result ---> ',resultdata);
            //code added by Tanmayee & Bhavya for Filter Sections starts here
            this.tempSecsRes =  resultdata;
            ruleInfo = resultdata.Rules;
            let ruleObjArr = [];
            if (ruleInfo && ruleInfo.length > 0) {
                ruleInfo.forEach(rule => {
                    ruleObjArr.push({
                        ruleId: rule.Id,
                        ruleExpression: rule.DxCPQ__Rule_Expression__c,
                        conditions: rule.DxCPQ__Rule_Conditions__r || []
                    });
                })
            }
            this.ruleObjData = ruleObjArr;
            console.log('ruleObjArr after getting the condition String ---> ', ruleObjArr);

            let recordData = resultdata.record;
            this.modifiedJson = JSON.parse(JSON.stringify(resultdata));
            this.modifiedJson.selectedTemplateContents.forEach(section => {
                if (section.DxCPQ__Section_Visibility_Rule__c) {
                    const rule = this.modifiedJson.Rules.find(rule => rule.Id === section.DxCPQ__Section_Visibility_Rule__c);
                    if (rule) {
                        section.RuleData = rule;
                    }
                }
            });

            console.log('modified JSON inside the Connectedcallback() ---> ', this.modifiedJson);
            this.performCalculations();
            //code added by Tanmayee & Bhavya ends here
            this.isLoaded=false;
            var result=resultdata.selectedTemplateContents;     
            this.documentIdVal=resultdata.documentId;
            if(this.modifiedJson){
                this.modifiedJson.selectedTemplateContents.forEach(tempSec=>{                    
                    if(tempSec.DxCPQ__Type__c=='Context' || tempSec.DxCPQ__Type__c=='Table' || tempSec.DxCPQ__Type__c=='Clause' ){
                        let showSec = false;
                        if(tempSec.DxCPQ__Section_Visibility_Rule__c != null){
                            const foundResult = this.calculatedResults.find(result => result.ruleId === tempSec.DxCPQ__Section_Visibility_Rule__c);
                            if (foundResult && foundResult.result == true) {
                               showSec = true
                            } else {
                               showSec = false;
                            }
                        }
                        else{
                            showSec = true;
                        }
                        if(showSec){
                            let tempObj={};
                            tempObj.index = tempSec.DxCPQ__Sequence__c;
                            tempObj.isRelated=false;
                            tempObj.isContext=true;
                            tempObj.content=tempSec.DxCPQ__Section_Content__c;
                            this.sectionContentArr.push(tempObj);
                        }   
                       
                    }else if(tempSec.DxCPQ__Type__c=='Related Objects')
                    {
                        let showSec = false;
                        if(tempSec.DxCPQ__Section_Visibility_Rule__c != null){
                            const foundResult = this.calculatedResults.find(result => result.ruleId === tempSec.DxCPQ__Section_Visibility_Rule__c);
                            if (foundResult && foundResult.result == true) {
                               showSec = true
                            } else {
                               showSec = false;
                            }
                        }
                        else{
                            showSec = true;
                        }
                        if(showSec){
                            let tempObj={};
                            tempObj.index = tempSec.DxCPQ__Sequence__c;
                            tempObj.isRelated=true;
                            tempObj.isContext=false;
                            tempObj.templatesectionid=tempSec.Id;
                            this.sectionContentArr.push(tempObj);
                            this.noROSectionsForGivenTemplate = false;
                        }
                    }
                    else if(tempSec.DxCPQ__Type__c=='Header')
                    {
                        let index;
                        this.showHeader = true;
                        var seccon= JSON.parse(tempSec.DxCPQ__Section_Content__c);
                        this.headerArr = seccon.sectionsContent;
                        
                        setTimeout(() => {
                        let allHeaders = this.template.querySelectorAll('[data-indexhead]');
                        let count =0;
                        let lst =[];
                        lst.push('');
                        lst.push('');
                        lst.push('');
                        for(let i=0;i<seccon.sectionsContent.length;i++)
                        {
                            if(seccon.sectionsContent[i].value=='')
                            {
                                index = seccon.sectionsContent[i].indexvar;
                                lst[index]='<p> </p>';
                            }
                            else
                            {
                                index = seccon.sectionsContent[i].indexvar;
                                lst[index] = seccon.sectionsContent[i].value;
                            }
                            count++;
                        }
                        while(count<3)
                        {
                            lst[count]='<p> </p>';
                            count++;
                        }
                        let allHeaders1 = this.template.querySelector('[data-indexhead1]');
                        let allHeaders2 = this.template.querySelector('[data-indexhead2]');
                        let allHeaders3 = this.template.querySelector('[data-indexhead3]');
                        
                        
                        allHeaders1.innerHTML =lst[0];
                        allHeaders2.innerHTML =lst[1];
                        allHeaders3.innerHTML =lst[2];
                        }, 100);
                        this.headerfooter.header = seccon;
                    }
                    else if(tempSec.DxCPQ__Type__c=='Footer')
                    {
                        var seccon= JSON.parse(tempSec.DxCPQ__Section_Content__c);
                        this.showFooter = true;
                        var obj = {};
                        obj.footertext=seccon.footertext;
                        obj.displaypagesequence = seccon.displaypagesequence;
                        this.footerArr =  seccon.sectionsContent;
                        
                        setTimeout(() => {
                        
                        let count =0;
                        let lst =[];
                        lst.push('');
                        lst.push('');
                        lst.push('');
                        for(let i=0;i<seccon.sectionsContent.length;i++) {
                            if (seccon.sectionsContent[i].value == '') {
                                let index = seccon.sectionsContent[i].indexvar;
                                lst[index] ='<p> </p>';
                            }
                            else {
                                let index = seccon.sectionsContent[i].indexvar;
                                lst[index] =seccon.sectionsContent[i].value;
                            }
                            count++;
                        }
                        while(count<3) {
                            lst[count]='<p> </p>';
                            count++;
                        }
                        let allFotter1 = this.template.querySelector('[data-indexfoot1]');
                        let allFotter2 = this.template.querySelector('[data-indexfoot2]');
                        let allFotter3 = this.template.querySelector('[data-indexfoot3]');
                        
                        allFotter1.innerHTML =lst[0];
                        allFotter2.innerHTML =lst[1];
                        allFotter3.innerHTML =lst[2];
                        }, 100);
                        this.headerfooter.footer= seccon;
                    }
                })                                
            }
            if(this.noROSectionsForGivenTemplate){
                this.dispatchEvent(new CustomEvent('showgenerate', { bubbles: true , composed : true, detail: 'loaded' }));
            }
        }).catch((err) => {
            // this.isLoaded=false;
            console.log('Error Section Contentes'+ JSON.stringify(err));
        });
    }

    renderedCallback(){
        this.isSectionContentLoaded=true; 
            let index = 0;
            this.sectionContentArr.forEach(obj=>{
                let elementDiv = this.template.querySelector(`[data-id="${index}"]`);
                if(obj.isContext==true){
                    elementDiv.innerHTML=obj.content;
                }
                index++;
            })

   
    Promise.all([
      loadStyle(this, rte_tbl + '/rte_tbl1.css'),
    ])
      .then(() => {
      })
      .catch(error => {
      });
    }

    @api
    handlePDF(){
        this.isLoaded2=true;
        const container = this.template.querySelector('.wholecontent');
        var headfooterstr=JSON.stringify(this.headerfooter);
        /*parameter templatedId changed to doucmentId*/
        generateDocument({documentId : this.documentIdVal, quoteId:this.objectRecordId, pdfbody:container.innerHTML,pdfheaderfooter:headfooterstr}).then((result) => {
            if(result && result.length>0){
                this.handleAttachment(result);
            }
        }).catch((err) => {
            this.isLoaded2=false;
            console.log('this is error handlePDF',err);
            this.reportGenerationFailure(err);
        });
        
    }

    handleAttachment(documentid) {
        generatePDFAttachment({documentid : documentid, quoteId:this.objectRecordId, pageProperties : JSON.stringify(this.pageProperties)}).then((result) => {
            if(result && result.length>0){
                this.isLoaded=false;
                this.showpreviewbutton=true;
                this.downloadURL = '/servlet/servlet.FileDownload?file='+result;
                var docdetailsobj={documentid:documentid,downloadURL:this.downloadURL,attachmentid:result};

                var firecustomevent = new CustomEvent('pdfgeneration', { detail:docdetailsobj});
                this.dispatchEvent(firecustomevent);

                this.dispatchEvent(new ShowToastEvent({
                    title: 'Success',
                    message: this.popUpMessage.DXSHOWSELECTEDTEMPLATE_PDF,
                    variant: 'success',
                }));
                this.isLoaded2=false;
            }
        }).catch((err) => {
            console.log('this is error handleAttachment',err);
            this.isLoaded2=false;
            this.reportGenerationFailure(err);
        });
    }

    // Tell the user and the page that no PDF was made (before this the spinner stayed on and nothing was said).
    reportGenerationFailure(err) {
        const detail = err && err.body && err.body.message ? err.body.message : 'The document may be too large. Try fewer records or a shorter template.';
        this.dispatchEvent(new ShowToastEvent({ title: 'PDF was not generated', message: detail, variant: 'error' }));
        this.dispatchEvent(new CustomEvent('pdfgenerationfailed', { bubbles: true, composed: true }));
    }

    displayChildContent(event){
        let index = event.detail.index;
        let content = event.detail.content;
        let elementDiv = this.template.querySelector(`[data-id="${index}"]`);
        elementDiv.innerHTML=content.innerHTML;
        this.showPreviewButton=true;
    }  

    /* Commented by Rahul - not intended in this release */
    handleClauseContent(event){
        /*let elediv = this.template.querySelector('.clause');
        var productClausesMap={};
        productClausesMap = (event.detail.content);
        productClausesMap.forEach( (val,index) => {
            console.log('this.val======',val);
            elediv.innerHTML+= '<b>'+val.name+'</b><br/>';

            var clausebody=[];
            clausebody = val.bodycontent;
            clausebody.forEach( (val,index) => {
                elediv.innerHTML+= clausebody[index];
            });
        });*/
    } 
}