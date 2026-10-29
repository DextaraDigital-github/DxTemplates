/**
 * Refreshes the Lightning page that hosts DxTemplates: Lightning re-initialises the app and all its Apex
 * data is fetched again (the designer's Refresh button and the import wizard's Done button rely on this).
 *
 * The `eval` is deliberate. The platform compiler rejects `$A` in LWC source ("LWC1503: Do not use $A in LWC
 * code"), and Aura's global refresh event is the only call that re-initialises the page. Keep it in this one
 * place. `lightning/refresh` (RefreshEvent) is not a drop-in replacement: it only notifies handlers that a
 * component has registered, and does not re-create the components.
 */
export function refreshPage(delayMs = 100) {
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    setTimeout(() => {
        // eslint-disable-next-line no-eval
        eval("$A.get('e.force:refreshView').fire();");
    }, delayMs);
}
