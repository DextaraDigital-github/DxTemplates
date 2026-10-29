import { createElement } from 'lwc';
import TemplateTableDetails from 'c/templateTableDetails';
import getContentVersions from '@salesforce/apex/FooterClass.getContentVersions';

jest.mock(
    '@salesforce/apex/FooterClass.getContentVersions',
    () => ({ __esModule: true, default: jest.fn() }),
    { virtual: true }
);

// eslint-disable-next-line @lwc/lwc/no-async-operation
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

function mount() {
    const element = createElement('c-template-table-details', { is: TemplateTableDetails });
    document.body.appendChild(element);
    return element;
}

describe('c-template-table-details', () => {
    let errorSpy;

    beforeEach(() => {
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    it('mounts and requests the content versions once', async () => {
        getContentVersions.mockResolvedValue([]);

        mount();
        await flushPromises();

        expect(getContentVersions).toHaveBeenCalledTimes(1);
        expect(errorSpy).not.toHaveBeenCalled();
    });

    // B1 (docs/assessment/lwc-code-quality-assessment.md): the "no data" branch read an undeclared `error`
    // variable, so a null result threw a ReferenceError that the catch block reported as a failure.
    it('handles an empty content-version result without raising an error', async () => {
        getContentVersions.mockResolvedValue(null);

        mount();
        await flushPromises();

        expect(errorSpy).not.toHaveBeenCalled();
    });

    // B3: `disableButton` was declared twice (an @api field, then a plain field), which the LWC engine reports
    // as "Invalid observed disableButton field. Found a duplicate accessor" when the class is registered.
    it('registers its decorators without engine errors', () => {
        jest.isolateModules(() => {
            require('c/templateTableDetails');
        });

        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('exposes disableButton and sets it when the template is activated', async () => {
        getContentVersions.mockResolvedValue([]);
        const element = mount();
        await flushPromises();

        expect(element.disableButton).toBe(false);
        element.handleActivateTemplate(true, 'Account');

        expect(element.disableButton).toBe(true);
    });
});
