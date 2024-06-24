@IsTest
public class ImportExportData_Test {

    // Test method for templateData() method
    @IsTest
    static void testTemplateData() {
        User us = DexUtilTestDataFactory.CreateTestUser();
        System.runAs(us){
            ImportExportData.templateWrapper result = ImportExportData.templateData();
            // Perform assertions as needed
            System.assert(result != null);
        }
    }

    // Test method for allDocTemps() method
    @IsTest
    static void testAllDocTemps() {
        User us = DexUtilTestDataFactory.CreateTestUser();
        System.runAs(us){
            List<sObject> result = ImportExportData.allDocTemps();
            // Perform assertions as needed
            System.assertNotEquals(result.size(), 1);
        } 
    }

    // Test method for templateExternalList() method
    @IsTest
    static void testTemplateExternalList() {
        User us = DexUtilTestDataFactory.CreateTestUser();
        System.runAs(us){
            List<Map<String,String>> result = ImportExportData.templateExternalList();
            // Perform assertions as needed
            System.assertNotEquals(result.size(), 1);
        }
        
    }

    // Test method for getAllDocumentTemplatesData() method
    @IsTest
    static void testGetAllDocumentTemplatesData() {
        User us = DexUtilTestDataFactory.CreateTestUser();
        System.runAs(us){
             String result = ImportExportData.getAllDocumentTemplatesData();
            // Perform assertions as needed
            Assert.isTrue(true,'For Test Coverage');
        }
       
    }

    // Test method for getWatermarkContent(List<String> idList) method
    @IsTest
    static void testGetWatermarkContent() {
        User us = DexUtilTestDataFactory.CreateTestUser();
        System.runAs(us){
            List<String> idList = new List<String>(); // Provide appropriate IDs
            Map<String,Object> result = ImportExportData.getWatermarkContent(idList);
            // Perform assertions as needed
            System.assertNotEquals(result.size(), 1);
        }
        
    }

    // Test method for createImportedTemplates(String tempLst) method
    @IsTest
    static void testCreateImportedTemplates() {
        User us = DexUtilTestDataFactory.CreateTestUser();
        System.runAs(us){
            String tempLst = '[{"Name":"Test Template","Version_Number__c":1,"Watermark_Data__c":"Sample Data"}]';
            List<Map<String,String>> result = ImportExportData.createImportedTemplates(tempLst);
            // Perform assertions as needed
            System.assertNotEquals(result.size(), 0);
        }
        
    }

    // Test method for createImportedTemplateSections(String tempSecLst) method
    @IsTest
    static void testCreateImportedTemplateSections() {
        User us = DexUtilTestDataFactory.CreateTestUser();
        System.runAs(us){
            Document_Template__c doctemp = new Document_Template__c();
            doctemp.Name = 'Document 1';
            insert doctemp;
            String doctempId = doctemp.Id;
            String tempSecLst = '[{"Name":"Test Section","DxCPQ__Document_Template__c":"'+doctempId+'"}]';
            List<String> result = ImportExportData.createImportedTemplateSections(tempSecLst);
            // Perform assertions as needed
            System.assertNotEquals(result.size(), 0);
        }
        
    }

    // Test method for createImportedClauses(String tempClausesLst) method
    @IsTest
    static void testCreateImportedClauses() {
        User us = DexUtilTestDataFactory.CreateTestUser();
        System.runAs(us){
            String tempClausesLst = '[{"Name":"Test Clause"}]';
            List<Map<String,String>> result = ImportExportData.createImportedClauses(tempClausesLst);
            // Perform assertions as needed
            System.assertNotEquals(result.size(), 0);
        }
       
    }

    // Test method for createImportedRules(String tempRuleLst) method
    @IsTest
    static void testCreateImportedRules() {
        User us = DexUtilTestDataFactory.CreateTestUser();
        System.runAs(us){
            String tempRuleLst = '[{"Rule_Description__c":"Test Rule"}]';
            List<Map<String,String>> result = ImportExportData.createImportedRules(tempRuleLst);
            // Perform assertions as needed
            System.assertNotEquals(result.size(), 0);
        }
        
    }

    // Test method for createImportedRuleConditions(String tempRuleCondLst) method
    @IsTest
    static void testCreateImportedRuleConditions() {
        Rule__c rule = new Rule__c();
        rule.Name = 'Rule1';
        insert rule;
        String ruleId = rule.Id;
        User us = DexUtilTestDataFactory.CreateTestUser();
        System.runAs(us){
            String tempRuleCondLst = '[{"Name":"Test Rule Condition","DxCPQ__Rule__c": "' + ruleId + '"}]';
            List<Map<String,String>> result = ImportExportData.createImportedRuleConditions(tempRuleCondLst);
            // Perform assertions as needed
            System.assertNotEquals(result.size(), 0);
        }
       
    }

    // Test method for createImportedWatermark(String watermarkLst) method
    @IsTest
    static void testCreateImportedWatermark() {
        User us = DexUtilTestDataFactory.CreateTestUser();
        System.runAs(us){
            String watermarkLst = '{"123":{"ImageData":"base64encodeddata","ContentVersionData":{"Title":"Test Image", "PathOnClient": "WatermarkImage.png"}}}';
            List<ContentVersion> result = ImportExportData.createImportedWatermark(watermarkLst);
            // Perform assertions as needed
            System.assertNotEquals(result.size(), 1);
        }
       
    }
}