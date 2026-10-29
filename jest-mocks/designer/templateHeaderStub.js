import { LightningElement, api } from 'lwc';
import { record } from './recorder';

export default class TemplateHeaderStub extends LightningElement {
    @api showheaderdetails;
    @api selectedObjectName;
    @api recordidvalueprop;
    @api rowcount;
    @api sectiontype;
    @api recordidtoedit;
    @api sectionrecordid;
    @api documenttemplaterecord;
    @api pdfLinks;

    @api handleActivateTemplate(...args) { record('header', 'handleActivateTemplate', args); }
    @api loadsectionsvaluesforCreation(...args) { record('header', 'loadsectionsvaluesforCreation', args); }
    @api loadsectionvaluesforedit(...args) { record('header', 'loadsectionvaluesforedit', args); }
}
