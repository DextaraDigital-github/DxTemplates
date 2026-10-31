import { createElement } from 'lwc';
import TemplateHeader from 'c/templateHeader';
import getAllConstants from '@salesforce/apex/PopUpMessageSelector.getAllConstants';
import saveDocumentTemplateSectionDetails from '@salesforce/apex/SaveDocumentTemplatesection.saveDocumentTemplateSectionDetails';
import gettemplatesectiondata from '@salesforce/apex/SaveDocumentTemplatesection.gettemplatesectiondata';

// The runner's own ShowToastEvent stub drops the title and message; this one keeps them in `detail`.
jest.mock('lightning/platformShowToastEvent', () => ({
    ShowToastEvent: class extends CustomEvent {
        constructor(detail) {
            super('lightning__showtoast', { detail, bubbles: true, composed: true, cancelable: true });
        }
    }
}), { virtual: true });

jest.mock('@salesforce/apex/PopUpMessageSelector.getAllConstants', () => {
    const { createApexTestWireAdapter } = require('@salesforce/sfdx-lwc-jest');
    return { __esModule: true, default: createApexTestWireAdapter(jest.fn()) };
}, { virtual: true });
jest.mock('@salesforce/apex/SaveDocumentTemplatesection.saveDocumentTemplateSectionDetails', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/SaveDocumentTemplatesection.gettemplatesectiondata', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/FooterClass.getContentVersions', () => {
    const { createApexTestWireAdapter } = require('@salesforce/sfdx-lwc-jest');
    return { __esModule: true, default: createApexTestWireAdapter(jest.fn()) };
}, { virtual: true });
jest.mock('@salesforce/apex/FooterClass.getSearchedContentVersions', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });

// Microtasks only, so it also works while timers are faked.
const flush = async () => {
    for (let i = 0; i < 15; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
};

function mount(props = {}) {
    const element = createElement('c-template-header', { is: TemplateHeader });
    Object.assign(element, {
        showheaderdetails: true, sectiontype: 'Header', rowcount: 1, sectionrecordid: 'HeaderNotSaved',
        documenttemplaterecord: { Id: 'a00TEMPLATE', DxCPQ__Related_To_Type__c: 'Account' }, selectedObjectName: 'Account', ...props
    });
    document.body.appendChild(element);
    return element;
}

const button = (element, label) => [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.label === label);
const combo = (element, label) => [...element.shadowRoot.querySelectorAll('lightning-combobox')].find(c => c.label === label);
const editors = element => [...element.shadowRoot.querySelectorAll('c-template-header-type')];
const choose = async (element, label, value) => {
    combo(element, label).dispatchEvent(new CustomEvent('change', { detail: { value } }));
    await flush();
};
// What a section editor tells the header when its text changes.
const typeInto = async (editor, indexvar, value) => {
    editor.dispatchEvent(new CustomEvent('saverichtextheader', { detail: { value, indexvar, key: 'k' + indexvar } }));
    await flush();
};
const savedContent = () => JSON.parse(saveDocumentTemplateSectionDetails.mock.calls[0][0].Recorddetails.DxCPQ__Section_Content__c);

function listen(element, names) {
    const seen = [];
    names.forEach(name => element.addEventListener(name, e => seen.push({ name, detail: e.detail })));
    return seen;
}

describe('c-template-header', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        saveDocumentTemplateSectionDetails.mockResolvedValue({ Id: 'a02HEADER', Name: 'Header' });
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

    it('registers its decorators without engine errors', () => {
        jest.isolateModules(() => {
            require('c/templateHeader');
        });

        expect(console.error).not.toHaveBeenCalled();
    });

    it('shows the fixed name "Header", the column count and the Save and Delete buttons', async () => {
        const element = mount();
        await flush();

        const name = [...element.shadowRoot.querySelectorAll('lightning-input')].find(i => i.name === 'name');
        expect(name.value).toBe('Header');
        expect(combo(element, 'Select column count')).toBeDefined();
        expect(button(element, 'Save')).toBeDefined();
        expect(button(element, 'Delete')).toBeDefined();
    });

    it('opens one editor per chosen column, labelled Left, Center and Right', async () => {
        const element = mount();
        await flush();

        await choose(element, 'Select column count', '3');

        expect(editors(element)).toHaveLength(3);
        expect(editors(element).map(e => e.headerAlign)).toEqual(['Left', 'Center', 'Right']);
    });

    it('keeps the text of a hidden column when the count goes down and up again', async () => {
        const element = mount();
        await flush();
        await choose(element, 'Select column count', '3');
        await typeInto(editors(element)[2], 2, '<p>Right text</p>');

        await choose(element, 'Select column count', '1');
        expect(editors(element)).toHaveLength(1);
        await choose(element, 'Select column count', '3');

        const rightEditor = editors(element).find(e => e.indexvar === 2);
        expect(rightEditor.editorcontent).toBe('<p>Right text</p>');
    });

    it('saves the column count and the text of each column, then tells the designer', async () => {
        const element = mount();
        const seen = listen(element, ['savesectiondata', 'datasaved', 'lightning__showtoast']);
        getAllConstants.emit({ TEMPLATEHEADER_CREATED: ' was Saved' });
        await flush();
        await choose(element, 'Select column count', '2');
        await typeInto(editors(element)[0], 0, '<p>Company</p>');
        await typeInto(editors(element)[1], 1, '<p>Date</p>');

        button(element, 'Save').click();
        await flush();

        expect(saveDocumentTemplateSectionDetails).toHaveBeenCalledTimes(1);
        expect(saveDocumentTemplateSectionDetails.mock.calls[0][0].Recorddetails).toMatchObject({
            Name: 'Header', DxCPQ__Type__c: 'Header', DxCPQ__Sequence__c: 1, DxCPQ__Document_Template__c: 'a00TEMPLATE'
        });
        const content = savedContent();
        expect(content.sectionsCount).toBe('2');
        expect(content.sectionsContent.map(c => [c.indexvar, c.value]).sort()).toEqual([[0, '<p>Company</p>'], [1, '<p>Date</p>']]);
        expect(seen.find(e => e.name === 'savesectiondata').detail).toEqual({ Id: 'a02HEADER', Name: 'Header' });
        expect(seen.some(e => e.name === 'datasaved' && e.detail === true)).toBe(true);
        expect(seen.find(e => e.name === 'lightning__showtoast').detail).toMatchObject({ title: 'Success', variant: 'success', message: 'Section "Header" was Saved' });
    });

    it('saves a first-page header next to the normal one when "Unique First Page Header" is ticked', async () => {
        const element = mount();
        getAllConstants.emit({ TEMPLATEHEADER_CREATED: ' was Saved' });
        await flush();
        await choose(element, 'Select column count', '1');
        await typeInto(editors(element)[0], 0, '<p>Normal</p>');
        element.shadowRoot.querySelector('lightning-input[data-id="uniqueheader"]').dispatchEvent(new CustomEvent('change', { detail: { checked: true } }));
        await flush();
        await choose(element, '(First page Header) Select column count', '1');
        const firstEditor = editors(element).find(e => e.indexvar === 3);
        await typeInto(firstEditor, 3, '<p>Cover</p>');

        button(element, 'Save').click();
        await flush();

        const content = savedContent();
        expect(content.sectionsFirstCount).toBe('1');
        expect(content.sectionsContent.map(c => [c.indexvar, c.value]).sort()).toEqual([[0, '<p>Normal</p>'], [3, '<p>Cover</p>']]);
    });

    // The PDF uses a separate first-page header whenever sectionsFirstCount is saved, so unticking the box must
    // remove the first-page header from what is saved (it used to stay in the data and in the PDF).
    it('saves no first-page header after "Unique First Page Header" has been unticked again', async () => {
        const element = mount();
        getAllConstants.emit({ TEMPLATEHEADER_CREATED: ' was Saved' });
        await flush();
        await choose(element, 'Select column count', '1');
        await typeInto(editors(element)[0], 0, '<p>Normal</p>');
        const checkbox = element.shadowRoot.querySelector('lightning-input[data-id="uniqueheader"]');
        checkbox.dispatchEvent(new CustomEvent('change', { detail: { checked: true } }));
        await flush();
        await choose(element, '(First page Header) Select column count', '1');
        await typeInto(editors(element).find(e => e.indexvar === 3), 3, '<p>Cover</p>');
        element.shadowRoot.querySelector('lightning-input[data-id="uniqueheader"]').dispatchEvent(new CustomEvent('change', { detail: { checked: false } }));
        await flush();

        button(element, 'Save').click();
        await flush();

        const content = savedContent();
        expect(content.sectionsFirstCount == null).toBe(true);
        expect(content.sectionsContent.map(c => c.indexvar)).toEqual([0]);
    });

    it('opens a saved header with its columns and text, and saves it again unchanged', async () => {
        gettemplatesectiondata.mockResolvedValue({
            Name: 'Header',
            DxCPQ__Section_Content__c: JSON.stringify({
                sectionsCount: '2', sectionsFirstCount: null,
                sectionsContent: [
                    { value: '<p>Right</p>', indexvar: 1, key: 'k1' },
                    { value: '<p>Left</p>', indexvar: 0, key: 'k0', columnCount: '2', headerVal: 'Left' }
                ]
            })
        });
        const element = mount({ sectionrecordid: 'a02HEADER' });
        getAllConstants.emit({ TEMPLATEHEADER_CREATED: ' was Saved' });
        element.loadsectionvaluesforedit('a02HEADER');
        await flush();
        jest.runAllTimers();
        await flush();

        expect(editors(element).map(e => e.editorcontent)).toEqual(['<p>Left</p>', '<p>Right</p>']);
        button(element, 'Save').click();
        await flush();
        const content = savedContent();
        expect(content.sectionsCount).toBe('2');
        expect(content.sectionsContent.map(c => [c.indexvar, c.value]).sort()).toEqual([[0, '<p>Left</p>'], [1, '<p>Right</p>']]);
        expect(saveDocumentTemplateSectionDetails.mock.calls[0][0].Recorddetails.Id).toBe('a02HEADER');
    });

    it('gives a picture in a header a size style so that it fits, once', async () => {
        const element = mount();
        getAllConstants.emit({ TEMPLATEHEADER_CREATED: ' was Saved' });
        await flush();
        await choose(element, 'Select column count', '1');
        await typeInto(editors(element)[0], 0, '<p><img src="/sfc/servlet.shepherd/version/download/068X"></p>');

        button(element, 'Save').click();
        await flush();

        const value = savedContent().sectionsContent[0].value;
        expect(value).toContain('max-width:100%');
        expect(value.match(/style=/g)).toHaveLength(1);
    });

    it('disables Save and Delete when the template is activated', async () => {
        const element = mount();
        await flush();

        element.handleActivateTemplate(true);
        await flush();

        expect(button(element, 'Save').disabled).toBe(true);
        expect(button(element, 'Delete').disabled).toBe(true);
    });
});
