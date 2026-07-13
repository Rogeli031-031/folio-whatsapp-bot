Attribute VB_Name = "ModArrForecastUpload"
Option Explicit

' ============================================================
' ModArrForecastUpload - Sube ARR al esquema arr (ventas, descuentos, cliente_categoria_mes).
' CORREGIDO: NormalizeHeader colapsa espacios; FindColKg tiene fallback; Fecha prueba FECHA y DATE.
' ============================================================

Private Const DEBUG_MODE As Boolean = True   ' Pon False cuando ya funcione

' ---------- Normalización (colapsar espacios para que "Total  kilos" coincida con "TOTAL KILOS") ----------
Private Function NormalizeHeader(ByVal s As Variant) As String
    Dim t As String
    t = CStr(s)
    t = Replace(t, Chr(160), " ")
    t = Replace(t, vbTab, " ")
    Do While InStr(t, "  ") > 0
        t = Replace(t, "  ", " ")
    Loop
    t = Trim(t)
    On Error Resume Next
    t = Application.WorksheetFunction.Trim(t)
    On Error GoTo 0
    NormalizeHeader = UCase$(t)
End Function

Private Function ArrNormText(ByVal s As Variant) As String
    Dim t As String
    If IsNull(s) Or IsEmpty(s) Then ArrNormText = "": Exit Function
    t = Trim$(CStr(s))
    t = Replace(t, Chr(160), " ")
    Do While InStr(t, "  ") > 0
        t = Replace(t, "  ", " ")
    Loop
    ArrNormText = t
End Function

Private Function ArrRemoveAccents(ByVal s As String) As String
    Dim t As String
    t = s
    t = Replace(t, Chr(225), "a"): t = Replace(t, Chr(233), "e"): t = Replace(t, Chr(237), "i")
    t = Replace(t, Chr(243), "o"): t = Replace(t, Chr(250), "u"): t = Replace(t, Chr(241), "n")
    t = Replace(t, Chr(252), "u")
    t = Replace(t, Chr(193), "a"): t = Replace(t, Chr(201), "e"): t = Replace(t, Chr(205), "i")
    t = Replace(t, Chr(211), "o"): t = Replace(t, Chr(218), "u"): t = Replace(t, Chr(209), "n")
    ArrRemoveAccents = t
End Function

Private Function NormalizeClient(ByVal s As Variant) As String
    Dim t As String
    If IsNull(s) Or IsEmpty(s) Then NormalizeClient = "": Exit Function
    t = ArrNormText(s)
    t = ArrRemoveAccents(t)
    NormalizeClient = UCase$(Trim$(t))
End Function

Private Function ArrToSqlStr(ByVal v As Variant) As String
    If IsNull(v) Or IsEmpty(v) Then ArrToSqlStr = "": Exit Function
    ArrToSqlStr = Replace(CStr(v), "'", "''")
End Function

' ---------- Parse robusto ----------
Private Function ArrParseNumberSafe(ByVal v As Variant) As Variant
    Dim s As String
    Dim pDot As Long, pCom As Long
    Dim decSep As String, thouSep As String

    If IsNull(v) Or IsEmpty(v) Then ArrParseNumberSafe = Null: Exit Function

    If IsNumeric(v) And VarType(v) <> vbString Then
        ArrParseNumberSafe = CDbl(v)
        Exit Function
    End If

    s = Trim$(CStr(v))
    s = Replace(s, Chr(160), "")
    s = Replace(s, " ", "")

    pDot = InStrRev(s, ".")
    pCom = InStrRev(s, ",")

    If pDot > 0 And pCom > 0 Then
        If pDot > pCom Then
            decSep = ".": thouSep = ","
        Else
            decSep = ",": thouSep = "."
        End If
        s = Replace(s, thouSep, "")
        s = Replace(s, decSep, ".")
    ElseIf pCom > 0 Then
        s = Replace(s, ".", "")
        s = Replace(s, ",", ".")
    Else
        s = Replace(s, ",", "")
    End If

    If Val(s) = 0 And s <> "0" And s <> "0.0" And s <> "0.00" Then
        ArrParseNumberSafe = Null
    Else
        ArrParseNumberSafe = Val(s)
    End If
End Function

Private Function ArrParseDateSafe(ByVal v As Variant) As Variant
    Dim d As Date
    If IsNull(v) Or IsEmpty(v) Then ArrParseDateSafe = Null: Exit Function
    If IsDate(v) Then ArrParseDateSafe = CDate(v): Exit Function
    ' Número = serie de fecha de Excel (días desde 1900)
    If IsNumeric(v) Then
        On Error Resume Next
        d = CDate(CDbl(v))
        If Err.Number = 0 Then ArrParseDateSafe = d: Exit Function
        On Error GoTo 0
    End If
    On Error Resume Next
    d = CDate(Replace(CStr(v), ".", "/"))
    If Err.Number <> 0 Then ArrParseDateSafe = Null Else ArrParseDateSafe = d
    On Error GoTo 0
End Function

Private Function NzD(ByVal v As Variant, Optional ByVal defaultValue As Double = 0#) As Double
    If IsNull(v) Or IsEmpty(v) Or v = "" Then NzD = defaultValue Else NzD = CDbl(v)
End Function

Private Function NumSql(ByVal v As Variant) As String
    If IsNull(v) Or IsEmpty(v) Then NumSql = "NULL": Exit Function
    NumSql = Replace(CStr(v), ",", ".")
End Function

' ---------- Leer hoja ----------
Private Function LeerHoja(ByVal ws As Worksheet, ByRef outHeaders() As String) As Variant
    Dim lastRow As Long, lastCol As Long
    Dim lastCell As Range
    Dim rng As Range
    Dim arr As Variant
    Dim i As Long

    Set lastCell = ws.Cells.Find(What:="*", LookIn:=xlFormulas, LookAt:=xlPart, _
                                 SearchOrder:=xlByRows, SearchDirection:=xlPrevious)
    If lastCell Is Nothing Then LeerHoja = Empty: Exit Function
    lastRow = lastCell.Row

    Set lastCell = ws.Cells.Find(What:="*", LookIn:=xlFormulas, LookAt:=xlPart, _
                                 SearchOrder:=xlByColumns, SearchDirection:=xlPrevious)
    lastCol = lastCell.Column

    If lastRow < 2 Or lastCol < 1 Then LeerHoja = Empty: Exit Function
    If lastCol > 200 Then lastCol = 200

    Set rng = ws.Range(ws.Cells(1, 1), ws.Cells(lastRow, lastCol))
    arr = rng.Value2

    ReDim outHeaders(0 To lastCol - 1)
    For i = 0 To lastCol - 1
        outHeaders(i) = NormalizeHeader(arr(1, i + 1))
    Next i

    LeerHoja = arr
End Function

' ---------- Buscar columnas ----------
Private Function FindColContains(ByRef headers() As String, ByVal needle As String) As Long
    Dim j As Long, n As String
    n = NormalizeHeader(needle)
    For j = LBound(headers) To UBound(headers)
        If InStr(1, NormalizeHeader(headers(j)), n, vbTextCompare) > 0 Then
            FindColContains = j + 1
            Exit Function
        End If
    Next j
    FindColContains = 0
End Function

Private Function GetCellByContains(ByVal arr As Variant, ByVal rowIdx As Long, ByRef headers() As String, ByVal needle As String) As Variant
    Dim c As Long
    c = FindColContains(headers, needle)
    If c = 0 Then GetCellByContains = Empty Else GetCellByContains = arr(rowIdx, c)
End Function

' --- Columna Fecha: probar FECHA, DATE o primera columna ---
Private Function GetCellFecha(ByVal arr As Variant, ByVal rowIdx As Long, ByRef headers() As String) As Variant
    Dim v As Variant
    v = GetCellByContains(arr, rowIdx, headers, "FECHA")
    If IsEmpty(v) Then v = GetCellByContains(arr, rowIdx, headers, "DATE")
    If IsEmpty(v) And UBound(headers) >= 0 Then v = arr(rowIdx, 1)
    GetCellFecha = v
End Function

' --- Kilos: varias variantes + último recurso "cualquier columna con KILO o KG" ---
Private Function FindColKg(ByRef headers() As String) As Long
    Dim c As Long, j As Long
    c = FindColContains(headers, "TOTAL KILOS"): If c <> 0 Then FindColKg = c: Exit Function
    c = FindColContains(headers, "TOTAL KILO"):  If c <> 0 Then FindColKg = c: Exit Function
    c = FindColContains(headers, "KILOS"):       If c <> 0 Then FindColKg = c: Exit Function
    c = FindColContains(headers, "KILO"):         If c <> 0 Then FindColKg = c: Exit Function
    c = FindColContains(headers, " KG"):         If c <> 0 Then FindColKg = c: Exit Function
    c = FindColContains(headers, "KG"):          If c <> 0 Then FindColKg = c: Exit Function
    For j = LBound(headers) To UBound(headers)
        If InStr(1, headers(j), "KILO", vbBinaryCompare) > 0 Or InStr(1, headers(j), "KG", vbBinaryCompare) > 0 Then
            FindColKg = j + 1
            Exit Function
        End If
    Next j
    FindColKg = 0
End Function

Private Function GetKgCell(ByVal arr As Variant, ByVal rowIdx As Long, ByRef headers() As String) As Variant
    Dim c As Long
    c = FindColKg(headers)
    If c = 0 Then GetKgCell = Empty Else GetKgCell = arr(rowIdx, c)
End Function

' ---------- Planta ----------
Public Function PlantaDesdeNombreLibro() As String
    Dim n As String, i As Long
    n = Trim$(ActiveWorkbook.Name)
    If UCase$(Left$(n, 4)) = "ARR " Then n = Mid$(n, 5)
    i = InStrRev(n, ".")
    If i > 0 Then n = Left$(n, i - 1)
    PlantaDesdeNombreLibro = Trim$(n)
    If PlantaDesdeNombreLibro = "" Then PlantaDesdeNombreLibro = "Puebla"
End Function

Private Sub DetectarMesAnioDesdeTotal(ByRef outYear As Long, ByRef outMonth As Long)
    Dim ws As Worksheet, arr As Variant, headers() As String
    Dim r As Long, d As Variant

    outYear = 0: outMonth = 0
    On Error Resume Next
    Set ws = ActiveWorkbook.Worksheets("Total")
    On Error GoTo 0
    If ws Is Nothing Then Exit Sub

    arr = LeerHoja(ws, headers)
    If Not IsArray(arr) Then Exit Sub

    For r = 2 To UBound(arr, 1)
        d = ArrParseDateSafe(GetCellFecha(arr, r, headers))
        If Not IsNull(d) And Not IsEmpty(d) Then
            outYear = Year(CDate(d))
            outMonth = Month(CDate(d))
            If outMonth >= 1 And outMonth <= 12 Then Exit Sub
        End If
    Next r
End Sub

' ============================================================
' MACRO PRINCIPAL
' ============================================================
Public Sub Subir_ARR_Forecast()
    Dim plantCode As String, yearNum As Long, monthNum As Long
    Dim defaultYear As Long, defaultMonth As Long
    Dim cnn As Object
    Dim hoyStr As String

    hoyStr = Format$(Date, "yyyy-mm-dd")

    DetectarMesAnioDesdeTotal defaultYear, defaultMonth
    If defaultYear = 0 Then defaultYear = Year(Date)
    If defaultMonth = 0 Then defaultMonth = Month(Date)
    If defaultYear = Year(Date) And defaultMonth = Month(Date) And Day(Date) = 1 Then
        defaultMonth = defaultMonth - 1
        If defaultMonth = 0 Then defaultMonth = 12: defaultYear = defaultYear - 1
    End If

    plantCode = Trim$(InputBox("Código de planta:", "ARR Forecast", PlantaDesdeNombreLibro()))
    If plantCode = "" Then Exit Sub

    yearNum = CLng(InputBox("Año (ej. 2026):", "ARR Forecast", defaultYear))
    monthNum = CLng(InputBox("Mes (1-12):", "ARR Forecast", defaultMonth))
    If monthNum < 1 Or monthNum > 12 Then MsgBox "Mes inválido.": Exit Sub

    On Error GoTo ErrHandler
    Set cnn = modDb.DbConnect()
    modDb.BeginTrans cnn

    BorrarMes cnn, plantCode, yearNum, monthNum
    CargarDesdeHojas cnn, plantCode, yearNum, monthNum, hoyStr

    modDb.CommitTrans cnn
    cnn.Close

    MsgBox "ARR Forecast subido correctamente para " & plantCode & " " & yearNum & "/" & monthNum, vbInformation
    Exit Sub

ErrHandler:
    On Error Resume Next
    modDb.RollbackTrans cnn
    If Not cnn Is Nothing Then cnn.Close
    MsgBox "Error: " & Err.Number & " - " & Err.Description, vbCritical, "ARR Forecast"
End Sub

Private Sub BorrarMes(ByVal cnn As Object, ByVal plantCode As String, ByVal yearNum As Long, ByVal monthNum As Long)
    Dim startDate As String, endDate As String, lastDay As Long
    lastDay = Day(DateSerial(yearNum, monthNum + 1, 0))
    startDate = yearNum & "-" & Right$("0" & monthNum, 2) & "-01"
    endDate = yearNum & "-" & Right$("0" & monthNum, 2) & "-" & Right$("0" & lastDay, 2)

    modDb.ExecSQL cnn, "DELETE FROM arr.ventas_diarias_cliente WHERE plant_code='" & ArrToSqlStr(plantCode) & "' AND fecha BETWEEN '" & startDate & "' AND '" & endDate & "'"
    modDb.ExecSQL cnn, "DELETE FROM arr.descuentos_diarios_cliente WHERE plant_code='" & ArrToSqlStr(plantCode) & "' AND fecha BETWEEN '" & startDate & "' AND '" & endDate & "'"
    modDb.ExecSQL cnn, "DELETE FROM arr.descuentos_notas WHERE plant_code='" & ArrToSqlStr(plantCode) & "' AND fecha BETWEEN '" & startDate & "' AND '" & endDate & "'"
    modDb.ExecSQL cnn, "DELETE FROM arr.descuentos_factura WHERE plant_code='" & ArrToSqlStr(plantCode) & "' AND fecha BETWEEN '" & startDate & "' AND '" & endDate & "'"
    modDb.ExecSQL cnn, "DELETE FROM arr.descuentos_comision_extra WHERE plant_code='" & ArrToSqlStr(plantCode) & "' AND fecha BETWEEN '" & startDate & "' AND '" & endDate & "'"
    modDb.ExecSQL cnn, "DELETE FROM arr.cliente_categoria_mes WHERE plant_code='" & ArrToSqlStr(plantCode) & "' AND year=" & yearNum & " AND month=" & monthNum
End Sub

Private Sub CargarDesdeHojas(ByVal cnn As Object, ByVal plantCode As String, ByVal yearNum As Long, ByVal monthNum As Long, ByVal hoyStr As String)
    Dim dicDescuentos As Object, dicVentas As Object, dicCatalog As Object
    Dim dicNotas As Object, dicFactura As Object, dicComisionExtra As Object
    Dim ws As Worksheet, arr As Variant, headers() As String
    Dim r As Long, fecha As Variant, fechaStr As String, cliente As String, kg As Variant
    Dim comision As Variant, comisionAcum As Variant, dip As Variant, desc As Variant, contado As Double
    Dim canal As String, subcanal As String, comisionista As Variant
    Dim totalFirmado As Variant, fVenc As Variant, comisionExtra As Variant, descFactura As Variant
    Dim key As String, k As Variant, sql As String, parts() As String
    Dim plantS As String
    Dim totalKgVentas As Double
    Dim rowsTotal As Long, rowsCat As Long
    Dim skipTotalCliente As Long, skipCatCliente As Long

    plantS = ArrToSqlStr(plantCode)
    Set dicDescuentos = CreateObject("Scripting.Dictionary")
    Set dicNotas = CreateObject("Scripting.Dictionary")
    Set dicFactura = CreateObject("Scripting.Dictionary")
    Set dicComisionExtra = CreateObject("Scripting.Dictionary")
    Set dicVentas = CreateObject("Scripting.Dictionary")
    Set dicCatalog = CreateObject("Scripting.Dictionary")
    rowsTotal = 0: rowsCat = 0: skipTotalCliente = 0: skipCatCliente = 0

    ' ===================== TOTAL =====================
    On Error Resume Next
    Set ws = ActiveWorkbook.Worksheets("Total")
    On Error GoTo 0
    If Not ws Is Nothing Then
        arr = LeerHoja(ws, headers)
        If IsArray(arr) Then
            rowsTotal = UBound(arr, 1) - 1
            If DEBUG_MODE Then
                Dim cKgT As Long, msgT As String, vFec As Variant
                cKgT = FindColKg(headers)
                msgT = "Total - Col Kg: " & cKgT
                If cKgT > 0 Then msgT = msgT & " (header: '" & headers(cKgT - 1) & "')"
                If UBound(arr, 1) >= 2 And cKgT > 0 Then msgT = msgT & vbCrLf & "Fila 2 kg crudo: " & Replace(CStr(arr(2, cKgT)), vbLf, " ")
                vFec = GetCellFecha(arr, 2, headers)
                msgT = msgT & vbCrLf & "Fila 2 fecha cruda: " & Replace(CStr(vFec), vbLf, " ")
                Dim pFec As Variant
                pFec = ArrParseDateSafe(vFec)
                If Not IsNull(pFec) Then msgT = msgT & vbCrLf & "Fecha parseada: " & CStr(pFec) Else msgT = msgT & vbCrLf & "Fecha parseada: Null"
                MsgBox msgT, vbInformation, "DEBUG Total"
            End If

            For r = 2 To UBound(arr, 1)
                fecha = ArrParseDateSafe(GetCellFecha(arr, r, headers))
                If IsNull(fecha) Then GoTo NextTotal
                fechaStr = Format$(CDate(fecha), "yyyy-mm-dd")
                If Year(CDate(fecha)) <> yearNum Or Month(CDate(fecha)) <> monthNum Then GoTo NextTotal

                cliente = NormalizeClient(GetCellByContains(arr, r, headers, "CLIENTE"))
                If cliente = "" Then skipTotalCliente = skipTotalCliente + 1: GoTo NextTotal

                ' Ventas: NO sumar desde Total (evitar doble conteo con Categoria). Solo Categoria aporta kg.
                comision = ArrParseNumberSafe(GetCellByContains(arr, r, headers, "COMISION $"))
                comisionAcum = ArrParseNumberSafe(GetCellByContains(arr, r, headers, "ACUMULADA $"))
                dip = ArrParseNumberSafe(GetCellByContains(arr, r, headers, "DIP $"))
                desc = ArrParseNumberSafe(GetCellByContains(arr, r, headers, "DESCUENTO $"))

                contado = -(NzD(comision) + NzD(comisionAcum) + NzD(dip) + NzD(desc))
                If contado <> 0# And fechaStr <> hoyStr Then
                    key = fechaStr & "|" & cliente
                    If Not dicDescuentos.Exists(key) Then dicDescuentos(key) = 0#
                    dicDescuentos(key) = CDbl(dicDescuentos(key)) + contado
                End If
NextTotal:
            Next r
        End If
    End If

    ' ===================== NOTAS =====================
    Set ws = Nothing
    On Error Resume Next
    Set ws = ActiveWorkbook.Sheets("Notas")
    On Error GoTo 0
    If Not ws Is Nothing Then
        arr = LeerHoja(ws, headers)
        If IsArray(arr) Then
            For r = 2 To UBound(arr, 1)
                fVenc = ArrParseDateSafe(GetCellByContains(arr, r, headers, "VENC"))
                If IsNull(fVenc) Then GoTo NextNotas
                fechaStr = Format$(CDate(fVenc), "yyyy-mm-dd")
                If Year(CDate(fVenc)) <> yearNum Or Month(CDate(fVenc)) <> monthNum Then GoTo NextNotas
                If fechaStr = hoyStr Then GoTo NextNotas

                cliente = NormalizeClient(GetCellByContains(arr, r, headers, "CLIENTE"))
                If cliente = "" Then GoTo NextNotas

                totalFirmado = ArrParseNumberSafe(GetCellByContains(arr, r, headers, "FIRM"))
                If IsNull(totalFirmado) Then GoTo NextNotas
                If CDbl(totalFirmado) > 0# Then totalFirmado = -CDbl(totalFirmado)

                key = fechaStr & "|" & cliente
                If Not dicDescuentos.Exists(key) Then dicDescuentos(key) = 0#
                dicDescuentos(key) = CDbl(dicDescuentos(key)) + CDbl(totalFirmado)
                If Not dicNotas.Exists(key) Then dicNotas(key) = 0#
                dicNotas(key) = CDbl(dicNotas(key)) + CDbl(totalFirmado)
NextNotas:
            Next r
        End If
    End If

    ' ===================== FACTURA =====================
    Set ws = Nothing
    On Error Resume Next
    Set ws = ActiveWorkbook.Sheets("Factura")
    On Error GoTo 0
    If Not ws Is Nothing Then
        arr = LeerHoja(ws, headers)
        If IsArray(arr) Then
            For r = 2 To UBound(arr, 1)
                fecha = ArrParseDateSafe(GetCellFecha(arr, r, headers))
                If IsNull(fecha) Then GoTo NextFactura
                fechaStr = Format$(CDate(fecha), "yyyy-mm-dd")
                If Year(CDate(fecha)) <> yearNum Or Month(CDate(fecha)) <> monthNum Then GoTo NextFactura
                If fechaStr = hoyStr Then GoTo NextFactura

                cliente = NormalizeClient(GetCellByContains(arr, r, headers, "CLIENTE"))
                If cliente = "" Then GoTo NextFactura

                descFactura = ArrParseNumberSafe(GetCellByContains(arr, r, headers, "DESCUENTO"))
                If IsNull(descFactura) Then GoTo NextFactura

                key = fechaStr & "|" & cliente
                Dim montoFactura As Double
                montoFactura = -Abs(CDbl(descFactura) * 1.16)
                If Not dicDescuentos.Exists(key) Then dicDescuentos(key) = 0#
                dicDescuentos(key) = CDbl(dicDescuentos(key)) + montoFactura
                If Not dicFactura.Exists(key) Then dicFactura(key) = 0#
                dicFactura(key) = CDbl(dicFactura(key)) + montoFactura
NextFactura:
            Next r
        End If
    End If

    ' ===================== COMISION EXTRA =====================
    Set ws = Nothing
    On Error Resume Next
    Set ws = ActiveWorkbook.Sheets("Comision Extra")
    On Error GoTo 0
    If Not ws Is Nothing Then
        arr = LeerHoja(ws, headers)
        If IsArray(arr) Then
            For r = 2 To UBound(arr, 1)
                fecha = ArrParseDateSafe(GetCellFecha(arr, r, headers))
                If IsNull(fecha) Then GoTo NextCE
                fechaStr = Format$(CDate(fecha), "yyyy-mm-dd")
                If Year(CDate(fecha)) <> yearNum Or Month(CDate(fecha)) <> monthNum Then GoTo NextCE
                If fechaStr = hoyStr Then GoTo NextCE

                cliente = NormalizeClient(GetCellByContains(arr, r, headers, "CLIENTE"))
                If cliente = "" Then GoTo NextCE

                comisionExtra = ArrParseNumberSafe(GetCellByContains(arr, r, headers, "EXTRA"))
                If IsNull(comisionExtra) Then GoTo NextCE

                key = fechaStr & "|" & cliente
                Dim montoCE As Double
                montoCE = -Abs(CDbl(comisionExtra))
                If Not dicDescuentos.Exists(key) Then dicDescuentos(key) = 0#
                dicDescuentos(key) = CDbl(dicDescuentos(key)) + montoCE
                If Not dicComisionExtra.Exists(key) Then dicComisionExtra(key) = 0#
                dicComisionExtra(key) = CDbl(dicComisionExtra(key)) + montoCE
NextCE:
            Next r
        End If
    End If

    ' ===================== CATEGORIA =====================
    Set ws = Nothing
    On Error Resume Next
    Set ws = ActiveWorkbook.Worksheets("Categoria")
    On Error GoTo 0
    If Not ws Is Nothing Then
        arr = LeerHoja(ws, headers)
        If IsArray(arr) Then
            rowsCat = UBound(arr, 1) - 1
            If DEBUG_MODE Then
                Dim cKgC As Long, msgC As String
                cKgC = FindColKg(headers)
                msgC = "Categoria - Col Kg: " & cKgC
                If cKgC > 0 Then msgC = msgC & " (header: '" & headers(cKgC - 1) & "')"
                If UBound(arr, 1) >= 2 Then
                    Dim vFecha As Variant
                    vFecha = GetCellFecha(arr, 2, headers)
                    msgC = msgC & vbCrLf & "Fila 2 fecha cruda: " & Replace(CStr(vFecha), vbLf, " ")
                End If
                MsgBox msgC, vbInformation, "DEBUG Categoria"
            End If

            For r = 2 To UBound(arr, 1)
                fecha = ArrParseDateSafe(GetCellFecha(arr, r, headers))
                If IsNull(fecha) Then GoTo NextCat
                fechaStr = Format$(CDate(fecha), "yyyy-mm-dd")
                If Year(CDate(fecha)) <> yearNum Or Month(CDate(fecha)) <> monthNum Then GoTo NextCat

                cliente = NormalizeClient(GetCellByContains(arr, r, headers, "CLIENTE"))
                If cliente = "" Then skipCatCliente = skipCatCliente + 1: GoTo NextCat

                comisionista = GetCellByContains(arr, r, headers, "COMISIONISTA")
                If comisionista = True Or UCase$(Trim$(CStr(comisionista))) = "TRUE" Or CStr(comisionista) = "1" Then
                    canal = "Comisionista"
                Else
                    canal = "Casa"
                End If

                subcanal = Trim$(CStr(GetCellByContains(arr, r, headers, "SUBCANAL")))
                If subcanal = "" Then subcanal = Trim$(CStr(GetCellByContains(arr, r, headers, "SUB CANAL")))
                If subcanal = "" Then subcanal = Trim$(CStr(GetCellByContains(arr, r, headers, "SUB CANAL COM")))

                dicCatalog(cliente) = Array(canal, subcanal)

                kg = GetKgCell(arr, r, headers)
                If Not IsEmpty(kg) And Not IsNull(kg) Then
                    kg = ArrParseNumberSafe(kg)
                    If Not IsNull(kg) And CDbl(kg) <> 0# Then
                        key = fechaStr & "|" & cliente
                        If Not dicVentas.Exists(key) Then dicVentas(key) = 0#
                        dicVentas(key) = CDbl(dicVentas(key)) + CDbl(kg)
                    End If
                End If
NextCat:
            Next r
        End If
    End If

    ' ===================== INSERT DESCUENTOS =====================
    For Each k In dicDescuentos.Keys
        parts = Split(CStr(k), "|")
        fechaStr = parts(0)
        cliente = parts(1)

        sql = "INSERT INTO arr.descuentos_diarios_cliente (plant_code, fecha, cliente_norm, monto) " & _
              "VALUES ('" & plantS & "', '" & fechaStr & "', '" & ArrToSqlStr(cliente) & "', " & NumSql(dicDescuentos(k)) & ") " & _
              "ON CONFLICT (plant_code, fecha, cliente_norm) DO UPDATE SET monto = EXCLUDED.monto"
        modDb.ExecSQL cnn, sql
    Next k

    For Each k In dicNotas.Keys
        parts = Split(CStr(k), "|")
        fechaStr = parts(0)
        cliente = parts(1)
        sql = "INSERT INTO arr.descuentos_notas (plant_code, fecha, cliente_norm, monto) " & _
              "VALUES ('" & plantS & "', '" & fechaStr & "', '" & ArrToSqlStr(cliente) & "', " & NumSql(dicNotas(k)) & ") " & _
              "ON CONFLICT (plant_code, fecha, cliente_norm) DO UPDATE SET monto = EXCLUDED.monto"
        modDb.ExecSQL cnn, sql
    Next k

    For Each k In dicFactura.Keys
        parts = Split(CStr(k), "|")
        fechaStr = parts(0)
        cliente = parts(1)
        sql = "INSERT INTO arr.descuentos_factura (plant_code, fecha, cliente_norm, monto) " & _
              "VALUES ('" & plantS & "', '" & fechaStr & "', '" & ArrToSqlStr(cliente) & "', " & NumSql(dicFactura(k)) & ") " & _
              "ON CONFLICT (plant_code, fecha, cliente_norm) DO UPDATE SET monto = EXCLUDED.monto"
        modDb.ExecSQL cnn, sql
    Next k

    For Each k In dicComisionExtra.Keys
        parts = Split(CStr(k), "|")
        fechaStr = parts(0)
        cliente = parts(1)
        sql = "INSERT INTO arr.descuentos_comision_extra (plant_code, fecha, cliente_norm, monto) " & _
              "VALUES ('" & plantS & "', '" & fechaStr & "', '" & ArrToSqlStr(cliente) & "', " & NumSql(dicComisionExtra(k)) & ") " & _
              "ON CONFLICT (plant_code, fecha, cliente_norm) DO UPDATE SET monto = EXCLUDED.monto"
        modDb.ExecSQL cnn, sql
    Next k

    ' ===================== INSERT VENTAS =====================
    totalKgVentas = 0#
    For Each k In dicVentas.Keys
        parts = Split(CStr(k), "|")
        fechaStr = parts(0)
        cliente = parts(1)

        If dicCatalog.Exists(cliente) Then
            canal = dicCatalog(cliente)(0)
            subcanal = dicCatalog(cliente)(1)
        Else
            canal = "Casa"
            subcanal = ""
        End If

        totalKgVentas = totalKgVentas + CDbl(dicVentas(k))

        sql = "INSERT INTO arr.ventas_diarias_cliente (plant_code, fecha, cliente_norm, canal, subcanal, kg) " & _
              "VALUES ('" & plantS & "', '" & fechaStr & "', '" & ArrToSqlStr(cliente) & "', '" & ArrToSqlStr(canal) & "', '" & ArrToSqlStr(subcanal) & "', " & NumSql(dicVentas(k)) & ") " & _
              "ON CONFLICT (plant_code, fecha, cliente_norm, canal, subcanal) DO UPDATE SET kg = EXCLUDED.kg"
        modDb.ExecSQL cnn, sql
    Next k

    ' ===================== INSERT CATÁLOGO =====================
    For Each k In dicCatalog.Keys
        cliente = CStr(k)
        canal = dicCatalog(k)(0)
        subcanal = dicCatalog(k)(1)

        sql = "INSERT INTO arr.cliente_categoria_mes (plant_code, year, month, cliente_norm, canal, subcanal) " & _
              "VALUES ('" & plantS & "', " & yearNum & ", " & monthNum & ", '" & ArrToSqlStr(cliente) & "', '" & ArrToSqlStr(canal) & "', '" & ArrToSqlStr(subcanal) & "') " & _
              "ON CONFLICT (plant_code, year, month, cliente_norm) DO UPDATE SET canal = EXCLUDED.canal, subcanal = EXCLUDED.subcanal"
        modDb.ExecSQL cnn, sql
    Next k

    ' ===================== RESUMEN =====================
    MsgBox _
        "TOTAL filas aprox: " & rowsTotal & " (saltadas por cliente vacío: " & skipTotalCliente & ")" & vbCrLf & _
        "CATEGORIA filas aprox: " & rowsCat & " (saltadas por cliente vacío: " & skipCatCliente & ")" & vbCrLf & vbCrLf & _
        "VENTAS (llaves): " & dicVentas.Count & vbCrLf & _
        "VENTAS (kg total): " & Format$(totalKgVentas, "#,##0.00") & vbCrLf & _
        "DESCUENTOS (llaves): " & dicDescuentos.Count & vbCrLf & _
        "CLIENTES catalogados: " & dicCatalog.Count, _
        vbInformation
End Sub
