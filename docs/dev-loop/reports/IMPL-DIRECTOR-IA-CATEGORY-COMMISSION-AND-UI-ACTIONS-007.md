# IMPL-DIRECTOR-IA-CATEGORY-COMMISSION-AND-UI-ACTIONS-007

## Identidad

| Campo | Valor |
|---|---|
| task_id | IMPL-DIRECTOR-IA-CATEGORY-COMMISSION-AND-UI-ACTIONS-007 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 2f41efabcea3754663bd0e9ad85bc1ae225de3ac |
| branch | implementation/director-ia-category-commission-ui-actions-007 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |
| PR | no |

## Contratos consultados

- `docs/director-ia/` no se modificó (sin G2/G3).
- `origin/main` `2f41efab` (merge de 006 / PR #51) como base.
- 006: comisión general = IGF DESC./DESCUENTO (`com_desc_kg`). Se conserva.

## Contratos modificados

Ninguno.

## Archivos tocados

- `lib/director-ia-category-commission-007.js` (nuevo)
- `lib/director-ia-planner.js`
- `lib/director-ia-chat.js`
- `lib/director-ia-conversation-state.js`
- `lib/director-ia-direct-metrics-context-hardening-006.js` (Casa/Comisionista fuera de comisión global)
- `lib/director-ia-predictive-commercial.js` (fecha inválida)
- `frontend-dashboard/lib/arr-categoria-commission.ts` (nuevo; misma agregación que 007)
- `frontend-dashboard/modules/director-ia/lib/api.ts`
- `frontend-dashboard/modules/director-ia/components/DirectorIaChatPanel.tsx`
- `frontend-dashboard/modules/director-ia/components/DirectorIaChatModal.tsx`
- `frontend-dashboard/components/IgfForecastClient.tsx`
- `test/director-ia-category-commission-ui-actions-007.test.js`
- `test/fixtures/director-ia-category-commission-ui-actions-007.js`
- `docs/dev-loop/reports/IMPL-DIRECTOR-IA-CATEGORY-COMMISSION-AND-UI-ACTIONS-007.md`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)

## Qué se corrigió

1. **Comisión general** (`¿Qué comisión tenemos?`) sigue en `igf_direct_metric` → `com_desc_kg` IGF. Respuesta corta.
2. **Comisión Casa / Comisionista** ya no usa `-0.13` global. Agrega la misma evidencia física que Movimiento por categoría: `kg × |descKg|` por subcategoría descubierta (no hardcodeada).
3. **Respuesta de categoría** incluye periodo, venta total, comisión total $ y $/kg, todas las subcategorías y oferta: `¿Quieres abrir la tabla de Movimiento por categoría?`
4. **Subcategoría** (`Casa Autotanque`, `Comisionista <sub>`) devuelve solo la fila física. Comisionista no inventa nombres: se descubren de las filas ARR.
5. **UI_ACTION real** `OPEN_CATEGORY_MOVEMENT` con `category = CASA | COMISIONISTA`. Frontend monta `ArrDicfCategoriaBucketsModal` en IGF Forecast y selecciona el tab.
6. **pending_ui_action** en `conversation_state`. `sí / si / sí ábrela / adelante / ábrela / ok / va` ejecuta la acción ofrecida. Un `sí` aislado no reabre una acción vieja si el contexto cambió.
7. **Comandos directos** (`abre movimiento por categoría`, `abre la tabla de Casa`, `abre comisiones de Casa`, `abre la comisión de Comisionista`, etc.) abren el modal.
8. **`abre la venta diaria`** emite `OPEN_IGF_PRONOSTICO_MODAL` y el frontend abre el mismo modal Pronóstico que `OPEN_PRONOSTICO`. Imperativo: inmediato. `Quiero ver la venta diaria` ofrece y espera confirmación.
9. **`OPEN_PRONOSTICO` existente** se conserva.
10. **Invalid time value** en `¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?`: `lastPurchaseDate` / `asOf` / `expected` inválidos → `INSUFFICIENT_EVIDENCE` o `RESULT_WITH_EVIDENCE`. Nunca excepción visible.

## Fuente física

| Campo | Origen |
|---|---|
| category | `categoria` / `canal` ARR (`CASA` vs `COMISIONISTA`) |
| subcategory | `subcategoria` o `Sin subcategoría` si vacío |
| venta_ton | `kg_proyectado` o `kg` / 1000 |
| commission_projected_amount | kg × \|descKg\| |
| commission_projected_per_kg | amount / kg |
| forecast_period | mes vigente IGF/ARR |
| plant | planta autorizada del chat |

Runtime de chat: `computeClientesDescuentoMes` o `chatDeps.categoryCommissionRows` (tests). Frontend: `fetchArrClientesMes` + `buildCategoryCommissionFromArrRows`.

## Fixtures (solo test)

| Familia | Count |
|---|---|
| CASA categoría | 50 |
| CASA subcategoría (plantillas parametrizadas) | 50 |
| COMISIONISTA categoría | 50 |
| COMISIONISTA subcategoría (plantillas parametrizadas) | 50 |
| **Total utterances nuevas** | **200** |
| Anti-collisions | ≥150 |
| Multi-turn | ≥80 |

Las subcategorías de Comisionista se expanden sobre nombres descubiertos de la fuente física. No hay phrasebook de producción.

## Gate

- [x] comisión general sigue funcionando
- [x] comisión Casa usa Movimiento por categoría
- [x] comisión Comisionista usa Movimiento por categoría
- [x] Casa total + subcategorías
- [x] Comisionista total + subcategorías
- [x] subcategoría concreta funciona
- [x] 50 formas Casa categoría
- [x] 50 formas Casa subcategoría
- [x] 50 formas Comisionista categoría
- [x] 50 formas Comisionista subcategoría
- [x] >=200 utterances nuevas
- [x] >=150 anti-collisions
- [x] >=80 multi-turn
- [x] "sí" abre tabla ofrecida
- [x] apertura conserva CASA/COMISIONISTA
- [x] "abre la venta diaria" abre modal Pronóstico
- [x] OPEN_PRONOSTICO existente no se rompe
- [x] Invalid time value eliminado
- [x] suites 007/006/005/004/003 verdes
- [x] frontend build verde (`next build` + prepare-standalone)

## Verificación

```
node --test test/director-ia-category-commission-ui-actions-007.test.js
node --test test/director-ia-direct-metrics-context-hardening-006.test.js test/director-ia-commercial-runtime-hardening-005.test.js test/director-ia-commercial-runtime-coverage-004.test.js test/director-ia-predictive-commercial-coverage.test.js
cd frontend-dashboard && npm run build
```

007: 18/18. 006/005/004/003: 63/63. Frontend: compile + types + 12 páginas.

## Cierre

`CURRENT_TASK` → `DONE_PENDING_REVIEW`.  
Commit + push solo a `implementation/director-ia-category-commission-ui-actions-007`.  
NO PR. NO merge. NO deploy. NO siguiente tarea.
