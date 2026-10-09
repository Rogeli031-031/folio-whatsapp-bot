# G4-PREP-FIX-IGF-DIARIO-DESCUENTOS-SIGN-SEMANTICS-070-R1

status: DONE_PENDING_REVIEW

## Base

origin/main: bccdf84e5f19fec65c282eff5eb7eec6d6132241

merge-base: bccdf84e5f19fec65c282eff5eb7eec6d6132241

ahead/behind antes del commit G4: 2 / 0

product SHA: 702eb1b75c86948f336b1e78927aa8741a080bcc

final SHA: 50fbe14fdb649f68cea6c8ef98d6e713fb249eda

El producto es ancestro del HEAD. main es ancestro del HEAD. main no se movió. El working tree estaba limpio.

## Commits

1. 702eb1b75c86948f336b1e78927aa8741a080bcc — FIX 070-R1: comparar la comision por magnitud
2. 50fbe14fdb649f68cea6c8ef98d6e713fb249eda — docs: anota el SHA de FIX 070-R1

## Archivos funcionales

- lib/igf-diario-descuentos-columna.js

El diff de producto cambia solo `deltaToken` y la comparación dentro de `discountLines`. No toca la consulta SQL, `ratio`, `purchases`, `money3` ni el coloreado del rich text.

## Tests

- test/fix-igf-diario-descuentos-sign-semantics-070-r1.test.js
- test/impl-igf-diario-descuentos-resumen-semanal-todas-070.test.js

El test 070 solo actualiza el token del delta, que ya no lleva signo. La dirección de JOSE sigue siendo Bajó y verde.

## Documentación

- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/FIX-IGF-DIARIO-DESCUENTOS-SIGN-SEMANTICS-070-R1.md
- docs/dev-loop/reports/G4-PREP-FIX-IGF-DIARIO-DESCUENTOS-SIGN-SEMANTICS-070-R1.md

## Auditoría product..final

El rango 702eb1b7..50fbe14f toca solo:

- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/FIX-IGF-DIARIO-DESCUENTOS-SIGN-SEMANTICS-070-R1.md

No hay cambios de producto ni de tests después del SHA producto.

## Causa raíz

070 decidía Subió o Bajó con `actual - anterior`. Un cargo negativo se leía al revés: de -4.630 a -4.352 el número sube, pero la magnitud del cargo baja.

## Fórmula ABS

```
previousMagnitude = ABS(round3(anterior))
currentMagnitude = ABS(round3(actual))
directionDelta = currentMagnitude - previousMagnitude
```

Si directionDelta > 0, Subió y el delta va en rojo. Si directionDelta < 0, Bajó y el delta va en verde. Si directionDelta es 0, el cliente no se lista.

El importe mostrado es `ABS(directionDelta)` a 3 decimales: `$X.XXX/kg`, sin `+` y sin `-`. Los valores anterior y actual conservan su signo mediante `money3`.

## Matriz de signos

- -3 → -4: Subió $1.000/kg, rojo
- -4 → -3: Bajó $1.000/kg, verde
- -2.5 → -2: Bajó $0.500/kg, verde
- -4.630 → -4.352: Bajó $0.278/kg, verde
- -4.352 → -4.630: Subió $0.278/kg, rojo
- +3 → +4: Subió $1.000/kg, rojo
- +4 → +3: Bajó $1.000/kg, verde
- -3 → +4: Subió $1.000/kg, rojo
- +4 → -3: Bajó $1.000/kg, verde
- -3 → +3: misma magnitud, no se lista

## Caso ARTURO

`ARTURO ANDRADE SANCHEZ — Bajó su comisión respecto a su última compra de -$4.630/kg a -$4.352/kg = $0.278/kg`

El token `$0.278/kg` es verde. El texto no dice Subió y no contiene `+$0.278/kg` ni `-$0.278/kg`.

## Delta sin signo

`deltaToken` devuelve siempre `$X.XXX/kg`. Un delta de magnitud 0 no genera token ni renglón.

## Rich text

Solo el token final lleva color. Subió usa `FFDC2626`. Bajó usa `FF15803D`. El nombre, la frase y los valores anterior/actual quedan sin color. La prueba de ARTURO escribe el XLSX y lo vuelve a abrir con el verde intacto.

## RESUMEN y Todas

El diff completo contra main no toca `lib/igf-diario-weekly-plant.js`, `lib/igf-diario-weekly-excel.js`, `lib/dashboard-arr-forecast.js`, `server.js` ni el panel de Todas. AK, los auxiliares, COMENTARIO DEL DIA, VENTAS, la fuente `SUM(monto) / SUM(kg)` y la compra anterior permanecen como en 070.

## Pruebas

Evidencia de la implementación, sin modificar tests en G4:

- 22 pruebas PASS
- 070-R1 PASS
- 070 PASS
- 069-R2 PASS
- node --check server.js PASS
- git diff --check origin/main...HEAD PASS

## Riesgos y hallazgos

Ningún hallazgo bloquea G4. La única diferencia visible en comisiones positivas es que el delta ya no muestra `+` ni `-`; la dirección no cambia cuando ambos valores tienen el mismo signo.

## NO MERGE

Esta preparación no autoriza merge.

## NO DEPLOY

Esta preparación no autoriza deploy. Auto-merge queda deshabilitado. El merge, si procede, es Squash and merge y lo ejecuta solo el aprobador humano.
