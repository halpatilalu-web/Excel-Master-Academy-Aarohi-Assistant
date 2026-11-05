import { CHAPTERS, type ExamQ } from "./chapters";

const RAW = `Excel mein ek worksheet mein kitne columns hote hain (latest version)?|256|1024|16384|65536|2|2
Formula hamesha kis chinh se shuru hota hai?|#|=|@|$|1|1
Ribbon ka Formulas tab kis kaam ka hai?|Printing|Functions aur formula tools|Chart|Macro|1|1
Excel mein cell ka address kaise likhte hain?|Row phir column|Column phir row|Sirf column|Sirf row|1|1
Poori sheet select karne ka shortcut?|Ctrl+S|Ctrl+A|Ctrl+Z|Ctrl+P|1|2
Active cell ko edit karne ki key?|F1|F2|F3|F4|1|3
Cell mein date daalne ka shortcut?|Ctrl+;|Ctrl+D|Ctrl+T|Ctrl+B|0|3
Wrap Text ka kaam?|Text ko cell ke andar kai lines mein dikhana|Text delete karna|Cell merge karna|Border lagana|0|3
Format Cells kholne ka shortcut?|Ctrl+1|Ctrl+2|Ctrl+F|Ctrl+O|0|3
Number format Percentage ka shortcut?|Ctrl+Shift+%|Ctrl+Shift+$|Ctrl+Shift+#|Ctrl+Shift+@|0|3
Row chhupane ka shortcut?|Ctrl+9|Ctrl+0|Ctrl+8|Ctrl+7|0|4
Column chhupane ka shortcut?|Ctrl+9|Ctrl+0|Ctrl+8|Ctrl+1|1|4
Nayi row jodne ka shortcut?|Ctrl+Shift++|Ctrl+Shift+-|Ctrl+Alt+R|Alt+R|0|4
Row/column delete karne ka shortcut?|Ctrl+-|Ctrl+*|Ctrl+/|Ctrl+\\|0|4
Freeze Panes kis tab mein hai?|Home|View|Insert|Data|1|4
Column width AutoFit kaise karein?|Border par double-click|Border par right-click|Cell delete|Ctrl+W|0|4
AutoSum ka shortcut?|Alt+=|Ctrl+=|Shift+=|F=|0|5
=AVERAGE(10,20,30) ka result?|20|30|60|10|0|5
=MAX(5,9,2) ka result?|2|5|9|16|2|5
=MIN(5,9,2) ka result?|2|5|9|0|0|5
=SUM(A1:A3) mein A1=1,A2=2,A3=3 ho to?|3|6|9|123|1|5
=COUNT(A1:A5) kya ginta hai?|Sabhi cells|Sirf numbers|Sirf text|Khali cells|1|5
Status Bar par kya turant dikhta hai?|Sum, Average, Count|Formula|Macro|Chart|0|5
Absolute reference kaisa dikhta hai?|A1|$A$1|A$1 nahi|#A1|1|6
F4 key kya karti hai (formula mein)?|Copy|Reference lock/unlock|Save|Print|1|6
Mixed reference ka udaharan?|$A1|A1|$A$1|(A1)|0|6
Relative reference copy karne par kya hota hai?|Same rehta hai|Position ke hisaab se badalta hai|Error aata hai|Delete hota hai|1|6
Fill handle kahan hota hai?|Cell ke niche daayen kone mein|Ribbon mein|Status bar|Formula bar|0|7
Flash Fill ka shortcut?|Ctrl+E|Ctrl+F|Ctrl+L|Ctrl+K|0|7
Series banane ke liye kya drag karte hain?|Fill handle|Name box|Tab|Row header|0|7
Ek hi entry saare selected cells mein dalne ke liye?|Ctrl+Enter|Alt+Enter|Shift+Enter|Tab|0|7
Filter on/off ka shortcut?|Ctrl+Shift+L|Ctrl+L|Alt+F|Ctrl+Q|0|8
Sort mein A to Z kya hai?|Descending|Ascending|Random|Filter|1|8
Custom Sort mein kitne levels laga sakte hain?|1|2|Kai levels|Sirf 3|2|8
Filter ka kaam?|Data hatana|Sirf shart wala data dikhana|Data jodna|Format badalna|1|8
Conditional Formatting kis tab mein hai?|Home|Review|View|Page Layout|0|9
Data Bars ka upyog?|Values ko bars se dikhana|Sort karna|Print karna|Merge karna|0|9
Color Scales kya karte hain?|Values ke hisaab se colour gradient|Chart banate hain|Formula likhte hain|Row hatate hain|0|9
Duplicate values highlight karne ka option?|Highlight Cells Rules → Duplicate Values|Data Bars|Icon Sets|Top 10|0|9
Icon Sets kya hain?|Values ke hisaab se chhote symbols|Images|Charts|Macros|0|9
Print area set karne ka kaam?|Sirf chuna hua hissa print karna|Poori sheet delete|Save|Sort|0|10
Page orientation ke options?|Portrait/Landscape|Left/Right|Top/Bottom|Big/Small|0|10
Print Titles ka upyog?|Har page par heading repeat karna|Page number|Margin|Zoom|0|10
Print Preview ka shortcut?|Ctrl+P|Ctrl+Q|Ctrl+W|Ctrl+R|0|10
Fit to 1 page wide ka kaam?|Sab columns ek page par laana|Row delete|Font bada|Border|0|10
=IF(5>3,"Haan","Nahi") ka result?|Haan|Nahi|TRUE|5|0|11
=IF(A1>=40,"Pass","Fail") mein A1=35 ho to?|Pass|Fail|35|Error|1|11
IF function mein kitne arguments hote hain?|1|2|3|4|2|11
IF mein text ko kis mein likhte hain?|Double quotes|Brackets|Hash|Kuch nahi|0|11
Nested IF ka matlab?|IF ke andar IF|Do sheet|Do formula bar|Macro|0|12
IFS function kis version se aaya?|Excel 2019/365|Excel 97|Excel 2003|Excel 2007|0|12
Nested IF mein zyada levels se kya hota hai?|Padhna mushkil|Tez chalta hai|Error nahi|Kuch nahi|0|12
IFS mein default result ke liye aakhir mein kya likhte hain?|TRUE|FALSE|0|Blank|0|12
AND tabhi TRUE deta hai jab?|Sabhi shartein sahi|Koi ek sahi|Koi nahi|Sirf pehli|0|13
OR tabhi FALSE deta hai jab?|Sabhi shartein galat|Ek galat|Ek sahi|Koi nahi|0|13
NOT(TRUE) ka result?|TRUE|FALSE|1|Error|1|13
=AND(5>3,2>1) ka result?|TRUE|FALSE|Error|0|0|13
=OR(5<3,2>1) ka result?|TRUE|FALSE|Error|0|0|13
COUNTA kya ginta hai?|Sirf numbers|Non-blank cells|Sirf text|Errors|1|14
COUNTBLANK kya ginta hai?|Khali cells|Numbers|Text|Errors|0|14
=COUNTIF(A:A,">50") kya karta hai?|50 se bade cells ginta hai|50 jodta hai|Sort karta hai|Delete karta hai|0|14
COUNTIFS mein shartein kitni ho sakti hain?|Sirf 1|Kai|Sirf 2|Koi nahi|1|14
COUNTIF mein wildcard "A*" ka matlab?|A se shuru hone wala text|A pe khatam|A shamil|Sirf A|0|14
SUMIF ka pehla argument?|Range jisme shart check hogi|Total|Sheet|Colour|0|15
SUMIFS mein sum_range kahan aati hai?|Sabse pehle|Sabse aakhir mein|Beech mein|Nahi aati|0|15
=SUMIF(A:A,"Delhi",B:B) kya karta hai?|Delhi ki B values ka jod|Delhi ginta hai|Delhi hatata hai|Delhi sort|0|15
AVERAGEIF kya karta hai?|Shart par average|Shart par total|Shart par ginti|Shart par max|0|15
MAXIFS kis kaam aata hai?|Shart par sabse bada|Sabse chhota|Total|Average|0|15
=LEN("Excel") ka result?|4|5|6|10|1|16
=LEFT("Excel",2) ka result?|Ex|El|xc|Ee|0|16
=RIGHT("Excel",3) ka result?|Exc|xce|cel|Eel|2|16
=MID("Excel",2,3) ka result?|Exc|xce|cel|Exe|1|16
=UPPER("abc") ka result?|abc|Abc|ABC|aBC|2|16
=PROPER("ram kumar") ka result?|ram kumar|RAM KUMAR|Ram Kumar|Ram kumar|2|16
TRIM kya hatata hai?|Extra spaces|Numbers|Letters|Formulas|0|16
CONCATENATE ka naya roop?|CONCAT / TEXTJOIN|JOINALL|ADDTEXT|MERGE|0|16
TEXT(A1,"dd-mmm-yyyy") kya karta hai?|Date ko format dena|Date hatana|Date sort|Date add|0|16
SUBSTITUTE kya karta hai?|Text ke andar purane ko naya karna|Text hatana|Text sort|Text ginna|0|16
FIND aur SEARCH mein fark?|FIND case-sensitive hai|SEARCH case-sensitive hai|Koi fark nahi|FIND wildcard leta hai|0|16
=TODAY() kya deta hai?|Aaj ki date|Abhi ka time|Kal ki date|Mahina|0|17
=NOW() kya deta hai?|Sirf date|Date aur time|Sirf time|Saal|1|17
DATEDIF se kya nikalte hain?|Do dates ka antar|Date jodna|Mahina naam|Time|0|17
=YEAR("15-08-2026") ka result?|8|15|2026|2015|2|17
=EOMONTH(A1,0) kya deta hai?|Mahine ki aakhri date|Pehli date|Aaj ki date|Saal|0|17
NETWORKDAYS kya ginta hai?|Kaam ke din|Sab din|Sirf Sunday|Mahine|0|17
=DAY(A1) kya deta hai?|Din (1-31)|Mahina|Saal|Hafta|0|17
Excel date asal mein kya hoti hai?|Serial number|Text|Image|Formula|0|17
VLOOKUP kaise dhoondhta hai?|Pehle column mein|Aakhri column mein|Kisi bhi column mein|Row mein|0|18
VLOOKUP ka exact match ke liye 4th argument?|FALSE (ya 0)|TRUE|1 nahi|Blank|0|18
VLOOKUP ki sabse badi seema?|Left side nahi dekh sakta|Right nahi|Numbers nahi|Text nahi|0|18
#N/A error ka matlab?|Value nahi mili|Divide by zero|Galat naam|Galat reference|0|18
IFERROR kis kaam aata hai?|Error ko apne message se badalna|Error badhana|Sort|Copy|0|18
HLOOKUP kis direction mein dhoondhta hai?|Row mein (kshaitij)|Column mein|Diagonal|Nahi|0|19
XLOOKUP ka fayda?|Left/right dono dekh sakta hai|Sirf right|Sirf numbers|Slow|0|19
XLOOKUP mein not found ka argument?|if_not_found|error_msg|no_match|else|0|19
INDEX kya karta hai?|Position se value deta hai|Position batata hai|Sort karta hai|Jodta hai|0|20
MATCH kya deta hai?|Position number|Value|Colour|Formula|0|20
INDEX-MATCH ka fayda VLOOKUP se?|Left side bhi dekh sakta|Slow hai|Sirf ek column|Koi nahi|0|20
MATCH mein exact ke liye type?|0|1|-1|2|0|20
Data Validation kis tab mein hai?|Data|Home|Insert|View|0|21
Dropdown list banane ke liye Allow mein?|List|Whole number|Date|Text length|0|21
Data Validation ka Input Message kab dikhta hai?|Cell select hone par|Save par|Print par|Kabhi nahi|0|21
Circle Invalid Data kya karta hai?|Galat entries par circle|Sab delete|Sort|Print|0|21
Pie chart kab upyog karte hain?|Hisson ka anupat|Trend|Compare time|Scatter|0|22
Trend dikhane ke liye kaun sa chart?|Line chart|Pie|Donut|Radar|0|22
Chart turant banane ka shortcut?|Alt+F1|Alt+F2|F5|F12|0|22
Alag sheet par chart banane ka shortcut?|F11|F12|F10|F9|0|22
Combo chart kya hai?|Do chart types ek saath|Sirf bar|Sirf pie|Table|0|22
Pivot Table kis tab se banti hai?|Insert|Home|Review|View|0|23
Pivot ke Values area mein default kya hota hai?|Sum / Count|Text|Date|Image|0|23
Pivot Table refresh ka shortcut?|Alt+F5|Alt+F4|F5|Ctrl+F5|0|23
Pivot Table ke liye data kaisa hona chahiye?|Saaf, headings wala|Merged cells wala|Khali headings|Images|0|23
Slicer kya hai?|Visual filter buttons|Formula|Chart|Macro|0|24
Timeline slicer kis ke liye?|Dates ke liye|Text ke liye|Colour|Images|0|24
Pivot Chart kis par based hota hai?|Pivot Table|Image|Macro|Text|0|24
Excel Table banane ka shortcut?|Ctrl+T|Ctrl+Y|Ctrl+U|Ctrl+I|0|25
Named Range ka fayda?|Formula padhne mein aasaan|Slow|Error|Sort|0|25
Name Manager ka shortcut?|Ctrl+F3|Ctrl+F4|Ctrl+F5|Ctrl+F6|0|25
Table mein naya data jodne par formula?|Auto extend hota hai|Nahi hota|Error|Delete|0|25
Structured reference ka udaharan?|Table1[Sales]|A1:B2|Sheet!A1|$A$1|0|25
Power Query kis tab mein hai?|Data (Get & Transform)|Home|Insert|Review|0|26
Power Query ka mukhya kaam?|Data clean aur transform karna|Chart|Print|Macro|0|26
Power Query mein steps kahan dikhte hain?|Applied Steps|Status bar|Name Box|Ribbon|0|26
Refresh karne par Power Query?|Saare steps dobara chalata hai|Delete karta hai|Sort|Print|0|26
Goal Seek kis kaam aata hai?|Result se input nikalna|Chart|Sort|Print|0|27
Scenario Manager kya karta hai?|Alag-alag scenarios save karna|Delete|Sort|Format|0|27
Data Table (What-If) kis ke liye?|Ek ya do inputs ke kai results|Chart|Pivot|Macro|0|27
Goal Seek ka shortcut?|Alt+A, W, G|Alt+G|Ctrl+G|F5|0|27
FILTER function kya karta hai?|Shart se data chhanta hai|Sort|Total|Format|0|28
UNIQUE kya deta hai?|Duplicate hataakar list|Sirf duplicates|Total|Count|0|28
Spill range kya hai?|Formula ka result kai cells mein failna|Error|Chart|Table|0|28
#SPILL! error kyun aata hai?|Result ke raaste mein data hai|Divide by zero|Name galat|Reference|0|28
SORT function ka default order?|Ascending|Descending|Random|Alphabetical nahi|0|28
SEQUENCE(5) kya deta hai?|1 se 5|0 se 5|5 baar 5|Random|0|28
Dashboard mein KPI card kis liye?|Mukhya number dikhane|Printing|Macro|Sort|0|29
Dashboard mein sabse zaroori kya hai?|Saaf aur seedha dikhna|Zyada colours|Zyada fonts|Zyada sheets|0|29
Dashboard interactive kaise banate hain?|Slicer aur dropdown|Merge|Border|Print|0|29
Macro record karne ka shortcut?|Alt+T, M, R|Ctrl+M|F5|Alt+M|0|30
Macro file kis format mein save hoti hai?|.xlsm|.xlsx|.docx|.txt|0|30
Macro chalane ka shortcut?|Alt+F8|Alt+F4|Ctrl+M|F8|0|30
Developer tab kya dikhata hai?|Macro aur VBA tools|Charts|Print|Sort|0|30
Macro ko button se jodne ke liye?|Assign Macro|Format|Sort|Filter|0|30
Relative reference recording kab useful?|Kisi bhi cell se macro chalana|Hamesha nahi|Sirf A1|Print|0|30
VBA Editor kholne ka shortcut?|Alt+F11|Alt+F4|F11|Ctrl+F11|0|31
VBA mein variable declare karne ke liye?|Dim|Var|Let|Set nahi|0|31
Option Explicit ka fayda?|Variable declare karna zaroori|Tez|Print|Sort|0|31
Range("A1").Value = 5 kya karta hai?|A1 mein 5 likhta hai|A1 delete|A1 copy|A1 sort|0|31
VBA mein message dikhane ke liye?|MsgBox|Print|Show|Say|0|31
VBA mein loop ka udaharan?|For Next|Repeat|Cycle|Go|0|31
Cells(2,3) kaun si cell hai?|C2|B3|2C|3B|0|31
Macro security ki best practice?|Sirf trusted macros chalao|Sab chalao|Sab band|Password bhool jao|0|31
Sheet protect kahan se hota hai?|Review → Protect Sheet|Home|Insert|Data|0|32
Cell lock karne ka shortcut dialog?|Ctrl+1 → Protection|Ctrl+L|F5|Alt+L|0|32
File ko password se encrypt kahan karte hain?|File → Info → Protect Workbook|Home|View|Data|0|32
Formulas chhupane ke liye cell property?|Hidden|Locked|Merged|Wrapped|0|32
SUMPRODUCT kya karta hai?|Arrays multiply karke jodta hai|Sort|Filter|Format|0|15
ROUND(3.456,1) ka result?|3.4|3.5|3.46|3|1|5
=MOD(10,3) ka result?|1|3|0|10|0|5
=ABS(-5) ka result?|-5|5|0|1|1|5
=POWER(2,3) ka result?|6|8|9|5|1|5
=ROUNDUP(2.1,0) ka result?|2|3|2.1|1|1|5
=INT(7.9) ka result?|8|7|7.9|0|1|5
LET function ka fayda?|Formula mein variable banana|Sort|Filter|Chart|0|28
LAMBDA kya hai?|Apna custom function banana|Chart|Table|Macro|0|28
PMT function kis ke liye?|Loan ki EMI nikalne ke liye|Date|Text|Sort|0|27
XLOOKUP kis ka behtar roop hai?|VLOOKUP/HLOOKUP|SUM|IF|COUNT|0|19
TEXTJOIN ka fayda?|Delimiter ke saath text jodna|Text hatana|Sort|Filter|0|16
Ctrl+Shift+L kya karta hai?|Filter on/off|Lock|List|Link|0|8
Ctrl+D kya karta hai?|Upar ki cell neeche copy|Delete|Date|Dollar|0|2
Ctrl+; kya daalta hai?|Aaj ki date|Time|Naam|Formula|0|3
Ctrl+Shift+: kya daalta hai?|Abhi ka time|Date|Naam|Colour|0|3
Alt+Enter cell mein kya karta hai?|Nayi line|Save|Delete|Copy|0|3
Ctrl+Backtick kya karta hai?|Formulas show/hide|Save|Print|Sort|0|5
Ctrl+Z kya karta hai?|Undo|Redo|Save|Cut|0|2
Ctrl+Y kya karta hai?|Redo|Undo|Copy|Paste|0|2
F12 kya karta hai?|Save As|Save|Print|Open|0|1
Ctrl+Home kahan le jata hai?|A1|Last cell|Row end|Column end|0|2
Ctrl+End kahan le jata hai?|Data ki aakhri cell|A1|Row 1|Column A|0|2
Ctrl+Space kya select karta hai?|Poora column|Poori row|Sheet|Cell|0|2
Shift+Space kya select karta hai?|Poori row|Poora column|Sheet|Cell|0|2
Ctrl+Alt+V kya kholta hai?|Paste Special|Paste|Print|Open|0|3
Ctrl+K kya karta hai?|Hyperlink daalna|Copy|Cut|Save|0|3
Alt+Down Arrow kya karta hai?|Dropdown list kholta hai|Delete|Sort|Save|0|21
TEXTSPLIT function kya karta hai?|Delimiter ke aadhar par text ko cells mein baantta hai|Cells merge karta hai|Sheet delete karta hai|Print karta hai|0|33
IFNA function kis error ko pakadta hai?|Sirf #N/A error ko|Sabhi numbers ko|Bold text ko|Blank row ko|0|33
CLEAN aur TRIM mein kya farq hai?|CLEAN non-printable chars hatata hai aur TRIM extra spaces|Dono chart banate hain|Dono जोड़te hain|Koi farq nahi|0|33
Conditional Formatting mein formula rule kis chinh se shuru hota hai?|= (Equal sign)|# (Hash)|@ (At)|$ (Dollar)|0|34
Manage Rules mein 'Stop If True' kab kaam aata hai?|Jab pehle rule ke baad agla rule rokna ho|File band karne mein|Macro chalane mein|Print rokne mein|0|34
Data Validation mein duplicate rokne ka custom formula?|COUNTIF($A$2:$A$100,A2)=1|SUM(A2:A100)=0|MAX(A:A)|TODAY()|0|35
Data Validation Error Alert mein kaun sa mode galat value bilkul save nahi hone deta?|Stop|Warning|Information|Comment|0|35
XLOOKUP mein boolean multiplication (Cond1)*(Cond2) kya deta hai?|1 jab dono TRUE hon warna 0|Text string|Date|Error|0|36
Two-way lookup mein INDEX ke saath kya lagta hai?|Row ke liye MATCH aur Column ke liye MATCH|Sirf SUM|Sirf TRIM|PROPER|0|36
Power Query mein Left Outer Join ka matlab?|Pehli table ki saari rows aur doosri ki matching rows|Sirf khali rows|Sirf headers|Chart banana|0|37
Folder se saari monthly CSV ek saath lane ka tarika?|Data → Get Data → From File → From Folder|Copy Paste 50 baar|Insert Picture|Page Setup|0|37
TEXTBEFORE("INV-2026-99","-") ka result kya aayega?|INV|2026|99|-|0|38
HSTACK function kya karta hai?|Arrays ko agal-bagal (horizontally) jodata hai|Rows chhupata hai|Font badalta hai|Sheet lock karta hai|0|38
VBA mein For Each loop kab best hai?|Collection ke har cell ya har worksheet par chalne ke liye|Sirf ek cell jodna|Chart colour|Zoom karna|0|39
VBA mein Application.ScreenUpdating = False kyun likhte hain?|Macro ki speed badhane aur screen flicker rokne ke liye|Excel band karne ke liye|Password lagane ke liye|Data mitane ke liye|0|39
Executive MIS Dashboard mein raw data aur dashboard kahan rakhte hain?|Alag-alag dedicated sheets mein|Ek hi cell mein|Header footer mein|Comment box mein|0|40
Slicer ko 3 alag Pivot Tables se kaise jodte hain?|Slicer → Report Connections|Ctrl+B|Merge Cells|Goal Seek|0|40
Color wheel par aas-paas wale colours (jaise Blue aur Green) kya kehlate hain?|Analogous colors|Error colors|Hidden colors|Random colors|0|41
Monochromatic color palette ka kya matlab hai?|Ek hi base colour ke alag-alag light aur dark shades|10 alag neon colours|Sirf kala rang|Bina text ki sheet|0|41
Excel mein #CALC! error kab aata hai?|Jab FILTER khali array de ya unsupported nested array calculation ho|Column chhota hone par|File save karne par|Bold karne par|0|42
Excel mein #CONNECT! error kyun aata hai?|External data source ya network connection tootne par|Font badalne par|Row add karne par|Print karne par|0|42
Formula ke input cells ko teer (arrows) se kaun sa tool dikhata hai?|Trace Precedents|Flash Fill|Goal Seek|Wrap Text|0|42
DSUM function ko shartein dene ke liye kya banana padta hai?|Header ke saath alag Criteria Range|Pie chart|Macro module|Page break|0|43
ISFORMULA(B2) kya check karta hai?|B2 cell ke andar formula likha hai ya nahi|B2 bold hai ya nahi|B2 ka rang|B2 ki width|0|43
CUMIPMT function kya nikalta hai?|Do kishton ke beech chukaya gaya kul byaaj (Total Interest)|Aaj ki tarikh|Text ki lambai|Duplicate naam|0|44
Same state (Intra-state) GST bill mein 18% tax kaise lagta hai?|9% CGST + 9% SGST|36% IGST|0% Tax|Sirf TDS|0|44
Attendance sheet mein Half-Day ('HD') ko 0.5 din ginne ka tarika?|COUNTIF(range,"HD")*0.5|SUM(range)|PROPER(range)|NOW()|0|44
VBA se Outlook reminder email bhejne ke liye kaun sa object banate hain?|CreateObject("Outlook.Application")|Range("A1").Clear|ActiveSheet.PrintOut|MsgBox|0|45`;

const levelOf = (n: number) => CHAPTERS.find((c) => c.n === n)?.level ?? "Basic";

export const EXTRA_QUESTIONS: ExamQ[] = RAW.split("\n").filter(Boolean).map((l) => {
  const p = l.split("|");
  const n = Number(p[6]);
  return { q: p[0], o: [p[1], p[2], p[3], p[4]] as [string, string, string, string], a: Number(p[5]), chapter: n, level: levelOf(n) };
}).filter((q) => q.o.every(Boolean));
