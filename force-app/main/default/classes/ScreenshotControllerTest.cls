@isTest
private class ScreenshotControllerTest {
    // 1x1 transparent PNG
    private static final String PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    private static ContentVersion makeVersion(String title, String description) {
        ContentVersion cv = new ContentVersion(Title = title, PathOnClient = title + '.png', VersionData = EncodingUtil.base64Decode(PNG.substringAfter(',')), Description = description);
        insert cv;
        return cv;
    }

    private static Document_Template_Section__c makeSection(String content) {
        Document_Template__c template = new Document_Template__c(Name = 'Resize Test', Related_To_Type__c = 'Account');
        insert template;
        Document_Template_Section__c section = new Document_Template_Section__c(Name = 'Ctx', Document_Template__c = template.Id, Type__c = 'Context', Section_Content__c = content);
        insert section;
        return section;
    }

    @isTest
    static void savedResizedImageRemembersItsOriginal() {
        ContentVersion original = makeVersion('Logo', null);
        String savedId = ScreenshotController.saveImageBase64(PNG, original.Id);
        ContentVersion saved = [SELECT Title, Description FROM ContentVersion WHERE Id = :savedId];
        System.assertEquals('Resized Image', saved.Title);
        System.assertEquals(String.valueOf(original.Id), saved.Description);
    }

    @isTest
    static void originalIdIsFoundForResizedImagesAndKeptForOthers() {
        ContentVersion original = makeVersion('Logo', null);
        ContentVersion resized = makeVersion('Resized Image', original.Id);
        ContentVersion plain = makeVersion('Other', null);
        Map<String, String> ids = ScreenshotController.getOriginalImageIds(new List<String>{ resized.Id, plain.Id });
        System.assertEquals(String.valueOf(original.Id), ids.get(resized.Id));
        System.assertEquals(String.valueOf(plain.Id), ids.get(plain.Id));
    }

    @isTest
    static void resizedImageWhoseOriginalWasDeletedIsItsOwnOriginal() {
        ContentVersion original = makeVersion('Logo', null);
        ContentVersion resized = makeVersion('Resized Image', original.Id);
        delete [SELECT Id FROM ContentDocument WHERE Id IN (SELECT ContentDocumentId FROM ContentVersion WHERE Id = :original.Id)];
        System.assertEquals(String.valueOf(resized.Id), ScreenshotController.getOriginalImageIds(new List<String>{ resized.Id }).get(resized.Id));
    }

    @isTest
    static void unusedResizedImageIsDeleted() {
        ContentVersion old = makeVersion('Resized Image', null);
        ContentVersion current = makeVersion('Resized Image', null);
        ScreenshotController.deleteContentVersions(new List<String>{ current.Id }, new List<String>{ old.Id, current.Id });
        System.assertEquals(0, [SELECT COUNT() FROM ContentVersion WHERE Id = :old.Id]);
        System.assertEquals(1, [SELECT COUNT() FROM ContentVersion WHERE Id = :current.Id]);
    }

    @isTest
    static void imageStillUsedByAnotherSectionIsKept() {
        ContentVersion shared = makeVersion('Resized Image', null);
        makeSection('<p><img src="/sfc/servlet.shepherd/version/download/' + shared.Id + '"></p>');
        ScreenshotController.deleteContentVersions(new List<String>(), new List<String>{ shared.Id });
        System.assertEquals(1, [SELECT COUNT() FROM ContentVersion WHERE Id = :shared.Id]);
    }

    @isTest
    static void userImagesAreNeverDeleted() {
        ContentVersion userImage = makeVersion('My Logo', null);
        ScreenshotController.deleteContentVersions(new List<String>(), new List<String>{ userImage.Id });
        System.assertEquals(1, [SELECT COUNT() FROM ContentVersion WHERE Id = :userImage.Id]);
    }
}
