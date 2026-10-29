/**
 * Copies text to the clipboard with a temporary, off-screen textarea and `document.execCommand('copy')`.
 * Used by the merge-field dialogs (content, header, footer) and the template export. Behaviour is unchanged
 * from the code this replaced; it was verified in the org that this approach works in the LWC sandbox.
 * @returns {boolean} the result of execCommand (true when the browser performed the copy)
 */
export function copyText(text) {
    const field = document.createElement('textarea');
    field.style = 'position:fixed;top:-5rem;height:1px;width:10px;';
    field.value = text;
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    return copied;
}
