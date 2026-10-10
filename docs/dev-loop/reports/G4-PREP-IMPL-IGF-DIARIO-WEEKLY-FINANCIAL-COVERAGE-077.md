# G4-PREP-IMPL-IGF-DIARIO-WEEKLY-FINANCIAL-COVERAGE-077

resultado: PASS

status: DONE_PENDING_REVIEW

origin/main: f6dbbe76021ce52f8f2559836239a95f415c2615

merge-base: f6dbbe76021ce52f8f2559836239a95f415c2615

ahead/behind: 2 / 0

product_sha: cc5ef7975977936e835f8a13375ade170e45d496

implementation_final_sha: 96c1fb46eb8508ec27ae3302aa9b93d7fba12fef

branch: implementation/igf-diario-weekly-financial-coverage-077

merge: false

deploy: false

auto_merge: false

## 1. Base

`origin/main` sigue en `f6dbbe76021ce52f8f2559836239a95f415c2615`. Ese SHA es el merge-base. Antes del commit documental de G4, la rama está 2 commits adelante y 0 atrás.

Commits exclusivos, del más antiguo al más nuevo:

1. `cc5ef7975977936e835f8a13375ade170e45d496` — IMPL 077: publicar resultado semanal con cobertura parcial
2. `96c1fb46eb8508ec27ae3302aa9b93d7fba12fef` — docs: registra IMPL 077 de cobertura financiera semanal

No hay un tercer commit de producto. `cc5ef797..96c1fb46` toca solo `docs/dev-loop/CURRENT_TASK.md` y `docs/dev-loop/reports/IMPL-IGF-DIARIO-WEEKLY-FINANCIAL-COVERAGE-077.md`.

## 2. Diff

`origin/main...cc5ef797` cambia exactamente estos archivos:

- `lib/igf-diario-weekly-plant.js`
- `lib/igf-diario-weekly-excel.js`
- `frontend-dashboard/lib/api.ts`
- `frontend-dashboard/lib/igf-diario-weekly-rows.ts`
- `frontend-dashboard/components/IgfDiarioWeeklyPlantPanel.tsx`
- `frontend-dashboard/components/IgfDiarioWeeklyAllPlantsPanel.tsx`
- `test/fix-igf-diario-weekly-coverage-resumen-5d-069-r1.test.js`
- `test/impl-igf-diario-weekly-financial-coverage-077.test.js`

No hay migraciones, SQL, `.env`, credenciales ni secretos. No hay diff en `lib/dashboard-arr-forecast.js`, `lib/igf-diario-venta-kg.js`, `lib/igf-diario-grafica.js` ni `server.js`.

El diff de `lib/` y `frontend-dashboard/` no contiene `San Luis`, `SANLUIS`, `2026-10-04`, `Semana 41`, `98.69`, `130162.74`, `128461.74`, `1701`, `75771.74` ni `52690`. Esas cifras viven en el fixture de prueba. La prueba de 077 también afirma que `lib/igf-diario-weekly-plant.js` no contiene `130162.74`, `98.69317440613189` ni `San Luis`.

## 3. Contrato

Decisión B. El día con venta y sin tasa no se rellena. La semana publica el resultado solo con las observaciones cubiertas. No hay conversión global de null a 0. El 0 explícito sigue siendo número.

Día incompleto, después de `dayMetrics`:

- `venta_kg` puede existir
- `com_desc_kg`, `resultado_kg` y `resultado_mxn` quedan null
- `financialMissing` publica esas tres claves en `missing_components` cuando la venta es positiva

Semana, en `aggregateCovered`:

- `resultado_mxn` = suma de `dayResultMxn` de los días con venta positiva y resultado finito
- `resultado_kg` = ese importe / `coverage.resultado.kg_covered`
- no es el resultado parcial multiplicado por los kilos totales
- `com_desc_kg` = suma de `cdKg * venta` / kilos cubiertos de esa misma métrica

`weighted` y `sumCovered` siguen para precio, costo, flete, ingreso y gastos. Un día sin venta positiva no entra y no anula la semana.

Cobertura publicada en `com_desc_kg` y `resultado`: `kg_total`, `kg_covered`, `coverage_kg_pct`, `days_with_sales`, `days_covered`, `coverage_days_pct`, `covered_real_kg`, `covered_projected_kg`. Un día es proyectado cuando el corte no está vacío y la fecha es mayor o igual al corte.

- 100%: el resultado coincide con importe / venta total y el rótulo de cobertura es null
- parcial: el denominador es solo los kilos cubiertos
- 0%: las tres métricas semanales quedan null, no 0, y siguen en faltantes
- semana sin venta positiva: los porcentajes quedan null

## 4. Fixture de semana 41

La prueba "fixture de semana parcial cubre kilos y días sin rellenar el día desconocido" ejecutó el fixture con corte `2026-10-09`. Resultado, con tolerancia `1e-9` donde la prueba usa comparación cercana:

- venta total 130162.74
- venta cubierta 128461.74
- día desconocido 1701 kg, con las tres métricas null
- cobertura de kilos 98.69317440613189%
- días 6/7
- cobertura de días 85.71428571428571%
- cubierto real 75771.74
- cubierto proyectado 52690
- `com_desc_kg` -4.010420881734904
- `resultado_kg` -1.1396192353729382
- `resultado_mxn` -146397.4699134772
- `resultado_kg` igual a importe cubierto / kilos cubiertos
- `resultado_kg` distinto de importe cubierto / venta total

El rótulo de pantalla, redondeado solo al mostrar, es `Cobertura financiera 98.69% · 128,462 / 130,163 kg · 6/7 días · Real 75,772 kg · Proyectado 52,690 kg`.

## 5. Todas

`consolidateCovered` deja `venta_kg` en la suma de `consolidateMetrics`, así que la venta consolidada puede incluir kilos no cubiertos. `resultado_mxn` suma solo importes de plantas con kilos cubiertos y métrica numérica. `resultado_kg` divide ese importe entre esos kilos cubiertos. `com_desc_kg` pondera cada planta por sus propios kilos cubiertos.

La prueba de Todas confirma venta 2876, importe -2140, kilos cubiertos 1125 y que el resultado por kilo no usa 2876 como denominador. Una planta incompleta no borra a las demás.

## 6. UI, Excel y gráfica

El backend, `coverageCaption` del frontend y el Excel usan la misma plantilla. La UI muestra el rótulo solo cuando la cobertura es parcial (`data-coverage="partial"`). El panel de planta separa `Faltantes:` de `Días incompletos:`. La celda diaria desconocida del Excel sigue en `—`. La semana escribe el importe parcial. La gráfica de `resultado_mxn` del fixture dibuja 6 círculos y deja el primer punto en null, incompleto, con `missing_components` igual a `resultado_mxn`.

## 7. Pruebas

Lote ejecutado: 107/107, 0 fallos.

- 054-R2 y 054-R3
- 067, 069, 069-R1 y 069-R2
- 070 y 070-R1
- 072, 074 y 077

La excepción ya presente en el commit de producto es la de 069-R1: un día con venta y `cdKg` null ya no anula `resultado_mxn` de la semana. El día sigue null. El resto de 069-R1 pasa. Las identidades de semana completa en 067 y 070 siguen pasando.

`node --check server.js`, `lib/igf-diario-weekly-plant.js` y `lib/igf-diario-weekly-excel.js` terminaron sin salida y con código 0. `git diff --check` de `origin/main..HEAD` terminó limpio. `npm run build` en `frontend-dashboard` terminó con código 0. Los archivos generados de `.next` se restauraron y no entran en este commit.

## 8. Cierre

G4 = PASS.

No se modificó producto ni tests. No merge. No deploy. No auto-merge.

task_id: G4-PREP-IMPL-IGF-DIARIO-WEEKLY-FINANCIAL-COVERAGE-077

outcome: DONE

archivos tocados: `docs/dev-loop/CURRENT_TASK.md`, este reporte

archivos no tocados: producto y tests

contratos consultados: autorización humana de G4, reporte IMPL 077, código de agregación semanal

contratos modificados: ninguno

contradicciones: ninguna

desvíos: ninguno

next_task_proposed: autorización humana de merge, si se decide

secrets_check: sin secretos

human_decision_needed: merge a main, si el humano lo autoriza después
