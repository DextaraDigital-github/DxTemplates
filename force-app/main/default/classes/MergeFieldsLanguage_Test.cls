@IsTest
private class MergeFieldsLanguage_Test {

    @IsTest
    static void usesTheLanguageOfTheRecordAsItIs() {
        System.assertEquals('en_US', MergeFieldsClass.resolveLocale('en_US'));
        System.assertEquals('fr', MergeFieldsClass.resolveLocale('fr'));
        System.assertEquals('zh_CN', MergeFieldsClass.resolveLocale(' zh_CN '));
    }

    @IsTest
    static void fallsBackToEnglishWithoutALanguageOnTheRecord() {
        System.assertEquals('en_US', MergeFieldsClass.resolveLocale(null));
        System.assertEquals('en_US', MergeFieldsClass.resolveLocale(''));
        System.assertEquals('en_US', MergeFieldsClass.resolveLocale('  '));
    }
}
