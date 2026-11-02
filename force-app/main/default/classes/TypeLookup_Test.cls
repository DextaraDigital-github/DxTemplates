@IsTest
private class TypeLookup_Test {
    @IsTest
    static void findsAClassByNameWithOrWithoutItsNamespace() {
        String own = [SELECT NamespacePrefix FROM ApexClass WHERE Name = 'PlaceholderTestHandler' LIMIT 1].NamespacePrefix;
        System.assertNotEquals(null, TypeLookup.forName('PlaceholderTestHandler', own));
        System.assertNotEquals(null, TypeLookup.forName('PlaceholderTestHandler', null), 'a missing namespace falls back to the plain lookup');
        System.assertNotEquals(null, TypeLookup.forName(' PlaceholderTestHandler ', ''));
    }

    @IsTest
    static void aNameThatDoesNotExistOrIsBlankGivesNull() {
        System.assertEquals(null, TypeLookup.forName('NoSuchHandlerClass', null));
        System.assertEquals(null, TypeLookup.forName('', null));
        System.assertEquals(null, TypeLookup.forName(null, null));
    }
}
