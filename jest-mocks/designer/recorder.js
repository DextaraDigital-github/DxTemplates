// Shared by the stub child components: every call a parent makes on a child is recorded here, in order.
export const calls = [];
export const record = (child, method, args) => calls.push({ child, method, args });
export const reset = () => { calls.length = 0; };
