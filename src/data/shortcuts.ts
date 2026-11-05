export interface ShortcutItem { cat: string; win: string; mac: string; desc: string }

const RAW: Record<string, string> = {
Navigation: `Ctrl + Arrow|Cmd + Arrow|Data ke kinare tak jump karo
Ctrl + Home|Fn + Ctrl + Home|Seedha A1 cell par
Ctrl + End|Fn + Ctrl + End|Data ki aakhri cell par
Home|Fn + Left|Row ke pehle cell par
Page Down|Fn + Down|Ek screen neeche
Page Up|Fn + Up|Ek screen upar
Alt + Page Down|Fn + Option + Down|Ek screen daayen
Alt + Page Up|Fn + Option + Up|Ek screen baayen
Ctrl + Page Down|Fn + Ctrl + Down|Agli sheet par
Ctrl + Page Up|Fn + Ctrl + Up|Pichhli sheet par
Ctrl + G|Ctrl + G|Go To dialog kholo
F5|Fn + F5|Go To dialog (kisi bhi cell par jao)
Ctrl + F|Cmd + F|Find (dhoondho)
Ctrl + H|Ctrl + H|Find and Replace
Shift + F4|Cmd + Shift + F|Pichhla Find dohrao
Ctrl + Backspace|Cmd + Delete|Active cell dikhao
Tab|Tab|Daayen cell par
Shift + Tab|Shift + Tab|Baayen cell par
Enter|Return|Neeche wali cell par
Shift + Enter|Shift + Return|Upar wali cell par
Ctrl + Tab|Ctrl + Tab|Agli open workbook par
Ctrl + F6|Cmd + Backtick|Doosri workbook window par
Alt + Tab|Cmd + Tab|Doosre program par jao
Ctrl + .|Ctrl + .|Selection ke corners mein ghumo
Scroll Lock + Arrow|Fn + Shift + F14|Screen scroll bina cell badle`,
Selection: `Ctrl + A|Cmd + A|Poori sheet / data select
Ctrl + Space|Ctrl + Space|Poora column select
Shift + Space|Shift + Space|Poori row select
Shift + Arrow|Shift + Arrow|Selection ek cell badhao
Ctrl + Shift + Arrow|Cmd + Shift + Arrow|Data ke end tak select
Ctrl + Shift + Home|Cmd + Shift + Home|A1 tak select
Ctrl + Shift + End|Cmd + Shift + End|Aakhri cell tak select
Shift + Page Down|Fn + Shift + Down|Ek screen neeche select
Shift + Page Up|Fn + Shift + Up|Ek screen upar select
Ctrl + Shift + *|Ctrl + Shift + *|Current region (data table) select
Ctrl + Shift + Space|Cmd + Shift + Space|Poori sheet select
F8|Fn + F8|Extend mode on/off (arrow se select)
Shift + F8|Fn + Shift + F8|Alag-alag cells selection mein jodo
Ctrl + Click|Cmd + Click|Alag-alag cells select karo
Ctrl + [|Ctrl + [|Formula ke precedent cells select
Ctrl + ]|Ctrl + ]|Formula ke dependent cells select
Ctrl + Shift + O|Cmd + Shift + O|Comments wali cells select
Alt + ;|Cmd + Shift + Z|Sirf visible cells select (filter ke baad)
Esc|Esc|Selection ya edit cancel
Ctrl + Shift + [|Ctrl + Shift + [|Saare precedents select
Ctrl + Shift + ]|Ctrl + Shift + ]|Saare dependents select`,
Editing: `F2|Ctrl + U|Cell edit mode mein jao
Ctrl + C|Cmd + C|Copy
Ctrl + X|Cmd + X|Cut
Ctrl + V|Cmd + V|Paste
Ctrl + Alt + V|Ctrl + Cmd + V|Paste Special kholo
Ctrl + Z|Cmd + Z|Undo
Ctrl + Y|Cmd + Y|Redo
F4|Cmd + Y|Pichhla kaam dohrao
Delete|Fn + Delete|Cell ka content hatao
Ctrl + D|Ctrl + D|Upar wali cell neeche copy (Fill Down)
Ctrl + R|Ctrl + R|Baayen wali cell daayen copy (Fill Right)
Ctrl + Enter|Ctrl + Return|Selected sab cells mein ek saath entry
Alt + Enter|Ctrl + Option + Return|Cell ke andar nayi line
Ctrl + ;|Ctrl + ;|Aaj ki date daalo
Ctrl + Shift + :|Cmd + ;|Abhi ka time daalo
Ctrl + '|Ctrl + Shift + "|Upar wali cell ka formula copy
Ctrl + Shift + "|Ctrl + Shift + "|Upar wali cell ki value copy
Ctrl + E|Ctrl + E|Flash Fill
Ctrl + Shift + V|Cmd + Shift + V|Sirf values paste (naye Excel mein)
Ctrl + Shift + +|Ctrl + Shift + +|Insert cells/rows/columns
Ctrl + -|Cmd + -|Delete cells/rows/columns
Ctrl + Shift + L|Cmd + Shift + F|Filter on/off
Alt + Down Arrow|Option + Down|Dropdown list kholo
Alt + =|Cmd + Shift + T|AutoSum
Ctrl + K|Cmd + K|Hyperlink daalo
F7|Fn + F7|Spelling check
Shift + F2|Fn + Shift + F2|Comment/Note daalo
Ctrl + Shift + F2|-|Threaded comment kholo
Ctrl + T|Ctrl + T|Data ko Table banao
Ctrl + L|Ctrl + T|Table banao (dusra tareeka)`,
Formatting: `Ctrl + B|Cmd + B|Bold
Ctrl + I|Cmd + I|Italic
Ctrl + U|Cmd + U|Underline
Ctrl + 5|Cmd + Shift + X|Strikethrough
Ctrl + 1|Cmd + 1|Format Cells dialog
Ctrl + Shift + F|Cmd + Shift + F|Font settings kholo
Ctrl + Shift + ~|Ctrl + Shift + ~|General number format
Ctrl + Shift + !|Ctrl + Shift + !|Number format (1,000.00)
Ctrl + Shift + $|Ctrl + Shift + $|Currency format
Ctrl + Shift + %|Ctrl + Shift + %|Percentage format
Ctrl + Shift + ^|Ctrl + Shift + ^|Scientific format
Ctrl + Shift + #|Ctrl + Shift + #|Date format
Ctrl + Shift + @|Ctrl + Shift + @|Time format
Alt + H, A, C|Cmd + E|Center align
Alt + H, A, L|Cmd + L|Left align
Alt + H, A, R|Cmd + R|Right align
Alt + H, M, C|-|Merge and Center
Alt + H, W|-|Wrap Text
Alt + H, H|-|Fill colour menu
Alt + H, F, C|-|Font colour menu
Alt + H, B|-|Borders menu
Ctrl + Shift + &|Cmd + Option + 0|Outline border lagao
Ctrl + Shift + _|Cmd + Option + -|Border hatao
Alt + H, O, I|-|Column width AutoFit
Alt + H, O, A|-|Row height AutoFit
Alt + H, O, R|-|Sheet rename
Alt + H, L|-|Conditional Formatting menu
Alt + H, J|-|Cell Styles menu
Alt + H, F, P|-|Format Painter
Alt + H, 0|-|Decimal kam karo
Alt + H, 9|-|Decimal badhao
Ctrl + Alt + >|-|Font size badhao
Ctrl + Alt + <|-|Font size ghatao`,
Rows_Columns: `Ctrl + Shift + +|Ctrl + Shift + +|Nayi row/column jodo
Ctrl + -|Cmd + -|Selected row/column hatao
Ctrl + 9|Ctrl + 9|Row chhupao
Ctrl + Shift + (|Cmd + Shift + (|Row dikhao (unhide)
Ctrl + 0|Ctrl + 0|Column chhupao
Ctrl + Shift + )|Cmd + Shift + )|Column dikhao (unhide)
Alt + Shift + Right|Cmd + Shift + K|Rows/columns group karo
Alt + Shift + Left|Cmd + Shift + J|Group hatao (ungroup)
Alt + H, I, R|-|Sheet row insert
Alt + H, I, C|-|Sheet column insert
Alt + H, D, R|-|Sheet row delete
Alt + H, D, C|-|Sheet column delete
Alt + W, F, F|-|Freeze Panes
Alt + W, F, R|-|Top row freeze
Alt + W, F, C|-|First column freeze
Alt + O, C, A|-|Column width AutoFit (purana menu)
Double-click border|Double-click border|Width/height AutoFit
Alt + Drag|Cmd + Drag|Cell grid ke saath align karke resize
Ctrl + Shift + Drag|Option + Shift + Drag|Row/column copy karke insert
Shift + Drag|Shift + Drag|Row/column move + insert
Ctrl + Drag|Option + Drag|Selection ki copy banao`,
Formulas: `=|=|Formula likhna shuru
F4|Cmd + T|Reference lock/unlock ($A$1)
Ctrl + Backtick|Ctrl + Backtick|Formulas show/hide toggle
Ctrl + Shift + Enter|Ctrl + Shift + Return|Array formula (purane Excel mein)
Ctrl + Shift + A|Ctrl + Shift + A|Function arguments daalo
Ctrl + A|Ctrl + A|Function Arguments dialog (function ke baad)
Shift + F3|Fn + Shift + F3|Insert Function dialog
Alt + =|Cmd + Shift + T|AutoSum
F9|Fn + F9|Sheet calculate karo
Shift + F9|Fn + Shift + F9|Sirf current sheet calculate
Ctrl + Alt + F9|Ctrl + Option + F9|Sab kuch force calculate
Ctrl + Shift + U|Ctrl + Shift + U|Formula bar bada/chhota
F3|Ctrl + Cmd + F3|Named range paste karo
Ctrl + F3|Cmd + F3|Name Manager kholo
Ctrl + Shift + F3|Cmd + Shift + F3|Selection se names banao
Alt + M, V|-|Formulas tab: Trace Precedents
Alt + M, P|-|Trace Precedents
Alt + M, D|-|Trace Dependents
Alt + M, A|-|Saare arrows hatao
Alt + M, E|-|Error checking
Alt + M, V|-|Evaluate Formula
Alt + M, W|-|Watch Window
Ctrl + [|Ctrl + [|Precedent cell par jao
Ctrl + ]|Ctrl + ]|Dependent cell par jao
Tab (autocomplete)|Tab|Function suggestion accept karo
Ctrl + Shift + Tab|-|Pichhle tab par jao
Esc|Esc|Formula edit cancel
Alt + Enter|Ctrl + Option + Return|Formula bar mein nayi line
F2|Ctrl + U|Formula edit karo, colour range dikhta hai
F2 phir F9|Fn + F2 phir F9|Formula ka hissa value mein badlo
Ctrl + Alt + F|-|Function insert popup`,
Data: `Alt + A, S, S|-|Sort dialog
Alt + A, S, A|-|Sort A to Z
Alt + A, S, D|-|Sort Z to A
Ctrl + Shift + L|Cmd + Shift + F|Filter on/off
Alt + A, T|-|Filter lagao
Alt + A, C|-|Filter saaf karo
Alt + A, Q|-|Advanced Filter
Alt + A, E|-|Text to Columns
Alt + A, M|-|Remove Duplicates
Alt + A, V, V|-|Data Validation dialog
Alt + A, W, G|-|Goal Seek
Alt + A, W, S|-|Scenario Manager
Alt + A, W, T|-|Data Table
Alt + A, G, G|-|Group
Alt + A, U, U|-|Ungroup
Alt + A, B|-|Subtotal
Alt + A, D, D|-|Data Tools: Consolidate
Alt + A, R, A|-|Refresh All
Ctrl + Alt + F5|Cmd + Option + R|Sab data refresh
Alt + A, P, C|-|Power Query: sab connections
Alt + A, G|-|Get Data (Power Query)
Alt + D, L|-|Data Form
Ctrl + T|Ctrl + T|Table banao
Alt + J, T, A|-|Table Design: Total Row on/off
Ctrl + Shift + T|-|Table Totals row toggle
Alt + A, F, F|-|Filter by selected
Alt + Down Arrow|Option + Down|Filter dropdown kholo
Ctrl + Shift + :|Cmd + ;|Time daalo
Alt + A, H|-|Show Detail
Alt + A, J|-|Hide Detail
Alt + N, T|-|Insert Table
Alt + A, L|-|Reapply Filter`,
Pivot: `Alt + N, V|-|Pivot Table insert karo
Alt + N, S, Z|-|Slicer insert karo
Alt + J, T, S|-|Table Design: Slicer jodo
Alt + JT, I|-|Timeline insert
Alt + N, S, C|-|Pivot Chart insert (menu)
Alt + F1|Fn + Option + F1|Chart turant banao (embedded)
F11|Fn + F11|Alag sheet par chart banao
Alt + JT, R|-|Pivot Table Refresh
Alt + JT, A|-|Pivot Table Analyze: Field List
Alt + JT, F|-|Field Settings
Alt + JT, G|-|Group Selection
Alt + JT, U|-|Ungroup
Alt + JT, C|-|Pivot calculated field
Alt + JT, O|-|Pivot Options
Alt + JT, S, D|-|Show Details
Ctrl + Shift + *|Ctrl + Shift + *|Pivot table ka poora area select
Alt + Down|Option + Down|Pivot field dropdown kholo
Double-click value|Double-click value|Pivot value ki detail nayi sheet par
Alt + JY, S|-|Pivot Design: Subtotals
Alt + JY, G|-|Pivot Design: Grand Totals
Alt + JY, R|-|Report Layout
Alt + JY, B|-|Blank Rows
Alt + F10|-|Selection Pane kholo
Alt + F5|Fn + Option + F5|Pivot refresh
Ctrl + Z|Cmd + Z|Pivot change undo
Ctrl + Alt + F5|Cmd + Option + R|Sab pivot refresh
Alt + JT, W|-|Pivot Show/Hide Field Buttons`,
Workbook: `Ctrl + N|Cmd + N|Nayi workbook
Ctrl + O|Cmd + O|Workbook kholo
Ctrl + S|Cmd + S|Save
F12|Cmd + Shift + S|Save As
Ctrl + P|Cmd + P|Print / Print Preview
Ctrl + W|Cmd + W|Workbook band karo
Alt + F4|Cmd + Q|Excel band karo
Shift + F11|Fn + Shift + F11|Nayi sheet jodo
Alt + Shift + F1|Fn + Shift + F1|Nayi sheet jodo (dusra)
Ctrl + Page Down|Fn + Ctrl + Down|Agli sheet
Ctrl + Page Up|Fn + Ctrl + Up|Pichhli sheet
Alt + H, O, R|-|Sheet rename
Alt + H, O, M|-|Sheet move/copy
Alt + H, O, H|-|Sheet chhupao
Alt + R, P, S|-|Sheet protect
Alt + R, P, W|-|Workbook protect
Alt + F, I, E|-|Encrypt with password
Alt + P, R, S|-|Print area set
Alt + P, O|-|Page orientation
Alt + P, S, P|-|Page Setup
Alt + W, V, P|-|Page Break Preview
Alt + W, V, N|-|Normal view
Alt + W, V, L|-|Page Layout view
Alt + W, S|-|Split window
Alt + W, A|-|Sab windows arrange
Alt + W, N|-|Nayi window
Ctrl + F1|Cmd + Option + R|Ribbon chhupao/dikhao
Alt|Option|Ribbon ke key tips dikhao
Ctrl + F2|Cmd + P|Print preview
F10|Fn + F10|Menu bar activate
Alt + Q|-|Tell Me / Search box
Alt + F, T|-|Excel Options
Ctrl + Z|Cmd + Z|Undo
Ctrl + Shift + F1|-|Full screen mode
Ctrl + Mouse Wheel|Cmd + Mouse Wheel|Zoom in/out
Alt + W, Q|-|Zoom dialog
Alt + W, J|-|Zoom 100%
Alt + W, G|-|Gridlines on/off`,
VBA: `Alt + F11|Fn + Option + F11|VBA Editor kholo/band karo
Alt + F8|Fn + Option + F8|Macro list kholo aur chalao
Alt + L, R|-|Macro record shuru (Developer tab)
Alt + T, M, R|-|Macro record (purana)
F5|Fn + F5|VBA mein macro run karo
F8|Fn + F8|Code line-by-line chalao (step into)
Shift + F8|Fn + Shift + F8|Step over (function skip)
Ctrl + Shift + F8|-|Step out
Ctrl + F8|Fn + Ctrl + F8|Cursor tak run karo
F9|Fn + F9|Breakpoint lagao/hatao
Ctrl + Shift + F9|-|Saare breakpoints hatao
Ctrl + G|Ctrl + G|Immediate Window kholo
Ctrl + R|Cmd + R|Project Explorer kholo
F4|Fn + F4|Properties Window
F2|Fn + F2|Object Browser
Ctrl + Space|Ctrl + Space|Code auto-complete list
Ctrl + J|Ctrl + J|Property/method list dikhao
Ctrl + Shift + J|-|Constants list dikhao
Ctrl + I|Ctrl + I|Quick Info (syntax madad)
Ctrl + Shift + I|-|Parameter info
Ctrl + Shift + F2|-|Definition par jao
Ctrl + F|Cmd + F|Code mein dhoondho
Ctrl + H|Ctrl + H|Code mein replace
Tab|Tab|Selected code ko andar (indent)
Shift + Tab|Shift + Tab|Indent kam karo
Ctrl + E|-|Module export karo
Ctrl + M|-|File import karo
Alt + F11 phir Alt + Q|-|VBA se wapas Excel
Alt + I, M|-|Naya Module jodo
Alt + I, U|-|Naya UserForm jodo
Alt + I, P|-|Naya Procedure jodo
Ctrl + Break|Cmd + Break|Chalte code ko rokho
Alt + Q|Cmd + Q|VBA Editor band karke Excel par
Ctrl + Y|-|Poori line kaat do
Ctrl + Z|Cmd + Z|Code undo
Ctrl + Shift + Z|-|Code redo
Alt + Backspace|-|Undo (VBA editor)
Ctrl + Home|-|Module ke shuru par
Ctrl + End|-|Module ke ant par
Ctrl + Up/Down|-|Procedure ke beech jump
Shift + F2|-|Variable/procedure ki definition
Ctrl + Shift + F2|-|Peeche wapas jao
Alt + F11 (Mac)|Fn + Option + F11|Mac par VBA editor`,
Paste_Special: `Alt + E, S, V|Ctrl + Cmd + V|Paste Special: Sirf Values paste karo
Alt + E, S, F|Ctrl + Cmd + V|Paste Special: Sirf Formulas paste karo
Alt + E, S, T|Ctrl + Cmd + V|Paste Special: Sirf Formats paste karo
Alt + E, S, C|-|Paste Special: Comments/Notes paste karo
Alt + E, S, N|-|Paste Special: Data Validation rules paste karo
Alt + E, S, W|-|Paste Special: Column Widths barabar karo
Alt + E, S, R|-|Paste Special: Formulas and Number Formats
Alt + E, S, U|-|Paste Special: Values and Number Formats
Alt + E, S, E|-|Paste Special: Transpose (row ko column banao)
Alt + E, S, D|-|Paste Special: Values mein Add (jod) karo
Alt + E, S, S|-|Paste Special: Values se Subtract (ghatao)
Alt + E, S, M|-|Paste Special: Values ko Multiply (guna) karo
Alt + E, S, I|-|Paste Special: Values ko Divide (bhaag) karo
Alt + E, S, B|-|Paste Special: Skip Blanks (khali cell chhodo)
Alt + E, S, L|-|Paste Special: Paste Link (=Sheet1!A1)
Alt + H, V, V|Cmd + Shift + V|Home Paste menu se Values paste
Alt + H, V, K|-|Linked Picture (Camera snapshot) paste karo
Alt + H, V, I|-|Picture ke roop mein paste karo
Alt + H, V, O|-|Source Formatting rakhte hue paste
Alt + H, E, A|-|Clear All (value + format + comment sab saaf)
Alt + H, E, F|-|Clear Formats (sirf design hatao, data rakho)
Alt + H, E, C|Delete|Clear Contents (sirf value hatao)
Alt + H, E, M|-|Clear Comments and Notes
Alt + H, E, L|-|Clear Hyperlinks`,
Insert_Layout: `Alt + N, P|-|Insert Picture (device se photo daalo)
Alt + N, S, H|-|Insert Shapes (arrow, box, banner)
Alt + N, S, I|-|Insert Icons (modern SVG icons)
Alt + N, Q|-|Insert SmartArt diagram
Alt + N, S, C|-|Insert Screenshot
Alt + N, R|-|Recommended Charts dikhao
Alt + N, C|-|Insert Column/Bar Chart
Alt + N, N|-|Insert Line/Area Chart
Alt + N, Q, P|-|Insert Pie/Doughnut Chart
Alt + N, S, L|-|Insert Line Sparkline (cell mini chart)
Alt + N, S, O|-|Insert Column Sparkline
Alt + N, W|-|Insert Win/Loss Sparkline
Alt + N, X|-|Insert Text Box
Alt + N, H|-|Insert Header & Footer
Alt + N, U|-|Insert Symbol (₹, ±, ✓, ★)
Alt + N, E|-|Insert Equation (ganit ka formula)
Alt + N, Z, K|-|Insert Hyperlink (Ribbon se)
Alt + P, T, H|-|Page Layout: Workbook Theme badlo
Alt + P, T, C|-|Theme Colors palette chuno
Alt + P, T, F|-|Theme Fonts badlo
Alt + P, M|-|Page Margins (Normal / Wide / Narrow) set karo
Alt + P, S, Z|-|Paper Size (A4 / Letter / Legal) chuno
Alt + P, B, I|-|Insert Page Break
Alt + P, B, R|-|Remove Page Break
Alt + P, G|-|Background image lagao
Alt + P, I|-|Print Titles (har print page par header dohrao)
Alt + P, W|-|Scale to Fit: Width (1 page wide set karo)
Alt + P, H|-|Scale to Fit: Height set karo
Alt + P, S, L|-|Scale percentage badhao/ghatao
Alt + P, V, G|-|Gridlines View toggle
Alt + P, P, G|-|Gridlines Print on/off
Alt + P, V, H|-|Row/Column Headings show/hide
Alt + P, A, F|-|Bring Forward (shape aage lao)
Alt + P, A, B|-|Send Backward (shape peeche bhejo)
Alt + P, A, A|-|Align Objects menu`,
Review_View: `Alt + R, S|Fn + F7|Spelling check chalao
Alt + R, E|Shift + F7|Thesaurus (milte-julte shabd) kholo
Alt + R, W|-|Workbook Statistics (kul cells, tables, formulas gino)
Alt + R, A|-|Check Accessibility (report readability jaancho)
Alt + R, L|-|Translate selected text (bhasha anuvaad)
Ctrl + Alt + M|Cmd + Shift + F2|New Threaded Comment jodo
Alt + R, C|-|New Comment Ribbon se
Alt + R, D|-|Comment delete karo
Alt + R, V|-|Previous Comment par jao
Alt + R, N|-|Next Comment par jao
Alt + R, H, C|-|Show/Hide All Comments
Alt + R, I, N|-|New Note (classic yellow sticky note)
Alt + R, U, L|-|Allow Edit Ranges (khaas range khuli rakho)
Alt + R, G|-|Track / Show Changes
Alt + W, F, B|-|Formula Bar show/hide toggle
Alt + W, V, H|-|Headings show/hide (View tab)
Alt + W, K|-|Custom Views kholo
Alt + W, I|-|Page Break Preview turant kholo
Alt + W, G, Z|-|Zoom to Selection (chune hisse par zoom)
Alt + W, S, W|-|Switch Windows menu
Alt + W, M, V|-|View Macros list
Alt + W, M, R|-|Record Macro (View tab se)
Ctrl + Q|-|Quick Analysis lens (Formatting, Charts, Totals turant!)
F1|Cmd + /|Excel Help pane kholo
Alt + F2|Cmd + Shift + S|Save As dialog (dusra shortcut)
Ctrl + F4|Cmd + W|Current workbook window band karo
Ctrl + F5|-|Workbook window restore size
Ctrl + F7|-|Workbook window keyboard se move karo
Ctrl + F8|-|Workbook window keyboard se resize karo
Ctrl + F9|Cmd + M|Workbook window minimize karo
Ctrl + F10|-|Workbook window maximize / restore karo
Shift + F10|Ctrl + Click|Right-Click Context Menu keyboard se kholo
Menu Key|-|Selected cell ka right-click menu kholo
Alt + Space|-|Excel window ka system menu kholo
Ctrl + Alt + Shift + F9|-|Saare dependencies dobara banakar full recalculate
Alt + H, T|-|Format as Table gallery kholo
Alt + H, S, F|-|Home Sort & Filter menu
Alt + H, F, D, S|-|Go To Special (Blanks, Formulas, Constants chuno!)
Alt + H, F, D, O|-|Select Objects arrow chalu karo
Alt + M, N|-|Name Manager Ribbon se kholo`,
};

export const SHORTCUT_CATS = Object.keys(RAW).map((k) => k);
const label = (k: string) => k.replace("_", " & ");
export const shortcutCatLabel = label;
export const SHORTCUTS: ShortcutItem[] = Object.entries(RAW).flatMap(([cat, block]) =>
  block.split("\n").filter(Boolean).map((l) => {
    const [win, mac, desc] = l.split("|");
    return { cat, win, mac, desc };
  })
);
