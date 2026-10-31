import { createElement } from 'lwc';
import TemplateContentDetails from 'c/templateContentDetails';
import { getDomainUrl } from 'c/dxApexCache';
import saveDocumentTemplateSectionDetails from '@salesforce/apex/SaveDocumentTemplatesection.saveDocumentTemplateSectionDetails';
import deletetemplate from '@salesforce/apex/SaveDocumentTemplatesection.deletetemplate';
import gettemplatesectiondata from '@salesforce/apex/SaveDocumentTemplatesection.gettemplatesectiondata';
import deleteContentVersions from '@salesforce/apex/ScreenshotController.deleteContentVersions';
import getSObjectListFiltering from '@salesforce/apex/RelatedObjectsClass.getSObjectListFiltering';

jest.mock('c/dxApexCache', () => ({ getDomainUrl: jest.fn() }));

// The runner's own ShowToastEvent stub drops the title and message; this one keeps them in `detail`.
jest.mock('lightning/platformShowToastEvent', () => ({
    ShowToastEvent: class extends CustomEvent {
        constructor(detail) {
            super('lightning__showtoast', { detail, bubbles: true, composed: true, cancelable: true });
        }
    }
}), { virtual: true });

// Every imperative Apex method the editor imports. getContentVersions is a wire in this component, so it is
// left to the runner's built-in wire stub.
jest.mock('@salesforce/apex/SaveDocumentTemplatesection.saveDocumentTemplateSectionDetails', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/SaveDocumentTemplatesection.ClauseBody', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/SaveDocumentTemplatesection.deletetemplate', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/SaveDocumentTemplatesection.gettemplatesectiondata', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/LogHandler.createLog', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/RelatedObjectsClass.getSObjectListFiltering', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/RelatedObjectsClass.createRuleCondition', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/RelatedObjectsClass.getExistingConditions', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/RelatedObjectsClass.handleTemplateRuleResetCondition', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/ScreenshotController.deleteContentVersions', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/FooterClass.getSearchedContentVersions', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });

// Microtasks only, so it also works while timers are faked.
const flush = async () => {
    for (let i = 0; i < 15; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
};

const SECTION = {
    Name: 'Intro',
    DxCPQ__Document_Template__c: 'a00TEMPLATE',
    DxCPQ__Sequence__c: 3,
    DxCPQ__Type__c: 'Context',
    DxCPQ__New_Page__c: false,
    DxCPQ__DisplaySectionName__c: false,
    DxCPQ__Section_Content__c: '<p>Hello {!Account.Name}</p>',
    DxCPQ__Section_Visibility_Rule__c: null,
    DxCPQ__Resized_Images_Data__c: ''
};

function mount(props = {}) {
    const element = createElement('c-template-content-details', { is: TemplateContentDetails });
    // The designer always passes a string for sectionrecordid ('<Type>NotSaved' for a new section).
    Object.assign(element, { showdetails: true, sectiontype: 'Context', rowcount: 3, sectionrecordid: 'ContextNotSaved', documenttemplaterecord: { Id: 'a00TEMPLATE' }, ...props });
    document.body.appendChild(element);
    return element;
}

const button = (element, label) => [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.label === label);
// The stub does not reflect `placeholder` as an attribute, so match on the property.
const nameInput = element => [...element.shadowRoot.querySelectorAll('lightning-input')].find(i => i.placeholder === 'Type Section Name Here...');

function listen(element, names) {
    const seen = [];
    names.forEach(name => element.addEventListener(name, e => seen.push({ name, detail: e.detail })));
    return seen;
}

describe('c-template-content-details', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        getDomainUrl.mockResolvedValue('https://example.my.salesforce.com');
        gettemplatesectiondata.mockResolvedValue({ ...SECTION });
        saveDocumentTemplateSectionDetails.mockResolvedValue({ Id: 'a02SECTION', Name: 'Intro' });
        deletetemplate.mockResolvedValue('Success');
        deleteContentVersions.mockResolvedValue(undefined);
        getSObjectListFiltering.mockResolvedValue([]);
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

    // Load smoke test. B4 removed duplicate declarations of showimages, imagesfound and ruleCondition, but the LWC
    // engine does not report plain-versus-plain duplicates, so this passes before and after; the proof for B4 is
    // ESLint's no-dupe-class-members rule.
    it('registers its decorators without engine errors', () => {
        jest.isolateModules(() => {
            require('c/templateContentDetails');
        });

        expect(console.error).not.toHaveBeenCalled();
    });

    it('shows the name field and the Save and Delete buttons when details are shown', async () => {
        const element = mount();
        await flush();

        expect(nameInput(element)).not.toBeNull();
        expect(button(element, 'Save')).toBeDefined();
        expect(button(element, 'Delete')).toBeDefined();
    });

    it('renders nothing while details are hidden', async () => {
        const element = mount({ showdetails: false });
        await flush();

        expect(element.shadowRoot.querySelector('lightning-button')).toBeNull();
    });

    it('asks Apex for the visibility-rule fields only when an object is already selected', async () => {
        mount();
        await flush();
        expect(getSObjectListFiltering).not.toHaveBeenCalled();

        mount({ selectedObjectName: 'Account' });
        await flush();
        expect(getSObjectListFiltering).toHaveBeenCalledWith({ selectedChildObjectLabel: 'Account' });
    });

    it('loads a saved section into the editor', async () => {
        const element = mount();
        element.loadsectionsectionvaluesforedit('a02SECTION');
        await flush();
        jest.runAllTimers();
        await flush();

        expect(gettemplatesectiondata).toHaveBeenCalledWith({ editrecordid: 'a02SECTION' });
        expect(nameInput(element).value).toBe('Intro');
        expect(element.shadowRoot.querySelector('lightning-input-rich-text').value).toBe('<p>Hello {!Account.Name}</p>');
    });

    it('saves the section, then reports success with a toast and the saved record', async () => {
        const element = mount();
        const seen = listen(element, ['savesectiondata', 'datasaved', 'lightning__showtoast']);
        element.loadsectionsectionvaluesforedit('a02SECTION');
        await flush();
        jest.runAllTimers();
        await flush();

        button(element, 'Save').click();
        await flush();

        expect(saveDocumentTemplateSectionDetails).toHaveBeenCalledTimes(1);
        expect(saveDocumentTemplateSectionDetails.mock.calls[0][0].Recorddetails).toMatchObject({
            Id: 'a02SECTION',
            Name: 'Intro',
            DxCPQ__Type__c: 'Context',
            DxCPQ__Sequence__c: 3,
            DxCPQ__Document_Template__c: 'a00TEMPLATE',
            DxCPQ__Section_Content__c: '<p>Hello {!Account.Name}</p>'
        });
        expect(seen.find(e => e.name === 'savesectiondata').detail).toEqual({ Id: 'a02SECTION', Name: 'Intro' });
        expect(seen.some(e => e.name === 'datasaved' && e.detail === true)).toBe(true);
        const toast = seen.find(e => e.name === 'lightning__showtoast').detail;
        expect(toast).toMatchObject({ title: 'Success', variant: 'success', message: 'Section "Intro" was Saved' });
    });

    async function openSavedSection(content, extra = {}) {
        gettemplatesectiondata.mockResolvedValue({ ...SECTION, DxCPQ__Section_Content__c: content, ...extra });
        const element = mount();
        element.loadsectionsectionvaluesforedit('a02SECTION');
        await flush();
        jest.runAllTimers();
        await flush();
        return element;
    }

    const savedContent = () => saveDocumentTemplateSectionDetails.mock.calls[0][0].Recorddetails.DxCPQ__Section_Content__c;

    // C-D1 (same defect as Table D11): the PDF engine prints `courier` (lowercase) in Times; only a generic name
    // such as monospace gives Courier. The editor itself only accepts its own font names and silently ignores
    // "courier, monospace" (measured in the browser, Header cycle), so the dropdown must give it `courier` and the
    // stack is written when the section is saved (see the next test).
    it('gives the editor the font name it accepts for Courier', async () => {
        const element = await openSavedSection('<p>Hi</p>');

        const courier = [...element.shadowRoot.querySelectorAll('select[name="font"] option')].find(o => o.textContent === 'Courier');
        expect(courier.value).toBe('courier');
    });

    it('upgrades the old lowercase courier font to a stack the PDF can render when the section is saved', async () => {
        const element = await openSavedSection('<p><span style="font-family: courier;">Hi</span></p>');

        button(element, 'Save').click();
        await flush();

        expect(savedContent()).toBe('<p><span style="font-family: courier, monospace;">Hi</span></p>');
    });

    // C-D3: a section with New Page ticked is stored wrapped in a page-break div and reopens with that div in the
    // editor, so every Update wrapped it once more (seen as three nested divs after three saves).
    it('keeps a single page-break wrapper however many times a New Page section is saved', async () => {
        const wrapped = '<div style="page-break-before : always;"><div style="page-break-before : always;"><p>Hi</p></div></div>';
        const element = await openSavedSection(wrapped, { DxCPQ__New_Page__c: true });

        button(element, 'Save').click();
        await flush();

        expect(savedContent()).toBe('<div style="page-break-before : always;"><p>Hi</p></div>');
    });

    // C-D4: one click on Insert in the merge field dialog added the field to the text twice.
    it('inserts a chosen merge field once', async () => {
        const element = await openSavedSection('<p>Hello </p>');
        const toolbarButton = [...element.shadowRoot.querySelectorAll('lightning-rich-text-toolbar-button')]
            .find(b => b.iconAlternativeText === 'Add Merge Field');
        toolbarButton.click();
        await flush();
        element.shadowRoot.querySelector('c-dx-lookup-fields-displaycmp').getMergeField = () => 'Name';
        button(element, 'insert').click();
        await flush();

        button(element, 'Save').click();
        await flush();

        expect(savedContent().match(/\.Name\}/g)).toHaveLength(1);
    });

    // C-D2: the custom CSS wrapper was written as <div style="...> without the closing quote.
    it('closes the style attribute of the custom section CSS wrapper', async () => {
        const element = await openSavedSection('<p>Hi</p>');
        element.shadowRoot.querySelector('lightning-button-icon[title="Custom Section CSS"]').click();
        await flush();
        const textarea = element.shadowRoot.querySelector('lightning-textarea');
        textarea.value = 'color: red;';
        textarea.dispatchEvent(new CustomEvent('change'));

        button(element, 'Save').click();
        await flush();

        expect(savedContent()).toBe('<div style="color: red;"><p>Hi</p></div>');
    });

    describe('Clause section', () => {
        const PAYMENT = { recordId: 'a00CLAUSE1', recordName: 'ZZ Payment Terms', recordObject: { DxCPQ__Body__c: '<p><b>Payment Terms</b></p>' } };
        const lookup = element => element.shadowRoot.querySelector('c-multi-lookup-component');
        const richText = element => element.shadowRoot.querySelector('lightning-input-rich-text');
        const pick = async (element, clause) => {
            lookup(element).dispatchEvent(new CustomEvent('singlepill', { detail: { selectedRecord: clause } }));
            await flush();
        };
        const mountClause = (props = {}) => mount({ showclausescreen: true, sectiontype: 'Clause', sectionrecordid: 'ClauseNotSaved', ...props });
        const saved = () => saveDocumentTemplateSectionDetails.mock.calls[0][0].Recorddetails;

        // The component starts with the filter " IsActive__c = true" for the lookup, and connectedCallback replaced it
        // with an undefined value, so the lookup offered inactive clauses too.
        it('offers only active clauses in the lookup', async () => {
            const element = mountClause();
            await flush();

            expect(lookup(element).whereClause).toBe(' IsActive__c = true');
        });

        it('fills the name and the text from the chosen clause', async () => {
            const element = mountClause();
            await flush();

            await pick(element, PAYMENT);

            expect(nameInput(element).value).toBe('ZZ Payment Terms');
            expect(richText(element).value).toBe('<p><b>Payment Terms</b></p>');
        });

        it('saves the chosen clause with the section, keeping the clause id as the text the server expects', async () => {
            const element = mountClause();
            await flush();
            await pick(element, PAYMENT);

            button(element, 'Save').click();
            await flush();

            expect(saved()).toMatchObject({
                Name: 'ZZ Payment Terms',
                DxCPQ__Type__c: 'Clause',
                DxCPQ__Document_Clause__c: '"a00CLAUSE1"',
                DxCPQ__Section_Content__c: '<p><b>Payment Terms</b></p>'
            });
        });

        it('refuses to save a Clause section without a clause, and says so', async () => {
            const element = mountClause();
            const seen = listen(element, ['lightning__showtoast']);
            await flush();
            nameInput(element).dispatchEvent(new CustomEvent('change', { detail: { value: 'My clause' } }));

            button(element, 'Save').click();
            await flush();

            expect(saveDocumentTemplateSectionDetails).not.toHaveBeenCalled();
            expect(seen[0].detail).toMatchObject({ title: 'Error', message: 'Please select a pre-defined Clause to save this section.' });
        });

        it('clears the name and the text when the clause is removed from the lookup', async () => {
            const element = mountClause();
            await flush();
            await pick(element, PAYMENT);

            lookup(element).dispatchEvent(new CustomEvent('removepill'));
            await flush();

            expect(nameInput(element).value).toBe('');
            expect(richText(element).value).toBe('');
        });

        // Removing the pill cleared the name and the text but not the clause id that Save checks, so a section with a
        // typed name and no text was saved against the clause that had just been removed.
        it('does not save against a clause that was removed from the lookup', async () => {
            const element = mountClause();
            const seen = listen(element, ['lightning__showtoast']);
            await flush();
            await pick(element, PAYMENT);
            lookup(element).dispatchEvent(new CustomEvent('removepill'));
            await flush();
            nameInput(element).dispatchEvent(new CustomEvent('change', { detail: { value: 'Typed after removal' } }));

            button(element, 'Save').click();
            await flush();

            expect(saveDocumentTemplateSectionDetails).not.toHaveBeenCalled();
            expect(seen[0].detail).toMatchObject({ title: 'Error', message: 'Please select a pre-defined Clause to save this section.' });
        });

        it('keeps the clause and the edited text when a saved Clause section is opened and saved again', async () => {
            gettemplatesectiondata.mockResolvedValue({
                ...SECTION, Name: 'ZZ Payment Terms', DxCPQ__Type__c: 'Clause',
                DxCPQ__Section_Content__c: '<p>Edited by hand</p>',
                DxCPQ__Document_Clause__c: 'a00CLAUSE1', DxCPQ__Document_Clause__r: { Name: 'ZZ Payment Terms' }
            });
            const element = mountClause();
            await flush();
            element.loadsectionsectionvaluesforedit('a02SECTION');
            await flush();
            jest.runAllTimers();
            await flush();

            button(element, 'Save').click();
            await flush();

            expect(saved()).toMatchObject({
                Id: 'a02SECTION',
                DxCPQ__Document_Clause__c: '"a00CLAUSE1"',
                DxCPQ__Section_Content__c: '<p>Edited by hand</p>'
            });
        });

        // Update was pressed after the first save, `newpage` had been reset to false, and the second save removed the
        // page break from a section that had New Page ticked.
        it('keeps New Page when a section is saved twice without being reopened', async () => {
            const element = mountClause();
            await flush();
            await pick(element, PAYMENT);
            const checkbox = element.shadowRoot.querySelector('lightning-input[data-id="newpage"]');
            checkbox.dispatchEvent(new CustomEvent('change', { detail: { checked: true } }));

            button(element, 'Save').click();
            await flush();
            button(element, 'Save').click();
            await flush();

            expect(saveDocumentTemplateSectionDetails).toHaveBeenCalledTimes(2);
            const second = saveDocumentTemplateSectionDetails.mock.calls[1][0].Recorddetails;
            expect(second.DxCPQ__New_Page__c).toBe(true);
            expect(second.DxCPQ__Section_Content__c).toBe('<div style="page-break-before : always;"><p><b>Payment Terms</b></p></div>');
        });
    });

    it('does not call Apex when the section has no name, and shows an error toast', async () => {
        const element = mount();
        const seen = listen(element, ['savesectiondata', 'lightning__showtoast']);
        await flush();

        button(element, 'Save').click();
        await flush();

        expect(saveDocumentTemplateSectionDetails).not.toHaveBeenCalled();
        expect(seen.some(e => e.name === 'savesectiondata')).toBe(false);
        expect(seen.find(e => e.name === 'lightning__showtoast').detail).toMatchObject({
            title: 'Error',
            message: 'Please enter the required details to save this section.'
        });
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
        const element = mount({ sectionrecordid: 'ContextNotSaved' });
        const seen = listen(element, ['deletesectiondata']);
        await flush();

        button(element, 'Delete').click();
        await flush();

        expect(deletetemplate).not.toHaveBeenCalled();
        expect(seen).toEqual([{ name: 'deletesectiondata', detail: 'ContextNotSaved' }]);
    });

    it('does not tell the parent about a delete that Apex did not confirm', async () => {
        deletetemplate.mockResolvedValue(null);
        const element = mount({ sectionrecordid: 'a02SECTION' });
        const seen = listen(element, ['deletesectiondata']);
        await flush();

        button(element, 'Delete').click();
        await flush();

        expect(seen).toEqual([]);
    });

    it('disables Save and Delete when the template is activated, and records the object', async () => {
        const element = mount();
        await flush();

        element.handleActivateTemplate(true, 'Account');
        await flush();

        expect(button(element, 'Save').disabled).toBe(true);
        expect(button(element, 'Delete').disabled).toBe(true);
        expect(getSObjectListFiltering).toHaveBeenCalledWith({ selectedChildObjectLabel: 'Account' });
    });

    it('re-enables the buttons when the template is deactivated', async () => {
        const element = mount();
        await flush();
        element.handleActivateTemplate(true, 'Account');
        await flush();

        element.handleActivateTemplate(false, 'Account');
        await flush();

        expect(button(element, 'Save').disabled).toBe(false);
        expect(button(element, 'Delete').disabled).toBe(false);
    });

    it('clears the editor and reports "saved" when the designer resets it', async () => {
        const element = mount();
        const seen = listen(element, ['datasaved']);
        element.loadsectionsectionvaluesforedit('a02SECTION');
        await flush();
        jest.runAllTimers();
        await flush();
        expect(nameInput(element).value).toBe('Intro');

        element.resetvaluesonchildcmp();
        await flush();
        jest.runAllTimers();

        expect(nameInput(element).value).toBe('');
        expect(seen.some(e => e.detail === true)).toBe(true);
    });
});
