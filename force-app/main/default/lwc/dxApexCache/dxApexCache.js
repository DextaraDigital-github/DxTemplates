import getDomainUrlApex from '@salesforce/apex/PdfDisplay.getDomainUrl';
import getClassNamesApex from '@salesforce/apex/SaveDocumentTemplate.getClassNames';
import getFlowNamesApex from '@salesforce/apex/SaveDocumentTemplate.getFlowNames';
import getPDFLinksApex from '@salesforce/apex/ProductSetupCtrl.getPDFLinks';
import getAllUserLanguagesApex from '@salesforce/apex/LanguageTranslatorClass.getAllUserLanguages';

/**
 * Session-lifetime cache for read-only Apex calls whose results do not change while the page is open.
 * The first caller triggers the server call; later callers (including other components) reuse the same
 * promise. A failed call is not cached, so the next caller retries.
 * Object results are copied per caller so one component cannot mutate what another receives.
 */
const cache = new Map();

function once(key, apexCall) {
    if (!cache.has(key)) {
        cache.set(key, apexCall().catch(error => {
            cache.delete(key);
            throw error;
        }));
    }
    return cache.get(key);
}

function copyOf(value) {
    return value !== null && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value;
}

export const getDomainUrl = () => once('domainUrl', getDomainUrlApex);
export const getClassNames = () => once('classNames', getClassNamesApex).then(copyOf);
export const getFlowNames = () => once('flowNames', getFlowNamesApex).then(copyOf);
export const getPDFLinks = () => once('pdfLinks', getPDFLinksApex).then(copyOf);
export const getAllUserLanguages = () => once('userLanguages', getAllUserLanguagesApex).then(copyOf);
