/**
 * Font families that the PDF engine (iText / Flying Saucer behind the Visualforce page) can render.
 * It only knows generic names: a lone `Verdana` or lowercase `courier` is printed in Times, while a stack that
 * ends in a generic name works (`Verdana, sans-serif` gives Helvetica, `courier, monospace` gives Courier).
 * Measured on the Table section (docs/testing/table-ui-test-log.md, D11).
 */
export const DEFAULT_FONT_FAMILY = 'Verdana, sans-serif';
export const COURIER_FONT_FAMILY = 'courier, monospace';

const LEGACY_FONT_FAMILIES = { Verdana: DEFAULT_FONT_FAMILY, courier: COURIER_FONT_FAMILY };

/** Upgrades a font family saved by an older version to the stack the PDF can render; anything else is unchanged. */
export function upgradeLegacyFontFamily(value) {
    if (typeof value !== 'string') {
        return value;
    }
    return LEGACY_FONT_FAMILIES[value.trim()] || value;
}
