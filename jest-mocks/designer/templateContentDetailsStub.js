import { LightningElement, api } from 'lwc';
import { record } from './recorder';

export default class TemplateContentDetailsStub extends LightningElement {
    @api showdetails;
    @api selectedObjectName;
    @api recordidvalueprop;
    @api wherecondition;
    @api rowcount;
    @api sectiontype;
    @api showclausescreen;
    @api recordidtoedit;
    @api sectionrecordid;
    @api documenttemplaterecord;
    @api pdfLinks;

    @api handleActivateTemplate(...args) { record('content', 'handleActivateTemplate', args); }
    @api handleObjectNameSelection(...args) { record('content', 'handleObjectNameSelection', args); }
    @api loadsectionsectionvaluesforedit(...args) { record('content', 'loadsectionsectionvaluesforedit', args); }
    @api resetvaluesonchildcmp(...args) { record('content', 'resetvaluesonchildcmp', args); }
}
