import { createElement } from 'lwc';
import DisplayRelatedObjectsData from 'c/displayRelatedObjectsData';
import getsectionData from '@salesforce/apex/DisplayRelatedObjects.getsectionData';

jest.mock('@salesforce/apex/DisplayRelatedObjects.getsectionData', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/LogHandler.createLog', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });

const flush = async () => {
    for (let i = 0; i < 15; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
};

// What DisplayRelatedObjects.getsectionData returns for a table grouped by stage with one record and a chart.
function sectionJson(overrides = {}) {
    return JSON.stringify({
        headers: ['Name', 'Amount'],
        rowWrapperList: [
            { type: 'Category', values: ['Prospecting'] },
            { type: 'Record', values: ['STRING', 'Deal 1', 'CURRENCY', 100] },
            { type: 'SubTotal', values: ['Empty', 100] },
            { type: 'Total', values: ['Empty', 100] }
        ],
        newPage: false, showSlNo: false, dateFormat: '564/', timeFormat: '124', numberFormat: '2', currencyFormat: '2',
        selGraphvalue: 'Amount', chartLabel: 'Chart', displayChart: true, chartNewPage: true, barChartColor: '#0077b6',
        headFontClr: '#000000', headBgClr: '#ffffff', headFontFam: 'Verdana, sans-serif', headFontSize: '10px',
        catFontClr: '#000000', catBgClr: '#ffffff', catFontFam: 'courier, monospace', catFontSize: '10px',
        ...overrides
    });
}

async function mount(json) {
    getsectionData.mockResolvedValue(json);
    const element = createElement('c-display-related-objects-data', { is: DisplayRelatedObjectsData });
    element.parentrecordid = '001ACCOUNT';
    element.templatesectionid = 'a01SECTION';
    document.body.appendChild(element);
    await flush();
    return element;
}

describe('c-display-related-objects-data', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // The chart is drawn in the browser and its text was printed in the PDF engine's default (Times) whatever font
    // the section uses; it follows the font of the table header now.
    it('draws the chart in the font of the table header', async () => {
        const element = await mount(sectionJson());

        const chart = element.shadowRoot.querySelector('table.page-break');
        expect(chart).not.toBeNull();
        expect(chart.getAttribute('style')).toContain('font-family: Verdana, sans-serif');
    });

    it('shows the chart bars in the order of the groups, with their share of the total', async () => {
        const element = await mount(sectionJson());

        const titles = [...element.shadowRoot.querySelectorAll('.itemtitle')].map(e => e.textContent.trim());
        const shares = [...element.shadowRoot.querySelectorAll('.itemvalueout')].map(e => e.textContent.trim());
        expect(titles).toEqual(['PROSPECTING']);
        expect(shares).toEqual(['100%']);
    });

    it('draws no chart when the section has none', async () => {
        const element = await mount(sectionJson({ displayChart: false }));

        expect(element.shadowRoot.querySelector('table.page-break')).toBeNull();
    });
});
