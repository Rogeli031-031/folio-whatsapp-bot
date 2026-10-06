# G4-PREP-ARR-IGF-DIARIO-RESULT-PARITY-066-R1

task_id: G4-PREP-ARR-IGF-DIARIO-RESULT-PARITY-066-R1
outcome: DONE
Estado: DONE_PENDING_REVIEW. El merge y el deploy quedan reservados al HUMAN_APPROVER.

## Referencias

- `origin/main`: `1b7584683947d057ef49652d76399aa20a3bbafd`
- product SHA: `9b3bb1cac11a5efbba9d2de300c6e8ed4fc67669`
- source SHA: `c2320239adbd84c972f80ee25abc7f790834e7cd`
- Rama: `fix/arr-igf-diario-result-parity-066-r1`
- Posición verificada antes de este prep: ahead 2, behind 0
- `git diff --check`: limpio
- Merge-base con `origin/main`: el mismo SHA de main

Este prep no modifica producto, tests, fórmulas, Excel, `server.js` ni la base.

## Causa de la venta

`applyFinancialsToMiniRow` tomaba `row.ventaTon`. Desde octubre la venta financiera es `financials.ventaTon`, equivalente a B TOTAL MES / 1000. Si falta, queda null. No hay caída silenciosa a la venta anterior. Esa venta alimenta ingreso, impuesto por kilo, resultado, mini, ARR y zona.

## Causa de los impuestos

066 dejó corporativos en J+K y el gasto visible en operativos + corporativos. El resultado seguía siendo ingreso − operativos − corporativos, así que L salía del resultado. El Excel carga L dentro de AG.

## Fórmula corregida

```
ingreso = (margenKg + comDescKg - hgKg) * ventaTon * 1000
utilidad = ingreso - operativos
resultado = utilidad - corporativos - impuestos federales
```

Equivalente expandido: ingreso − operativos − corporativos − impuestos federales.

L se resta una sola vez, como importe. No se resta otra vez el impuesto por kilo. Cero explícito vale. Si falta venta, operativos, corporativos o impuestos federales, el resultado queda null.

## Equivalencia con AG

La cadena diaria del Excel sigue M = J+K+L, O = H−M, W = O−U, AB = W−Z, AF = AB+AD, AG = AF×B. El dashboard presenta corporativos como J+K e impuestos como L/B. El resultado vuelve a cargar J+K+L una sola vez. El cálculo usa la precisión del helper, no los decimales visibles.

## Clasificación que se conserva

- Corporativos = J+K.
- Impuestos federales quedan fuera de corporativos.
- Gasto visible = operativos + corporativos.
- Impuestos visibles = L / B TOTAL MES.
- `applyDesgloseTotals` llama `closeResultadoFinal` con `classified.impuestosFederales`, así el desglose posterior no borra la resta.
- `ArrClient.tsx` no cambió. En octubre lee `miniRow.ventaTon` y `miniRow.resultadoFinalImporte`.
- Septiembre no entra al contrato 066. El brazo legado sigue usando `forecastRow.venta_ton`.
- Zona Provincia suma las ventas y los resultados corregidos. Un resultado null no se convierte en cero.

## Evidencia revisada en el source SHA

1. Octubre usa `finite(fin && fin.ventaTon)`.
2. `applyFinancialsToMiniRow` no lee `row.ventaTon`.
3. Impuesto por kilo = importe federal / venta kg de esa misma venta.
4. Corporativos = J+K en `expenseInputsFromComponentes`.
5. Gasto visible = operativos + corporativos.
6. `closeResultadoFinal` resta el importe federal una vez.
7. `applyDesgloseTotals` usa esa misma función.
8. ARR octubre: `ventaTon: miniRow?.ventaTon`.
9. ARR octubre: `rentabilidadImporte: miniRow?.resultadoFinalImporte`.
10. `usesOctoberContract(2026, 9)` es false. El resultado legado `utilOperImporte - corporativos` queda en el camino anterior a octubre.
11. `zonaFromPlantRows` suma venta y resultado; `sumMoney` devuelve null si alguna planta viene null.
12. El producto no contiene Puebla hardcodeada, `-201192` ni fila 48.
13. El producto no parsea XLSX. El Excel conserva `J${r}+K${r}+L${r}`.
14. El loader conserva una sola `listMonthOverrides` y no llama `listMonth` dentro del ciclo de plantas. La ruta conserva una sola `listMonth`.

## Pruebas ya corridas en el delivery

- 066-R1: 5/5
- 066: 10/10
- 059, 059-R1, 061, 062, 063, 063-R1, 064, 064-R1, 065, 065-R1 y Excel 036-044: 100/100
- `frontend npm run build`: 0
- `node --check server.js`: 0
- `git diff --check`: limpio

## Performance

Sin consulta nueva. Una planta de octubre sigue en 3 lecturas del acumulado. El desglose mensual sigue siendo una lectura de la ruta, fuera del ciclo de plantas.

## Pull request

- Número: 110
- URL: https://github.com/Rogeli031-031/folio-whatsapp-bot/pull/110
- Base: `main`
- Head: `fix/arr-igf-diario-result-parity-066-r1`
- Título: FIX 066-R1: alinear Venta y Resultado Final con AG TOTAL MES
- mergeable: true
- mergeable_state: clean
- merged: false

## Cierre de protocolo

- Archivos de este prep: `docs/dev-loop/CURRENT_TASK.md`, este reporte.
- Producto, tests, Excel, fórmulas, `server.js` y DB: no tocados.
- Contratos consultados: `AGENTS.md`, `docs/dev-loop/LOOP_PROTOCOL.md`, `CURRENT_TASK.md`.
- Contratos modificados: ninguno.
- Contradicciones: ninguna.
- Desvíos: ninguno.
- next_task_proposed: ninguno.
- secrets_check: sin secretos, tokens ni credenciales.
- human_decision_needed: merge y deploy, solo HUMAN_APPROVER.

NO MERGE. NO DEPLOY.
