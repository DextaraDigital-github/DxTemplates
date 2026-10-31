# Related Objects section: UI test log

Component: `templateRelatedObjects` (2,045 lines JS, 309 lines HTML). Org: scratch org `dxtemplates-scratch-30d`, template "ZZ Clip Test", section "RO Opps" (Opportunity under Account). Same method as the Table and Context logs. Jest baseline before this round: 9 tests.

Where it is stored: the whole configuration is JSON in `Section_Content__c` of the section record (not `Section_Details__c`, which stays empty). The PDF builds the table and chart on the server from this JSON and live data, so the saved record has no HTML to inspect.

## Results

| # | Test | Result |
|---|---|---|
| R1 | New Related Objects section, type a name, pick Opportunity from the "Select the Related Object" list | Pass. The list is searchable; typing "Opportunity" shows Opportunity and OpportunityPartner. |
| R2 | Pick fields (Stage, Name, Amount) with the right arrow | Pass. Fields appear in the order they were added; a preview table with the headers and `<data>` cells shows below. |
| R3 | Sub Total field: choose Amount | Pass. Amount shows as a pill; the chart field list then offers Amount. |
| R4 | Configure Chart ticked: choose chart field Amount, "Chart in new page" stays ticked | Pass. A "CHART SECTION" with a sample bar chart (placeholder values, groups 1 to 4 and "Others") appears. |
| R5 | Category (grouping): stagename | Pass. The preview groups the rows under the 10 Opportunity stages. |
| R6 | Save | Pass. Toast "Section RO Opps was Saved"; record created at sequence 4, type Related Objects, JSON saved: `mainChildObject` Opportunity, `childLookupfieldAPIname` AccountId, `subTotal` [Amount], `displayChart` true, `selGraphvalue` Amount, `chartNewPage` true, `grouping` stagename, `tablelistValues` [StageName, Name, Amount], all stage values. |

| R7 | Preview of the template for account Datamatics, with the single seeded Opportunity | Pass. Group heading PROSPECTING, one row (Prospecting, Acme Renewal 2026, 12345.0), Sub Total and Grand Total rows, and a chart with one full-height bar (100%). |
| R8 | Preview with 10 Opportunities in 7 stages (seed: `docs/tools/org-seed/seed_opportunities.apex`) | Pass. One group per stage, each with a Sub Total, then a Grand Total. Chart has 7 bars with correct values and shares: Closed Won 250000 is 52% of 478,947; Prospecting 16046 (3 records) is 3%. |
| R9 | Number formatting in the preview | As configured: currency format "x.y" shows 7800.1 and 250000.0, and the chart labels drop the decimals (12000 for 12000.25). The default currency format has one decimal, which is odd for money. |

| R10 | **Real PDF** of the whole "ZZ Clip Test" template (activate, PDF Generator for Datamatics, A4 Portrait; attachment read with pdfjs) | 4 pages. Page 1 is empty (see R-D3). Page 2: Context text in Courier-Bold, the Tables, then the Related Objects table; page 3: the last group, then Grand Total 478946.6 (correct: 7800.1+250000+56000+12000.25+98000+39100.75+16045.5); page 4: "Chart" on its own page ("Chart in new page") with 7 bars and the right values and shares (Closed Won 250000, 52%). The table and the chart are rendered with the section's colours (header grey, Sub Total blue 0,119,182, Grand Total dark blue). |
| R11 | Fonts and sizes in that PDF | The Related Objects table is entirely in Times (serif): R-D1 confirmed. Sizes are as configured (10px prints as 7.5pt). |
| R12 | Rounding in that PDF | Amounts print with one decimal: 12000.25 as 12000.3, 35000.75 as 35000.8, and the Qualification Sub Total as 39100.8 instead of 39100.75. The default currency format is "x.y". |

## Defects

| # | Defect | Status |
|---|---|---|
| R-D1 | The saved font family was a lone `Verdana` (default, even when the dropdown showed Times New Roman) and the Courier option was lowercase `courier`; the PDF prints both in Times (same as Table D11 and Context C-D1). Now the default is `Verdana, sans-serif`, the Courier option is `courier, monospace`, a Verdana option was added to the dropdown, and old saved values are upgraded when a section is opened. The logic is in a new shared helper `dxPdfFonts` (10 Jest tests, failed first because the module did not exist). | FIXED and UI-verified: after clearing the page caches, reopening "RO Opps" and pressing Save stored `Verdana, sans-serif` for both the header and the category style (it was `Verdana`). The Related Objects PDF itself has not been regenerated since; the stack is the one measured to give Helvetica in the Table PDF. |

| R-D6 | **Reopening a saved section and saving it again lost the Sub Total fields** (and with them the chart settings on the next open). The pills were rebuilt from the saved labels, but the save writes a separate list of values that was not restored, so the save wrote `subTotal: []`; and the chart is only restored when `subTotal` is not empty. Found while testing field reorder and formats in the browser (saved `subTotal` was `[]` although the Amount pill was showing). Now the values are restored together with the labels. | FIXED. Jest test (first one for the load-then-save path of this component, 10 tests now) failed first with `[]` instead of `["Amount"]`. UI-verified: after reopening and saving, `subTotal` stays `["Amount"]` and `displayChart` and `selGraphvalue` are kept. |

## Defect candidates

| # | Candidate |
|---|---|
| R-D2 | RETRACTED. `dateFormat` `564/` is just the internal code of the "mm/dd/yyyy" option (the dropdown values are codes: `654/*` is dd/MMM/yyyy). Not a defect. |
| R-D3 | RETRACTED (owner, 2026-10-30): a New Page section must start on a new page, so an empty page 1 when the first section has New Page ticked is the intended behaviour. |
| R-D4 | FIXED (owner agreed 2026-10-30: groups follow the picklist order). Cause: both `DisplayRelatedObjects.cls` (Preview and PDF data) and `ROsectionAutomationController.cls` (automation HTML) queried `order by <grouping field> desc`, which reverses a picklist. Now `asc nulls last` (the "Others" group for empty values stays last). The 15 `DisplayRelatedController_Test` tests pass (none asserts the order). UI-verified in the Preview of "ZZ Clip Test": Prospecting, Qualification, Needs Analysis, Proposal/Price Quote, Negotiation/Review, Closed Won; chart bars in the same order; Grand Total still 463346.00. A new real PDF has not been generated after the fix. Original finding: in the Preview and the PDF the groups (and the chart bars) come out in the REVERSE of the picklist (stage) order: Closed Won, Negotiation/Review, Proposal/Price Quote, Needs Analysis, Qualification, Prospecting, whereas the editor sample shows Prospecting first. Looks unintended; decide before changing (a user probably expects the stage order). |
| R-D5 | FIXED (owner agreed, 2026-10-30): the default currency format of a new section is now "x.yz" (two decimals) instead of "x.y" (R12); both the field default and the reset in `templateRelatedObjects.js`. Saved sections keep their own setting. No Jest test: the control only renders after an object and fields are chosen; checked in the browser instead. |

| R13 | Move up and move down in the chosen fields list; Add and Remove | Pass. Name moved above Stage and back; Description added at the end and removed again. A removed field returns to the top of the available list (not to its old place). |
| R14 | Serial-Number, Currency format x.yz, font Courier, then Save | Pass. Saved `SerialNumber` true, `currencyFormat` "2", `fontfamily` `courier, monospace`, field order Stage, Name, Amount. The editor preview switched to Courier. |
| R15 | Reopen the saved section | Pass: object, category, fields and Sub Total pill return, groups appear in the stage order in the editor preview. (The font dropdown still shows "Times New Roman".) |
| R16 | Add the Close Date field, choose date format dd/MMM/yyyy, Save, then Preview | Pass. Saved `tablelistValues` with `CloseDate` and `dateFormat` `654/*`; the sub total was kept. Preview shows dates like 29/Dec/2026, amounts with two decimals (x.yz: 35000.75, Sub Total 39100.75), serial numbers 1, 2 restarting inside each group, and the Courier font. |
| R17 | Apply Filter(s): Object Opportunity, Field Amount, Operator Greater than, Value 10000, Create Rule; then Save the section | Pass. A Rule (`Condition1`) and a Rule Condition (`amount > 10000`) were created; after the section Save, `RuleId__c` points to the rule and the section JSON holds `whereClause` `( amount > 10000 )`. The rule is created when the dialog's Create Rule is pressed, before the section is saved (a cancelled section edit leaves the rule behind). |
| R18 | Preview with that filter | Pass. Only opportunities above 10000 appear: Prospecting shows just Acme Renewal 2026, Qualification just RO Seed 3, Closed Lost is gone; Grand Total 463346.00 (= 478946.60 minus the four rows under 10000). The chart is built from the filtered data. |
| R19 | New Page ticked, header background #ffcc00, header font #cc0000, category background #e0f0ff, font size 12, Save | Pass. `New_Page__c` true and `newPage` true in the JSON; the style block holds the three colours and `12px`; the filter `whereClause` was kept. (The colours were set with a script on the colour inputs, not through the native colour picker.) |
| R20 | Delete a saved section ("RO Del", a copy seeded with Apex) | Pass. One click removes it from the section list and from the database, and the designer moves to the previous section. No confirmation is asked. |
| R21 | **Second real PDF** of "ZZ Clip Test" after the fixes (RO Opps with filter amount > 10000, Courier, Serial-Number, x.yz, dd/MMM/yyyy, New Page, the three colours, chart) | Pass. 4 pages: the table starts on page 3 (New Page); header "Sl No, Stage, Name, Amount, Close Date" in Courier, rows only above 10000 with Sub Totals and Grand Total 463346.00; dates like 18/Jan/2027; fills (255,204,0) header, (224,240,255) categories, header text (204,0,0); the chart is on page 4 with recalculated shares (Closed Won 54%, Needs Analysis 21%). The chart text is still Times (the chart ignores the chosen font). Page 1 is still empty (R-D3). |
| R-D7 | Same defect as R-D6 for a Sub Total field taken from a parent object (a field path such as `Account.NumberOfEmployees`): its value was never restored, so the save wrote `subTotal: []`; and the label was added once for every field of the parent object instead of once. Now one label and one value are added when the field matches. | FIXED. Jest test (parent field `Account.NumberOfEmployees`, 11 tests now) failed first with `[]`. Not checked in the browser (needs a section built with a parent-object number field). |

| R22 | Visibility filter (icon next to the section name, "Apply Visibility Filter(s)") | Partly by UI, partly by data. UI: the dialog opens, offers only the template's object (Account), and Create Rule created a Rule and a Rule Condition (`name == Nope`). The section Save then failed once ("Please Enter Name, Select Object & Fields before Saving") because the section had opened with an empty field list (load glitch right after the org login; after a fresh reload the fields were there), and a later click inside the dialog froze the browser tab, so the rule was attached with a data update instead. Effect: with rule "Account Name equals Nope" the Preview for Datamatics ends after the Table sections, the Related Objects section is hidden; with the value changed to "Datamatics" the whole section (table, Grand Total 463346.00, chart) is back. Rule detached again afterwards; two orphan Rule records (`a05RL00000c1qWwYAI` is the section filter, `a05RL00000c4SELYA2` the visibility test) remain. |

## Observations for the UI discussion

| # | Observation |
|---|---|
| U-R1 | The related object list shows every object in the org (AIInsightValue, AIRecordInsight, ...), not just objects related to the template's object; many cannot be a child of Account. |
| U-R2 | The Category list shows raw API names in lowercase (stagename, type, leadsource) instead of labels. |
| U-R3 | The chart field list stays empty until a Sub Total field has been chosen, and the chart is only used when a Category is also chosen. Nothing tells the user that. |
| U-R4 | The sample chart shows "Y%" labels and placeholder values (2367510 and so on) that do not come from the data. |
| U-R5 | Clicking a field in the list and then Ctrl-clicking another selected only the last one when driven by automation; to re-check by hand. |
| U-R7 | Groups and chart bars are in alphabetical order of the stage (Closed Lost first), not in the order of the sales stages. |
| U-R8 | The chart has no value axis scale and its labels drop decimals. |
| U-R9 | The font dropdown does not follow the saved or chosen font: after reopening it shows "Times New Roman" while the table is in Courier (same pattern as Context U-C1). |
| U-R10 | The editor preview shows the categories in the stage order, but the real Preview and PDF show them in a different order (R-D4). |
| U-R11 | The filter dialog's Object Name list only offers the section's own object (Opportunity); there is no way to filter on a parent field from here. The Value box looks like a search box and the dialog gives no feedback when a rule is created (it just closes). |
| U-R12 | Delete removes the section at once, with no "Are you sure?" (same for the other section types; to confirm for them). |
| U-R6 | The page needs a lot of scrolling in a small window: Name, object picker, field lists, format rows, preview and chart are one long column. |

## Not yet tested (next)

Preview and the real PDF for this section (table, grouping, sub totals, chart); Remove (left arrow) and move up/down of fields; the format dropdowns for date, time, number and currency fields; font family, font size and colours; Serial-Number; New Page; the visibility filter and the "Apply Filter(s)" rule on the data; reopening a saved section; Delete; a section with a second related object (parent object field path); Clone.
