# Translations (translate icon): UI test log

Where it lives: the translation dialog is part of the designer `templateDesignerCMP` (markup `c-modal data-id="translation"`, handlers `handleTranslate`, `transRecordsRetrive`, `handleSave` and the cell handlers), backed by `LanguageTranslatorClass` (`selectedLangMethod`, `createUpdateMethod`, `deleteMethod`, `currectUserLang`, `getAllUserLanguages`). Translations are `Translator__c` records (`Name`, `FieldValue__c`, `Translated_Value__c`, `Language__c` = a user language key such as `en_US`, `DocumentTemplate__c`). The PDF side is `MergeFieldsClass.mergefieldsMethod`: it replaces `<<Name>>` tokens in a section with the translated value, and also translates the VALUES of merge fields (a record value equal to a "Field Value" is replaced by its translation). Org: scratch org, template "ZZ Clip Test". Jest: 9 tests (`translations.test.js`); Apex: 3 new tests (`LanguageTranslatorClassTest` 2, `MergeFieldsLanguage_Test` 2), 133 local Apex tests pass.

## Results

| # | Test | Result |
|---|---|---|
| T1 | Open the dialog | Pass. Opens with the language of the user (English) and the table of that language's translations for this template (one empty row when there are none). |
| T2 | Row 1 "Greeting / Greeting / Bonjour", add a second row, leave it empty, Save | Pass after fix T-D1: one red toast "Some of the row(s) Name has no values", the dialog stays open and the typing is kept (before: the dialog closed and the typing was lost). |
| T3 | Delete the empty row (trash icon) and Save | Pass. Toast "Record saved successfully", dialog closes. Org record: `Greeting`, `en_US`, `Greeting`, `Bonjour`, template ZZ Clip Test. |
| T4 | Server merge of a section `<<Greeting>> and {!Account.Name} and <<Unknown>>` (Apex run, no data changes) | Pass: `Bonjour and Datamatics and <<Unknown>>`. The unknown token stays as typed. |

## Defects

| # | Defect | Status |
|---|---|---|
| T-D1 | Save with a row without a name showed an error toast per empty row and then closed the dialog anyway, losing the typing. | FIXED (one toast, the dialog stays). Jest; browser (T2). |
| T-D2 | Save renamed the fields of the table rows in place (`DxCPQ__FieldValue__c` became `FieldValue`); after a failed save the rows showed empty texts. | FIXED (a copy is sent). Jest failed first. |
| T-D3 | The user was told "Record saved successfully" and the dialog closed whatever the server answered; `createUpdateMethod` returns false when it fails, and answered true even when single rows were refused (upsert without all-or-none, results ignored). | FIXED in both places: Apex returns false when any row is refused (the others are still saved) and logs it; the dialog shows an error and stays open. Apex test and Jest failed first. |
| T-D4 | Editing a row while the search was active replaced the full list with the rows shown, so the hidden rows disappeared (and were not saved). | FIXED (every edit goes to the shown row and the full list; Save sends the full list). Jest failed first. |
| T-D5 | A language without translations got the same empty row object as every other language, so text typed for one language showed up in the next. | FIXED (a new row each time). Jest failed first. |
| T-D6 | The table rows had `key={row.id}` (the field is `Id`), so every row had an undefined key. | FIXED. |
| T-D7 | The search failed with an error for a new row (its Id is a number, `value.toLowerCase` on a number). | FIXED. |
| T-D8 | The dialog sent an extra, unused parameter (`extractedWords`) to `selectedLangMethod`. | FIXED (removed). |
| T-D9 | `createUpdateMethod` failed for a row without an `Id` (`Pattern.matches` on null). | FIXED (guard); Apex test. |
| T-D10 | When the record has a language (custom metadata `Document_Translation__mdt` names the field), the value was split at the underscore: `en_US` became `US` and `fr_CA` became `CA`, which can never match `Translator__c.Language__c`, so translations were never applied for such records. | FIXED (the value is used as it is; `MergeFieldsClass.resolveLocale`, 2 Apex tests). Not seen in the PDF because no Account in the org has that field (see U-T2). |

## Observations for the UI discussion and decisions

| # | Observation |
|---|---|
| U-T1 | **Decision for the owner:** when the record has no language, the code ALWAYS uses `en_US` translations (a leftover `if (locale != null) locale = 'en_US'` overrides the user's own language). So a French user's translations (the dialog opens in the user's language) are never applied unless the Account has a language field. Kept as it is; should the user's own language be used instead? |
| U-T2 | The custom metadata record `Account_Language_Field` names `DxCPQ__Document_Language__c` on Account, but that field is not part of the package source or this org, so the lookup fails (caught) on every merge. Customers have to create the field themselves. |
| U-T3 | The icon next to the translate button inserts a merge field; rows can only be added one by one (+). Tokens must be typed as `<<Name>>` in the section text; there is no list of tokens found in the sections (the code that extracted them is commented out). |
| U-T4 | Deleting a saved row deletes the record immediately, even if Save is never pressed. |
| U-T5 | The Translated Value is inserted into the PDF text without HTML escaping (tags are stripped, `&` and `<` alone are not). |

## Not tested yet

Import of a CSV (upload icon: `handleFileUpload`, `parseCSV`, `insertTranslatedRecords`), choosing another language in the browser, translated merge-field VALUES in a real PDF, the dialog with an activated (read-only) template, a template without any translation in a real PDF.
