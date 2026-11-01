/**
* @File Name : ScreenshotController.cls
* @Description : This class is to resize images in Rich Text Area
* @Author : Bhavya Sri Khandrika
* @Last Modified By : September 26, 2024
* @Last Modified On : September 26, 2024
* @Modification Log :
*==============================================================================
* Ver | Date | Author | Modification
*==============================================================================
* 1.0 | September 26, 2024 | Bhavya Sri Khandrika  | Initial Version
**/

public class ScreenshotController {
    private static final String RESIZED_TITLE = 'Resized Image';

	 @AuraEnabled(cacheable=true)
    public static String getImageBase64(Id cvId) {
        String base64Data = '';
        
        try {
          ContentVersion cvData = [SELECT Id, Title, VersionData FROM ContentVersion WHERE Id =:cvId LIMIT 1];
          System.debug('Base64 Data: ' + EncodingUtil.base64Encode(cvData.VersionData));
            base64Data =  EncodingUtil.base64Encode(cvData.VersionData);

        } catch (Exception e) {
            System.debug('Exception: ' + e.getMessage());
        }
        return base64Data;
    }
    
    @AuraEnabled
    public static String saveImage(String base64Data, String fileName, Id parentId) {
        try {
             List<Id> contentVersionIdsToDelete = new List<Id>();
             for (ContentVersion cv : [SELECT Id, ContentDocumentId  FROM ContentVersion WHERE FirstPublishLocationId = :parentId  WITH USER_MODE]) {
                    contentVersionIdsToDelete.add(cv.ContentDocumentId);
             } 
            List<Id> contentDocumentIdsToDelete = new List<Id>();
            List<ContentDocument> cdlst = [SELECT Id FROM ContentDocument WHERE Id IN :contentVersionIdsToDelete WITH USER_MODE];
            if (!cdlst.isEmpty()) {
                delete cdlst;
            }
            String base64Image = base64Data.split(',')[1]; 
            ContentVersion contentVersion = new ContentVersion();
            contentVersion.Title = fileName;
            contentVersion.PathOnClient = fileName;
            contentVersion.FirstPublishLocationId  = parentId;
            contentVersion.VersionData = EncodingUtil.base64Decode(base64Image);
            insert contentVersion;
            
            return contentVersion.Id;
        } catch (Exception e) {
            throw new AuraHandledException('Error saving image: ' + e.getMessage());
        }
    }
    
    // A resized copy remembers the image it was made from (Description), so the editor can offer the full-size
    // original again after the section was saved and reopened.
    @AuraEnabled
    public static String saveImageBase64(String base64Data, String originalCvId) {
        String base64String = base64Data.split(',')[1];
        Blob imageBlob = EncodingUtil.base64Decode(base64String);

        ContentVersion contentVersion = new ContentVersion();
        contentVersion.Title = RESIZED_TITLE;
        contentVersion.PathOnClient = 'resizedImage.png';
        contentVersion.VersionData = imageBlob;
        contentVersion.Description = originalCvId;
        contentVersion.IsMajorVersion = true;
        insert contentVersion;
        return contentVersion.Id;
    }

    // For each given file: the file it was resized from, or the file itself when it is not a resized copy
    // (or when its original no longer exists).
    @AuraEnabled
    public static Map<String, String> getOriginalImageIds(List<String> cvIds) {
        Map<String, String> originals = new Map<String, String>();
        for (String cvId : cvIds) {
            originals.put(cvId, cvId);
        }
        Map<String, String> claimed = new Map<String, String>();
        for (ContentVersion cv : [SELECT Id, Description FROM ContentVersion WHERE Id IN :cvIds AND Title = :RESIZED_TITLE]) {
            if (String.isNotBlank(cv.Description) && (cv.Description.length() == 15 || cv.Description.length() == 18)) {
                claimed.put(String.valueOf(cv.Id), cv.Description);
            }
        }
        Set<String> existing = new Set<String>();
        for (ContentVersion cv : [SELECT Id FROM ContentVersion WHERE Id IN :claimed.values()]) {
            existing.add(String.valueOf(cv.Id).left(15));
        }
        for (String cvId : cvIds) {
            String original = claimed.get(String.valueOf(cvId)) != null ? claimed.get(String.valueOf(cvId)) : claimed.get(cvId);
            if (original == null) {
                for (String claimedId : claimed.keySet()) {
                    if (claimedId.left(15) == cvId.left(15)) { original = claimed.get(claimedId); }
                }
            }
            if (original != null && existing.contains(original.left(15))) {
                originals.put(cvId, original);
            }
        }
        return originals;
    }

    @AuraEnabled
    public static void updateContentVersions(List<String> contentVersionIds, Id newLocationId) {
        System.debug('contentVersionIds ---> ' + contentVersionIds);
        System.debug('newLocationId ---> ' + newLocationId);
        List<ContentVersion> contentVersions = [
            SELECT Id, FirstPublishLocationId
            FROM ContentVersion
            WHERE Id IN :contentVersionIds
        ];
        for (ContentVersion cv : contentVersions) {
            cv.FirstPublishLocationId = newLocationId;
        }
        try {
            update contentVersions;
        } catch (DmlException e) {
            System.debug('Error updating ContentVersions: ' + e.getMessage());
            throw new AuraHandledException('Error updating ContentVersions: ' + e.getMessage());
        }
    }
    
	/*@AuraEnabled
    public static void deleteContentVersions(List<String> cvIDs, Id docTempSectionId, List<String> allCVs) {
        System.debug('cvIDs ---> ' + cvIDs);
        System.debug('docTempSectionId ---> ' + docTempSectionId);
        List<ContentVersion> contentVersionsToDelete = [
            SELECT Id, ContentDocumentId
            FROM ContentVersion
            WHERE Id IN :allCVs 
        ];

        System.debug('Queried ContentVersions: ' + contentVersionsToDelete);
        Set<Id> contentDocumentIdsToDelete = new Set<Id>();
        for (ContentVersion cv : contentVersionsToDelete) {
            if (!cvIDs.contains(cv.Id)) {
                contentDocumentIdsToDelete.add(cv.ContentDocumentId);
            }
        }

        System.debug('ContentDocumentIds to delete: ' + contentDocumentIdsToDelete);

        if (!contentDocumentIdsToDelete.isEmpty()) {
            List<ContentDocumentLink> contentDocumentLinksToDelete = [
                SELECT Id
                FROM ContentDocumentLink
                WHERE ContentDocumentId IN :contentDocumentIdsToDelete
            ];

            System.debug('ContentDocumentLinks to delete: ' + contentDocumentLinksToDelete);
            if (!contentDocumentLinksToDelete.isEmpty()) {
                try {
                    delete contentDocumentLinksToDelete;
                    System.debug('Deleted ContentDocumentLinks successfully.');
                } catch (DmlException e) {
                    System.debug('Error deleting ContentDocumentLinks: ' + e.getMessage());
                    throw new AuraHandledException('Error deleting ContentDocumentLinks: ' + e.getMessage());
                }
            }
        }
    }
	*/
    
    
    // Deletes the resized copies in allCVs that the section no longer uses. Never touches a file that is not a resized
    // copy, and never a copy that another section (for example in a cloned template) still shows.
    @AuraEnabled
    public static void deleteContentVersions(List<String> rCVIDs, List<String> allCVs) {
        Set<String> keep = new Set<String>();
        for (String id : rCVIDs) {
            if (id != null) { keep.add(id.left(15)); }
        }
        Map<String, ContentVersion> candidates = new Map<String, ContentVersion>();
        for (ContentVersion cv : [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id IN :allCVs AND Title = :RESIZED_TITLE]) {
            if (!keep.contains(String.valueOf(cv.Id).left(15))) {
                candidates.put(String.valueOf(cv.Id).left(15), cv);
            }
        }
        if (candidates.isEmpty()) { return; }

        for (Document_Template_Section__c section : [SELECT Section_Content__c FROM Document_Template_Section__c WHERE Type__c IN ('Context', 'Table', 'Clause', 'Header', 'Footer')]) {
            if (String.isBlank(section.Section_Content__c)) { continue; }
            for (String key : new List<String>(candidates.keySet())) {
                if (section.Section_Content__c.contains(key)) { candidates.remove(key); }
            }
            if (candidates.isEmpty()) { return; }
        }

        Set<Id> documentIds = new Set<Id>();
        for (ContentVersion cv : candidates.values()) {
            documentIds.add(cv.ContentDocumentId);
        }
        try {
            delete [SELECT Id FROM ContentDocument WHERE Id IN :documentIds];
        } catch (DmlException e) {
            throw new AuraHandledException('Error deleting contentDocumentIdsToDelete: ' + e.getMessage());
        }
    }
}
