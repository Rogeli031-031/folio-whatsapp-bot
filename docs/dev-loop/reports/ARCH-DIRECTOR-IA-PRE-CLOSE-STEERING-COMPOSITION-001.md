# Reporte — ARCH-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001

```yaml
task_id: "ARCH-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001"
outcome: "DONE_PENDING_REVIEW"
mode: "ARCHITECTURE_READINESS_ONLY"
implementation: false
code_changes: false
test_changes: false
sql_changes: false
schema_changes: false
matrix_changes: false
determination: "READY_WITH_LIMITS"
selected_architecture: "B_shared_executive_cycle_composer"
selected_architecture_letter: "B"
selected_multi_plant: "B_multi_plant_portfolio"
selected_multi_plant_letter: "B"
selected_decision_needed: "C_structured_gaps_plus_gpt_wording"
selected_decision_needed_letter: "C"
selected_first_slice: "B_multi_plant_pre_close"
selected_first_slice_letter: "B"
authz_partial: "partial_plants_plus_partial_sections"
commitment_history: "MISSING_INFRASTRUCTURE"
scenario_history: "NOT_DEFENSIBLE"
what_if: "unsafe_as_official_forecast"
contract_gate: "first_slice_under_existing_contracts"
g2_required_for_first_slice: false
g3_required_for_first_slice: false
g2_required_for_commitment_or_scenario_store: true
actual_financial_in_pre_close: false
zone_financial_aggregate: false
architecture_pending_still_frozen: "ARCH-DIRECTOR-IA-PRE-MEETING-FINANCIAL-ACTUAL-001"
eval_003_N: 24
eval_003_rates_unchanged: true
canonical_intent_surface: "pre_meeting_brief"
composer: "shared executive-cycle composer invoked with cycle_mode=PRE_CLOSE"
council_path: "reserved via same composer + later FINAL/commitment slots"
live_copilot_path: "reserved; structured pack as baseline; not implemented"
next_task_proposed: "IMPL-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001"
next_task_authorized: false
next_task_executed: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
percentage_policy: "This architecture does not measure modules. 0.0 pp."
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001.md"
files_not_touched:
  - "docs/director-ia/"
  - "lib/"
  - "test/"
  - "sql/"
  - "server.js"
  - "frontend-dashboard/"
  - "package.json"
  - "lockfiles"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_CAPACIDADES_Y_FUENTES.md"
  - "docs/director-ia/FINANCIAL-ACTUAL-EVIDENCE-CONTRACT.md"
  - "docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PLAUD-EXECUTIVE-CYCLE-EVAL-003.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
secrets_check: "none"
human_decision_needed:
  - "G5 LOOP: HUMAN_APPROVER cierra esta tarea. NEXT_TASK no está autorizada ni ejecutada."
  - "52.5% no cambia (0.0 pp)."
  - "ARCH-DIRECTOR-IA-PRE-MEETING-FINANCIAL-ACTUAL-001 permanece congelada."
```

## 1. Executive verdict

**READY_WITH_LIMITS.**

El cuello de EVAL-003 no se cura metiendo `ACTUAL_FINANCIAL` en `pre_meeting`. Se cura con una **composición PRE_CLOSE** que, **antes** de la junta y solo con evidencia ya persistida, alinee:

`ACTUAL_COMMERCIAL` (to-date) · `TARGET_COMMITMENT` · `FORECAST` · acciones · reviewable · riesgos derivados · gaps tipados · `DECISION_NEEDED`

sin inventar `PROPOSED_INTERVENTION`, `HUMAN_COMMITMENT` ni `CLOSING_SCENARIO`.

Selecciones (exactamente una por eje):

| Eje | Letra | Nombre |
|---|---|---|
| Arquitectura canónica | **B** | composer compartido del ciclo ejecutivo |
| Multi-planta | **B** | portafolio multi-planta (sin total zonal financiero) |
| DECISION_NEEDED | **C** | gaps estructurados + wording GPT |
| First slice | **B** | PRE_CLOSE multi-planta (sin store ni what-if) |

El ciclo `OPEN_MONTH → PRE_CLOSE → CLOSED_NOT_FINAL → CLOSED_FINAL → COUNCIL_FINAL → POST_CLOSE_FOLLOWUP` se preserva. PRE_CLOSE conduce el cierre. COUNCIL_FINAL queda como camino futuro del **mismo** composer, no como otro dump.

`ARCH-DIRECTOR-IA-PRE-MEETING-FINANCIAL-ACTUAL-001` permanece **congelada**.

Matriz: **10.5 / 20 = 52.5%**. Delta **0.0 pp**.

NEXT_TASK (no autorizada, no ejecutada): **`IMPL-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001`**.

## 2. Evidence and frozen boundary

EVAL-003: junta 2026-08-25 Zona Provincia, PRE_CLOSE, N=24, cuello `pre_close_composition_missing`. Tasas 4.2% / 12.5% / 45.8% **no se recomputan**.

Hallazgo que este ARCH hereda y no reabre:

- Agosto abierto ⇒ `ACTUAL_FINANCIAL` de agosto = `NOT_FINAL`.
- `~632 mil` = `MEETING_STATEMENT` / escenario de sala, no actual.
- Reunión ≠ verdad.
- Meter julio FINAL en el brief de pre-cierre resuelve el cuello equivocado.

## 3. Architecture selection (A / B / C)

| | A `pre_meeting_brief` + `meeting_mode=PRE_CLOSE` | B composer compartido | C intent/composer privado PRE_CLOSE |
|---|---|---|---|
| Duplicar verdad | Alto: current/target/forecast ya viven en `month_close_result` | Bajo: un kernel de capas | Alto: tercer pack |
| Semántica temporal | Frágil: el mismo intent acabaría cargando FINAL (el error congelado) | Clara: `cycle_mode` elige capas legales | Clara, pero aislada |
| Consejo futuro | Contamina preparación con sello | Mismo composer, capas FINAL + slots de commitment | Requiere un cuarto intent |
| Follow-ups | Ya existen en pre_meeting | Superficie `pre_meeting_brief`; handoff a month_close / profile / AR / reviewable | Nuevo inherit |
| Reuso | Copia de loaders | Reusa loaders de month_close + pre_meeting | Copia |

**Selección: B.**

Forma:

1. **Composer** (objeto de composición, no intent de usuario): identidad `plant | portfolio` + `year` + `month` + `cutoff` + `cycle_mode`.
2. **`cycle_mode=PRE_CLOSE`**: capas legales del mes abierto. **Prohibido** `ACTUAL_FINANCIAL`.
3. **`cycle_mode=CLOSED_*` / futuro `COUNCIL_FINAL`**: el mismo kernel añade `ACTUAL_FINANCIAL` solo si hay FINAL del YYYY-MM pedido; más adelante slots de commitment/scenario/lesson si existe infraestructura.
4. **Superficie de chat PRE_CLOSE:** sigue siendo `pre_meeting_brief` (no se crea intent `pre_close`).
5. **Superficie de chat CLOSE/FINAL:** sigue siendo `month_close_result` (no se fusionan intents).
6. C queda rechazada: duplica verdad y rompe el camino a Consejo.
7. A queda rechazada como arquitectura canónica: `meeting_mode` solo, sin composer, empuja FINAL al pack de preparación.

Etiquetas de sección (`current`, `base_forecast`) son **roles de ritual**, no clases constitucionales nuevas. Clases de verdad del first slice:

| Sección | `truth_class` existente |
|---|---|
| current | `ACTUAL_COMMERCIAL` |
| target | `TARGET_COMMITMENT` |
| base_forecast | `FORECAST` |
| actions | acción persistida |
| reviewable | reviewable persistido |
| risks | `DERIVED_SIGNAL` |
| gaps | `INFORMATION_GAP` / limitation tipada |
| decision_needed | `EXECUTIVE_QUESTION` (no acción aprobada) |

No se legislan `PROPOSED_INTERVENTION`, `HUMAN_COMMITMENT`, `CLOSING_SCENARIO`, `ACTUAL_TO_DATE` como clases G2/G3.

## 4. Section contract (physical support)

Ninguna sección sin fuente. Las no soportadas se omiten o se marcan `UNSUPPORTED` / `MISSING_INFRASTRUCTURE`. No se rellenan con GPT.

| Sección candidata | ¿First slice? | Fuente física | Semántica |
|---|---|---|---|
| CURRENT | **Sí** | ARR mes calendario abierto, corte = última fecha ARR del YYYY-MM CDMX. `month_close_result` PARTIAL ya agrega `SUM(kg)` | `ACTUAL_COMMERCIAL` to-date. Ayer (`daily_executive_brief`) es **anexo**, no el current de PRE_CLOSE. IGF `venta_ton` **no** es current. |
| TARGET | **Sí** | `igf_meta.meta_lines.venta_ton` del YYYY-MM exacto, versión current, match empresa | `TARGET_COMMITMENT`. Sin fila = `TARGET_MISSING_FOR_PERIOD`. Sin carry-forward. |
| BASE_FORECAST | **Sí** | IGF latest operacional del mes abierto (`igf.compromiso_lines` stored) | `FORECAST`. Latest es aceptable **aquí** (prohibido como `ACTUAL_FINANCIAL`). No es commitment. No es escenario de Director IA. Campos **stored**, no recálculo runtime. |
| RISK | **Sí** | Solo señales de la tabla §6 | `DERIVED_SIGNAL`. No causa. |
| ACTIONS | **Sí** | Action Register (board / vencidas) | Acción persistida ≠ compromiso de cierre. |
| REVIEWABLE | **Sí** | `igf_reviewable_supports` mes abierto | reviewable ≠ cancelar ≠ ahorro ≠ recorte aprobado. |
| RECONCILIATION_GAPS | **Parcial** | ARR `venta_ton` vs IGF `venta_ton` (dos números, sin ganador). Finance vs ARR **solo** existe con FINAL → **fuera** de PRE_CLOSE | No elegir ganador. |
| DATA_QUALITY_GAPS | **No (canal)** | No hay detector de canal mal clasificado (caso Acapulco) | `MISSING_INFRASTRUCTURE` para canal. No crear clase. |
| INFORMATION_GAPS | **Sí** | Ausencia tipada: fuente caída, target missing, forecast missing, actual no FINAL | gap ≠ causa. missing ≠ 0. |
| DECISION_NEEDED | **Sí** | Derivado **solo** de gaps/riesgos tipados | Pregunta ejecutiva, no decisión inventada. |
| PROVENANCE | **Sí** | source + period + version_id/number + cutoff por sección | `created_at` de IGF = upload, no as-of de negocio. |
| INTERVENTION / COMMITMENT / SCENARIO | **No** | no hay store | omitir. Limitation `COMMITMENT_HISTORY_MISSING` / `SCENARIO_HISTORY_NOT_DEFENSIBLE`. |
| ACTUAL_FINANCIAL | **No** | G3 FINAL-only; Index: pre_meeting **PENDING** | PRE_CLOSE opera antes del sello. |

### Current — grano y corte

| Campo | Regla |
|---|---|
| Periodo | YYYY-MM abierto `America/Mexico_City` |
| Grano | planta autorizada; en portafolio, una fila por planta |
| Venta | kg ARR del 1 al `cutoff_date` inclusive; mostrar también ton |
| `cutoff_date` | `max(fecha)` ARR del mes, no “hoy” si ARR está atrasado |
| Mix | CASA / COMISIONISTA del mismo corte (ya en month_close) |
| Descuento | ponderado ARR del mes to-date, si existe |
| Prohibido | proyectar días restantes como actual; usar IGF venta como actual |

### Target — forma

`igf_meta` del mismo YYYY-MM / empresa. Unidad ton; conversión kg explícita (ya resuelta en ARCH/IMPL de month_close). `igf_metahg` no sustituye `venta_ton`.

### Base forecast — forma y campos materiales

IGF latest del mes abierto. Materialidad EVAL-003 (no dump de catálogo):

`venta_ton`, `margen_kg`, `com_desc_kg`, `hg_kg` / `hg_pct`, `gasto_kg`, `gtos_apoyos_corp_kg`, `inversiones_kg`, `util_oper_importe`, `resultado_final_importe`.

Stored. `formula_role` es referencia, no recálculo (contrato IGF composition). Etiqueta obligatoria: FORECAST, no FINAL, no “tendencia de sala”, no escenario intervenido.

## 5. Multi-plant selection (A / B / C / D)

La junta real fue Zona Provincia, planta por planta, más un escenario regional de sala.

| | A una planta | B portafolio | C agregado zonal + drilldown | D solo futuro |
|---|---|---|---|---|
| Representa EVAL-003 | No (fuerza 6 briefs) | Sí: misma lectura planta a planta | Invita a sumar un P&L zonal que la sala inventó como escenario | Aplaza el cuello |
| Authz | Ya existe | Intersección planta a planta | Riesgo de filtrar totales con planta denegada | — |
| Agregación | N/A | Flags/conteos, no suma financiera | `$/kg` no es sumable; filas IGF incompletas; +632 mil no es IGF | — |

**Selección: B** (first slice). **C rechazada** para first slice: no hay modelo zonal financiero defendible. El Excel de dashboard puede totalizar Provincia; eso **no** autoriza un `ACTUAL`/`FORECAST` regional en Director IA. **D rechazada:** la junta fue multi-planta. **A** queda como **submodo**: “prepárame Puebla”.

### Agregación permitida vs prohibida

| Operación | First slice |
|---|---|
| Listar plantas autorizadas ∩ membresía zona | Sí |
| Por planta: current / target / forecast / flags | Sí |
| Contar plantas con forecast negativo, target missing, acciones vencidas | Sí (conteo de flags) |
| Sumar `resultado_final_importe` / inventar +632 mil zonal | **No** |
| Promediar `$/kg` entre plantas | **No** |
| Si falta `arr.provincia_plants` | Limitation `ZONE_MEMBERSHIP_UNAVAILABLE`. **No** caer a “todas las empresas IGF = Provincia” (el fallback del Excel de dashboard **no** es seguro aquí). |

Membresía física auditada: tabla `arr.provincia_plants` (usada por ARR daily, trend, diagnosis). Env `ARR_ZONA_PROVINCIA` es operativo de export, no contrato de Director IA.

## 6. Risk / gap semantics

Solo señales derivables. Sin claims causales. Sin recomendación de negocio hardcodeada.

| Señal candidata | ¿Defendible? | Cómo | Prohibido afirmar |
|---|---|---|---|
| forecast below target | **Sí** | IGF `venta_ton` < `igf_meta.venta_ton`, mismo YYYY-MM/planta | “no vamos a llegar” |
| resultado proyectado negativo | **Sí** | IGF `resultado_final_importe` < 0, clase FORECAST | “pérdida real de 15 M” |
| deterioro comercial | **Sí, acotado** | `commercial_trend` `ols.direction` + movers; window 90d ≠ mes de cierre | causa (cliente, competencia) |
| clientes perdidos | **Sí, acotado** | month_close: kg prior > 0 y kg current = 0 | por qué se fueron |
| acciones vencidas | **Sí** | AR | que el vencimiento cause el cierre |
| reviewable presente | **Sí** | hay folios reviewable | “hay que quitar este gasto” |
| missing target | **Sí** | `TARGET_MISSING_FOR_PERIOD` | meta de otro mes |
| valores no reconciliados | **Parcial** | ARR vs IGF venta, ambos visibles | ganador; Finance vs ARR en PRE_CLOSE |
| alta dependencia del forecast de días restantes | **Sí, aritmética** | `forecast_venta − actual_to_date` y días calendario restantes | que esas toneladas ocurrirán |

Gaps tipados (no causa):

`TARGET_MISSING_FOR_PERIOD` · `FORECAST_MISSING_FOR_PERIOD` · `SOURCE_UNAVAILABLE` · `ACTUAL_FINANCIAL_NOT_FINAL` (informativo; no se carga actual) · `ZONE_MEMBERSHIP_UNAVAILABLE` · `COMMITMENT_HISTORY_MISSING` · `SCENARIO_HISTORY_NOT_DEFENSIBLE` · `WHAT_IF_UNSUPPORTED` · `CHANNEL_DATA_QUALITY_UNSUPPORTED` · `CROSS_PLANT_SECTION_RESTRICTED`

Una fuente caída **no** mata el brief (`safeLoad` / partial). Abort solo si **cero** plantas autorizadas o **todas** las secciones críticas abortan authz (mismo espíritu que pre_meeting).

## 7. DECISION_NEEDED (A / B / C)

Propósito: dejar preguntas para la junta **sin** inventar decisiones.

| | A GPT inventa preguntas desde gaps | B plantillas deterministas solas | C gaps tipados + wording GPT |
|---|---|---|---|
| Inventar decisión | Alto | Bajo | Bajo si el tipo está cerrado |
| Materialidad | Variable | Rígida | Alta: el tipo nace del gap; el texto se adapta |
| Encaje actual | Viola addendum de pre_meeting | Seguro, pobre | Ya permitido: “Conviene estar preparado para explicar…” |

**Selección: C.**

Reglas:

1. El runtime emite un set cerrado de `decision_kind` **solo** si el gap/riesgo tipado existe.
2. GPT puede **redactar** la pregunta. No puede añadir kinds, dueños, montos, intervenciones ni compromisos.
3. Lenguaje: “Conviene resolver en la junta… / Falta evidencia para afirmar…”. Prohibido: “El Consejo preguntará… / Hay que dar +40 t / Puebla va por 1,177”.

Kinds permitidos en first slice (ejemplos ligados a evidencia, no phrasebook de producción):

| `decision_kind` | Trigger físico | Ejemplo de pregunta (no texto fijo) |
|---|---|---|
| `VOLUME_DEFENDABLE` | forecast ≫ actual to-date o dependencia de días restantes | ¿Qué volumen es defendible? |
| `EXPENSE_STILL_OPEN` | reviewable abierto o gap de gasto | ¿Qué gasto sigue sin validar? |
| `RECONCILE_DISCREPANCY` | ARR vs IGF venta ambos presentes y distintos | ¿Qué discrepancia hay que reconciliar? |
| `TARGET_ABSENT` | `TARGET_MISSING_FOR_PERIOD` | ¿Contra qué meta se conduce este mes? |
| `ACTION_OWNER` | acción vencida sin resultado | ¿Quién cierra esta acción? |
| `FORECAST_NEGATIVE` | IGF resultado < 0 | ¿Qué hay que mover para el cierre? (sin proponer la palanca) |

No hay kind `APPROVE_INTERVENTION` ni `CONFIRM_COMMITMENT` hasta que exista store.

## 8. Commitment-history status

Audit de candidatos:

| Candidato | ¿Persiste “Puebla va por 1,177”? |
|---|---|
| Action Register | No. Trabajo asignado. |
| Bitácora | No. Visita / nota, no commitment de cierre. |
| Plaud | Excluido. `MEETING_STATEMENT` ≠ verdad. |
| Persistent memory | Work items / requery. No. |
| `igf.compromiso_lines` | FORECAST uploaded. El nombre “compromiso” es trampa. |
| `igf_meta` | Meta gerencial del mes, no la intervención del 25-ago. |

**MISSING_INFRASTRUCTURE.**

Crítico para `COUNCIL_FINAL`. First slice **declara** la limitation. No implementa store. Persistirlo exigiría **G2/G3**. No se hace en silencio.

## 9. Scenario-history status

Versiones IGF: latest / históricas / SUPERSEDED. `created_at` = upload. `financial_state` FORECAST/FINAL/SUPERSEDED sirve para actual financiero, **no** para “escenario aprobado en junta”.

No hay sello “pre-intervención vs post-intervención del 2026-08-25”.

**NOT_DEFENSIBLE.**

No inventar as-of. Overlay reviewable es live en memoria, no historial.

## 10. What-if readiness

Pregunta de prueba: “Si doy 10 centavos y recupero 15 t, ¿cómo quedo?”

| Requerimiento | Veredicto |
|---|---|
| `existing_formula_reusable` | **Parcial.** `recalcularUtilYResultado` + overlay de **folios** reviewable. No cubre desc+volumen+HG de conducción. |
| `new_model_required` | Sí, para esa pregunta. |
| `human_input_required` | Sí (los 10 centavos y las 15 t). |
| `new_contract_required` | Sí. What-if ≠ FORECAST oficial ≠ actual. |
| `unsafe` | **Sí** si se presenta como forecast oficial, actual o causa. |

**Fuera del first slice.** Follow-up what-if → `WHAT_IF_UNSUPPORTED`. No calcular.

## 11. Data quality (Acapulco)

| Discrepancia | ¿Hoy? |
|---|---|
| ARR venta vs IGF venta (misma planta/mes) | Sí, mostrar ambos. No ganador. |
| Finance `venta_ton` vs ARR | Solo con `ACTUAL_FINANCIAL` FINAL. **Fuera** de PRE_CLOSE. |
| Canal mal clasificado / estaciones de terceros | **No.** Infra nueva. No crear clase. |
| Dos cálculos humanos coinciden | No es detector. `agreement != truth` se documenta; no se opera. |

## 12. Authz

Principio: **intersección** de permisos por planta y por sección. Fail closed contra leakage.

| Actor | Portafolio PRE_CLOSE |
|---|---|
| ZP + aliases / AD | Plantas de `arr.provincia_plants` que resuelvan a `planta_id` autorizado (ALL_PLANTS en la práctica ZP/AD) |
| GG | **Solo** `plantas_permitidas` ∩ zona. Si pide “Zona Provincia” y no ve todas: portafolio parcial + limitation. **No** rellenar las que no ve. |
| Resto | Deny. Brief vacío / restricted. No inventar ausencia de negocio. |

Una planta no autorizada **no aparece** (ni en totales, ni en “las demás”).

Comportamiento parcial (selección):

- Nivel portafolio: **plantas parciales** (una planta denegada no destruye las autorizadas).
- Nivel planta: **secciones parciales** (`safeLoad`).
- Cero plantas autorizadas: **fail closed** el brief.

`acceso_igf_forecast` **no** concede `ACTUAL_FINANCIAL`. PRE_CLOSE no lo pide.

## 13. Routing and follow-ups

Superficie: `pre_meeting_brief`. `cycle_mode=PRE_CLOSE` cuando la pregunta es preparación / pre-cierre / “cómo vamos **para cerrar**” el mes **abierto**.

| Ejemplo (no phrasebook) | Destino |
|---|---|
| Prepárame para el cierre de Zona Provincia | PRE_CLOSE + scope PORTFOLIO |
| ¿Qué plantas me preocupan para el cierre? | PRE_CLOSE PORTFOLIO |
| ¿Dónde estamos peor contra la meta? | PRE_CLOSE (target vs forecast/current) |
| ¿Qué debo resolver en la junta de hoy? | PRE_CLOSE `decision_needed` |
| Prepárame para la junta de Puebla | PRE_CLOSE + scope ONE_PLANT |
| ¿Cómo vamos para cerrar agosto? | PRE_CLOSE (abierto). **No** daily. **No** FINAL. |
| ¿Cómo cerramos el mes? / mes cerrado / FINAL | `month_close_result` (handoff; no reusar pack abierto como sello) |

`meeting_mode` / `cycle_mode` **basta** si el composer existe. No hace falta intent nuevo. El cue actual `pre-cierre` ya enciende `pre_meeting` y **bloquea** month_close: se conserva; el composer **añade** current/target al brief de preparación en vez de redirigir a FINAL.

Follow-ups (requery; no truth stale):

| Follow-up | Ruta |
|---|---|
| ¿Por qué Puebla está mal? | inherit PRE_CLOSE drilldown de esa planta. Sin causa si no hay evidencia. |
| ¿Qué cliente movió la venta? | `client_profile` / commercial |
| ¿Qué gasto puedo quitar? | `igf_reviewable_supports`. What-if de recorte **unsupported** salvo overlay ya existente y etiquetado hipotético. |
| ¿Qué acción está vencida? | capability de acciones |
| ¿Y contra la meta? | inherit; sección target |
| ¿Qué pasa si doy 10 centavos? | `WHAT_IF_UNSUPPORTED` |

## 14. Council compatibility (non-negotiable)

Director IA **no** termina en PRE_CLOSE.

El composer reserva identidad y fronteras para que un `COUNCIL_FINAL` futuro pueda preguntar:

`TARGET` vs `FORECAST` vs `COMMITMENT` vs `FINAL` vs `ACTION` / `LESSON`

| Comparación | ¿Hoy? |
|---|---|
| FINAL vs TARGET vs FORECAST oficial | **SUPPORTED_AFTER_FINAL** vía `month_close_result` + `ACTUAL_FINANCIAL` |
| vs COMMITMENT de junta (“1,177”, “+40”) | **MISSING_INFRASTRUCTURE** — declararlo, no fingirlo |
| vs escenario intervenido | **NOT_DEFENSIBLE** |
| acciones abiertas | Action Register |
| lección | no hay store |

Slots futuros en el objeto (vacíos en first slice): `commitment_ref`, `scenario_ref`, `lesson_ref` = `null` + limitation. No persistir el pack PRE_CLOSE como verdad (el brief actual es requery). Consejo futuro **reconsulta** el composer con `cycle_mode=COUNCIL_FINAL` y el YYYY-MM ya FINAL.

## 15. Live-meeting copilot compatibility

Reservado. No se implementa runtime en vivo ni hardware.

El pack PRE_CLOSE debe ser **estructurado por campo** (`truth_class`, valor, source, cutoff) para que un copilot futuro compare lo hablado contra ARR / target / forecast / actions / gaps.

Ejemplos futuros (no de este IMPL):

- el número dicho ≠ ARR to-date;
- el hablante cita escenario, no actual;
- emerge un compromiso nuevo (hoy solo se podría marcar `COMMITMENT_HISTORY_MISSING`, no grabarlo);
- discrepancia de calidad (hoy solo ARR vs IGF venta).

Baseline futuro = **requery del mismo composer**, no un snapshot inventado como verdad.

## 16. First slice (A / B / C / D)

| | A single-plant | B multi-plant PRE_CLOSE | C B + commitment/scenario store | D B + what-if |
|---|---|---|---|---|
| Materialidad EVAL-003 | Insuficiente | La junta fue portafolio | Store no existe; G2/G3 | Unsafe |
| Tamaño | Más chico, cuello intacto | Mínimo que representa la junta | Grande y fuera de contrato | Grande y fuera de contrato |

**Selección: B.**

Incluye, por planta autorizada del portafolio (o una planta si así se pide):

current · target · base_forecast · risks derivados · actions · reviewable · reconciliation ARR-vs-IGF si ambos existen · information_gaps · decision_needed · provenance

No incluye: store de commitment/scenario, what-if de desc+t, agregado financiero zonal, `ACTUAL_FINANCIAL`, Plaud, IES, RE, UI.

Single-plant permanece como scope del mismo composer.

## 17. Contract gate

| Pregunta | Veredicto |
|---|---|
| ¿El first slice cabe bajo contratos actuales? | **Sí.** Compone loaders ya existentes (ARR, `igf_meta`, IGF, AR, reviewable, trend). No nuevas clases constitucionales. No IES. No `04`/`05`. |
| ¿Consume `ACTUAL_FINANCIAL` en pre_meeting? | **No.** Index/EKE: consumo en pre_meeting **PENDING**. G3: FINAL-only. First slice respeta ambos. |
| ¿Commitment/scenario persistence? | **G2/G3 requeridos.** Fuera del slice. |
| ¿What-if oficial? | Nuevo contrato. Fuera. |
| ¿Nueva fila de matriz? | **No.** `pre_meeting_brief` ya existe sin fila nueva. |
| ¿Editar Constitución / EKE / Capabilities ahora? | **No.** Sync documental, si aplica, es otra tarea. |

Gate del first slice: **ninguno nuevo**.  
Gate de stores futuros: **G2/G3**. No implementar en silencio.

## 18. EVAL-003 mapping (rates unchanged)

N=24 y tasas históricas **intactas**. Lo siguiente es **estimación de diseño**, no métrica nueva.

| Familia EVAL-003 | ¿El slice B las anticipa/prepara? |
|---|---|
| CURRENT_STATE (P1, P5) | Sí, como `ACTUAL_COMMERCIAL` + FORECAST HG/desc/margen etiquetados |
| BASE_FORECAST (P2, T1) | Sí, IGF latest como FORECAST, no como “1,126 de sala” |
| TARGET (no estaba en N) | Sí, si `igf_meta` existe; gap si falta |
| INTERVENTION / CLOSING_SCENARIO (P3, T2, T3, A1, Q1, Z3, W1, W3) | **Siguen unsupported** |
| FINANCIAL_RESULT regional 15 M (Z1) | Parcial: resultado FORECAST negativo, no actual 15 M |
| INTERVENTION “qué mejorar” (Z2) | Preparable como `FORECAST_NEGATIVE` + decision_needed, sin palanca |
| EXPENSE (P6, Q2, W2) | Gap / reviewable / overlay hipotético de folio |
| DATA_QUALITY / RECONCILIATION canal (A2, A3) | Siguen unsupported |
| COMMITMENT (S1, M2) | M2: decision_needed de volumen. S1: limitation de store |
| RISK / CLIENT (M1, M3) | M1 sí (trend/movers). M3 perfil, no número en vivo |
| WHAT_IF W1/W3 | Unsupported |

El slice mueve **preparación de conducción** (current/target/forecast/gaps/decision). No convierte la junta en contestable al 100%. No se publican tasas nuevas.

## 19. Cycle preservation

```text
OPEN_MONTH          daily / trend / IGF
PRE_CLOSE           este composer (first slice B)
CLOSED_NOT_FINAL    month_close PARTIAL + financial.actual NOT_FINAL
CLOSED_FINAL        month_close + ACTUAL_FINANCIAL si FINAL
COUNCIL_FINAL       mismo composer + FINAL + slots futuros commitment/lesson
POST_CLOSE_FOLLOWUP AR ahora; lesson store futuro
```

Trazabilidad deseada: `TARGET → FORECAST → INTERVENTION → COMMITMENT → FINAL → LESSON → ACTION`.  
First slice materializa **TARGET** y **FORECAST** (+ actual comercial to-date y ACTION). El resto se declara ausente. Meeting statement ≠ truth.

## 20. Limits that keep this READY_WITH_LIMITS

1. Sin historial de commitment/scenario.
2. Sin what-if de conducción.
3. Sin P&L zonal.
4. Sin `ACTUAL_FINANCIAL` en PRE_CLOSE.
5. Sin detector de canal Acapulco.
6. IGF latest ≠ as-of de negocio.
7. Portafolio GG puede ser subconjunto de la zona.
8. Brief no se persiste como verdad.

Ningún límite es contradicción contractual. Ninguno exige STOP/BLOCKED.

## 21. Matrix impact

| | |
|---|---|
| Antes | 10.5 / 20 = 52.5% |
| Después | 10.5 / 20 = 52.5% |
| Delta | **0.0 pp** |

## 22. Exactly one NEXT_TASK

**`IMPL-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001`**

Implementar first slice **B**: composer compartido + `pre_meeting_brief` en `cycle_mode=PRE_CLOSE` + portafolio multi-planta autorizado (o una planta) con current / target / forecast / risks / actions / reviewable / gaps / decision_needed / provenance.

No store. No what-if. No ACTUAL_FINANCIAL. No Plaud. No IES. No matriz.

**No autorizada. No ejecutada.**

STOP. No commit. No push. No merge.
