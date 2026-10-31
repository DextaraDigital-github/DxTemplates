import { DEFAULT_FONT_FAMILY, COURIER_FONT_FAMILY, upgradeLegacyFontFamily, upgradeEditorFonts } from '../dxPdfFonts';

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

    // The rich text editor only accepts its own font names (courier, verdana, serif, sans-serif ...) and silently ignores
    // a stack such as "courier, monospace", so the text is written with the editor's name and converted when it is saved.
    describe('upgradeEditorFonts (rich text written by the editor, made printable for the PDF)', () => {
        it.each([
            ['<p><span style="font-family: courier;">A</span></p>', '<p><span style="font-family: courier, monospace;">A</span></p>'],
            ['<span style="font-family: verdana;">A</span>', '<span style="font-family: Verdana, sans-serif;">A</span>'],
            ['<span style="font-family:Courier">A</span>', '<span style="font-family:courier, monospace">A</span>'],
            ['<span style="color: red; font-family: courier; font-size: 10px;">A</span>', '<span style="color: red; font-family: courier, monospace; font-size: 10px;">A</span>']
        ])('converts %p', (saved, expected) => {
            expect(upgradeEditorFonts(saved)).toBe(expected);
        });

        it('leaves other fonts, stacks that are already printable and plain text alone', () => {
            const html = '<span style="font-family: serif;">A</span><span style="font-family: sans-serif;">B</span><span style="font-family: courier, monospace;">C</span> courier text';
            expect(upgradeEditorFonts(html)).toBe(html);
        });

        it('returns an empty value unchanged', () => {
            expect(upgradeEditorFonts('')).toBe('');
            expect(upgradeEditorFonts(undefined)).toBeUndefined();
        });
    });
});
