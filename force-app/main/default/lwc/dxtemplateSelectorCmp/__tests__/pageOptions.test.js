import { PAGE_SIZE_OPTIONS, resolvePageSize, resolvePageOrientation } from '../pageOptions';

// The widget offers every paper size the server (DisplayPDFController) accepts; before, only A4, A5 and Letter were offered.
describe('PAGE_SIZE_OPTIONS', () => {
    it('lists all paper sizes the server accepts, A4 first', () => {
        expect(PAGE_SIZE_OPTIONS.map(o => o.value)).toEqual(['A4', 'A3', 'A5', 'B4', 'B5', 'Letter', 'Legal', 'Ledger']);
    });
    it('uses the value as the label', () => {
        PAGE_SIZE_OPTIONS.forEach(o => expect(o.label).toBe(o.value));
    });
});

// Before: `x != '' || x != null` is always true, so an unset default became undefined and the combobox showed nothing.
describe('resolvePageSize', () => {
    it('keeps a known size', () => {
        expect(resolvePageSize('Legal')).toBe('Legal');
        expect(resolvePageSize('A3')).toBe('A3');
    });
    it('falls back to A4 when the default is unset, empty, blank or unknown', () => {
        [undefined, null, '', '   ', 'A7', 'foolscap'].forEach(v => expect(resolvePageSize(v)).toBe('A4'));
    });
    it('accepts the size typed in the page builder with other casing or spaces', () => {
        expect(resolvePageSize(' letter ')).toBe('Letter');
        expect(resolvePageSize('a5')).toBe('A5');
    });
});

describe('resolvePageOrientation', () => {
    it('keeps Landscape, in any casing', () => {
        expect(resolvePageOrientation('Landscape')).toBe('Landscape');
        expect(resolvePageOrientation('landscape')).toBe('Landscape');
    });
    it('treats anything else (including the "Potrait" typo from the help text) as Portrait', () => {
        [undefined, null, '', 'Potrait', 'Portrait', 'sideways'].forEach(v => expect(resolvePageOrientation(v)).toBe('Portrait'));
    });
});
