import { LightningElement, api } from 'lwc';
import { record } from './recorder';

export default class TemplateFooterStub extends LightningElement {
    @api showfooterdetails;
    @api selectedObjectName;
    @api recordidvalueprop;
    @api rowcount;
    @api sectiontype;
    @api recordidtoedit;
    @api sectionrecordid;
    @api documenttemplaterecord;
    @api pdfLinks;

    @api handleActivateTemplate(...args) { record('footer', 'handleActivateTemplate', args); }
    @api loadsectionsvaluesforCreation(...args) { record('footer', 'loadsectionsvaluesforCreation', args); }
    @api loadsectionvaluesforedit(...args) { record('footer', 'loadsectionvaluesforedit', args); }
}
