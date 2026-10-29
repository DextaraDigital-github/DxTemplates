describe('c-template-content-details', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    // Load smoke test. B4 removed duplicate declarations of showimages, imagesfound and ruleCondition, but the LWC
    // engine does not report plain-versus-plain duplicates, so this passes before and after; the proof for B4 is
    // ESLint's no-dupe-class-members rule.
    it('registers its decorators without engine errors', () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        jest.isolateModules(() => {
            require('c/templateContentDetails');
        });

        expect(errorSpy).not.toHaveBeenCalled();
    });
});
