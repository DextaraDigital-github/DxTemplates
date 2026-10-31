import { createElement } from 'lwc';
import TemplateFooter from 'c/templateFooter';
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
    const element = createElement('c-template-footer', { is: TemplateFooter });
    Object.assign(element, {
        showfooterdetails: true, sectiontype: 'Footer', rowcount: 9, sectionrecordid: 'FooterNotSaved',
        documenttemplaterecord: { Id: 'a00TEMPLATE', DxCPQ__Related_To_Type__c: 'Account' }, selectedObjectName: 'Account', ...props
    });
    document.body.appendChild(element);
    return element;
}

const button = (element, label) => [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.label === label);
const countCombo = element => element.shadowRoot.querySelector('lightning-combobox');
const pageNumbers = element => element.shadowRoot.querySelector('lightning-checkbox-group');
const editors = element => [...element.shadowRoot.querySelectorAll('c-template-footer-type')];
const choose = async (element, value) => {
    countCombo(element).dispatchEvent(new CustomEvent('change', { detail: { value } }));
    await flush();
};
// What a section editor tells the footer when its text changes.
const typeInto = async (editor, indexvar, value) => {
    editor.dispatchEvent(new CustomEvent('saverichtextfooter', { detail: { value, indexvar, key: 'k' + indexvar } }));
    await flush();
};
const tickPageNumbers = async (element, ticked) => {
    pageNumbers(element).dispatchEvent(new CustomEvent('change', { detail: { value: ticked ? ['Display Page Number Sequence'] : [] } }));
    await flush();
};
const savedContent = () => JSON.parse(saveDocumentTemplateSectionDetails.mock.calls[0][0].Recorddetails.DxCPQ__Section_Content__c);
const saved = element => { button(element, 'Save').click(); return flush(); };

function listen(element, names) {
    const seen = [];
    names.forEach(name => element.addEventListener(name, e => seen.push({ name, detail: e.detail })));
    return seen;
}

const savedFooter = (overrides = {}) => ({
    Name: 'Footer',
    DxCPQ__Section_Content__c: JSON.stringify({
        sectionsCount: '2', displaypagesequence: true,
        sectionsContent: [
            { value: '<p>Right</p>', indexvar: 1, key: 'k1' },
            { value: '<p>Left</p>', indexvar: 0, key: 'k0', columnCount: '2', footerVal: 'Left' }
        ]
    }),
    ...overrides
});

describe('c-template-footer', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        saveDocumentTemplateSectionDetails.mockResolvedValue({ Id: 'a02FOOTER', Name: 'Footer' });
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
            require('c/templateFooter');
        });

        expect(console.error).not.toHaveBeenCalled();
    });

    it('shows the fixed name "Footer", the page number option, the column count and the Save and Delete buttons', async () => {
        const element = mount();
        await flush();

        const name = [...element.shadowRoot.querySelectorAll('lightning-input')].find(i => i.name === 'name');
        expect(name.value).toBe('Footer');
        expect(pageNumbers(element).options.map(o => o.label)).toEqual(['Display Page Number Sequence']);
        expect(countCombo(element)).not.toBeNull();
        expect(button(element, 'Save')).toBeDefined();
        expect(button(element, 'Delete')).toBeDefined();
    });

    it('opens one editor per chosen column, labelled Left, Center and Right', async () => {
        const element = mount();
        await flush();

        await choose(element, '3');

        expect(editors(element)).toHaveLength(3);
        expect(editors(element).map(e => e.footerAlign)).toEqual(['Left', 'Center', 'Right']);
    });

    it('keeps the text of a hidden column when the count goes down and up again', async () => {
        const element = mount();
        await flush();
        await choose(element, '3');
        await typeInto(editors(element)[2], 2, '<p>Right text</p>');

        await choose(element, '1');
        expect(editors(element)).toHaveLength(1);
        await choose(element, '3');

        expect(editors(element).find(e => e.indexvar === 2).editorcontent).toBe('<p>Right text</p>');
    });

    it('saves the columns, the page number option and the texts, then tells the designer', async () => {
        const element = mount();
        const seen = listen(element, ['savesectiondata', 'datasaved', 'lightning__showtoast']);
        await flush();
        await choose(element, '2');
        await typeInto(editors(element)[0], 0, '<p>All rights reserved</p>');
        await typeInto(editors(element)[1], 1, '<p>Confidential</p>');
        await tickPageNumbers(element, true);

        await saved(element);

        expect(saveDocumentTemplateSectionDetails.mock.calls[0][0].Recorddetails).toMatchObject({
            Name: 'Footer', DxCPQ__Type__c: 'Footer', DxCPQ__Sequence__c: 9, DxCPQ__Document_Template__c: 'a00TEMPLATE'
        });
        const content = savedContent();
        expect(content.sectionsCount).toBe('2');
        expect(content.displaypagesequence).toBe(true);
        expect(content.sectionsContent.map(c => [c.indexvar, c.value]).sort()).toEqual([[0, '<p>All rights reserved</p>'], [1, '<p>Confidential</p>']]);
        expect(seen.find(e => e.name === 'savesectiondata').detail).toEqual({ Id: 'a02FOOTER', Name: 'Footer' });
        expect(seen.some(e => e.name === 'datasaved' && e.detail === true)).toBe(true);
        expect(seen.find(e => e.name === 'lightning__showtoast').detail).toMatchObject({ title: 'Success', variant: 'success', message: 'Section "Footer" was Saved' });
    });

    // The page number is printed from the saved footer data, but the data was only written when at least one column
    // existed, so a footer that only shows page numbers could not be saved.
    it('saves a footer that only shows page numbers, without any column', async () => {
        const element = mount();
        await flush();
        await tickPageNumbers(element, true);

        await saved(element);

        expect(saveDocumentTemplateSectionDetails).toHaveBeenCalledTimes(1);
        const content = savedContent();
        expect(content.displaypagesequence).toBe(true);
        expect(content.sectionsCount).toBe('0');
        expect(content.sectionsContent).toEqual([]);
    });

    it('opens a saved footer with its columns and page number option, and saves it again unchanged', async () => {
        gettemplatesectiondata.mockResolvedValue(savedFooter());
        const element = mount({ sectionrecordid: 'a02FOOTER' });
        element.loadsectionvaluesforedit('a02FOOTER');
        await flush();

        expect(editors(element).map(e => e.editorcontent)).toEqual(['<p>Left</p>', '<p>Right</p>']);
        await saved(element);
        const content = savedContent();
        expect(content.sectionsCount).toBe('2');
        expect(content.displaypagesequence).toBe(true);
        expect(content.sectionsContent.map(c => [c.indexvar, c.value]).sort()).toEqual([[0, '<p>Left</p>'], [1, '<p>Right</p>']]);
        expect(saveDocumentTemplateSectionDetails.mock.calls[0][0].Recorddetails.Id).toBe('a02FOOTER');
    });

    // Switching to the footer of another template whose footer has no saved content kept the columns of the footer
    // that was open before, and Save would have written them into the new template.
    it('shows no columns of the previous footer when a footer without content is opened', async () => {
        gettemplatesectiondata.mockResolvedValueOnce(savedFooter()).mockResolvedValueOnce({ Name: 'Footer', DxCPQ__Section_Content__c: '' });
        const element = mount();
        element.loadsectionvaluesforedit('a02FIRST');
        await flush();
        expect(editors(element)).toHaveLength(2);

        element.loadsectionvaluesforedit('a02SECOND');
        await flush();

        expect(editors(element)).toHaveLength(0);
    });

    it('does not keep the page number option of the previous footer when another footer is opened', async () => {
        gettemplatesectiondata.mockResolvedValueOnce(savedFooter()).mockResolvedValueOnce(savedFooter({
            DxCPQ__Section_Content__c: JSON.stringify({ sectionsCount: '1', displaypagesequence: false, sectionsContent: [{ value: '<p>Only</p>', indexvar: 0, key: 'k0' }] })
        }));
        const element = mount();
        element.loadsectionvaluesforedit('a02FIRST');
        await flush();
        element.loadsectionvaluesforedit('a02SECOND');
        await flush();

        expect(pageNumbers(element).value).toEqual([]);
    });

    it('gives a picture in a footer a size style so that it fits, once', async () => {
        const element = mount();
        await flush();
        await choose(element, '1');
        await typeInto(editors(element)[0], 0, '<p><img src="/sfc/servlet.shepherd/version/download/068X"></p>');

        await saved(element);

        const value = savedContent().sectionsContent[0].value;
        expect(value).toContain('max-height:35px');
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
