/**
 * Font families that the PDF engine (iText / Flying Saucer behind the Visualforce page) can render.
 * It only knows generic names: a lone `Verdana` or lowercase `courier` is printed in Times, while a stack that
 * ends in a generic name works (`Verdana, sans-serif` gives Helvetica, `courier, monospace` gives Courier).
 * Measured on the Table section (docs/testing/table-ui-test-log.md, D11).
 */
export const DEFAULT_FONT_FAMILY = 'Verdana, sans-serif';
export const COURIER_FONT_FAMILY = 'courier, monospace';

const LEGACY_FONT_FAMILIES = { Verdana: DEFAULT_FONT_FAMILY, courier: COURIER_FONT_FAMILY };

/**
 * The rich text editor (lightning-input-rich-text) only accepts its own font names (serif, sans-serif, courier, verdana,
 * tahoma, garamond); setFormat silently ignores anything else, e.g. "courier, monospace" (measured on the Header editor,
 * docs/testing/header-ui-test-log.md). The dropdowns therefore apply the editor's name, and the text is converted to a
 * printable stack when it is saved.
 */
const EDITOR_FONT_NAMES = { courier: COURIER_FONT_FAMILY, verdana: DEFAULT_FONT_FAMILY };

/** Turns `font-family: courier` and `font-family: verdana` written by the rich text editor into stacks the PDF can print. */
export function upgradeEditorFonts(html) {
    if (typeof html !== 'string') {
        return html;
    }
    return html.replace(/font-family:\s*(courier|verdana)\s*(?=[;"'])/gi, (match, name) => 'font-family:' + (/font-family:\s/i.test(match) ? ' ' : '') + EDITOR_FONT_NAMES[name.toLowerCase()]);
}

/** Upgrades a font family saved by an older version to the stack the PDF can render; anything else is unchanged. */
export function upgradeLegacyFontFamily(value) {
    if (typeof value !== 'string') {
        return value;
    }
    return LEGACY_FONT_FAMILIES[value.trim()] || value;
}
