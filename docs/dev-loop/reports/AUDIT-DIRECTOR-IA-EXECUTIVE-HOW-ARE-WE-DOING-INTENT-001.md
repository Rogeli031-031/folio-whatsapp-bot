# AUDIT-DIRECTOR-IA-EXECUTIVE-HOW-ARE-WE-DOING-INTENT-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-EXECUTIVE-HOW-ARE-WE-DOING-INTENT-001"
outcome: "DONE_PENDING_REVIEW"
mode: "AUDIT"
implementation: false
source_code_changed: false
test_code_changed: false
sql_changed: false
live_db: false
base_main_sha: "4ed4321383baa9dabbff3ac10c1ffe9ee54eabbd"
branch: "audit/director-ia-executive-how-are-we-doing-intent-001"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-STATUS-SLICE-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-EXECUTIVE-STATUS-PARAPHRASE-REACH-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "G5: aceptar o rechazar. No implementar. No merge. No push main."
```

## Resumen ejecutivo

`¿Cómo vamos?` **no es una familia plana de 50 sinónimos**. Ya existe una necesidad semántica madre en runtime: `EXECUTIVE_STATUS` (Conversational Executive Layer / CEL), distinta del intent de planner `daily_executive_brief` y del intent `plant_diagnosis`.

Sonda física (2026-09-14, `origin/main` `4ed43213`):

- El planner **casi nunca** reconoce la familia. La mayoría cae a `unknown` + aclaración.
- CEL intercepta **solo** cuando hay cue `como` + verbo de marcha/estado **o** cue de situación, **y** el planner es `unknown` / `plant_diagnosis` / `daily_executive_brief`.
- 18/50 llegan hoy a CEL. 31/50 mueren en `unknown`. 1/50 (`cerramos el indicador`) se desvía a `month_close_result`.
- `¿Qué tal estás?` no es saludo (el smalltalk exige `que tal` exacto) ni estado ejecutivo: **FALSE_POSITIVE**.
- `¿Cómo va el día de hoy?` es **TIME**: el detector de brief diario dispara, pero CEL **se la traga** y responde con el pack ejecutivo de periodos mezclados, no con venta+descuento del día.
- `¿Estamos cumpliendo?`, `¿Qué debería preocuparme?` y `¿Qué tengo que atender?` **no** entran a CEL. Coinciden con needs posteriores (`RISK_FOCUS` / prioridad) **no implementados**, o no tienen cue.

No se implementó nada.

---

## Respuestas al contrato (1–11)

### 1. ¿Cuál debe ser la intención madre?

**`EXECUTIVE_STATUS`** (need CEL). No crear un alias nuevo. No sobrecargar `plant_diagnosis` ni `daily_executive_brief`.

Si más adelante existiera intent de planner, el nombre consistente es `executive_status`, no `daily_executive_brief`.

Significado funcional: panorama de **una planta** con evidencia etiquetada (situación / magnitud / tendencia / movers / meta si existe / ejecución), **sin** exigir que el usuario nombre venta, descuento, IGF ni folio. No es “buen día / mal día” programado. No es cierre mensual. No es saludo al asistente.

### 2. ¿Qué especializaciones necesita?

| Especialización | Need / intent existente | ¿Implementada? |
|-----------------|-------------------------|----------------|
| TIME (`hoy`, `día`, `jornada`, `este momento` como día) | `daily_executive_brief` (ayer/hoy/día + overview) | Parcial; hoy lo intercepta CEL y pierde el día |
| DOMAIN (`negocio`, `operación`, `tablero`, `planta` como objeto) | ninguno dedicado | No |
| PERFORMANCE (bien/mal, cumplimiento, metas, mejorando) | `month_close_result` solo si hay cierre/mes/meta | No para la familia abierta |
| DIAGNOSIS (preocuparme, fallando, problemas) | CEL `RISK_FOCUS` (`later_slice`) | No; el detector ni siquiera pega `preocuparme` |
| PRIORITY (atender, importante, pendiente) | AR `overdue_actions` / `action_status` si nombra acciones | No para la anáfora ejecutiva |

### 3. ¿Qué información mínima necesita `¿Cómo vamos?`?

1. **Planta** resuelta (ancla UI o nombre de catálogo).
2. Al menos **un** slot usable: SITUATION, MAGNITUDE o TREND.
3. **Etiquetas de periodo** por fuente (no fusionar).
4. **Limitations/gaps** si un slot falta.
5. Authz de la planta actual.

Sin planta → aclarar. Sin ningún slot → declarar ausencia, no inventar panorama.

### 4. ¿Qué fuentes puede usar hoy?

Usables en el pack CEL / `assemblePlantDiagnosisEvidence`:

| Fuente | Semántica | Uso en madre |
|--------|-----------|--------------|
| `commercial_state` | cache comercial | SITUATION / DRIVERS |
| ARR mini / forecast autoritativo | FORECAST_PROJECTION | MAGNITUDE |
| IGF almacenado | FORECAST_STORED | MAGNITUDE etiquetada, ≠ forecast |
| `commercial_trend` CASA / COMISIONISTA | OLS 30/90 | TREND |
| Action Register | snapshot / vencidas | EXECUTION |
| DICF | acciones registradas | EXECUTION |
| igf_meta | TARGET si AVAILABLE | TARGET_COMMITMENT opcional |

No usables hoy para afirmar la madre: Plaud, Steering read, Council, live copilot, `ACTUAL_FINANCIAL` (solo CLOSE_STATUS), ingreso diario, presupuesto como “salud”, KPIs de folio como IGF/ARR.

### 5. ¿Qué herramientas existen?

Registry (`lib/director-ia-tools.js`): `get_daily_executive_brief`, `get_daily_sales_deviation`, `get_daily_discount_deviation`, `get_commercial_trend`, `get_arr_snapshot`, `get_igf_snapshot`, `get_action_register_context`, `get_dicf_context`, `get_dashboard_kpis`, `get_month_close_result`, `get_pre_meeting_brief`, `get_delta_*`, loaders de `plant_diagnosis`.

CEL **no** es tool del orchestrator. `askDirectorIa` intercepta en chat (`shouldHandleExecutiveStatus`) **antes** de ejecutar el plan de tools. El orchestrator, ante `unknown`, no ejecuta (`requires_clarification` bloquea).

### 6. ¿Qué herramientas faltan?

- Tool/intent de planner `executive_status` (hoy solo need CEL).
- Composer TIME que no reutilice el pack COMPARE_WITH_LABELS.
- Composer PERFORMANCE vs meta sin forzar `month_close_result`.
- Need DIAGNOSIS (`RISK_FOCUS`) implementado; el regex actual no cubre `preocuparme`.
- Need PRIORITY (atención / pendiente ejecutivo) sin exigir token `accion`.
- Lectura de Steering / Plaud / Council.
- Ingreso diario.

### 7. ¿Qué debe hacer si faltan datos?

Conservar el contrato CEL ya escrito: responder **parcial** con lo AVAILABLE; declarar limitation; `missing ≠ 0`; no inventar desempeño, riesgo, cumplimiento ni tendencia. Si **ningún** slot usable → no fabricar resumen; decir qué falta.

### 8. ¿Qué debe hacer si no hay planta?

`resolveSemanticScope`: sin ancla UI usable y sin planta explícita de catálogo → `ASK_CLARIFICATION`: «¿De qué planta quieres el estado?». Planta explícita no resuelta → pedir desambiguación. Planta sin authz → `SOURCE_RESTRICTED`. No heredar planta de otro hilo si hay `plant_mismatch`.

### 9. ¿Qué continuidad debe conservar?

- Planta del ancla / explícita (`planta_id` en conversation_state).
- Periodo **etiquetado**, no fusionado. `active_date` solo si la especialización TIME (brief diario) ganó de verdad.
- `parent_intent` / hilo ejecutivo para: `¿Y en clientes?`, `¿Y Acapulco?`, `¿Por qué dices eso?`, `¿Qué es lo que más te preocupa?`.
- No heredar `folio_search_spec` ni cliente embebido hacia la madre.
- Follow-up de prioridad/diagnóstico **sobre** un EXECUTIVE_STATUS previo ≠ primera pregunta suelta.

`INHERITABLE_INTENTS` ya incluye `plant_diagnosis` y `daily_executive_brief`. `executive_status` **no** es intent inheritable del planner; el hilo CEL usa `parent_intent=plant_diagnosis` o bundle ejecutivo. Eso es un hueco de continuidad: la madre no tiene nombre de intent persistible.

### 10. ¿Qué frases similares NO deben entrar en esta intención?

- `¿Qué tal estás?` (asistente, no planta).
- `¿Qué tal?` exacto (smalltalk).
- `¿Cómo va mantenimiento/taller/seguridad?` → `action_status`.
- `¿Cómo estuvo la venta ayer?` → `daily_sales_deviation`.
- `¿Cómo nos fue ayer?` inequívoco de brief diario (panorama **del día cerrado**).
- Folio / cheque / IGF / presupuesto / cliente nombrado / Taller AT.
- Cierre de **un mes** explícito → `month_close_result`.
- `balance general` si el usuario habla de contabilidad.
- `el indicador` sin indicador en hilo.

### 11. ¿Cuál debería ser el siguiente capability slice?

**`IMPL-DIRECTOR-IA-EXECUTIVE-STATUS-PARAPHRASE-REACH-001`**

Objetivo único: que las **paráfrasis puras** que hoy son `unknown`/`no_need` lleguen al composer CEL **ya existente**, sin implementar diagnosis, priority ni performance, y **sin** que TIME (`hoy` / `día`) se absorba al pack de periodos mezclados.

Criterio de entrada: G1 nuevo. No phrasebook de las 50. Ampliar cues de `hasExecutiveStatusCue` / equivalencia de overview. Quitar o acotar `/\bcomo cerr/` → `month_close` cuando no hay mes/meta/indicador conocido.

---

## Definición propuesta de la intención madre

**Nombre:** `EXECUTIVE_STATUS`  
**Sujeto:** planta (UI o explícita), no el modelo.  
**Output shape** (ya en CEL `ANSWER_HIERARCHY`): SITUATION → MAGNITUDE → TREND → COMMERCIAL_MOVERS → TARGET_COMMITMENT → DRIVERS → RISKS → EXECUTION → NEXT_DECISION. Solo slots AVAILABLE. GPT redacta; no inventa cifras.

---

## Contrato funcional

**Planta:** UI anchor si usable; explícita de catálogo gana; no resuelta → aclarar; mismatch → drop.

**Tiempo:** default de la madre = periodos **etiquetados** de cada fuente (`COMPARE_WITH_LABELS`). `hoy`/`día`/`ayer` = especialización TIME → brief diario (venta+descuento), no el pack madre. `periodo`/`metas del periodo` = PERFORMANCE + periodo, no inventar mes.

**Evidencia:** solo fuentes reales. Prohibido afirmar cumplimiento sin TARGET AVAILABLE. Prohibido “preocuparme” sin slot RISK usable.

**Missing:** parcial + gap. Cero filas ≠ cero.

**Continuidad:** ver §9.

---

## Clasificación de las 50 preguntas

Leyenda runtime: `CEL` = intercepta hoy; `UNK` = planner unknown; `BRIEF→CEL` = detector brief + CEL se queda con ella; `MC` = month_close.

### Grupo A — directas

| # | Frase | Clase | Runtime |
|---|--------|-------|---------|
| 1 | ¿Cómo vamos? | PARAPHRASE_PURE | CEL |
| 2 | ¿Cómo estamos? | PARAPHRASE_PURE | CEL |
| 3 | ¿Cómo estamos yendo? | PARAPHRASE_PURE | CEL |
| 4 | ¿Qué tal vamos? | PARAPHRASE_PURE | UNK (sin `como`) |
| 5 | ¿Cómo está la planta? | PARAPHRASE_PURE | CEL |
| 6 | ¿Cómo marcha todo? | PARAPHRASE_PURE | UNK (`marcha` no es cue) |
| 7 | ¿Cómo va el día de hoy? | SPECIALIZATION_TIME | BRIEF→CEL |
| 8 | ¿Qué tal marcha el negocio? | SPECIALIZATION_DOMAIN | UNK |
| 9 | ¿Cómo se ve la situación? | PARAPHRASE_PURE | CEL |
| 10 | ¿Cómo avanza la operación? | SPECIALIZATION_DOMAIN | UNK |

### Grupo B — ejecutivo

| # | Frase | Clase | Runtime |
|---|--------|-------|---------|
| 11 | Dame el estado actual. | AMBIGUOUS | UNK `estado_ambiguous` |
| 12 | Dame un panorama de cómo vamos. | PARAPHRASE_PURE | CEL |
| 13 | Dame el resumen ejecutivo. | PARAPHRASE_PURE | UNK |
| 14 | ¿Cuál es la situación actual? | PARAPHRASE_PURE | CEL |
| 15 | ¿Cómo está el negocio? | SPECIALIZATION_DOMAIN | CEL |
| 16 | Preséntame el balance general de la jornada. | AMBIGUOUS | UNK |
| 17 | Requiero el estatus operativo general. | SPECIALIZATION_DOMAIN | UNK |
| 18 | Despliégame el reporte de situación de la planta. | PARAPHRASE_PURE | CEL |
| 19 | Dame una lectura rápida de cómo cerramos el indicador. | AMBIGUOUS | **MC** (`como cerr`) |
| 20 | Pásame el reporte ejecutivo de cómo nos encontramos. | PARAPHRASE_PURE | UNK |

### Grupo C — informal

| # | Frase | Clase | Runtime |
|---|--------|-------|---------|
| 21 | A ver, ¿cómo vamos? | PARAPHRASE_PURE | CEL |
| 22 | Cuéntame cómo estamos. | PARAPHRASE_PURE | CEL |
| 23 | ¿Qué tal las cosas? | AMBIGUOUS | UNK |
| 24 | ¿Cómo pinta esto? | PARAPHRASE_PURE | UNK |
| 25 | ¿Cómo anda la planta? | PARAPHRASE_PURE | CEL |
| 26 | ¿Qué onda con los números de hoy? | SPECIALIZATION_TIME | UNK |
| 27 | A ver, ¿cómo andamos por aquí? | PARAPHRASE_PURE | CEL |
| 28 | ¿Qué dice el tablero de control? | SPECIALIZATION_DOMAIN | UNK |
| 29 | Ponme al tanto de cómo marcha todo. | PARAPHRASE_PURE | UNK |
| 30 | ¿Cómo se está viendo el panorama en este momento? | SPECIALIZATION_TIME | CEL (pack madre, no día) |

### Grupo D — desempeño

| # | Frase | Clase | Runtime |
|---|--------|-------|---------|
| 31 | ¿Estamos bien o mal? | SPECIALIZATION_PERFORMANCE | UNK |
| 32 | ¿Cómo está el desempeño? | SPECIALIZATION_PERFORMANCE | CEL (pack general; no juzga bien/mal) |
| 33 | ¿Vamos mejorando? | SPECIALIZATION_PERFORMANCE | UNK |
| 34 | ¿Estamos cumpliendo? | SPECIALIZATION_PERFORMANCE | UNK |
| 35 | ¿Cómo vienen los resultados? | SPECIALIZATION_PERFORMANCE | UNK |
| 36 | ¿Qué tal está rindiendo la operación? | SPECIALIZATION_PERFORMANCE | UNK |
| 37 | ¿Estamos dentro de los objetivos o fuera? | SPECIALIZATION_PERFORMANCE | UNK |
| 38 | ¿Cómo va el nivel de cumplimiento actual? | SPECIALIZATION_PERFORMANCE | CEL |
| 39 | ¿El rendimiento va de acuerdo a lo planeado? | SPECIALIZATION_PERFORMANCE | UNK |
| 40 | ¿Estamos logrando las metas trazadas para el periodo? | SPECIALIZATION_PERFORMANCE | UNK |

### Grupo E — diagnóstico

| # | Frase | Clase | Runtime |
|---|--------|-------|---------|
| 41 | ¿Qué está pasando? | SPECIALIZATION_DIAGNOSIS | CEL (cue situación) |
| 42 | ¿Qué debería preocuparme? | SPECIALIZATION_DIAGNOSIS | UNK (no pega `RISK_FOCUS`) |
| 43 | ¿Qué está funcionando y qué no? | SPECIALIZATION_DIAGNOSIS | UNK |
| 44 | ¿Dónde estamos fallando? | SPECIALIZATION_DIAGNOSIS | UNK |
| 45 | ¿Dónde tenemos problemas? | SPECIALIZATION_DIAGNOSIS | UNK |

### Grupo F — prioridad

| # | Frase | Clase | Runtime |
|---|--------|-------|---------|
| 46 | ¿Qué tengo que atender? | SPECIALIZATION_PRIORITY | UNK |
| 47 | ¿Qué es lo más importante ahorita? | SPECIALIZATION_PRIORITY | UNK |
| 48 | ¿Dónde debería poner atención? | SPECIALIZATION_PRIORITY | UNK |
| 49 | ¿Qué requiere mi atención? | SPECIALIZATION_PRIORITY | UNK |
| 50 | ¿Qué tenemos pendiente importante? | SPECIALIZATION_PRIORITY | UNK |

Must-detect fuera de la batería de 50:

| Frase | Clase | Runtime |
|-------|-------|---------|
| ¿Qué tal estás? | FALSE_POSITIVE | UNK (tampoco smalltalk) |

---

## Preguntas equivalentes reales

Paráfrasis puras de la madre (mismo propósito, sin filtro extra): **1, 2, 3, 4, 5, 6, 9, 12, 13, 14, 18, 20, 21, 22, 24, 25, 27, 29**.

Solo un subconjunto (1–3, 5, 9, 12, 14, 18, 21, 22, 25, 27) alcanza CEL hoy.

---

## Especializaciones

**TIME:** 7, 26, 30. 7 y 30 no deben responderse con el pack COMPARE_WITH_LABELS como si fueran `¿Cómo vamos?`.

**DOMAIN:** 8, 10, 15, 17, 28. `tablero` ≠ IGF; `get_dashboard_kpis` es agregados de folio.

**PERFORMANCE:** 31–40. Requieren TARGET/meta u OLS de tendencia. Sin eso: gap, no “sí/no”.

**DIAGNOSIS:** 41–45. 41 hoy se aplana a la madre. 42–45 no.

**PRIORITY:** 46–50. Distinto de listar vencidas AR salvo que el usuario nombre acciones.

---

## Ambigüedades

- **Balance general de la jornada:** contable vs panorama del día. No mapear ciego. Pedir: ¿estado de planta o cifras contables?
- **Cerramos el indicador:** falta *cuál* indicador y *qué* cierre. Runtime actual (`/\bcomo cerr/`) es falso positivo de `month_close_result`.
- **Estado actual:** el planner ya lo trata como ambiguo (planta/acción/folio). Correcto no forzar madre.
- **Qué tal las cosas:** entre smalltalk y madre. No es `¿Qué tal estás?`, pero tampoco es cue ejecutivo.

---

## Falsos positivos

- **`¿Qué tal estás?`:** conversación con Director IA. Smalltalk actual solo acepta `que tal` exacto; esta frase queda `unknown`. No debe entrar a EXECUTIVE_STATUS.
- **`¿Cómo va <tema AR>?`:** fuera de esta familia (ya `action_status`).
- **`como cerramos el indicador` → month_close:** falso positivo de especialización de cierre.

---

## Contexto de planta

| Caso | Comportamiento físico |
|------|------------------------|
| UI `planta_id` usable + authz | `UI_PLANT_ANCHOR` |
| Nombre en catálogo | `EXPLICIT_PLANT` |
| Token de planta no catalogado | aclaración |
| Sin UI y sin nombre | «¿De qué planta quieres el estado?» |
| Cross-plant | drop de estado / 403 |

La madre es **una planta**. No hay slice PORTFOLIO en esta familia.

---

## Contexto temporal

| Expresión | Debe ser | Hoy |
|-----------|----------|-----|
| (nada) | pack etiquetado multi-periodo | CEL COMPARE_WITH_LABELS |
| hoy / día de hoy | TIME / brief; hoy ≠ día cerrado | brief detector sí; CEL override pierde el día |
| ayer | TIME brief (día cerrado) | `daily_executive_brief` si overview |
| periodo / metas del periodo | PERFORMANCE + mes o aclarar | UNK |
| cerramos + mes | `month_close_result` | sí si hay mes; **también** si solo `como cerr` |

---

## Continuidad conversacional

Conservar: planta, provenance, limitations, slots dichos.

Follow-ups del CURRENT_TASK:

| Follow-up | Debe |
|-----------|------|
| ¿Y en clientes? | DOMAIN sobre el mismo pack / commercial_state; no reparsear madre |
| ¿Y Acapulco? | cambio de planta explícita |
| ¿Por qué dices eso? | CAUSE_EXPLANATION (`later_slice`); no inventar causa |
| ¿Qué es lo que más te preocupa? | RISK_FOCUS sobre el hilo; hoy `later_slice` y el regex no cubre `preocuparme` |

Hueco: CEL no deja `parent_intent=executive_status`.

---

## Fuentes disponibles / no disponibles

Ver §4. Bitácora entra en `plant_diagnosis` assembly; Plaud **PENDING_INTEGRATION**. `ACTUAL_FINANCIAL` no aplica a la madre.

---

## Herramientas disponibles / faltantes

Ver §5–6. Orchestrator no tiene dominio `executive_status`. `unknown` + clarificación ⇒ `can_execute=false`.

---

## Huecos actuales

1. Cue CEL estrecho: exige `como` + verbo o “qué está pasando / situación”. Pierde `qué tal vamos`, `marcha`, `pinta`, `resumen ejecutivo`.
2. TIME absorbido por CEL porque `daily_executive_brief` es overridable.
3. `como cerr` abre month_close sin indicador.
4. PERFORMANCE/DIAGNOSIS/PRIORITY sin composer.
5. `RISK_FOCUS` no matchea `preocuparme`.
6. Madre sin intent persistible.
7. `¿Qué tal estás?` no es smalltalk ni madre.

---

## Riesgos de implementación

- Phrasebook de 50 frases: viola el `scope_goal`.
- Tratar PERFORMANCE como la madre: inventará “cumplimos” sin meta.
- Unificar TIME con la madre: mezcla día operativo con IGF/ARR de otro corte.
- Mapear `tablero` a IGF.
- Mapear `balance general` a P&L.

---

## Recomendación del siguiente capability slice

**Entrada a implementación (solo con G1 nuevo):**

`IMPL-DIRECTOR-IA-EXECUTIVE-STATUS-PARAPHRASE-REACH-001`

- in_scope: cues de `hasExecutiveStatusCue` / `isExecutiveStatusQuestion`; exclusión de `como cerr` sin mes/meta/indicador; no absorber TIME.
- out_of_scope: RISK_FOCUS, PRIORITY, PERFORMANCE vs meta, Plaud, SQL, frontend, merge main.
- Done cuando: paráfrasis puras de §equivalentes llegan a CEL; `¿Qué tal estás?` no; `¿Cómo va el día de hoy?` no usa el pack madre; `cerramos el indicador` no es month_close.

STOP. No se implementó. No se abre esa tarea aquí.
