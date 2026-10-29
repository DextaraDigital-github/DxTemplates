import { createElement } from 'lwc';
import TemplateDesignerCMP from 'c/templateDesignerCMP';
import { calls, reset as resetCalls } from '../../../../../../jest-mocks/designer/recorder';
import { getDomainUrl, getClassNames, getFlowNames, getPDFLinks, getAllUserLanguages } from 'c/dxApexCache';
import getAllDocumentTemplateSections from '@salesforce/apex/SaveDocumentTemplatesection.getAllDocumentTemplateSections';
import activateTemplate from '@salesforce/apex/SaveDocumentTemplate.activateTemplate';

// The five section editors are replaced by stubs that record every call the designer makes on them.
jest.mock('c/templateHeader', () => require('../../../../../../jest-mocks/designer/templateHeaderStub'));
jest.mock('c/templateFooter', () => require('../../../../../../jest-mocks/designer/templateFooterStub'));
jest.mock('c/templateContentDetails', () => require('../../../../../../jest-mocks/designer/templateContentDetailsStub'));
jest.mock('c/templateTableDetails', () => require('../../../../../../jest-mocks/designer/templateTableDetailsStub'));
jest.mock('c/templateRelatedObjects', () => require('../../../../../../jest-mocks/designer/templateRelatedObjectsStub'));

// The runner's bundled stubs do not include this module, which cloneDocumentCmp imports.
jest.mock('lightning/actions', () => ({ CloseActionScreenEvent: class CloseActionScreenEvent {} }), { virtual: true });

// Lookups cached by c/dxApexCache.
jest.mock('c/dxApexCache', () => ({
    getDomainUrl: jest.fn(),
    getClassNames: jest.fn(),
    getFlowNames: jest.fn(),
    getPDFLinks: jest.fn(),
    getAllUserLanguages: jest.fn()
}));

// Every other Apex method the designer imports.
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

const template = { Name: 'Test Template', DxCPQ__Related_To_Type__c: 'Account', DxCPQ__IsActive__c: false, DxCPQ__Version_Number__c: 1, DxCPQ__Parent_Template__c: null, DxCPQ__Previously_Active__c: false, DxCPQ__PDF_Page_Properties__c: '' };
const section = (Id, Type, Sequence, Name) => ({ Id, Name, DxCPQ__Type__c: Type, DxCPQ__Sequence__c: Sequence, DxCPQ__Section_Content__c: '{}', DxCPQ__Section_Visibility_Rule__c: null, DxCPQ__Document_Template__r: template });
const sections = () => [
    section('a01HEADER', 'Header', 1, 'Header'),
    section('a01CONTEXT', 'Context', 2, 'Intro'),
    section('a01FOOTER', 'Footer', 3, 'Footer')
];

function mount(recordId = 'a00TEMPLATE') {
    const element = createElement('c-template-designer-c-m-p', { is: TemplateDesignerCMP });
    element.recordId = recordId;
    document.body.appendChild(element);
    return element;
}

const child = (element, tag) => element.shadowRoot.querySelector(tag);
const button = (element, label) => [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.label === label);

describe('c-template-designer-c-m-p', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        resetCalls();
        getDomainUrl.mockResolvedValue('https://example.my.salesforce.com');
        getClassNames.mockResolvedValue({ Cls: 'Class' });
        getFlowNames.mockResolvedValue({ Flw: 'Flow' });
        getPDFLinks.mockResolvedValue([]);
        getAllUserLanguages.mockResolvedValue([{ label: 'English', value: 'en_US' }]);
        getAllDocumentTemplateSections.mockResolvedValue(sections());
        activateTemplate.mockResolvedValue({ DxCPQ__Previously_Active__c: true });
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllTimers();
        jest.useRealTimers();
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    async function mountLoaded() {
        const element = mount();
        await flush();
        jest.advanceTimersByTime(2500);
        await flush();
        return element;
    }

    // B4: `borderOptions` was both a getter and a field, which the LWC engine reports as "Invalid observed
    // borderOptions field. Found a duplicate accessor" when the class is registered.
    it('registers its decorators without engine errors', () => {
        jest.isolateModules(() => {
            require('c/templateDesignerCMP');
        });

        expect(console.error).not.toHaveBeenCalled();
    });

    it('loads the sections of the selected template and each lookup once when it connects', async () => {
        await mountLoaded();

        expect(getAllDocumentTemplateSections).toHaveBeenCalledTimes(1);
        expect(getAllDocumentTemplateSections).toHaveBeenCalledWith({ docTempId: 'a00TEMPLATE' });
        [getDomainUrl, getClassNames, getFlowNames, getPDFLinks, getAllUserLanguages].forEach(lookup => {
            expect(lookup).toHaveBeenCalledTimes(1);
        });
    });

    it('opens the header section for editing once the sections have loaded', async () => {
        await mountLoaded();

        expect(calls).toContainEqual({ child: 'header', method: 'loadsectionvaluesforedit', args: ['a01HEADER'] });
    });

    it('refreshes from memory, without a server call or new lookups, when a section is saved', async () => {
        const element = await mountLoaded();

        child(element, 'c-template-content-details').dispatchEvent(
            new CustomEvent('savesectiondata', { detail: { Id: 'a01CONTEXT', Name: 'Intro (edited)', DxCPQ__Section_Visibility_Rule__c: null } })
        );
        await flush();
        jest.advanceTimersByTime(2500);

        expect(getAllDocumentTemplateSections).toHaveBeenCalledTimes(1);
        [getDomainUrl, getClassNames, getFlowNames, getPDFLinks, getAllUserLanguages].forEach(lookup => {
            expect(lookup).toHaveBeenCalledTimes(1);
        });
    });

    it('reloads the sections from the server, but not the lookups, when a section is deleted', async () => {
        const element = await mountLoaded();

        child(element, 'c-template-content-details').dispatchEvent(new CustomEvent('deletesectiondata'));
        await flush();
        jest.advanceTimersByTime(2500);

        expect(getAllDocumentTemplateSections).toHaveBeenCalledTimes(2);
        [getDomainUrl, getClassNames, getFlowNames, getPDFLinks, getAllUserLanguages].forEach(lookup => {
            expect(lookup).toHaveBeenCalledTimes(1);
        });
    });

    it('reloads the sections of another template when the setup page switches templates', async () => {
        const element = await mountLoaded();

        element.handleConnectedCallback({ Id: 'a00OTHER', DxCPQ__Related_To_Type__c: 'Opportunity' });
        await flush();
        jest.advanceTimersByTime(2500);

        expect(getAllDocumentTemplateSections).toHaveBeenCalledTimes(2);
        expect(getAllDocumentTemplateSections).toHaveBeenLastCalledWith({ docTempId: 'a00OTHER' });
        expect(getClassNames).toHaveBeenCalledTimes(1);
    });

    it('tells every section editor about activation, in order, and then activates the template', async () => {
        const element = await mountLoaded();
        element.isSaved = true;
        resetCalls();

        button(element, 'Activate').click();
        await flush();

        const activation = calls.filter(c => c.method === 'handleActivateTemplate');
        expect(activation.map(c => c.child)).toEqual(['content', 'table', 'related', 'header', 'footer']);
        activation.forEach(c => expect(c.args).toEqual([true, 'Account']));
        expect(activateTemplate).toHaveBeenCalledWith({ templateId: 'a00TEMPLATE', parentId: null, isActive: true });
    });

    it('does not activate while there are unsaved changes', async () => {
        const element = await mountLoaded();
        element.isSaved = false;
        resetCalls();

        button(element, 'Activate').click();
        await flush();

        expect(calls.filter(c => c.method === 'handleActivateTemplate')).toHaveLength(0);
        expect(activateTemplate).not.toHaveBeenCalled();
    });
});
