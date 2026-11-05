export interface VbaItem { level: "Basic" | "Intermediate" | "Advanced"; title: string; hindi: string; code: string }

const RAW = `Basic
Hello MsgBox
Screen par message box dikhata hai — VBA ka pehla program
Sub HelloWorld()
    MsgBox "Namaste, Excel Master Academy!"
End Sub
===
Basic
Cell mein value likhna
A1 cell mein text aur B1 mein number daalta hai
Sub WriteValues()
    Range("A1").Value = "Naam"
    Range("B1").Value = 100
End Sub
===
Basic
Cell ki value padhna
A1 ki value ko message box mein dikhata hai
Sub ReadValue()
    MsgBox Range("A1").Value
End Sub
===
Basic
InputBox se value lena
User se naam puchh kar cell mein likhta hai
Sub AskName()
    Dim nm As String
    nm = InputBox("Aapka naam?")
    Range("A1").Value = nm
End Sub
===
Basic
Variable declare karna
Dim se variable banate hain — Option Explicit hamesha likho
Option Explicit
Sub Vars()
    Dim total As Double, cnt As Long
    total = 1500.5
    cnt = 3
    MsgBox total / cnt
End Sub
===
Basic
Cell ka colour badalna
A1:C1 ko peela background aur bold banata hai
Sub ColorCells()
    With Range("A1:C1")
        .Interior.Color = RGB(255, 235, 59)
        .Font.Bold = True
    End With
End Sub
===
Basic
Formula cell mein daalna
B10 mein SUM formula lagata hai
Sub AddFormula()
    Range("B10").Formula = "=SUM(B1:B9)"
End Sub
===
Basic
Sheet ka naam badalna
Active sheet ka naam change karta hai
Sub RenameSheet()
    ActiveSheet.Name = "Report"
End Sub
===
Basic
Nayi sheet jodna
Workbook ke end mein nayi sheet banata hai
Sub AddSheet()
    Sheets.Add(After:=Sheets(Sheets.Count)).Name = "Summary"
End Sub
===
Basic
Content saaf karna
A1:D20 ka data hata deta hai (formatting rehti hai)
Sub ClearData()
    Range("A1:D20").ClearContents
End Sub
===
Intermediate
For Next loop
1 se 10 tak numbers A column mein likhta hai
Sub NumberList()
    Dim i As Long
    For i = 1 To 10
        Cells(i, 1).Value = i
    Next i
End Sub
===
Intermediate
Aakhri row dhoondhna
Column A ki aakhri bhari hui row batata hai
Sub LastRow()
    Dim lr As Long
    lr = Cells(Rows.Count, 1).End(xlUp).Row
    MsgBox "Aakhri row: " & lr
End Sub
===
Intermediate
If Then Else se Pass/Fail
B column ke marks dekh kar C mein result likhta hai
Sub PassFail()
    Dim r As Long, lr As Long
    lr = Cells(Rows.Count, 2).End(xlUp).Row
    For r = 2 To lr
        If Cells(r, 2).Value >= 40 Then
            Cells(r, 3).Value = "Pass"
        Else
            Cells(r, 3).Value = "Fail"
        End If
    Next r
End Sub
===
Intermediate
For Each se cells check karna
Selected cells mein negative numbers ko laal karta hai
Sub RedNegatives()
    Dim c As Range
    For Each c In Selection
        If IsNumeric(c.Value) And c.Value < 0 Then c.Font.Color = vbRed
    Next c
End Sub
===
Intermediate
Select Case
Marks ke hisaab se grade deta hai
Sub Grade()
    Dim r As Long
    For r = 2 To 20
        Select Case Cells(r, 2).Value
            Case Is >= 90: Cells(r, 3).Value = "A"
            Case Is >= 60: Cells(r, 3).Value = "B"
            Case Else: Cells(r, 3).Value = "C"
        End Select
    Next r
End Sub
===
Intermediate
Do While loop
Khali cell aane tak data par chalta hai
Sub DoLoop()
    Dim r As Long
    r = 2
    Do While Cells(r, 1).Value <> ""
        Cells(r, 4).Value = Cells(r, 2).Value * Cells(r, 3).Value
        r = r + 1
    Loop
End Sub
===
Intermediate
Duplicate hatana
A:C data se duplicate rows delete karta hai
Sub RemoveDups()
    Range("A1:C100").RemoveDuplicates Columns:=Array(1), Header:=xlYes
End Sub
===
Intermediate
Data sort karna
B column ke hisaab se bade se chhota sort
Sub SortData()
    With ActiveSheet.Sort
        .SortFields.Clear
        .SortFields.Add Key:=Range("B2:B100"), Order:=xlDescending
        .SetRange Range("A1:C100")
        .Header = xlYes
        .Apply
    End With
End Sub
===
Intermediate
Sab sheets par loop
Har sheet ke A1 mein sheet ka naam likhta hai
Sub AllSheets()
    Dim ws As Worksheet
    For Each ws In ThisWorkbook.Worksheets
        ws.Range("A1").Value = ws.Name
    Next ws
End Sub
===
Intermediate
Autofit columns
Sab columns ki width data ke hisaab se set
Sub AutoFitAll()
    Cells.EntireColumn.AutoFit
End Sub
===
Intermediate
Yes/No poochhna
MsgBox se user ka jawab lekar action leta hai
Sub Confirm()
    If MsgBox("Data delete karein?", vbYesNo + vbQuestion) = vbYes Then
        Range("A2:D100").ClearContents
    End If
End Sub
===
Intermediate
Excel formula VBA mein
WorksheetFunction se SUM, COUNTIF jaise functions chalana
Sub UseWsf()
    Dim t As Double
    t = Application.WorksheetFunction.Sum(Range("B2:B20"))
    MsgBox "Total = " & t
End Sub
===
Advanced
Custom function (UDF)
Apna formula banao — sheet mein =GSTAMOUNT(A1) likh sakte ho
Function GSTAmount(price As Double, Optional rate As Double = 0.18) As Double
    GSTAmount = price * rate
End Function
===
Advanced
Sheet ko PDF mein save
Active sheet ko Desktop par PDF export karta hai
Sub ExportPDF()
    ActiveSheet.ExportAsFixedFormat Type:=xlTypePDF, _
        Filename:=Environ("USERPROFILE") & "\Desktop\Report.pdf"
End Sub
===
Advanced
Sheets ko alag files mein save
Har sheet ko alag workbook mein copy karke save karta hai
Sub SplitSheets()
    Dim ws As Worksheet
    For Each ws In ThisWorkbook.Worksheets
        ws.Copy
        ActiveWorkbook.SaveAs ThisWorkbook.Path & "\" & ws.Name & ".xlsx"
        ActiveWorkbook.Close
    Next ws
End Sub
===
Advanced
Error handling
Error aane par program crash nahi hota, message dikhta hai
Sub SafeDivide()
    On Error GoTo Oops
    MsgBox 10 / Range("A1").Value
    Exit Sub
Oops:
    MsgBox "Galti: " & Err.Description
End Sub
===
Advanced
Workbook open event
File khulte hi welcome message dikhata hai (ThisWorkbook module mein)
Private Sub Workbook_Open()
    MsgBox "Welcome, " & Application.UserName
End Sub
===
Advanced
Cell change event
A1 badalte hi automatically kaam hota hai (Sheet module mein)
Private Sub Worksheet_Change(ByVal Target As Range)
    If Not Intersect(Target, Range("A1")) Is Nothing Then
        Range("B1").Value = Now
    End If
End Sub
===
Advanced
Dictionary se unique count
Duplicate hataakar har item ki ginti karta hai
Sub CountUnique()
    Dim d As Object, c As Range
    Set d = CreateObject("Scripting.Dictionary")
    For Each c In Range("A2:A100")
        If c.Value <> "" Then d(c.Value) = d(c.Value) + 1
    Next c
    Dim k
    For Each k In d.Keys
        Debug.Print k, d(k)
    Next k
End Sub
===
Advanced
Pivot table VBA se
Sales data se pivot table banata hai
Sub MakePivot()
    Dim pc As PivotCache, pt As PivotTable
    Set pc = ThisWorkbook.PivotCaches.Create(xlDatabase, Range("A1").CurrentRegion)
    Set pt = pc.CreatePivotTable(Sheets.Add.Range("A3"), "SalesPivot")
    pt.PivotFields("City").Orientation = xlRowField
    pt.AddDataField pt.PivotFields("Sales"), "Total Sales", xlSum
End Sub
===
Advanced
Sheet protect/unprotect
Password ke saath sheet lock karta hai
Sub LockSheet()
    ActiveSheet.Protect Password:="1234"
End Sub
===
Advanced
UserForm dikhana
Banaya hua form kholta hai
Sub ShowForm()
    UserForm1.Show
End Sub
===
Advanced
Email draft (Outlook)
Outlook mein ready email draft banata hai
Sub MailDraft()
    Dim ol As Object
    Set ol = CreateObject("Outlook.Application").CreateItem(0)
    With ol
        .To = "abc@example.com"
        .Subject = "Report"
        .Body = "Namaste, report attached hai."
        .Display
    End With
End Sub
===
Advanced
Screen flicker band karna
Macro tez chalane ke liye updating band karo, end mein chalu
Sub FastMacro()
    Application.ScreenUpdating = False
    Application.Calculation = xlCalculationManual
    ' ... aapka code ...
    Application.Calculation = xlCalculationAutomatic
    Application.ScreenUpdating = True
End Sub
===
Intermediate
Low stock row laal karo
Stock sheet mein jahan Quantity < 10 ho, poori row ko laal highlight karta hai
Sub HighlightLowStock()
    Dim ws As Worksheet, cell As Range
    Set ws = ThisWorkbook.Sheets("Stock")
    For Each cell In ws.Range("C2:C500")
        If IsNumeric(cell.Value) And cell.Value <> "" And cell.Value < 10 Then
            cell.EntireRow.Interior.Color = RGB(255, 205, 210)
            cell.Font.Bold = True
        End If
    Next cell
End Sub
===
Advanced
3-din deadline email reminder
Deadlines sheet mein 3 din ke andar aane wale tasks par Outlook email bhejta hai
Sub SendReminderEmails()
    Dim OutApp As Object, OutMail As Object
    Dim ws As Worksheet, lastRow As Long, i As Long
    Set ws = ThisWorkbook.Sheets("Deadlines")
    lastRow = ws.Cells(ws.Rows.Count, "A").End(xlUp).Row
    Set OutApp = CreateObject("Outlook.Application")
    For i = 2 To lastRow
        If ws.Cells(i, 2).Value - Date <= 3 And ws.Cells(i, 2).Value >= Date Then
            Set OutMail = OutApp.CreateItem(0)
            With OutMail
                .To = ws.Cells(i, 4).Value
                .Subject = "Task Deadline Reminder: " & ws.Cells(i, 1).Value
                .Body = "Namaste " & ws.Cells(i, 3).Value & "," & vbCrLf & _
                        "Aapka task '" & ws.Cells(i, 1).Value & "' " & ws.Cells(i, 2).Value & " ko due hai."
                .Display
            End With
        End If
    Next i
End Sub
===
Advanced
Multi-field Summary Pivot
Category aur Month ke hisaab se Revenue aur Expense ka Pivot banata hai
Sub CreateSummaryPivot()
    Dim wsData As Worksheet, wsSummary As Worksheet
    Dim pCache As PivotCache, pTable As PivotTable
    Set wsData = ThisWorkbook.Sheets("Annual_Report")
    Set wsSummary = ThisWorkbook.Sheets.Add
    wsSummary.Name = "Summary_" & Format(Now, "hhmmss")
    Set pCache = ThisWorkbook.PivotCaches.Create(xlDatabase, wsData.Range("A1").CurrentRegion)
    Set pTable = pCache.CreatePivotTable(wsSummary.Range("A3"), "SummaryPivot")
    With pTable
        .PivotFields("Category").Orientation = xlRowField
        .PivotFields("Month").Orientation = xlColumnField
        .AddDataField .PivotFields("Revenue"), "Sum of Revenue", xlSum
        .AddDataField .PivotFields("Expense"), "Sum of Expense", xlSum
    End With
End Sub
===
Intermediate
Text numbers ko asli number banao
Apostrophe ya text format wale numbers ko turant asli numeric value banata hai
Sub ConvertTextNumbers()
    Selection.NumberFormat = "General"
    Selection.Value = Selection.Value
End Sub
===
Advanced
Merged cells tod kar fill down
Gandi merged report ko unmerge karke khali cells mein upar ki value bharta hai
Sub UnmergeAndFill()
    Dim c As Range, rng As Range
    Set rng = Selection
    rng.UnMerge
    On Error Resume Next
    rng.SpecialCells(xlCellTypeBlanks).FormulaR1C1 = "=R[-1]C"
    On Error GoTo 0
    rng.Value = rng.Value
End Sub
===
Advanced
Har city ki alag PDF report
Unique cities par बारी-बारी filter lagakar har city ki alag PDF save karta hai
Sub BatchCityPDF()
    Dim ws As Worksheet, cities As Variant, c As Variant
    Set ws = ActiveSheet
    cities = Array("Delhi", "Mumbai", "Surat", "Pune")
    For Each c In cities
        ws.Range("A1").AutoFilter Field:=2, Criteria1:=c
        ws.ExportAsFixedFormat Type:=xlTypePDF, _
            Filename:=ThisWorkbook.Path & "\Report_" & c & ".pdf"
    Next c
    ws.AutoFilterMode = False
End Sub`;

export const VBA: VbaItem[] = RAW.split("\n===\n").map((b) => {
  const [level, title, hindi, ...code] = b.split("\n");
  return { level: level as VbaItem["level"], title, hindi, code: code.join("\n") };
});
