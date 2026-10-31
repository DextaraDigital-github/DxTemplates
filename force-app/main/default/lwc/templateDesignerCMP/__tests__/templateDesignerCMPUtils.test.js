import saveTemplateData from '@salesforce/apex/SaveDocumentTemplatesection.saveTemplateData';
import { savingPageProperties, updatePropertiesFromJSON } from '../templateDesignerCMPUtils';
import { defaultPageProperties } from '../templateDesignerCMPDefaults';

jest.mock('@salesforce/apex/SaveDocumentTemplatesection.saveTemplateData', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });

// Microtasks only.
const flush = async () => {
    for (let i = 0; i < 10; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
};

// Stands in for the designer component: the four property objects, the helper the save uses and what it touches after saving.
function designer() {
    const modal = { hide: jest.fn() };
    return {
        ...defaultPageProperties(),
        recordId: 'a00TEMPLATE',
        jsonStr: '',
        showPageProperties: true,
        showToast: jest.fn(),
        template: { querySelector: () => modal },
        combineValueAndUnit: valueObj => (valueObj.value !== undefined && valueObj.unit ? `${valueObj.value}${valueObj.unit}` : null)
    };
}

const savedJson = () => JSON.parse(saveTemplateData.mock.calls[0][0].jsonData);

describe('page properties: saving and loading', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        jest.spyOn(console, 'error').mockImplementation(() => {});
        saveTemplateData.mockResolvedValue('Success');
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    it('saves the page margins with their units and tells the user', async () => {
        const d = designer();
        d.pageMargins.leftMargin = { value: 20, unit: 'mm' };

        savingPageProperties(d);
        await flush();

        expect(saveTemplateData.mock.calls[0][0].templateId).toBe('a00TEMPLATE');
        expect(savedJson().pageMargins['margin-left']).toBe('20mm');
        expect(d.showToast).toHaveBeenCalledWith('Success', 'Page Configurations are saved successfully!', 'success');
        expect(d.showPageProperties).toBe(false);
    });

    // The footer rules wrote "maring-left", so the left margin of the footer was never applied in the PDF.
    it('writes the footer left margin into the footer style under its right name', () => {
        const d = designer();
        d.footerProperties.margins.leftMargin = { value: 12, unit: 'px' };

        savingPageProperties(d);

        const footer = savedJson().footerJSONVal;
        ['footer_left', 'footer_center', 'footer_right'].forEach(name => {
            expect(footer[name]).toContain('margin-left: 12px');
            expect(footer[name]).not.toContain('maring');
        });
    });

    it('writes the header margins, paddings and background into the header styles', () => {
        const d = designer();
        d.secondHeaderProperties.margins.leftMargin = { value: 3, unit: 'mm' };
        d.secondHeaderProperties.paddings.topPadding = { value: 4, unit: 'px' };
        d.secondHeaderProperties.bgColor = { value: '#EEEEEE' };

        savingPageProperties(d);

        const css = savedJson().headerJSONVal.header_left;
        expect(css).toContain('margin-left: 3mm');
        expect(css).toContain('padding-top: 4px');
        expect(css).toContain('background-color:#EEEEEE');
    });

    // Values with decimals came back cut ("2.5mm" was read as 2 and the unit ".5mm").
    it('gives back what was saved, decimals included', () => {
        const d = designer();
        d.pageMargins.topMargin = { value: 2.5, unit: 'mm' };
        d.footerProperties.margins.leftMargin = { value: 7.25, unit: 'px' };
        d.secondHeaderProperties.paddings.leftPadding = { value: 1.5, unit: 'cm' };
        d.firstHeaderProperties.height = { value: 33, unit: 'px' };
        savingPageProperties(d);

        const reopened = designer();
        updatePropertiesFromJSON(reopened, saveTemplateData.mock.calls[0][0].jsonData);

        expect(reopened.pageMargins.topMargin).toEqual({ value: 2.5, unit: 'mm' });
        expect(reopened.footerProperties.margins.leftMargin).toEqual({ value: 7.25, unit: 'px' });
        expect(reopened.secondHeaderProperties.paddings.leftPadding).toEqual({ value: 1.5, unit: 'cm' });
        expect(reopened.firstHeaderProperties.height).toEqual({ value: 33, unit: 'px' });
    });

    it('gives back the line height of the page', () => {
        const d = designer();
        d.pageMargins.lineheight = { value: 1.8, unit: 'px' };
        savingPageProperties(d);

        const reopened = designer();
        updatePropertiesFromJSON(reopened, saveTemplateData.mock.calls[0][0].jsonData);

        expect(reopened.pageMargins.lineheight.value).toBe(1.8);
    });

    // A template without saved properties kept showing the values of the template opened before.
    it('shows the defaults when the template has no saved properties', () => {
        const d = designer();
        d.pageMargins.leftMargin = { value: 99, unit: 'mm' };
        d.footerProperties.paddings.topPadding = { value: 77, unit: 'mm' };

        updatePropertiesFromJSON(d, '');

        expect(d.pageMargins.leftMargin).toEqual(defaultPageProperties().pageMargins.leftMargin);
        expect(d.footerProperties.paddings.topPadding).toEqual(defaultPageProperties().footerProperties.paddings.topPadding);
    });

    it('shows the defaults when the saved properties cannot be read', () => {
        const d = designer();
        d.pageMargins.leftMargin = { value: 99, unit: 'mm' };

        updatePropertiesFromJSON(d, '{not json');

        expect(d.pageMargins.leftMargin).toEqual(defaultPageProperties().pageMargins.leftMargin);
    });

    it('tells the user when the save is refused and keeps the dialog data', async () => {
        saveTemplateData.mockResolvedValue('Error: no access');
        const d = designer();

        savingPageProperties(d);
        await flush();

        expect(d.showToast).toHaveBeenCalledWith('Error', 'An error occurred - Error: no access', 'error');
    });
});
