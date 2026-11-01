import { createElement } from 'lwc';
import ImageResizeCMP from 'c/imageResizeCMP';
import getImageBase64 from '@salesforce/apex/ScreenshotController.getImageBase64';
import saveImageBase64 from '@salesforce/apex/ScreenshotController.saveImageBase64';

jest.mock('@salesforce/apex/ScreenshotController.getImageBase64', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });
jest.mock('@salesforce/apex/ScreenshotController.saveImageBase64', () => ({ __esModule: true, default: jest.fn() }), { virtual: true });

const flush = async () => {
    for (let i = 0; i < 25; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
};

// What the section editor hands over: an image whose full-size original is 800x400 and that is shown as a
// resized copy (068COPY) of 100x50.
const RESIZED = { id: 0, URL: '/sfc/servlet.shepherd/version/download/068ORIG', cvId: '068ORIG', rcvid: '068COPY', width: 800, height: 400, rwidth: 100, rheight: 50 };
const PLAIN = { id: 0, URL: '/sfc/servlet.shepherd/version/download/068PLAIN', cvId: '068PLAIN', width: 300, height: 150 };

function mount(images) {
    const element = createElement('c-image-resize-c-m-p', { is: ImageResizeCMP });
    element.images = images;
    document.body.appendChild(element);
    return element;
}

const input = (element, label) => [...element.shadowRoot.querySelectorAll('lightning-input')].find(i => i.label === label);
const button = (element, label) => [...element.shadowRoot.querySelectorAll('lightning-button')].find(b => b.label === label);
const type = (element, label, value) => {
    const field = input(element, label);
    field.value = value;
    field.dispatchEvent(new CustomEvent('change'));
};
const closeEvents = element => {
    const seen = [];
    element.addEventListener('closemodal', e => seen.push(e.detail));
    return seen;
};

describe('c-image-resize-c-m-p', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        getImageBase64.mockResolvedValue('AAAA');
        saveImageBase64.mockResolvedValue('068NEW');
        HTMLCanvasElement.prototype.getContext = () => ({ clearRect() {}, drawImage() {} });
        HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,AAAA';
        global.Image = class {
            set src(value) {
                this.currentSrc = value;
                Promise.resolve().then(() => this.onload && this.onload());
            }
        };
    });

    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });

    // The editor passes the copy that is in the text as `rcvid`; the dialog read `rCVID`, so an image the user left
    // alone lost its copy and fell back to the original (the text then showed the full-size file again).
    it('keeps the resized copy of an image the user did not touch', async () => {
        const element = mount([RESIZED]);
        await flush();
        const seen = closeEvents(element);

        button(element, 'Save').click();
        await flush();

        expect(seen).toHaveLength(1);
        expect(seen[0].process).toBe('Save');
        expect(seen[0].imagesJSON[0]).toMatchObject({ oCVID: '068ORIG', rCVID: '068COPY', rWidth: 100, rHeight: 50 });
    });

    it('saves a new copy for a new size and remembers the original it came from', async () => {
        const element = mount([PLAIN]);
        await flush();
        type(element, 'Width', '150');
        type(element, 'Height', '75');
        await flush();

        element.shadowRoot.querySelector('lightning-icon.modified-icon-tick').click();
        await flush();

        expect(saveImageBase64).toHaveBeenCalledTimes(1);
        expect(saveImageBase64.mock.calls[0][0]).toMatchObject({ originalCvId: '068PLAIN' });
    });

    it('goes back to the original file, without saving a new copy, when the size is set back to the original', async () => {
        const element = mount([RESIZED]);
        await flush();
        type(element, 'Width', '800');
        type(element, 'Height', '400');
        await flush();

        element.shadowRoot.querySelector('lightning-icon.modified-icon-tick').click();
        await flush();
        const seen = closeEvents(element);
        button(element, 'Save').click();
        await flush();

        expect(saveImageBase64).not.toHaveBeenCalled();
        expect(seen[0].imagesJSON[0].rCVID).toBe('068ORIG');
    });

    it('does not save again when the same new size is ticked twice', async () => {
        const element = mount([PLAIN]);
        await flush();
        type(element, 'Width', '150');
        type(element, 'Height', '75');
        await flush();
        const tick = () => element.shadowRoot.querySelector('lightning-icon.modified-icon-tick').click();

        tick();
        await flush();
        type(element, 'Width', '150');
        await flush();
        tick();
        await flush();

        expect(saveImageBase64).toHaveBeenCalledTimes(1);
    });

    it('does not report a width or height that is empty or not a number', async () => {
        const element = mount([PLAIN]);
        await flush();
        type(element, 'Width', '');
        await flush();

        const seen = closeEvents(element);
        button(element, 'Cancel').click();
        await flush();

        expect(Number.isNaN(seen[0].imagesJSON[0].rWidth)).toBe(false);
    });
});
