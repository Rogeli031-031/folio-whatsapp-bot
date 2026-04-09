' =============================================================================
' FRAGMENTO — No importar como módulo nuevo.
' En el Editor VBA, abra modIgfUpload y reemplace toda la función
' Private Function BuildInsertCompromiso(...) ... End Function
' por el bloque siguiente (deja CellVal, ColFromKeysOrPosition, NumSqlVal, etc.
' en el mismo módulo).
'
' Layout columnas 1-based (plantilla dashboard + filas 6-7 / datos fila 9):
'   HG % = G (7), HG $/Kg = H (8), Gtos/Apoyos = M (13), … hasta R (18).
' modConfig: IGF_HEADER_TOP_ROW=6, IGF_HEADER_SUB_ROW=7, IGF_DATA_START_ROW=9,
' IGF_SHEET_COMPROMISO = "IGF Forecast" (o el nombre de su hoja).
' =============================================================================

Private Function BuildInsertCompromiso(ByVal versionId As Long, ByVal lineKey As String, ByVal empresa As String, ByVal rowIdx As Long, ByVal dataArr As Variant, ByVal hdrMap As Object) As String
    Dim v As Variant
    Dim c As Long
    Dim parts As String
    Dim pctVal As Variant

    parts = versionId & ", '" & modUtils.ToSqlStr(lineKey) & "', '" & modUtils.ToSqlStr(empresa) & "'"

    c = ColFromKeysOrPosition(hdrMap, 2, "venta_ton", "venta")
    v = NumSqlVal(CellVal(dataArr, rowIdx, c))
    parts = parts & ", " & v

    c = ColFromKeysOrPosition(hdrMap, 3, "margen_kg", "margen")
    v = NumSqlVal(CellVal(dataArr, rowIdx, c))
    parts = parts & ", " & v

    c = ColFromKeysOrPosition(hdrMap, 4, "com_desc_kg", "com. y desc.", "com y desc_kg", "com_desc_kg")
    v = NumSqlVal(CellVal(dataArr, rowIdx, c))
    parts = parts & ", " & v

    c = ColFromKeysOrPosition(hdrMap, 5, "gasto_kg", "gasto")
    v = NumSqlVal(CellVal(dataArr, rowIdx, c))
    parts = parts & ", " & v

    c = ColFromKeysOrPosition(hdrMap, 6, "impuesto_kg", "impuesto", "impuestos_kg", "impuestos")
    v = NumSqlVal(CellVal(dataArr, rowIdx, c))
    parts = parts & ", " & v

    ' HG % = G (7), HG $/Kg = H (8)
    c = ColFromKeysOrPosition(hdrMap, 7, "hg_pct", "hg_%", "hg %", "hg%")
    pctVal = modUtils.ParsePercentSafe(CellVal(dataArr, rowIdx, c))
    If IsNull(pctVal) Then parts = parts & ", NULL" Else parts = parts & ", " & Replace(CStr(pctVal), ",", ".")

    c = ColFromKeysOrPosition(hdrMap, 8, "hg_kg", "hg_$/kg", "hg_s/kg", "hg $/kg", "hg s/kg", "hg_kg")
    v = NumSqlVal(CellVal(dataArr, rowIdx, c))
    parts = parts & ", " & v

    c = ColFromKeysOrPosition(hdrMap, 9, "bancos_planta_kg", "bancos planta", "bancos_planta")
    If c <= 0 Then c = 9
    If c <= LastColFromMap(hdrMap) Then
        v = NumSqlVal(CellVal(dataArr, rowIdx, c))
    Else
        v = "NULL"
    End If
    parts = parts & ", " & v

    c = ColFromKeysOrPosition(hdrMap, 10, "provision_planta_kg", "provisión planta", "provision planta", "prov. planta", "prov_planta")
    If c <= 0 Then c = 10
    If c <= LastColFromMap(hdrMap) Then
        v = NumSqlVal(CellVal(dataArr, rowIdx, c))
    Else
        v = "NULL"
    End If
    parts = parts & ", " & v

    c = ColFromKeysOrPosition(hdrMap, 11, "util_oper_kg", "util. operación", "util operacion", "util. oper", "util_oper_kg")
    If c <= 0 Then c = 11
    If c <= LastColFromMap(hdrMap) Then
        v = NumSqlVal(CellVal(dataArr, rowIdx, c))
    Else
        v = "NULL"
    End If
    parts = parts & ", " & v

    c = ColFromKeysOrPosition(hdrMap, 12, "util_oper_importe", "util. operacion_importe", "util operacion importe", "util oper_importe", "importe")
    v = NumSqlVal(CellVal(dataArr, rowIdx, c))
    parts = parts & ", " & v

    c = ColFromKeysOrPosition(hdrMap, 13, "gtos_apoyos_corp_kg", "gtos y apoyos corp.", "gtos, apoyos y prov", "gtos apoyos y prov", "gtos apoyos prov", "glos y apoyos corp.", "gtos y apoyos corp_kg", "gtos y apoyos corp")
    v = NumSqlVal(CellVal(dataArr, rowIdx, c))
    parts = parts & ", " & v

    c = ColFromKeysOrPosition(hdrMap, 14, "bancos_corp_kg", "bancos corp.", "bancos corp_kg", "bancos corp")
    v = NumSqlVal(CellVal(dataArr, rowIdx, c))
    parts = parts & ", " & v

    c = ColFromKeysOrPosition(hdrMap, 15, "otros_programas_kg", "otros programas_kg", "otros programas")
    v = NumSqlVal(CellVal(dataArr, rowIdx, c))
    parts = parts & ", " & v

    c = ColFromKeysOrPosition(hdrMap, 16, "inversiones_kg", "inversiones")
    v = NumSqlVal(CellVal(dataArr, rowIdx, c))
    parts = parts & ", " & v

    c = ColFromKeysOrPosition(hdrMap, 17, "resultado_final_kg", "resultado final_$/kg", "resultado final_s/kg", "resultado final $/kg", "resultado final_kg")
    v = NumSqlVal(CellVal(dataArr, rowIdx, c))
    parts = parts & ", " & v

    c = ColFromKeysOrPosition(hdrMap, 18, "resultado_final_importe", "resultado final_importe", "resultado final importe")
    v = NumSqlVal(CellVal(dataArr, rowIdx, c))
    parts = parts & ", " & v

    BuildInsertCompromiso = "INSERT INTO igf.compromiso_lines (version_id, line_key, empresa, venta_ton, margen_kg, com_desc_kg, gasto_kg, impuesto_kg, " & _
        "hg_pct, hg_kg, bancos_planta_kg, provision_planta_kg, util_oper_kg, util_oper_importe, gtos_apoyos_corp_kg, bancos_corp_kg, " & _
        "otros_programas_kg, inversiones_kg, resultado_final_kg, resultado_final_importe) VALUES (" & parts & ")"
End Function
