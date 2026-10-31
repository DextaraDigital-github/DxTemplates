import { createElement } from 'lwc';
import TemplateDesignerCMP from 'c/templateDesignerCMP';
import { getAllUserLanguages, getDomainUrl, getClassNames, getFlowNames, getPDFLinks } from 'c/dxApexCache';
import getAllDocumentTemplateSections from '@salesforce/apex/SaveDocumentTemplatesection.getAllDocumentTemplateSections';
import createUpdateMethod from '@salesforce/apex/LanguageTranslatorClass.createUpdateMethod';
import deleteMethod from '@salesforce/apex/LanguageTranslatorClass.deleteMethod';
import selectedLangMethod from '@salesforce/apex/LanguageTranslatorClass.selectedLangMethod';
import currectUserLang from '@salesforce/apex/LanguageTranslatorClass.currectUserLang';

// The runner's own ShowToastEvent stub drops the title and message; this one keeps them in `detail`.
jest.mock('lightning/platformShowToastEvent', () => ({
    ShowToastEvent: class extends CustomEvent {
        constructor(detail) {
            super('lightning__showtoast', { detail, bubbles: true, composed: true, cancelable: true });
        }
    }
}), { virtual: true });

jest.mock('c/templateHeader', () => require('../../../../../../jest-mocks/designer/templateHeaderStub'));
jest.mock('c/templateFooter', () => require('../../../../../../jest-mocks/designer/templateFooterStub'));
jest.mock('c/templateContentDetails', () => require('../../../../../../jest-mocks/designer/templateContentDetailsStub'));
jest.mock('c/templateTableDetails', () => require('../../../../../../jest-mocks/designer/templateTableDetailsStub'));
jest.mock('c/templateRelatedObjects', () => require('../../../../../../jest-mocks/designer/templateRelatedObjectsStub'));
jest.mock('lightning/actions', () => ({ CloseActionScreenEvent: class CloseActionScreenEvent {} }), { virtual: true });
jest.mock('c/dxApexCache', () => ({
    getDomainUrl: jest.fn(),
    getClassNames: jest.fn(),
    getFlowNames: jest.fn(),
    getPDFLinks: jest.fn(),
    getAllUserLanguages: jest.fn()
}));
jest.mock('@salesforce/apex/SaveDocumentTemplatesection.saveDocumentTemplateSectionSequences', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/SaveDocumentTemplatesection.CloneTemplateSection', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/SaveDocumentTemplatesection.getAllDocumentTemplateSections', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/SaveDocumentTemplate.activateTemplate', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/SaveDocumentTemplate.deleteTemplate', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/SaveDocumentTemplate.updateTemplateDetails', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/SaveDocumentTemplate.gettemplatedata', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/DisplayPDFController.saveContentVersion', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/DisplayPDFController.getDocumentTemplateData', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/LogHandler.createLog', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/ProductSetupCtrl.getOriginalImageCVID', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/LanguageTranslatorClass.insertTranslatedRecords', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/LanguageTranslatorClass.createUpdateMethod', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/LanguageTranslatorClass.deleteMethod', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/LanguageTranslatorClass.selectedLangMethod', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/LanguageTranslatorClass.currectUserLang', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });

// Microtasks only, so it also works while timers are faked.
const flush = async () => {
    for (let i = 0; i < 15; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
};

const template = { Name: 'Test Template', DxCPQ__Related_To_Type__c: 'Account', DxCPQ__IsActive__c: false, DxCPQ__Version_Number__c: 1, DxCPQ__PDF_Page_Properties__c: '' };
const section = (Id, Type, Sequence, Name) => ({ Id, Name, DxCPQ__Type__c: Type, DxCPQ__Sequence__c: Sequence, DxCPQ__Section_Content__c: '{}', DxCPQ__Section_Visibility_Rule__c: null, DxCPQ__Document_Template__r: template });

const saved = [
    { Id: 'a0T000000000001AAA', Name: 'Greeting', DxCPQ__FieldValue__c: 'Greeting', DxCPQ__Translated_Value__c: 'Bonjour' },
    { Id: 'a0T000000000002AAA', Name: 'Farewell', DxCPQ__FieldValue__c: 'Farewell', DxCPQ__Translated_Value__c: 'Au revoir' },
    { Id: 'a0T000000000003AAA', Name: 'Thanks', DxCPQ__FieldValue__c: 'Thanks', DxCPQ__Translated_Value__c: 'Merci' }
];

async function openDialog() {
    const element = createElement('c-template-designer-c-m-p', { is: TemplateDesignerCMP });
    element.recordId = 'a00TEMPLATE';
    document.body.appendChild(element);
    await flush();
    jest.advanceTimersByTime(2500);
    await flush();
    element.shadowRoot.querySelector('button[title="Translate"]').click();
    await flush();
    return element;
}

const rows = element => [...element.shadowRoot.querySelectorAll('lightning-input.field-input')];
const values = element => [...element.shadowRoot.querySelectorAll('lightning-textarea.trans-value')];
const type = async (field, value) => {
    field.value = value;
    field.dispatchEvent(new CustomEvent('change'));
    await flush();
};
const footerButton = (element, label) => [...element.shadowRoot.querySelectorAll('footer lightning-button')].find(b => b.label === label);
const toasts = [];
const collectToast = e => toasts.push(e.detail);

describe('translation dialog of the designer', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        toasts.length = 0;
        getDomainUrl.mockResolvedValue('https://example.my.salesforce.com');
        getClassNames.mockResolvedValue({});
        getFlowNames.mockResolvedValue({});
        getPDFLinks.mockResolvedValue([]);
        getAllUserLanguages.mockResolvedValue([{ label: 'English', value: 'en_US' }, { label: 'French', value: 'fr' }]);
        getAllDocumentTemplateSections.mockResolvedValue([section('a01HEADER', 'Header', 1, 'Header'), section('a01CONTEXT', 'Context', 2, 'Intro')]);
        currectUserLang.mockResolvedValue('English');
        selectedLangMethod.mockResolvedValue(saved);
        createUpdateMethod.mockResolvedValue(true);
        deleteMethod.mockResolvedValue(true);
        document.addEventListener('lightning__showtoast', collectToast);
    });

    afterEach(() => {
        document.removeEventListener('lightning__showtoast', collectToast);
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllTimers();
        jest.useRealTimers();
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    it('opens with the language of the user and that language\'s translations of this template', async () => {
        const element = await openDialog();

        expect(selectedLangMethod).toHaveBeenCalledWith({ language: 'en_US', docTempId: 'a00TEMPLATE' });
        expect(rows(element).map(r => r.value)).toEqual(['Greeting', 'Farewell', 'Thanks']);
        expect(values(element).map(v => v.value)).toEqual(['Bonjour', 'Au revoir', 'Merci']);
    });

    it('loads the translations of another language when it is chosen', async () => {
        const element = await openDialog();
        selectedLangMethod.mockResolvedValue([{ Id: 'a0T000000000009AAA', Name: 'Greeting', DxCPQ__FieldValue__c: 'Greeting', DxCPQ__Translated_Value__c: 'Hallo' }]);

        element.shadowRoot.querySelector('lightning-combobox').dispatchEvent(new CustomEvent('change', { detail: { value: 'fr' } }));
        await flush();

        expect(selectedLangMethod).toHaveBeenLastCalledWith({ language: 'fr', docTempId: 'a00TEMPLATE' });
        expect(values(element).map(v => v.value)).toEqual(['Hallo']);
    });

    it('saves the edited translation for the chosen language and template, then confirms', async () => {
        const element = await openDialog();
        await type(values(element)[0], 'Salut');

        footerButton(element, 'Save').click();
        await flush();

        expect(createUpdateMethod).toHaveBeenCalledTimes(1);
        const call = createUpdateMethod.mock.calls[0][0];
        expect(call.language).toBe('en_US');
        expect(call.docTemplateId).toBe('a00TEMPLATE');
        expect(JSON.parse(call.jsonStringData)[0]).toMatchObject({ Name: 'Greeting', FieldValue: 'Greeting', TranslatedValue: 'Salut' });
        expect(toasts).toEqual([expect.objectContaining({ title: 'Success', message: 'Record saved successfully', variant: 'success' })]);
    });

    // A row without a name was reported, then the dialog closed anyway and the typing was lost.
    it('keeps the dialog and the typing when a row has no name, and says so once', async () => {
        const element = await openDialog();
        await type(rows(element)[1], '');

        footerButton(element, 'Save').click();
        await flush();

        expect(createUpdateMethod).not.toHaveBeenCalled();
        expect(toasts.filter(t => t.variant === 'error')).toHaveLength(1);
        expect(rows(element)).toHaveLength(3);
    });

    // The server answers false when a row was refused; the user was told "saved" anyway and the dialog closed.
    it('says that saving failed when the server refuses it, and keeps the dialog with its rows', async () => {
        createUpdateMethod.mockResolvedValue(false);
        const element = await openDialog();
        await type(values(element)[0], 'Salut');

        footerButton(element, 'Save').click();
        await flush();

        expect(toasts.map(t => t.variant)).toEqual(['error']);
        expect(rows(element)).toHaveLength(3);
        expect(values(element)[0].value).toBe('Salut');
    });

    // Saving renamed the fields of the rows in place; after a failed save the rows no longer showed their texts.
    it('still shows the texts of the rows after a save that failed', async () => {
        createUpdateMethod.mockRejectedValue(new Error('boom'));
        const element = await openDialog();

        footerButton(element, 'Save').click();
        await flush();

        expect(values(element).map(v => v.value)).toEqual(['Bonjour', 'Au revoir', 'Merci']);
    });

    // Editing while a search was active replaced the full list with the shown rows.
    it('keeps the rows that the search hides when a shown row is edited', async () => {
        const element = await openDialog();
        const search = [...element.shadowRoot.querySelectorAll('lightning-input')].find(i => i.label === 'Search');
        search.value = 'fare';
        search.dispatchEvent(new CustomEvent('change'));
        await flush();
        expect(rows(element).map(r => r.value)).toEqual(['Farewell']);

        await type(values(element)[0], 'Adieu');
        search.value = '';
        search.dispatchEvent(new CustomEvent('change'));
        await flush();

        expect(rows(element).map(r => r.value)).toEqual(['Greeting', 'Farewell', 'Thanks']);
        expect(values(element).map(v => v.value)).toEqual(['Bonjour', 'Adieu', 'Merci']);
    });

    it('deletes a saved row on the server and removes it from the list', async () => {
        const element = await openDialog();

        element.shadowRoot.querySelectorAll('lightning-button-icon[title="Delete"]')[1].click();
        await flush();

        expect(deleteMethod).toHaveBeenCalledWith({ deleteRecordId: 'a0T000000000002AAA' });
        expect(rows(element).map(r => r.value)).toEqual(['Greeting', 'Thanks']);
    });

    // A language without translations showed one empty row, but it was the same row object for every language, so what was
    // typed in it for one language appeared in the next.
    it('starts every language without translations with its own empty row', async () => {
        selectedLangMethod.mockResolvedValue([]);
        const element = await openDialog();
        await type(rows(element)[0], 'Typed for English');

        element.shadowRoot.querySelector('lightning-combobox').dispatchEvent(new CustomEvent('change', { detail: { value: 'fr' } }));
        await flush();

        expect(rows(element)).toHaveLength(1);
        expect(rows(element)[0].value).toBe('');
    });
});
