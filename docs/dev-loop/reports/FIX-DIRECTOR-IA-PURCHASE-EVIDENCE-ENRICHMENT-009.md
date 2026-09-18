# FIX-DIRECTOR-IA-PURCHASE-EVIDENCE-ENRICHMENT-009

## Identidad

| Campo | Valor |
|---|---|
| task_id | FIX-DIRECTOR-IA-PURCHASE-EVIDENCE-ENRICHMENT-009 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 0b90eab432e42d9d35cd5b4b4621c5d78c14efdf |
| branch | fix/director-ia-purchase-evidence-enrichment-009 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |
| PR | no |

## Contratos consultados

- `docs/director-ia/` no se modificó (sin G2/G3).
- `origin/main` `0b90eab4` (merge de 008 / PR #53) como base.
- Fuente próxima compra: `computeDicf` (modal Movimiento por categoría) + `arr.dicf_cliente_mes.last_date` + `MAX(fecha)` de `arr.ventas_diarias_cliente` (`kg > 0`).
- Fuente Taller: mismos folios físicos de Expense Analytics; no se reclasifican estatus.

## Contratos modificados

Ninguno.

## Archivos tocados

- `lib/director-ia-purchase-evidence-enrichment-009.js` (nuevo)
- `lib/director-ia-seh-taller-purchase-evidence-008.js` (`loadDicfClientsPhysical` ya no acepta fila incompleta)
- `lib/director-ia-predictive-commercial.js`
- `lib/director-ia-expense-analytics.js`
- `lib/director-ia-chat.js`
- `test/director-ia-purchase-evidence-enrichment-009.test.js`
- `test/fixtures/director-ia-purchase-evidence-enrichment-009.js`
- `docs/dev-loop/reports/FIX-DIRECTOR-IA-PURCHASE-EVIDENCE-ENRICHMENT-009.md`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)

No se commitean `.next` ni reportes OPS-VERIFY ajenos.

## Causa

`computeDicf` puede devolver `cliente` + `freqDays` válido con `lastPurchaseDate = null`.  
`loadDicfClientsPhysical` aceptaba esa fila como completa y no consultaba cache ni ventas.  
El loader declaraba `INSUFFICIENT_EVIDENCE: falta last_purchase_date` aunque la fecha existía en `arr.dicf_cliente_mes` o en `arr.ventas_diarias_cliente`.

## Qué se corrigió

### A. Enriquecimiento de última compra

Una fila con cliente válido, `freqDays` válido y `lastPurchaseDate` null **no** se trata como completa.

Prioridad por cliente normalizado (`cliente_norm`):

1. `computeDicf.lastPurchaseDate`
2. `arr.dicf_cliente_mes.last_date` (mismo cliente/planta)
3. `MAX(fecha)` en `arr.ventas_diarias_cliente` donde `cliente_norm` + `plant_code` + `kg > 0`

`freqDays` de `computeDicf` se conserva si es físicamente válido (`> 0` y `< 9999`). Cache solo si `computeDicf` no trae frecuencia válida. No se mezclan fechas y frecuencias de fuentes incompatibles en silencio.

`INSUFFICIENT_EVIDENCE` solo si, después de las tres fuentes de fecha y las dos de frecuencia, sigue faltando `last_purchase_date` o `freqDays`. Una falla de adapter no declara ausencia.

`expected_next = last_purchase_date + freqDays`. Respuesta:

```
TORTILLERIA ERICK compró por última vez el DD/MM/AAAA.
Su frecuencia histórica es aproximadamente cada N días.
La siguiente compra esperada por ese patrón sería alrededor del DD/MM/AAAA.

Es una estimación basada en frecuencia histórica, no un compromiso ni forecast contractual.
```

### B. Matching canónico

`TORTILLERIA ERICK` / `Tortillería Erick` / `tortilleria erick` se reconcilian por `cliente_norm`. No se elige otro cliente.

### C. Preguntas derivadas

Última compra, cada cuántos días, está atrasada, días sin comprar y cuándo debería haber comprado usan la misma evidencia enriquecida. No se reusa un listado de churn vacío como si faltara el cliente.

### D. Taller — otros estados

Si `total != pagados + pendientes`, se muestra `N en otros estados`.  
Ejemplo físico: 86 folios / 47 pagados / 0 pendientes → 39 en otros estados.  
No se reclasifican como pagados ni pendientes.

### E. Fuera de alcance (intacto)

SEH/regulación, sumas y rangos de Taller, comisión por categoría, UI actions, clientes nuevos y movimiento comercial no se reabrieron.

## Fixtures (solo test)

| Familia | Count |
|---|---|
| EXPECTED_NEXT_PURCHASE_ENRICHED | ≥30 |
| LAST_PURCHASE / PURCHASE_FREQUENCY / PURCHASE_OVERDUE | ≥20 |
| Anti-collisions | ≥50 |
| Multi-turn | ≥30 |

Regresión literal **sin** inyectar `lastPurchaseDate` lleno:

- `computeDicf`: `TORTILLERIA ERICK`, `freqDays` válido, `lastPurchaseDate = null`
- fecha obtenida de cache/ventas

Fixture sintético obligatorio:

- `computeDicf`: `CLIENTE TEST`, `freqDays = 14`, `lastPurchaseDate = null`
- cache `last_date = null`
- ventas `MAX(fecha) = 2026-09-10`
- resultado: `lastPurchaseDate = 2026-09-10`, `freqDays = 14`, `expected_next = 2026-09-24`
- no `INSUFFICIENT_EVIDENCE`

Multi-turn cubiertos:

- `¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?` → última compra → cada cuántos días → está atrasada
- `¿Cuánto gastamos en taller de enero a septiembre?` → cuántos folios → cuántos en otros estados

No hay phrasebook de producción.

## Gate

- [x] computeDicf incompleto no bloquea enriquecimiento
- [x] cache last_date se consulta si falta fecha
- [x] MAX(fecha) ventas completa última compra
- [x] freqDays válido de computeDicf se conserva
- [x] TORTILLERIA ERICK deja de caer en falso INSUFFICIENT_EVIDENCE
- [x] expected_next correcto
- [x] última compra responde desde misma evidencia
- [x] frecuencia responde desde misma evidencia
- [x] atraso usa misma evidencia
- [x] no Invalid time value
- [x] Taller muestra otros estados cuando aplica
- [x] suites 009/008/007/006/005/004/003 verdes

## Verificación

```
node --test test/director-ia-purchase-evidence-enrichment-009.test.js
node --test test/director-ia-seh-taller-purchase-evidence-008.test.js test/director-ia-category-commission-ui-actions-007.test.js test/director-ia-direct-metrics-context-hardening-006.test.js test/director-ia-commercial-runtime-hardening-005.test.js test/director-ia-commercial-runtime-coverage-004.test.js test/director-ia-predictive-commercial-coverage.test.js
```

009: 12/12. 009+008+007+006+005+004+003: 111/111.

## Cierre

`CURRENT_TASK` → `DONE_PENDING_REVIEW`.  
Commit + push solo a `fix/director-ia-purchase-evidence-enrichment-009`.  
NO PR. NO merge. NO deploy. NO siguiente tarea.
