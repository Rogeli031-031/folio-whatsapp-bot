# AUDIT-DIRECTOR-IA-NEW-CLIENTS-PURCHASE-DISCOUNT-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-NEW-CLIENTS-PURCHASE-DISCOUNT-001"
outcome: "DONE_PENDING_REVIEW"
mode: "AUDIT_READ_ONLY"
implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
source_code_changed: NO
test_code_changed: NO
base_main_sha: "382003789e51f7aca5ace46cd29a4fa0d0c9d2df"
branch: "audit/director-ia-new-clients-purchase-discount-001"
g1_human: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-01 (authorized_by / authorized_at / human_authorization intactos)"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-NEW-CLIENTS-PURCHASE-DISCOUNT-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "server.js"
  - "frontend-dashboard/"
  - "sql/"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_V2_FASE_2_PLANNER.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
live_db_validation: "NOT_RUN"
secrets_check: "none"
```

## 1. Executive result

Director IA **no puede** responder de punta a punta «¿Qué clientes nuevos entraron en agosto? ¿Cuánto compraron y con qué descuento?» porque la pregunta se parte en **varias fronteras físicas distintas**, no en un solo bug.

Hallazgos demostrados:

1. El dashboard observado («Delta Ingreso Cliente Forecast» + «Proyección a cierre del mes») lo produce `dicf.computeDicf` vía `POST /api/dashboard/dicf-datos`. `computeDeltaIngresoForecast` es **otro motor** (`POST /api/dashboard/delta-ingreso-forecast-datos`).
2. Si el chat entra a `commercial_state`, Director IA llama el **mismo** `dicf.computeDicf`. Eso no implica que P1–P6 entren a esa ruta.
3. **Nuevo (DICF)** es `ingreso_anterior <= 0 && ingreso_forecast > 0`. No es `kgA <= 0 && kgB > 0`. A = mes calendario anterior a `MAX(fecha)`. B = forecast a cierre del mes de `MAX(fecha)`.
4. La tonelada de Nuevos en UI y en contexto comercial es `kg_mes_forecast` (real del mes + proyección si el mes no cerró), no kg real de agosto solo.
5. `desc_kg_hist` existe en filas internas / `dicfRowsByCliente` / cache / Excel. **No** se mapea al objeto de lista `nuevos.clientes` ni se imprime en `buildCommercialStateFocusedContext`.
6. La lista source no se recorta en `computeDicf`. El contexto comercial recorta a **20**. La UI dashboard recorta la lista a **15**. Los totales de categoría sí son del grupo completo.
7. P2 (`…con qué descuento?`) **sí** clasifica categoría `nuevos` y planner `commercial_state`, pero `askDirectorIa` evalúa `isPlantFinancialKpiQuestion("descuento")` **antes** de `commercial_state` e inyecta anexo IGF con `COMPARACION MARGEN $/kg`.
8. P1 / P4 / P5 / C1 caen a `commercial_trend` (movers 30d trailing, top-6). Esa definición de «nuevo» es otra (`previo <= 0 && actual > 0` en ventanas trailing).
9. P3 cae a `client_profile` porque «Acapulco» capitalizado cuenta como token de cliente + periodo agosto.
10. P6 no resuelve categoría (`nuevos` exige la palabra `cliente(s)`). Va a IGF.
11. La frase exacta «No se identificaron clientes nuevos en la planta de Acapulco» **no está en source**. `FALSE_ZERO_NEW_PATH = NOT_REPRODUCED`.
12. 15.4 vs ~15.5 tiene mecanismo de redondeo (`fmtTon` del total crudo vs suma de `fmtTon` por subcanal). Raw canónico **NOT_PROVEN** (sin DB).

No se implementó nada. No se corrigió nada.

## 2. Base/repository evidence

| Check | Valor |
| --- | --- |
| `git branch --show-current` | `audit/director-ia-new-clients-purchase-discount-001` |
| `HEAD` | `382003789e51f7aca5ace46cd29a4fa0d0c9d2df` |
| `origin/main` | `382003789e51f7aca5ace46cd29a4fa0d0c9d2df` |
| Preflight working tree | solo `docs/dev-loop/CURRENT_TASK.md` |
| G1 | vigente; campos humanos no tocados |
| `INTRODUCING_COMMIT` (nacimiento de `lib/director-ia-commercial-state.js`) | `7bb8a29c1549e31488f5813eec7c211ecc2e6c31` |
| Equivalencia render producción ↔ este SHA | `NOT_PROVEN` |

`loadCommercialStateForChat` comenta y ejecuta el mismo compute que el dashboard:

```228:262:lib/director-ia-commercial-state.js
 * Lazy load — mismo motor que POST /api/dashboard/dicf-datos (sin HTTP).
 ...
    const raw = await dicf.computeDicf(client, plantCode, plantaNombre, deps.getMargenKgPorPeriodo);
```

Hechos previos A–F: **verificados físicamente**, no copiados. Detalle en §§4–10 y §16.

## 3. Human production evidence

Tratada como **observacional**. No es verdad canónica. No se hardcodeó en runtime.

| Control humano | Valor declarado | Uso en esta auditoría |
| --- | --- | --- |
| Planta | Acapulco | ancla de las sondas |
| Pantalla | Delta Ingreso Cliente Forecast | cadena UI demostrada |
| Corte | datos hasta 2026-08-30 | coincide con `last_date` DICF si `MAX(fecha)` es esa |
| Conteos Nuevos | 42+20+0+2+2 = 66 | `NEW_CLIENT_COUNT_UI_CONTROL = 66_OBSERVATIONAL` |
| Ingreso | `,482` | `NEW_CLIENT_INCOME_UI_CONTROL = 108482_OBSERVATIONAL` |
| Ton por bloques | 13.2+1.4+0.0+0.4+0.5 ≈ 15.5 | `VISIBLE_BUCKET_TON_SUM = APPROX_15_5_OBSERVATIONAL` |
| Director IA | 66 clientes, 15.4 t, `,482` | `DIRECTOR_REPORTED_TON = 15_4_OBSERVATIONAL` |
| Otra respuesta | «No se identificaron clientes nuevos…» + aumentaron/disminuyeron | false-zero no reproducido en source |
| Margen verbalizado | julio 7.11 / agosto 7.32 / +0.21 | compatible con anexo IGF, no con descuento cliente |

`RAW_CANONICAL_TON = NOT_PROVEN`.

## 4. Dashboard physical chain

```
UI "Delta Ingreso Cliente Forecast"
  → frontend-dashboard/app/page.tsx (banner «Proyección a cierre del mes»)
  → frontend-dashboard/lib/api.ts postDicfDatos
  → POST /api/dashboard/dicf-datos          (server.js ~15842)
  → dicf.computeDicf(client, plantCode, planta, getMargenKgPorPeriodo)
  → SQL: arr.ventas_diarias_cliente
         arr.descuentos_diarios_cliente
         arr.cliente_categoria_mes
         arr.dicf_config
         public.plantas + arr.provincia_plants
         cache write arr.dicf_cliente_mes
         margen IGF vía getMargenKgPorPeriodo
```

Columna **Nuevos** de la tabla `byCategoria`:

- `count` = `cat.nuevos.length`
- `totalDeltaKgStr` = `fmtTon(sum(kg_mes_forecast))` por canal/subcanal
- celda UI: `{count} ({totalDeltaKgStr} Ton · {totalDeltaIngresoStr})`

Motor **no equivalente** (existe, no es esta pantalla cuando `dicfData` está cargado):

```
postDeltaIngresoForecastDatos
  → POST /api/dashboard/delta-ingreso-forecast-datos
  → computeDeltaIngresoForecast
```

`page.tsx` usa `dicfData?.byCategoria ?? deltaForecastData?.byCategoria`. El banner «Proyección a cierre del mes (últimos {window_days} días · datos hasta {last_date})» solo se pinta si hay `dicfData`.

```
DASHBOARD_ENGINE = dicf.computeDicf
DASHBOARD_ENDPOINT = POST /api/dashboard/dicf-datos
DASHBOARD_SOURCE_TABLES = arr.ventas_diarias_cliente, arr.descuentos_diarios_cliente, arr.cliente_categoria_mes, arr.dicf_config, public.plantas, arr.provincia_plants; cache arr.dicf_cliente_mes; margen IGF
```

## 5. Director IA physical chain

Hay **dos routers**. No coinciden.

### A) Helper `resolveDirectorIaChatRouting`

Orden: `wantCommercialState` **antes** de `wantFinancialKpi`.

P1–P5 → `promptMode: commercial_state` / categoría `nuevos`.  
P6 → `igf_arr_focused`.  
C1 → `commercial_state` / `aumentaron`.

### B) Runtime real `askDirectorIa`

1. `planDirectorIaQuestion` / `detectDirectorIaIntent` (commercial_trend **antes** que client_profile **antes** que commercial_state).
2. Handlers tempranos: `commercial_trend` (~4373), `client_profile` (~4469), M9 deltas (~5142).
3. Si no hay handler temprano, bloque GPT: `wantFinancialKpi` (~5256) **antes** de `wantCommercialState` (~5290).

El tool plan Fase 3 (`buildDirectorIaToolPlan`) **no gobierna** estos handlers in-process. P2 planea `get_commercial_state` y el runtime entra a IGF.

```
DIRECTOR_COMMERCIAL_STATE_ENGINE = dicf.computeDicf
SAME_ENGINE_DASHBOARD_DIRECTOR = YES
```

`YES` significa: el loader comercial llama el mismo compute. **No** significa que P1–P6 usen ese loader.

## 6. Probe matrix P1–P6

Sondas Node read-only sobre funciones exportadas. Reloj del host: 2026-09-01 → `resolveYearMonthFromQuestion` resuelve agosto 2026. Sin DB. Sin LLM.

| ID | category | isList | movers | trend | client_profile | plant_fin | detect/plan intent | routing helper | **handler askDirectorIa** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | nuevos | true | true | true | true | false | **commercial_trend 0.9** | commercial_state/nuevos | **commercial_trend** |
| P2 | nuevos | true | false | false | false | **true** | **commercial_state 0.92** | commercial_state/nuevos | **igf_arr_focused** |
| P3 | nuevos | true | false | false | **true** | true | **client_profile 0.88** | commercial_state/nuevos | **client_profile** |
| P4 | nuevos | true | true | true | true | false | **commercial_trend 0.9** | commercial_state/nuevos | **commercial_trend** |
| P5 | nuevos | true | true | true | false | false | **commercial_trend 0.9** | commercial_state/nuevos | **commercial_trend** |
| P6 | **null** | false | false | false | false | **true** | **unknown 0.35** | **igf_arr_focused** | **igf_arr_focused** |
| C1 | **aumentaron** | true | true | true | true | false | commercial_trend 0.9 | commercial_state/**aumentaron** | commercial_trend |

Notas físicas:

- `descuento` bloquea `isCommercialTrendQuestion` / `isCommercialMoversQuestion`. Por eso P2/P3 no son trend.
- P1 dispara movers: `/\bnuev[oa]s?\b/ && /\bclientes?\b/` (`lib/director-ia-commercial-trend.js`).
- Test existente `test/director-ia-commercial-movers-additive.test.js` **afirma** que «¿Qué clientes son nuevos?» → `commercial_trend`, **no** `commercial_state`.
- P3: `hasNamedClientToken("Acapulco")` (no está en `NAME_STOP`) + `parseExplicitPeriod(agosto)` → `isClientProfileQuestion`. Planner evalúa client_profile **antes** de commercial_state.
- P6: `resolveCommercialStateCategory` exige `cliente(s)` + `nuev*`. «los nuevos» sin «clientes» → `null`.
- `resolveCommercialTrendSlots` para «agosto» **no** usa mes calendario (`namesCalendarMonth` solo «este mes» / «mes actual»). Default: `range_days=30`, `period_kind=trailing`.
- C1 demuestra que **Nuevos** y **Aumentaron** son categorías distintas en el helper; el runtime de C1 igualmente se va a movers.

```
CATEGORY_ROUTING_P1 = commercial_trend (helper: commercial_state/nuevos)
CATEGORY_ROUTING_P2 = planner commercial_state/nuevos; runtime igf_arr_focused
CATEGORY_ROUTING_P3 = client_profile (helper: commercial_state/nuevos)
CATEGORY_ROUTING_P4 = commercial_trend (helper: commercial_state/nuevos)
CATEGORY_ROUTING_P5 = commercial_trend (helper: commercial_state/nuevos)
CATEGORY_ROUTING_P6 = unknown / igf_arr_focused (category null)
```

## 7. Nuevo classification contract

Fuente: `lib/dicf.js` (motor de la pantalla observada).

```
es_nuevo = ingreso_anterior <= 0 && ingreso_forecast > 0
```

Variables:

| Variable | Semántica física |
| --- | --- |
| `last_date` / `MAX(fecha)` | última venta de la planta en `arr.ventas_diarias_cliente` |
| `periodoMes` | año-mes de `last_date` (no el string «agosto» de la pregunta) |
| A / `kg_mes_anterior` | kg del mes calendario **anterior** a `periodoMes` |
| `ingreso_anterior` | `max(0, kg_mes_anterior * (margenAnterior − \|desc_kg_anterior\|))` |
| `kg_mes_real` | kg del 1 del mes de `last_date` hasta `effectiveLastDate` (capeado a ayer si aplica) |
| `kg_mes_forecast` | `kg_mes_real` si el mes ya cerró (`last_date >= fin de mes`) o sin actividad; si no, `kg_mes_real + extraKg * scale` (`projectKgToMonthEnd`; scale Activo=1 / Latente=0.35 / Inactivo=0.2) |
| `ingreso_forecast` | `max(0, kg_mes_forecast * (margen − \|desc_kg_hist\|))` |
| `desc_kg_hist` | `sum(\|monto\|) / sum(kg)` en ventana `window_days` (default 60; override `arr.dicf_config`) |
| `window_days` | 60 o config por planta/mes |
| Filtros extra | planta vía `prov_map` / `plant_code`; no hay filtro «agosto» textual |

**No** es la fórmula de `computeDeltaIngresoForecast` (`kgA <= 0 && kgB > 0`).  
**No** es la de movers (`previo <= 0 && actual > 0` en 30/90d trailing).  
**No** es la de M9 ingreso (`kgA <= 0 && kgB > 0` en meses calendario reales).

Tooltip UI: «Clientes sin compras el mes anterior y con proyección a cierre este mes». El código clasifica por **ingreso**, no por kg. Un cliente con kg anterior > 0 pero ingreso_anterior=0 (margen − desc) **sí** puede ser Nuevo. No se midió en DB si ocurre.

```
NEW_CLASSIFICATION_FORMULA = ingreso_anterior <= 0 && ingreso_forecast > 0
```

### Inventario de campos (fila Nuevo)

Fixture estructural solo en lectura de `mapCliente` / filas internas. Sin clientes reales hardcodeados.

| FIELD | SOURCE | SEMANTICS | UI_VISIBLE | DIRECTOR_CONTEXT_VISIBLE |
| --- | --- | --- | --- | --- |
| cliente | `nuevos.clientes[]` | nombre normalizado | sí (lista, recorte 15) | sí (recorte 20) |
| canal / subcanal | serie + `arr.cliente_categoria_mes` | canal comercial | sí (tabla byCategoria; lista no imprime canal en el renglón principal) | sí |
| kgA / kgAStr | map fija `"0.0"` | mes anterior; no el kg real interno | no en lista Nuevos | sí como `Ton A: 0.0` |
| kgB / kgBStr | `fmtTon(kg_mes_forecast)` | forecast cierre | implícito vía `deltaKgStr` | sí como `Ton proy` |
| kg_mes_real | fila interna / cache | kg real del mes hasta corte | no en lista | no |
| deltaKgStr | `fmtTon(kg_mes_forecast)` | igual a kgB en Nuevos | sí (`X Ton`) | sí (`Δ ton`) |
| desc_kg_hist | filas internas, `dicfRowsByCliente`, Excel, cache | descuento hist. ventana 60d | no en lista | no |
| desc_kg_anterior / desc_monto_anterior | filas internas | descuento mes A | no | no |
| ingresoAStr | `"$0"` | | no | no (solo Δ ingreso) |
| ingresoBStr / deltaIngresoStr | `fmtMxn(ingreso_forecast)` | ingreso forecast | sí (`ingresoBStr`) | sí (`Δ ingreso`) |
| lastPurchaseDate | MAX fecha con kg>0 (lookback 365) | última compra real | no en renglón lista (usa daysSinceLast) | sí |
| acciones_abiertas | `arr.dicf_acciones` (inyectado) | conteo abiertas | sí si >0 | sí si >0 |
| margen | IGF mes `periodoMes` | $/kg planta | no en lista cliente | sí, margen de planta en header |

## 8. Actual vs forecast semantics

Frase humana «cuánto compraron en agosto» = compra realizada.  
Pantalla: «Proyección a cierre del mes».

Si `last_date < fin de mes` y hay actividad: `kg_mes_forecast = kg_mes_real + extraKg * scale`.  
Si el mes ya cerró: `kg_mes_forecast = kg_mes_real`.

Corte humano 2026-08-30: si `MAX(fecha)` es 2026-08-30, el 31 aún se proyecta. **No** se ejecutó compute contra DB; la semántica del código es ésa.

```
ACTUAL_VS_FORECAST_CONTRACT = DICF_NUEVOS_USES_KG_MES_FORECAST
```

## 9. Purchase metric trace

| Superficie | Campo | Qué es |
| --- | --- | --- |
| PURCHASE_METRIC_UI | `byCategoria[].nuevos.totalDeltaKgStr` y lista `deltaKgStr` / `kgBStr` | `fmtTon(kg_mes_forecast)` |
| PURCHASE_METRIC_DICF | `kg_mes_forecast` | real mes + proyección si mes abierto |
| PURCHASE_METRIC_DIRECTOR | `Ton proy: c.kgBStr` y `Total ton: group.totalDeltaKgStr` | mismo forecast |
| PURCHASE_METRIC_HISTORICAL_REAL | `kg_mes_real` (interno); M9 `kgB` si se usara delta descuento/venta de mes cerrado | no llega a lista/contexto DICF |

```
PURCHASE_METRIC_UI = kg_mes_forecast (fmtTon)
PURCHASE_METRIC_DIRECTOR = kg_mes_forecast (kgBStr / totalDeltaKgStr)
PURCHASE_METRIC_HISTORICAL_REAL = kg_mes_real (interno; no expuesto en lista/contexto)
KG_PER_CLIENT_AVAILABLE_IN_SOURCE = YES (forecast en lista; real solo interno)
CLIENT_LIST_AVAILABLE_IN_SOURCE = YES (sin slice en computeDicf)
```

## 10. Discount metric trace

### `lib/dicf.js`

- Tablas: `arr.descuentos_diarios_cliente` + kg de `arr.ventas_diarias_cliente`.
- `desc_hist = sum(abs(monto diario))` en ventana `window_days`.
- `desc_kg_hist = desc_hist / kg_hist` (signo absorbido con `abs`).
- Periodo: ventana 60d anclada a `last_date`, **no** mes agosto aislado.
- Actual vs forecast: el ratio es histórico de ventana; se aplica tanto a `ingreso_forecast` como a la clasificación. No hay `descKgB` proyectado en el objeto de lista Nuevos.
- Campo final interno: `desc_kg_hist`. En lista Nuevos: **omitido**.

### `lib/delta-ingreso-forecast.js` (otro motor)

- `descKgA = abs(montoA)/kgA`; `descKgB` = proyectado si mes B corriente, si no `abs(descBReal)/kgBReal`.
- No es el motor de la pantalla observada cuando hay `dicfData`.

### `lib/director-ia-m9-deltas.js` `getDeltaDescuentoClientes`

- `montoB = SUM(monto)` mes calendario B; `kgB = SUM(kg)` mes B; `ratioB = montoB/kgB` (sin `abs` en el SQL).
- Periodo: meses A/B explícitos. Actual, no forecast.
- No está cableado a P2 (`delta_discount` exige cambio/variación/delta + descuento).

### Llegada al prompt

`loadCommercialStateForChat` → `computeDicf` → map Nuevos **sin** `desc_kg_hist` → `buildCommercialStateFocusedContext` imprime cliente, canal, subcanal, Δ ingreso, Δ ton, Ton A, Ton proy, última compra, acciones. **No** descuento.

```
DISCOUNT_PER_CLIENT_AVAILABLE_IN_SOURCE = YES
DISCOUNT_SOURCE_FIELD = desc_kg_hist
DISCOUNT_EXPOSED_TO_DIRECTOR_CONTEXT = NO
DISCOUNT_DROPPED_AT = computeDicf:nuevos.mapCliente + buildCommercialStateFocusedContext
```

Primera omisión de payload de lista: `lib/dicf.js` ~626–642.  
Segunda omisión de contexto (aunque el campo existiera): `lib/director-ia-commercial-state.js` ~323–335.

## 11. Margin vs discount trace

`PLANT_FINANCIAL_KPI_RE` incluye `descuento(s)` y `descuento $/kg` (`lib/director-ia-igf-arr.js`).

En `askDirectorIa` (~5256) `wantFinancialKpi` gana a `wantCommercialState`.

`loadIgfArrAnnexForChat`:

- `wantMargen = /margen/ OR isPlantFinancialKpiQuestion` → P2 true.
- Emite bloque obligatorio `COMPARACION MARGEN $/kg` (IGF mes vs mes previo) + instrucción de verbalizar primero esos tres renglones.
- `wantCommercial` también puede ser true (P2 contiene `clientes` y no la palabra `margen`) → `formatCommercialTotalsBlock`: `NUEVOS: N clientes | Δ ton | Δ ingreso` **sin nombres**.

```
MARGIN_INJECTION_PATH = isPlantFinancialKpiQuestion(descuento) → askDirectorIa wantFinancialKpi@5256 → loadIgfArrAnnexForChat → COMPARACION MARGEN $/kg
MARGIN_VS_DISCOUNT_CONFUSION_CAUSAL = YES (P2)
```

P2 **no** se desvía a M9 `delta_discount`.

## 12. Aggregate trace

`computeDicf` `build()`:

- `clientes` = **todos** los que pasan `es_nuevo` (sin `.slice`).
- `totalDeltaKgStr` = `fmtTon(sum(kg_mes_forecast))` del grupo completo.
- `totalDeltaIngresoStr` = `fmtMxn(sum(ingreso_forecast))` del grupo completo.

`byCategoria[].nuevos`: mismos sumatorios **por** canal/subcanal, cada uno pasado por `fmtTon` / `fmtMxn`.

UI header «Total impacto» de Nuevos: **re-suma** los strings MXN de cada subcanal (`parseMxn` + `fmtSum`).

Director `formatCommercialTotalsBlock` y header de focused context usan los totales del grupo **completo**, no la lista recortada.

```
AGGREGATE_ONLY_PATH_FIRST_DIVERGENCE = P2 igf_arr_focused + formatCommercialTotalsBlock (count+ton+ingreso, sin lista)
```

Esto explica «66 clientes / 15.4 t / $108,482» sin enumerar quiénes, **si** el runtime cargó DICF dentro del anexo IGF. No se reprodujo el payload live.

## 13. 15.4 vs 15.5

Mecanismo físico demostrado en código:

- Director / `nuevos.totalDeltaKgStr` = `fmtTon(suma cruda kg)` → 1 decimal.
- UI visible por bloques = suma de `fmtTon` **ya redondeados** por subcanal.

Ejemplo estructural (no es el raw de Acapulco): kg `[13200, 1350, 0, 400, 450]` → celdas `13.2+1.4+0.0+0.4+0.5 = 15.5`; `fmtTon(15400) = 15.4`.

Clase: `AGGREGATE_ROUNDING_DIFFERENCE` (mecanismo).  
Raw de producción: `NOT_PROVEN`.  
No se declara que 15.5 sea la verdad.  
Otras clases (corte, motor distinto) **no** se afirmaron para este síntoma.

```
TONNAGE_15_4_VS_15_5_EXPLANATION = AGGREGATE_ROUNDING_DIFFERENCE_MECHANISM; RAW_CANONICAL_TON=NOT_PROVEN
```

## 14. Context/list truncation

| Capa | Límite | Evidencia |
| --- | --- | --- |
| `computeDicf` `nuevos.clientes` | ninguno | `candidatos.map(mapCliente)` |
| UI dashboard lista | **15** + «… y más» | `page.tsx` `.slice(0, 15)` |
| Director focused context | **20** | `COMMERCIAL_STATE_CLIENT_LIMIT = 20`; `clientes.slice(0, 20)`; header `top N` |
| Totales en context/IGF | grupo completo | `totalDeltaIngresoStr` / `totalDeltaKgStr` no se recalculan tras el slice |

Si source tiene 66 y se alcanza `buildCommercialStateFocusedContext`: prompt máximo 20 nombres + totales del 66.

```
CLIENT_LIST_CONTEXT_LIMIT = 20
ALL_66_CAN_REACH_CURRENT_CONTEXT = NO
CONTEXT_TRUNCATION = PROVEN (constante + slice; N=66 es observational)
```

`filterClientsByCommercialResolution`: si hay `search_tokens` y hay match, filtra; si no hay match, **devuelve la lista original** (no vacía).

## 15. False-zero path

Frase exacta **ausente** en source.

```
FALSE_ZERO_NEW_PATH = NOT_REPRODUCED
```

Fronteras **capaces** de omitir Nuevos DICF o de verbalizar un conjunto vacío distinto (causalidad de la frase humana = no afirmada):

1. P1/P4/P5 → `commercial_trend`: movers `selectTopMovers` top-6 por `\|delta\|`; `tipo=nuevo` usa ventanas trailing 30d, no DICF. El top-6 puede no contener ningún `nuevo` y sí aumentaron/disminuyeron/perdidos.
2. P6 → IGF sin categoría Nuevos.
3. P3 → `client_profile` (Acapulco como token de cliente).
4. Fallback `resolveCommercialStateCategory(q) \|\| "dejaron"` (~5291) si alguien llega a commercial_state con category null (P6 no llega).
5. `computeDicf` sin `maxFecha` → `nuevos.clientes = []`.
6. Texto de context vacío: `(sin clientes en esta categoría…)` — **no** es la frase humana.
7. Narrativa LLM sobre pack de movers/IGF.

```
FALSE_ZERO_NEW_FIRST_DIVERGENCE = NOT_PROVEN (frase exacta); first capable frontier = commercial_trend movers vs DICF nuevos (P1-like)
```

## 16. M9 relevance

`getDeltaDescuentoClientes` produce, para meses calendario A/B reales:

- `cliente`
- `kgB` = SUM(kg) mes B
- `montoB` = SUM(monto) mes B
- `ratioB` = `montoB / kgB`

Eso **sí** es evidencia útil para «cuánto compró y con qué descuento» en un mes histórico **cerrado**.

No está cableado a P1–P6.

Definición M9 de nuevo (motor ingreso, no el loader de descuento): `kgA <= 0 && kgB > 0` sobre kg mensuales reales. **Distinta** de DICF `es_nuevo`.

```
M9_ACTUAL_DISCOUNT_RELEVANCE = YES
```

YES = el loader histórico existe y expone kg + ratio. No implica integración ni equivalencia de «nuevo».

## 17. Tests

Ejecutados (existentes, sin modificar):

| Archivo | Resultado |
| --- | --- |
| `test/director-ia-commercial-movers-additive.test.js` | pass |
| `test/director-ia-commercial-trend.test.js` | pass |
| `test/director-ia-m9-deltas.test.js` | pass |
| `test/director-ia-m7-igf-composition.test.js` | pass |
| **Total** | **77 pass / 0 fail** |

Cubierto:

- «¿Qué clientes son nuevos?» → `commercial_trend`, **no** `commercial_state` (contrato de movers).
- Trend 30/90, top-6, no phrasebook.
- M9 delta descuento/venta/ingreso (cambio/variación), no P2.
- Composición IGF, no descuento-por-Nuevo.

No existe:

- test de `commercial_state` / `computeDicf` / P2 exacto
- test de descuento por cliente Nuevo
- test de más de 20 Nuevos / truncamiento
- test de `dicf.js` clasificación `es_nuevo`
- test de que `descuento` robe commercial_state hacia IGF

No hay `test/*dicf*` ni `test/*commercial-state*`.

```
CURRENT_TEST_COVERAGE = movers/trend/M9/IGF-composition; NO P2; NO discount-per-nuevo; NO >20 nuevos
```

## 18. First divergence by symptom

### SYMPTOM_A — «no hay clientes nuevos»

- FIRST_DIVERGENCE = handler `commercial_trend` / `client_profile` / IGF (P6) en lugar de lista DICF Nuevos
- EVIDENCE = matriz §6; movers `tipo=nuevo` ≠ `es_nuevo`; frase exacta no en source
- CAUSAL_STATUS = capable path PROVEN; utterance exacta NOT_REPRODUCED

### SYMPTOM_B — «sé que hay 66 pero no digo quiénes»

- FIRST_DIVERGENCE = `formatCommercialTotalsBlock` (P2 IGF) y/o `slice(0,20)` si se alcanza focused context
- EVIDENCE = IGF totals sin nombres; `COMMERCIAL_STATE_CLIENT_LIMIT=20`; totales del grupo completo
- CAUSAL_STATUS = PROVEN para el mecanismo; 66 observational

### SYMPTOM_C — «no entrego descuento»

- FIRST_DIVERGENCE = `computeDicf` map Nuevos omite `desc_kg_hist`; context no lo imprime
- EVIDENCE = §§7 y 10
- CAUSAL_STATUS = PROVEN

### SYMPTOM_D — «muestro margen cuando pidieron descuento»

- FIRST_DIVERGENCE = `isPlantFinancialKpiQuestion` + `wantFinancialKpi` antes de commercial_state
- EVIDENCE = `COMPARACION MARGEN $/kg`; P2 probe
- CAUSAL_STATUS = PROVEN

### SYMPTOM_E — «15.4 vs visible ~15.5»

- FIRST_DIVERGENCE = `fmtTon(suma)` vs suma de `fmtTon` por subcanal
- EVIDENCE = `lib/dicf.js` `fmtTon` + `byCategoria` + UI
- CAUSAL_STATUS = mechanism PROVEN; raw NOT_PROVEN

## 19. Root cause classes

Demostradas:

- `CATEGORY_ROUTING_DIVERGENCE`
- `CONTEXT_TRUNCATION`
- `PAYLOAD_FIELD_OMISSION`
- `CONTEXT_FIELD_OMISSION`
- `ACTUAL_VS_FORECAST_SEMANTIC_GAP`
- `MARGIN_VS_DISCOUNT_CONFUSION`
- `AGGREGATE_ROUNDING_DIFFERENCE` (mecanismo; raw no canónico)
- `PERIOD_SEMANTIC_DIVERGENCE` (pregunta «agosto» vs `periodoMes=mes(MAX(fecha))` en DICF; vs trailing 30d en movers)
- `SOURCE_ENGINE_DIVERGENCE` (DICF vs movers vs M9 vs `computeDeltaIngresoForecast`; **no** dashboard vs commercial_state loader)
- `LLM_NARRATIVE_DIVERGENCE` (false-zero frase exacta NOT_REPRODUCED)

No usadas: `NO_DIVERGENCE`.

## 20. Implementation readiness WITHOUT implementation

Una implementación futura (no autorizada aquí) tendría que decidir, con gate humano, al menos:

1. Qué router manda: helper vs `askDirectorIa` vs planner.
2. Si P1-like debe seguir siendo movers (el test actual lo exige) o DICF Nuevos.
3. Si «cuánto compraron» usa `kg_mes_forecast`, `kg_mes_real` o M9 `kgB` de mes cerrado.
4. Si el descuento es `desc_kg_hist` (ventana 60d), `desc_kg_anterior`, o M9 `ratioB` de agosto.
5. Si «Nuevo» es DICF ingreso, kg DICF, movers trailing, o M9 kg mensual.
6. Si el límite 20 se mantiene (no cambiarlo sin tarea).
7. Cómo separar `descuento` de KPI de margen de planta.

Nada de eso se implementó. `implementation_authorized: NO`.

## 21. OUT_OF_SCOPE

- Implementar, parchear, añadir tests, cambiar el límite 20.
- Merge, deploy, push a `main`, siguiente tarea.
- DB writes / migrations / SELECT live (`LIVE_DB_VALIDATION = NOT_RUN`).
- Tratar 66 / 108482 / 15.4 / 15.5 como constantes de runtime.
- Declarar equivalencia del render de producción con este SHA.
- Rediseñar M9 o cablearlo.
- Compound-client / leading-Y / parser de identidad (tarea previa, otra rama).
- Usar Fases 1–3 / chat legado como pipeline constitucional N1–N5.
- Afirmar que `computeDicf` ≡ `computeDeltaIngresoForecast`.
- Reproducir la frase false-zero con LLM.
- Inventar el kg crudo de Acapulco.

```
OUT_OF_SCOPE_FINDINGS = live DB not run; production SHA equivalence unknown; false-zero phrase not in source; delta-ingreso-forecast is a different engine; M9 not wired; UI list cap 15 is dashboard-only
```

## 22. Final fields

```
AUDIT_STATUS = DONE_PENDING_REVIEW
BASE_MAIN_SHA = 382003789e51f7aca5ace46cd29a4fa0d0c9d2df
DASHBOARD_ENGINE = dicf.computeDicf
DASHBOARD_ENDPOINT = POST /api/dashboard/dicf-datos
DASHBOARD_SOURCE_TABLES = arr.ventas_diarias_cliente, arr.descuentos_diarios_cliente, arr.cliente_categoria_mes, arr.dicf_config, public.plantas, arr.provincia_plants; cache arr.dicf_cliente_mes; margen IGF
DIRECTOR_COMMERCIAL_STATE_ENGINE = dicf.computeDicf
SAME_ENGINE_DASHBOARD_DIRECTOR = YES
NEW_CLASSIFICATION_FORMULA = ingreso_anterior <= 0 && ingreso_forecast > 0
NEW_CLIENT_COUNT_UI_CONTROL = 66_OBSERVATIONAL
NEW_CLIENT_INCOME_UI_CONTROL = 108482_OBSERVATIONAL
VISIBLE_BUCKET_TON_SUM = APPROX_15_5_OBSERVATIONAL
DIRECTOR_REPORTED_TON = 15_4_OBSERVATIONAL
RAW_CANONICAL_TON = NOT_PROVEN
ACTUAL_VS_FORECAST_CONTRACT = DICF_NUEVOS_USES_KG_MES_FORECAST
PURCHASE_METRIC_UI = kg_mes_forecast (fmtTon)
PURCHASE_METRIC_DIRECTOR = kg_mes_forecast (kgBStr / totalDeltaKgStr)
PURCHASE_METRIC_HISTORICAL_REAL = kg_mes_real (internal only; not in list/context)
KG_PER_CLIENT_AVAILABLE_IN_SOURCE = YES
CLIENT_LIST_AVAILABLE_IN_SOURCE = YES
CLIENT_LIST_CONTEXT_LIMIT = 20
ALL_66_CAN_REACH_CURRENT_CONTEXT = NO
DISCOUNT_PER_CLIENT_AVAILABLE_IN_SOURCE = YES
DISCOUNT_SOURCE_FIELD = desc_kg_hist
DISCOUNT_EXPOSED_TO_DIRECTOR_CONTEXT = NO
DISCOUNT_DROPPED_AT = computeDicf:nuevos.mapCliente + buildCommercialStateFocusedContext
CATEGORY_ROUTING_P1 = commercial_trend (helper: commercial_state/nuevos)
CATEGORY_ROUTING_P2 = planner commercial_state/nuevos; runtime igf_arr_focused
CATEGORY_ROUTING_P3 = client_profile (helper: commercial_state/nuevos)
CATEGORY_ROUTING_P4 = commercial_trend (helper: commercial_state/nuevos)
CATEGORY_ROUTING_P5 = commercial_trend (helper: commercial_state/nuevos)
CATEGORY_ROUTING_P6 = unknown / igf_arr_focused (category null)
FALSE_ZERO_NEW_PATH = NOT_REPRODUCED
FALSE_ZERO_NEW_FIRST_DIVERGENCE = NOT_PROVEN (exact phrase); capable frontier commercial_trend movers vs DICF
AGGREGATE_ONLY_PATH_FIRST_DIVERGENCE = P2 igf_arr_focused + formatCommercialTotalsBlock
MARGIN_INJECTION_PATH = isPlantFinancialKpiQuestion(descuento) → wantFinancialKpi@5256 → COMPARACION MARGEN $/kg
MARGIN_VS_DISCOUNT_CONFUSION_CAUSAL = YES
M9_ACTUAL_DISCOUNT_RELEVANCE = YES
TONNAGE_15_4_VS_15_5_EXPLANATION = AGGREGATE_ROUNDING_DIFFERENCE mechanism; raw NOT_PROVEN
ROOT_CAUSE_CLASSES = CATEGORY_ROUTING_DIVERGENCE, CONTEXT_TRUNCATION, PAYLOAD_FIELD_OMISSION, CONTEXT_FIELD_OMISSION, ACTUAL_VS_FORECAST_SEMANTIC_GAP, MARGIN_VS_DISCOUNT_CONFUSION, AGGREGATE_ROUNDING_DIFFERENCE, PERIOD_SEMANTIC_DIVERGENCE, SOURCE_ENGINE_DIVERGENCE, LLM_NARRATIVE_DIVERGENCE
CURRENT_TEST_COVERAGE = movers/trend/M9/IGF-composition pass 77; no P2; no discount-per-nuevo; no >20 nuevos
LIVE_DB_VALIDATION = NOT_RUN
INTRODUCING_COMMIT = 7bb8a29c1549e31488f5813eec7c211ecc2e6c31
SOURCE_CODE_CHANGED = NO
TEST_CODE_CHANGED = NO
IMPLEMENTATION_AUTHORIZED = NO
MERGE_AUTHORIZED = NO
DEPLOY_AUTHORIZED = NO
RENDER_SHA_EQUIVALENCE = NOT_PROVEN
OUT_OF_SCOPE_FINDINGS = live DB not run; production SHA equivalence unknown; false-zero phrase not in source; delta-ingreso-forecast is a different engine; M9 not wired; UI list cap 15 is dashboard-only
```

## Human review / closure

HUMAN_REVIEW = APPROVED
AUDIT_ACCEPTED = YES
MERGE_AUTHORIZED = YES
NEXT_IMPLEMENTATION_AUTHORIZED = YES
CLOSED_BY_HUMAN = YES

Human review accepts the demonstrated audit findings, including:

- routing divergence across P1-P6;
- commercial_state helper/runtime mismatch;
- 66-to-20 commercial-state context truncation;
- per-client discount available in source but omitted from Director IA context;
- margin-vs-discount collision caused by financial KPI routing;
- historical-actual vs DICF forecast semantic distinction;
- M9 as physically relevant evidence for closed-month kg and discount;
- false-zero path not reproduced;
- Render/runtime equivalence remains NOT_PROVEN.

The observational forecast controls from the 2026-08-30 screenshot are not mandated
as the final historical closed-month result.

No production deployment is authorized by this closure.
