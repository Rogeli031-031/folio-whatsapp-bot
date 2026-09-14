# AUDIT-DIRECTOR-IA-EXECUTIVE-PERFORMANCE-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-EXECUTIVE-PERFORMANCE-001"
outcome: "DONE"
mode: "AUDIT"
implementation: false
code_changes: false
test_changes: false
docs_director_ia_changes: false
reference_main: "4ed43213"
probes: "read-only planner/CEL/month_close/pre_close routing"
next_task_proposed: "IMPL-DIRECTOR-IA-EXECUTIVE-PERFORMANCE-SALES-TARGET-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. Resultado

**DONE_PENDING_REVIEW. No se implementó PERFORMANCE.**

Pregunta central: Director IA **solo** puede afirmar cumplimiento, mejora-como-meta, o “vamos bien/mal” contra una **referencia física y trazable**. Hoy esa referencia de **meta explícita** es `igf_meta` (`TARGET_COMMITMENT`). Un forecast, un presupuesto semanal o un mes anterior **no** son esa meta.

La familia PERFORMANCE **no existe** como intención. La mayoría de las frases canónicas caen en `unknown`. Tres se aplanan a `EXECUTIVE_STATUS` **sin** cargar target. Solo las frases que ya disparan `month_close_result` (meta + cumplimiento/porcentaje/cierre) evalúan attainment de **venta**.

## 2. Autoridades y alcance

Consultados (no modificados):

- Constitución + EKE + `DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md`
- `origin/main` `4ed43213`
- Planner, capabilities, tools, CEL, month_close, PRE_CLOSE, IGF/ARR, presupuesto, dashboard KPIs

Sondas: `node` read-only sobre routing. Sin LIVE_DB. Sin writes.

## 3. Las cinco clases de referencia (no equivalentes)

| Clase | Qué es físicamente | Qué autoriza decir | Qué prohíbe |
|-------|--------------------|--------------------|-------------|
| **1. META/TARGET explícito** | `igf_meta.versions` + `igf_meta.meta_lines`, YYYY-MM exacto, `is_current=true`, empresa/planta autorizada | “Contra la meta de venta del mes: actual X vs target Y, attainment Z%” si ambos finitos y target ≠ 0 | Carry-forward, latest de otro mes, hardcode, Plaud como meta |
| **2. PRESUPUESTO** | Carro semanal `public.presupuestos_semanales` + `presupuesto_folios` (`monto_asignado` / seleccionado / disponible) | “Del carro de esta semana: asignado vs seleccionado” si el usuario nombra presupuesto semanal | Tratarlo como meta IGF de venta/descuento/margen |
| **3. FORECAST** | `igf.compromiso_lines` (FORECAST stored); pack autoritativo mini IGF (FORECAST_PROJECTION); `arr.forecast_mensual` / 14d×DOW (DERIVED_MODEL) | “Vs proyección / forecast al corte” etiquetado como FORECAST | Llamarlo meta, compromiso o “cumplimos el objetivo” |
| **4. HISTÓRICO / periodo anterior** | ARR mes vs mes previo; M9 delta venta/descuento/ingreso; commercial_trend 30/90 OLS; daily same-weekday 14d | “Vs mes pasado / vs tendencia / vs promedio del mismo día de la semana” | “Estamos cumpliendo” o “vamos bien” |
| **5. SIN REFERENCIA** | Pregunta de cumplimiento sin KPI, periodo ni fuente | Solo fail-closed: no puede afirmar | Inventar meta, usar forecast/histórico como target |

Contrato ya escrito (EKE / month_close / PRE_CLOSE / CEL): **Forecast ≠ TARGET. IGF stored ≠ igf_meta. Actual al corte ≠ meta. Missing ≠ 0.**

## 4. Dónde existe TARGET explícito

Única fuente de meta gerencial firmada en runtime Director IA:

| Campo | Tabla | ¿Se usa para attainment hoy? |
|-------|--------|------------------------------|
| `venta_ton` | `igf_meta.meta_lines` | **Sí** — `month_close_result.sales.attainment_pct` = actual ARR / target. PRE_CLOSE carga `target.venta_ton` y riesgo `FORECAST_BELOW_TARGET` (forecast vs target, no actual vs target como %) |
| `com_desc_kg` | misma fila | **No** como % de cumplimiento. Viaja en `financial.target`. El actual de descuento es otra clase (ARR `SUM(monto)/SUM(kg)`) |
| `margen_kg`, `util_oper_*`, `resultado_final_*`, gasto/HG/bancos… | misma fila | **No** hay composer de attainment. `ACTUAL_FINANCIAL` (FINAL) puede contrastarse en month_close **solo si** hay versión FINAL; eso no es “cumplimos el mes abierto” |
| `igf_metahg` | hoja METAHG por planta | UI / lectura auxiliar. **Prohibido** como sustituto de `venta_ton` |

Reglas físicas de carga (`pickCurrentMetaVersion` + YYYY-MM exacto):

- Sin fila / `venta_ton` no finito → `TARGET_MISSING_FOR_PERIOD`
- Target = 0 → no se usa como denominador (`target_zero_no_attainment`)
- No carry-forward

CEL declara el slot `TARGET_COMMITMENT` con `availability: UNAVAILABLE` y **no carga** `igf_meta`. El pack madre no puede afirmar cumplimiento.

## 5. Dónde solo existe forecast

- IGF latest `compromiso_lines` (FORECAST)
- Pack autoritativo `computeIgfForecastMiniPayload` (venta, descuento, util, resultado al corte)
- ARR `forecast_mensual` y regla 14d×DOW (DERIVED_MODEL)

CEL y month_close etiquetan explícitamente: forecast no es meta.

“¿Estamos cumpliendo el forecast?” hoy es `unknown`. Aunque se implementara, el verbo correcto es **desviación vs proyección**, no cumplimiento de objetivo.

## 6. Dónde solo existe presupuesto

- Intent `budget_status` / tool `get_budget_status`: carro **semanal** de folios.
- Detector: `presupuesto semanal`, `mi presupuesto`, o `presupuesto` + semana/carro. **No** “¿Estamos dentro del presupuesto?”
- `presupuesto_asignacion_detalle` **no** está integrado.
- Capabilities: dashboard KPIs y clasificación de apoyos **no** afirman desviación presupuestal.

El `presupuesto_kg` de hojas ARR/IGF es campo de hoja operativa, no el intent de presupuesto ni `igf_meta`.

## 7. Métricas: cumplimiento real vs solo tendencia

**Cumplimiento real (TARGET_SUPPORTED) hoy, y solo venta de planta-mes:**

- Actual comercial ARR (`arr.ventas_diarias_cliente` agregado al YYYY-MM) vs `igf_meta.venta_ton`
- Runtime: `month_close_result` (y PRE_CLOSE para *mostrar* target del mes abierto + riesgos forecast-vs-target)

**Solo tendencia (TREND_ONLY):**

- `commercial_trend` 30/90 CASA / Comisionista (OLS). No target.
- M9 `get_delta_sales` / `get_delta_discount` / `get_delta_income`: dos YYYY-MM. No target.
- `daily_sales_deviation` / `daily_discount_deviation`: referencia `same_weekday_recent_average`, ventana 14 días. **No es meta.**
- Movers de clientes en month_close: mes vs mes anterior. No es meta.
- CEL TREND de canales. El prompt dice tendencia ≠ venta actual ≠ forecast ≠ meta.

**FORECAST_ONLY:** magnitudes IGF / pack autoritativo. Sin afirmación de “cumplimos”.

**BUDGET_ONLY:** carro semanal. No KPI de planta.

## 8. Routing físico (sonda `4ed43213`)

```
planDirectorIaQuestion + resolveExecutiveNeed + shouldHandleExecutiveStatus
+ isMonthCloseQuestion + isPreCloseQuestion
```

| Pregunta | Planner | CEL | month_close | Lectura |
|----------|---------|-----|-------------|---------|
| ¿Estamos cumpliendo? | unknown | no | no | Sin referencia. Fail-closed correcto *si no se inventa*. Hoy: unknown, no gap tipado. |
| ¿Estamos dentro de los objetivos o fuera? | unknown | no | no | `objetivos` ≠ detector de `igf_meta`. |
| ¿Cómo va el nivel de cumplimiento actual? | unknown | **CEL** | no | **Aplana PERFORMANCE a la madre.** Pack sin target. Riesgo: GPT “cumplimos” sin evidencia. |
| ¿El rendimiento va de acuerdo a lo planeado? | unknown | no | no | “Planeado” no resuelve clase de referencia. |
| ¿Estamos logrando las metas trazadas para el periodo? | unknown | no | no | `metas` no matchea `\bmeta\b`. “Periodo” no elige YYYY-MM. |
| ¿Vamos mejorando? | unknown | no | no | TREND, no TARGET. |
| ¿Cómo está el desempeño? | unknown | **CEL** | no | Madre, no cumplimiento. |
| ¿Cómo vienen los resultados? | unknown | no | no | Ambiguo (ARR / IGF / FINAL). |
| ¿Qué tal está rindiendo la operación? | unknown | no | no | |
| ¿Estamos bien o mal? | unknown | no | no | Juicio sin referencia. Fail-closed. |
| ¿Vamos arriba o abajo de la meta? | unknown | no | no | Tiene “meta” pero el detector exige `contra la meta` o meta+cumpl/%/faltó/cierre. |
| ¿Estamos vendiendo lo que deberíamos? | unknown | no | no | “Deberíamos” no es fuente. |
| ¿Vamos mejor que el mes pasado? | unknown | no | no | Histórico; no dispara M9 ni month_close. |
| ¿Estamos dentro del presupuesto? | unknown | no | no | No es `budget_status`. |
| ¿Estamos cumpliendo el forecast? | unknown | no | no | Forecast ≠ meta. |
| ¿El descuento está dentro de objetivo? | unknown | no | no | `com_desc_kg` existe en meta; no hay attainment. |
| ¿La planta está rindiendo como debería? | unknown | **CEL** | no | Madre otra vez. |
| ¿Estamos logrando las metas del mes? | unknown | no | no | `metas` + `mes` no bastan para month_close. |
| ¿Vamos bien? | unknown | no | no | Fail-closed. |
| ¿Cómo quedamos contra la meta? | month_close | no | sí | Ruta correcta de TARGET venta. |
| ¿Cuánto nos faltó de la meta? | month_close | no | sí | |
| ¿Qué porcentaje cumplimos? | month_close | no | sí | `porcentaje`+`cumpl` → month_close. Periodo default: último mes calendario completo. |
| ¿Cómo cerramos julio contra la meta? | month_close | no | sí | Mes explícito. |

No hay intent planner `performance` / `executive_performance`. Tools: no existe `get_performance`. Capabilities: no hay dominio PERFORMANCE.

## 9. Matriz dominio | métrica | referencia | fuente | tipo | ¿cumplimiento? | observaciones

| dominio | métrica | referencia disponible | fuente | tipo de referencia | puede evaluar cumplimiento sí/no | observaciones |
|---------|---------|----------------------|--------|--------------------|----------------------------------|---------------|
| dashboard KPIs | conteo/importe/aging de folios | ninguna meta de venta | `public.folios` / `get_dashboard_kpis` | NO_REFERENCE | no | Capabilities: no IGF/ARR; no afirma salud. |
| ARR venta | kg/t mes o to-date | `igf_meta.venta_ton` si existe | `arr.ventas_diarias_cliente` vs `igf_meta` | TARGET_SUPPORTED (si meta OK) | **sí, solo vía month_close (y mostrar target en PRE_CLOSE)** | Actual ≠ forecast ≠ FINAL. |
| ARR descuento | $/kg ponderado | `igf_meta.com_desc_kg` almacenado; no comparado | ARR diario vs meta_lines | AMBIGUOUS_REFERENCE | no hoy | Hay target físico; no hay fórmula de attainment en runtime. |
| ARR ingreso / mix | kg, share CASA/COMI | mes previo o trend | ARR / commercial_trend | TREND_ONLY | no | Mejorar mix ≠ cumplir meta. |
| IGF forecast | venta, desc, util, resultado | IGF latest / mini | `igf.compromiso_lines` / mini | FORECAST_ONLY | no como “cumplir objetivo” | Sí como “vs proyección” si se etiqueta FORECAST. |
| IGF stored vs meta | venta IGF vs `venta_ton` | ambas si existen | IGF + igf_meta | FORECAST vs TARGET | no es cumplimiento real | PRE_CLOSE: `FORECAST_BELOW_TARGET`. |
| igf_meta | venta_ton + líneas financieras | sí, la meta misma | `igf_meta.meta_lines` | TARGET | la referencia, no el actual | Missing → `TARGET_MISSING_FOR_PERIOD`. |
| igf_metahg | kilos/categoría | hoja METAHG | `igf_metahg.lines` | OUT_OF_SCOPE / no venta_ton | no | No sustituye TARGET. |
| presupuestos | asignado/seleccionado/disponible | monto_asignado semanal | `presupuestos_semanales` | BUDGET_ONLY | no KPI planta | Distinto de meta IGF. |
| ventas (pregunta abierta) | ¿cuál? | depende | — | AMBIGUOUS_REFERENCE | no sin KPI+periodo+clase | |
| volumen | t venta | = ARR vs igf_meta.venta_ton | ver ARR venta | TARGET_SUPPORTED si meta | sí (mes, venta) | |
| ingresos | delta ingreso M9 | dos meses | M9 | TREND_ONLY | no | |
| descuento | ver ARR descuento | com_desc_kg no usado | — | AMBIGUOUS_REFERENCE | no hoy | |
| clientes | kg, DICF, perfil | mes previo / trend | ARR/DICF/profile | TREND_ONLY | no | No hay meta por cliente en igf_meta. |
| proyectos | listado EN_CURSO | ninguna meta numérica | `public.proyectos` | NO_REFERENCE | no | “retrasado” no es estatus almacenado. |
| Action Register | abiertas/vencidas | fechas de acción | AR | OUT_OF_SCOPE | no | Ejecución ≠ cumplimiento de venta. |
| gastos | folios GASTOS | no vs igf_meta.gasto_kg | M6 | NO_REFERENCE | no | |
| inversiones | folios INVERSIONES | no vs igf_meta.inversiones_kg | M6 | NO_REFERENCE | no | |
| apoyos | clasif. mes_a vs mes_b | comparativo, no presupuesto | M4 | TREND_ONLY | no | Capabilities: no desviación presupuestal. |
| daily brief / desviación | kg o $/kg del día | promedio same-weekday 14d | ARR | TREND_ONLY | no | `target_date` = fecha del día, no meta. |
| CEL EXECUTIVE_STATUS | pack COMPARE_WITH_LABELS | slot TARGET UNAVAILABLE | CEL | NO_REFERENCE (para cumplir) | no | Tres frases PERFORMANCE caen aquí. |
| month_close | venta + financial classes | igf_meta + ARR + IGF + FINAL? | month_close | TARGET_SUPPORTED (venta) | sí venta; no “bien/mal” global | Default mes = último completo. |
| PRE_CLOSE | current / target / forecast | igf_meta + ARR to-date + IGF | composer | TARGET_SUPPORTED (mostrar) + FORECAST | no como % attainment de actual | Junta; no es PERFORMANCE suelto. |

## 10. Matriz pregunta | intención actual | referencia requerida | soportada hoy | comportamiento correcto

| pregunta | intención actual | referencia requerida | soportada hoy sí/no | comportamiento correcto |
|----------|------------------|----------------------|---------------------|-------------------------|
| ¿Estamos cumpliendo? | unknown | TARGET + KPI + periodo + planta; si faltan → fail-closed | no | No afirmar. Pedir KPI/periodo o heredarlos. No CEL. |
| ¿Estamos dentro de los objetivos o fuera? | unknown | TARGET explícito del KPI | no | Igual. “Objetivos” ≠ forecast. |
| ¿Cómo va el nivel de cumplimiento actual? | CEL EXECUTIVE_STATUS | TARGET; no pack madre | **no** (ruta incorrecta) | No aplanar a CEL. Fail-closed o month_close/PRE_CLOSE si hay planta+mes+meta. |
| ¿El rendimiento va de acuerdo a lo planeado? | unknown | Resolver si “planeado” = igf_meta / forecast / presupuesto | no | AMBIGUOUS_REFERENCE hasta desambiguar. |
| ¿Estamos logrando las metas trazadas para el periodo? | unknown | igf_meta + YYYY-MM | no | No inventar periodo. |
| ¿Vamos mejorando? | unknown | HISTÓRICO (trend o mes previo), **no** TARGET | no como cumplimiento | TREND_ONLY. Prohibido “entonces cumplimos”. |
| ¿Cómo está el desempeño? | CEL | AMBIGUOUS (madre vs PERFORMANCE) | no para cumplir | No CEL como veredicto. |
| ¿Cómo vienen los resultados? | unknown | AMBIGUOUS | no | Clarificar clase de verdad. |
| ¿Qué tal está rindiendo la operación? | unknown | AMBIGUOUS | no | |
| ¿Estamos bien o mal? | unknown | SIN REFERENCIA | no | Fail-closed. |
| ¿Vamos arriba o abajo de la meta? | unknown | TARGET venta (mínimo) | no (detector no dispara) | Debería poder reusar month_close/PRE_CLOSE si planta+mes. |
| ¿Estamos vendiendo lo que deberíamos? | unknown | TARGET venta; “deberíamos” no es fuente | no | Solo vs igf_meta.venta_ton. |
| ¿Vamos mejor que el mes pasado? | unknown | HISTÓRICO M9/ARR | no en esa frase | Comparar meses etiquetado; no “cumplimos”. |
| ¿Estamos dentro del presupuesto? | unknown | BUDGET semanal o fail-closed | no | No mapear a igf_meta. |
| ¿Estamos cumpliendo el forecast? | unknown | FORECAST + actual | no | Etiquetar FORECAST; no “meta”. |
| ¿El descuento está dentro de objetivo? | unknown | igf_meta.com_desc_kg + actual ARR | no (falta composer) | Fail-closed hasta existir comparación. |
| ¿La planta está rindiendo como debería? | CEL | TARGET o fail-closed | **no** (CEL) | No “debería” sin meta. |
| ¿Estamos logrando las metas del mes? | unknown | igf_meta del mes nombrado | no | Resolver mes; luego venta vs target. |
| ¿Vamos bien? | unknown | SIN REFERENCIA | no | Fail-closed. |
| ¿Cómo quedamos contra la meta? | month_close_result | TARGET + actual mes | **sí** (venta) | Conservar. Si TARGET missing, gap; no inferir. |
| ¿Cuánto nos faltó de la meta? | month_close_result | TARGET | **sí** (venta) | |
| ¿Qué porcentaje cumplimos? | month_close_result | TARGET | **sí** (venta; mes default último completo) | No generalizar a todos los KPI. |

## 11. Respuestas exigidas

### 1. ¿Especialización de EXECUTIVE_STATUS o intención separada subordinada?

**Subordinada, no aplanada a la madre.**

`EXECUTIVE_STATUS` responde “cómo vamos” con pack etiquetado y **prohíbe** inferir TARGET. Tres frases PERFORMANCE ya se cuelan a CEL: eso es defecto de frontera, no contrato de cumplimiento.

PERFORMANCE debe ser **especialización subordinada de la familia ejecutiva**: misma planta/periodo/authz, **reutiliza** loaders de `igf_meta` + ARR (month_close / PRE_CLOSE), **no** nueva fuente, **no** tool nueva de verdad. No es un intent paralelo que invente metas.

Puede ser need CEL `PERFORMANCE` *o* reuso explícito de `month_close_result` / PRE_CLOSE cuando la referencia ya está resuelta. No debe ser un phrasebook ni un “sí/no” sobre el pack madre.

### 2. ¿Qué métricas soportan cumplimiento real?

Solo **venta de planta en un YYYY-MM** con `igf_meta.venta_ton` OK y actual ARR finito: `attainment_pct` / `delta_ton`.

### 3. ¿Qué métricas solo soportan tendencia?

Trend 30/90, deltas M9, desviación diaria 14d same-weekday, movers vs mes anterior, mix de canal.

### 4. ¿Dónde existe target explícito?

`igf_meta` por planta/empresa y mes. Campo operativo de cumplimiento: `venta_ton`. El resto de la fila es TARGET almacenado **sin** composer de cumplimiento.

### 5. ¿Dónde solo existe forecast?

IGF `compromiso_lines`, mini autoritativo, ARR `forecast_mensual` / 14d×DOW.

### 6. ¿Dónde solo existe presupuesto?

Carro semanal de folios. No meta de venta/descuento/margen.

### 7. ¿Qué preguntas deben fallar cerrado?

- `¿Estamos bien o mal?` / `¿Vamos bien?` sin referencia.
- `¿Estamos cumpliendo?` (y equivalentes) sin KPI + periodo + clase de referencia.
- `¿Vamos mejorando?` si se pide como cumplimiento.
- `¿Estamos dentro del presupuesto?` si no es el carro semanal nombrado.
- `¿Estamos cumpliendo el forecast?` como si el forecast fuera meta.
- `¿El descuento está dentro de objetivo?` hasta existir comparación actual vs `com_desc_kg`.
- Cualquier afirmación si `TARGET_MISSING_FOR_PERIOD` o target 0.
- Varias metas posibles (venta vs descuento vs FINAL vs presupuesto) sin desambiguar.
- CEL respondiendo “cumplimos” con slot TARGET UNAVAILABLE.

### 8. ¿Qué continuidad conversacional necesita?

- **Planta:** ancla UI / nombre explícito / AUTHZ (igual que CEL / month_close). Sin planta: clarificar. No portafolio en este corte.
- **Periodo:** YYYY-MM explícito, “este mes” (PARTIAL to-date), “mes pasado” (último completo). Heredar solo si `parent_intent` es `month_close_result` o PRE_CLOSE con `reuse_inherited_month` / ciclo abierto.
- **KPI:** heredar el último KPI desambiguado (`venta` por defecto **solo** si el usuario ya está en hilo de meta de venta).
- Follow-ups del CURRENT_TASK: `¿y en ventas?` (mismo target, métrica venta), `¿y Puebla?` (cambia planta, requery meta), `¿contra qué meta?` (citar `igf_meta` version/empresa/YYYY-MM o gap), `¿cuánto nos falta?` (delta vs target; inherit month_close ya cubre parte).
- `¿Vamos mejorando?` en hilo PERFORMANCE: **no** heredar como attainment; o trend etiquetado o fail-closed.
- CEL **no** deja `parent_intent=executive_status`. Un slice PERFORMANCE necesita parent persistible o reusar `month_close_result` / `pre_meeting_brief`.

### 9. ¿Cuál es el slice mínimo sin inventar metas?

**Solo venta vs `igf_meta.venta_ton` para una planta y un YYYY-MM resueltos.**

1. Detectar semántica PERFORMANCE de cumplimiento (no phrasebook de 50; no absorber “mejorando”, presupuesto, forecast-como-meta, bien/mal).
2. Reusar loaders existentes de month_close/PRE_CLOSE (`listMetaVersions` / `loadMetaLinesForVersion` + ARR).
3. Si falta meta: `TARGET_MISSING_FOR_PERIOD` y **no** CEL.
4. Si hay meta: actual, target, delta, %, provenance (`igf_meta` version + clase TARGET_COMMITMENT).
5. Mes abierto: actual = to-date, periodo PARTIAL; no venderlo como mes cerrado ni como FINAL.
6. Sacar del CEL las frases que hoy se aplanan (`cumplimiento actual`, `desempeño`, `rindiendo como debería`) **solo** si el slice de implementación lo autoriza; esta auditoría no lo hace.
7. Fuera: descuento, margen, presupuesto, trend-as-compliance, forecast-as-meta, cliente, Action Register.

Nombre propuesto (no autorizado): `IMPL-DIRECTOR-IA-EXECUTIVE-PERFORMANCE-SALES-TARGET-001`.

## 12. Forma de respuesta (contrato funcional propuesto)

Si TARGET OK:

- Resultado: arriba / abajo / igual **de la meta de venta**, no “bien/mal” moral.
- Referencia: `TARGET_COMMITMENT` `igf_meta` YYYY-MM, version_id, empresa.
- Actual: ARR, clase ACTUAL_COMMERCIAL, corte o mes completo.
- Desviación: `delta_ton`, `attainment_pct` (si target ≠ 0).
- Evidencia / limitations. Missing ≠ 0.

Si no hay referencia resoluble: fail-closed explícito. Prohibido rellenar con forecast, mes anterior o presupuesto.

## 13. Afirmaciones prohibidas sin evidencia

- “Estamos cumpliendo / vamos bien / rendimos como deberíamos” sin `igf_meta` OK.
- Forecast o IGF stored como meta.
- Mes anterior o trend 14d/30/90 como objetivo.
- Presupuesto semanal como meta de planta.
- `igf_metahg` como `venta_ton`.
- Carry-forward de meta.
- Cumplimiento financiero real sin `ACTUAL_FINANCIAL` FINAL.
- Cumplimiento de descuento/margen/gasto sin composer que compare actual vs la columna TARGET.
- Inventar KPI cuando el usuario no lo nombra y no hay hilo.

## 14. Hallazgos

1. **MAJOR — frontera CEL:** tres frases PERFORMANCE (`cumplimiento actual`, `desempeño`, `rindiendo como debería`) reciben pack madre sin target.
2. **MAJOR — hueco de detector:** “arriba o abajo de la meta” / “metas del mes” no entran a month_close aunque la fuente exista.
3. **MINOR — unknown opaco:** “¿Estamos cumpliendo?” no declara gap; solo no clasifica.
4. **INFO:** month_close ya es el único evaluator de cumplimiento de venta. PERFORMANCE no debe duplicar verdad; debe apuntar ahí o extraer el mismo attainment.

## 15. Archivos leídos (no tocados)

`lib/director-ia-planner.js`, `lib/director-ia-capabilities.js`, `lib/director-ia-tools.js`, `lib/director-ia-conversational-executive-layer.js`, `lib/director-ia-month-close-result.js`, `lib/director-ia-executive-cycle-composer.js`, `lib/director-ia-conversation-state.js`, `lib/director-ia-daily-deviation.js`, `lib/director-ia-m18-presupuesto-semanal.js`, `lib/director-ia-m3-plantas-kpis-proyectos.js`, `lib/igf-meta-excel.js`, `sql/012_igf_meta_global.sql`, contratos EKE / capacidades.

## 16. Desvíos / STOP

Nada implementado. DIAGNOSIS y PRIORITY no se inician.

`next_task_proposed` no está autorizado. G5 humano.

## 17. human_decision_needed

Revisar este informe. Autorizar o no el slice mínimo de **venta vs igf_meta**. No merge. No deploy.
