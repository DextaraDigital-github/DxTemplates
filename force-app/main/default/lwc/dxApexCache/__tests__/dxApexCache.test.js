const APEX = {
    domain: '@salesforce/apex/PdfDisplay.getDomainUrl',
    classNames: '@salesforce/apex/SaveDocumentTemplate.getClassNames',
    flowNames: '@salesforce/apex/SaveDocumentTemplate.getFlowNames',
    pdfLinks: '@salesforce/apex/ProductSetupCtrl.getPDFLinks',
    languages: '@salesforce/apex/LanguageTranslatorClass.getAllUserLanguages'
};

// The module keeps a session-lifetime cache, so every test loads a fresh copy of it with fresh Apex mocks.
function load() {
    const apex = {};
    let cache;
    jest.isolateModules(() => {
        Object.entries(APEX).forEach(([key, path]) => {
            apex[key] = jest.fn();
            jest.doMock(path, () => ({ __esModule: true, default: apex[key] }), { virtual: true });
        });
        cache = require('../dxApexCache');
    });
    return { apex, cache };
}

describe('c-dx-apex-cache', () => {
    it('calls Apex once however many components ask, and shares the result', async () => {
        const { apex, cache } = load();
        apex.domain.mockResolvedValue('https://example.my.salesforce.com');

        const first = await cache.getDomainUrl();
        const second = await cache.getDomainUrl();

        expect(first).toBe('https://example.my.salesforce.com');
        expect(second).toBe(first);
        expect(apex.domain).toHaveBeenCalledTimes(1);
    });

    it('shares one in-flight request between callers that ask before the first one returns', async () => {
        const { apex, cache } = load();
        apex.classNames.mockResolvedValue({ A: 'Class A' });

        await Promise.all([cache.getClassNames(), cache.getClassNames(), cache.getClassNames()]);

        expect(apex.classNames).toHaveBeenCalledTimes(1);
    });

    it('does not cache a failed call, so the next caller retries', async () => {
        const { apex, cache } = load();
        apex.flowNames.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ F: 'Flow' });

        await expect(cache.getFlowNames()).rejects.toThrow('boom');
        await expect(cache.getFlowNames()).resolves.toEqual({ F: 'Flow' });
        expect(apex.flowNames).toHaveBeenCalledTimes(2);
    });

    it('gives each caller its own copy of object results', async () => {
        const { apex, cache } = load();
        apex.pdfLinks.mockResolvedValue([{ MasterLabel: 'Account', Link: 'a' }]);

        const first = await cache.getPDFLinks();
        first[0].MasterLabel = 'changed';
        first.push({ MasterLabel: 'extra' });
        const second = await cache.getPDFLinks();

        expect(second).toEqual([{ MasterLabel: 'Account', Link: 'a' }]);
    });

    it('keeps each lookup under its own key', async () => {
        const { apex, cache } = load();
        apex.domain.mockResolvedValue('d');
        apex.classNames.mockResolvedValue({ c: 'C' });
        apex.flowNames.mockResolvedValue({ f: 'F' });
        apex.pdfLinks.mockResolvedValue([{ p: 1 }]);
        apex.languages.mockResolvedValue([{ label: 'English', value: 'en_US' }]);

        expect(await cache.getDomainUrl()).toBe('d');
        expect(await cache.getClassNames()).toEqual({ c: 'C' });
        expect(await cache.getFlowNames()).toEqual({ f: 'F' });
        expect(await cache.getPDFLinks()).toEqual([{ p: 1 }]);
        expect(await cache.getAllUserLanguages()).toEqual([{ label: 'English', value: 'en_US' }]);
    });
});
