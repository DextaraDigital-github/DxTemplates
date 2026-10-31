const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'templateDesignerCMP.html'), 'utf8');
const dialog = html.slice(html.indexOf('selecting Page properties'));

// A number field without `step` only accepts whole numbers: "2.5" is shown as "Your entry isn't a valid increment" and cannot
// be saved, although margins, paddings and line heights are often fractions.
describe('Page Properties dialog markup', () => {
    it('lets every number field take decimals', () => {
        const numberFields = dialog.match(/<lightning-input\b[^>]*type="number"[^>]*>/g);

        expect(numberFields.length).toBeGreaterThan(30);
        expect(numberFields.filter(tag => !/step=/.test(tag))).toEqual([]);
    });
});
