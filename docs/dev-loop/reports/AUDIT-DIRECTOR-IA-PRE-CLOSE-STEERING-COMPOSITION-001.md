# AUDIT-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001"
outcome: "DONE_PENDING_REVIEW"
verdict: "PASS_WITH_FINDINGS"
mode: "AUDIT / EVALUATION"
implementation: false
code_changes: false
test_changes: false
architecture_source: "ARCH-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001"
implementation_source: "IMPL-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001"
plaud_evidence: "AUDIT-DIRECTOR-IA-PLAUD-EXECUTIVE-CYCLE-EVAL-003"
question_a: "IMPL cumple el núcleo de ARCH B / first slice B"
question_b: "Sí habría preparado materialmente mejor al Director; no habría anticipado lo nacido en sala"
focal_tests: "30/30 pass, 0 fail, 0 skipped"
director_ia_suite: "1058/1058 pass, 0 fail, 0 skipped"
git_diff_check: "clean (solo CURRENT_TASK + este reporte)"
impl_intact: true
impl_committed: false
next_task_proposed: "FIX-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001"
next_task_authorized: false
next_task_executed: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
secrets_check: "none"
```

## 1. Executive verdict

**PASS_WITH_FINDINGS.**

**A) Arquitectura.** La implementación cumple el núcleo de ARCH B / first slice B: existe un composer compartido (`lib/director-ia-executive-cycle-composer.js`), PRE_CLOSE lo consume, el portafolio es planta a planta, CURRENT / TARGET / BASE_FORECAST están separados, AUTHZ ocurre antes de cargar evidencia de negocio, no hay `ACTUAL_FINANCIAL` en el pack, no hay commitment/scenario/what-if como hechos, y el estado no persiste el evidence pack.

**B) Junta Plaud 2026-08-25.** Si este PRE_CLOSE hubiera corrido **antes** de la junta, el Director habría llevado actual-to-date, target, forecast oficial, riesgos tipados, acciones, reviewable, gaps y preguntas de decisión. No habría llevado (ni debido llevar) el 1,177 de Puebla, el +40 de Acapulco, el +632 regional, el recorte de Querétaro, ni los what-if de sala. Eso es correcto. El cuello `pre_close_composition_missing` queda estructuralmente resuelto; el enrutado y el follow-up de portafolio aún pueden desviar al Director del pack.

No hay hallazgo CRITICAL demostrado (leak cross-plant, forecast-como-actual, `ACTUAL_FINANCIAL` en PRE_CLOSE, commitment/scenario inventado **en el pack**).

Hay defectos MAJOR corregibles antes de consolidar. Por eso no es PASS. No es FAIL: el núcleo de verdad/authz se sostiene y EVAL-003 sí se prepara materialmente en las capas que el runtime podía saber.

## 2. Scope and evidence

Auditoría independiente. El reporte IMPL no se usó como prueba.

Inspección física:

- `lib/director-ia-executive-cycle-composer.js` (completo)
- `lib/director-ia-planner.js` (orden de intents)
- `lib/director-ia-chat.js` (rama PRE_CLOSE)
- `lib/director-ia-conversation-state.js` (cycle_mode / portfolio_scope / previous_frame)
- `lib/director-ia-capabilities.js` (`isPreCloseQuery` divergente)
- `lib/director-ia-tools.js`
- loaders: `director-ia-client-profile.js` (`queryMonthlySales`), `director-ia-igf-arr.js` (`loadIgfCommitSnapshot`), `igf-meta-excel` vía month-close helpers, `director-ia-pre-meeting.js` (acciones), `director-ia-igf-reviewable-supports.js`, `director-ia-commercial-trend.js`, `director-ia-month-close-result.js` (solo helpers; no el composer de cierre)
- `test/director-ia-pre-close-steering.test.js`
- `docs/dev-loop/reports/ARCH-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001.md`
- `docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PLAUD-EXECUTIVE-CYCLE-EVAL-003.md` (muestra N=24 y tasas históricas **no modificadas**)

Probes de runtime (node, sin persistir archivos):

- matcher + `planDirectorIaQuestion` sobre las frases del ARCH y regresiones
- `composeExecutiveCycle` follow-up, cutoff live, current vacío
- reejecución de tests

Código IMPL: **READ ONLY**. No se añadió test de auditoría (AUDIT es read-only para código). Huecos de test se documentan.

## 3. Physical execution path

1. `askDirectorIa` planea. Si `isPreCloseQuestion(q)` gana el planner, intent = `pre_meeting_brief` / evidence `pre_close_compose`.
2. Chat: `usePreClose` si `isPreCloseQuestion(q)` **o** inherit con `cycle_mode=PRE_CLOSE` y `parent_intent=pre_meeting_brief`.
3. `composeExecutiveCycle(pool, planta_id, req, opts)`:
   - aborta si `cycle_mode !== PRE_CLOSE`
   - aborta 403 si authz `NONE` o cero plantas autorizadas
   - lista catálogo (`arr.provincia_plants` ⋈ `public.plantas` o lista inyectada)
   - `filterAuthorizedPlants` **antes** de `loadOnePlantBlock`
   - por planta autorizada: ARR current, `igf_meta` target, IGF latest forecast, Action Register, reviewable, trend (salvo skip)
   - deriva risks / gaps / `decision_needed`
4. `buildPreClosePrompt` proyecta el pack a GPT. El pack **no** se guarda como evidencia.
5. Estado: `cycle_mode`, `portfolio_scope`, `period`, `parent_intent=pre_meeting_brief`, `last_evidence_bundle_type=pre_meeting_brief`.

No hay HTTP interno. No hay store nuevo. No hay SQL de evidencia privado más allá de reusar loaders y un SELECT de catálogo de zona.

Camino clásico **distinto**: `"Dame un pre-cierre ejecutivo."` → `pre_meeting_compose` → `loadPreMeetingBriefForChat` (sin composer PRE_CLOSE).

## 4. Shared composer audit

El composer existe y PRE_CLOSE lo consume.

| Riesgo ARCH | Hallazgo físico |
|---|---|
| Duplicate truth | **Parcial.** `isPreCloseQuestion` (composer/planner/chat) ≠ `isPreCloseQuery` (capabilities). Dos matchers. |
| Internal HTTP | No. |
| SQL privado innecesario | Catálogo de zona sí (join `provincia_plants`/`plantas`). Evidencia ARR/IGF/meta/AR reusa loaders. |
| Store oculto | No. |
| Dependencia circular | No. Composer → capabilities / client-profile / igf-arr / month-close **helpers** / pre-meeting actions. Esos módulos no requieren al composer. Planner/chat sí requieren al composer. |
| Reutilizable por COUNCIL_FINAL | Estructura reservada (`future_chain`, refs nulos, `cycle_mode`). Hoy `cycle_mode !== PRE_CLOSE` aborta. No afirma que Consejo exista. No cierra el camino; tampoco lo implementa. |

`month_close_result` se requiere solo por `aggregateSales`, `pickCurrentMetaVersion`, `toTon`, etc. El composer de cierre y `loadFinancialActualEvidence` **no** se invocan. El grafo del módulo se carga; el pack PRE_CLOSE no recibe `financial.actual`.

## 5. Routing audit

Matcher canónico: `isPreCloseQuestion`. Planner lo evalúa **después** de daily / commercial_trend / client_profile y **antes** de month_close / pre_meeting clásico.

### Frases pedidas (semántica, no inclusión literal)

| Pregunta | `isPreCloseQuestion` | Intent planner | Destino real |
|---|---|---|---|
| Prepárame para el cierre de Zona Provincia | true | `pre_meeting_brief` / `pre_close_compose` | PRE_CLOSE PORTFOLIO |
| ¿Cómo vamos para cerrar agosto? | true | PRE_CLOSE | PRE_CLOSE |
| ¿Qué plantas me preocupan para el cierre? | true | PRE_CLOSE | PRE_CLOSE PORTFOLIO |
| ¿Qué debo resolver en la junta de hoy? | **true** | **`daily_executive_brief`** | **Daily, no PRE_CLOSE** |
| ¿Dónde estamos peor contra la meta? | true | PRE_CLOSE | PRE_CLOSE (también dispara `isMonthCloseQuestion`; PRE_CLOSE gana) |
| Prepárame para la junta de Puebla | true | PRE_CLOSE | PRE_CLOSE ONE_PLANT |

La cuarta frase es ejemplo explícito del ARCH (`DECISION_NEEDED`). Físicamente la roba `isDailyExecutiveBriefQuestion` porque contiene `hoy` + `deb`. Chat nunca entra a la rama PRE_CLOSE si el intent no es `pre_meeting_brief`. **MAJOR.**

### Regresión

| Pregunta | Resultado |
|---|---|
| ¿Cómo va IGF? | `igf_status` (correcto) |
| ¿Cómo vamos este mes? | `unknown` / `no_rule_matched` (no PRE_CLOSE, no month_close) |
| ¿Cómo cerramos contra la meta? | `month_close_result` (correcto) |
| Dame un pre-cierre ejecutivo. | `pre_meeting_compose` clásico, **no** composer |
| ¿Cómo vamos en casa y comisionistas? | `commercial_trend` (correcto) |
| ¿Cómo va el cliente Arturo? | `unknown` (no se comió PRE_CLOSE) |

### Falsos positivos / negativos

- **FN material:** `"¿Qué debo resolver en la junta de hoy?"` → daily.
- **FN menor:** `"¿Cómo vamos este mes?"` no es PRE_CLOSE. El ARCH ancla el cue en **para cerrar**; no es violación contractual dura, sí hueco de uso.
- **FN de superficie:** el cue histórico `pre-cierre` no consume el composer. ARCH dijo que el composer **añade** current/target al brief de preparación y que PRE_CLOSE aplica a preparación / pre-cierre. IMPL conservó el loader viejo. **MAJOR.**
- **FP:** `"junta de gerencia"`, `"cierre de inventario"` → PRE_CLOSE (cláusula `junta|cierre` + `de`, sin ser `de cierre` / `de mes`).
- `"cierre de agosto"` es PRE_CLOSE y también month_close; gana PRE_CLOSE. Aceptable en mes abierto.

`isPreCloseQuery` (capabilities) es más estrecho: `"Prepárame para la junta de Puebla"` es `false` ahí y `true` en el composer. El planner usa el composer, así que esa frase sí entra. La allowlist de dominio no es la fuente de routing.

## 6. Multi-plant / authz audit

Selección física: **B** portafolio planta a planta. Sin total zonal.

| Actor | Scope | Comportamiento demostrado |
|---|---|---|
| ZP | `ALL_PLANTS` | Pack con plantas autorizadas del catálogo; `Secreta` (id 99) no aparece |
| AD | `ALL_PLANTS` | Igual. No se aplica `assertClientProfileAccess` (solo si scope ≠ ALL_PLANTS) |
| GG | `ASSIGNED_PLANTS` | Solo `plantas_permitidas`. Pedir Puebla sin permiso → abort 403. Pedir zona con [3] → solo Morelos; counts=1; no “Puebla”/“Acapulco”/“Secreta” en JSON |
| GA / GV / resto | `NONE` | 403 antes de cargar plantas |

Intentos de rotura:

| Ataque | Resultado |
|---|---|
| Query de planta no autorizada (evidencia ARR/IGF/AR) | No. `filterAuthorizedPlants` + `canAccessPlant` en `loadOnePlantBlock`. Si el bloque no pasa, `null` y no entra al pack. |
| Nombre filtrado después de cargar evidencia | No. La planta no autorizada no se carga. |
| Conteo que revele no autorizadas | `portfolio_counts` solo sobre `plants` del pack. |
| Gap que revele existencia ajena | Gaps llevan `plant_id` del bloque autorizado. |
| Resumen GPT / provenance con planta ajena | El prompt lista `authorized_plant_ids` y bloques de `assembled.plants`. |
| Mezcla de evidencia entre plantas | Un `loadOnePlantBlock` por identidad; maps `*ByPlant[planta_id]`. |

**AUTHZ temprano para evidencia: sí.** Fail-closed si cero plantas.

Observaciones (no leak):

- `defaultListPortfolioPlants` consulta **todo** el catálogo de zona (id/nombre/clave) **antes** del filtro. No son filas ARR/IGF. Los nombres no autorizados no salen en el pack.
- AD = ALL_PLANTS según ARCH; ignora `plantas_permitidas` de otros módulos.
- GG con zona incompleta no emite limitation `PORTFOLIO_PARTIAL`. No rellena plantas. **MINOR.**

## 7. CURRENT audit

Fuente física: `queryMonthlySales` → `arr.ventas_diarias_cliente` (`SUM(kg)` por mes/cliente/canal, `fecha` entre bounds del YYYY-MM) + `aggregateSales`. Clase: `ACTUAL_COMMERCIAL`.

Demostrado en tests inyectados: Puebla `venta_ton=863` ≠ forecast `1126` ≠ target `1200`.

| Contrato ARCH | Runtime |
|---|---|
| Venta actual-to-date | Sí, agregado ARR del mes. Bounds = 1..último día de mes. Días futuros vacíos no suman. |
| Planta correcta | Códigos vía `resolvePlantCodes` / nombre. |
| Periodo correcto | `openYearMonth` / hoy CDMX. |
| CURRENT ≠ FORECAST | Sí. Clases y números distintos. |
| `cutoff_date` = `max(fecha)` ARR | **No en el path live.** `queryMonthlySales` no devuelve fecha. `queryCutoff` es opcional y chat **no** lo pasa. Probe sin `defaultCutoff`: `cutoff=null`. Tests inyectan `2026-08-24`. |

Daily (ayer) no es current. IGF `venta_ton` no es current.

ARR comercial y IGF/forecast **no se colapsan**. Si discrepan, gap `ARR_VS_IGF_VENTA` conserva ambos.

Hallazgo: filas vacías → `current.status="OK"` con `venta_ton=null` (no `SOURCE_UNAVAILABLE`). Solo el token `"error"` o un throw marca fallo de fuente. **MINOR.**

## 8. TARGET audit

Fuente: `igf_meta` (`listMetaVersions` + `pickCurrentMetaVersion` exige `is_current === true` + `pickMetaRowForPlant`). YYYY-MM exacto del mes abierto.

- Sin fila / `venta_ton` no finito → `TARGET_MISSING_FOR_PERIOD`, `venta_ton=null`. No cero. No forecast. No carry-forward (no hay fallback a otro mes).
- Morelos en el fixture: missing + `TARGET_ABSENT`.
- TARGET ≠ FORECAST demostrado (1200 vs 1126).

## 9. BASE_FORECAST audit

Fuente: `loadIgfCommitSnapshot` → `igf.versions` (`plant_code='GLOBAL'`, year/month) `ORDER BY version_number DESC LIMIT 1` + `igf.compromiso_lines`.

**Qué significa “latest” físicamente:** la versión de **mayor `version_number`** de ese YYYY-MM. **No** filtra `financial_state`. Si existiera una versión FINAL con número más alto, se tomaría. En mes abierto lo típico es el último upload operacional.

| Campo pack | Valor |
|---|---|
| label / section_role | `BASE_FORECAST` |
| truth_class | `FORECAST` |
| No ACTUAL / FINAL / COMMITMENT / CLOSING_SCENARIO | Sí, en pack y prompt |

Campos proyectados (`FORECAST_FIELDS`): `venta_ton`, `margen_kg`, `com_desc_kg`, `hg_kg`, `hg_pct`, `gasto_kg`, `gtos_apoyos_corp_kg`, `inversiones_kg`, `util_oper_importe`, `resultado_final_importe`.

En el catálogo IGF esos importes tienen `formula_role` `stored_importe` / stored. El composer hace `pickNum` sobre la fila **almacenada**. No llama recálculo GET ni overlay runtime. La diferencia STORED vs RUNTIME_COMPUTED se conserva porque **no hay cómputo**. `formula_role` no se reejecuta.

`created_at_role=upload_timestamp` (no as-of de negocio).

## 10. ACTUAL_FINANCIAL exclusion

Búsqueda en el flujo PRE_CLOSE:

- Composer **no** llama `loadFinancialActual` / `loadFinancialActualEvidence` / `composeMonthClose`.
- Pack: no hay `financial`, `actual_financial`, `FINANCE_PROVIDED`, `FINAL` como verdad de cierre.
- Limitation: `ACTUAL_FINANCIAL_EXCLUDED_PRE_CLOSE`.
- Prompt: “No ACTUAL_FINANCIAL”.
- `forbiddenKeysPresent` incluye `actual_financial`.

El read model `month_close_result` **no se filtró** al pack. Solo se reutilizan helpers de agregación/meta.

No hallazgo CRITICAL.

## 11. Commitment / intervention / scenario exclusion

Ausentes como propiedades del pack: `proposed_intervention`, `human_commitment`, `closing_scenario`, `what_if_result`. Refs: `commitment_ref=scenario_ref=lesson_ref=null`. Limitations: `COMMITMENT_HISTORY_MISSING`, `SCENARIO_HISTORY_NOT_DEFENSIBLE`, `WHAT_IF_UNSUPPORTED`.

Prompt: “No inventes intervención, compromiso humano, escenario de cierre ni what-if.” “Meeting statement ≠ truth” operacionalizado como prohibición + seeds de pregunta.

El número **1,177 no existe** en el pack de prueba (current 863 / forecast 1126 / target 1200). GPT no lo recibe como hecho. Residual de modelo: ver §15.

Preguntas what-if / historial de compromiso marcan limitations extra; no calculan.

## 12. Actions / reviewable semantics

**Actions.** `defaultLoadActions` / Action Register. `truth_class=ACTION`. Nota: `"Action Register != commitment history"`. OVERDUE_ACTION: “Acción != compromiso de cierre.” Seed: “¿Qué acción vencida sigue abierta y quién la cierra?”

No hay inferencia código-nivel de “acción abierta → compromiso de cierre”. Wording GPT residual: si el modelo parafrasea mal; el pack no lo afirma.

**Reviewable.** `truth_class=REVIEWABLE`. Nota: `"reviewable != saving != approved cancellation"`. Seed: “¿Qué apoyo reviewable sigue sin validar? reviewable != ahorro.” `has_reviewable` / count. No se presenta como gasto eliminado ni impacto realizado.

## 13. Risk audit

Risks **realmente implementados**:

| risk_code | Condición física | Fuente | Input | Output | Determinístico | Causalidad |
|---|---|---|---|---|---|---|
| `FORECAST_BELOW_TARGET` | `forecast.venta_ton < target.venta_ton` (ambos OK, finitos) | IGF + igf_meta | números | risk + `VOLUME_DEFENDABLE` | Sí | No |
| `FORECAST_RESULT_NEGATIVE` | `resultado_final_importe < 0` | IGF stored | número | risk + `FORECAST_NEGATIVE` | Sí | No (“No es ACTUAL_FINANCIAL”) |
| `COMMERCIAL_DETERIORATION` | `trend_direction === "DOWN"` | commercial_trend 90d | OLS direction | risk | Sí si hay trend | No (“Mover != causa”) |
| `LOST_HIGH_VOLUME_CLIENT` | cliente prior>0 y to-date=0 (cap 3) | ARR mes vs prior | classifyClients | risk | Sí | No |
| `OVERDUE_ACTION` | `actions.overdue > 0` | Action Register | summary | risk + `ACTION_OWNER` | Sí | No |
| `REMAINING_FORECAST_DEPENDENCE` | forecast venta > actual + 0.05 t | IGF + ARR | números | risk | Sí | No afirma que el remanente ocurra |

No implementados (correcto; sin fuente defendible):

- Canal mal clasificado Acapulco
- Finance vs ARR (exige FINAL; fuera de PRE_CLOSE)
- Causalidad verbal de sala

GPT no recibe risks inventados por el composer. Puede verbalizar causa en la prosa: residual de C, no un `risk_code` extra.

RISK ≠ CAUSE y RISK ≠ RECOMMENDATION en la estructura. Tests comprueban que `condition` no contiene “porque/culpa/causa de”.

## 14. Gap audit

Gaps de planta:

| kind | class | Condición |
|---|---|---|
| `TARGET_MISSING_FOR_PERIOD` | INFORMATION_GAP | target missing |
| `FORECAST_MISSING_FOR_PERIOD` | INFORMATION_GAP | forecast missing |
| `SOURCE_UNAVAILABLE` | INFORMATION_GAP | current error / actions fail / reviewable fail |
| `ARR_VS_IGF_VENTA` | RECONCILIATION_GAP | \|actual−forecast\| ≥ 0.05 t; ambos se conservan |

Limitations de pack (siempre o condicionales): `ACTUAL_FINANCIAL_EXCLUDED_PRE_CLOSE`, `COMMITMENT_HISTORY_MISSING`, `SCENARIO_HISTORY_NOT_DEFENSIBLE`, `WHAT_IF_UNSUPPORTED`, `NO_REGIONAL_FINANCIAL_TOTAL`, `CHANNEL_DATA_QUALITY_UNSUPPORTED`, `ZONE_MEMBERSHIP_UNAVAILABLE` (catálogo caído + PORTFOLIO), `WHAT_IF_QUESTION_UNSUPPORTED`, `COMMITMENT_HISTORY_QUESTION_UNSUPPORTED`, `sales_actual_unavailable`, `target_schema_unavailable`, `CROSS_PLANT_SECTION_RESTRICTED`.

Gap ≠ cause. Source failure → status tipado o limitation; **no** se convierte en cero (target/forecast missing quedan null). Current vacío es el caso débil (OK + null).

`CHANNEL_DATA_QUALITY_UNSUPPORTED` es limitation constante, no detector del incidente Acapulco. Correcto no inventar el error de canal.

## 15. DECISION_NEEDED adversarial audit

Arquitectura C: gaps/risks tipados → wording GPT.

GPT recibe, por planta, líneas:

`DECISION_NEEDED kind=... seed=... triggers=...`

más números CURRENT/TARGET/FORECAST y la pregunta del usuario.

Kinds físicos: `VOLUME_DEFENDABLE`, `FORECAST_NEGATIVE`, `TARGET_ABSENT`, `ACTION_OWNER`, `RECONCILE_DISCREPANCY`, `EXPENSE_STILL_OPEN`.

Seeds son **preguntas** (“¿Qué supuesto de volumen hay que validar…?”, “¿Qué discrepancia hay que reconciliar…?”). No “subir descuento a $0.50” ni “comprometer 40 t”.

Addendum: “solo redacta preguntas a partir de los kinds tipados. No añadas kinds. No apruebes decisiones.”

**Libertad residual:** no hay schema de salida ni validador post-GPT. Un modelo **puede** escribir “autorizar descuento de $0.50” en prosa. Eso no está en el pack ni en los seeds. Es el residual aceptado de C, no un hecho inyectado.

No se demostró que el **composer** convierta `FORECAST_BELOW_TARGET` en una decisión tomada. Fallo sería inyectar esa acción como evidencia. **No ocurre.**

OBSERVATION: seed `FORECAST_NEGATIVE` (“¿Qué hay que resolver para el cierre de esta planta?”) es más abierto que los otros.

## 16. Safe-load audit

| Fuente rota | Efecto demostrado |
|---|---|
| forecast planta 1 = `"error"` | Pack OK, 3 plantas; status `SOURCE_UNAVAILABLE`; las demás siguen |
| forecast missing planta 3 | `FORECAST_MISSING_FOR_PERIOD`; no tumba portafolio |
| actions `ok:false` sin abort | `SOURCE_UNAVAILABLE` + gap |
| actions abort | `SOURCE_RESTRICTED` |
| AUTHZ NONE / 0 plantas / planta pedida no autorizada | abort 403. **No** partial-open |

`safeLoad` envuelve actions/supports/trend. Target/forecast/current usan try/catch o token `"error"`.

AUTHZ ≠ SOURCE_FAILURE: 403 `SOURCE_RESTRICTED` vs sección `SOURCE_UNAVAILABLE`.

Hueco: current vacío ≠ error (véase §7).

## 17. Provenance audit

Por sección, donde existe físicamente:

| Sección | source | truth | plant | period | cutoff | version |
|---|---|---|---|---|---|---|
| current | `arr.ventas_diarias_cliente` | ACTUAL_COMMERCIAL | identity | YYYY-MM | `cutoff_date` (a menudo null live) | n/a |
| target | `igf_meta.meta_lines` | TARGET_COMMITMENT | identity | YYYY-MM | n/a | version_id/number si hay |
| forecast | `igf.compromiso_lines` | FORECAST | identity | YYYY-MM | n/a | version_id/number; `created_at_role=upload_timestamp` |
| actions / reviewable | AR / reviewable | ACTION / REVIEWABLE | plant_id | — | — | — |

Pack: `created_at_role=pack_generated_at_not_business_as_of`. `generated_at` ≠ as-of de negocio.

No se inventa provenance de commitment/scenario. Cutoff ausente en live no se fabrica (queda null). **MINOR** frente al contrato `max(fecha)`.

## 18. State / requery audit

Persistido: `cycle_mode=PRE_CLOSE`, `portfolio_scope`, `active_period_months`, `parent_intent=pre_meeting_brief`, `meeting_type=monthly_close`. `work_item_memory.meeting_pack_not_persisted=true`. `requery=true`.

**No** se persisten forecast/ARR/target ni el pack crudo.

`previous_frame` (`snapshotCurrentFrame`) **omite** `cycle_mode` / `portfolio_scope` (allowlist de topic-return). Correcto para no tratar el modo como frame diario.

Follow-up `"¿Qué me preocupa más?"` con inherit: chat **sí** reconsulta el composer (test: `loads` 1→2). Composer **ignora** `portfolio_scope` persistido y rederiva por la pregunta. Probe: zona PORTFOLIO `[1,2,3]` → follow-up ONE_PLANT `[1]` (planta del request). **MAJOR.** El test de chat mockea `composeExecutiveCycle` y no ve este colapso.

Evidencia se reconsulta. La **selección de portafolio** no.

## 19. EVAL-003 material validation

Muestra N=24 y tasas históricas **congeladas** (no se recomputean):

- anticipated 1/24 = 4.2%
- prepared 3/24 = 12.5%
- unsupported 11/24 = 45.8%
- matriz 10.5/20 = 52.5%, delta 0.0 pp

Clasificación **con esta IMPL** (capa de preparación, distinta de las tasas históricas):

| ID | Familia | Con PRE_CLOSE IMPL | Qué habría llevado |
|---|---|---|---|
| Z1 | FINANCIAL_RESULT | PARTIALLY_PREPARED | Resultado FORECAST planta a planta + reviewable. No 15 M actual. Limitation `NO_REGIONAL_FINANCIAL_TOTAL` + exclusión ACTUAL_FINANCIAL |
| Z2 | INTERVENTION | PARTIALLY_PREPARED | Variables IGF (HG/gasto/desc), plantas en negativo, decisions. No calcula “qué mejora logramos” |
| Z3 | CLOSING_SCENARIO | STILL_UNSUPPORTED | +632 mil de sala |
| P1 | CURRENT_STATE | PREPARED_NOW | ARR to-date de primer orden (si hay filas). Antes el brief no lo cargaba así |
| P2 | BASE_FORECAST | PARTIALLY_PREPARED | IGF latest como FORECAST. No afirma que 1,126 sea “tendencia de sala” |
| P3 | CLOSING_SCENARIO | STILL_UNSUPPORTED | 1,177 / recálculo. Pack no lo tiene |
| P4 | FINANCIAL_RESULT | PARTIALLY_PREPARED | Resultado oficial FORECAST, no “así como quedaron” |
| P5 | CURRENT_STATE | PARTIALLY_PREPARED | HG/desc/margen FORECAST + desc ARR. No par 6.11 vs 6.56 actual-vs-esperado |
| P6 | EXPENSE | PARTIALLY_PREPARED | reviewable + `gasto_kg`. Taller Mayor fuera |
| T1 | BASE_FORECAST | PARTIALLY_PREPARED | Igual P2 **si** Tehuacán está en `provincia_plants` |
| T2 | INTERVENTION | STILL_UNSUPPORTED | +20 CASA de sala |
| T3 | CLOSING_SCENARIO | STILL_UNSUPPORTED | Recálculo |
| A1 | INTERVENTION | STILL_UNSUPPORTED | +40 / 0.50 |
| A2 | DATA_QUALITY | GAP_FLAGGED | Limitation de canal; **no** detecta el error |
| A3 | RECONCILIATION | STILL_UNSUPPORTED | agreement ≠ truth no operacionalizado |
| Q1 | CLOSING_SCENARIO | STILL_UNSUPPORTED | Post-cambios |
| Q2 | EXPENSE | PREPARED_NOW | `EXPENSE_STILL_OPEN` + reviewable. No identifica el recorte |
| S1 | COMMITMENT | STILL_UNSUPPORTED | `COMMITMENT_HISTORY_MISSING` |
| M1 | RISK | PREPARED_NOW | Deterioro 90d + lost/movers si las fuentes cargan |
| M2 | COMMITMENT | GAP_FLAGGED | `VOLUME_DEFENDABLE`; no la llamada en vivo |
| M3 | CLIENT | PARTIALLY_PREPARED | movers/lost cap 3; no perfil Telolapan salvo que esté nombrado |
| W1 | INTERVENTION | STILL_UNSUPPORTED | What-if |
| W2 | EXPENSE | PARTIALLY_PREPARED | Marca reviewable; no overlay what-if en este pack |
| W3 | INTERVENTION | STILL_UNSUPPORTED | Slider HG |

Recuento **nuevo** (no sustituye tasas históricas): PREPARED_NOW 3 · PARTIALLY_PREPARED 9 · GAP_FLAGGED 2 · STILL_UNSUPPORTED 10.

Antes de la junta, lo que el runtime **sí** podía llevar bien: actual-to-date, target (o missing), base forecast, riesgos, acciones, reviewable, gaps, preguntas. Eso es la mejora material frente al brief clásico.

## 20. Plant-by-plant validation

| Planta | ¿Habría llevado lo relevante? | ¿Habría evitado el error de sala? |
|---|---|---|
| **Puebla** | CURRENT/TARGET/FORECAST, below-target, resultado negativo, remaining dependence, lost client, overdue, reviewable | **Sí evita llamar compromiso al ~1,177** (no está en pack; prompt lo prohíbe) |
| **Tehuacán** | Si está en catálogo: forecast/current/target. Distingue FORECAST de intervención | **Sí distingue tendencia/oficial de +20.** No inventa la palanca |
| **Acapulco** | Forecast 1,496 como FORECAST, no como +40 | **No inventa +40.** **No** detecta canal antes de sala (`CHANNEL_DATA_QUALITY_UNSUPPORTED`) |
| **Querétaro** | Gaps/reviewable/forecast si está en catálogo | **No inventa el recorte.** Q2 queda decisión abierta |
| **San Luis** | Evidencia previa (ARR/IGF/AR) si está en catálogo | **No presenta compromiso futuro como hecho** |
| **Morelos** | Missing target gap; deterioro si trend DOWN; lost/movers | Deja validación humana como gap/decision. No causa |
| **Zona Provincia** | Portafolio planta a planta + counts | **No inventa total financiero regional** |

Membresía viva Tehuacán / Querétaro / San Luis = `arr.provincia_plants` ⋈ `plantas`. Esta auditoría no abrió BD de producción. Si faltan en el catálogo, no salen (no se inventan).

## 21. What remained unknowable before meeting

Debe y **permanece** fuera. El pack no lo afirma:

- intervención nueva decidida en sala (P3, T2, A1, Z2-como-cálculo)
- compromiso humano nuevo (S1, M2)
- recálculo what-if (W1–W3, T3, Q1)
- closing scenario de reunión (Z3, P3)
- llamada/negociación en sala (M2, M3)
- error de canal Acapulco recién descubierto (A2) — las fuentes no lo hacen detectable
- causalidad verbal no persistida

Si la IMPL hubiera afirmado cualquiera de estos: hallazgo material. **No lo hace.**

## 22. Materiality assessment

El pack prioriza lo que la junta necesitaba **saber de antemano**:

CURRENT · TARGET · BASE_FORECAST · RISK · GAP · ACTION · DECISION_NEEDED

por planta, más `portfolio_counts` (below-target, resultado negativo, missing target, overdue).

No es un dump del catálogo IGF completo. Campos FORECAST acotados a los materialmente repetidos en EVAL-003 (venta, HG, desc, margen, gasto, apoyos, inversión, resultado).

Debilidades de materialidad:

- Decisiones de “qué resolver hoy” pueden **no llegar** (robo daily).
- Follow-up “qué me preocupa” **pierde** el portafolio.
- Cue `pre-cierre` sigue el brief viejo (sin current/target de primer orden).
- Cutoff live ausente (el número to-date igual se agrega al mes).
- Prompt crece O(n plantas × risks/gaps/decisions). Aceptable para zona; no se midió tope de tokens.

Clasificación de impacto: los tres primeros cambian lo que el Director **ve** en la conversación real. El resto es precisión/provenance.

## 23. Council compatibility

No se implementó Consejo.

El objeto preserva `plant`, `period`, `truth_class`, provenance, y `future_chain = TARGET → FORECAST → COMMITMENT → FINAL → LESSON → ACTION` con refs nulos.

No cierra el camino a commitment/scenario/final futuros. Un COUNCIL_FINAL exigirá extender el gate de `cycle_mode` (hoy aborta). Eso es extensión, no contradicción.

No se exige historial de commitment/scenario hoy.

## 24. Live-copilot compatibility

No se implementó audio/Plaud/streaming.

El pack es comparable campo a campo (`truth_class`, valor, source, period, cutoff, version) contra una frase oída: current, target, forecast, actions, gaps. `live_copilot_runtime=false`. Sirve como baseline estructurado futuro.

## 25. Regression / tests

Reejecutado 2026-08-25 (esta auditoría):

| Suite | pass | fail | skipped |
|---|---|---|---|
| `test/director-ia-pre-close-steering.test.js` | **30** | **0** | **0** |
| `test/director-ia-*.test.js` | **1058** | **0** | **0** |

Los tests existentes **pasan** y no bastan:

- no cubren el robo planner de “junta de hoy”
- no cubren colapso de portafolio en follow-up (mock del composer)
- cutoff live no está en el path inyectado (`defaultCutoff`)
- no hay sandbox GPT que demuestre invención en prosa

AUDIT read-only: **no** se añadieron tests. Hueco documentado.

## 26. Findings by severity

### CRITICAL

Ninguno demostrado.

### MAJOR

1. **Planner/chat desvían el ejemplo ARCH “¿Qué debo resolver en la junta de hoy?” a `daily_executive_brief`.** `isPreCloseQuestion` es true; el intent no. El Director no recibe el pack PRE_CLOSE.
2. **Follow-up inherit no honra `portfolio_scope` persistido.** Tras Zona Provincia, “qué me preocupa más” reconsulta una sola planta. ARCH pedía state de plant/portfolio selection.
3. **El cue histórico `pre-cierre` no consume el composer.** ARCH: el composer añade current/target al brief de preparación. IMPL deja `loadPreMeetingBriefForChat`. El camino más natural sigue sin first-order CURRENT/TARGET.

### MINOR

4. Cutoff ARCH = `max(fecha)` ARR; path live no lo calcula.
5. Current sin filas → `OK` + null, no `SOURCE_UNAVAILABLE`.
6. Dos matchers (`isPreCloseQuery` ≠ `isPreCloseQuestion`).
7. FP: “junta de gerencia”, “cierre de inventario”.
8. FN de uso: “¿Cómo vamos este mes?” → unknown.
9. GG parcial sin limitation de portafolio incompleto.
10. “Latest” IGF sin filtro `financial_state`.
11. Tests no cubren 1–2 ni cutoff live.

### OBSERVATION

12. Residual GPT de opción C (prosa puede recomendar sin evidencia). Seeds no lo invitan.
13. Catálogo SQL lista nombres de zona antes del filtro (no evidencia).
14. AD ALL_PLANTS según ARCH; más amplio que client-profile AD.
15. `cycle_mode` no-PRE_CLOSE aborta (first slice).
16. Limitation de canal siempre presente; no es detector.
17. Membresía real Tehuacán/QRO/SLP no verificada contra BD.

## 27. Matrix impact

**NO MODIFICADA.**

- Before: 10.5 / 20 = 52.5%
- After: 10.5 / 20 = 52.5%
- Delta: 0.0 pp

Las tasas históricas EVAL-003 no se tocan.

## 28. Final verdict

**PASS_WITH_FINDINGS**

El first slice B está implementado de verdad: composer compartido, clases de verdad separadas, authz fail-closed, exclusiones de ACTUAL_FINANCIAL / commitment / scenario, y preparación material de EVAL-003 en lo que era cognoscible antes de sala.

No PASS: routing y follow-up pueden impedir que ese pack llegue al Director en las frases más ejecutivas.

No FAIL: no se violó truth/authz en el pack y el cuello de composición ya no está ausente.

## 29. Exactly one NEXT_TASK

`FIX-DIRECTOR-IA-PRE-CLOSE-STEERING-COMPOSITION-001`

Corregir los MAJOR (y, si cabe en el mismo slice, cutoff live y current vacío) **sin** rediseñar ARCH.

- No autorizada.
- No ejecutada.
- Este reporte no abre G1.
