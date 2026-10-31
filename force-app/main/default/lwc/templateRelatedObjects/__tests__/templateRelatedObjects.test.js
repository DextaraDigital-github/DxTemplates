import { createElement } from 'lwc';
import TemplateRelatedObjects from 'c/templateRelatedObjects';
import getRelatedObjects from '@salesforce/apex/RelatedObjectsClass.getRelatedObjects';
import getFields from '@salesforce/apex/MergeFieldsClass.getFields';
import getGroupingValues from '@salesforce/apex/RelatedObjectsClass.getGroupingValues';
import getSObjectListFiltering from '@salesforce/apex/RelatedObjectsClass.getSObjectListFiltering';
import getExistingConditions from '@salesforce/apex/RelatedObjectsClass.getExistingConditions';
import gettemplatesectiondata from '@salesforce/apex/SaveDocumentTemplatesection.gettemplatesectiondata';
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

    // R-D6: the saved Sub Total was rebuilt on load for the pills (labels) but not for the save (values), so
    // reopening a section and saving it again wrote `subTotal: []` and the chart settings were lost on the next open.
    it('keeps the Sub Total fields when a saved section is opened and saved again', async () => {
        getRelatedObjects.mockResolvedValue({ Opportunity: 'AccountId' });
        getFields.mockResolvedValue([
            { name: 'Name', apiName: 'Name', dataType: 'STRING' },
            { name: 'Amount', apiName: 'Amount', dataType: 'CURRENCY' }
        ]);
        getGroupingValues.mockResolvedValue({});
        getSObjectListFiltering.mockResolvedValue([]);
        getExistingConditions.mockResolvedValue([]);
        gettemplatesectiondata.mockResolvedValue({
            Name: 'RO Opps', DxCPQ__Document_Template__c: 'a00TEMPLATE', DxCPQ__Sequence__c: 4, DxCPQ__Type__c: 'Related Objects',
            DxCPQ__Section_Visibility_Rule__c: null,
            DxCPQ__Section_Content__c: JSON.stringify({
                whereClause: '()', mainChildObject: 'Opportunity', childLookupfieldAPIname: 'AccountId', SerialNumber: false,
                subTotal: ['Amount'], newPage: false, displayChart: false, chartLabel: 'Chart', chartNewPage: true,
                tablelistValues: ['Name', 'Amount'], tablelistLabels: ['Name', 'Amount'], grouping: '',
                dateFormat: '564/', timeFormat: '124', numberFormat: '2', currencyFormat: '1',
                style: {
                    category: { fontcolor: '', backgroundColor: '', fontfamily: 'Verdana', fontsize: '10px' },
                    header: { fontcolor: '', backgroundColor: '', fontfamily: 'Verdana', fontsize: '10px' }
                },
                groupingCatVals: []
            })
        });
        saveDocumentTemplateSectionDetails.mockResolvedValue({ Id: 'a02SECTION', Name: 'RO Opps' });
        const element = mount({ sectionrecordid: 'a02SECTION', selectedObjectName: 'Account' });
        await flush();

        element.loadsectionsectionvaluesforedit('a02SECTION');
        await flush();
        jest.advanceTimersByTime(1100);
        await flush();
        button(element, 'Save').click();
        await flush();

        expect(saveDocumentTemplateSectionDetails).toHaveBeenCalledTimes(1);
        const saved = JSON.parse(saveDocumentTemplateSectionDetails.mock.calls[0][0].Recorddetails.DxCPQ__Section_Content__c);
        expect(saved.subTotal).toEqual(['Amount']);
    });

    // R-D7: same as R-D6 for a Sub Total field taken from a parent object (path "Account.NumberOfEmployees"):
    // its label was added once per field of the parent object and its value was never restored for the save.
    it('keeps a parent-object Sub Total field when a saved section is opened and saved again', async () => {
        getRelatedObjects.mockResolvedValue({ Opportunity: 'AccountId' });
        getFields.mockImplementation(({ selectedObject }) => Promise.resolve(selectedObject === 'Account'
            ? [
                { name: 'Account Name', apiName: 'Name', dataType: 'STRING' },
                { name: 'Employees', apiName: 'NumberOfEmployees', dataType: 'INTEGER' },
                { name: 'Annual Revenue', apiName: 'AnnualRevenue', dataType: 'CURRENCY' }
            ]
            : [
                { name: 'Name', apiName: 'Name', dataType: 'STRING' },
                { name: 'Account ID', apiName: 'AccountId', dataType: 'REFERENCE', relationshipName: 'Account', sObjectName: 'Account' }
            ]));
        getGroupingValues.mockResolvedValue({});
        getSObjectListFiltering.mockResolvedValue([]);
        getExistingConditions.mockResolvedValue([]);
        gettemplatesectiondata.mockResolvedValue({
            Name: 'RO Parent', DxCPQ__Document_Template__c: 'a00TEMPLATE', DxCPQ__Sequence__c: 4, DxCPQ__Type__c: 'Related Objects',
            DxCPQ__Section_Visibility_Rule__c: null,
            DxCPQ__Section_Content__c: JSON.stringify({
                whereClause: '()', mainChildObject: 'Opportunity', childLookupfieldAPIname: 'AccountId', SerialNumber: false,
                subTotal: ['Account.NumberOfEmployees'], newPage: false, displayChart: false, chartLabel: 'Chart', chartNewPage: true,
                tablelistValues: ['Name', 'Account.NumberOfEmployees'], tablelistLabels: ['Name', 'Account.Employees'], grouping: '',
                dateFormat: '564/', timeFormat: '124', numberFormat: '2', currencyFormat: '1',
                style: {
                    category: { fontcolor: '', backgroundColor: '', fontfamily: 'Verdana', fontsize: '10px' },
                    header: { fontcolor: '', backgroundColor: '', fontfamily: 'Verdana', fontsize: '10px' }
                },
                groupingCatVals: []
            })
        });
        saveDocumentTemplateSectionDetails.mockResolvedValue({ Id: 'a02SECTION', Name: 'RO Parent' });
        const element = mount({ sectionrecordid: 'a02SECTION', selectedObjectName: 'Account' });
        await flush();

        element.loadsectionsectionvaluesforedit('a02SECTION');
        await flush();
        jest.advanceTimersByTime(1100);
        await flush();
        button(element, 'Save').click();
        await flush();

        expect(saveDocumentTemplateSectionDetails).toHaveBeenCalledTimes(1);
        const saved = JSON.parse(saveDocumentTemplateSectionDetails.mock.calls[0][0].Recorddetails.DxCPQ__Section_Content__c);
        expect(saved.tablelistValues).toEqual(['Name', 'Account.NumberOfEmployees']);
        expect(saved.subTotal).toEqual(['Account.NumberOfEmployees']);
    });

    describe('opening a saved section', () => {
        const oppFields = [
            { name: 'Name', apiName: 'Name', dataType: 'STRING' },
            { name: 'Amount', apiName: 'Amount', dataType: 'CURRENCY' },
            { name: 'Quantity', apiName: 'TotalOpportunityQuantity', dataType: 'DOUBLE' },
            { name: 'Probability (%)', apiName: 'Probability', dataType: 'PERCENT' },
            { name: 'Stage', apiName: 'StageName', dataType: 'PICKLIST' },
            { name: 'Account ID>', apiName: 'AccountId', dataType: 'REFERENCE', relationshipName: 'Account', sObjectName: 'Account' }
        ];
        const accountFields = [
            { name: 'Account Name', apiName: 'Name', dataType: 'STRING' },
            { name: 'Employees', apiName: 'NumberOfEmployees', dataType: 'INTEGER' },
            { name: 'Annual Revenue', apiName: 'AnnualRevenue', dataType: 'CURRENCY' }
        ];

        function savedContent(overrides = {}) {
            return JSON.stringify({
                whereClause: '()', mainChildObject: 'Opportunity', childLookupfieldAPIname: 'AccountId', SerialNumber: false,
                subTotal: [], newPage: false, displayChart: false, chartLabel: 'Chart', chartNewPage: true,
                tablelistValues: ['Name', 'Amount'], tablelistLabels: ['Name', 'Amount'], grouping: '',
                dateFormat: '564/', timeFormat: '124', numberFormat: '2', currencyFormat: '2',
                style: {
                    category: { fontcolor: '', backgroundColor: '', fontfamily: 'Verdana, sans-serif', fontsize: '10px' },
                    header: { fontcolor: '', backgroundColor: '', fontfamily: 'Verdana, sans-serif', fontsize: '10px' }
                },
                groupingCatVals: [],
                ...overrides
            });
        }

        // `opportunityFields` can be a function returning a promise, to make the field list arrive late.
        async function openSaved(overrides, opportunityFields = () => Promise.resolve(oppFields)) {
            getRelatedObjects.mockResolvedValue({ Opportunity: 'AccountId' });
            getFields.mockImplementation(({ selectedObject }) => (selectedObject === 'Account' ? Promise.resolve(accountFields) : opportunityFields()));
            getGroupingValues.mockResolvedValue({ stagename: [{ label: 'Prospecting', value: 'Prospecting' }] });
            getSObjectListFiltering.mockResolvedValue([]);
            getExistingConditions.mockResolvedValue([]);
            gettemplatesectiondata.mockResolvedValue({
                Name: 'RO Saved', DxCPQ__Document_Template__c: 'a00TEMPLATE', DxCPQ__Sequence__c: 4, DxCPQ__Type__c: 'Related Objects',
                DxCPQ__Section_Visibility_Rule__c: null,
                DxCPQ__Section_Content__c: savedContent(overrides)
            });
            saveDocumentTemplateSectionDetails.mockResolvedValue({ Id: 'a02SECTION', Name: 'RO Saved' });
            const element = mount({ sectionrecordid: 'a02SECTION', selectedObjectName: 'Account' });
            await flush();
            element.loadsectionsectionvaluesforedit('a02SECTION');
            await flush();
            return element;
        }

        const settle = async () => {
            jest.advanceTimersByTime(2100);
            await flush();
        };
        const savedJson = () => JSON.parse(saveDocumentTemplateSectionDetails.mock.calls[0][0].Recorddetails.DxCPQ__Section_Content__c);
        const combo = (element, name) => [...element.shadowRoot.querySelectorAll('lightning-combobox')].find(c => c.name === name);
        const chosenLabels = element => [...element.shadowRoot.querySelectorAll('select[name="field"] option')].map(o => o.textContent.trim());

        // U-R14: the field list was read after a fixed one second; when the org answered later (cold org after a
        // login) that timer threw, the chosen-fields box stayed empty and Save refused with "Select Object & Fields".
        it('loads the chosen fields even when the field list arrives late', async () => {
            let release;
            const late = new Promise(resolve => { release = () => resolve(oppFields); });
            const element = await openSaved({ subTotal: ['Amount'] }, () => late);

            jest.advanceTimersByTime(3000);
            await flush();
            release();
            await flush();
            await settle();
            button(element, 'Save').click();
            await flush();

            expect(saveDocumentTemplateSectionDetails).toHaveBeenCalledTimes(1);
            expect(savedJson().tablelistValues).toEqual(['Name', 'Amount']);
            expect(savedJson().subTotal).toEqual(['Amount']);
        });

        // U-R9: the font dropdown always showed its first entry; it must show the font the section uses.
        it('shows the saved font in the font dropdown', async () => {
            const element = await openSaved({
                style: {
                    category: { fontcolor: '', backgroundColor: '', fontfamily: 'courier, monospace', fontsize: '10px' },
                    header: { fontcolor: '', backgroundColor: '', fontfamily: 'courier, monospace', fontsize: '10px' }
                }
            });
            await settle();

            const selected = [...element.shadowRoot.querySelectorAll('select[name="font-family"] option')].filter(o => o.selected);
            expect(selected.map(o => o.textContent.trim())).toEqual(['Courier']);
        });

        // U-R13: the Sub Total list kept offering a field that was already chosen.
        it('does not offer an already chosen Sub Total field again', async () => {
            const element = await openSaved({
                tablelistValues: ['Name', 'Amount', 'TotalOpportunityQuantity'], tablelistLabels: ['Name', 'Amount', 'Quantity'], subTotal: ['Amount']
            });
            await settle();

            const options = combo(element, 'select fields for sub total').options;
            expect(options.map(o => o.label)).toEqual(['Quantity']);
        });

        // U-R13: Integer and Percent fields could not be totalled.
        it('offers Integer and Percent fields as Sub Total fields', async () => {
            const element = await openSaved({
                tablelistValues: ['Name', 'Amount', 'Probability', 'Account.NumberOfEmployees'],
                tablelistLabels: ['Name', 'Amount', 'Probability (%)', 'Account.Employees']
            });
            await settle();

            const options = combo(element, 'select fields for sub total').options;
            expect(options.map(o => o.value).sort()).toEqual(['Account.NumberOfEmployees', 'Amount', 'Probability']);
        });

        // The chosen fields come back in the order they were saved, also when one of them comes from a parent object
        // (that one is read with a second Apex call and used to be appended whenever the call returned).
        it('keeps the saved order of the chosen fields when a parent field sits in the middle', async () => {
            const element = await openSaved({
                tablelistValues: ['Name', 'Account.NumberOfEmployees', 'Amount'], tablelistLabels: ['Name', 'Account.Employees', 'Amount']
            });
            await settle();

            expect(chosenLabels(element)).toEqual(['Name', 'Account ID.Employees', 'Amount']);
            button(element, 'Save').click();
            await flush();
            expect(savedJson().tablelistValues).toEqual(['Name', 'Account.NumberOfEmployees', 'Amount']);
        });

        // U-R2: the Category list showed raw lowercase API names.
        it('shows field labels in the Category list and keeps the API name as the value', async () => {
            const element = await openSaved({ grouping: 'stagename', groupingCatVals: [{ label: 'Prospecting', value: 'Prospecting' }] });
            await settle();

            const picker = element.shadowRoot.querySelector('[data-id="picklist"]');
            expect(picker.options).toEqual([expect.objectContaining({ label: 'Stage', value: 'stagename' })]);
        });
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
