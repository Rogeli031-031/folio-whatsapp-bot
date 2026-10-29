# IMPL-COMPRAS-PARTICIPACION-TUXPAN-TEPEJI-089

STATUS: DONE_PENDING_REVIEW
BASE_SHA: f9cf1e15d0ce47f7b70769c29ba59253d2dbfdee
BRANCH: feature/compras-participacion-tuxpan-tepeji-089
PRODUCT_SHA: ba62f55d63df6f390f5925b9c184042ac64fcd82
FINAL_SHA: el commit de esta evidencia; se confirma en el cierre, no dentro de este archivo

POSITION: Inmediatamente después del bloque HG y antes del separador de flete y de VALOR DEL FLETE SEGÚN ORIGEN. Cada nombre ocupa un encabezado propio con rowSpan 3.

TUXPAN_FORMULA: PEMEX TUXPAN kg + TOMZA TUXPAN kg del mismo periodo. El nombre se normaliza con trim, mayúsculas, acentos y espacios. No hay fuzzy matching.
TEPEJI_FORMULA: TOMZA TEPEJI kg del mismo periodo, con la misma normalización.
DENOMINATOR: period.consolidado.kg. No usa importe, HG, venta ni Nota de Cargo.
OTHER_PROVIDER_BEHAVIOR: Un proveedor distinto entra en el denominador si ya está dentro del consolidado y queda fuera de ambos numeradores. TUXPAN % + TEPEJI % puede ser menor a 100. No se renormaliza entre los dos.
NOTA_CARGO_EXCLUDED: sí. Aunque la bolsa traiga kilos, el nombre NOTA DE CARGO no suma a Tuxpan ni a Tepeji y no altera el porcentaje.
EFFECTIVE_KG_SOURCE: week.providers y month.providers, y el consolidado ya resuelto de ese mismo periodo. No se vuelve a leer la base ni se suma Excel más captura.

DAY_ROWS: las dos celdas existen y quedan vacías. No hay porcentaje ni kilos diarios.
WEEK_ROWS: muestran porcentaje y kilos de esa semana.
TOTAL_MONTH: usa los kilos del mes completo.
TOTAL_NOT_AVERAGE: sí. El mes es SUM(kg) / consolidado del mes. En el fixture, el promedio de 90% y 0% es 45; el mes 90/110 es 81.82%.

ZERO_TOTAL: si el consolidado es menor o igual a 0, el porcentaje es null y se muestra — sobre 0 kg. No hay NaN, Infinity ni 0.00%.
ZERO_PROVIDER: si el consolidado es positivo y el grupo tiene 0 kg, se muestra 0.00% sobre 0 kg.

PERCENT_FORMAT: dos decimales con punto, por ejemplo 51.13% y 73.22%.
KG_FORMAT: formatKg existente de CONTROL DE COMPRAS, más el sufijo kg. Ejemplo 449,820 kg y 0 kg.
VISUAL_HIERARCHY: el porcentaje va en text-[16px] font-bold y los kilos debajo en text-[11px] font-medium.

COLSPAN: comprasGridColSpan suma exactamente 2, con flete cerrado y abierto, también en la fila vacía y en el separador de semana.
FLETE_EXPANDED: TUXPAN y TEPEJI siguen antes del bloque expandible. Los encabezados y los colSpan del flete no se movieron de lugar.
RESPONSIVE: se conserva overflow-x-auto. No se redujo el ancho de las columnas existentes.

BACKEND_CHANGED: no
DB_CHANGED: no
R4_R5_CHANGED: no. Precedencia efectiva, conciliación, repair, documentos, source_company, Nota de Cargo, HG y fletes quedan como estaban. El Excel descargable no recibe estas columnas.

TESTS: test/compras-participacion-tuxpan-tepeji-089.test.js, 11 pruebas en verde. Cubren A–T.
REGRESSIONS: 188 pruebas en verde y 0 en rojo. Incluyen 013, 014, 020, 021, 022, flete diario, 088, 088-R1, 088-R2, 088-R3, 088-R4, 088-R4-R1, 088-R4-R2 y 088-R5. 088-R3 solo actualizó el candado de colspan para contar las dos columnas nuevas.
TYPECHECK: tsc --noEmit en verde.
BUILD: npm run build en verde. Compilación, tipos, 13 páginas y prepare-standalone. La ruta /compras queda en 14.3 kB. Los artefactos de build se restauraron y no entran al commit.
DIFF_CHECK: git diff --check sin errores de espacio. Aviso LF/CRLF en CURRENT_TASK.md.
FILES_TOUCHED:
- frontend-dashboard/components/ComprasClient.tsx
- frontend-dashboard/lib/compras-participation.ts
- test/compras-participacion-tuxpan-tepeji-089.test.js
- test/fix-compras-nota-cargo-visible-088-r3.test.js
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/authorizations/G1-IMPL-COMPRAS-PARTICIPACION-TUXPAN-TEPEJI-089.json
- docs/dev-loop/reports/IMPL-COMPRAS-PARTICIPACION-TUXPAN-TEPEJI-089.md

La pantalla autenticada de CONTROL DE COMPRAS no se abrió: esta tarea no escribe en la base y no despliega. La jerarquía visual y la alineación quedaron fijadas en el componente y cubiertas por las pruebas de código.

NO DB WRITES
NO MIGRATION
NO PR
NO MERGE
NO DEPLOY
