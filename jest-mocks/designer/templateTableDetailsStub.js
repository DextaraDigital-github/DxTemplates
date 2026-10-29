import { LightningElement, api } from 'lwc';
import { record } from './recorder';

export default class TemplateTableDetailsStub extends LightningElement {
    @api showtabledetails;
    @api selectedObjectName;
    @api recordidvalueprop;
    @api rowcount;
    @api sectiontype;
    @api recordidtoedit;
    @api sectionrecordid;
    @api documenttemplaterecordid;
    @api documenttemplaterecord;

    @api handleActivateTemplate(...args) { record('table', 'handleActivateTemplate', args); }
    @api loadsectionsectionvaluesforedit(...args) { record('table', 'loadsectionsectionvaluesforedit', args); }
    @api resetvaluesonchildcmp(...args) { record('table', 'resetvaluesonchildcmp', args); }
    @api assignDocTempId(...args) { record('table', 'assignDocTempId', args); }
}
