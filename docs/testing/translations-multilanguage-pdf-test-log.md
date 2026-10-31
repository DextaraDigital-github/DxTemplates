# Translations: CSV import and multi-language real PDF test

Follows `translations-ui-test-log.md`. Done as tester first, then as lead developer / architect. Org: scratch org `dxtemplates-scratch-30d`, template "ZZ Translation Test" (Header, Context, Footer), account Datamatics.

## Test set-up (reusable)

- `docs/tools/org-seed/make_translation_seed.js` writes `seed_translations.apex`: template "ZZ Translation Test" whose texts are `<<tokens>>`, and 13 translations in each of 7 languages (en_US, fr, de, es, ru, ja, zh_CN, 91 records): single words (Word1..3), a title, a sentence, a greeting with a merge field INSIDE the translation (`Hello {!Account.Name}`), a long paragraph (about 400 characters with commas, brackets, a question), special characters, header and footer texts, and translations of merge-field VALUES (`Customer - Direct` becomes `Client - Direct`, `Technology` becomes `Technologie`). Texts are written with `\u` escapes so that encoding cannot damage them.
- The PDF takes its language from the record: the Account language field named by the custom metadata (`DxCPQ__Document_Language__c`, see RL-3). It does not exist in the package, so for this test it was created in this org only (outside the repo, from the scratchpad) together with a permission set `ZZ_Test_Language_Field` for the test user (the field was not visible to Apex without field access). Neither is part of the product.
- Per language: set the Account's language, generate the document the way the browser does (`DisplayPDFController.getTemplateSections` then `generateDocument`, each in its own Apex run), render `renderAsPdfLWC` with the document Id, dump the PDF as base64 and read it with `readpdf.mjs`.

## CSV import: tester results

| # | Test | Result |
|---|---|---|
| I1 | Real browser: upload a CSV with 7 rows in five languages (language given as a name, `French`, and as a key, `de`), a quoted comma, Japanese and Russian text | The preview table listed all 7 rows. Create Translations saved all 7: language keys `fr`, `de`, `es`, `ja`, `ru`, quoted comma kept, Unicode intact. After Create the dialog showed the saved rows from the server. |
| I2 | Jest (9 tests): wrong file type, a row without Name, an unknown language, Windows line endings, key and name languages, server refusal, reload after create | All pass after the fixes below; 5 of them failed before. |

| # | Defect | Status |
|---|---|---|
| I-D1 | The preview table used an array as the `for:each` key (`key={row}`), which the engine rejects, so the preview failed to render in the test and gave invalid keys in the page. | FIXED (rows and cells get generated keys, getter `previewRows`). |
| I-D2 | A language given as a key (`fr`) instead of its English name (`French`) became an empty language; an unknown language was imported silently with an empty language. | FIXED: names and org language keys are accepted; an unknown language is refused with "Row n: language X is not known" and Create stays disabled. |
| I-D3 | After a successful Create the dialog was filled with the imported rows (without record Ids), so pressing Save there would have created them again. | FIXED: the saved translations are loaded from the server. |

## Multi-language real PDF: tester results (before the fixes)

| Language | Body, header, footer, record values | Result |
|---|---|---|
| en_US | words, sentence, merge field inside the translation, long text wrapped, record values, page number | Correct. |
| fr, de, es | accents (é è ç ü ß ñ ¿ ¡), « » „ “ ”, €, apostrophes, long text wrapped | Correct. |
| ru | no Cyrillic at all: only Latin parts and punctuation were left (also header, footer, record values) | FAIL (T-D12) |
| ja, zh_CN | no Japanese or Chinese characters at all | FAIL (T-D12) |

Other findings of the test: the untranslated token stays as `<<NoTranslation>>` in every language (kept; matches the earlier behaviour); an unknown tag such as `<apply>` in a translation disappears (see T-D11, which turned out NOT to be a code defect).

## Fixes (lead developer / architect)

| # | Defect and fix | Status |
|---|---|---|
| T-D12 | **Cyrillic, Chinese and Japanese text is missing from the PDF.** The PDF engine prints with Times, which has no glyphs for those scripts. Fix: `DisplayPDFController.getUseUnicodeFont()` (true when body, header or footer hold a character outside Western European Latin; Latin-1 and the Windows-1252 punctuation do not count) and a rule in `renderAsPdfLWC.page` that then prints the document in Arial Unicode MS. Documents without such text keep Times (checked: en and es still Times). 6 Apex tests. | FIXED and verified in the real PDF for ru, ja, zh_CN: all body, header, footer and record-value text prints; font in the PDF is ArialUnicodeMS. |
| T-D13 | **Long Chinese and Japanese paragraphs did not wrap**: they stay on one line and the part beyond the page edge was lost (about half of the Japanese paragraph). The engine breaks lines only at spaces; `word-wrap` and a zero width space were tried and have no effect. Fix: `addCjkLineBreaks` puts a space inside a 1px span (`span.cs`) between two adjacent CJK characters, outside HTML tags, so lines can break anywhere and the text still looks closed. 3 Apex tests. | FIXED and verified: the whole Japanese and Chinese paragraphs print, wrapped over 4 to 6 lines, no visible gaps. |
| T-D11 | The text `<apply>` disappeared from translations. First I blamed the tag removal in `MergeFieldsClass` and changed it; that was wrong: `Translator__c.Translated_Value__c` is a Rich Text field, so Salesforce itself removes unknown tags and turns `&`, quotes and apostrophes into entities when the record is saved. The code change was reverted (it would have shown real Word-style tags as text). | NOT A CODE DEFECT; see observations. |

## Observations for the UI discussion

| # | Observation |
|---|---|
| U-T6 | The translation dialog shows the stored text of the Rich Text field, so an apostrophe appears as `l&#39;expédierons` in the Translated Value box. Saving it again does not double the escaping (checked in the org), and the PDF prints a normal apostrophe. Consider a plain text field or decoding for display. |
| U-T7 | Text in angle brackets cannot be stored in a translation (Rich Text field). |
| U-T8 | Importing the same CSV twice creates every row twice (the import only inserts; the PDF then uses one of the duplicates). |
| U-T9 | Header, footer and body all use the one Unicode font when a document has any non-Latin text, so a mixed document loses Times for its Latin text as well. Per-run fonts are not possible in this PDF engine. |
| U-T10 | A Korean or Arabic translation was not tested in the PDF (Arabic is right-to-left; Korean has spaces). |
EOF
echo written