/* eslint-disable @lwc/lwc/no-document-query */
import { copyText } from '../dxClipboard';

describe('dxClipboard', () => {
    let seen;

    beforeEach(() => {
        seen = null;
        // jsdom does not implement execCommand; record what the field looked like at the moment of the copy.
        document.execCommand = jest.fn(command => {
            const field = document.querySelector('textarea');
            seen = {
                command,
                value: field && field.value,
                selected: field && field.selectionStart === 0 && field.selectionEnd === field.value.length
            };
            return true;
        });
    });

    afterEach(() => {
        delete document.execCommand;
    });

    it('selects the text in a temporary textarea and runs the browser copy command', () => {
        const result = copyText('{!Account.Name}');

        expect(document.execCommand).toHaveBeenCalledTimes(1);
        expect(seen).toEqual({ command: 'copy', value: '{!Account.Name}', selected: true });
        expect(result).toBe(true);
    });

    it('removes the temporary textarea afterwards', () => {
        copyText('anything');

        expect(document.querySelector('textarea')).toBeNull();
    });

    it('reports a failed copy and still cleans up', () => {
        document.execCommand = jest.fn(() => false);

        expect(copyText('x')).toBe(false);
        expect(document.querySelector('textarea')).toBeNull();
    });
});
