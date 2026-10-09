# FIX-IGF-DIARIO-DESCUENTOS-SIGN-SEMANTICS-070-R1

status: DONE_PENDING_REVIEW

base_sha: bccdf84e5f19fec65c282eff5eb7eec6d6132241

product_sha: 702eb1b75c86948f336b1e78927aa8741a080bcc

branch: fix/igf-diario-descuentos-sign-semantics-070-r1

## Causa raíz

070 decidía Subió o Bajó con el signo de `actual - anterior`. Una comisión guardada como cargo negativo se lee al revés: pasar de -4.630 a -4.352 es un número mayor, pero la magnitud del cargo baja.

## Lógica anterior

`delta = round3(actual) - round3(anterior)`.

Si delta > 0, Subió y el token era `+$X.XXX/kg` en rojo. Si delta < 0, Bajó y el token era `-$X.XXX/kg` en verde.

ARTURO ANDRADE SANCHEZ, de -4.630 a -4.352, salía como "Subió su comisión" con `+$0.278/kg`.

## Lógica corregida

La comparación usa la magnitud. Los valores anterior y actual se siguen mostrando con su signo.

```
previousMagnitude = ABS(round3(anterior))
currentMagnitude = ABS(round3(actual))
magnitudeDelta = currentMagnitude - previousMagnitude
```

Si magnitudeDelta > 0, Subió y el delta va en rojo. Si magnitudeDelta < 0, Bajó y el delta va en verde. Si magnitudeDelta es 0, el cliente no se lista.

El importe mostrado es `ABS(magnitudeDelta)` a 3 decimales, como `$X.XXX/kg`, sin `+` y sin `-`.

## Ejemplo ARTURO

Anterior -$4.630/kg. Actual -$4.352/kg. Magnitud 4.630 → 4.352.

`ARTURO ANDRADE SANCHEZ — Bajó su comisión respecto a su última compra de -$4.630/kg a -$4.352/kg = $0.278/kg`

El token `$0.278/kg` es verde. El texto no dice "Subió" y no contiene `+$0.278/kg` ni `-$0.278/kg`.

## Casos negativos

-3.000 → -4.000 sube $1.000/kg en rojo. -4.000 → -3.000 baja $1.000/kg en verde. -2.500 → -2.000 baja $0.500/kg en verde. -4.352 → -4.630 sube $0.278/kg en rojo.

## Casos positivos

+3.000 → +4.000 sube $1.000/kg en rojo. +4.000 → +3.000 baja $1.000/kg en verde. JOSE ALBERTO LAYNES PEREZ, de $5.185/kg a $4.907/kg, sigue bajando; el delta ahora es `$0.278/kg` en verde.

## Transición de signo

-3.000 → +4.000 sube $1.000/kg en rojo. +4.000 → -3.000 baja $1.000/kg en verde. -3.000 → +3.000 tiene la misma magnitud y no se lista. Los valores del texto conservan el signo real.

## Rich text

Solo `$X.XXX/kg` lleva color. El nombre, la frase y los valores anterior/actual no. Subió es `FFDC2626`. Bajó es `FF15803D`. El color de ARTURO se conserva al escribir el XLSX y volver a abrirlo.

## Archivos modificados

- lib/igf-diario-descuentos-columna.js
- test/fix-igf-diario-descuentos-sign-semantics-070-r1.test.js
- test/impl-igf-diario-descuentos-resumen-semanal-todas-070.test.js
- docs/dev-loop/CURRENT_TASK.md
- docs/dev-loop/reports/FIX-IGF-DIARIO-DESCUENTOS-SIGN-SEMANTICS-070-R1.md

No cambió la fuente, el cociente monto/kg, la compra anterior, AK, los auxiliares, el comentario, las ventas, el resumen semanal, el Excel, la gráfica, la base de datos, ARR ni Forecast.

## Pruebas

070-R1: 4/4. 070: 12/12. 069-R2: 6/6. En conjunto, 22/22. `node --check server.js` limpio. `git diff --check` limpio.

## SHA producto

702eb1b75c86948f336b1e78927aa8741a080bcc

## SHA final

El commit documental que agrega este reporte. Es el HEAD de `fix/igf-diario-descuentos-sign-semantics-070-r1` después de ese commit.
