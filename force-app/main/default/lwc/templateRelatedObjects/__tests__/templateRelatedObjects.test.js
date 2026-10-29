describe('c-template-related-objects', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    // Load smoke test. B4 removed duplicate declarations of conditionsArr and listOfExistingConditions; the engine
    // does not report plain duplicates, so this passes before and after (the proof is ESLint no-dupe-class-members).
    it('registers its decorators without engine errors', () => {
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        jest.isolateModules(() => {
            require('c/templateRelatedObjects');
        });

        expect(errorSpy).not.toHaveBeenCalled();
    });
});
