// Paper sizes and orientation rules of the PDF generator widget (dxtemplateSelectorCmp), kept free of LWC code so they can be unit tested.
// The list must match the sizes DisplayPDFController accepts (any other value is replaced by A4 on the server).

export const PAGE_SIZE_OPTIONS = ['A4', 'A3', 'A5', 'B4', 'B5', 'Letter', 'Legal', 'Ledger'].map(size => ({ label: size, value: size }));

// The default size configured in the page builder: a known size (any casing, surrounding spaces ignored) or A4.
export function resolvePageSize(configured) {
    const wanted = String(configured == null ? '' : configured).trim().toLowerCase();
    const match = PAGE_SIZE_OPTIONS.find(o => o.value.toLowerCase() === wanted);
    return match ? match.value : 'A4';
}

// Only "Landscape" means landscape; anything else (including the "Potrait" typo of the help text) is Portrait, as on the server.
export function resolvePageOrientation(configured) {
    return String(configured == null ? '' : configured).trim().toLowerCase() === 'landscape' ? 'Landscape' : 'Portrait';
}
