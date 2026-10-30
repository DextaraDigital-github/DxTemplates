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

## Defect candidates

| # | Candidate |
|---|---|
| R-D1 | The saved font family is a lone `Verdana`; the PDF engine prints that in Times (same family of defect as Table D11 and Context C-D1). To confirm in the real PDF. |
| R-D2 | `dateFormat` was saved as `564/`, which looks like an internal code rather than a format. To check against the PDF output. |

## Observations for the UI discussion

| # | Observation |
|---|---|
| U-R1 | The related object list shows every object in the org (AIInsightValue, AIRecordInsight, ...), not just objects related to the template's object; many cannot be a child of Account. |
| U-R2 | The Category list shows raw API names in lowercase (stagename, type, leadsource) instead of labels. |
| U-R3 | The chart field list stays empty until a Sub Total field has been chosen, and the chart is only used when a Category is also chosen. Nothing tells the user that. |
| U-R4 | The sample chart shows "Y%" labels and placeholder values (2367510 and so on) that do not come from the data. |
| U-R5 | Clicking a field in the list and then Ctrl-clicking another selected only the last one when driven by automation; to re-check by hand. |
| U-R6 | The page needs a lot of scrolling in a small window: Name, object picker, field lists, format rows, preview and chart are one long column. |

## Not yet tested (next)

Preview and the real PDF for this section (table, grouping, sub totals, chart); Remove (left arrow) and move up/down of fields; the format dropdowns for date, time, number and currency fields; font family, font size and colours; Serial-Number; New Page; the visibility filter and the "Apply Filter(s)" rule on the data; reopening a saved section; Delete; a section with a second related object (parent object field path); Clone.
