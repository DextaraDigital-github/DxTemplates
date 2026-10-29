import { LightningElement,api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import pdfObjectdetails from '@salesforce/apex/PdfDisplay.getObjectDetails';
import { getDomainUrl } from 'c/dxApexCache';
import createLog from '@salesforce/apex/LogHandler.createLog';
export default class GeneratePDF extends  NavigationMixin(LightningElement)  {

    @api recordId;
    objectApiName;
    objectLabel;
    recordName;
    domainURL;

    connectedCallback() {
        this.getDomainBaseURL();
        pdfObjectdetails({
                recordId: this.recordId
            })
            .then(result => {
                this.objectApiName = result.objectName;
                this.objectLabel = result.objectLabel;
                this.recordName = result.recordName;
            })
            .catch(() => {});
    }

    getDomainBaseURL() {
        getDomainUrl()
            .then((result) => {
                if (result) {
                    this.domainURL = result;
                }
            })
            .catch(error => {
                let tempError = error.toString();
                let errorMessage = error.message || 'Unknown error message';
                createLog({recordId:'', className:'generatePDF LWC Component', exceptionMessage:errorMessage, logData:tempError, logType:'Exception'});
            });
    }

    handleClick() {
        const anchor = document.createElement('a');
        let url = `/lightning/cmp/DxCPQ__NavigateToDocument?c__recordId=${this.recordId}?Name=${this.recordName}`;
        anchor.href = this.domainURL + url;
        anchor.target = '_self';
        anchor.click();
    }
}