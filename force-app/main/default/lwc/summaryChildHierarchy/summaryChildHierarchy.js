import { api, LightningElement } from 'lwc';

export default class DxSummaryChildHierarchy extends LightningElement {
    @api myWrapper;
    isExpanded;
    selectedRecordId;
    connectedCallback(){
        this.isExpanded = this.myWrapper.isExpanded;
    }
    toggleView(event){
        const selectedEvent = new CustomEvent("toggle",{bubbles: true, composed:true, detail:{_index:this.myWrapper._index, recordId : this.myWrapper.Id, isExpanded: this.myWrapper.isExpanded}});
        this.dispatchEvent(selectedEvent);
        this.isExpanded = !this.isExpanded;
    }

    handleMessage(message){
        
    }
    
}