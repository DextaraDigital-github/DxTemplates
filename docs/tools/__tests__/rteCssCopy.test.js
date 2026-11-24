// The direct PDF engine (Blob.toPdf) cannot fetch a stylesheet from a static resource, so the page inlines a plain-text copy of
// rte_tbl/rte_tbl1.css (static resource DxRteTableCss). The two files must stay identical: change both or neither.
const fs = require('fs');
const path = require('path');
// Lives here and not next to the resources: anything inside force-app/.../staticresources is packaged as a static resource.
const resources = path.join(__dirname, '..', '..', '..', 'force-app', 'main', 'default', 'staticresources');

describe('DxRteTableCss is a copy of rte_tbl/rte_tbl1.css', () => {
    const original = path.join(resources, 'rte_tbl', 'rte_tbl1.css');
    const copy = path.join(resources, 'DxRteTableCss.resource');

    it('exists next to the original', () => {
        expect(fs.existsSync(copy)).toBe(true);
    });

    it('has exactly the same text', () => {
        expect(fs.readFileSync(copy, 'utf8')).toBe(fs.readFileSync(original, 'utf8'));
    });

    it('is declared as text/css', () => {
        expect(fs.readFileSync(copy + '-meta.xml', 'utf8')).toContain('<contentType>text/css</contentType>');
    });
});
