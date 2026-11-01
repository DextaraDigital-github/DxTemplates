import { createElement } from 'lwc';
import DxTemplateSetup from 'c/dxTemplateSetup';
import listTemplates from '@salesforce/apex/TemplateMigration.listTemplates';
import exportData from '@salesforce/apex/TemplateMigration.exportData';
import importData from '@salesforce/apex/TemplateMigration.importData';
import getAllRelatedToTypeOptions from '@salesforce/apex/ImportExportData.getAllRelatedToTypeOptions';
import getDocumentTemplates from '@salesforce/apex/SaveDocumentTemplate.getDocumentTemplates';
import getRelatedToTypeOptions from '@salesforce/apex/SaveDocumentTemplate.getRelatedToTypeOptions';

jest.mock('@salesforce/apex/TemplateMigration.listTemplates', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/TemplateMigration.exportData', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/TemplateMigration.importData', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/ImportExportData.getAllRelatedToTypeOptions', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/SaveDocumentTemplate.getDocumentTemplates', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/SaveDocumentTemplate.createDocumentTemplate', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/SaveDocumentTemplate.getRelatedToTypeOptions', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/DisplayPDFController.saveContentVersion', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/LogHandler.createLog', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('c/dxApexCache', () => ({ getDomainUrl: jest.fn().mockResolvedValue('https://example.my.salesforce.com'), getClassNames: jest.fn().mockResolvedValue([]), getFlowNames: jest.fn().mockResolvedValue([]) }));
jest.mock('lightning/actions', () => ({ CloseActionScreenEvent: class extends CustomEvent { constructor() { super('close'); } } }), { virtual: true });
jest.mock('c/dxPageRefresh', () => ({ refreshPage: jest.fn() }));
jest.mock('lightning/platformShowToastEvent', () => ({
    ShowToastEvent: class extends CustomEvent {
        constructor(detail) {
            super('lightning__showtoast', { detail, bubbles: true, composed: true, cancelable: true });
        }
    }
}), { virtual: true });

const flush = async () => {
    for (let i = 0; i < 20; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
};

function mount() {
    const element = createElement('c-dx-template-setup', { is: DxTemplateSetup });
    document.body.appendChild(element);
    return element;
}

const FILE = JSON.stringify({ Templates: [{ Id: 'a00X', Name: 'Quote', DxCPQ__Related_To_Type__c: 'Account' }], 'Template Sections': [] });

describe('c-dx-template-setup import and export', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        getDocumentTemplates.mockResolvedValue([]);
        getRelatedToTypeOptions.mockResolvedValue([]);
        listTemplates.mockResolvedValue([{ id: 'a00A', name: 'Quote', version: 2 }, { id: 'a00B', name: 'Seeded', version: null }]);
        exportData.mockResolvedValue(FILE);
        importData.mockResolvedValue({ templates: [{ id: 'a00N', name: 'Quote', version: 2 }], sections: 4, rules: 1, conditions: 1, clauses: 1, translations: 3, files: 2, warnings: ['Template "Quote" uses an Apex class or a flow of the source org; set it again in this org.'] });
        getAllRelatedToTypeOptions.mockResolvedValue([{ label: 'Account', value: 'Account' }]);
    });

    afterEach(() => {
        while (document.body.firstChild) { document.body.removeChild(document.body.firstChild); }
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    const text = element => element.shadowRoot.textContent;

    async function openExport(element) {
        element.shadowRoot.querySelector('lightning-button-icon[data-id="export"]').click();
        await flush();
    }
    async function openImport(element) {
        element.shadowRoot.querySelector('lightning-button-icon[data-id="import"]').click();
        await flush();
    }
    const dualList = element => element.shadowRoot.querySelector('lightning-dual-listbox');
    const importArea = element => [...element.shadowRoot.querySelectorAll('lightning-textarea')].find(t => t.name === 'import');
    const createButton = element => [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.label === 'Create');

    it('offers the export of a template by name and version, without "undefined" for a template with no version', async () => {
        const element = mount();
        await flush();
        await openExport(element);

        expect(listTemplates).toHaveBeenCalledTimes(1);
        expect(dualList(element).options).toEqual([{ label: 'Quote - v2', value: 'a00A' }, { label: 'Seeded', value: 'a00B' }]);
    });

    it('asks the server for the selected templates only, and has the file ready to download', async () => {
        const element = mount();
        await flush();
        await openExport(element);

        dualList(element).dispatchEvent(new CustomEvent('change', { detail: { value: ['a00A'] } }));
        await flush();

        expect(exportData).toHaveBeenCalledWith({ templateIds: ['a00A'] });
        expect(listTemplates).toHaveBeenCalledTimes(1);
    });

    it('says why the export failed instead of staying silent', async () => {
        exportData.mockRejectedValue({ body: { message: 'The export failed: no access' } });
        const element = mount();
        await flush();
        const toasts = [];
        element.addEventListener('lightning__showtoast', e => toasts.push(e.detail));
        await openExport(element);

        dualList(element).dispatchEvent(new CustomEvent('change', { detail: { value: ['a00A'] } }));
        await flush();

        expect(toasts).toHaveLength(1);
        expect(toasts[0]).toMatchObject({ variant: 'error', message: 'The export failed: no access' });
    });

    it('imports the whole file in one server call and reports what was created and what to check', async () => {
        const element = mount();
        await flush();
        await openImport(element);
        importArea(element).value = FILE;
        importArea(element).dispatchEvent(new CustomEvent('change'));
        await flush();

        createButton(element).click();
        await flush();

        expect(importData).toHaveBeenCalledTimes(1);
        expect(importData).toHaveBeenCalledWith({ fileContent: FILE });
        const shown = text(element);
        expect(shown).toContain('Quote');
        expect(shown).toContain('4 sections');
        expect(shown).toContain('3 translations');
        expect(shown).toContain('2 files');
        expect(shown).toContain('set it again in this org');
    });

    it('does not block an import because a template of the same name exists', async () => {
        const element = mount();
        await flush();
        await openImport(element);
        importArea(element).value = FILE;
        importArea(element).dispatchEvent(new CustomEvent('change'));
        await flush();

        createButton(element).click();
        await flush();

        expect(text(element)).not.toContain('Duplicates found');
    });

    it('shows the server message and lets the user try again when the import fails', async () => {
        importData.mockRejectedValue({ body: { message: 'The import failed and nothing was created: boom' } });
        const element = mount();
        await flush();
        await openImport(element);
        importArea(element).value = FILE;
        importArea(element).dispatchEvent(new CustomEvent('change'));
        await flush();

        createButton(element).click();
        await flush();

        expect(text(element)).toContain('nothing was created: boom');
        expect(text(element)).not.toContain('successfully');
        const back = [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.label === 'Back');
        expect(back).toBeTruthy();
    });

    it('does not call the server for text that is not a template file', async () => {
        const element = mount();
        await flush();
        await openImport(element);
        importArea(element).value = 'this is not json';
        importArea(element).dispatchEvent(new CustomEvent('change'));
        await flush();

        createButton(element).click();
        await flush();

        expect(importData).not.toHaveBeenCalled();
        expect(text(element)).toContain('not in JSON format');
    });

    it('does not call the server when the file names a "Related to Type" this org does not have', async () => {
        const element = mount();
        await flush();
        await openImport(element);
        importArea(element).value = JSON.stringify({ Templates: [{ Name: 'Odd', DxCPQ__Related_To_Type__c: 'Nothing__c' }] });
        importArea(element).dispatchEvent(new CustomEvent('change'));
        await flush();

        createButton(element).click();
        await flush();

        expect(importData).not.toHaveBeenCalled();
        expect(text(element)).toContain('Nothing__c');
    });
});
