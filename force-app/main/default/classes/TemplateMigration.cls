/**
 * Moves templates from one org to another (export file, then import file).
 *
 * Every link inside the file is kept by the id the record had in the source org (the `Id` of each exported record), so the
 * import does not depend on External Id fields being filled. The whole import runs in one transaction: if anything fails,
 * nothing is created. Files that the templates use (watermark files and pictures in the text) travel in the file and are
 * created again in the target org, and the ids in the text are rewritten.
 *
 * Importing a template whose name already exists makes the next version of it.
 */
public with sharing class TemplateMigration {
    private static final Integer MAX_FILE_BYTES = 2500000;
    private static final String FILE_ID_PATTERN = '068[A-Za-z0-9]{12}(?:[A-Za-z0-9]{3})?';

    private static final Set<String> TEMPLATE_FIELDS = new Set<String>{ 'Name', 'Related_To_Type__c', 'PDF_Page_Properties__c', 'Watermark_Data__c', 'Description__c', 'External_ID__c' };
    private static final Set<String> SECTION_FIELDS = new Set<String>{ 'Name', 'DisplaySectionName__c', 'ChildObject__c', 'Header_Content__c', 'IsActive__c', 'IsEditable__c', 'New_Page__c',
        'Section_Content__c', 'Section_Details__c', 'Sequence__c', 'Type__c' };
    private static final Set<String> RULE_FIELDS = new Set<String>{ 'Evaluation_Object__c', 'External_Id__c', 'Rule_Description__c', 'Rule_Expression__c', 'Rule_Service__c', 'Rule_Type__c', 'Service__c' };
    private static final Set<String> CONDITION_FIELDS = new Set<String>{ 'Name', 'ConditionIndex__c', 'Condition_Field__c', 'DataType__c', 'Evaluation_Object__c', 'External_Id__c',
        'Is_Cart_Item_Condition__c', 'Operator__c', 'Value__c' };
    private static final Set<String> CLAUSE_FIELDS = new Set<String>{ 'Name', 'Body__c', 'Category__c', 'IsActive__c', 'Product__c', 'Status__c', 'External_ID__c' };
    private static final Set<String> TRANSLATION_FIELDS = new Set<String>{ 'Name', 'FieldValue__c', 'Language__c', 'Translated_Value__c' };

    // ---------------------------------------------------------------- export

    // The templates the export dialog offers.
    @AuraEnabled
    public static List<Map<String, Object>> listTemplates() {
        List<Map<String, Object>> rows = new List<Map<String, Object>>();
        for (Document_Template__c template : [SELECT Id, Name, Version_Number__c FROM Document_Template__c WITH USER_MODE ORDER BY Name, Version_Number__c DESC LIMIT 2000]) {
            rows.add(new Map<String, Object>{ 'id' => template.Id, 'name' => template.Name, 'version' => template.Version_Number__c });
        }
        return rows;
    }

    // The export file of the selected templates only: their sections, the rules, conditions and clauses those use, their
    // translations and the files they show.
    @AuraEnabled
    public static String exportData(List<String> templateIds) {
        if (templateIds == null || templateIds.isEmpty()) {
            throw fail('Select at least one template to export.');
        }
        try {
            Set<Id> ids = new Set<Id>();
            for (String templateId : templateIds) { ids.add((Id) templateId); }

            List<Document_Template__c> templates = [SELECT Name, Related_To_Type__c, Version_Number__c, Parent_Template__c, Watermark_Data__c, PDF_Page_Properties__c, Description__c,
                External_ID__c, ClassId__c, FlowId__c FROM Document_Template__c WHERE Id IN :ids WITH USER_MODE];
            List<Document_Template_Section__c> sections = [SELECT Name, DisplaySectionName__c, Document_Template__c, ChildObject__c, Document_Clause__c, External_Document_Template__c,
                External_RuleID__c, External_SecVis_Rule_ID__c, Header_Content__c, IsActive__c, IsEditable__c, New_Page__c, Parent_Section__c, RuleId__c, Section_Content__c,
                Section_Details__c, Section_Visibility_Rule__c, Sequence__c, Type__c FROM Document_Template_Section__c WHERE Document_Template__c IN :ids WITH USER_MODE ORDER BY Sequence__c];

            Set<Id> clauseIds = new Set<Id>();
            Set<Id> ruleIds = new Set<Id>();
            for (Document_Template_Section__c section : sections) {
                if (section.Document_Clause__c != null) { clauseIds.add(section.Document_Clause__c); }
                if (section.RuleId__c != null) { ruleIds.add(section.RuleId__c); }
                if (section.Section_Visibility_Rule__c != null) { ruleIds.add(section.Section_Visibility_Rule__c); }
            }
            List<Document_Clause__c> clauses = [SELECT Name, Body__c, Category__c, IsActive__c, Product__c, Status__c, External_ID__c FROM Document_Clause__c WHERE Id IN :clauseIds WITH USER_MODE];
            List<Rule__c> rules = [SELECT Evaluation_Object__c, External_Id__c, Rule_Description__c, Rule_Expression__c, Rule_Service__c, Rule_Type__c, Service__c FROM Rule__c WHERE Id IN :ruleIds WITH USER_MODE];
            List<Rule_Condition__c> conditions = [SELECT Name, ConditionIndex__c, Condition_Field__c, DataType__c, Evaluation_Object__c, External_Id__c, Is_Cart_Item_Condition__c,
                Operator__c, Value__c, Rule__c FROM Rule_Condition__c WHERE Rule__c IN :ruleIds WITH USER_MODE];
            List<Translator__c> translations = [SELECT Name, DocumentTemplate__c, FieldValue__c, Language__c, Translated_Value__c FROM Translator__c WHERE DocumentTemplate__c IN :ids WITH USER_MODE];

            List<String> notes = new List<String>();
            Set<String> fileIds = new Set<String>();
            for (Document_Template__c template : templates) {
                collectFileIds(template.Watermark_Data__c, fileIds);
                collectFileIds(template.PDF_Page_Properties__c, fileIds);
            }
            for (Document_Template_Section__c section : sections) {
                collectFileIds(section.Section_Content__c, fileIds);
                collectFileIds(section.Section_Details__c, fileIds);
                collectFileIds(section.Header_Content__c, fileIds);
            }

            List<Map<String, Object>> files = new List<Map<String, Object>>();
            Integer bytes = 0;
            for (ContentVersion version : [SELECT Id, Title, PathOnClient, VersionData, ContentSize FROM ContentVersion WHERE Id IN :fileIds WITH USER_MODE]) {
                if (bytes + version.ContentSize > MAX_FILE_BYTES) {
                    notes.add('File "' + version.Title + '" was left out because the export file would become too large; add it to the target org by hand.');
                    continue;
                }
                bytes += version.ContentSize;
                files.add(new Map<String, Object>{ 'Id' => version.Id, 'Title' => version.Title, 'PathOnClient' => version.PathOnClient, 'Data' => EncodingUtil.base64Encode(version.VersionData) });
            }

            Map<String, Object> file = new Map<String, Object>();
            file.put('Format', 2);
            file.put('Templates', templates);
            file.put('Template Sections', sections);
            file.put('Document Clauses', clauses);
            file.put('Rules', rules);
            file.put('Rule Conditions', conditions);
            file.put('Translations', translations);
            file.put('Files', files);
            file.put('Notes', notes);
            return JSON.serialize(file);
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw fail('The export failed: ' + e.getMessage());
        }
    }

    private static void collectFileIds(String text, Set<String> found) {
        if (String.isBlank(text)) { return; }
        Matcher matcher = Pattern.compile(FILE_ID_PATTERN).matcher(text);
        while (matcher.find()) { found.add(matcher.group()); }
    }

    // ---------------------------------------------------------------- import

    // Creates the templates of an export file in this org, in one transaction. Returns what was created and what to check.
    @AuraEnabled
    public static Map<String, Object> importData(String fileContent) {
        Map<String, Object> file = parse(fileContent);
        Savepoint savepoint = Database.setSavepoint();
        try {
            return run(file);
        } catch (AuraHandledException e) {
            Database.rollback(savepoint);
            throw e;
        } catch (Exception e) {
            Database.rollback(savepoint);
            throw fail('The import failed and nothing was created: ' + e.getMessage());
        }
    }

    private static Map<String, Object> parse(String fileContent) {
        Object parsed;
        try {
            parsed = JSON.deserializeUntyped(fileContent);
        } catch (Exception e) {
            throw fail('The file is not valid JSON. Please check the file and try again.');
        }
        if (!(parsed instanceof Map<String, Object>) || !((Map<String, Object>) parsed).containsKey('Templates')) {
            throw fail('The file does not contain templates. Please use a file made by Export.');
        }
        return (Map<String, Object>) parsed;
    }

    private static Map<String, Object> run(Map<String, Object> file) {
        List<String> warnings = new List<String>();
        List<Map<String, Object>> sourceTemplates = records(file, 'Templates');
        checkRelatedTypes(sourceTemplates);

        // templates, numbered as the next version of a template with the same name
        Set<String> names = new Set<String>();
        for (Map<String, Object> source : sourceTemplates) { names.add((String) source.get('Name')); }
        Map<String, Decimal> latest = new Map<String, Decimal>();
        for (Document_Template__c existing : [SELECT Name, Version_Number__c FROM Document_Template__c WHERE Name IN :names WITH USER_MODE]) {
            Decimal version = existing.Version_Number__c == null ? 0 : existing.Version_Number__c;
            if (!latest.containsKey(existing.Name) || latest.get(existing.Name) < version) { latest.put(existing.Name, version); }
        }
        List<Document_Template__c> templates = new List<Document_Template__c>();
        for (Map<String, Object> source : sourceTemplates) {
            Document_Template__c template = (Document_Template__c) JSON.deserialize(JSON.serialize(only(source, TEMPLATE_FIELDS)), Document_Template__c.class);
            Decimal version = (latest.containsKey(template.Name) ? latest.get(template.Name) : 0) + 1;
            latest.put(template.Name, version);
            template.Version_Number__c = version;
            templates.add(template);
            if (String.isNotBlank((String) value(source, 'ClassId__c')) || String.isNotBlank((String) value(source, 'FlowId__c'))) {
                warnings.add('Template "' + template.Name + '" uses an Apex class or a flow of the source org; set it again in this org.');
            }
        }
        insert as user templates;
        Map<String, Document_Template__c> templateBySourceId = new Map<String, Document_Template__c>();
        for (Integer i = 0; i < templates.size(); i++) { templateBySourceId.put((String) sourceTemplates[i].get('Id'), templates[i]); }

        // files: created again, ids in text and watermark data rewritten afterwards
        Map<String, String> newFileId = createFiles(file, templates, templateBySourceId, sourceTemplates);

        // rules and conditions
        Map<String, Id> ruleBySourceId = new Map<String, Id>();
        List<Rule__c> rules = new List<Rule__c>();
        List<String> ruleSourceIds = new List<String>();
        for (Map<String, Object> source : records(file, 'Rules')) {
            rules.add((Rule__c) JSON.deserialize(JSON.serialize(only(source, RULE_FIELDS)), Rule__c.class));
            ruleSourceIds.add((String) source.get('Id'));
        }
        insert as user rules;
        for (Integer i = 0; i < rules.size(); i++) { ruleBySourceId.put(ruleSourceIds[i], rules[i].Id); }
        List<Rule_Condition__c> conditions = new List<Rule_Condition__c>();
        for (Map<String, Object> source : records(file, 'Rule Conditions')) {
            Id rule = ruleBySourceId.get((String) value(source, 'Rule__c'));
            if (rule == null) { continue; }
            Rule_Condition__c condition = (Rule_Condition__c) JSON.deserialize(JSON.serialize(only(source, CONDITION_FIELDS)), Rule_Condition__c.class);
            condition.Rule__c = rule;
            conditions.add(condition);
        }
        insert as user conditions;

        // clauses: a clause that exists here (same external id) is used as it is
        Map<String, Id> clauseBySourceId = createClauses(records(file, 'Document Clauses'));

        // sections
        List<Document_Template_Section__c> sections = new List<Document_Template_Section__c>();
        List<String> sectionSourceIds = new List<String>();
        List<String> sectionParents = new List<String>();
        Integer skipped = 0;
        for (Map<String, Object> source : records(file, 'Template Sections')) {
            Document_Template__c template = templateBySourceId.get((String) value(source, 'Document_Template__c'));
            if (template == null) { skipped++; continue; }
            Document_Template_Section__c section = (Document_Template_Section__c) JSON.deserialize(JSON.serialize(only(source, SECTION_FIELDS)), Document_Template_Section__c.class);
            section.Document_Template__c = template.Id;
            section.Section_Content__c = rewrite(section.Section_Content__c, newFileId);
            section.Section_Details__c = rewrite(section.Section_Details__c, newFileId);
            section.Header_Content__c = rewrite(section.Header_Content__c, newFileId);
            section.Document_Clause__c = clauseBySourceId.get((String) value(source, 'Document_Clause__c'));
            section.RuleId__c = ruleBySourceId.get((String) value(source, 'RuleId__c'));
            section.Section_Visibility_Rule__c = ruleBySourceId.get((String) value(source, 'Section_Visibility_Rule__c'));
            sections.add(section);
            sectionSourceIds.add((String) source.get('Id'));
            sectionParents.add((String) value(source, 'Parent_Section__c'));
            warnMissingObjects(section, warnings);
        }
        if (skipped > 0) { warnings.add(skipped + ' section(s) in the file belong to a template that is not in the file and were left out.'); }
        insert as user sections;
        Map<String, Id> sectionBySourceId = new Map<String, Id>();
        for (Integer i = 0; i < sections.size(); i++) { sectionBySourceId.put(sectionSourceIds[i], sections[i].Id); }
        List<Document_Template_Section__c> children = new List<Document_Template_Section__c>();
        for (Integer i = 0; i < sections.size(); i++) {
            Id parent = sectionParents[i] == null ? null : sectionBySourceId.get(sectionParents[i]);
            if (parent != null) { children.add(new Document_Template_Section__c(Id = sections[i].Id, Parent_Section__c = parent)); }
        }
        if (!children.isEmpty()) { update as user children; }

        // watermark data now names the new files
        for (Document_Template__c template : templates) { template.Watermark_Data__c = rewrite(template.Watermark_Data__c, newFileId); template.PDF_Page_Properties__c = rewrite(template.PDF_Page_Properties__c, newFileId); }
        update as user templates;

        // translations of the templates in the file
        List<Translator__c> translations = new List<Translator__c>();
        for (Map<String, Object> source : records(file, 'Translations')) {
            Document_Template__c template = templateBySourceId.get((String) value(source, 'DocumentTemplate__c'));
            if (template == null) { continue; }
            Translator__c translation = (Translator__c) JSON.deserialize(JSON.serialize(only(source, TRANSLATION_FIELDS)), Translator__c.class);
            translation.DocumentTemplate__c = template.Id;
            translations.add(translation);
        }
        insert as user translations;

        List<Object> created = new List<Object>();
        for (Document_Template__c template : templates) {
            created.add(new Map<String, Object>{ 'id' => template.Id, 'name' => template.Name, 'version' => template.Version_Number__c });
        }
        for (Object note : (List<Object>) (file.get('Notes') == null ? new List<Object>() : file.get('Notes'))) { warnings.add(String.valueOf(note)); }
        return new Map<String, Object>{
            'templates' => created,
            'sections' => sections.size(),
            'rules' => rules.size(),
            'conditions' => conditions.size(),
            'clauses' => clauseBySourceId.size(),
            'translations' => translations.size(),
            'files' => newFileId.size() / 2,
            'warnings' => warnings
        };
    }

    private static void checkRelatedTypes(List<Map<String, Object>> sourceTemplates) {
        Set<String> valid = new Set<String>();
        for (Schema.PicklistEntry entry : Document_Template__c.Related_To_Type__c.getDescribe().getPicklistValues()) { valid.add(entry.getValue()); }
        for (Map<String, Object> source : sourceTemplates) {
            String type = (String) value(source, 'Related_To_Type__c');
            if (type != null && !valid.contains(type)) {
                throw fail('Template "' + source.get('Name') + '" is related to "' + type + '", which is not a value of "Related To Type" in this org. Add the value first, then import again.');
            }
        }
    }

    // New files for every file in the file (new format "Files", old format "Watermark"). Returns old id and its 15 character form to the new id.
    private static Map<String, String> createFiles(Map<String, Object> file, List<Document_Template__c> templates, Map<String, Document_Template__c> templateBySourceId, List<Map<String, Object>> sourceTemplates) {
        List<Map<String, Object>> sources = records(file, 'Files');
        if (file.get('Watermark') instanceof Map<String, Object>) {
            Map<String, Object> legacy = (Map<String, Object>) file.get('Watermark');
            for (String oldId : legacy.keySet()) {
                Map<String, Object> entry = (Map<String, Object>) legacy.get(oldId);
                Map<String, Object> data = (Map<String, Object>) entry.get('ContentVersionData');
                sources.add(new Map<String, Object>{ 'Id' => oldId, 'Title' => data.get('Title'), 'PathOnClient' => data.get('PathOnClient'), 'Data' => entry.get('ImageData') });
            }
        }
        // a file named in a template's watermark data belongs to that template
        List<ContentVersion> versions = new List<ContentVersion>();
        for (Map<String, Object> source : sources) {
            ContentVersion version = new ContentVersion(Title = (String) source.get('Title'), PathOnClient = (String) source.get('PathOnClient'), VersionData = EncodingUtil.base64Decode((String) source.get('Data')));
            for (Integer i = 0; i < sourceTemplates.size(); i++) {
                String watermark = (String) value(sourceTemplates[i], 'Watermark_Data__c');
                if (watermark != null && watermark.contains((String) source.get('Id'))) { version.FirstPublishLocationId = templateBySourceId.get((String) sourceTemplates[i].get('Id')).Id; break; }
            }
            versions.add(version);
        }
        insert as user versions;
        Map<String, String> newId = new Map<String, String>();
        for (Integer i = 0; i < sources.size(); i++) {
            String oldId = (String) sources[i].get('Id');
            newId.put(oldId, versions[i].Id);
            newId.put(oldId.left(15), String.valueOf(versions[i].Id).left(15));
        }
        return newId;
    }

    private static Map<String, Id> createClauses(List<Map<String, Object>> sources) {
        Set<String> externalIds = new Set<String>();
        for (Map<String, Object> source : sources) {
            String external = (String) value(source, 'External_ID__c');
            externalIds.add(external == null ? (String) source.get('Id') : external);
        }
        Map<String, Id> existing = new Map<String, Id>();
        for (Document_Clause__c clause : [SELECT Id, External_ID__c FROM Document_Clause__c WHERE External_ID__c IN :externalIds WITH USER_MODE]) { existing.put(clause.External_ID__c, clause.Id); }
        Map<String, Id> bySourceId = new Map<String, Id>();
        List<Document_Clause__c> toInsert = new List<Document_Clause__c>();
        List<String> toInsertSourceIds = new List<String>();
        for (Map<String, Object> source : sources) {
            String external = (String) value(source, 'External_ID__c');
            external = external == null ? (String) source.get('Id') : external;
            if (existing.containsKey(external)) {
                bySourceId.put((String) source.get('Id'), existing.get(external));
            } else {
                Document_Clause__c clause = (Document_Clause__c) JSON.deserialize(JSON.serialize(only(source, CLAUSE_FIELDS)), Document_Clause__c.class);
                clause.External_ID__c = external;
                toInsert.add(clause);
                toInsertSourceIds.add((String) source.get('Id'));
            }
        }
        insert as user toInsert;
        for (Integer i = 0; i < toInsert.size(); i++) { bySourceId.put(toInsertSourceIds[i], toInsert[i].Id); }
        return bySourceId;
    }

    // A Related Objects section names objects of the source org; warn when this org does not have them.
    private static void warnMissingObjects(Document_Template_Section__c section, List<String> warnings) {
        if (section.Type__c != 'Related Objects' || String.isBlank(section.Section_Details__c)) { return; }
        try {
            Map<String, Object> details = (Map<String, Object>) JSON.deserializeUntyped(section.Section_Details__c);
            for (String key : new List<String>{ 'mainChildObject', 'mainparentObject' }) {
                String objectName = (String) details.get(key);
                if (String.isNotBlank(objectName) && !Schema.getGlobalDescribe().containsKey(objectName.toLowerCase())) {
                    warnings.add('Section "' + section.Name + '" uses the object "' + objectName + '", which does not exist in this org.');
                }
            }
        } catch (Exception e) {
            // details in another shape: nothing to check
        }
    }

    // ---------------------------------------------------------------- helpers

    private static String rewrite(String text, Map<String, String> newFileId) {
        if (String.isBlank(text)) { return text; }
        String result = text;
        List<String> oldIds = new List<String>(newFileId.keySet());
        oldIds.sort();
        // 18 character ids first, then their 15 character forms
        for (Integer pass = 0; pass < 2; pass++) {
            for (String oldId : oldIds) {
                if ((pass == 0) == (oldId.length() == 18)) { result = result.replace(oldId, newFileId.get(oldId)); }
            }
        }
        return result;
    }

    private static List<Map<String, Object>> records(Map<String, Object> file, String key) {
        List<Map<String, Object>> rows = new List<Map<String, Object>>();
        Object rowList = file.get(key);
        if (rowList instanceof List<Object>) {
            for (Object row : (List<Object>) rowList) { rows.add((Map<String, Object>) row); }
        }
        return rows;
    }

    // The value of a field in an exported record, with or without the namespace prefix.
    private static Object value(Map<String, Object> record, String field) {
        for (String key : record.keySet()) {
            if (key == field || key.endsWith('__' + field)) { return record.get(key); }
        }
        return null;
    }

    // Only the fields that belong to the record type; anything else in the file (Id, owner, dates, ...) is ignored.
    private static Map<String, Object> only(Map<String, Object> record, Set<String> allowed) {
        Map<String, Object> kept = new Map<String, Object>();
        for (String key : record.keySet()) {
            String plain = key.startsWith('DxCPQ__') ? key.substringAfter('DxCPQ__') : key;
            if (allowed.contains(plain)) { kept.put(key, record.get(key)); }
        }
        return kept;
    }

    private static AuraHandledException fail(String message) {
        AuraHandledException exceptionToThrow = new AuraHandledException(message);
        exceptionToThrow.setMessage(message);
        return exceptionToThrow;
    }
}
