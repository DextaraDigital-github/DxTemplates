@IsTest
private class PlaceholderMerge_Test {
    private static String relatedType() {
        return Document_Template__c.Related_To_Type__c.getDescribe().getPicklistValues()[0].getValue();
    }

    private static Document_Template__c makeTemplate(String name) {
        Document_Template__c template = new Document_Template__c(Name = name, Related_To_Type__c = 'Account');
        insert template;
        return template;
    }

    private static Document_Template_Section__c makeSection(Document_Template__c template, String name, String type, Integer sequence, String content) {
        Document_Template_Section__c section = new Document_Template_Section__c(Name = name, Document_Template__c = template.Id, Type__c = type, Sequence__c = sequence, Section_Content__c = content);
        insert section;
        return section;
    }

    private static Map<String, String> runMerge(List<Document_Template_Section__c> sections, Map<String, Object> replaceData) {
        Account account = [SELECT Id FROM Account LIMIT 1];
        List<Document_Template_Section__c> merged = MergeFieldsClass.mergefieldsMethod(sections, account.Id, replaceData);
        Map<String, String> byName = new Map<String, String>();
        for (Document_Template_Section__c section : merged) { byName.put(section.Name, section.Section_Content__c); }
        return byName;
    }

    private static String table(String bodyRows) {
        return '<div><table><thead><tr><th>Product</th><th>Qty</th></tr></thead><tbody>' + bodyRows + '</tbody></table></div>';
    }

    @TestSetup
    static void data() {
        insert new Account(Name = 'Datamatics', Industry = 'Technology');
    }

    // ---------------------------------------------------------------- a table inside a Context or a table (##Section name##)

    @IsTest
    static void aTableIsTakenFromTheSameTemplateAndNotFromAnotherOneWithTheSameName() {
        Document_Template__c mine = makeTemplate('Mine');
        Document_Template__c other = makeTemplate('Other version');
        makeSection(other, 'Items', 'Table', 0, table('<tr><td>WRONG TEMPLATE</td><td>1</td></tr>'));
        Document_Template_Section__c context = makeSection(mine, 'Intro', 'Context', 0, '<p>See ##Items##</p>');
        Document_Template_Section__c items = makeSection(mine, 'Items', 'Table', 1, table('<tr><td>RIGHT</td><td>1</td></tr>'));

        Map<String, String> merged = runMerge(new List<Document_Template_Section__c>{ context, items }, new Map<String, Object>());

        System.assert(merged.get('Intro').contains('RIGHT'), merged.get('Intro'));
        System.assert(!merged.get('Intro').contains('WRONG TEMPLATE'), 'the table of another template must not be used');
        System.assert(!merged.containsKey('Items'), 'the embedded table is not printed a second time');
    }

    @IsTest
    static void aTableWithMoneyAndBackslashesInItIsEmbeddedAsItIs() {
        Document_Template__c template = makeTemplate('Prices');
        Document_Template_Section__c context = makeSection(template, 'Intro', 'Context', 0, '<p>##Prices##</p>');
        Document_Template_Section__c prices = makeSection(template, 'Prices', 'Table', 1, table('<tr><td>Total $1,200.50 and C:\\temp</td><td>$2</td></tr>'));

        Map<String, String> merged = runMerge(new List<Document_Template_Section__c>{ context, prices }, new Map<String, Object>());

        System.assert(merged.get('Intro').contains('Total $1,200.50 and C:\\temp'), merged.get('Intro'));
        System.assert(merged.get('Intro').contains('<td>$2</td>'));
    }

    @IsTest
    static void aSectionNameWithBracketsAndDotsWorksAsAPlaceholder() {
        Document_Template__c template = makeTemplate('Names');
        Document_Template_Section__c context = makeSection(template, 'Intro', 'Context', 0, '<p>##Items (2.0)+##</p>');
        Document_Template_Section__c items = makeSection(template, 'Items (2.0)+', 'Table', 1, table('<tr><td>FOUND</td><td>1</td></tr>'));

        Map<String, String> merged = runMerge(new List<Document_Template_Section__c>{ context, items }, new Map<String, Object>());

        System.assert(merged.get('Intro').contains('FOUND'), merged.get('Intro'));
    }

    @IsTest
    static void mergeFieldsInsideAnEmbeddedTableAreResolved() {
        Document_Template__c template = makeTemplate('Fields');
        Document_Template_Section__c context = makeSection(template, 'Intro', 'Context', 0, '<p>##Facts##</p>');
        Document_Template_Section__c facts = makeSection(template, 'Facts', 'Table', 1, table('<tr><td>{!Account.Industry}</td><td>1</td></tr>'));

        Map<String, String> merged = runMerge(new List<Document_Template_Section__c>{ context, facts }, new Map<String, Object>());

        System.assert(merged.get('Intro').contains('Technology'), 'the field only used inside the embedded table: ' + merged.get('Intro'));
        System.assert(!merged.get('Intro').contains('{!Account.Industry}'));
    }

    @IsTest
    static void aTableInsideATableCellIsEmbeddedToo() {
        Document_Template__c template = makeTemplate('Nested');
        Document_Template_Section__c outerTable = makeSection(template, 'Outer', 'Table', 0, table('<tr><td><p>##Inner##</p></td><td>1</td></tr>'));
        Document_Template_Section__c innerTable = makeSection(template, 'Inner', 'Table', 1, table('<tr><td>INNER ROW</td><td>1</td></tr>'));

        Map<String, String> merged = runMerge(new List<Document_Template_Section__c>{ outerTable, innerTable }, new Map<String, Object>());

        System.assert(merged.get('Outer').contains('INNER ROW'), merged.get('Outer'));
        System.assert(!merged.get('Outer').contains('<p><div'), 'a table is not a child of a paragraph: ' + merged.get('Outer'));
    }

    @IsTest
    static void embeddedTablesAreStillProcessedWhenFlowOrApexValuesAreUsedInTheSameTemplate() {
        Document_Template__c template = makeTemplate('Both');
        Document_Template_Section__c context = makeSection(template, 'Intro', 'Context', 0, '<p>##Facts##</p>');
        Document_Template_Section__c facts = makeSection(template, 'Facts', 'Table', 1, table('<tr><td>FACT</td><td>1</td></tr>'));
        Document_Template_Section__c lines = makeSection(template, 'Lines', 'Table', 2, table('<tr><td>%%Items.Product%%</td><td>%%Items.Qty%%</td></tr>'));

        Map<String, String> merged = runMerge(new List<Document_Template_Section__c>{ context, facts, lines },
            new Map<String, Object>{ 'Items' => new List<Object>{ new Map<String, Object>{ 'Product' => 'Pen', 'Qty' => '2' } } });

        System.assert(merged.get('Intro').contains('FACT'), 'the embedded table: ' + merged.get('Intro'));
        System.assert(merged.get('Lines').contains('Pen'));
    }

    // The chained and multi-record generation loads the sections with its own query (the one used by documentAutomationController).
    @IsTest
    static void embeddedTablesAlsoWorkWhenTheSectionsAreLoadedForSeveralRecords() {
        Document_Template__c template = makeTemplate('Bulk');
        makeSection(template, 'Intro', 'Context', 0, '<p>##Facts##</p>');
        makeSection(template, 'Facts', 'Table', 1, table('<tr><td>{!Account.Industry}</td><td>1</td></tr>'));
        Account account = [SELECT Id FROM Account LIMIT 1];

        List<Document_Template_Section__c> sections = DisplayPDFController.getTemplateSectionsMulRecords(template.Id, new List<String>{ account.Id }, null);

        String all = '';
        for (Document_Template_Section__c section : sections) { all += section.Section_Content__c; }
        System.assertEquals(1, sections.size(), 'the embedded table is not a section of its own any more');
        System.assert(all.contains('Technology'), 'the table is in the Context and its field is resolved: ' + all);
        System.assert(!all.contains('##'), all);
    }

    // ---------------------------------------------------------------- values from a Flow or an Apex class (%%token%%)

    @IsTest
    static void aValueFromAFlowOrApexClassIsPlacedInContextText() {
        Document_Template__c template = makeTemplate('Letter');
        Document_Template_Section__c context = makeSection(template, 'Intro', 'Context', 0, '<p>Dear %%CustomerName%%, your total is %%Total%%.</p>');

        Map<String, String> merged = runMerge(new List<Document_Template_Section__c>{ context },
            new Map<String, Object>{ 'CustomerName' => 'Datamatics', 'Total' => '$1,200.50' });

        System.assertEquals('<p>Dear Datamatics, your total is $1,200.50.</p>', merged.get('Intro'));
    }

    @IsTest
    static void aListFromAFlowOrApexClassFillsTheRowsOfATable() {
        Document_Template__c template = makeTemplate('Lines');
        Document_Template_Section__c lines = makeSection(template, 'Lines', 'Table', 0, table('<tr><td>%%Items.Product%%</td><td>%%Items.Qty%%</td></tr>'));

        Map<String, String> merged = runMerge(new List<Document_Template_Section__c>{ lines },
            new Map<String, Object>{ 'Items' => new List<Object>{
                new Map<String, Object>{ 'Product' => 'Pen', 'Qty' => '2' },
                new Map<String, Object>{ 'Product' => 'Ink', 'Qty' => '5' },
                new Map<String, Object>{ 'Product' => 'Pad', 'Qty' => '9' } } });

        String content = merged.get('Lines');
        System.assertEquals(4, content.countMatches('<tr'), '1 header row and 3 data rows: ' + content);
        System.assert(content.contains('<td>Pen</td>') && content.contains('<td>Ink</td>') && content.contains('<td>Pad</td>'), content);
        System.assert(!content.contains('%%'));
    }

    @IsTest
    static void valuesWithMoneyAmpersandsAndAngleBracketsGoIntoTheTableSafely() {
        Document_Template__c template = makeTemplate('Safe');
        Document_Template_Section__c lines = makeSection(template, 'Lines', 'Table', 0, table('<tr><td>%%Items.Product%%</td><td>%%Items.Qty%%</td></tr>'));

        Map<String, String> merged = runMerge(new List<Document_Template_Section__c>{ lines },
            new Map<String, Object>{ 'Items' => new List<Object>{
                new Map<String, Object>{ 'Product' => 'Smith & Sons', 'Qty' => '$1,200' },
                new Map<String, Object>{ 'Product' => 'a < b', 'Qty' => '<b>bold</b>' },
                new Map<String, Object>{ 'Product' => 'Item <special> & more', 'Qty' => '<span style="color:red">hi</span>' } } });

        String content = merged.get('Lines');
        System.assert(content.contains('$1,200'), 'a dollar amount must survive: ' + content);
        System.assert(content.contains('Smith &amp; Sons'), 'an ampersand in text is escaped so the PDF page stays valid: ' + content);
        System.assert(content.contains('a &lt; b'), content);
        System.assert(content.contains('<td><b>bold</b></td>'), 'a value that is HTML is kept: ' + content);
        System.assert(content.contains('<span style="color:red">hi</span>'), 'HTML with attributes is kept: ' + content);
        System.assert(content.contains('Item &lt;special&gt; &amp; more'), 'angle brackets around an unknown word are text, not a tag: ' + content);
    }

    // A long list from a class or Flow: finding the rows and tokens with regular expressions failed with "Regex too complicated"
    // from about 5,000 rows.
    @IsTest
    static void aTableOfEightThousandRowsIsFilledWithoutRegexLimits() {
        Document_Template__c template = makeTemplate('Many rows');
        Document_Template_Section__c lines = makeSection(template, 'Lines', 'Table', 0, table('<tr><td>%%Items.Product%%</td><td>%%Items.Qty%%</td></tr>'));
        List<Object> items = new List<Object>();
        for (Integer i = 1; i <= 8000; i++) { items.add(new Map<String, Object>{ 'Product' => 'Item ' + i, 'Qty' => String.valueOf(i) }); }

        Map<String, String> merged = runMerge(new List<Document_Template_Section__c>{ lines }, new Map<String, Object>{ 'Items' => items });

        String content = merged.get('Lines');
        System.assertEquals(8001, content.countMatches('<tr'), '1 header row and 8000 data rows');
        System.assert(content.contains('<td>Item 8000</td><td>8000</td>'));
        System.assert(!content.contains('%%'));
    }

    @IsTest
    static void aTokenWithoutAValueIsNotPrintedAsPlaceholderText() {
        Document_Template__c template = makeTemplate('Missing');
        Document_Template_Section__c context = makeSection(template, 'Intro', 'Context', 0, '<p>Hello %%Nobody%%!</p>');

        Map<String, String> merged = runMerge(new List<Document_Template_Section__c>{ context }, new Map<String, Object>{ 'Other' => 'x' });

        System.assertEquals('<p>Hello !</p>', merged.get('Intro'));
    }

    @IsTest
    static void sectionsWithoutTokensAreLeftAlone() {
        Document_Template__c template = makeTemplate('Plain');
        Document_Template_Section__c plain = makeSection(template, 'Plain', 'Context', 0, '<p>No tokens here.</p>');
        Document_Template_Section__c lines = makeSection(template, 'Lines', 'Table', 1, table('<tr><td>%%Items.Product%%</td><td>%%Items.Qty%%</td></tr>'));

        Map<String, String> merged = runMerge(new List<Document_Template_Section__c>{ plain, lines },
            new Map<String, Object>{ 'Items' => new List<Object>{ new Map<String, Object>{ 'Product' => 'Pen', 'Qty' => '2' } } });

        System.assertEquals('<p>No tokens here.</p>', merged.get('Plain'));
    }
}
