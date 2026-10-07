# FIX-IGF-DIARIO-DETAIL-UX-AND-OPENING-PRICE-068-R1

```yaml
task_id: "FIX-IGF-DIARIO-DETAIL-UX-AND-OPENING-PRICE-068-R1"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "frontend-dashboard/components/IgfDiarioFoliosDepositoMatrix.tsx"
  - "lib/dashboard-arr-forecast.js"
  - "test/fix-igf-diario-detail-ux-opening-price-068-r1.test.js"
  - "test/igf-diario-precio-carry-forward-029.test.js"
  - "test/igf-diario-precio-sheet-027.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-DETAIL-UX-AND-OPENING-PRICE-068-R1.md"
files_not_touched:
  - "frontend-dashboard/components/FolioDrawer.tsx"
  - "lib/igf-diario-folios-deposito-matrix.js"
  - "lib/igf-diario-puebla.js"
  - "lib/igf-diario-expense-excel.js"
  - "lib/igf-diario-grafica.js"
  - "lib/igf-diario-weekly-plant.js"
  - "server.js"
  - "arr.precio_diario"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-FOLIOS-DEPOSITO-MATRIX-068.md"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-PRECIO-CARRY-FORWARD-029.md"
  - "docs/dev-loop/reports/IMPL-IGF-DIARIO-PRECIO-SHEET-027.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "test/igf-diario-precio-sheet-027.test.js deja de asumir que la segunda consulta es otra planta. Cada carga ahora hace la consulta del mes y una consulta del antecedente."
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```

| Campo | Valor |
|---|---|
| main | 4adab4643e91e10c97d6f492044398f710d0608d |
| producto | 2ddcdfd613a2c492cd1e8b8d6ff614e97207cb58 |
| rama | fix/igf-diario-detail-ux-opening-price-068-r1 |
| writes DB | no |

## 1. Modal 068

La lista diaria ya no es la tabla Folio / Estado / Monto / Descripción. Cada folio es una tarjeta: código a la izquierda, monto a la derecha, badge de estado, acción «Abrir folio →» y la descripción debajo, con salto de línea y hasta tres líneas. El encabezado queda en tres bloques: planta y fecha (`GT - Puebla · 04/09/2026`), importe de la celda y número de folios. El modo oscuro y el ancho de celular se conservan. La matriz, el umbral, el importe y la agregación de 068 no cambian.

## 2. FolioDrawer

Se reutiliza `frontend-dashboard/components/FolioDrawer.tsx`. No hay otra ficha. El click en el código y el botón «Abrir folio →» llaman `setOpenFolioId(folio.id)`. Cerrar el drawer solo limpia ese id. La celda seleccionada y el modal diario siguen abiertos. El modal de lista usa `z-30`. El drawer existente sigue en `z-40` / `z-50`, así que queda encima sin cambiar su componente.

## 3. Permisos

El rol sale de `getRoleFromDashboardToken(token)` con el token ya presente. Si no hay rol, se pasa cadena vacía. No se usa el default `GG` del drawer. El backend sigue autorizando la lectura y la edición. No se ampliaron permisos.

## 4. Causa de Morelos

`loadPrecioDiario` leía solo `fecha >= primer día del mes`. `resolvePrecioDailySeries` arrancaba `lastValidPrecio = null`. Del 01 al 06 de octubre no había precio propio, así que C, D y H quedaban vacíos aunque hubiera venta, costo y flete. No es un fallo de Morelos ni de esas tres columnas.

## 5. Fixture

Último precio previo del fixture: `2026-09-30 = 19.95`.

Octubre: 01–06 null, 07 `20.05`, 08 null.

Resultado: 01–06 `19.95`, 07 `20.05`, 08 `20.05`.

## 6. Antecedente en producción

Una consulta, la misma para todas las plantas, con `precioLookupCodes`:

```sql
SELECT fecha, precio, plant_code
  FROM arr.precio_diario
 WHERE plant_code = ANY($1::text[])
   AND fecha < $2::date
   AND precio IS NOT NULL
   AND precio > 0
   AND fecha = (
     SELECT MAX(p.fecha)
       FROM arr.precio_diario p
      WHERE p.plant_code = ANY($1::text[])
        AND p.fecha < $2::date
        AND p.precio IS NOT NULL
        AND p.precio > 0
   )
```

`$2` es el primer día del mes. No se limita al mes calendario anterior. Enero 2027 puede usar diciembre 2026 o cualquier fecha válida más vieja. En esa fecha gana el código exacto si su precio es válido; si no, el alias equivalente ya usado por el mes. Morelos solo lee Morelos. Querétaro y Tehuacán conservan sus pares.

## 7. Consultas

Antes: 1 consulta por `loadPrecioDiario`.
Después: esa consulta del mes más 1 consulta del último precio previo. `loadUltimoPrecioPrevio` tiene un solo `client.query`. No hay consulta por día, por fila ni por folio.

## 8. Sin relleno futuro

El precio del 07 no entra en el 01–06. Si no hay antecedente válido, o el previo es 0 o null, esos días siguen vacíos. No se escribe 0.

## 9. C, D, H y rentabilidad

La serie resultante es la que ya consumen la hoja PRECIO, `materializePlantMonth`, el acumulado y la vista semanal. Con venta 100, costo 10 y flete 2, el día inicial queda C `19.95`, ingreso `1995` y margen `7.95`. `computePlantDay` produce resultado por kilo y resultado importe. Las fórmulas de margen neto, sobrantes y resultado no se reescribieron. El override manual de 065-R1 sigue primero cuando el rango del corte lo permite.

## 10. Pruebas

`test/fix-igf-diario-detail-ux-opening-price-068-r1.test.js`: 6/6.
Corrida conjunta de 068, 067, 066-R1, 066, 065-R1, 065, 064-R1, 064, 029, 027, 033, 052 y 063-R1: 112/112.
`node --check server.js`: correcto.
`frontend-dashboard` `npm run build`: correcto.
`git diff --check`: limpio.

## 11. Archivos

Producto: el componente de la matriz, `lib/dashboard-arr-forecast.js` y las tres pruebas de precio/detalle.
`FolioDrawer.tsx` no se modificó.

## 12. SHA

Producto: `2ddcdfd613a2c492cd1e8b8d6ff614e97207cb58`.
Base: `4adab4643e91e10c97d6f492044398f710d0608d`.

No hubo merge ni deploy. No se escribió `arr.precio_diario`.
