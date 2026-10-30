# Table section: UI test log and UI observations

Started 2026-10-29. Org `dxtemplates-scratch-30d`, template **ZZ Clip Test** (editable), sections `Seq A` (Context) and `Seq T` (Table). Browser: Chrome, foreground tab, 1280x495 viewport (short, so toolbar and grid are never on screen together).

This file has two parts that are meant to be read together in the UI discussion:
1. **Test results**: what was done, what was expected, what happened. Status: PASS, FAIL, UNCLEAR (not yet explained), NOT TESTED.
2. **UI observations**: things that are not defects but would be worth refining. Each has a short evidence note. These are opinions and notes, not decisions.

## 1. Test results

### 1.1 Section position (the B8 fix)

| # | Action in the UI | Expected | Observed | Status |
|---|---|---|---|---|
| T1 | New Context section "Seq A", type text, Save | Stored at position 0 | `Sequence__c` = 0 (query) | PASS |
| T2 | New Table "Seq T", 4 rows x 2 cols, Create Table, Save | Stored at position 1 (the old code stored 4, its row count) | `Sequence__c` = 1 (query) | PASS |
| T3 | Reload, open "Seq T", click Update (the load path) | Still 1 (old code: 4) | Still 1; the save really happened (LastModified 34 s before the check) | PASS |

### 1.2 Table menu (Add Row, Add Column, Delete Row, Delete Column)

| # | Action | Expected | Observed | Status |
|---|---|---|---|---|
| T4 | TABLE menu, Add Row (header + 4 body rows x 2 cols) | One more row | First two attempts had no visible effect (clicked 1 s after opening the menu); with the menu open for about 3 s it added a row (5 to 6 visual rows) | PASS, with a timing caveat (see U14) |
| T5 | TABLE menu, Add Column | One more column | 2 to 3 columns (worked once the menu had been open about 3 s) | PASS |
| T6 | TABLE menu, Delete Row | One fewer row | 6 to 5 visual rows | PASS |
| T7 | TABLE menu, Delete Column | One fewer column | 3 to 2 columns | PASS |

### 1.3 Per-cell formatting (header cell, row 1 column 1)

Each cell has its own toolbar that appears above the focused cell. Cells are focused through their "Compose text" textbox (clicking the cell area does not focus it).

| # | Action | Expected | Observed | Status |
|---|---|---|---|---|
| T8 | Type "Item" in the cell | Text appears | Appears; cell toolbar shows | PASS |
| T9 | Select all, Bold, Italic, Underline | Text bold, italic, underlined | All three applied; the buttons show as active | PASS |
| T10 | Strikethrough and Center align | Struck through and centered | Both applied | PASS |
| T11 | Cell Background-Color, hex #FFFF00, INSERT | Yellow cell | Cell turned yellow | PASS (on screen) |
| T12 | Cell font color: open picker, hex #FF0000, then Tab/Enter, or Escape | Red text | Text stayed dark. The picker's lower part (where a confirm control would be) is cut off by the editor card, so the colour could not be confirmed | FAIL or NOT REACHABLE: needs a retry with more vertical room; see U16 |
| T13 | Merge Right Cell (confirmation dialog, then MERGE) | Header cell spans both columns | Header spans both columns, text centered across it | PASS (merge) |
| T14 | After T13: is the yellow still there? | Yellow kept | Yellow gone on screen after the merge | FAIL, see D1 |
| T15 | Save the table | Saved with formatting | Toast "Section Seq T was Saved". `Sequence__c` = 1. Saved HTML has `colspan="2"`, the hidden second header cell, and the text with `<strong><em><strike><u>` and `text-align: center`. **But the merged header cell is `background-color: rgb(255, 255, 255)` in the saved HTML, while the details JSON still holds `backgroundColor: rgb(255, 255, 0)`** | PASS for text formatting and merge; FAIL for the background (D1) |

### 1.4 Defect candidates found while testing (not fixed)

| # | What | Evidence | Where to look |
|---|---|---|---|
| D1 | A header cell's own background colour is lost when the table re-renders (the merge triggered it), and the saved HTML (what the PDF renders) has the header background colour instead. The per-cell colour survives only in the details JSON. | T14 and T15 | `newfontsize()` runs on every render and sets `th.style.backgroundColor = this.selectedHbgColor` unless `this.tablecolumns` has a matching entry with a colour; `tablecolumns` holds only body cells (`row1col1`...), never the header ids (`Header 1`...), so a header cell is always overwritten. Not yet confirmed in the code beyond reading it. | **FIXED (commit 80ae3da, 2026-10-30), UI-VERIFIED.** The code also repainted body cells after a reopen (their "own colour" flag lives only in memory), so the fix keeps a set of cells with their own colour: filled when a cell colour is applied or loaded (saved colour differs from the section colour), emptied by Clear Cell and Clear Table, and skipped by `newfontsize()`. Jest test failed on old code, 19/19 now. UI: seeded pink H2 and yellow B1 in "Full T", opened it, changed font size 16 to 12, both colours stayed. Not yet checked: that the saved HTML/PDF carries the header colour (part of the coming Preview/PDF pass).
| D2 | The per-cell font colour picker cannot be confirmed in a normal window because its lower part is clipped. | T12 | See U16 |
| D3 | Unticking **Headers** and ticking it again destroys the header row's content and merge: "Item" and the merged header cell were replaced by blank, unmerged header cells. (Body content, the body merge and the serial-number column survived.) The destructive state was **not saved**; the database still has the earlier good version. | T22 | Not yet traced in the code |

### 1.5 Body cells and the table-wide toolbar

| # | Action | Expected | Observed | Status |
|---|---|---|---|---|
| T16 | Type "Row1" into body row 1, column 1 | Text appears; body-cell toolbar | Appears. The body toolbar has extra tools (Add Image, Merge Bottom Cell) | PASS |
| T17 | Merge Bottom Cell on that cell, then Save | The cell spans two rows | Saved HTML: `rowspan="2"` on `row1col1`, `display: none` on `row2col1`. (No confirmation dialog appeared this time, unlike Merge Right.) | PASS |
| T18 | Save again several times in the session | Section stays at position 1 | `Sequence__c` = 1 each time | PASS |
| T19 | Tick **S. NO** | A serial-number column | An "S.No" column with 1 to 4 appeared | PASS |
| T20 | **Borders** menu (No Borders, All Borders, Outside Borders, Thick Outside Borders, Thick Outside All Borders), choose All Borders | Grid lines on every cell | Black grid lines appeared | PASS for All Borders; the other four not yet tried. The menu icon did not change to show the active choice (U23) |
| T21 | Untick **Headers** | The header row disappears | Header row gone; H. FONT, H. BG, COL RESIZE and COL SWAP also disappeared, and the toolbar re-laid out (the Headers checkbox moved) | PASS (but see U22) |
| T22 | Tick **Headers** again | The earlier header comes back | A blank, unmerged header row; "Item" and the merge were lost | FAIL, see D3 |
| T23 | **Font size** 12 to 14 | Table text bigger | The dropdown offers 8, 9, 10, 12, 14, 16 and more; 14 was selected. The table text did not visibly change in the grid | UNCLEAR (not checked in the saved HTML) |
| T24 | Saved sequence after all of the above | Still 1 | Not re-saved after T21 to T23 on purpose (the state is damaged by D3) | n/a |

### 1.6 After reloading the saved table (second session of testing)

The page was reloaded to start from the saved version (the in-browser damage from D3 was discarded; the database still had the earlier good version).

| # | Action | Expected | Observed | Status |
|---|---|---|---|---|
| T25 | Reload, open "Seq T" | The saved structure comes back | Merged header "Item" (bold, italic, underline, strikethrough, centered), the body cell merged over two rows ("Row1"), 4 body rows x 2 columns | PASS for structure, text and merges |
| T26 | Same view: the header's yellow background | Yellow (it is in the details JSON) | White. D1 therefore also shows on reload, not only after a merge | FAIL (D1 confirmed on the load path) |
| T27 | Click into an **empty** cell and type | Text appears | Nothing: empty cells cannot be focused by clicking, in a table that has been saved and reopened (a just-created table was different: its cells took focus by their "Compose text" box). Clicking directly on existing text does focus the cell, and **Tab** moves to the next editable cell | FAIL or LIMITATION, see D4 and U28 |
| T28 | Align Right and Align Left in a cell | Text moves right then left | Both worked | PASS |
| T29 | Per-cell **Add New Row** (header + 4 rows, with a merged cell and text) | One more body row; content and merge kept | 5 body rows; "Row1", its two-row merge, "Z" and the header all intact | PASS |
| T30 | Per-cell **Add New Column** | One more column; content and merges kept | 3 columns; the header merge still spans the first two columns; text intact | PASS |
| T31 | Per-cell **Delete Row** with the cursor in row 3 (cell "Z") | Row 3 removed | The **last** (empty) row was removed; row 3 and "Z" stayed. The button acts on the last row, not the row you are in | FAIL as a behaviour vs. its label, see D5 |

### 1.7 Defect candidates and observations added in this pass

| # | What |
|---|---|
| D4 | After a table has been saved and reopened, **empty cells cannot be clicked into**, so a user cannot type into a blank cell without a text cell next to it and the Tab key (T27). A new table does not have this problem. Needs a check in the code (the saved view shows each cell as a static `div` and swaps to the editor only on interaction; an empty one has no height to click). |
| D5 | The per-cell toolbar's **Delete Row** and **Delete Column** act on the last row and column of the table, not on the row or column that contains the focused cell (T31). The same handlers are behind the TABLE menu, where "delete the last one" is understandable; behind a per-cell button it is misleading and can delete rows the user did not mean to. |

| # | UI observation |
|---|---|
| U28 | Cells that were saved empty look like dead space after reopening; there is no visible hint that they are editable. |
| U29 | A cell's Tab key moves through cells, but merged-away cells and empty cells are skipped or unreachable, so keyboard use is partly possible only. |
| U30 | The per-cell toolbar is about 35 px tall and floats above the focused cell, covering the neighbouring row; on the first rows it hides the table toolbar or the row just above. |

### 1.8 Still to test

Per-cell Delete Column and Clear Cell; Merge Right on a body cell; Add Merge Field and Add Image in a cell; the colour controls H. FONT, H. BG, B. FONT, B. BG and B. CLR; Font family; the other four border styles; Col Resize and Col Swap; the table-level CLEAR; the saved-HTML check for font size; and viewing the table in a generated PDF (needs an active template, which locks it, so a clone of this one would be used). Then: the fixes for D1, D3, D4 and D5 (after the testing is complete, as agreed), and the same cycle for the other section types.

## 2. UI observations (to discuss and refine)

Each item: what I saw, where, and why it may matter. No judgement on priority yet.

| # | Area | Observation |
|---|---|---|
| U1 | Table editor layout | The toolbar (fonts, colours, Table, Borders, S. NO, Headers, Col Resize, Col Swap) sits above the grid, and the grid sits below a tall toolbar. On a normal laptop window you cannot see the toolbar and the whole grid together, so every change needs a scroll to check the result. |
| U2 | Two save buttons | The top of every section editor has an "Update" button next to the name, and the bottom has "Save". They call the same handler. The two labels for one action are confusing, and Table has them far apart. |
| U3 | Table menu is icon-only | The "TABLE" and "BORDERS" menus are small icons with a tiny caption; Add/Delete Row/Column are hidden one level down. The same actions also appear as small icon buttons in the cell toolbar. |
| U4 | Save feedback | The success toast ("Section ... was Saved") is short-lived. With a slow page it is easy to miss; nothing else on screen shows "saved" (the Update/Save buttons look the same). |
| U5 | Unsaved-changes prompt | The browser's "Leave site?" prompt appears even right after a fresh load with no edits (every forced reload reported it). It cannot tell the user anything useful, and it blocks normal navigation. |
| U6 | New template opens Watermark Settings | Creating a template immediately opens a "Watermark Settings" dialog the user did not ask for. |
| U7 | Section type buttons | Adding a section uses four icon-only buttons at the top right ("Section : Context / Related Objects / Clause / Table"); the meaning is only in a hover tooltip. |
| U8 | New section placeholder | A newly added, unsaved section shows only its type ("Table") with an empty name in the section list until it is saved. |
| U9 | Row count wording | "Enter number of rows" counts body rows; the header row is extra (asking for 4 rows gives a header plus 4). This was already a user-visible surprise in an earlier session. |
| U10 | Table dimensions after creation | Once a table is created, the "number of rows / columns" inputs disappear; the size can then only be changed through the Table menu, one row or column at a time. |
| U11 | Section list vs. screen | The utility bar ("To Do List") overlaps the bottom of the page and the template list; on a short window a click on a low item can land on it. (This is Salesforce chrome, but it affects how the designer feels.) |
| U12 | Error toast text | The same designer shows both capitalised and lower-case error variants ("Error" vs "error") in its toasts; the visual result looks the same but the code is inconsistent. |
| U13 | Rich-text editor per cell | Every table cell is its own rich-text editor with its own toolbar appearing on focus. This is powerful but heavy: large tables mean many editors. |

| U14 | Menu responsiveness | The TABLE menu items did not react when clicked about a second after the menu opened; they worked after about three seconds. On a slow page this reads as "the button does nothing". (May partly be the automation's timing; worth checking with a real user on a normal org.) |
| U15 | Irreversible merge | Merge Right Cell opens a confirmation ("you will not be able to undo this action"). The warning is good; the lack of undo is the thing to discuss, since merging is easy to do by accident and the toolbar has no unmerge. |
| U16 | Colour picker is clipped | The cell font-colour picker opens as a dropdown that is cut off by the editor card when the table is near the bottom of the page; its lower part (and any confirm button) cannot be reached. The Background-Color control uses a separate dialog with an INSERT button and works. Two different patterns for two colour controls in the same toolbar. |
| U17 | Cell toolbar placement | The per-cell toolbar appears directly above the focused cell and covers the row above it (and for the first header row it covers the table toolbar's bottom edge). |
| U18 | Header cells have fewer tools | Header cells lack "Add Image" and "Merge Bottom Cell"; body cells have both. This is probably intended, but it is not visible to the user until they focus a cell. |
| U19 | Per-cell and table-level controls overlap | Add/Delete Row and Column exist both in the TABLE menu and in every cell's toolbar; Background-Color exists per cell and as H. BG / B. BG for the whole table. Several routes to the same result make it harder to predict which one wins (see D1). |
| U20 | Focusing a cell | Clicking a cell does not put the cursor in it; only the small editor area inside responds (known from earlier sessions). A user clicking in the empty part of a cell sees nothing happen. |
| U21 | No sign of what is selected after a merge | After merging, there is no highlight or message about the new cell; the text just moves to the middle. |

| U22 | Toolbar jumps when Headers is toggled | Unticking Headers removes four controls and the toolbar re-lays out, so the Headers checkbox itself moves to a different place. A second click where the checkbox used to be hits a different control (it opened Font Size). |
| U23 | Borders menu does not show the choice | After choosing All Borders the Borders icon in the toolbar still shows the "no borders" look, so you cannot tell which style is active without looking at the grid. |
| U24 | Merge confirmations are inconsistent | Merge Right asks for confirmation ("cannot be undone"); Merge Bottom merged straight away in my run. |
| U25 | Font colour feedback | The cell toolbar's colour swatch stays black after a colour is picked, and the picker has no visible apply step, so it is not clear whether a choice took effect. |
| U26 | Window size sensitivity | In a short window the table toolbar and the grid are never on screen together, so each change needs a scroll to see its effect; zooming the browser out (done for this testing) makes the editor much easier to use. |
| U27 | Toggling Headers is risky | Because of D3, a user who unticks Headers "just to look" and re-ticks it loses their header work without any warning. |

This list grows as the testing continues.


## 1.9 Seeded populated table "Full T" (3 x 3, content in every cell), round 2

Seeded with `docs/tools/org-seed/seed_full_table.apex` so the load path is tested with content in every cell.
Timing note: the per-cell toolbar needs about 2 s after a cell is focused before its buttons respond, so wait before clicking.

| # | Test | Result | Evidence |
|---|---|---|---|
| T32 | Clear Cell on A3 | PASS | A3 empty in the grid; saved JSON has `row3col1div` with `Content:""`. Other cells unchanged. |
| T33 | Merge Right on body cell A1 | PASS | Confirmation shown ("cannot undo"); A1 spans columns 1-2. Saved HTML: A1 `colspan="2"`, B1 `td` kept with `display: none`; saved JSON: `cellColspan:2` on A1. |
| T34 | H. BG colour (FFCC00) on a populated table | PASS (D1 not reproduced here) | Every header cell turns yellow; saved HTML: all three `th` have `background-color: rgb(255, 204, 0)`; JSON `headbackground:"#FFCC00"`. |
| T35 | Save of the edited table | PASS | Toast `Section "Full T" was Saved`; sequence stays 2 (B8 holds); header, merge and cleared cell all present after save. |

Observations
| # | Observation | Detail |
|---|---|---|
| U31 | Merged-away cell keeps its content | After Merge Right, B1's text ("B1") stays in the saved HTML inside a `display: none` cell and in the JSON. It relies on the PDF renderer honouring `display:none`; to be confirmed in the PDF check. |
| U32 | Colour picker apply step | The hex field changes the picker, but the panel re-lays out after the hex is typed, so DONE moves up; clicking its old position does nothing. |

| T36 | Reload and reopen Full T | PASS | Yellow header row, A1 merged over columns 1-2, A3 empty, all other cells as saved. Save and load agree. |

Still to test in the Table: Merge Bottom, per-cell Delete Column, Add Merge Field / Add Image in a cell, font colour controls (H. FONT, B. FONT, B. BG, B. CLR), font family and size, the other four border styles, Col Resize, Col Swap, table-level CLEAR, D3 re-check on a populated table, and the PDF view.

| T37 | Merge Bottom on body cell A2 (A3 below it already cleared) | FAIL (D6) | The cell spans rows 2-3 at once (no confirmation, see U24) but its text "A2" disappears immediately. Saved JSON: `row2col1div` `Content:""`, `cellRowspan:2`; saved HTML: empty div, and the merged `td` has lost its `background-color`. After a full page reload A2 is still empty, so the text is permanently lost. |

Defect candidates
| # | Defect | Detail |
|---|---|---|
| D6 | Merge Bottom drops the cell's text and background | `handleMergeRowClick` (templateTableDetails.js ~1909) stores the cell content read from `[data-id="<id>div"]`; in this run that read returned empty and the row-span entry saved empty content. Merge Right on A1 (same pattern) kept its text, so the trigger is not yet understood. Next: repeat on C2/B2 (cells with text and text below), then check whether the difference is the cell below being empty, or the cell having been clicked twice. Do not fix until the cause is reproduced. |

Test paused here: the Chrome extension disconnected mid-session. Resume at "repeat Merge Bottom on C2/B2".

| T38 | Merge Bottom on C2 (text above and below) after reload | PASS | C2 spans rows 2-3 and keeps "C2". |
| T39 | Merge Bottom on A2 on a freshly reseeded table (A3 still filled) | PASS | A2 spans rows 2-3 and keeps "A2". |

D6 narrowed: Merge Bottom does NOT lose text in general. It lost A2's text only in the earlier state where A3 had been cleared (Clear Cell) and A1 had been merged right in the same table, then saved. Suspects: (a) merging down into an empty cell, (b) the earlier Clear Cell / Merge Right leaving a stale entry for the cell. To reproduce: seed, Clear Cell on A3, save, reload, Merge Bottom on A2. Status: open, low-frequency.

## 1.10 Retraction of D6 and cell toolbar icon map

D6 is RETRACTED. In the T37 run I clicked the X at the right end of the cell toolbar expecting it to close the toolbar; X is actually **Clear Cell** and wiped A2 right after the merge. Merge Bottom itself is correct (T38, T39). Same lesson as B2: verify my own steps before calling a defect.

Cell toolbar, left to right (verified by clicking): font colour, B, I, U, S, align left/centre/right, merge-field (A), Add Image (picture), Merge Right (», confirmation), Merge Bottom (double chevron, no confirmation), Add Row (down arrow), Add Column (arrow to bar), trash (not yet tested, presumed Delete Row), Delete Column (clipboard-like icon), **X = Clear Cell**.

| # | Test | Result | Evidence |
|---|---|---|---|
| T40 | Per-cell Delete Column on A3 (column 1) | FAIL (D5 confirmed on a body cell) | The LAST column (C) disappeared, not column A; no confirmation. |
| T41 | Clear Cell (X) on A3 | PASS | A3 empties immediately; no confirmation, no undo. |

| # | Observation | Detail |
|---|---|---|
| U33 | X looks like "close" but clears the cell | The only close-like icon destroys content with no confirmation or undo. Merge Right asks for confirmation; this does not. Strong candidate for a confirmation or a different icon. |
| U34 | Toolbar has no tooltips | Hovering any icon shows no label; users have to guess (I did, and misread X). |

| T42 | Per-cell Delete Row (trash) on A3, the last row | PASS (inconclusive) | Row 3 removed, which is also the last row. |
| T43 | Per-cell Delete Row (trash) on A1, the first row, after reload | FAIL (D5 confirmed for rows) | Rows A1/A2 remained and the LAST row (A3 B3 C3) was removed instead; no confirmation. |

D5 now confirmed for both per-cell Delete Row and Delete Column: both always remove the last row/column instead of the one containing the focused cell. (The table-level TABLE menu versions were tested earlier and are separate.) Unsaved test state only; DB still holds the seeded table.

| T44 | Add Merge Field in a cell (A1, "Account Name") | PASS | Dialog lists Account fields; INSERT adds `{!Account.Name}` on a new line below "A1". Not yet saved or checked in the PDF. |

| T45 | Add Image in a cell (A2, "DextaraDatamaticsLogo") | PASS | Picker lists library images with a search box; image appears in the cell under "A2". |
| T46 | Save with merge field and image, then read the saved HTML | PASS | A1 saved as `<p>A1</p><p>{!Account.Name}</p>`; A2 as `<p>A2</p><p><img width="200px" height="200px" src="/sfc/servlet.shepherd/version/download/068RL00000OEehLYAT" /></p>`. Table is 2 body rows x 3 columns. |

| # | Observation | Detail |
|---|---|---|
| U35 | Image shows much larger in the editor than the saved 200 x 200 | The cell shows the logo roughly 200 px wide by a cropped height; nothing in the cell lets the user resize it. |
| U36 | Image uses a relative `/sfc/servlet.shepherd/...` URL | Fine in the editor; whether the PDF renderer resolves it must be checked in the PDF view (still pending, needs a template clone because activation locks it). |

## 1.11 Colour controls on the populated table (unsaved, extension dropped before save)

| # | Test | Result | Evidence |
|---|---|---|---|
| T47 | B. BG (body background) = #CCE5FF | PASS | All body cells turn light blue immediately. |
| T48 | B. FONT (body font colour) = #990000 | PASS | All body text turns dark red (image unaffected, as expected). |
| T49 | H. FONT (header font colour) = #000080 | PASS | Header text H1-H3 turns navy. |
| T50 | Borders menu | NOT DONE | In a short window the menu runs off the bottom (U37); retest after scrolling so the toolbar is near the top. |

| # | Observation | Detail |
|---|---|---|
| U37 | Borders dropdown clipped by the window | With the toolbar in its normal position only two of the five options are visible in a ~500 px high window. |
| U38 | Colour picker has no "no colour" choice | Each picker offers only Cancel or Done; clearing a colour back to none is not possible short of the CLEAR button. |

Still to test: Borders (5 styles), B. CLR, Font family and size, Col Resize, Col Swap, S. NO, table-level CLEAR, TABLE menu re-check, D3 re-check, save + DB check of these colour settings, PDF view.

## 1.12 Borders, border colour, S. NO, Col Resize, Col Swap, font family/size, save and reload (round 3)

| # | Test | Result | Evidence |
|---|---|---|---|
| T50 | Borders: Outside | PASS | Thin outer frame only. |
| T51 | Borders: Thick Outside | PASS | Heavier outer frame only. |
| T52 | Borders: Thick Outside All | PASS | Heavy outer frame plus thin inner lines. |
| T53 | Borders: No Borders | PASS | All lines disappear. |
| T54 | B. CLR (border colour) #FF0000 with All Borders | PASS | All lines red; saved JSON `borderstyle:"AllBorders"`, `bordercolor:"#FF0000"`; saved HTML every cell `border: 1px solid rgb(255, 0, 0)`. |
| T55 | S. NO (serial number column) | PASS | New first column "S.No" with 1, 2; saved `serialNumberColumn:true`, a `th.serialNumber` 30px wide. |
| T56 | Col Resize ticked, drag of the handle | INCONCLUSIVE | Ticking adds a "Use this cell to Resize Column" row with a blue handle per column; my synthetic drag moved the layout by only a few pixels. Needs a manual check by the user or a different drag method. |
| T57 | Col Swap ticked, drag column 1's swap cell onto column 2 | PASS in editor | H1 and H2 and their body cells (A1/B1, A2/B2) swap; saved header HTML order is `Header 2, Header 1, Header 3`. |
| T58 | Font size 16 and font family Courier | PASS | All cells change; saved JSON `fontsize:"16px"`, `fontfamily:"courier"`; saved HTML cells 16px, table `font-family: courier`. |
| T59 | Reload after save | PARTIAL | Font, size, border colour, S.No, headers checkbox restored. Swap and cell contents NOT restored, see D7 and D8. |

Defect candidates
| # | Defect | Detail |
|---|---|---|
| D7 | Col Swap is not restored when the section is reopened | Saved HTML (what the PDF uses) has the columns swapped (Header 2 first), but after a reload the editor shows the original order H1 H2 H3 / A1 B1 C1. The next Save from that screen therefore silently un-swaps the PDF. Likely cause: the editor rebuilds the grid from `sectionInfo` ids in id order and ignores the saved column order. |
| D8 | Cell content shown cut off after reload | After reload A1 shows only "A1" and A2 only "A2" with a small scroll control at the right; the second line (`{!Account.Name}`) and the image saved in the HTML are not visible. Needs one more look: scroll inside the cell, or check whether the row height is fixed. Saved HTML does still contain both, so this may be display only. |

| # | Observation | Detail |
|---|---|---|
| U39 | Little up/down scroll arrows inside cells | After the table is saved and reloaded, cells with more than one line show tiny scroll arrows instead of growing the row. |
| U40 | Border menu icon never reflects the choice | Same as U23: after reload the Borders icon still shows "no borders" although the saved style is All Borders. |

| T60 | Table-level CLEAR, Cancel | PASS | Dialog "discard all changes ... rebuild from scratch"; Cancel leaves the table untouched. |
| T61 | Table-level CLEAR, Submit | PASS | Returns to the "Enter number of rows / columns" form (pre-filled 2 and 3), table gone from the editor (unsaved; DB untouched until Save). |

D8 update: display only. The cell is a fixed-height scrolling box; clicking it expands it and shows all content (`{!Account.Name}` visible). Content was never lost. Downgraded to UI observation U39.

| T62 | Headers unticked then re-ticked on the populated saved table (D3 re-check) | FAIL (D3 confirmed) | Unticking removes the header row and keeps the body; re-ticking brings back an EMPTY header row (H1, H2, H3 text gone). Same as the earlier finding on a fresh table, now shown on a saved, populated one. Unsaved test state only. |

## 1.13 Preview (rendered output) of the saved Full T

Template Preview with account "Datamatics" (Preview needs an account that exists; the seed org has only "Sample Account for Entitlements" and "Datamatics").

| # | Test | Result | Evidence |
|---|---|---|---|
| T63 | Preview shows saved Full T | PASS | Header order H2, H1, H3 (the swap IS in the output), S.No column 1 and 2, Courier 16, red borders on every cell, A1 shows "A1" and the merge field resolved to the account name ("Datamatics"), A2 shows "A2" with the logo image (relative `/sfc/servlet.shepherd` URL resolves in Preview, U36 closed). |
| T64 | Preview of the earlier table "Seq T" | Seen only | Renders with its saved border/size settings; not inspected in detail. |

D7 is therefore a real mismatch: the output has the swap, the editor on reopen does not. A second Save from the reopened editor would silently undo the swap in the output.

## Table testing summary (T1-T64)
Everything in the Table editor has now been exercised except: Col Resize (drag inconclusive, T56), Merge Right/Bottom on HEADER cells (header merge was tested earlier on the fresh table), and PDF download as a real file (Preview only). 
Defects to fix (in this order): D5 (per-cell Delete Row/Column hit the last row/column), D3 (Headers toggle wipes header text), D7 (Col Swap not restored on reopen), D1 (header cell colour overridden), D2 (font-colour picker clipped), D4 (empty cells not clickable after reopen).
Retracted: D6, D8 (display only).

## 1.14 Fixes

| # | Defect | Outcome | Evidence |
|---|---|---|---|
| D3 | Headers toggle wipes header text | FIXED | Jest test "brings the header text back when Headers is unticked and ticked again" failed on the old code (header values `undefined`) and passes now (17/17 Table tests). In the real UI, on the deployed fix: Full T, untick Headers (header row disappears), re-tick: H1, H2, H3 are back. New method `restoreHeaderCells()` re-applies text, background and merge from `divContentArray` after the header row is rebuilt. |
| D5 | Per-cell Delete Row / Delete Column hit the last row/column | RECLASSIFIED, no code change | The handlers are documented and designed as "delete the last row/column" and are symmetrical with Add Row/Add Column, which append at the end. The defect is the placement: those four buttons sit in the per-cell toolbar and look cell-specific. Deleting an arbitrary row needs renumbering of the `rowNcolM` ids and content keys (risk of loss), so it is a UI/feature decision for the discussion, see U41. |

| # | Observation | Detail |
|---|---|---|
| U41 | Add/Delete Row/Column in the per-cell toolbar act on the table end | Add Row/Column append and Delete Row/Column remove the last one, whichever cell is focused. Options: move them out of the cell toolbar, relabel "Delete Last Row", or implement real per-cell delete. |
| D9 (latent) | Content is re-applied by `startsWith` on the cell id | `item['data-id'].startsWith(element.dataset.id)` (load path, ~line 1348): "row1col1" also matches "row1col10", and "Header 1" also matches "Header 10". Tables with 10 columns could show cell 10's content in cell 1. Not yet reproduced in the UI. |

| D7 | Col Swap not restored on reopen | FIXED AND UI-VERIFIED (2026-10-30) | Save now stores `columnOrder` (header ids in display order) and the load path calls `applyColumnOrder()` right after the table is rebuilt; invalid or missing order leaves the default (old sections unaffected). Jest: the new test failed on the old code and passes now (18/18). Deployed to the scratch org; real-UI check done on "Full T": dragged H1 onto H2 with Col Swap, Save, DB showed `columnOrder` ["Header 2","Header 1","Header 3"], page reload and reopen showed H2/H1/H3 with B/A/C body columns, and the saved Section_Content__c lists cells in the same order (H2 H1 H3 / B1 A1 C1 / B2 A2 C2), so Preview/PDF match. Existing sections saved before this change have no `columnOrder` and still reopen in the default order until they are saved again. |

## 1.15 Fixes and Preview/PDF pass (2026-10-30)

| Item | Result |
|---|---|
| D1 | FIXED and UI-verified (commit 80ae3da). After a real Save the saved HTML carries the header colour (Header 2 = rgb(255, 192, 203)) and the body cell colour (B1 = rgb(255, 255, 0)). |
| D7 | FIXED and UI-verified (commit a003aa4), Preview matches the swapped order. |
| D10 (new) | **Font family not applied to the table when a section is reopened.** The dropdown showed the saved font (Courier) but the table kept Verdana and the next Save wrote Verdana into the HTML. Found because the Preview text was not Courier. Cause: the font family was applied only in `handlefontfamilyChange`. Fix (commit c5248d9): `newfontsize()` sets `.mytable` font-family from `this.fontfamily` on every render. Jest test failed before and passes after (20/20). UI: reopened Full T showed Courier, Save wrote `font-family: courier`. |
| Preview of Full T (account Datamatics) | Matches the editor: swapped columns H2/H1/H3, S.No column, red borders, merge field resolved to "Datamatics", image shown. Font was Verdana before D10 (see D10). |
| D2 | Still open (font-colour picker clipped). |
| D4 | Reproduced again on "Seq T": clicking an empty cell and typing does nothing. The accessibility tree shows only the cell that has been activated has a "Compose text" textbox; cells holding text show a static text element. Needs inspection of the rich-text editor's internal DOM, not possible with the extension (shadow DOM is closed). Still open. |
| PDF | NOT verified. The PDF page (`renderAsPdfLWC`, controller `DisplayPDFController`) renders from a generated `Document__c` and needs `Document_Content__c` (header/footer JSON), which Preview-created documents (D-0020..D-0022) do not have, so it prints "ID not found". Chrome's PDF viewer cannot be screenshotted by the extension. Next: generate a document through the real flow (Account page, generatePDF / NavigateToDocument) and read the PDF, or have the user open it and share a screenshot. |
| U42 | Clicking a section in the list sometimes appears to freeze the tab for 30+ seconds in the automation (Seq T, Preview). It recovered each time; a slow render rather than a native dialog (the Preview dialog was open and working when the tab came back). |

## 1.16 Real PDF flow and further fixes (2026-10-30, later)

**How the real PDF is produced (for repeating this test).** Activate the template (ACTIVATE button), open `/lightning/cmp/DxCPQ__NavigateToDocument?c__recordId=<Account Id>` (the "DXTemplates PDF Generator"), pick the template, A4, Portrait, Generate PDF. This creates a master `Document__c` (sequence -1), a body `Document__c` and an Attachment `<AccountId>.pdf` on the master. Read the PDF by downloading the Attachment body through REST (`/services/data/v61.0/sobjects/Attachment/<id>/Body`, bearer token from `sf org display`) and inspecting it with pdfjs-dist in Node (text, fonts, fill colours, image count). Chrome's PDF viewer cannot be screenshotted by the extension. Activating a template also sets `Previously_Active__c`, which locks the template for editing for good (the versioning design), so reset it with Apex on throwaway test templates (`IsActive__c` and `Previously_Active__c` to false).
**Two traps found while testing:** (1) `PageReference.getContentAsPDF()` in anonymous Apex cannot see data changed earlier in the same transaction (the page is fetched in a separate session), so each edit and each render must be a separate Apex run; (2) the page has `cache="true"`, add a throwaway URL parameter per render.

| Item | Result |
|---|---|
| Real PDF of "Full T" (D-0023/D-0024) | Cell text, swapped column order (H2 H1 H3), S.No, merge field resolved to Datamatics, one image painted, fills pink (255,192,203), yellow (255,255,0) and red borders (255,0,0) are all present. The page is A4 (595x842). Before D11 the table font was Times, now Courier. |
| D11 (new) | **The PDF engine only knows generic font names.** Measured by rendering the same table with each value: `courier` (lowercase, the old Courier option) gives Times; `Courier` and `monospace` give Courier; `sans-serif` gives Helvetica; `serif` gives Times; `Verdana`, `Arial`, `Helvetica` and `Times New Roman` as names give Times. So the old Verdana option (and the default) printed in Times. Stacks work: `Verdana, sans-serif` gives Helvetica, `courier, monospace` gives Courier. Fix (commit 05f07d5): option values are now `sans-serif`, `Verdana, sans-serif`, `serif`, `courier, monospace`; saved `Verdana` and `courier` are upgraded when a section is opened. Jest: 3 new tests, failed first. UI: reopened Full T showed Courier, Save wrote `courier, monospace`, real PDF used Courier. Sections that are not reopened and saved keep the old value in their saved HTML (Times in the PDF) until they are saved again. |
| D9 | **Confirmed and FIXED** (commit 9f50fe7). A 10-column table showed H10 and J1/J2 in column 1 (prefix match). Exact id matching now; Jest test failed first. UI-verified on "Wide T" (seed: `docs/tools/org-seed/seed_wide_table.apex`): H1..H10 and A1..J1. |
| Deploy caching | After a deploy, the first page load still ran the old component; a second reload picked up the new one. |
| U43 | In Courier at 12 pt the "S.No" header is wider than its 5% column and runs into the next column in the PDF. |
| D2, D4 (superseded by the next two rows) | Not reachable earlier in the session; the toolbar only shows for a cell that has the caret in it, and a user's screenshot showed it appears normally. |
| D4 | **Understood and FIXED.** The first click on a cell that has not been used since the section was opened only builds the cell editor and leaves it without focus; a second click focuses it. `focusCellOnFirstClick()` now focuses the editor after the first click (retries at 0, 150 and 400 ms because the editor needs a moment to build; once per cell element). Jest: new test failed first (24 tests now). UI (Seq T, 1280x495 window): one click on an untouched cell shows the toolbar and typing "abc" lands in the cell; before the fix the same click and typing did nothing. |
| D2 (decision) | **Closed as a small-window limitation, no code change.** I tried scrolling a cell near the top to the middle of the window on click (Jest passed) and reverted it: in a 495 px window the page is already at its end, so scrolling cannot make room, and the picker is the platform's own widget (about 300 px tall). On a normal-height screen there is room above the toolbar. Revisit only if a user reports it on a normal screen. |
| D2 (observation) | **Reproduced, NOT fixed.** Clicking the font-colour dropdown arrow in the cell toolbar opens the colour picker upward from the toolbar; with the toolbar near the top of the visible area, the top of the picker (the colour gradient) is cut off by the page header. Also, opening the picker takes the caret out of the cell. Likely depends on window height (a 1080 px window has room above the toolbar); needs a check on the user's screen with a cell near the top. |
