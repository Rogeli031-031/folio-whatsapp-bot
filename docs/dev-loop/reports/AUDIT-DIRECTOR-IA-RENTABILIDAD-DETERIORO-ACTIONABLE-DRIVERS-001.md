# AUDIT-DIRECTOR-IA-RENTABILIDAD-DETERIORO-ACTIONABLE-DRIVERS-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-RENTABILIDAD-DETERIORO-ACTIONABLE-DRIVERS-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READ_ONLY_PHYSICAL_TRACE"
implementation: false
docs_director_ia_changed: false
live_db: false
live_db_authorized: false
selects_executed: 0
writes_executed: 0
ddl_executed: 0
product_changed: false
tests_changed: false
contracts_changed: false
routing_first_bad_boundary: "PLANNER"
data_first_bad_boundary: "DELTA_EXPENSE_SOURCE"
attribution_first_bad_boundary: "DRIVER_ATTRIBUTION_METHOD"
actionability_first_bad_boundary: "CONTROLABILITY_CONTRACT"
recommended_next_fix: "FIX-DIRECTOR-IA-RENTABILIDAD-DETERIORO-ROUTING-SNAPSHOT-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
  - docs/dev-loop/reports/FIX-DIRECTOR-IA-CLIENTES-POR-MES-TARGET-PROY-PARITY-001.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CLIENTES-POR-MES-RUNTIME-CUT-PARITY-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task."
  - "El siguiente FIX propuesto no está autorizado."
  - "No elegir método de atribución (Shapley vs sustitución secuencial) sin Gate humano."
```

## 1. Executive summary

La pregunta exacta cae en `unknown` porque `detectDirectorIaIntent` no tiene regla para «provocando / deterioro / rentabilidad / actuar». CEL no la clasifica: `isCauseQuestion` exige `por que`; `CAUSE_EXPLANATION` existe pero `implemented: false`.

«Rentabilidad operativa» = `util_oper_importe` (MXN). «Rentabilidad final» = `resultado_final_importe` (MXN). Son KPIs distintos. En ARR, «rentabilidad» alias = resultado final.

No existe bridge físico `Δrentabilidad = Δingreso − Δgastos`. No existe producto «Delta Gastos».

`SUM(delta_ingreso cliente)` **no** reconcilia 1:1 con el INGRESO mini IGF: fórmulas distintas (HG signo/rol, `com_desc` planta vs `|descKg|` cliente, proyección, redondeo).

Los drivers kg / desc / margen / HG están AVAILABLE. Su contribución MXN conjunta REQUIRES_ATTRIBUTION_METHOD: la fórmula es multiplicativa; no hay helper Shapley/waterfall/OAT.

No hay contrato runtime de controlabilidad. Comentarios = contexto, no causa. Action Register no tiene `cliente_key`.

Arquitectura segura: mostrar KPIs existentes + Delta Ingreso ya validado; fail-closed en gastos, atribución, accionabilidad y causalidad. No inventar fórmulas.

## 2. Exact-question routing trace

Pregunta:

`¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?`

```
askDirectorIa
  → detectDirectorIaIntent          lib/director-ia-planner.js
  → planDirectorIaQuestion
  → resolveExecutiveNeed            lib/director-ia-conversational-executive-layer.js
  → shouldHandleExecutiveStatus
  → unknown && !inherit
  → buildUnknownClarificationResult lib/director-ia-conversation-state.js:1438
```

| Capa | Resultado | Por qué |
|---|---|---|
| `financial_diagnosis` | no | exige `por que`+caída+`ingreso\|margen\|utilidad`, o `diagnostico financiero`, o `margen`+`como va`. Tiene «deterioro»/«rentabilidad», no esos tokens. |
| `delta_income` forecast | no | `isDeltaIngresoForecastQuestion` exige `\bingreso\b` **y** `\bdeterior/` **y** periodo nombrado. |
| `plant_diagnosis` | no | exige «cómo va la planta» / diagnóstico planta. |
| `historical_margin` | no | `namesMargin()` = `\bmargen\b` solamente. |
| `expense_analysis` / `investment_analysis` | no | exigen gastos/inversiones + folios. |
| CEL `EXECUTIVE_STATUS` | no | `hasExecutiveStatusCue` = `como va` / `que esta pasando`. Ausente. |
| CEL `CAUSE_EXPLANATION` | stub | `isCauseQuestion` = `^(por que\|porque\|y eso por que\|a que se debe)`. `implemented: false` (`later_slice`). |

**Fallo físico:** `lib/director-ia-planner.js` `detectDirectorIaIntent` L757–760:

```text
makeIntent("unknown", [{ value: "no_rule_matched" }], 0.35,
  clarification_reason: "No se pudo determinar una intención clara con las reglas actuales")
```

Gate: `lib/director-ia-chat.js` L4076: `intent === "unknown" && !continuityTurn.inherit`.

Respuesta: el texto LIVE citado en CURRENT_TASK.

**Recomendación de routing (no implementar):** reutilizar el **label** `financial_diagnosis` o implementar CEL `CAUSE_EXPLANATION`. No un tercer intent solo de clasificación. El handler actual de `financial_diagnosis` **no** puede gobernar la respuesta completa: usa M9 (sin HG), prohíbe causalidad, no unifica operativa/final/gastos.

Opción C (intent ejecutivo nuevo) solo si el pack de evidencia es nuevo. Hoy la brecha de routing es PLANNER; la brecha de respuesta es DATA + ATTRIBUTION.

## 3. Rentabilidad operativa — cadena física

Nombre de negocio en UI: **Util. Operación − Importe**. No el alias «rentabilidad» de ARR.

```
IgfForecastClient / mini
  → GET /api/dashboard/igf-forecast-mini  (server.js ~12105)
  → computeIgfForecastMiniPayload         (server.js ~11852)
  → recalcularUtilYResultado              (server.js ~12319)
```

Tabla: `igf.compromiso_lines` vía `igf.versions` GLOBAL `ORDER BY version_number DESC` (`resolveIgfGlobalVersion`). **No filtra `financial_state`.**

Fórmula `$/kg` (`recalcularUtilYResultado`):

```
util_oper_kg =
  margen_kg + com_desc_kg + deposito_cierre_kg
  − presupuesto_kg − folios_aprob_zp_kg − folios_carro_kg
  − impuesto_kg − hg_kg − bancos_planta_kg − provision_planta_kg
```

MXN: `util_oper_kg × venta_ton × 1000` si venta > 0; si no, 0.

Mini autoritativo (chat):

```
INGRESO     = (margen + com_desc − hg_kg) × ventaTon × 1000
OPERATIVOS  = (gasto_kg + bancos_planta + provision + impuesto) × ventaTon × 1000  [escala]
utilOperImporte = INGRESO − OPERATIVOS
```

Unidad: `$/kg` + MXN. Mes abierto: venta/com_desc = **PROY** (`loadProyVentaDescByPlantForIgf`). Mes cerrado: venta real. Null en recálculo → 0. Mini: `Math.round`. ACTUAL_FINANCIAL lee persistido FINAL **sin** recálculo.

Pack Director IA: `lib/director-ia-authoritative-forecast-run-pack.js` `utilidad_operativa`.

## 4. Rentabilidad final — cadena física

Nombre: **Resultado Final − Importe**. En `ArrClient.tsx` L364–414 / L488–502, `rentabilidadImporte` = `miniRow.resultadoFinalImporte ?? forecastRow.resultado_final_importe`.

Misma versión IGF, misma run_identity / `upload_day`.

```
resultado_final_kg = util_oper_kg
  − gtos_apoyos_corp_kg − bancos_corp_kg − otros_programas_kg − inversiones_kg
resultado_final_importe = resultado_final_kg × venta_ton × 1000
```

Mini: `resultadoFinalImporte = utilOperImporte − corporativos`.

**Son dos KPIs distintos.** Final añade cuatro cargos corporativos (incl. inversiones). Forecast: sí (mini). FINAL persistido: sí, otra lectura (`loadFinancialActualEvidence`). No asumir `final = operativa − X` fuera de esas cuatro restas.

## 5. Semántica temporal

Standalone: **no nombra mes ni planta.**

Seguro, si hay `planta_id` de sesión/dashboard:

- B = mes calendario abierto → `FORECAST_PROJECTION` (PROY + overlay `upload_day` / last-upload).
- A = mes calendario anterior cerrado → venta real / IGF latest de ese mes.

Hoy 2026-09-05: B = septiembre forecast; A = agosto cerrado. **No inventado:** `isIgfMesCerradoPorCorte` / `mesHistorico`.

Requiere aclaración si:

- no hay planta en el request;
- el usuario nombra otro mes;
- hay más de un `upload_day` y el body no lo trae (last-upload del mes, no plant-aware para ARR log).

No usar `MAX(fecha)` ARR como periodo de rentabilidad.

## 6. Profitability bridge

**No existe.**

Búsqueda: 0 `Shapley` / `waterfall` / `profitability bridge` en `lib/`. `igf-kpi-ui.ts` solo identidades **intra-periodo** (`operativos = ingreso − utilOper`; `corporativos = utilOper − resultadoFinal`). `IgfForecastClient` compara columnas mes vs mes (`valor_F − valor_A`); no cierra `Δresultado = Δingreso − Δgasto`.

M9 / Delta Ingreso = impacto en **ingreso cliente**, no en util/resultado. Golden: «No es rentabilidad final».

La ecuación del North Star **no es contrato**. Declararla sería fórmula nueva (fuera de alcance).

## 7. Delta Ingreso — cadena física

Fuente ya aceptada (no reabrir):

```
computeDeltaIngresoClientesPorMes
  → defaultLoadIgfPlantMetrics (margen/HG/version crudos)
  → resolveEffectiveIgfTarget (PROY B abierto)
  → computeClientesDescuentoMes A hist / B + targetKgOverride
  → ingresoClienteMarginal(kg, descKg, metrics)
  → Δ = B − A; filter Δ<0; sort; Top N
  → comments después
```

```
ingreso = round( kg × (margen − |descKg|) + (hgDisplay × kg × hgDinero) / 100 )
```

`hgDisplay = hg_pct × 100`; `hgDinero = |hg_kg / hg_pct|`.

## 8. Reconciliación de ingreso

**¿SUM(delta_ingreso cliente) = componente INGRESO de rentabilidad de planta? → NO 1:1.**

| | Cliente (CDM) | Planta mini INGRESO |
|---|---|---|
| Fórmula | `kg×(margen−\|desc\|) + HG_term` | `(margen + com_desc − hg_kg)×ventaTon×1000` |
| Descuento | `descKg` ARR por cliente | `com_desc_kg` IGF planta |
| HG | **suma** `kg × \|hg_kg\|` (si pct>0) | **resta** `hg_kg` |
| Scope | clientes con fila ARR | `venta_ton` planta (PROY B) |
| Redondeo | `Math.round` por cliente | `Math.round` planta |

Residuales físicos: fórmula, HG rol/signo, desc vs com_desc, proyección `kgProy`, clientes sin kg (`null`→0), otros P&L (operativos/corp) que ni siquiera están en «INGRESO».

Magnitud LIVE del residual: `NOT_PROVEN_WITHOUT_LIVE_DB`.

`financial_diagnosis` usa **otra** aritmética M9 (`kg×(margen−desc)` **sin HG**). Tercera vía: `computeDeltaIngresoForecast` OLS. No fusionar.

## 9. Delta Gastos — cadena física

**No existe** módulo/intent/endpoint `delta-gasto*`. 0 coincidencias.

| Fuente | Qué es | ¿A/B/delta/Top? | ¿Chat? |
|---|---|---|---|
| IGF `gasto_kg` | rollup $/kg = presupuesto+folios ZP+carro+depósito; `formula_role: none` (no entra solo a utilidad) | snapshot 1 mes | sí (composición) |
| Subcomponentes IGF | restan en `util_oper_kg` por partida | snapshot | sí |
| Corp + inversiones | restan en **final**, no en `gasto_kg` | snapshot | sí |
| M6 `expense_analysis` | folios GASTOS MXN, 1 rango | listado ≤40; no delta | sí |
| M4 clasificación | GASTOS/INV/TALLER MXN A vs B | delta familia, no Top concepto | sí |
| `presupuesto-comparar` | MXN cat/subcat A vs B | sí, **no** tool chat | no |
| M18 semanal | carro semanal | no mensual IGF | sí (otro scope) |
| reviewable supports | contrafactual 1 mes | no temporal | sí |

Utilidad resta componentes individuales, no `gasto_kg`. Unidades IGF `$/kg` vs M6/M4 MXN. Filtros folio distintos.

**No** se puede hoy: «estos 5 gastos deterioran X pesos de rentabilidad» de forma trazable.

## 10. Reconciliación de gastos

**¿SUM(delta gastos detallados) = componente gasto de rentabilidad? → NO.**

No hay delta temporal IGF. Residual: unidades, `gasto_kg` informativo vs restas individuales, inversiones/corp fuera de `gasto_kg`, presupuesto vs folios, exclusiones SQL IGF vs M6, TALLER en M4, extraordinarios sin línea.

No afirmar «estos gastos explican X pesos».

## 11. Contribuyentes de ingreso

AVAILABLE vía `computeDeltaIngresoClientesPorMes`: universo, negativos, sort, Top N, suma Top N. Identidad `normCliente`. No hardcodear LIVE.

No son contribuyentes de **rentabilidad**; son de **ingreso marginal cliente**.

## 12. Contribuyentes de gasto

NO AVAILABLE como ranking de deterioro. Lo más cercano: 4 subtotales IGF `$/kg` o listado M6 MXN. Fail-closed.

## 13. Mapa de inputs económicos (ingreso)

| Input | Source | Nivel | Clasificación |
|---|---|---|---|
| kg A | `arr.ventas_diarias_cliente` SUM calendario | cliente | AVAILABLE |
| kg B | real si cerrado; `kgProy` si abierto | cliente | AVAILABLE |
| descKg | `SUM(monto)/SUM(kg)` ARR | cliente | AVAILABLE |
| margenKg | `igf.compromiso_lines.margen_kg` latest | planta | AVAILABLE |
| HG | `hg_pct`, `hg_kg` misma línea | planta | AVAILABLE |
| targetKg B | PROY efectivo | planta | AVAILABLE |
| contribución MXN aislada | — | — | REQUIRES_ATTRIBUTION_METHOD |

Tener columna ≠ atribuir MXN.

## 14. Búsqueda de decomposition

| Helper | Qué hace | ¿Ingreso kg/desc/margen/HG? |
|---|---|---|
| `decompose` daily-deviation | kg vs referencia | no |
| daily-discount contrib | ratio descuento | no |
| commercial-trend OLS | ton | no |
| M9 / OLS forecast | ingreso **sin HG** | no |
| CEL `first_slice_bridge` | canal OLS | no |

**No hay** Shapley / waterfall / sequential substitution / OAT para Delta Ingreso MXN.

## 15. Interacciones / aditividad

PROVEN: la fórmula es **no separable**.

- `kg × (margen − |desc|)`: interacciones kg×margen y kg×desc.
- `(hg × kg × hgDin) / 100`: producto.
- `Math.round` por fila.

OAT vs A: `Σ efectos aislados ≠ Δ total`. Residual = interacciones.

## 16. Comparación de métodos (sin elegir)

| Método | Aditividad exacta | Orden | Residual | Interpretabilidad | Costo | Idoneidad ejecutiva |
|---|---|---|---|---|---|---|
| OAT vs baseline A | NO | no | interacciones | alta («si solo cambiara kg») | bajo | **no** cierra el Δ |
| Sustitución secuencial | SÍ (telescopio) | **depende** | solo redondeo | media | bajo | hay que fijar orden por Gate |
| Shapley (promedio de órdenes) | SÍ | independiente | redondeo | «reparto justo»; menos intuitivo | 24 órdenes / 4 factores | defendible; no está en código |
| LMDI / log | condicional | — | ceros | baja | medio | no encaja kg=0 |

**No se elige método.** Cualquier implementación futura requiere Gate humano. Hasta entonces: fail-closed.

## 17. Volumen

`kgA`, `kgB`, `Δkg` AVAILABLE. Movimiento de kg ≠ contribución MXN. CAN_QUANTIFY_CONTRIBUTION solo con método.

## 18. Descuento

`descKgA/B` AVAILABLE, unidad $/kg, `Math.abs` en ingreso. Métrica de **cliente**. No es «margen del cliente». Contribución MXN: REQUIRES_ATTRIBUTION_METHOD.

## 19. Margen

`margen_kg` IGF planta, misma latest version A/B por mes, `financial_state` no filtrado en GET forecast. Aplica **igual a todos** los clientes del mes. No es problema del cliente. Contribución MXN: REQUIRES_ATTRIBUTION_METHOD.

## 20. HG

| | |
|---|---|
| Tabla | `igf.compromiso_lines` (`hg_pct`, `hg_kg`) |
| Display | `hg_pct × 100` (%) |
| `hgDinero` | `\|hg_kg / hg_pct\|` |
| En ingreso cliente | **+** `(hgDisplay × kg × hgDinero) / 100` |
| En utilidad planta | **−** `hg_kg` |
| En mini INGRESO | **−** `hg_kg` |
| Agregación | planta; mismo valor para todos |

Controlabilidad HG: **UNKNOWN** (sin contrato). No caja negra: la fórmula está; el **significado de negocio accionable** no.

## 21. Matriz de controlabilidad

0 matches en `lib/*.js` de `DIRECTAMENTE_ACCIONABLE` / `INFLUENCIABLE` / `controlabil` / `accionable`.

| Driver | Evidencia física de clase | Clase runtime |
|---|---|---|
| kg cliente | hecho ARR | UNKNOWN |
| desc cliente | hecho ARR | UNKNOWN |
| margen planta | IGF planta | UNKNOWN (nivel planta observable; no contrato) |
| HG | IGF planta | UNKNOWN |
| gasto discrecional / contractual | no clasificado | UNKNOWN |

Cualquier etiqueta hoy sería política inventada.

## 22. Comentarios / contexto

`arr.cliente_comentarios` (`lib/cliente-comentarios.js`): join `planta_id + cliente_key`; fallback nombre+canal+subcanal. Chat Delta Ingreso: `loadRecentCommentsByClienteNombres` **después** del ranking; **no** filtra ventana del Δ.

Prompts ya prohíben comentario-como-causa (`financial_diagnosis` addendum; golden R-DELTA-INCOME-007).

Separación: HECHO / DRIVER / CONTEXTO / CAUSA.

## 23. Ejemplo 20 CUMBRES (semántico, no LIVE)

- HECHO: kg A vs kg B si CDM lo prueba.
- DRIVER: presión de volumen sobre ingreso **solo** si hay método de atribución; si no, «kg cambió» es hecho, no «causó $X».
- CONTEXTO: comentario tipo «FALLO LA LUZ Y LA BOMBA...» si el join de key acierta.
- CAUSA «la bomba causó $X»: **UNKNOWN**.

## 24. Ejemplo GRUPO MOVE (semántico, no LIVE)

- HECHO: Δ ingreso si está en el snapshot CDM.
- «COMPRA DIARIAMENTE»: CONTEXTO. No explica deterioro. No forzar.

## 25. Last transaction

`lib/dicf.js`: `lastPurchaseDate` = `MAX(fecha)` con kg>0, ventana 365d.  
CDM: `SUM(kg)` mes calendario = MONTH_TOTAL.

**LAST_TRANSACTION ≠ MONTH_TOTAL.**

## 26. Compromisos

DICF `arr.dicf_acciones`: `estado`, `fecha_compromiso`, `compromiso_deadline_at`, historial. Estructura de **fecha/estado**, no cantidad/unidad comprometida de kg.

Comentario libre **no** es compromiso formal.

Steering `COMMITMENT`: eventos de junta, sin join cliente.

## 27. Acciones

| Fuente | Join cliente |
|---|---|
| `dicf_acciones` | `cliente_key` canónico `planta\|grupo\|canal\|subcanal\|nombre` |
| Action Register | `planta_id + tema + title` — **sin `cliente_key`** |

No consultar AR a ciegas. No fuzzy.

## 28. Identity matrix

| SOURCE | KEY | PLANT | CLIENT_NAME | CLIENT_KEY | CANAL | GRUPO | SUBCANAL | SAFE_JOIN |
|---|---|---|---|---|---|---|---|---|
| Clientes por mes | `planta\|cliente` texto | `prov_name` | `cliente_norm` | derivado post-hoc | categoria mes | estatus | subcat | PARCIAL |
| Delta Ingreso | `normCliente` | igual CDM | display | no persistido | no | no | no | PARCIAL |
| comments | `id` | `planta_id` | nombre | nullable | sí | — | sí | SÍ con key |
| ventas diarias | plant_code+nombre+fecha | plant_code | `cliente_norm` | no | no | — | — | PARCIAL |
| dicf_acciones | `id` / public_code | `planta_id` | sí | **NOT NULL** | sí | `grupo_tipo` | sí | SÍ |
| Action Register | `item.id` | `planta_id` | — | **NO** | — | `tema` | — | NO |
| compromisos DICF | acción id | vía DICF | vía DICF | vía DICF | vía DICF | vía DICF | vía DICF | SÍ vía DICF |
| folios M6 | folio.id | `planta_id` | beneficiario ≠ ARR | no | — | categoria | concepto | NO a cliente ARR |

## 29. Evidence-quality

| Afirmación | Clase |
|---|---|
| Cliente Δ = −X (CDM+HG+PROY) | PROVEN |
| kg cayó | PROVEN si CDM |
| Volumen presiona ingreso en $Y | UNKNOWN hasta método |
| Comentario bomba | CONTEXT_ONLY |
| Bomba causó $X | UNKNOWN |
| Gasto Z explica $W de rentabilidad | UNKNOWN |
| Driver es accionable | UNKNOWN |

Buckets conceptuales (no IES): PROFITABILITY_EVIDENCE, INCOME_DELTA_EVIDENCE, EXPENSE_DELTA_EVIDENCE (vacío), CLIENT_DRIVER_EVIDENCE (hechos sí, $ no), COMMENT_CONTEXT, ACTION_EVIDENCE (solo DICF key).

## 30. Continuidad

Turno 1 `¿Cómo va la rentabilidad de septiembre?`: planner `unknown`; CEL `EXECUTIVE_STATUS` (`isPlantLevelExecutiveFinancialQuestion` + `como va`); pack `plant_diagnosis`; persiste `parent_intent: plant_diagnosis`.

Turno 2 pregunta exacta: planner `unknown`; CEL `no_need`; **si** hay inherit → `plant_diagnosis` (diagnóstico general, no atribución). `financial_diagnosis` **no** está en `INHERITABLE_INTENTS`.

Standalone **no** debe exigir turno 1. Puede resolverse si hay `planta_id` + default A/B calendario. Hoy el standalone muere en PLANNER.

## 31. H1–H24

| H | Disposición | Nota |
|---|---|---|
| H1 | **PROVEN** | `recalcularUtilYResultado` + mini |
| H2 | **PROVEN** | `resultado_final_*` distinto |
| H3 | **REJECTED** | no hay bridge físico |
| H4 | **REJECTED** | fórmulas distintas; magnitud residual `NOT_PROVEN_WITHOUT_LIVE_DB` |
| H5 | **REJECTED** | no hay producto Delta Gastos utilizable |
| H6 | **NOT_PROVEN** | 4 subtotales IGF ≠ Top deterioro |
| H7 | **REJECTED** | 0 helper bridge rentabilidad |
| H8 | **REJECTED** | 0 helper kg/desc/margen/HG |
| H9 | **PROVEN** | interacciones multiplicativas |
| H10 | **NOT_PROVEN** | métodos teóricos; ninguno elegido |
| H11 | **REJECTED** | no hay atribución actual |
| H12 | **NOT_PROVEN** | kg sí; $ no sin método |
| H13 | **NOT_PROVEN** | igual desc |
| H14 | **NOT_PROVEN** | igual margen |
| H15 | **NOT_PROVEN** | igual HG |
| H16 | **REJECTED** | 0 contrato runtime |
| H17 | **PROVEN** | comments después del cálculo |
| H18 | **PROVEN** | prompts + golden no-causa |
| H19 | **PROVEN** | `lastPurchaseDate` DICF |
| H20 | **NOT_PROVEN** | DICF fecha/estado; no qty/unidad; comentario ≠ compromiso |
| H21 | **NOT_PROVEN** | DICF sí; AR no |
| H22 | **PROVEN** | PLANNER `no_rule_matched` |
| H23 | **NOT_PROVEN** | label reusable; pack actual insuficiente (M9 sin HG; prohíbe causa) |
| H24 | **NOT_PROVEN** | arquitectónicamente sí con planta; producto actual no |

## 32. Runtime / Golden coverage

| Dominio | Cobertura |
|---|---|
| operativa / final (CEL cómo va) | parcial (status, no deterioro) |
| financial_diagnosis | sí, otra pregunta |
| Delta Ingreso CDM+HG+PROY | R-DELTA-INCOME / PARITY / CUT |
| Delta Gastos | **ninguna** |
| attribution | **ninguna** |
| comments ≠ causa | R-DELTA-INCOME-007, client_profile |
| actionability | **ninguna** |
| continuity | conversational-continuity; no este par |

## 33. False-green risks

1. Tres fórmulas de ingreso (CDM+HG, M9, OLS).
2. Golden «cómo va rentabilidad» PASS ≠ routing de «qué provoca».
3. R-DELTA-PARITY no observa rentabilidad planta.
4. M6 PASS ≠ delta gastos.
5. Inherit `plant_diagnosis` puede parecer respuesta al follow-up.
6. `looksLikeRentabilidadCaera` en harness (confusión histórica ingreso vs rentabilidad).
7. Comments por nombre sin periodo.

## 34. R-RENT-DRIVER-001..020 (propuesta; no implementar)

| ID | Protege |
|---|---|
| 001 | pregunta exacta no cae unknown |
| 002 | A cerrado / B abierto forecast |
| 003 | operativa = `util_oper_importe` mini |
| 004 | final = `resultado_final_importe` mini |
| 005 | Delta Ingreso = CDM+HG+PROY; no OLS |
| 006 | Delta Gastos fail-closed o source canónica |
| 007 | no afirmar bridge si residual/ausencia |
| 008 | Top clientes negativos del snapshot |
| 009 | Top gastos: fail-closed hasta source |
| 010–013 | no afirmar $ de kg/desc/margen/HG sin método |
| 014 | si hay método: drivers suman al Δ cliente |
| 015 | controlabilidad no inventada |
| 016 | comentario = contexto |
| 017 | evidencia missing → fail-closed |
| 018 | standalone con planta, sin turno previo |
| 019 | continuidad hereda planta/periodo, no causa |
| 020 | no query ciega Action Register |

## 35. ROUTING_FIRST_BAD_BOUNDARY

**PLANNER**

- Archivo: `lib/director-ia-planner.js`
- Función: `detectDirectorIaIntent`
- Regla: fallback L757–760 `no_rule_matched`
- Condición: ninguna regla previa matchea «provocando + deterioro + rentabilidad + actuar»
- Intent que pierde: todos; gana `unknown`
- Consecuencia: `buildUnknownClarificationResult`

Secundario: CEL `isCauseQuestion` L271–273 no cubre «qué está provocando»; `CAUSE_EXPLANATION` no implementado.

## 36. DATA_FIRST_BAD_BOUNDARY

**DELTA_EXPENSE_SOURCE**

- No hay helper/intent/endpoint Delta Gastos period-over-period ligado a `util_oper` / `resultado_final`.
- Sin eso no hay puente ingreso/gastos.
- Secundario: **RECONCILIATION** — ingreso cliente ≠ INGRESO mini (H4).

## 37. ATTRIBUTION_FIRST_BAD_BOUNDARY

**DRIVER_ATTRIBUTION_METHOD**

- Archivo: `lib/ingreso-cliente-marginal.js` `ingresoClienteMarginal`
- Hecho: producto kg×margen×desc×HG; 0 helper de descomposición.
- Consecuencia: no se puede decir «$X volumen, $Y descuento…» de forma aditiva exacta e independiente del orden.

## 38. ACTIONABILITY_FIRST_BAD_BOUNDARY

**CONTROLABILITY_CONTRACT**

- 0 enum/código runtime.
- Solo texto en CURRENT_TASK.
- Consecuencia: «sobre qué puedo actuar» no es clasificable sin inventar política.

## 39. Root causes

1. Planner no lexicaliza deterioro/rentabilidad/actuar.
2. CEL causa no implementada.
3. «Rentabilidad» UI = final; chat pide ambos; no hay pack de deterioro.
4. Tres aritméticas de ingreso.
5. HG con rol distinto en cliente vs planta.
6. Gastos fragmentados y no delta.
7. Fórmula ingreso no aditiva.
8. Sin contrato de accionabilidad.
9. AR sin identidad de cliente.

## 40. Reconciliation gate

1. ¿Δ ingreso cliente reconcilia con ingreso planta? **NO.**
2. ¿Δ gastos detallado reconcilia con gasto planta? **NO** (ni existe el delta).
3. ¿Δ ingreso + Δ gastos explican Δ rentabilidad? **NO** (no hay bridge).
4. ¿Hay residual? **SÍ** (y además huecos enteros).
5. ¿Qué es el residual? Fórmulas distintas, HG, desc vs com_desc, proyección, redondeo, P&L no asignado a clientes, corp/inversiones, unidades $/kg vs MXN.
6. ¿Drivers suman al Δ del cliente? **NO** sin método (OAT no cierra).
7. ¿Clientes suman al Δ Ingreso CDM? **SÍ** por construcción del mismo snapshot (tras `moneyOrZero` + round). Eso **no** es el INGRESO planta.

## 41. Contrato de respuesta futura (no producto)

Fail-closed:

```
RESULTADO: operativa + final A/B (mini), sin alias cruzado
PUENTE: UNAVAILABLE (no inventar Δing − Δgas)
INGRESO: Top N CDM+HG+PROY, hechos kg/desc
GASTOS: UNAVAILABLE como explicación de rentabilidad
DRIVERS $: UNAVAILABLE
ACCIONABLE: UNKNOWN
CONTEXTO: comentarios/DICF tras el cálculo, no causa
AR: no consultar a ciegas
```

## 42. Slices

| Slice | ¿Separar? | Por qué |
|---|---|---|
| A Routing + snapshot KPIs (no inventar bridge) | SÍ | primera frontera; reversible |
| B Income driver decomposition | SÍ, después | requiere Gate de método |
| C Expense driver decomposition | SÍ, después | no hay source |
| D Actionability | SÍ, después | no hay contrato |
| E Comments/actions | SÍ, después | identidad parcial |

## 43. Siguiente FIX inmediato (solo propuesta)

**FIX-DIRECTOR-IA-RENTABILIDAD-DETERIORO-ROUTING-SNAPSHOT-001**

Mínimo seguro:

1. Regla planner (o CEL causa) para la pregunta exacta y cercanas.
2. Cargar operativa + final A/B desde mini/`recalcularUtilYResultado` ya existentes.
3. Adjuntar Delta Ingreso ya validado (no OLS, no M9).
4. Fail-closed explícito: sin bridge, sin Δ gastos, sin atribución $, sin accionable, sin AR ciego.
5. Comentario = contexto.
6. Tests: R-RENT-DRIVER-001, 002, 003, 004, 017, 018, 020.

No implementar el bridge. No elegir Shapley. No política de controlabilidad.

## 44. LIVE_DB probes (no ejecutar)

Preferir JS read-only:

- A: `computeIgfForecastMiniPayload` A=ago B=sep misma planta/`upload_day`
- B: `computeDeltaIngresoClientesPorMes` misma planta; `SUM(deltaIngreso)` vs `ingreso` mini B−A
- C: no hay helper Δ gastos — no inventar SQL
- D: composición IGF `$/kg` A vs B (manual, no Top)
- E: `margen_kg`/`hg_*`/`version_number` de ambas versiones
- F: filas CDM kg/desc de 2–3 clientes sintéticos o LIVE bajo Gate
- G: `loadRecentCommentsByClienteNombres` + `dicf_acciones` por `cliente_key`

No SQL que copie `recalcularUtilYResultado`.

## 45. Branch

`audit/director-ia-rentabilidad-deterioro-actionable-drivers-001`

HEAD base: `9857760613162ac4a8980e198dc966f2eee79618`  
FIX previo CLOSED en HEAD.

## 46. Commit SHA

No creado. `allowed_actions` no lista commit. LOOP §8.10.

## 47. git status --short

Se registra al cierre. Solo `CURRENT_TASK.md` (status) + este reporte. Producto/tests intactos.
