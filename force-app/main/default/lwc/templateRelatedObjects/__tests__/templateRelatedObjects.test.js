import { createElement } from 'lwc';
import TemplateRelatedObjects from 'c/templateRelatedObjects';
import getRelatedObjects from '@salesforce/apex/RelatedObjectsClass.getRelatedObjects';
import deletetemplate from '@salesforce/apex/SaveDocumentTemplatesection.deletetemplate';
import saveDocumentTemplateSectionDetails from '@salesforce/apex/SaveDocumentTemplatesection.saveDocumentTemplateSectionDetails';

// The runner's own ShowToastEvent stub drops the title and message; this one keeps them in `detail`.
jest.mock('lightning/platformShowToastEvent', () => ({
    ShowToastEvent: class extends CustomEvent {
        constructor(detail) {
            super('lightning__showtoast', { detail, bubbles: true, composed: true, cancelable: true });
        }
    }
}), { virtual: true });

// Every Apex method the editor imports.
jest.mock('@salesforce/apex/MergeFieldsClass.getFields', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/RelatedObjectsClass.getRelatedObjects', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/RelatedObjectsClass.getExistingConditions', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/RelatedObjectsClass.getGroupingValues', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/RelatedObjectsClass.createRuleCondition', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/RelatedObjectsClass.getSObjectListFiltering', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/RelatedObjectsClass.handleTemplateRuleResetCondition', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/SaveDocumentTemplatesection.deletetemplate', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/SaveDocumentTemplatesection.gettemplatesectiondata', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/SaveDocumentTemplatesection.saveDocumentTemplateSectionDetails', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });

// Microtasks only, so it also works while timers are faked.
const flush = async () => {
    for (let i = 0; i < 15; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
};

function mount(props = {}) {
    const element = createElement('c-template-related-objects', { is: TemplateRelatedObjects });
    // The designer always passes a string for sectionrecordid ('<Type>NotSaved' for a new section).
    Object.assign(element, {
        showrelatedobjectdetails: true,
        sectiontype: 'Related Objects',
        rowcount: 2,
        sectionrecordid: 'Related ObjectsNotSaved',
        documenttemplaterecordid: 'a00TEMPLATE',
        documenttemplaterecord: { Id: 'a00TEMPLATE', DxCPQ__Related_To_Type__c: 'Account' },
        ...props
    });
    document.body.appendChild(element);
    return element;
}

const button = (element, label) => [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.label === label);

function listen(element, names) {
    const seen = [];
    names.forEach(name => element.addEventListener(name, e => seen.push({ name, detail: e.detail })));
    return seen;
}

describe('c-template-related-objects', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        getRelatedObjects.mockResolvedValue({ Contacts: 'AccountId', Opportunities: 'AccountId' });
        deletetemplate.mockResolvedValue('Success');
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

    // Load smoke test. B4 removed duplicate declarations of conditionsArr and listOfExistingConditions; the engine
    // does not report plain duplicates, so this passes before and after (the proof is ESLint no-dupe-class-members).
    it('registers its decorators without engine errors', () => {
        jest.isolateModules(() => {
            require('c/templateRelatedObjects');
        });

        expect(console.error).not.toHaveBeenCalled();
    });

    it('shows the Save and Delete buttons when details are shown, and nothing when hidden', async () => {
        const shown = mount();
        await flush();
        expect(button(shown, 'Save')).toBeDefined();
        expect(button(shown, 'Delete')).toBeDefined();

        const hidden = mount({ showrelatedobjectdetails: false });
        await flush();
        expect(hidden.shadowRoot.querySelector('lightning-button')).toBeNull();
    });

    it('asks Apex for the related objects of the selected object', async () => {
        const element = mount();
        await flush();

        element.handleObjectNameSelection('Account');
        await flush();

        expect(getRelatedObjects).toHaveBeenCalledWith({ selectedObject: 'Account' });
    });

    it('survives Apex failing to return the related objects', async () => {
        getRelatedObjects.mockRejectedValue(new Error('boom'));
        const element = mount();
        await flush();

        element.handleObjectNameSelection('Account');
        await flush();

        expect(console.error).not.toHaveBeenCalled();
        expect(button(element, 'Save')).toBeDefined();
    });

    it('deletes a saved section through Apex and then tells the parent', async () => {
        const element = mount({ sectionrecordid: 'a02SECTION' });
        const seen = listen(element, ['deletesectiondata']);
        await flush();

        button(element, 'Delete').click();
        await flush();

        expect(deletetemplate).toHaveBeenCalledWith({ secidtobedeleted: 'a02SECTION', doctemplateid: 'a00TEMPLATE' });
        expect(seen).toEqual([{ name: 'deletesectiondata', detail: 'a02SECTION' }]);
    });

    it('removes an unsaved section without calling Apex', async () => {
        const element = mount();
        const seen = listen(element, ['deletesectiondata']);
        await flush();

        button(element, 'Delete').click();
        await flush();

        expect(deletetemplate).not.toHaveBeenCalled();
        expect(seen).toEqual([{ name: 'deletesectiondata', detail: 'Related ObjectsNotSaved' }]);
    });

    it('disables Save and Delete when the template is activated, and re-enables them on deactivation', async () => {
        const element = mount();
        await flush();

        element.handleActivateTemplate(true, 'Account');
        await flush();
        expect(button(element, 'Save').disabled).toBe(true);
        expect(button(element, 'Delete').disabled).toBe(true);

        element.handleActivateTemplate(false, 'Account');
        await flush();
        expect(button(element, 'Save').disabled).toBe(false);
        expect(button(element, 'Delete').disabled).toBe(false);
    });

    it('takes the template id from the designer through assignDocTempId', async () => {
        const element = mount({ sectionrecordid: 'a02SECTION', documenttemplaterecordid: undefined });
        element.assignDocTempId('a00OTHER');
        await flush();

        button(element, 'Delete').click();
        await flush();

        expect(deletetemplate).toHaveBeenCalledWith({ secidtobedeleted: 'a02SECTION', doctemplateid: 'a00OTHER' });
    });

    // B7: handlesectionsave ended with `this.template.querySelector('c-template-designer-cmp').showPreview = true`.
    // That element does not exist in this template (the designer's tag is c-template-designer-c-m-p and it is the
    // parent, not a child), so every save, including this validation failure, ended in a TypeError.
    it('shows an error and saves nothing when the section is incomplete, without throwing', async () => {
        const element = mount();
        const seen = listen(element, ['lightning__showtoast', 'savesectiondata']);
        const errors = [];
        const onError = e => { errors.push(e.message); e.preventDefault(); };
        window.addEventListener('error', onError);
        await flush();

        button(element, 'Save').click();
        await flush();
        window.removeEventListener('error', onError);

        expect(saveDocumentTemplateSectionDetails).not.toHaveBeenCalled();
        expect(seen.find(e => e.name === 'lightning__showtoast').detail).toMatchObject({
            title: 'Error',
            message: 'Please Enter Name, Select Object & Fields before Saving'
        });
        expect(seen.some(e => e.name === 'savesectiondata')).toBe(false);
        expect(errors).toEqual([]);
    });
});
