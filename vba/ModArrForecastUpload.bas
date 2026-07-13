Attribute VB_Name = "ModArrForecastUpload"
Option Explicit

' ============================================================
' ModArrForecastUpload - Sube ARR al esquema arr (ventas_diarias_cliente, descuentos_diarios_cliente, cliente_categoria_mes).
' Solo requiere modDb y DSN configurado. Usa ActiveWorkbook para leer hojas y detectar planta (así funciona si la macro está en PERSONAL.XLSB y tienes abierto ARR Puebla.xlsm).
' Macro: Subir_ARR_Forecast
' ============================================================

' --- Helpers internos (no dependen de modUtils) ---
Private Function ArrNormText(ByVal s As Variant) As String
    Dim t As String
    If IsNull(s) Or IsEmpty(s) Then ArrNormText = "": Exit Function
    t = Trim(CStr(s))
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

Private Function ArrToSqlStr(ByVal v As Variant) As String
    If IsNull(v) Or IsEmpty(v) Then ArrToSqlStr = "": Exit Function
    ArrToSqlStr = Replace(CStr(v), "'", "''")
End Function

Private Function ArrParseNumberSafe(ByVal v As Variant) As Variant
    Dim n As Double
    Dim s As String
    If IsNull(v) Or IsEmpty(v) Then ArrParseNumberSafe = Null: Exit Function
    If IsNumeric(v) And VarType(v) <> vbString Then ArrParseNumberSafe = CDbl(v): Exit Function
    s = Replace(Trim(CStr(v)), " ", "")
    On Error Resume Next
    n = CDbl(Replace(s, ",", "."))
    If Err.Number <> 0 Then ArrParseNumberSafe = Null Else ArrParseNumberSafe = n
    On Error GoTo 0
End Function

Private Function ArrParseDateSafe(ByVal v As Variant) As Variant
    Dim d As Date
    If IsNull(v) Or IsEmpty(v) Then ArrParseDateSafe = Null: Exit Function
    If IsDate(v) Then ArrParseDateSafe = CDate(v): Exit Function
    On Error Resume Next
    d = CDate(Replace(CStr(v), ".", "/"))
    If Err.Number <> 0 Then ArrParseDateSafe = Null Else ArrParseDateSafe = d
    On Error GoTo 0
End Function

' Extrae el nombre de planta del nombre del libro: "ARR Puebla.xlsm" -> "Puebla", "ARR Acapulco.xlsm" -> "Acapulco"
Public Function PlantaDesdeNombreLibro() As String
    Dim n As String
    Dim i As Long
    n = Trim(ActiveWorkbook.Name)
    If UCase(Left(n, 4)) = "ARR " Then n = Mid(n, 5)
    i = InStrRev(n, ".")
    If i > 0 Then n = Left(n, i - 1)
    PlantaDesdeNombreLibro = Trim(n)
    If PlantaDesdeNombreLibro = "" Then PlantaDesdeNombreLibro = "Puebla"
End Function

Private Function NormalizeClient(ByVal s As Variant) As String
    Dim t As String
    If IsNull(s) Or IsEmpty(s) Then NormalizeClient = "": Exit Function
    t = ArrNormText(s)
    t = ArrRemoveAccents(t)
    NormalizeClient = UCase(Trim(t))
End Function

' Obtiene valor de una celda por nombre de columna (headers). Private en este módulo para evitar errores de "método no encontrado" al calificar con el nombre del módulo.
Private Function ArrGetCell(ByVal dataArr As Variant, ByVal rowIdx As Long, ByVal colName As String, ByRef headerList() As String) As Variant
    Dim j As Long
    If Not IsArray(headerList) Then ArrGetCell = Empty: Exit Function
    For j = LBound(headerList) To UBound(headerList)
        If LCase(Trim(CStr(headerList(j)))) = LCase(Trim(colName)) Then
            ArrGetCell = dataArr(rowIdx, j + 1)
            Exit Function
        End If
    Next j
    ArrGetCell = Empty
End Function

' Obtiene kg: prueba "Total kilos" y si no existe "Total kilo" (por variaciones en el encabezado).
Private Function ArrGetKg(ByVal dataArr As Variant, ByVal rowIdx As Long, ByRef headerList() As String) As Variant
    Dim v As Variant
    v = ArrGetCell(dataArr, rowIdx, "Total kilos", headerList)
    If IsEmpty(v) Then v = ArrGetCell(dataArr, rowIdx, "Total kilo", headerList)
    ArrGetKg = v
End Function

Private Function FechaToSql(ByVal d As Variant) As String
    If IsNull(d) Or IsEmpty(d) Then FechaToSql = "NULL": Exit Function
    On Error Resume Next
    FechaToSql = "'" & Format(CDate(d), "yyyy-mm-dd") & "'"
    If Err.Number <> 0 Then FechaToSql = "NULL"
    On Error GoTo 0
End Function

Private Function NumSql(ByVal v As Variant) As String
    If IsNull(v) Or IsEmpty(v) Then NumSql = "NULL": Exit Function
    NumSql = Replace(CStr(v), ",", ".")
End Function

Private Function NzD(ByVal v As Variant, Optional ByVal defaultValue As Double = 0#) As Double
    If IsNull(v) Or IsEmpty(v) Or v = "" Then
        NzD = defaultValue
    Else
        NzD = CDbl(v)
    End If
End Function

' Lee hoja; devuelve array de datos (fila 1 = headers)
Private Function LeerHoja(ByVal ws As Worksheet, ByRef outHeaders() As String) As Variant
    Dim lastRow As Long
    Dim lastCol As Long
    Dim rng As Range
    Dim arr As Variant
    Dim i As Long
    lastRow = ws.Cells(ws.Rows.Count, 1).End(xlUp).Row
    If lastRow < 2 Then LeerHoja = Empty: Exit Function
    lastCol = ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column
    If lastCol > 200 Then lastCol = 200
    Set rng = ws.Range(ws.Cells(1, 1), ws.Cells(lastRow, lastCol))
    arr = rng.Value2
    ReDim outHeaders(0 To lastCol - 1)
    For i = 0 To lastCol - 1
        outHeaders(i) = Trim(CStr(arr(1, i + 1)))
    Next i
    LeerHoja = arr
End Function

' Omite filas con fecha = hoy (día no cerrado)
Private Function EsHoy(ByVal fechaSql As String) As Boolean
    If fechaSql = "NULL" Or fechaSql = "" Then EsHoy = False: Exit Function
    EsHoy = (Replace(fechaSql, "'", "") = Format(Date, "yyyy-mm-dd"))
End Function

' Detecta año y mes desde la hoja "Total" del libro activo (primera fecha válida en columna Fecha). Si no hay datos, outYear/outMonth quedan 0.
Private Sub DetectarMesAnioDesdeTotal(ByRef outYear As Long, ByRef outMonth As Long)
    Dim ws As Worksheet
    Dim arr As Variant
    Dim headers() As String
    Dim r As Long
    Dim d As Variant
    outYear = 0
    outMonth = 0
    On Error Resume Next
    Set ws = ActiveWorkbook.Sheets("Total")
    If ws Is Nothing Then Exit Sub
    arr = LeerHoja(ws, headers)
    On Error GoTo 0
    If Not IsArray(arr) Then Exit Sub
    For r = 2 To UBound(arr, 1)
        d = ArrParseDateSafe(ArrGetCell(arr, r, "Fecha", headers))
        If Not IsNull(d) And Not IsEmpty(d) Then
            outYear = Year(CDate(d))
            outMonth = Month(CDate(d))
            If outMonth >= 1 And outMonth <= 12 Then Exit Sub
        End If
    Next r
End Sub

Public Sub Subir_ARR_Forecast()
    Dim plantCode As String
    Dim yearNum As Long
    Dim monthNum As Long
    Dim defaultYear As Long
    Dim defaultMonth As Long
    Dim cnn As Object
    Dim hoyStr As String
    hoyStr = Format(Date, "yyyy-mm-dd")
    
    DetectarMesAnioDesdeTotal defaultYear, defaultMonth
    If defaultYear = 0 Then defaultYear = Year(Date)
    If defaultMonth = 0 Then defaultMonth = Month(Date)
    ' Si no se detectó desde el archivo y hoy es día 1, sugerir mes anterior (datos de cierre)
    If defaultYear = Year(Date) And defaultMonth = Month(Date) And Day(Date) = 1 Then
        defaultMonth = defaultMonth - 1
        If defaultMonth = 0 Then defaultMonth = 12: defaultYear = defaultYear - 1
    End If
    
    plantCode = Trim(InputBox("Código de planta (detectado del nombre del archivo; puedes editarlo):", "ARR Forecast", PlantaDesdeNombreLibro()))
    If plantCode = "" Then Exit Sub
    yearNum = CLng(InputBox("Año (ej. 2026):", "ARR Forecast", defaultYear))
    monthNum = CLng(InputBox("Mes (1-12):", "ARR Forecast", defaultMonth))
    If monthNum < 1 Or monthNum > 12 Then
        MsgBox "Mes inválido.", vbExclamation
        Exit Sub
    End If
    
    On Error GoTo ErrHandler
    Set cnn = modDb.DbConnect()
    modDb.BeginTrans cnn
    
    BorrarMes cnn, plantCode, yearNum, monthNum
    CargarDesdeHojas cnn, plantCode, yearNum, monthNum, hoyStr
    
    modDb.CommitTrans cnn
    cnn.Close
    Set cnn = Nothing
    MsgBox "ARR Forecast subido correctamente para " & plantCode & " " & yearNum & "/" & monthNum, vbInformation
    Exit Sub
ErrHandler:
    modDb.RollbackTrans cnn
    If Not cnn Is Nothing Then cnn.Close
    MsgBox "Error: " & Err.Description, vbCritical
End Sub

Private Sub BorrarMes(ByVal cnn As Object, ByVal plantCode As String, ByVal yearNum As Long, ByVal monthNum As Long)
    Dim startDate As String
    Dim endDate As String
    Dim lastDay As Long
    lastDay = Day(DateSerial(yearNum, monthNum + 1, 0))
    startDate = yearNum & "-" & Right("0" & monthNum, 2) & "-01"
    endDate = yearNum & "-" & Right("0" & monthNum, 2) & "-" & Right("0" & lastDay, 2)
    modDb.ExecSQL cnn, "DELETE FROM arr.ventas_diarias_cliente WHERE plant_code = '" & ArrToSqlStr(plantCode) & "' AND fecha >= '" & startDate & "' AND fecha <= '" & endDate & "'"
    modDb.ExecSQL cnn, "DELETE FROM arr.descuentos_diarios_cliente WHERE plant_code = '" & ArrToSqlStr(plantCode) & "' AND fecha >= '" & startDate & "' AND fecha <= '" & endDate & "'"
    modDb.ExecSQL cnn, "DELETE FROM arr.cliente_categoria_mes WHERE plant_code = '" & ArrToSqlStr(plantCode) & "' AND year = " & yearNum & " AND month = " & monthNum
End Sub

Private Sub CargarDesdeHojas(ByVal cnn As Object, ByVal plantCode As String, ByVal yearNum As Long, ByVal monthNum As Long, ByVal hoyStr As String)
    Dim dicDescuentos As Object
    Dim dicVentas As Object
    Dim dicCatalog As Object
    Dim headers() As String
    Dim arr As Variant
    Dim ws As Worksheet
    Dim r As Long
    Dim fecha As Variant
    Dim fechaStr As String
    Dim cliente As String
    Dim kg As Variant
    Dim comision As Variant
    Dim comisionAcum As Variant
    Dim dip As Variant
    Dim desc As Variant
    Dim contado As Double
    Dim canal As String
    Dim subcanal As String
    Dim comisionista As Variant
    Dim totalFirmado As Variant
    Dim fVenc As Variant
    Dim comisionExtra As Variant
    Dim descFactura As Variant
    Dim key As String
    Dim k
    Dim sql As String
    Dim partsDesc() As String
    Dim parts() As String
    Dim arrCat As Variant
    Dim plantS As String
    plantS = ArrToSqlStr(plantCode)
    
    Set dicDescuentos = CreateObject("Scripting.Dictionary")
    Set dicVentas = CreateObject("Scripting.Dictionary")
    Set dicCatalog = CreateObject("Scripting.Dictionary")
    
    ' --- Total ---
    On Error Resume Next
    Set ws = ActiveWorkbook.Sheets("Total")
    On Error GoTo 0
    If Not ws Is Nothing Then
        arr = LeerHoja(ws, headers)
        If IsArray(arr) Then
            For r = 2 To UBound(arr, 1)
                fecha = ArrParseDateSafe(ArrGetCell(arr, r, "Fecha", headers))
                If IsNull(fecha) Then GoTo NextTotal
                fechaStr = Format(CDate(fecha), "yyyy-mm-dd")
                ' Solo mes objetivo: evita UPSERT que pise meses históricos
                If Year(CDate(fecha)) <> yearNum Or Month(CDate(fecha)) <> monthNum Then GoTo NextTotal
                cliente = NormalizeClient(ArrGetCell(arr, r, "Cliente", headers))
                If cliente = "" Then cliente = NormalizeClient(ArrGetCell(arr, r, "cliente", headers))
                If cliente = "" Then GoTo NextTotal
                ' Ventas: siempre cargar (aunque la fecha sea hoy)
                kg = ArrParseNumberSafe(ArrGetKg(arr, r, headers))
                If Not IsNull(kg) And kg <> 0 Then
                    key = fechaStr & "|" & cliente & "|Casa|"
                    If Not dicVentas.Exists(key) Then dicVentas(key) = 0
                    dicVentas(key) = dicVentas(key) + CDbl(kg)
                End If
                ' Descuentos contado (Total): omitir día de hoy (día no cerrado)
                comision = ArrParseNumberSafe(ArrGetCell(arr, r, "Comision $", headers))
                comisionAcum = ArrParseNumberSafe(ArrGetCell(arr, r, "Comision acumulada $", headers))
                dip = ArrParseNumberSafe(ArrGetCell(arr, r, "DIP $", headers))
                desc = ArrParseNumberSafe(ArrGetCell(arr, r, "Descuento $", headers))
                contado = -(NzD(comision) + NzD(comisionAcum) + NzD(dip) + NzD(desc))
                If contado <> 0 And fechaStr <> hoyStr Then
                    key = fechaStr & "|" & cliente
                    If Not dicDescuentos.Exists(key) Then dicDescuentos(key) = 0
                    dicDescuentos(key) = dicDescuentos(key) + contado
                End If
NextTotal:
            Next r
        End If
    End If
    
    ' --- Notas ---
    Set ws = Nothing
    On Error Resume Next
    Set ws = ActiveWorkbook.Sheets("Notas")
    On Error GoTo 0
    If Not ws Is Nothing Then
        arr = LeerHoja(ws, headers)
        If IsArray(arr) Then
            For r = 2 To UBound(arr, 1)
                fVenc = ArrParseDateSafe(ArrGetCell(arr, r, "Fecha de vencimiento", headers))
                If IsNull(fVenc) Then GoTo NextNotas
                fechaStr = Format(CDate(fVenc), "yyyy-mm-dd")
                If Year(CDate(fVenc)) <> yearNum Or Month(CDate(fVenc)) <> monthNum Then GoTo NextNotas
                If fechaStr = hoyStr Then GoTo NextNotas
                cliente = NormalizeClient(ArrGetCell(arr, r, "Cliente", headers))
                If cliente = "" Then GoTo NextNotas
                totalFirmado = ArrParseNumberSafe(ArrGetCell(arr, r, "Total firmado", headers))
                If IsNull(totalFirmado) Then GoTo NextNotas
                If totalFirmado > 0 Then totalFirmado = -totalFirmado
                key = fechaStr & "|" & cliente
                If Not dicDescuentos.Exists(key) Then dicDescuentos(key) = 0
                dicDescuentos(key) = dicDescuentos(key) + CDbl(totalFirmado)
NextNotas:
            Next r
        End If
    End If
    
    ' --- Factura (Descuento * 1.16, negativo) ---
    Set ws = Nothing
    On Error Resume Next
    Set ws = ActiveWorkbook.Sheets("Factura")
    On Error GoTo 0
    If Not ws Is Nothing Then
        arr = LeerHoja(ws, headers)
        If IsArray(arr) Then
            For r = 2 To UBound(arr, 1)
                fecha = ArrParseDateSafe(ArrGetCell(arr, r, "Fecha", headers))
                If IsNull(fecha) Then GoTo NextFactura
                fechaStr = Format(CDate(fecha), "yyyy-mm-dd")
                If Year(CDate(fecha)) <> yearNum Or Month(CDate(fecha)) <> monthNum Then GoTo NextFactura
                If fechaStr = hoyStr Then GoTo NextFactura
                cliente = NormalizeClient(ArrGetCell(arr, r, "Cliente", headers))
                If cliente = "" Then GoTo NextFactura
                descFactura = ArrParseNumberSafe(ArrGetCell(arr, r, "Descuento", headers))
                If IsNull(descFactura) Then GoTo NextFactura
                key = fechaStr & "|" & cliente
                If Not dicDescuentos.Exists(key) Then dicDescuentos(key) = 0
                dicDescuentos(key) = dicDescuentos(key) - Abs(CDbl(descFactura) * 1.16)
NextFactura:
            Next r
        End If
    End If
    
    ' --- Comision Extra ---
    Set ws = Nothing
    On Error Resume Next
    Set ws = ActiveWorkbook.Sheets("Comision Extra")
    On Error GoTo 0
    If Not ws Is Nothing Then
        arr = LeerHoja(ws, headers)
        If IsArray(arr) Then
            For r = 2 To UBound(arr, 1)
                fecha = ArrParseDateSafe(ArrGetCell(arr, r, "Fecha", headers))
                If IsNull(fecha) Then GoTo NextCE
                fechaStr = Format(CDate(fecha), "yyyy-mm-dd")
                If Year(CDate(fecha)) <> yearNum Or Month(CDate(fecha)) <> monthNum Then GoTo NextCE
                If fechaStr = hoyStr Then GoTo NextCE
                cliente = NormalizeClient(ArrGetCell(arr, r, "Cliente", headers))
                If cliente = "" Then GoTo NextCE
                comisionExtra = ArrParseNumberSafe(ArrGetCell(arr, r, "Comisión extraordinaria", headers))
                If IsNull(comisionExtra) Then GoTo NextCE
                key = fechaStr & "|" & cliente
                If Not dicDescuentos.Exists(key) Then dicDescuentos(key) = 0
                dicDescuentos(key) = dicDescuentos(key) - Abs(CDbl(comisionExtra))
NextCE:
            Next r
        End If
    End If
    
    ' --- Categoria (ventas con canal/subcanal + catálogo) ---
    Set ws = Nothing
    On Error Resume Next
    Set ws = ActiveWorkbook.Sheets("Categoria")
    On Error GoTo 0
    If Not ws Is Nothing Then
        arr = LeerHoja(ws, headers)
        If IsArray(arr) Then
            For r = 2 To UBound(arr, 1)
                fecha = ArrParseDateSafe(ArrGetCell(arr, r, "Fecha", headers))
                If IsNull(fecha) Then GoTo NextCat
                fechaStr = Format(CDate(fecha), "yyyy-mm-dd")
                If Year(CDate(fecha)) <> yearNum Or Month(CDate(fecha)) <> monthNum Then GoTo NextCat
                cliente = NormalizeClient(ArrGetCell(arr, r, "Cliente", headers))
                If cliente = "" Then GoTo NextCat
                comisionista = ArrGetCell(arr, r, "Comisionista", headers)
                If comisionista = True Or UCase(Trim(CStr(comisionista))) = "TRUE" Or CStr(comisionista) = "1" Then
                    canal = "Comisionista"
                Else
                    canal = "Casa"
                End If
                subcanal = Trim(CStr(ArrGetCell(arr, r, "sub canal com", headers)))
                If subcanal = "" Then subcanal = Trim(CStr(ArrGetCell(arr, r, "Subcanal", headers)))
                dicCatalog(cliente) = Array(canal, subcanal)
                kg = ArrParseNumberSafe(ArrGetKg(arr, r, headers))
                If Not IsNull(kg) And kg <> 0 Then
                    key = fechaStr & "|" & cliente & "|" & canal & "|" & subcanal
                    If Not dicVentas.Exists(key) Then dicVentas(key) = 0
                    dicVentas(key) = dicVentas(key) + CDbl(kg)
                End If
NextCat:
            Next r
        End If
    End If
    
    ' --- Insertar descuentos ---
    For Each k In dicDescuentos.Keys
        key = CStr(k)
        partsDesc = Split(key, "|")
        fechaStr = partsDesc(0)
        cliente = partsDesc(1)
        sql = "INSERT INTO arr.descuentos_diarios_cliente (plant_code, fecha, cliente_norm, monto) VALUES ('" & plantS & "', '" & fechaStr & "', '" & ArrToSqlStr(cliente) & "', " & NumSql(dicDescuentos(k)) & ") ON CONFLICT (plant_code, fecha, cliente_norm) DO UPDATE SET monto = EXCLUDED.monto"
        modDb.ExecSQL cnn, sql
    Next k
    
    ' --- Insertar ventas ---
    For Each k In dicVentas.Keys
        key = CStr(k)
        parts = Split(key, "|")
        fechaStr = parts(0)
        cliente = parts(1)
        canal = parts(2)
        If UBound(parts) >= 3 Then subcanal = parts(3) Else subcanal = ""
        If dicCatalog.Exists(cliente) Then
            arrCat = dicCatalog(cliente)
            canal = arrCat(0)
            subcanal = arrCat(1)
        End If
        sql = "INSERT INTO arr.ventas_diarias_cliente (plant_code, fecha, cliente_norm, canal, subcanal, kg) VALUES ('" & plantS & "', '" & fechaStr & "', '" & ArrToSqlStr(cliente) & "', '" & ArrToSqlStr(canal) & "', '" & ArrToSqlStr(subcanal) & "', " & NumSql(dicVentas(k)) & ") ON CONFLICT (plant_code, fecha, cliente_norm, canal, subcanal) DO UPDATE SET kg = EXCLUDED.kg"
        modDb.ExecSQL cnn, sql
    Next k
    
    ' --- Insertar catálogo cliente_categoria_mes ---
    For Each k In dicCatalog.Keys
        cliente = CStr(k)
        arrCat = dicCatalog(k)
        canal = arrCat(0)
        subcanal = arrCat(1)
        sql = "INSERT INTO arr.cliente_categoria_mes (plant_code, year, month, cliente_norm, canal, subcanal) VALUES ('" & plantS & "', " & yearNum & ", " & monthNum & ", '" & ArrToSqlStr(cliente) & "', '" & ArrToSqlStr(canal) & "', '" & ArrToSqlStr(subcanal) & "') ON CONFLICT (plant_code, year, month, cliente_norm) DO UPDATE SET canal = EXCLUDED.canal, subcanal = EXCLUDED.subcanal"
        modDb.ExecSQL cnn, sql
    Next k
End Sub
