import { createElement } from 'lwc';
import TemplateTableDetails from 'c/templateTableDetails';
import getContentVersions from '@salesforce/apex/FooterClass.getContentVersions';
import saveDocumentTemplateSectionDetails from '@salesforce/apex/SaveDocumentTemplatesection.saveDocumentTemplateSectionDetails';
import deletetemplate from '@salesforce/apex/SaveDocumentTemplatesection.deletetemplate';
import gettemplatesectiondata from '@salesforce/apex/SaveDocumentTemplatesection.gettemplatesectiondata';
import getSObjectListFiltering from '@salesforce/apex/RelatedObjectsClass.getSObjectListFiltering';

// The runner's own ShowToastEvent stub drops the title and message; this one keeps them in `detail`.
jest.mock('lightning/platformShowToastEvent', () => ({
    ShowToastEvent: class extends CustomEvent {
        constructor(detail) {
            super('lightning__showtoast', { detail, bubbles: true, composed: true, cancelable: true });
        }
    }
}), { virtual: true });

// Every imperative Apex method the editor imports. getAllPopupMessages is a wire and is left to the runner's stub.
jest.mock('@salesforce/apex/FooterClass.getContentVersions', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/FooterClass.getSearchedContentVersions', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/SaveDocumentTemplatesection.saveDocumentTemplateSectionDetails', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/SaveDocumentTemplatesection.deletetemplate', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/SaveDocumentTemplatesection.gettemplatesectiondata', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/RelatedObjectsClass.getSObjectListFiltering', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/RelatedObjectsClass.createRuleCondition', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/RelatedObjectsClass.getExistingConditions', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/RelatedObjectsClass.handleTemplateRuleResetCondition', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });

// Microtasks only, so it also works while timers are faked.
const flush = async () => {
    for (let i = 0; i < 15; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
};

function mount(props = {}) {
    const element = createElement('c-template-table-details', { is: TemplateTableDetails });
    // The designer always passes a string for sectionrecordid ('<Type>NotSaved' for a new section).
    Object.assign(element, {
        showtabledetails: true,
        sectiontype: 'Table',
        rowcount: 2,
        sectionrecordid: 'TableNotSaved',
        documenttemplaterecordid: 'a00TEMPLATE',
        documenttemplaterecord: { Id: 'a00TEMPLATE' },
        ...props
    });
    document.body.appendChild(element);
    return element;
}

const button = (element, label) => [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.label === label);
// The Delete button has a title but no label.
const deleteButton = element => [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.title === 'Delete Section');
const nameInput = element => [...element.shadowRoot.querySelectorAll('lightning-input')].find(i => i.placeholder === 'Type Section Name Here...');

function setNative(element, selector, value) {
    const input = element.shadowRoot.querySelector(selector);
    input.value = String(value);
    input.dispatchEvent(new CustomEvent('change'));
}

function setName(element, name) {
    nameInput(element).dispatchEvent(new CustomEvent('change', { detail: { value: name } }));
}

function listen(element, names) {
    const seen = [];
    names.forEach(name => element.addEventListener(name, e => seen.push({ name, detail: e.detail })));
    return seen;
}

describe('c-template-table-details', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        getContentVersions.mockResolvedValue([]);
        getSObjectListFiltering.mockResolvedValue([]);
        deletetemplate.mockResolvedValue('Success');
        saveDocumentTemplateSectionDetails.mockResolvedValue({ Id: 'a02SECTION', Name: 'Prices' });
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

    it('mounts and requests the content versions once', async () => {
        mount();
        await flush();

        expect(getContentVersions).toHaveBeenCalledTimes(1);
        expect(console.error).not.toHaveBeenCalled();
    });

    // B1 (docs/assessment/lwc-code-quality-assessment.md): the "no data" branch read an undeclared `error`
    // variable, so a null result threw a ReferenceError that the catch block reported as a failure.
    it('handles an empty content-version result without raising an error', async () => {
        getContentVersions.mockResolvedValue(null);

        mount();
        await flush();

        expect(console.error).not.toHaveBeenCalled();
    });

    // B3: `disableButton` was declared twice (an @api field, then a plain field), which the LWC engine reports
    // as "Invalid observed disableButton field. Found a duplicate accessor" when the class is registered.
    it('registers its decorators without engine errors', () => {
        jest.isolateModules(() => {
            require('c/templateTableDetails');
        });

        expect(console.error).not.toHaveBeenCalled();
    });

    it('exposes disableButton and sets it when the template is activated', async () => {
        const element = mount();
        await flush();

        expect(element.disableButton).toBe(false);
        element.handleActivateTemplate(true, 'Account');

        expect(element.disableButton).toBe(true);
    });

    it('offers the row and column inputs and the Create Table button before a table exists', async () => {
        const element = mount();
        await flush();

        expect(element.shadowRoot.querySelector('input.rows')).not.toBeNull();
        expect(element.shadowRoot.querySelector('input.cols')).not.toBeNull();
        expect(button(element, 'Create Table')).toBeDefined();
        expect(element.shadowRoot.querySelector('table')).toBeNull();
    });

    it('creates a table with the requested number of body rows and columns', async () => {
        const element = mount();
        await flush();

        setNative(element, 'input.rows', 3);
        setNative(element, 'input.cols', 4);
        button(element, 'Create Table').click();
        await flush();

        expect(element.shadowRoot.querySelector('.tableMainClass')).not.toBeNull();
        expect(element.shadowRoot.querySelectorAll('tbody tr')).toHaveLength(3);
        expect(element.shadowRoot.querySelectorAll('thead th')).toHaveLength(4);
        expect(element.shadowRoot.querySelectorAll('tbody tr:first-child td')).toHaveLength(4);
    });

    it('refuses a table with no rows, or more than 20 rows or 10 columns, and shows an error', async () => {
        const element = mount();
        const toasts = [];
        element.addEventListener('lightning__showtoast', e => toasts.push(e.detail.message));
        await flush();

        setNative(element, 'input.rows', 0);
        button(element, 'Create Table').click();
        setNative(element, 'input.rows', 2);
        setNative(element, 'input.cols', 11);
        button(element, 'Create Table').click();
        await flush();

        expect(toasts).toEqual(['Number of Rows Should Be Atleast 1 and Atmost 20', 'Number of Columns Should Be Atleast 1 and Atmost 10']);
        expect(element.shadowRoot.querySelector('table')).toBeNull();
    });

    it('does not let the section be saved before a table has been created', async () => {
        const element = mount();
        const toasts = [];
        element.addEventListener('lightning__showtoast', e => toasts.push(e.detail.message));
        await flush();

        button(element, 'Update').click();
        await flush();

        expect(saveDocumentTemplateSectionDetails).not.toHaveBeenCalled();
        expect(toasts).toEqual(['Please Click on Create Table button before Saving/Updating Table Section']);
    });

    it('reports unsaved changes when the name is edited', async () => {
        const element = mount();
        const seen = listen(element, ['datasaved']);
        await flush();

        setName(element, 'Prices');

        expect(seen).toEqual([{ name: 'datasaved', detail: false }]);
    });

    it('saves a new table section: Apex gets the name, type, template, table HTML and settings; then toast and event', async () => {
        const element = mount({ rowcount: 2 });
        const seen = listen(element, ['savesectiondata', 'datasaved', 'lightning__showtoast']);
        await flush();
        setNative(element, 'input.rows', 3);
        setNative(element, 'input.cols', 2);
        button(element, 'Create Table').click();
        await flush();
        setName(element, 'Prices');

        button(element, 'Update').click();
        await flush();

        expect(saveDocumentTemplateSectionDetails).toHaveBeenCalledTimes(1);
        const record = saveDocumentTemplateSectionDetails.mock.calls[0][0].Recorddetails;
        expect(record).toMatchObject({ Name: 'Prices', DxCPQ__Type__c: 'Table', DxCPQ__Document_Template__c: 'a00TEMPLATE' });
        expect(record.DxCPQ__Section_Content__c).toContain('<table');
        expect(JSON.parse(record.DxCPQ__Section_Details__c)).toMatchObject({ headersIncluded: true });
        expect(seen.find(e => e.name === 'savesectiondata').detail).toEqual({ Id: 'a02SECTION', Name: 'Prices' });
        expect(seen.some(e => e.name === 'datasaved' && e.detail === true)).toBe(true);
        expect(seen.find(e => e.name === 'lightning__showtoast').detail).toMatchObject({ title: 'Success', message: 'Section "Prices" was Saved' });
    });

    // Suspected defect: handletablecreate does `this.rowcount = this.rownumber`, and rowcount is the @api value the
    // designer passes for the section's position, which the save then stores as DxCPQ__Sequence__c. If that is
    // right, a section in position 2 with a 3-row table is saved with sequence 3 (its row count).
    it('saves the section at its own position, not at the number of table rows', async () => {
        const element = mount({ rowcount: 2 });
        await flush();
        setNative(element, 'input.rows', 3);
        setNative(element, 'input.cols', 2);
        button(element, 'Create Table').click();
        await flush();
        setName(element, 'Prices');

        button(element, 'Update').click();
        await flush();

        expect(saveDocumentTemplateSectionDetails.mock.calls[0][0].Recorddetails.DxCPQ__Sequence__c).toBe(2);
    });

    // Same defect through the edit path: loading a saved section calls handletablecreate too, so saving it again
    // would store its row count (2) in place of its position (4).
    it('keeps the position of a loaded section when it is saved again', async () => {
        gettemplatesectiondata.mockResolvedValue({
            Name: 'Prices', DxCPQ__Document_Template__c: 'a00TEMPLATE', DxCPQ__Sequence__c: 4, DxCPQ__Type__c: 'Table',
            DxCPQ__Section_Visibility_Rule__c: null, DxCPQ__Resized_Images_Data__c: '',
            DxCPQ__Section_Details__c: JSON.stringify({
                rownumber: 2, colnumber: 3, serialNumberColumn: false, headersIncluded: true, colWidthChanged: false,
                headerFont: '#000000', bodyFont: '#000000', headbackground: '#ffffff', bodybackground: '#ffffff',
                fontsize: '12px', fontfamily: 'Verdana', borderstyle: '', bordercolor: '', newPage: false, sectionInfo: []
            })
        });
        const element = mount({ sectionrecordid: 'a02SECTION', rowcount: 4 });
        await flush();
        element.loadsectionsectionvaluesforedit('a02SECTION');
        await flush();
        jest.runOnlyPendingTimers();
        await flush();

        button(element, 'Update').click();
        await flush();

        expect(saveDocumentTemplateSectionDetails.mock.calls[0][0].Recorddetails).toMatchObject({ Id: 'a02SECTION', DxCPQ__Sequence__c: 4 });
    });

    it('deletes a saved section through Apex and then tells the parent', async () => {
        const element = mount({ sectionrecordid: 'a02SECTION' });
        const seen = listen(element, ['deletesectiondata']);
        await flush();

        deleteButton(element).click();
        await flush();

        expect(deletetemplate).toHaveBeenCalledWith({ secidtobedeleted: 'a02SECTION', doctemplateid: 'a00TEMPLATE' });
        expect(seen).toEqual([{ name: 'deletesectiondata', detail: 'a02SECTION' }]);
    });

    it('removes an unsaved section without calling Apex', async () => {
        const element = mount();
        const seen = listen(element, ['deletesectiondata']);
        await flush();

        deleteButton(element).click();
        await flush();

        expect(deletetemplate).not.toHaveBeenCalled();
        expect(seen).toEqual([{ name: 'deletesectiondata', detail: 'TableNotSaved' }]);
    });

    it('activation disables Create Table and Update, and deactivation re-enables them', async () => {
        const element = mount();
        await flush();

        element.handleActivateTemplate(true, 'Account');
        await flush();
        expect(button(element, 'Create Table').disabled).toBe(true);
        expect(button(element, 'Update').disabled).toBe(true);

        element.handleActivateTemplate(false, 'Account');
        await flush();
        expect(button(element, 'Create Table').disabled).toBe(false);
        expect(button(element, 'Update').disabled).toBe(false);
    });

    it('loading a saved section shows its table with its content and settings', async () => {
        gettemplatesectiondata.mockResolvedValue({
            Name: 'Prices', DxCPQ__Document_Template__c: 'a00TEMPLATE', DxCPQ__Sequence__c: 2, DxCPQ__Type__c: 'Table',
            DxCPQ__Section_Visibility_Rule__c: null, DxCPQ__Resized_Images_Data__c: '',
            DxCPQ__Section_Details__c: JSON.stringify({
                rownumber: 2, colnumber: 3, serialNumberColumn: false, headersIncluded: true, colWidthChanged: false,
                headerFont: '#000000', bodyFont: '#000000', headbackground: '#ffffff', bodybackground: '#ffffff',
                fontsize: '12px', fontfamily: 'Verdana', borderstyle: '', bordercolor: '', newPage: false, sectionInfo: []
            })
        });
        const element = mount({ sectionrecordid: 'a02SECTION' });
        await flush();

        element.loadsectionsectionvaluesforedit('a02SECTION');
        await flush();
        jest.runOnlyPendingTimers();
        await flush();

        expect(gettemplatesectiondata).toHaveBeenCalledWith({ editrecordid: 'a02SECTION' });
        expect(element.shadowRoot.querySelectorAll('tbody tr')).toHaveLength(2);
        expect(element.shadowRoot.querySelectorAll('thead th')).toHaveLength(3);
        expect(nameInput(element).value).toBe('Prices');
    });

    // D7: Col Swap reorders the columns in the editor and the saved HTML, but the editor rebuilt the table in
    // the default order on reopen, so the next Save silently undid the swap in the output.
    it('saves the column order and shows swapped columns in that order when the section is reopened', async () => {
        gettemplatesectiondata.mockResolvedValue({
            Name: 'Prices', DxCPQ__Document_Template__c: 'a00TEMPLATE', DxCPQ__Sequence__c: 2, DxCPQ__Type__c: 'Table',
            DxCPQ__Section_Visibility_Rule__c: null, DxCPQ__Resized_Images_Data__c: '',
            DxCPQ__Section_Details__c: JSON.stringify({
                rownumber: 2, colnumber: 3, serialNumberColumn: false, headersIncluded: true, colWidthChanged: false,
                headerFont: '#000000', bodyFont: '#000000', headbackground: '#ffffff', bodybackground: '#ffffff',
                fontsize: '12px', fontfamily: 'Verdana', borderstyle: '', bordercolor: '', newPage: false,
                columnOrder: ['Header 2', 'Header 1', 'Header 3'],
                sectionInfo: [
                    { 'data-id': 'Header 1', Content: '<p>H1</p>' },
                    { 'data-id': 'Header 2', Content: '<p>H2</p>' },
                    { 'data-id': 'Header 3', Content: '<p>H3</p>' },
                    { 'data-id': 'row1col1div', Content: '<p>A1</p>' },
                    { 'data-id': 'row1col2div', Content: '<p>B1</p>' }
                ]
            })
        });
        const element = mount({ sectionrecordid: 'a02SECTION' });
        await flush();
        element.loadsectionsectionvaluesforedit('a02SECTION');
        await flush();
        jest.runOnlyPendingTimers();
        await flush();

        const headerOrder = [...element.shadowRoot.querySelectorAll('thead lightning-input-rich-text')].map(r => r.dataset.head);
        const firstRowOrder = [...element.shadowRoot.querySelectorAll('tbody tr:first-child lightning-input-rich-text')].map(r => r.dataset.id);
        expect(headerOrder).toEqual(['Header 2', 'Header 1', 'Header 3']);
        expect(firstRowOrder).toEqual(['row1col2', 'row1col1', 'row1col3']);
        expect([...element.shadowRoot.querySelectorAll('thead lightning-input-rich-text')].map(r => r.value)).toEqual(['<p>H2</p>', '<p>H1</p>', '<p>H3</p>']);

        button(element, 'Update').click();
        await flush();
        const saved = JSON.parse(saveDocumentTemplateSectionDetails.mock.calls[0][0].Recorddetails.DxCPQ__Section_Details__c);
        expect(saved.columnOrder).toEqual(['Header 2', 'Header 1', 'Header 3']);
    });

    // D1: the table re-applies the section-wide header/body colours every time it renders, which painted over
    // the colour a user had given to one single cell.
    it('keeps the colour of a single cell when the table renders again', async () => {
        gettemplatesectiondata.mockResolvedValue({
            Name: 'Prices', DxCPQ__Document_Template__c: 'a00TEMPLATE', DxCPQ__Sequence__c: 2, DxCPQ__Type__c: 'Table',
            DxCPQ__Section_Visibility_Rule__c: null, DxCPQ__Resized_Images_Data__c: '',
            DxCPQ__Section_Details__c: JSON.stringify({
                rownumber: 2, colnumber: 3, serialNumberColumn: false, headersIncluded: true, colWidthChanged: false,
                headerFont: '#000000', bodyFont: '#000000', headbackground: '#ffffff', bodybackground: '#ffffff',
                fontsize: '12px', fontfamily: 'Verdana', borderstyle: '', bordercolor: '', newPage: false,
                sectionInfo: [
                    { 'data-id': 'Header 1', Content: '<p>H1</p>', backgroundColor: 'rgb(255, 0, 0)' },
                    { 'data-id': 'Header 2', Content: '<p>H2</p>' },
                    { 'data-id': 'row1col1div', Content: '<p>A1</p>', backgroundColor: 'rgb(0, 128, 0)' },
                    { 'data-id': 'row1col2div', Content: '<p>B1</p>' }
                ]
            })
        });
        const element = mount({ sectionrecordid: 'a02SECTION' });
        await flush();
        element.loadsectionsectionvaluesforedit('a02SECTION');
        await flush();
        jest.runOnlyPendingTimers();
        await flush();

        // Force another render of the table.
        const headersBox = () => [...element.shadowRoot.querySelectorAll('lightning-input')].find(i => i.title === 'Include Header');
        headersBox().checked = true;
        headersBox().click();
        await flush();
        jest.runOnlyPendingTimers();
        await flush();

        const headerCells = element.shadowRoot.querySelectorAll('thead th');
        const bodyCells = element.shadowRoot.querySelectorAll('tbody tr:first-child td');
        const colourOf = cells => [...cells].map(c => c.style.backgroundColor);
        expect(colourOf(headerCells)[0]).toBe('rgb(255, 0, 0)');
        expect(colourOf(headerCells)[1]).toBe('rgb(255, 255, 255)');
        expect(colourOf(bodyCells)[0]).toBe('rgb(0, 128, 0)');
        expect(colourOf(bodyCells)[1]).toBe('rgb(255, 255, 255)');
    });

    // D10: the font family was applied to the table only when the dropdown was changed, so a reopened section
    // showed its saved font in the dropdown but the table (and the next Save) went back to Verdana.
    it('shows the saved font family on the table when the section is reopened', async () => {
        gettemplatesectiondata.mockResolvedValue({
            Name: 'Prices', DxCPQ__Document_Template__c: 'a00TEMPLATE', DxCPQ__Sequence__c: 2, DxCPQ__Type__c: 'Table',
            DxCPQ__Section_Visibility_Rule__c: null, DxCPQ__Resized_Images_Data__c: '',
            DxCPQ__Section_Details__c: JSON.stringify({
                rownumber: 2, colnumber: 3, serialNumberColumn: false, headersIncluded: true, colWidthChanged: false,
                headerFont: '#000000', bodyFont: '#000000', headbackground: '#ffffff', bodybackground: '#ffffff',
                fontsize: '12px', fontfamily: 'serif', borderstyle: '', bordercolor: '', newPage: false, sectionInfo: []
            })
        });
        const element = mount({ sectionrecordid: 'a02SECTION' });
        await flush();
        element.loadsectionsectionvaluesforedit('a02SECTION');
        await flush();
        jest.runOnlyPendingTimers();
        await flush();

        expect(element.shadowRoot.querySelector('.mytable').style.fontFamily).toBe('serif');

        button(element, 'Update').click();
        await flush();
        const saved = saveDocumentTemplateSectionDetails.mock.calls[0][0].Recorddetails;
        expect(saved.DxCPQ__Section_Content__c).toContain('font-family: serif');
    });

    // D11: the PDF engine only knows generic family names. "Verdana" and lowercase "courier" came out as Times in
    // the PDF, so each option now carries a fallback and sections saved with the old values are upgraded on load.
    it.each([
        ['Verdana', 'Verdana, sans-serif'],
        ['courier', 'courier, monospace']
    ])('upgrades the saved font family %s to a stack the PDF can render', async (saved, expected) => {
        gettemplatesectiondata.mockResolvedValue({
            Name: 'Prices', DxCPQ__Document_Template__c: 'a00TEMPLATE', DxCPQ__Sequence__c: 2, DxCPQ__Type__c: 'Table',
            DxCPQ__Section_Visibility_Rule__c: null, DxCPQ__Resized_Images_Data__c: '',
            DxCPQ__Section_Details__c: JSON.stringify({
                rownumber: 2, colnumber: 3, serialNumberColumn: false, headersIncluded: true, colWidthChanged: false,
                headerFont: '#000000', bodyFont: '#000000', headbackground: '#ffffff', bodybackground: '#ffffff',
                fontsize: '12px', fontfamily: saved, borderstyle: '', bordercolor: '', newPage: false, sectionInfo: []
            })
        });
        const element = mount({ sectionrecordid: 'a02SECTION' });
        await flush();
        element.loadsectionsectionvaluesforedit('a02SECTION');
        await flush();
        jest.runOnlyPendingTimers();
        await flush();

        expect(element.shadowRoot.querySelector('.mytable').style.fontFamily).toBe(expected);
        const familyBox = [...element.shadowRoot.querySelectorAll('lightning-combobox')].find(c => c.label === 'Font-Family');
        expect(familyBox.value).toBe(expected);
        expect(familyBox.options.map(o => o.value)).toEqual(['sans-serif', 'Verdana, sans-serif', 'serif', 'courier, monospace']);
    });

    // D3: unticking Headers removes the header row from the page and ticking it again builds a new, empty one.
    // The header text is still held in the section data, so it has to be put back.
    it('brings the header text back when Headers is unticked and ticked again', async () => {
        gettemplatesectiondata.mockResolvedValue({
            Name: 'Prices', DxCPQ__Document_Template__c: 'a00TEMPLATE', DxCPQ__Sequence__c: 2, DxCPQ__Type__c: 'Table',
            DxCPQ__Section_Visibility_Rule__c: null, DxCPQ__Resized_Images_Data__c: '',
            DxCPQ__Section_Details__c: JSON.stringify({
                rownumber: 2, colnumber: 3, serialNumberColumn: false, headersIncluded: true, colWidthChanged: false,
                headerFont: '#000000', bodyFont: '#000000', headbackground: '#ffffff', bodybackground: '#ffffff',
                fontsize: '12px', fontfamily: 'Verdana', borderstyle: '', bordercolor: '', newPage: false,
                sectionInfo: [
                    { 'data-id': 'Header 1', Content: '<p>H1</p>' },
                    { 'data-id': 'Header 2', Content: '<p>H2</p>' },
                    { 'data-id': 'Header 3', Content: '<p>H3</p>' }
                ]
            })
        });
        const element = mount({ sectionrecordid: 'a02SECTION' });
        await flush();
        element.loadsectionsectionvaluesforedit('a02SECTION');
        await flush();
        jest.runOnlyPendingTimers();
        await flush();

        const headersBox = () => [...element.shadowRoot.querySelectorAll('lightning-input')].find(i => i.title === 'Include Header');
        const headerValues = () => [...element.shadowRoot.querySelectorAll('thead lightning-input-rich-text')].map(r => r.value);
        expect(headerValues()).toEqual(['<p>H1</p>', '<p>H2</p>', '<p>H3</p>']);

        headersBox().checked = false;
        headersBox().click();
        await flush();
        jest.runOnlyPendingTimers();
        await flush();
        expect(element.shadowRoot.querySelectorAll('thead')).toHaveLength(0);

        headersBox().checked = true;
        headersBox().click();
        await flush();
        jest.runOnlyPendingTimers();
        await flush();

        expect(headerValues()).toEqual(['<p>H1</p>', '<p>H2</p>', '<p>H3</p>']);
    });
});
