import { LightningElement, api, track } from 'lwc';
import cloneDocumentTemplate from '@salesforce/apex/SaveDocumentTemplate.cloneDocumentTemplate';
import { CloseActionScreenEvent } from 'lightning/actions'
export default class CloneDocumentCmp extends LightningElement {

    @api recordId;
    @api objectApiName;
    @api parentTemplateRelatedToType;
    @track resultObj;
    @api jsonstr;
cloneTypeOptionSelectedByUser = 'New_Version';
    editDisabled = true;

    get templateCloneOptions() {
        return [
            { label: 'New Version', value: 'New_Version' },
            { label: 'New Template', value: 'New_Template' },
        ];
    }

    get checkForCloneType() {
        return this.cloneTypeOptionSelectedByUser == 'New_Version' ? true : false;
    }

    handleCloneTypeSelection(event){
        this.cloneTypeOptionSelectedByUser = event.detail.value;
        this.editDisabled = (this.cloneTypeOptionSelectedByUser == 'New_Version' ? true : false);
    }

    connectedCallback() {
       window.clearTimeout(this.delayTimeout);
        this.delayTimeout = setTimeout(() => {
        }, 0);
    }

    /**
     * handleSubmit: With this method, we are creating a clone template of the current selected template
     */
    handleSubmit(event) {
        event.preventDefault();
        let docTempObj ={'sobjectType':'DxCPQ__Document_Template__c'};

        const fields = event.detail.fields;
        docTempObj.Name = fields.Name;
        docTempObj.DxCPQ__Related_To_Type__c = this.parentTemplateRelatedToType;
        docTempObj.DxCPQ__Description__c = fields.DxCPQ__Description__c;
        docTempObj.DxCPQ__Parent_Template__c = fields.DxCPQ__Parent_Template__c;
        docTempObj.DxCPQ__Watermark_Data__c=fields.DxCPQ__Watermark_Data__c;
        docTempObj.DxCPQ__FlowId__c=fields.DxCPQ__FlowId__c;
        docTempObj.DxCPQ__ClassId__c=fields.DxCPQ__ClassId__c;
        
        docTempObj.DxCPQ__PDF_Page_Properties__c= this.jsonstr;
        if(this.cloneTypeOptionSelectedByUser == 'New_Template') {
            // a new template starts its own family: the server makes it its own parent
            docTempObj.DxCPQ__Parent_Template__c = null;
            docTempObj.DxCPQ__Version_Number__c = 1;
        }
        
        cloneDocumentTemplate({docTemp:docTempObj, docTempId:this.recordId}).then(result=>{
            if(result){
                this.resultObj = JSON.parse(JSON.stringify(result));
                const newDocTempEvt = new CustomEvent('doccreated', {
                detail: {id: result.Id,name:result.Name,templateObj:this.resultObj} ,bubbles: true
                });
                this.dispatchEvent(newDocTempEvt);
                this.dispatchEvent(new CloseActionScreenEvent());
            }
        
        }).catch(error=>{
            console.log(error);
        })
    }
}