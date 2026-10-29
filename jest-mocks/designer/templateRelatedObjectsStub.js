import { LightningElement, api } from 'lwc';
import { record } from './recorder';

export default class TemplateRelatedObjectsStub extends LightningElement {
    @api showrelatedobjectdetails;
    @api selectedObjectName;
    @api recordidvalueprop;
    @api rowcount;
    @api sectiontype;
    @api recordidtoedit;
    @api sectionrecordid;
    @api documenttemplaterecordid;
    @api documenttemplaterecord;
    @api pdfLinks;

    @api handleActivateTemplate(...args) { record('related', 'handleActivateTemplate', args); }
    @api handleObjectNameSelection(...args) { record('related', 'handleObjectNameSelection', args); }
    @api loadsectionsectionvaluesforedit(...args) { record('related', 'loadsectionsectionvaluesforedit', args); }
    @api resetvaluesonchildcmp(...args) { record('related', 'resetvaluesonchildcmp', args); }
    @api assignDocTempId(...args) { record('related', 'assignDocTempId', args); }
    @api clearChildObjSelection(...args) { record('related', 'clearChildObjSelection', args); }
}
