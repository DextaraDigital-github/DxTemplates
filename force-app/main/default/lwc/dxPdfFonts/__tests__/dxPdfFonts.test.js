import { DEFAULT_FONT_FAMILY, COURIER_FONT_FAMILY, upgradeLegacyFontFamily } from '../dxPdfFonts';

describe('dxPdfFonts', () => {
    it('uses font stacks that end in a generic name, which is what the PDF engine can render', () => {
        expect(DEFAULT_FONT_FAMILY).toBe('Verdana, sans-serif');
        expect(COURIER_FONT_FAMILY).toBe('courier, monospace');
    });

    it.each([
        ['Verdana', 'Verdana, sans-serif'],
        ['courier', 'courier, monospace'],
        [' Verdana ', 'Verdana, sans-serif']
    ])('upgrades the old single name %p to %p', (saved, expected) => {
        expect(upgradeLegacyFontFamily(saved)).toBe(expected);
    });

    it.each(['sans-serif', 'serif', 'Verdana, sans-serif', 'courier, monospace', 'Arial'])('leaves %p as it is', saved => {
        expect(upgradeLegacyFontFamily(saved)).toBe(saved);
    });

    it('returns an empty value unchanged', () => {
        expect(upgradeLegacyFontFamily('')).toBe('');
        expect(upgradeLegacyFontFamily(undefined)).toBeUndefined();
    });
});
