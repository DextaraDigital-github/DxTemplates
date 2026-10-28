import { api, LightningElement } from 'lwc';

export default class DxCpqMenuSetupRow extends LightningElement {
    @api myWrapper;
    @api isSaved;
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

    chooseWrapper(event){
        if(this.isSaved == true){
            let index = event.currentTarget.dataset.index;
            let recId= event.currentTarget.dataset.catid;
            const selectedEvent = new CustomEvent("select", {bubbles: true, composed:true, detail: {id: recId, _index:index, row: this.myWrapper}});
            this.dispatchEvent(selectedEvent);
        }
        else{
            if (confirm("Changes not saved. Please click Cancel and save the changes or Ok to continue.") == true){
                this.isSaved = true;
                const saveEvent = new CustomEvent('datasaved', {detail: true });
                this.dispatchEvent(saveEvent);
                this.chooseWrapper(event);
            }
        }
    }
}