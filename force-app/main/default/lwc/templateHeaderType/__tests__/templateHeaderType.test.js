import { createElement } from 'lwc';
import TemplateHeaderType from 'c/templateHeaderType';
import getContentVersions from '@salesforce/apex/FooterClass.getContentVersions';

jest.mock('c/dxClipboard', () => ({ copyText: jest.fn() }));
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
    const element = createElement('c-template-header-type', { is: TemplateHeaderType });
    Object.assign(element, {
        indexvar: 0, editorcontent: '<p>Start </p>', objectName: 'Account', headerAlign: 'Left',
        documenttemplaterecord: { Id: 'a00TEMPLATE', DxCPQ__Related_To_Type__c: 'Account' }, ...props
    });
    document.body.appendChild(element);
    return element;
}

const richText = element => element.shadowRoot.querySelector('lightning-input-rich-text');
const toolbarButton = (element, label) => [...element.shadowRoot.querySelectorAll('lightning-rich-text-toolbar-button')].find(b => b.iconAlternativeText === label);
const fontOptions = element => [...element.shadowRoot.querySelectorAll('select[name="font"] option')].map(o => ({ label: o.textContent.trim(), value: o.value }));

function listen(element) {
    const seen = [];
    element.addEventListener('saverichtextheader', e => seen.push(e.detail));
    return seen;
}

describe('c-template-header-type', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
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

    it('shows the saved text and the alignment label of its column', async () => {
        const element = mount();
        await flush();

        expect(richText(element).value).toBe('<p>Start </p>');
        expect(element.shadowRoot.textContent).toContain('Left');
    });

    it('tells the header which column changed and what it now says', async () => {
        const element = mount({ indexvar: 2 });
        const seen = listen(element);
        await flush();

        richText(element).dispatchEvent(new CustomEvent('change', { detail: { value: '<p>New text</p>' } }));

        expect(seen).toHaveLength(1);
        expect(seen[0]).toMatchObject({ value: '<p>New text</p>', indexvar: 2 });
    });

    // The editor only accepts its own font names (it silently ignores "courier, monospace"), so the dropdown gives it
    // `courier` ...
    it('gives the editor the font name it accepts for Courier', async () => {
        const element = mount();
        await flush();

        expect(fontOptions(element).find(o => o.label === 'Courier').value).toBe('courier');
    });

    // ... and the PDF engine prints a lone `courier` in Times (same defect as Table D11, Context C-D1, Related Objects
    // R-D1), so the text goes to the header with the printable stack.
    it('sends Courier text with a font stack that the PDF can print', async () => {
        const element = mount();
        const seen = listen(element);
        await flush();

        richText(element).dispatchEvent(new CustomEvent('change', { detail: { value: '<p><span style="font-family: courier;">Page</span></p>' } }));

        expect(seen[0].value).toBe('<p><span style="font-family: courier, monospace;">Page</span></p>');
    });

    // Two spaces in a row collapse to one in the PDF unless they are saved as &nbsp;; the conversion was applied to a
    // local copy after the event had already been sent, so the saved text never had it.
    it('sends two spaces in a row as non-breaking spaces', async () => {
        const element = mount();
        const seen = listen(element);
        await flush();

        richText(element).dispatchEvent(new CustomEvent('change', { detail: { value: '<p>Page  1</p>' } }));

        expect(seen[0].value).toBe('<p>Page&nbsp;&nbsp;1</p>');
    });

    // Inserting a merge field changed the text in the editor but did not tell the header, so the field was lost
    // unless the user typed something afterwards.
    it('tells the header when a merge field is inserted', async () => {
        const element = mount();
        const seen = listen(element);
        await flush();
        toolbarButton(element, 'Add Merge Field').click();
        await flush();
        element.shadowRoot.querySelector('c-dx-lookup-fields-displaycmp').getMergeField = () => 'Name';

        [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.label === 'insert').click();
        await flush();

        expect(seen).toHaveLength(1);
        expect(seen[0].value).toBe('<p>Start </p>{!Account.Name}');
    });

    it('tells the header when a picture is chosen', async () => {
        const element = mount();
        const seen = listen(element);
        getContentVersions.emit([{ Id: '068IMAGE', Title: 'Logo' }]);
        await flush();
        toolbarButton(element, 'Add Image').click();
        await flush();

        element.shadowRoot.querySelector('div[data-id="068IMAGE"]').click();
        await flush();

        expect(seen).toHaveLength(1);
        expect(seen[0].value).toContain('<img src="/sfc/servlet.shepherd/version/download/068IMAGE"');
    });
});
