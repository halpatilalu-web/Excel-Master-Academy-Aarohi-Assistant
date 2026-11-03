export interface FormulaItem { cat: string; name: string; syntax: string; hindi: string; ex: string; ch: number }

const RAW: Record<string, string> = {
Math: `SUM|=SUM(number1, [number2], ...)|Numbers ka total jodta hai|=SUM(A1:A10)|5
AVERAGE|=AVERAGE(number1, ...)|Average (ausat) nikalta hai|=AVERAGE(B2:B20)|5
MIN|=MIN(number1, ...)|Sabse chhota number|=MIN(C1:C50)|5
MAX|=MAX(number1, ...)|Sabse bada number|=MAX(C1:C50)|5
PRODUCT|=PRODUCT(number1, ...)|Numbers ka guna (multiply)|=PRODUCT(A1:A4)|0
ROUND|=ROUND(number, digits)|Decimal ko paas ke number par round karta hai|=ROUND(3.14159, 2) → 3.14|0
ROUNDUP|=ROUNDUP(number, digits)|Hamesha upar ki taraf round|=ROUNDUP(3.141, 2) → 3.15|0
ROUNDDOWN|=ROUNDDOWN(number, digits)|Hamesha neeche ki taraf round|=ROUNDDOWN(3.149, 2) → 3.14|0
MROUND|=MROUND(number, multiple)|Kisi multiple tak round|=MROUND(17, 5) → 15|0
CEILING|=CEILING(number, significance)|Upar ke multiple tak round|=CEILING(12, 5) → 15|0
FLOOR|=FLOOR(number, significance)|Neeche ke multiple tak round|=FLOOR(12, 5) → 10|0
INT|=INT(number)|Decimal hata kar neeche ka integer|=INT(8.9) → 8|0
TRUNC|=TRUNC(number, [digits])|Decimal seedha kaat deta hai|=TRUNC(8.97, 1) → 8.9|0
MOD|=MOD(number, divisor)|Divide karne ke baad bacha hua hissa (remainder)|=MOD(10, 3) → 1|0
QUOTIENT|=QUOTIENT(numerator, denominator)|Bhaag ka poora hissa|=QUOTIENT(10, 3) → 3|0
ABS|=ABS(number)|Negative sign hata kar absolute value|=ABS(-25) → 25|0
SIGN|=SIGN(number)|Positive ho to 1, negative to -1, zero to 0|=SIGN(-7) → -1|0
POWER|=POWER(number, power)|Number ki power|=POWER(2, 5) → 32|0
SQRT|=SQRT(number)|Square root (varg mool)|=SQRT(81) → 9|0
EXP|=EXP(number)|e ki power|=EXP(1) → 2.718|0
LN|=LN(number)|Natural logarithm|=LN(10)|0
LOG|=LOG(number, [base])|Kisi base ka logarithm|=LOG(100, 10) → 2|0
LOG10|=LOG10(number)|Base-10 logarithm|=LOG10(1000) → 3|0
PI|=PI()|Pi ki value 3.14159...|=PI()*r^2|0
FACT|=FACT(number)|Factorial|=FACT(5) → 120|0
COMBIN|=COMBIN(n, k)|Combinations ki ginti|=COMBIN(5, 2) → 10|0
PERMUT|=PERMUT(n, k)|Permutations ki ginti|=PERMUT(5, 2) → 20|0
GCD|=GCD(n1, n2, ...)|Sabse bada saajha bhajak (HCF)|=GCD(12, 18) → 6|0
LCM|=LCM(n1, n2, ...)|Sabse chhota saajha guna (LCM)|=LCM(4, 6) → 12|0
EVEN|=EVEN(number)|Agle even number tak round|=EVEN(3) → 4|0
ODD|=ODD(number)|Agle odd number tak round|=ODD(2) → 3|0
RAND|=RAND()|0 se 1 ke beech random number|=RAND()|0
RANDBETWEEN|=RANDBETWEEN(bottom, top)|Do numbers ke beech random integer|=RANDBETWEEN(1, 100)|0
SUMPRODUCT|=SUMPRODUCT(array1, array2, ...)|Arrays ko multiply karke total — bahut powerful|=SUMPRODUCT(B2:B10, C2:C10)|0
SUMSQ|=SUMSQ(number1, ...)|Numbers ke varg ka jod|=SUMSQ(3, 4) → 25|0
SUBTOTAL|=SUBTOTAL(function_num, ref1, ...)|Filter ke baad sirf dikhne wali rows ka total|=SUBTOTAL(9, B2:B100)|8
AGGREGATE|=AGGREGATE(function, options, ref)|Errors/hidden rows ignore karke calculate|=AGGREGATE(9, 6, B2:B50)|0
SEQUENCE|=SEQUENCE(rows, [cols], [start], [step])|Numbers ki series banata hai|=SEQUENCE(5) → 1 se 5|28
ROMAN|=ROMAN(number)|Number ko Roman numeral mein|=ROMAN(2026) → MMXXVI|0
SUMIF|=SUMIF(range, criteria, [sum_range])|Shart poori hone par hi jodta hai|=SUMIF(A:A, "Delhi", B:B)|15
SUMIFS|=SUMIFS(sum_range, range1, crit1, ...)|Kai shartein lagakar jod|=SUMIFS(C:C, A:A, "Delhi", B:B, "Jan")|15`,
Logical: `IF|=IF(logical_test, value_if_true, value_if_false)|Shart sahi to ek result, galat to doosra|=IF(A1>=40, "Pass", "Fail")|11
IFS|=IFS(test1, value1, test2, value2, ...)|Kai shartein bina nesting ke|=IFS(A1>=90,"A", A1>=60,"B", TRUE,"C")|12
AND|=AND(logical1, logical2, ...)|Sabhi shartein sahi hon tabhi TRUE|=AND(A1>40, B1>40)|13
OR|=OR(logical1, logical2, ...)|Koi ek bhi shart sahi to TRUE|=OR(A1="Yes", B1="Yes")|13
NOT|=NOT(logical)|TRUE ko FALSE aur FALSE ko TRUE|=NOT(A1>10)|13
XOR|=XOR(logical1, logical2)|Sirf ek hi sahi ho to TRUE|=XOR(A1>5, B1>5)|13
TRUE|=TRUE()|Logical value TRUE deta hai|=TRUE()|13
FALSE|=FALSE()|Logical value FALSE deta hai|=FALSE()|13
IFERROR|=IFERROR(value, value_if_error)|Error aaye to apna message dikhao|=IFERROR(A1/B1, 0)|18
IFNA|=IFNA(value, value_if_na)|Sirf #N/A error ko handle karta hai|=IFNA(VLOOKUP(...), "Nahi mila")|18
SWITCH|=SWITCH(expr, val1, res1, ..., [default])|Value ke hisaab se result chunna|=SWITCH(A1, 1,"Mon", 2,"Tue", "Other")|12
CHOOSE|=CHOOSE(index, value1, value2, ...)|Number ke hisaab se list se value|=CHOOSE(2, "Red", "Blue") → Blue|0
ISBLANK|=ISBLANK(cell)|Cell khali hai ya nahi|=ISBLANK(A1)|0
ISNUMBER|=ISNUMBER(value)|Kya value number hai|=ISNUMBER(A1)|0
ISTEXT|=ISTEXT(value)|Kya value text hai|=ISTEXT(A1)|0
ISERROR|=ISERROR(value)|Koi bhi error hai to TRUE|=ISERROR(A1/B1)|0
ISERR|=ISERR(value)|#N/A ke alawa error hai to TRUE|=ISERR(A1)|0
ISNA|=ISNA(value)|Kya #N/A error hai|=ISNA(A1)|0
ISLOGICAL|=ISLOGICAL(value)|Kya TRUE/FALSE hai|=ISLOGICAL(A1)|0
ISEVEN|=ISEVEN(number)|Number even hai ya nahi|=ISEVEN(A1)|0
ISODD|=ISODD(number)|Number odd hai ya nahi|=ISODD(A1)|0
ISFORMULA|=ISFORMULA(cell)|Cell mein formula hai ya nahi|=ISFORMULA(A1)|0
ISREF|=ISREF(value)|Kya value cell reference hai|=ISREF(A1)|0
N|=N(value)|Value ko number mein badalta hai|=N(TRUE) → 1|0
NA|=NA()|Jaanbujhkar #N/A error deta hai|=NA()|0
LET|=LET(name1, value1, ..., calculation)|Naam dekar formula ke andar variable banao — formula chhota aur tez|=LET(x, A1*2, x+x/2)|0
LAMBDA|=LAMBDA(parameter, ..., calculation)|Apna khud ka custom function banao|=LAMBDA(x, x*18%)(100)|0
MAP|=MAP(array, LAMBDA(x, ...))|Har item par LAMBDA chalata hai|=MAP(A1:A5, LAMBDA(x, x*2))|0
REDUCE|=REDUCE(initial, array, LAMBDA(acc, x, ...))|Array ko ek single value mein samet deta hai|=REDUCE(0, A1:A5, LAMBDA(a,x, a+x))|0
BYROW|=BYROW(array, LAMBDA(row, ...))|Har row par calculation|=BYROW(A1:C5, LAMBDA(r, SUM(r)))|0
BYCOL|=BYCOL(array, LAMBDA(col, ...))|Har column par calculation|=BYCOL(A1:C5, LAMBDA(c, MAX(c)))|0
SCAN|=SCAN(initial, array, LAMBDA(acc, x, ...))|Running total jaisa step-by-step result|=SCAN(0, A1:A5, LAMBDA(a,x, a+x))|0`,
Text: `LEFT|=LEFT(text, [num_chars])|Text ke shuru ke characters|=LEFT("Excel", 2) → Ex|16
RIGHT|=RIGHT(text, [num_chars])|Text ke aakhir ke characters|=RIGHT("Excel", 2) → el|16
MID|=MID(text, start, num_chars)|Beech se characters nikalta hai|=MID("Excel", 2, 3) → xce|16
LEN|=LEN(text)|Text ki lambai (characters ki ginti)|=LEN("Excel") → 5|16
UPPER|=UPPER(text)|Sab CAPITAL letters|=UPPER("excel") → EXCEL|16
LOWER|=LOWER(text)|Sab chhote letters|=LOWER("EXCEL") → excel|16
PROPER|=PROPER(text)|Har shabd ka pehla akshar bada|=PROPER("ravi kumar") → Ravi Kumar|16
TRIM|=TRIM(text)|Extra spaces hata deta hai|=TRIM("  Hi  there ")|16
CLEAN|=CLEAN(text)|Chhupe hue non-printing characters hatata hai|=CLEAN(A1)|16
CONCATENATE|=CONCATENATE(text1, text2, ...)|Text jodta hai (purana tareeka)|=CONCATENATE(A1, " ", B1)|16
CONCAT|=CONCAT(text1, text2, ...)|Range ke text bhi jod sakta hai|=CONCAT(A1:C1)|16
TEXTJOIN|=TEXTJOIN(delimiter, ignore_empty, text1, ...)|Separator ke saath text jodta hai|=TEXTJOIN(", ", TRUE, A1:A5)|16
TEXTSPLIT|=TEXTSPLIT(text, col_delim, [row_delim])|Text ko delimiter se alag-alag cells mein todta hai|=TEXTSPLIT("a,b,c", ",")|28
TEXTBEFORE|=TEXTBEFORE(text, delimiter)|Delimiter se pehle ka text|=TEXTBEFORE("ram@mail.com", "@") → ram|0
TEXTAFTER|=TEXTAFTER(text, delimiter)|Delimiter ke baad ka text|=TEXTAFTER("ram@mail.com", "@")|0
FIND|=FIND(find_text, within_text, [start])|Text ki position (capital/small matter karta hai)|=FIND("c", "Excel") → 3|16
SEARCH|=SEARCH(find_text, within_text, [start])|Position, case ignore aur wildcard chalta hai|=SEARCH("C", "Excel") → 3|16
SUBSTITUTE|=SUBSTITUTE(text, old, new, [instance])|Text ke andar purane ko naya bana deta hai|=SUBSTITUTE(A1, "-", "")|16
REPLACE|=REPLACE(old_text, start, num_chars, new_text)|Position ke hisaab se badalta hai|=REPLACE("2024", 1, 2, "19")|16
TEXT|=TEXT(value, format_text)|Number/date ko apne format ke text mein badalta hai|=TEXT(A1, "dd-mmm-yyyy")|16
VALUE|=VALUE(text)|Number jaisa dikhne wale text ko asli number banata hai|=VALUE("123")|16
NUMBERVALUE|=NUMBERVALUE(text, [decimal], [group])|Alag format ke text ko number banata hai|=NUMBERVALUE("1.234,5", ",", ".")|0
REPT|=REPT(text, times)|Text ko baar-baar dohrata hai|=REPT("*", 5) → *****|16
EXACT|=EXACT(text1, text2)|Do text bilkul same hain ya nahi (case sensitive)|=EXACT("a", "A") → FALSE|16
CHAR|=CHAR(number)|ASCII code se character|=CHAR(65) → A|0
CODE|=CODE(text)|Pehle character ka ASCII code|=CODE("A") → 65|0
UNICHAR|=UNICHAR(number)|Unicode number se character|=UNICHAR(9731)|0
T|=T(value)|Sirf text ko wapas deta hai|=T(A1)|0
FIXED|=FIXED(number, [decimals], [no_commas])|Number ko fixed decimals ke text mein|=FIXED(1234.567, 1)|0
DOLLAR|=DOLLAR(number, [decimals])|Number ko currency text mein|=DOLLAR(1234.5)|0
LENB|=LENB(text)|Bytes mein lambai|=LENB(A1)|0
ARRAYTOTEXT|=ARRAYTOTEXT(array)|Array ko text mein badalta hai|=ARRAYTOTEXT(A1:C1)|0
VALUETOTEXT|=VALUETOTEXT(value)|Value ko text mein badalta hai|=VALUETOTEXT(A1)|0
TEXTLEN trick|=LEN(A1)-LEN(SUBSTITUTE(A1," ",""))+1|Cell mein kitne shabd hain ginne ka tareeka|=LEN(A1)-LEN(SUBSTITUTE(A1," ",""))+1|16
FIRST NAME trick|=LEFT(A1, FIND(" ", A1)-1)|Poore naam se pehla naam nikalna|=LEFT("Ravi Kumar", FIND(" ","Ravi Kumar")-1)|16`,
Date: `TODAY|=TODAY()|Aaj ki date (har din badalti hai)|=TODAY()|17
NOW|=NOW()|Abhi ki date aur time|=NOW()|17
DATE|=DATE(year, month, day)|Alag-alag hisson se date banata hai|=DATE(2026, 11, 2)|17
TIME|=TIME(hour, minute, second)|Time banata hai|=TIME(9, 30, 0)|17
DAY|=DAY(date)|Date se din (1-31)|=DAY(A1)|17
MONTH|=MONTH(date)|Date se mahina (1-12)|=MONTH(A1)|17
YEAR|=YEAR(date)|Date se saal|=YEAR(A1)|17
HOUR|=HOUR(time)|Time se ghanta|=HOUR(NOW())|17
MINUTE|=MINUTE(time)|Time se minute|=MINUTE(NOW())|17
SECOND|=SECOND(time)|Time se second|=SECOND(NOW())|17
WEEKDAY|=WEEKDAY(date, [type])|Hafte ka din number (1=Sunday)|=WEEKDAY(A1, 2)|17
WEEKNUM|=WEEKNUM(date, [type])|Saal ka kaun sa hafta|=WEEKNUM(A1)|17
ISOWEEKNUM|=ISOWEEKNUM(date)|ISO standard hafte ka number|=ISOWEEKNUM(A1)|0
DATEDIF|=DATEDIF(start, end, unit)|Do dates ke beech saal/mahine/din ("Y","M","D")|=DATEDIF(A1, TODAY(), "Y")|17
DAYS|=DAYS(end_date, start_date)|Do dates ke beech ke din|=DAYS(B1, A1)|17
DAYS360|=DAYS360(start, end)|360-din ke saal ke hisaab se din|=DAYS360(A1, B1)|0
YEARFRAC|=YEARFRAC(start, end, [basis])|Do dates ke beech saal ka hissa|=YEARFRAC(A1, B1)|0
EDATE|=EDATE(start_date, months)|Kuch mahine aage/peeche ki date|=EDATE(A1, 6)|17
EOMONTH|=EOMONTH(start_date, months)|Mahine ki aakhri date|=EOMONTH(TODAY(), 0)|17
WORKDAY|=WORKDAY(start, days, [holidays])|Kaam ke din (Sat-Sun chhodkar) jodkar date|=WORKDAY(A1, 10)|17
WORKDAY.INTL|=WORKDAY.INTL(start, days, [weekend], [holidays])|Apne weekend ke hisaab se kaam ki date|=WORKDAY.INTL(A1, 10, 11)|0
NETWORKDAYS|=NETWORKDAYS(start, end, [holidays])|Do dates ke beech kaam ke din|=NETWORKDAYS(A1, B1)|17
NETWORKDAYS.INTL|=NETWORKDAYS.INTL(start, end, [weekend])|Custom weekend ke saath kaam ke din|=NETWORKDAYS.INTL(A1, B1, 7)|0
DATEVALUE|=DATEVALUE(date_text)|Text date ko asli date mein|=DATEVALUE("02-11-2026")|17
TIMEVALUE|=TIMEVALUE(time_text)|Text time ko asli time mein|=TIMEVALUE("9:30 AM")|17
Age trick|=DATEDIF(DOB, TODAY(), "Y") & " saal"|Umar nikalne ka formula|=DATEDIF(A2, TODAY(), "Y")|17
Month name|=TEXT(A1, "mmmm")|Date se mahine ka naam|=TEXT(A1, "mmmm") → November|17
Day name|=TEXT(A1, "dddd")|Date se din ka naam|=TEXT(A1, "dddd") → Monday|17
Financial year|=IF(MONTH(A1)>=4, YEAR(A1), YEAR(A1)-1)|April-March financial year nikalna (India)|=IF(MONTH(A1)>=4,YEAR(A1),YEAR(A1)-1)|17`,
Lookup: `VLOOKUP|=VLOOKUP(lookup_value, table, col_index, [exact])|Pehle column mein dhoondh kar daayen se value laata hai|=VLOOKUP(A2, F:H, 3, FALSE)|18
HLOOKUP|=HLOOKUP(lookup_value, table, row_index, [exact])|Pehli row mein dhoondh kar neeche se value|=HLOOKUP(A1, A1:F5, 3, FALSE)|19
XLOOKUP|=XLOOKUP(lookup, lookup_array, return_array, [not_found])|Naya aur behtar lookup — kisi bhi disha mein|=XLOOKUP(A2, F:F, H:H, "Nahi mila")|19
XMATCH|=XMATCH(lookup, array, [match_mode])|XLOOKUP jaisa naya MATCH|=XMATCH("Ravi", A1:A10)|19
LOOKUP|=LOOKUP(value, lookup_vector, [result_vector])|Purana simple lookup|=LOOKUP(A1, B1:B5, C1:C5)|0
INDEX|=INDEX(array, row, [col])|Row-column ki position se value|=INDEX(A1:C10, 3, 2)|20
MATCH|=MATCH(value, array, [type])|Value ki position batata hai|=MATCH("Ravi", A1:A10, 0)|20
INDEX-MATCH|=INDEX(return_col, MATCH(value, lookup_col, 0))|VLOOKUP se behtar combo — left side bhi dekh sakta hai|=INDEX(C:C, MATCH(A2, A:A, 0))|20
OFFSET|=OFFSET(ref, rows, cols, [height], [width])|Reference se kuch rows/cols door ki range|=OFFSET(A1, 2, 1)|0
INDIRECT|=INDIRECT(ref_text)|Text se cell reference banata hai|=INDIRECT("Sheet2!A1")|0
ROW|=ROW([ref])|Row number|=ROW(A5) → 5|0
ROWS|=ROWS(array)|Range mein kitni rows hain|=ROWS(A1:A10) → 10|0
COLUMN|=COLUMN([ref])|Column number|=COLUMN(C1) → 3|0
COLUMNS|=COLUMNS(array)|Range mein kitne columns hain|=COLUMNS(A1:D1) → 4|0
ADDRESS|=ADDRESS(row, col)|Row-column se cell ka address text|=ADDRESS(2, 3) → $C$2|0
CELL|=CELL(info_type, [ref])|Cell ke baare mein jaankari|=CELL("filename")|0
HYPERLINK|=HYPERLINK(link, [friendly_name])|Clickable link banata hai|=HYPERLINK("https://google.com", "Google")|0
TRANSPOSE|=TRANSPOSE(array)|Rows ko columns aur columns ko rows banata hai|=TRANSPOSE(A1:C1)|0
AREAS|=AREAS(reference)|Reference mein kitne areas hain|=AREAS(A1:B2)|0
FORMULATEXT|=FORMULATEXT(reference)|Cell ke formula ko text mein dikhata hai|=FORMULATEXT(B2)|0
SHEET|=SHEET([value])|Sheet ka number|=SHEET()|0
SHEETS|=SHEETS([ref])|Workbook mein kitni sheets|=SHEETS()|0
GETPIVOTDATA|=GETPIVOTDATA(data_field, pivot_cell, ...)|Pivot table se value nikalta hai|=GETPIVOTDATA("Sales", A3)|23
TAKE|=TAKE(array, rows, [cols])|Array ke shuru/aakhir ki rows lena|=TAKE(A1:C10, 3)|28
DROP|=DROP(array, rows, [cols])|Array se rows/cols hata dena|=DROP(A1:C10, 1)|28
CHOOSECOLS|=CHOOSECOLS(array, col1, ...)|Chune hue columns lena|=CHOOSECOLS(A1:E10, 1, 3)|28
CHOOSEROWS|=CHOOSEROWS(array, row1, ...)|Chuni hui rows lena|=CHOOSEROWS(A1:E10, 1, 5)|28`,
Statistical: `COUNT|=COUNT(value1, ...)|Sirf numbers wale cells ginta hai|=COUNT(A1:A20)|14
COUNTA|=COUNTA(value1, ...)|Jo cells khali nahi hain unhe ginta hai|=COUNTA(A1:A20)|14
COUNTBLANK|=COUNTBLANK(range)|Khali cells ginta hai|=COUNTBLANK(A1:A20)|14
COUNTIF|=COUNTIF(range, criteria)|Shart poori karne wale cells ginta hai|=COUNTIF(A:A, "Delhi")|14
COUNTIFS|=COUNTIFS(range1, crit1, range2, crit2...)|Kai shartein lagakar ginti|=COUNTIFS(A:A,"Delhi", B:B,">50")|14
AVERAGEIF|=AVERAGEIF(range, criteria, [avg_range])|Shart par average|=AVERAGEIF(A:A,"Delhi",B:B)|15
AVERAGEIFS|=AVERAGEIFS(avg_range, range1, crit1, ...)|Kai shartein lagakar average|=AVERAGEIFS(C:C, A:A,"Delhi", B:B,"Jan")|15
MAXIFS|=MAXIFS(max_range, range1, crit1, ...)|Shart par sabse bada|=MAXIFS(C:C, A:A, "Delhi")|15
MINIFS|=MINIFS(min_range, range1, crit1, ...)|Shart par sabse chhota|=MINIFS(C:C, A:A, "Delhi")|15
MEDIAN|=MEDIAN(number1, ...)|Beech wali value|=MEDIAN(A1:A20)|0
MODE|=MODE.SNGL(number1, ...)|Sabse zyada baar aane wali value|=MODE.SNGL(A1:A20)|0
LARGE|=LARGE(array, k)|K-th sabse bada number|=LARGE(A1:A20, 3)|0
SMALL|=SMALL(array, k)|K-th sabse chhota number|=SMALL(A1:A20, 2)|0
RANK|=RANK.EQ(number, ref, [order])|Number ka rank (1 = sabse bada)|=RANK.EQ(B2, B$2:B$20)|0
PERCENTILE|=PERCENTILE.INC(array, k)|Percentile value (k = 0 se 1)|=PERCENTILE.INC(A1:A20, 0.9)|0
PERCENTRANK|=PERCENTRANK.INC(array, x)|Value ka percentile rank|=PERCENTRANK.INC(A1:A20, 50)|0
QUARTILE|=QUARTILE.INC(array, quart)|Quartile (0 se 4)|=QUARTILE.INC(A1:A20, 1)|0
STDEV|=STDEV.S(number1, ...)|Sample standard deviation|=STDEV.S(A1:A20)|0
STDEV.P|=STDEV.P(number1, ...)|Poori population ka standard deviation|=STDEV.P(A1:A20)|0
VAR|=VAR.S(number1, ...)|Sample variance|=VAR.S(A1:A20)|0
CORREL|=CORREL(array1, array2)|Do series ka correlation|=CORREL(A1:A10, B1:B10)|0
COVARIANCE|=COVARIANCE.S(array1, array2)|Do series ka covariance|=COVARIANCE.S(A1:A10, B1:B10)|0
SLOPE|=SLOPE(known_y, known_x)|Regression line ka slope|=SLOPE(B1:B10, A1:A10)|0
INTERCEPT|=INTERCEPT(known_y, known_x)|Regression line ka intercept|=INTERCEPT(B1:B10, A1:A10)|0
FORECAST|=FORECAST.LINEAR(x, known_y, known_x)|Trend ke hisaab se agli value ka anuman|=FORECAST.LINEAR(11, B1:B10, A1:A10)|27
TREND|=TREND(known_y, [known_x], [new_x])|Linear trend ki values|=TREND(B1:B10, A1:A10)|0
GEOMEAN|=GEOMEAN(number1, ...)|Geometric mean|=GEOMEAN(A1:A10)|0
AVEDEV|=AVEDEV(number1, ...)|Average deviation|=AVEDEV(A1:A10)|0
FREQUENCY|=FREQUENCY(data_array, bins_array)|Data kis range mein kitni baar aaya|=FREQUENCY(A1:A20, C1:C5)|0
TRIMMEAN|=TRIMMEAN(array, percent)|Chhor ki values hata kar average|=TRIMMEAN(A1:A20, 0.2)|0
DEVSQ|=DEVSQ(number1, ...)|Mean se deviation ke varg ka jod|=DEVSQ(A1:A10)|0
NORM.DIST|=NORM.DIST(x, mean, sd, cumulative)|Normal distribution|=NORM.DIST(60, 50, 10, TRUE)|0
RSQ|=RSQ(known_y, known_x)|R-squared — model kitna sahi baithta hai|=RSQ(B1:B10, A1:A10)|0`,
Financial: `PMT|=PMT(rate, nper, pv, [fv], [type])|Loan ki har mahine ki EMI|=PMT(9%/12, 60, -500000)|0
IPMT|=IPMT(rate, per, nper, pv)|EMI mein byaaj ka hissa|=IPMT(9%/12, 1, 60, -500000)|0
PPMT|=PPMT(rate, per, nper, pv)|EMI mein mool-dhan ka hissa|=PPMT(9%/12, 1, 60, -500000)|0
FV|=FV(rate, nper, pmt, [pv])|Future value — nivesh aage kitna banega|=FV(8%/12, 120, -5000)|0
PV|=PV(rate, nper, pmt, [fv])|Present value — aaj ki keemat|=PV(8%/12, 60, -10000)|0
NPER|=NPER(rate, pmt, pv)|Kitni kishton mein loan chukega|=NPER(9%/12, -10000, 500000)|0
RATE|=RATE(nper, pmt, pv)|Loan par byaaj dar nikalna|=RATE(60, -10000, 500000)*12|0
NPV|=NPV(rate, value1, value2, ...)|Net present value — project faydemand hai ya nahi|=NPV(10%, B2:B6)+B1|0
XNPV|=XNPV(rate, values, dates)|Alag-alag dates wale cash flow ka NPV|=XNPV(10%, B2:B6, A2:A6)|0
IRR|=IRR(values, [guess])|Internal rate of return|=IRR(B1:B6)|0
XIRR|=XIRR(values, dates)|Dates ke saath IRR (SIP returns ke liye)|=XIRR(B2:B20, A2:A20)|0
MIRR|=MIRR(values, finance_rate, reinvest_rate)|Modified IRR|=MIRR(B1:B6, 8%, 10%)|0
EFFECT|=EFFECT(nominal_rate, npery)|Asli (effective) saalana byaaj dar|=EFFECT(12%, 12)|0
NOMINAL|=NOMINAL(effect_rate, npery)|Nominal byaaj dar|=NOMINAL(12.68%, 12)|0
CUMIPMT|=CUMIPMT(rate, nper, pv, start, end, type)|Do periods ke beech kul byaaj|=CUMIPMT(9%/12, 60, 500000, 1, 12, 0)|0
CUMPRINC|=CUMPRINC(rate, nper, pv, start, end, type)|Do periods ke beech kul mool-dhan|=CUMPRINC(9%/12, 60, 500000, 1, 12, 0)|0
SLN|=SLN(cost, salvage, life)|Straight-line depreciation (ghisavat)|=SLN(100000, 10000, 5)|0
DB|=DB(cost, salvage, life, period)|Declining balance depreciation|=DB(100000, 10000, 5, 1)|0
DDB|=DDB(cost, salvage, life, period)|Double declining depreciation|=DDB(100000, 10000, 5, 1)|0
SYD|=SYD(cost, salvage, life, per)|Sum-of-years digits depreciation|=SYD(100000, 10000, 5, 1)|0
RRI|=RRI(nper, pv, fv)|CAGR — saalana chakravriddhi dar|=RRI(5, 100000, 180000)|0
PDURATION|=PDURATION(rate, pv, fv)|Paisa double hone mein kitne period|=PDURATION(8%, 1, 2)|0
ISPMT|=ISPMT(rate, per, nper, pv)|Seedhe byaaj wale loan ka byaaj|=ISPMT(9%/12, 1, 60, 500000)|0
GST add|=Price*(1+GST%)|Price mein GST jodna|=A2*(1+18%)|0
GST remove|=Total/(1+GST%)|GST-inclusive price se GST hatana|=A2/(1+18%)|0
Percentage|=Part/Total|Pratishat nikalna (cell ko % format do)|=B2/SUM(B$2:B$10)|0
Growth %|=(New-Old)/Old|Pichhle se kitna badha/ghata|=(C2-B2)/B2|0`,
"Dynamic Arrays": `FILTER|=FILTER(array, include, [if_empty])|Shart ke hisaab se data chhanta hai|=FILTER(A2:C100, B2:B100="Delhi")|28
UNIQUE|=UNIQUE(array, [by_col], [exactly_once])|Duplicate hatakar unique list|=UNIQUE(A2:A100)|28
SORT|=SORT(array, [sort_index], [order])|Data ko sort karta hai|=SORT(A2:B100, 2, -1)|28
SORTBY|=SORTBY(array, by_array1, [order1], ...)|Dusre column ke hisaab se sort|=SORTBY(A2:A100, B2:B100, -1)|28
SEQUENCE (DA)|=SEQUENCE(rows, [cols], [start], [step])|Numbers ka array banata hai|=SEQUENCE(3, 4)|28
RANDARRAY|=RANDARRAY([rows], [cols], [min], [max], [int])|Random numbers ka array|=RANDARRAY(5, 1, 1, 100, TRUE)|28
XLOOKUP (DA)|=XLOOKUP(A2:A5, F:F, G:G)|Ek saath kai values ka lookup (spill)|=XLOOKUP(A2:A5, F:F, G:G)|28
TOCOL|=TOCOL(array, [ignore], [scan_by_col])|Range ko ek column mein badalta hai|=TOCOL(A1:C5)|0
TOROW|=TOROW(array, [ignore])|Range ko ek row mein badalta hai|=TOROW(A1:C5)|0
WRAPROWS|=WRAPROWS(vector, wrap_count)|Ek list ko rows mein tod kar table banata hai|=WRAPROWS(A1:A12, 4)|0
WRAPCOLS|=WRAPCOLS(vector, wrap_count)|Ek list ko columns mein tod kar table|=WRAPCOLS(A1:A12, 4)|0
VSTACK|=VSTACK(array1, array2, ...)|Do tables ko upar-neeche jodta hai|=VSTACK(A1:B5, D1:E5)|0
HSTACK|=HSTACK(array1, array2, ...)|Do tables ko side-by-side jodta hai|=HSTACK(A1:A5, C1:C5)|0
EXPAND|=EXPAND(array, rows, [cols], [pad])|Array ko bada karta hai|=EXPAND(A1:B2, 4, 4, 0)|0
GROUPBY|=GROUPBY(row_fields, values, function)|Formula se pivot jaisa summary|=GROUPBY(A2:A100, C2:C100, SUM)|0
PIVOTBY|=PIVOTBY(rows, cols, values, function)|Formula se do-tarfa pivot|=PIVOTBY(A2:A100, B2:B100, C2:C100, SUM)|0
Spill (#)|=A2#|Spill range ka reference — poora array|=SUM(A2#)|28
Top 3|=TAKE(SORT(A2:B100, 2, -1), 3)|Top 3 records nikalna|=TAKE(SORT(A2:B100, 2, -1), 3)|28
Count unique|=COUNTA(UNIQUE(A2:A100))|Kitni alag-alag values hain|=COUNTA(UNIQUE(A2:A100))|28
Multi filter|=FILTER(A2:C100, (B2:B100="Delhi")*(C2:C100>500))|Do shartein AND ke saath|=FILTER(A2:C100,(B2:B100="Delhi")*(C2:C100>500))|28
OR filter|=FILTER(A2:C100, (B2:B100="Delhi")+(B2:B100="Pune"))|Do shartein OR ke saath|=FILTER(A2:C100,(B2:B100="Delhi")+(B2:B100="Pune"))|28
Dropdown filter|=FILTER(A2:C100, B2:B100=E1)|Dropdown se chuni value ka data|=FILTER(A2:C100, B2:B100=E1)|28
XLOOKUP multi|=XLOOKUP(1, (A:A=E1)*(B:B=E2), C:C)|Do shartein ke saath lookup|=XLOOKUP(1,(A:A=E1)*(B:B=E2),C:C)|19
Running total|=SCAN(0, B2:B20, LAMBDA(a, x, a+x))|Jodte-jodte chalta total|=SCAN(0,B2:B20,LAMBDA(a,x,a+x))|0
Text array|=TEXTJOIN(", ", TRUE, UNIQUE(A2:A100))|Unique values ek cell mein|=TEXTJOIN(", ",TRUE,UNIQUE(A2:A100))|28`,
};

export const FORMULA_CATS = Object.keys(RAW);
export const FORMULAS: FormulaItem[] = Object.entries(RAW).flatMap(([cat, block]) =>
  block.split("\n").filter(Boolean).map((l) => {
    const [name, syntax, hindi, ex, ch] = l.split("|");
    return { cat, name, syntax, hindi, ex, ch: Number(ch) || 0 };
  })
);
