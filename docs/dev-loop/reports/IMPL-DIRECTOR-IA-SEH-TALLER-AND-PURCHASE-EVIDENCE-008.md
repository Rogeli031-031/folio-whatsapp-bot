# IMPL-DIRECTOR-IA-SEH-TALLER-AND-PURCHASE-EVIDENCE-008

## Identidad

| Campo | Valor |
|---|---|
| task_id | IMPL-DIRECTOR-IA-SEH-TALLER-AND-PURCHASE-EVIDENCE-008 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 397e8599309367a2f6c9a6b8279c03ad90c4c3a1 |
| branch | implementation/director-ia-seh-taller-purchase-evidence-008 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |
| PR | no |

## Contratos consultados

- `docs/director-ia/` no se modificó (sin G2/G3).
- `origin/main` `397e8599` (merge de 007 / PR #52) como base.
- Fuente SEH: `GET /api/seh/cumplimiento` = `scoreSehOperacion(public.seh_equipos)` + `scoreRegulacion(public.seh_carpetas_legales)`.
- Fuente legal: misma que `/seh/carpetas-legales`.
- Fuente Taller: `public.folios` / Expense Analytics, dominio `TALLER`, métrica `SUM`.
- Fuente próxima compra: `computeDicf` (modal Movimiento por categoría: `freqDays`, `lastPurchaseDate`) con fallback a `arr.dicf_cliente_mes.last_date`.

## Contratos modificados

Ninguno.

## Archivos tocados

- `lib/director-ia-seh-taller-purchase-evidence-008.js` (nuevo)
- `lib/director-ia-planner.js`
- `lib/director-ia-chat.js`
- `lib/director-ia-conversation-state.js`
- `lib/director-ia-conversational-executive-layer.js`
- `lib/director-ia-expense-analytics.js`
- `lib/director-ia-folio-search.js`
- `lib/director-ia-predictive-commercial.js`
- `test/director-ia-seh-taller-purchase-evidence-008.test.js`
- `test/fixtures/director-ia-seh-taller-purchase-evidence-008.js`
- `docs/dev-loop/reports/IMPL-DIRECTOR-IA-SEH-TALLER-AND-PURCHASE-EVIDENCE-008.md`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)

No se commitean `.next` ni reportes OPS-VERIFY ajenos.

## Qué se corrigió

### A. SEH / regulación

1. `¿Cómo estamos en regulaciones?` ya no extrae `regulaciones` como nombre de planta ni pide Acapulco si la planta del chat ya está autorizada.
2. Tokens de regulación/SEH/permisos salen de `NON_PLANT_SCOPE_TOKENS` y de `extractExplicitPlant`.
3. Intent nuevo `seh_regulation` consume la misma agregación que `/seh/cumplimiento`: PLANTA = operación (PLANTA+SCI) + regulación; ESTACIÓN = ESTACIONES; AUTOTANQUE = PIPAS. Los porcentajes no están hardcodeados.
4. `regulación de planta` / sin estado / vigentes / en trámite / vencidos / próximos a vencer / N/A / permisos federales usan `seh_carpetas_legales` y el catálogo documental. La respuesta lista No./Bloque, Documento, Estatus, Vencimiento, Observación. Sin estado no se infiere como cumplimiento.

### B. Taller

5. `¿Cuánto gastamos en taller de enero a septiembre?` ya no cae en `predictive_commercial`.
6. Dominio `TALLER`, operación `SUM`, periodo físico enero–septiembre del año de corte.
7. Respuesta líder: `De enero a septiembre de 2026 se gastaron $X en Taller.` Folios/pagados/conceptos solo si hay evidencia física.
8. Sin periodo: `¿De qué mes o periodo?` con `pending_information_gap`. `enero` conserva `TALLER + SUM`.
9. Rangos: `enero a septiembre`, `de enero a septiembre`, `enero-septiembre`, `del 1 de enero al 30 de septiembre`, `este año hasta septiembre`, `acumulado enero-septiembre`, `año a la fecha`.

### C. Próxima compra

10. Se lee primero `computeDicf` (misma evidencia que Última/Frecuencia del modal). Fallback: cache `last_date` + join de ventas. Ya no se declara `falta last_purchase_date` solo porque el SELECT viejo omitía el campo.
11. Si existen `last_purchase_date` y `freqDays`: `expected_next = last + freqDays`. Aclara que es estimación histórica, no forecast contractual.
12. `INSUFFICIENT_EVIDENCE` solo si el campo falta físicamente.
13. `TORTILLERIA ERICK` / `Tortillería Erick` / `tortilleria erick` resuelven canónicamente. `ERICK` ambiguo se aclara. No hay `Invalid time value`.

## Fixtures (solo test)

| Familia | Count |
|---|---|
| REGULATION_STATUS | 30 |
| REGULATION_PLANT_DETAIL | 30 |
| TALLER_EXPENSE | 30 |
| EXPECTED_NEXT_PURCHASE | 30 |
| **Total utterances nuevas** | **120** |
| Anti-collisions | ≥120 |
| Multi-turn | ≥60 |

No hay phrasebook de producción.

## Gate

- [x] SEH usa planta actual
- [x] no pide Acapulco nuevamente
- [x] resumen Planta/Estación/Autotanque coincide con dashboard (misma agregación; cifras no hardcodeadas)
- [x] regulación planta puede bajar a detalle documental
- [x] estados/vencimientos salen de fuente física
- [x] Taller no cae en predictive_commercial
- [x] Taller soporta SUM por mes
- [x] Taller soporta SUM por rango
- [x] aclaración de periodo conserva TALLER + SUM
- [x] expected-next consulta fuente correcta de Última/Frecuencia
- [x] TORTILLERIA ERICK resuelve canónicamente
- [x] no Invalid time value
- [x] INSUFFICIENT_EVIDENCE solo si realmente falta evidencia física
- [x] >=90 utterances nuevas
- [x] >=120 anti-collisions
- [x] >=60 multi-turn
- [x] suites 008/007/006/005/004/003 verdes

## Verificación

```
node --test test/director-ia-seh-taller-purchase-evidence-008.test.js
node --test test/director-ia-category-commission-ui-actions-007.test.js test/director-ia-direct-metrics-context-hardening-006.test.js test/director-ia-commercial-runtime-hardening-005.test.js test/director-ia-commercial-runtime-coverage-004.test.js test/director-ia-predictive-commercial-coverage.test.js
```

008: 18/18. 007+006+005+004+003+008 juntos: 99/99.

Regresiones literales E2E (`askDirectorIa`):

- `¿Cómo estamos en regulaciones?` → Acapulco — cumplimiento SEH
- `¿Cuánto gastamos en taller de enero a septiembre?` → SUM Taller, no venta observada
- `¿Cuánto gastamos en taller?` + `enero` → TALLER + SUM de enero
- `¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?` → last + freqDays

## Cierre

`CURRENT_TASK` → `DONE_PENDING_REVIEW`.  
Commit + push solo a `implementation/director-ia-seh-taller-purchase-evidence-008`.  
NO PR. NO merge. NO deploy. NO siguiente tarea.
