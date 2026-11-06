import { describe, expect, it } from "vitest";
import { Workbook, type WorkbookData } from "./engine";
import { formatGeneral } from "./core";

/**
 * These tests encode real Excel answers (checked against Office 365) so a
 * refactor cannot quietly change what a student sees. Anything asserted here is
 * a formula the course actually teaches.
 */

function book(cells: Record<string, string>): Workbook {
  const data: WorkbookData = { sheets: [{ name: "Sheet1", cells }] };
  return new Workbook(data);
}

/** Evaluates one formula in cell Z1 of a fresh workbook. */
function calc(formula: string, extra: Record<string, string> = {}): unknown {
  const wb = book({ ...extra, Z1: formula });
  return wb.value("Sheet1", 0, 25);
}

function near(value: unknown, expected: number, digits = 6) {
  expect(typeof value).toBe("number");
  expect(Number((value as number).toFixed(digits))).toBeCloseTo(Number(expected.toFixed(digits)), digits);
}

describe("arithmetic & operators", () => {
  it("adds with the usual precedence", () => {
    expect(calc("=2+3*4")).toBe(14);
    expect(calc("=(2+3)*4")).toBe(20);
    expect(calc("=2^3^2")).toBe(64);
    expect(calc("=-2^2")).toBe(4);
    expect(calc("=10%")).toBe(0.1);
    expect(calc("=1+2&\"x\"")).toBe("3x");
  });

  it("compares like Excel (numbers < text < FALSE < TRUE)", () => {
    expect(calc("=1<2")).toBe(true);
    expect(calc("=\"a\"=\"A\"")).toBe(true);
    expect(calc("=1<\"a\"")).toBe(true);
    expect(calc("=FALSE<TRUE")).toBe(true);
    expect(calc("=\"10\">9")).toBe(true);
    expect(calc("=1/0")).toEqual({ err: "#DIV/0!" });
  });
});

describe("math functions", () => {
  it("SUM / AVERAGE / MAX / MIN ignore text inside ranges", () => {
    const wb = book({ A1: "10", A2: "text", A3: "20", B1: "=SUM(A1:A3)", B2: "=AVERAGE(A1:A3)", B3: "=MAX(A1:A3)" });
    expect(wb.value("Sheet1", 0, 1)).toBe(30);
    expect(wb.value("Sheet1", 1, 1)).toBe(15);
    expect(wb.value("Sheet1", 2, 1)).toBe(20);
  });

  it("rounds half away from zero", () => {
    expect(calc("=ROUND(2.5,0)")).toBe(3);
    expect(calc("=ROUND(-2.5,0)")).toBe(-3);
    expect(calc("=ROUND(3.14159,2)")).toBe(3.14);
    expect(calc("=ROUNDUP(3.141,2)")).toBe(3.15);
    expect(calc("=ROUNDDOWN(3.149,2)")).toBe(3.14);
    expect(calc("=MROUND(17,5)")).toBe(15);
    expect(calc("=CEILING(12,5)")).toBe(15);
    expect(calc("=FLOOR(12,5)")).toBe(10);
    expect(calc("=INT(8.9)")).toBe(8);
    expect(calc("=TRUNC(8.97,1)")).toBe(8.9);
  });

  it("handles MOD, POWER, SUMPRODUCT, SEQUENCE", () => {
    expect(calc("=MOD(10,3)")).toBe(1);
    expect(calc("=MOD(-10,3)")).toBe(2);
    expect(calc("=POWER(2,5)")).toBe(32);
    expect(calc("=SQRT(81)")).toBe(9);
    expect(calc("=PRODUCT(A1:A3)", { A1: "2", A2: "3", A3: "4" })).toBe(24);
    expect(calc("=SUMPRODUCT(A1:A3,B1:B3)", { A1: "1", A2: "2", A3: "3", B1: "10", B2: "20", B3: "30" })).toBe(140);
    expect(calc("=SUM(SEQUENCE(5))")).toBe(15);
  });

  it("has the Indian-numbering helpers students ask for", () => {
    expect(calc("=TEXT(1234567.891,\"#,##0.00\")")).toBe("1,234,567.89");
    expect(calc("=DOLLAR(1234.567,2)")).toBe("$1,234.57");
    expect(calc("=ROUND(1234.5,0)")).toBe(1235);
  });
});

describe("logical functions", () => {
  it("IF / IFS / AND / OR / NOT", () => {
    expect(calc("=IF(10>5,\"Yes\",\"No\")")).toBe("Yes");
    expect(calc("=IFS(1>2,\"A\",2>1,\"B\",TRUE,\"C\")")).toBe("B");
    expect(calc("=AND(TRUE,1>0)")).toBe(true);
    expect(calc("=OR(FALSE,1>0)")).toBe(true);
    expect(calc("=NOT(TRUE)")).toBe(false);
    expect(calc("=XOR(TRUE,TRUE,FALSE)")).toBe(false);
  });

  it("IFERROR / IFNA / SWITCH / CHOOSE", () => {
    expect(calc("=IFERROR(1/0,\"safe\")")).toBe("safe");
    expect(calc("=IFNA(NA(),\"missing\")")).toBe("missing");
    expect(calc("=IFERROR(5/2,0)")).toBe(2.5);
    expect(calc('=SWITCH(2,1,"Mon",2,"Tue","Other")')).toBe("Tue");
    expect(calc('=CHOOSE(2,"Red","Blue")')).toBe("Blue");
  });

  it("LET and LAMBDA work like Office 365", () => {
    expect(calc("=LET(x,10,y,20,x+y)")).toBe(30);
    expect(calc("=LET(tax,0.18,LET(price,100,price+price*tax))")).toBe(118);
    expect(calc("=LAMBDA(x,x*2)(21)")).toBe(42);
    expect(calc("=REDUCE(0,SEQUENCE(5),LAMBDA(a,b,a+b))")).toBe(15);
    expect(calc("=SUM(MAP(SEQUENCE(3),LAMBDA(x,x*x)))")).toBe(14);
  });
});

describe("text functions", () => {
  it("LEFT/RIGHT/MID/LEN/TRIM", () => {
    expect(calc('=LEFT("Excel",2)')).toBe("Ex");
    expect(calc('=RIGHT("Excel",2)')).toBe("el");
    expect(calc('=MID("Excel",2,3)')).toBe("xce");
    expect(calc('=LEN("Excel")')).toBe(5);
    expect(calc('=TRIM("  a   b  ")')).toBe("a b");
  });

  it("PROPER/SUBSTITUTE/REPLACE/REPT/CONCAT/TEXTJOIN", () => {
    expect(calc('=PROPER("ravi   sharma")')).toBe("Ravi   Sharma");
    expect(calc('=SUBSTITUTE("Delhi-110001","-","")')).toBe("Delhi110001");
    expect(calc('=REPLACE("380001",1,2,"38")')).toBe("380001");
    expect(calc('=REPT("ab",3)')).toBe("ababab");
    expect(calc('=CONCAT("a",1,TRUE)')).toBe("a1TRUE");
    expect(calc('=TEXTJOIN("-",TRUE,A1:A3)', { A1: "a", A2: "", A3: "b" })).toBe("a-b");
  });

  it("FIND/SEARCH/EXACT/NUMBERVALUE/VALUE", () => {
    expect(calc('=FIND("l","Excel")')).toBe(5);
    expect(calc('=SEARCH("X","Excel")')).toBe(2);
    expect(calc('=EXACT("a","A")')).toBe(false);
    expect(calc('=NUMBERVALUE("1.234,56",",",".")')).toBe(1234.56);
    expect(calc('=VALUE("1,234")')).toBe(1234);
  });

  it("TEXT date codes render like Excel", () => {
    expect(calc('=TEXT(DATE(2026,3,7),"dd-mm-yyyy")')).toBe("07-03-2026");
    expect(calc('=TEXT(DATE(2026,3,7),"dddd")')).toBe("Saturday");
    expect(calc('=TEXT(DATE(2026,3,7),"mmm-yy")')).toBe("Mar-26");
    expect(calc('=TEXT(0.5,"hh:mm AM/PM")')).toBe("12:00 PM");
    expect(calc('=TEXT(1234.5,"#,##0.00")')).toBe("1,234.50");
    expect(calc('=TEXT(45,"0.0%")')).toBe("4500.0%");
  });
});

describe("date functions", () => {
  it("DATE / EDATE / EOMONTH / DATEDIF", () => {
    expect(calc('=TEXT(DATE(2026,1,15),"dd-mm-yyyy")')).toBe("15-01-2026");
    expect(calc('=TEXT(EDATE(DATE(2026,1,31),1),"dd-mm-yyyy")')).toBe("28-02-2026");
    expect(calc('=TEXT(EOMONTH(DATE(2026,2,10),0),"dd-mm-yyyy")')).toBe("28-02-2026");
    expect(calc('=DATEDIF(DATE(2020,1,1),DATE(2026,1,1),"Y")')).toBe(6);
    expect(calc("=YEAR(DATE(2026,7,4))")).toBe(2026);
    expect(calc("=MONTH(DATE(2026,7,4))")).toBe(7);
    expect(calc("=DAY(DATE(2026,7,4))")).toBe(4);
    expect(calc('=TEXT(DATE(2026,1,5),"ddd")')).toBe("Mon");
    expect(calc("=WEEKDAY(DATE(2026,1,5),2)")).toBe(1);
    expect(calc("=ISOWEEKNUM(DATE(2026,1,5))")).toBe(2);
    expect(calc("=NETWORKDAYS(DATE(2026,1,1),DATE(2026,1,31))")).toBe(22);
    expect(calc('=TEXT(WORKDAY(DATE(2026,1,30),3),"dd-mm-yyyy")')).toBe("04-02-2026");
  });
});

describe("lookup functions", () => {
  const table = {
    A1: "ID", B1: "Name", C1: "Salary",
    A2: "E101", B2: "Aarav", C2: "48000",
    A3: "E102", B3: "Diya", C3: "72000",
    A4: "E103", B4: "Rohan", C4: "65000",
  };

  it("VLOOKUP / HLOOKUP / MATCH / INDEX", () => {
    expect(calc('=VLOOKUP("E103",A2:C4,3,FALSE)', table)).toBe(65000);
    expect(calc('=VLOOKUP("E105",A2:C4,3,FALSE)', table)).toEqual({ err: "#N/A" });
    expect(calc('=INDEX(C2:C4,MATCH("E102",A2:A4,0))', table)).toBe(72000);
    expect(calc('=MATCH("E102",A2:A4,0)', table)).toBe(2);
    expect(calc('=HLOOKUP("Name",A1:C4,4,FALSE)', table)).toBe("Rohan");
  });

  it("XLOOKUP defaults to exact match with #N/A fallback", () => {
    expect(calc('=XLOOKUP("E101",A2:A4,C2:C4)', table)).toBe(48000);
    expect(calc('=XLOOKUP("E999",A2:A4,C2:C4)', table)).toEqual({ err: "#N/A" });
    expect(calc('=XLOOKUP("E999",A2:A4,C2:C4,"Not found")', table)).toBe("Not found");
    expect(calc('=XLOOKUP("E103",A2:A4,B2:B4)', table)).toBe("Rohan");
  });

  it("dynamic arrays: FILTER / SORT / UNIQUE / TRANSPOSE / XMATCH", () => {
    const data = { A1: "North", B1: "10", A2: "West", B2: "20", A3: "North", B3: "30" };
    const filtered = calc("=SUM(FILTER(B1:B3,A1:A3=\"North\"))", data);
    expect(filtered).toBe(40);
    expect(calc("=COUNTA(UNIQUE(A1:A3))", data)).toBe(2);
    expect(calc("=INDEX(SORT(B1:B3,1,-1),1,1)", data)).toBe(30);
    expect(calc("=XMATCH(\"West\",A1:A3)", data)).toBe(2);
  });
});

describe("criteria-based aggregates", () => {
  const rows = {
    A1: "Region", B1: "Item", C1: "Sales",
    A2: "North", B2: "Laptop", C2: "45000",
    A3: "West", B3: "Mouse", C3: "8000",
    A4: "North", B4: "Monitor", C4: "25000",
    A5: "South", B5: "Desk", C5: "18000",
  };

  it("SUMIF / COUNTIF / AVERAGEIF", () => {
    expect(calc('=SUMIF(A2:A5,"North",C2:C5)', rows)).toBe(70000);
    expect(calc('=COUNTIF(A2:A5,"North")', rows)).toBe(2);
    expect(calc('=AVERAGEIF(A2:A5,"North",C2:C5)', rows)).toBe(35000);
    expect(calc('=COUNTIF(C2:C5,">20000")', rows)).toBe(2);
    expect(calc('=SUMIF(B2:B5,"*o*",C2:C5)', rows)).toBe(78000);
    expect(calc('=COUNTIF(A2:A5,"<>North")', rows)).toBe(2);
  });

  it("SUMIFS / COUNTIFS / MINIFS / MAXIFS", () => {
    expect(calc('=SUMIFS(C2:C5,A2:A5,"North",C2:C5,">30000")', rows)).toBe(45000);
    expect(calc('=COUNTIFS(A2:A5,"North",C2:C5,">1000")', rows)).toBe(2);
    expect(calc('=MAXIFS(C2:C5,A2:A5,"North")', rows)).toBe(45000);
    expect(calc('=MINIFS(C2:C5,A2:A5,"North")', rows)).toBe(25000);
  });
});

describe("statistics", () => {
  it("AVERAGE/COUNT/COUNTA/MEDIAN/STDEV/MODE/LARGE", () => {
    const d = { A1: "2", A2: "4", A3: "4", A4: "6", A5: "10" };
    expect(calc("=AVERAGE(A1:A5)", d)).toBe(5.2);
    expect(calc("=COUNT(A1:A5)", d)).toBe(5);
    expect(calc("=MEDIAN(A1:A5)", d)).toBe(4);
    expect(calc("=MODE.SNGL(A1:A5)", d)).toBe(4);
    expect(calc("=LARGE(A1:A5,2)", d)).toBe(6);
    expect(calc("=SMALL(A1:A5,2)", d)).toBe(4);
    near(calc("=STDEV.S(A1:A5)", d), 3.03315, 5);
    near(calc("=VAR.P(A1:A5)", d), 7.36, 5);
    near(calc("=PERCENTILE.INC(A1:A5,0.5)", d), 4, 5);
    expect(calc("=COUNTA(A1:A5)", { A1: "x", A2: "", A3: "0" })).toBe(2);
  });
});

describe("financial functions (EMI / NPV / depreciation)", () => {
  it("PMT gives the same EMI as Excel for a home loan", () => {
    // ₹25,00,000 at 8.5% for 20 years → monthly EMI ≈ 21,695.58
    near(calc("=-PMT(8.5%/12,20*12,2500000)"), 21695.58, 2);
    near(calc("=PMT(0,12,1200)"), -100, 6);
  });

  it("FV / PV / NPER / RATE / IPMT / PPMT", () => {
    near(calc("=FV(6%/12,10,-1000)"), 10228.03, 2);
    near(calc("=PV(10%,5,0,-1000)"), 620.92, 2);
    near(calc("=NPER(0.01,-100,1000)"), 10.5885, 2);
    near(calc("=RATE(10,-100,1000)"), 0.0, 6);
    near(calc("=IPMT(10%/12,1,12,12000)"), -100, 4);
    near(calc("=PPMT(10%/12,1,12,12000)"), -954.99, 2);
  });

  it("NPV / IRR / XNPV / SLN / SYD / DDB", () => {
    const cf = { A1: "-1000", A2: "300", A3: "400", A4: "500" };
    near(calc("=NPV(10%,A2:A4)-1000", cf), -21.04, 1);
    near(calc("=IRR(A1:A4)", cf), 0.0895, 3);
    expect(calc("=SLN(10000,1000,5)")).toBe(1800);
    expect(calc("=SYD(10000,1000,5,1)")).toBe(3000);
    near(calc("=DDB(10000,1000,5,1)"), 4000, 4);
  });

  it("Indian GST helpers work with plain arithmetic + ROUND", () => {
    expect(calc("=ROUND(1180/1.18*0.09,2)")).toBe(90);
  });
});

describe("database functions (DSUM & friends)", () => {
  const table = {
    A1: "Region", B1: "Item", C1: "Sales",
    A2: "North", B2: "Laptop", C2: "45000",
    A3: "West", B3: "Mouse", C3: "8000",
    A4: "North", B4: "Monitor", C4: "25000",
    E1: "Region", E2: "North",
  };

  it("matches the criteria block", () => {
    expect(calc("=DSUM(A1:C4,\"Sales\",E1:E2)", table)).toBe(70000);
    expect(calc("=DCOUNT(A1:C4,\"Sales\",E1:E2)", table)).toBe(2);
    expect(calc("=DMAX(A1:C4,\"Sales\",E1:E2)", table)).toBe(45000);
    expect(calc("=DAVERAGE(A1:C4,\"Sales\",E1:E2)", table)).toBe(35000);
  });
});

describe("engine behaviour", () => {
  it("detects circular references instead of hanging", () => {
    const wb = book({ A1: "=A2", A2: "=A1" });
    expect(wb.value("Sheet1", 0, 0)).toEqual({ err: "#CYCLE!" });
  });

  it("resolves forward references", () => {
    const wb = book({ A1: "=B1+1", B1: "=C1*2", C1: "5" });
    expect(wb.value("Sheet1", 0, 0)).toBe(11);
  });

  it("reports unknown functions as #NAME? with a hint", () => {
    expect(calc("=NOPEFN(1)")).toMatchObject({ err: "#NAME?" });
  });

  it("treats bare text and numbers as literals", () => {
    const wb = book({ A1: "42", A2: "1,234", A3: "TRUE", A4: "0.1+0.2" });
    expect(wb.value("Sheet1", 0, 0)).toBe(42);
    expect(wb.value("Sheet1", 1, 0)).toBe(1234);
    expect(wb.value("Sheet1", 2, 0)).toBe(true);
    expect(wb.value("Sheet1", 3, 0)).toBe("0.1+0.2");
  });

  it("formats numbers without floating-point noise", () => {
    expect(formatGeneral(0.1 + 0.2)).toBe("0.3");
    expect(formatGeneral(240)).toBe("240");
  });

  it("reads named ranges", () => {
    const wb = new Workbook({
      sheets: [{ name: "Sheet1", cells: { A1: "100", B1: "=A1*TAX" } }],
      names: { TAX: "0.18" },
    });
    near(wb.value("Sheet1", 0, 1), 18, 6);
  });

  it("supports multiple sheets", () => {
    const wb = new Workbook({
      sheets: [
        { name: "Data", cells: { A1: "10", A2: "20" } },
        { name: "Report", cells: { A1: "=SUM(Data!A1:A2)" } },
      ],
    });
    expect(wb.value("Report", 0, 0)).toBe(30);
  });
});
