# IMPL-DIRECTOR-IA-EXECUTIVE-STATUS-CHANNEL-INDEPENDENCE-001

```yaml
task_id: "IMPL-DIRECTOR-IA-EXECUTIVE-STATUS-CHANNEL-INDEPENDENCE-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
implementation: true
code_changes: true
test_changes: true
sql_changes: false
docs_director_ia_changes: false
matrix_changes: false
phrase_patch: false
llm_only_computation: false
hardcoded_final_wording: false
major_casa_comisionista_corrected: true
target_igf_meta: "DEFERRED"
bitacora_in_pack: "DEFERRED"
ledger_sync: "PER_CHANNEL_OLS only"
focal_tests: "55/55"
cel_suite_file: "test/director-ia-conversational-executive-status.test.js"
pre_close_and_trend_deps: "55/55"
director_ia_suite: "1156/0/0"
git_diff_check: "clean"
working_branch: "main"
branch_protocol_deviation: "implementation landed on main without a work branch; no commit/push/merge"
manual_chat_validation: "PENDING"
production_manual_validation: "PENDING/NOT_YET_TESTABLE"
production_pass_declared: false
deployed: false
next_task_proposed: "AUDIT-DIRECTOR-IA-EXECUTIVE-STATUS-CHANNEL-INDEPENDENCE-001"
next_task_authorized: false
next_task_executed: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
secrets_check: "none"
```

## 1. Causa raíz física

El motor comercial ya entrega dos OLS independientes (`loadCommercialTrendForChat` con `channel:"both"` → `assembled.ols=null`, `channels.casa`, `channels.comisionista`).

La pérdida de independencia ocurría **después** de la adquisición, en la proyección del pack EXECUTIVE_STATUS:

1. `buildExecutiveStatusPack` leía una sola dirección:
   `(trend.ols && trend.ols.direction) || (trend.primary && trend.primary.ols.direction)`.
2. Con `wantBoth`, `primary` era CASA. Esa dirección se convertía en `payload.direction` del slot TREND.
3. `truth_semantics` era `OLS_CASA_COMISIONISTA` (rótulo conjunto).
4. `formatPackForPrompt` emitía `tendencia_ols=<direction>` y copy de motor «CASA/comisionista».
5. El contrato de wording no prohibía colapsar dos canales en una afirmación conjunta.
6. El composer/GPT recibía **una** tendencia, no dos señales.

Por eso CASA=DOWN + Comisionista=UP podía producir «CASA/comisionista muestra descenso».

No era un phrase patch faltante. Era una proyección que destruía identidad, dirección, evidencia y periodo por canal.

## 2. Archivos modificados

Tocados en esta IMPL:

- `lib/director-ia-conversational-executive-layer.js`
- `test/director-ia-conversational-executive-status.test.js`
- `docs/dev-loop/CURRENT_TASK.md` (`IN_PROGRESS` → `DONE_PENDING_REVIEW`; G1 intacto)
- `docs/dev-loop/reports/IMPL-DIRECTOR-IA-EXECUTIVE-STATUS-CHANNEL-INDEPENDENCE-001.md` (este)

No tocados:

- `docs/director-ia/`
- Constitution / Index / EKE / `02`–`05`
- planner, conversation-state, SQL, tablas
- H1 greeting, H2 reviewable, H3 PRE_CLOSE
- 1656, igf_meta loader, Steering, ACTUAL_FINANCIAL, SEH, dumps

Working tree previo (reportes AUDIT untracked de turnos anteriores) **preservado**.

Desvío de protocolo: la ejecución ocurrió en rama `main`. No hay commit, push, merge ni deploy. El humano decide cómo aislar el diff.

## 3. Representación anterior

Slot TREND (colapso):

```
truth_semantics: "OLS_CASA_COMISIONISTA"
payload.direction: trend.ols.direction || trend.primary.ols.direction
primary: casa cuando channel=both
prompt: tendencia_ols=<direction>
copy: motor CASA/comisionista
periodos: una ventana commercial_trend
```

CASA y Comisionista no viajaban como objetos independientes al composer.

## 4. Representación nueva

`projectExecutiveTrendChannels(trend)` → `{ casa, comisionista, diverge, compare, availability, overall }`.

Cada canal:

| Campo | Semántica |
|-------|-----------|
| `availability` | REQUIRED / UNAVAILABLE / NOT_AUTHORIZED |
| `direction` | UP / DOWN / FLAT o `null` |
| `period` | `range_start→range_end` o `null` |
| `provenance` | source/canal del bloque OLS |
| `source` | `commercial-trend-engine` |
| `limitations` | las del bloque (no inventadas) |

Slot TREND:

```
truth_semantics: "OLS_PER_CHANNEL"
payload: { casa, comisionista, diverge, compare }
payload.direction: ausente (no hay tendencia combinada)
```

OLS suelto sin `channels` y sin `trend.channel` explícito **no** se copia a CASA. Evita la fusión `primary=casa`.

`INSUFFICIENT_DATA` / `no_rows` / `*_missing` / `insufficient_observations` → UNAVAILABLE. La ausencia de un canal no autoriza inferir el otro.

No se inventó métrica agregada CASA+Comisionista.

## 5. CASA

Proyección desde `trend.channels.casa` o, solo si `trend.channel === "casa"`, desde `primary`/`ols` de ese canal.

Identidad: `channel: "CASA"`. Dirección, periodo, provenance y limitations propios. Si falta el bloque o la dirección no es defendible: `availability=UNAVAILABLE`, `direction=null`.

## 6. Comisionista

Simétrico: `trend.channels.comisionista` o `trend.channel === "comisionista"`. Identidad `COMISIONISTA`. No se deriva de CASA. No es Portátil ni Carburación.

## 7. Divergencia

`diverge = true` solo si ambos canales son REQUIRED y ambas direcciones existen y son distintas.

Soportado de forma determinística:

| CASA | Comisionista | diverge | efecto |
|------|--------------|---------|--------|
| DOWN | UP | true | ambas señales; material |
| UP | DOWN | true | ambas señales; material |
| UP | UP | false | identidad conservada; no serie agregada |
| DOWN | DOWN | false | identidad conservada; no serie agregada |
| FLAT | UP/DOWN | true si ambas REQUIRED | no colapso |
| UNKNOWN/UNAVAILABLE | UP | false | no inferir CASA |
| DOWN | NOT_AVAILABLE | false | no inventar Comisionista |
| UNKNOWN | UNKNOWN | false | ausencia ≠ 0 |

Si divergen, el summary del slot dice `Divergen. No hay tendencia combinada.` antes de GPT.

## 8. Periodos

`collectPeriodLabels` emite `commercial_trend.casa` (`OLS_CASA`) y `commercial_trend.comisionista` (`OLS_COMISIONISTA`) por separado.

`evaluatePeriodComposition`: `fuse=false`. Si las ventanas difieren → `COMPARE_WITH_LABELS` (`PERIOD_STRATEGY` existente) y `user_note` de periodos distintos.

El slot TREND concatena ambos labels con `|` cuando no coinciden. No fusiona silenciosamente.

## 9. Provenance

Cada canal lleva `provenance` del bloque OLS (`source` o `canal`) o `commercial-trend-engine`. El slot TREND declara `provenance: commercial_trend CONDITIONAL per-channel`. No se reetiqueta tendencia como venta actual, forecast, ARR, IGF, target ni causa.

## 10. Composer

`buildExecutiveStatusPack` recibe el `trend` ya cargado y proyecta ambos canales. El composer no vuelve a fusionar.

`formatPackForPrompt` escribe dos líneas:

```
CASA availability=… direction=… period=… provenance=…
COMISIONISTA availability=… direction=… period=… provenance=…
diverge=true|false (no tendencia combinada; no uses primary=casa)
```

Si coinciden, el summary permite síntesis verbal posterior, pero el pack conserva ambas identidades y provenance. No hay cifra agregada CASA+Comisionista.

## 11. Wording contract

Ajuste mínimo, sin frases finales hardcodeadas:

- Pack: «CASA y Comisionista son canales independientes. Conserva la dirección de cada uno. Si divergen, dilo. No inventes una tendencia combinada. No unas ambos canales con una barra en un solo rótulo.»
- System prompt: «CASA y Comisionista son tendencias independientes. Si divergen, conserva ambas. No inventes una tendencia combinada ni un rótulo con barra que una ambos canales.»
- Guard last-mile: `FUSED_CHANNEL_TREND_RE` (`/\bCASA\/comisionistas?\b/gi`) → `CASA y Comisionista`. No es la respuesta; solo impide el token fusionado si GPT lo emite.

El wording natural («CASA viene descendiendo, mientras Comisionista presenta una tendencia positiva») lo hace GPT last-mile. No se hardcodea.

El prompt **no** contiene el token `CASA/comisionista` (evita romper `doesNotMatch` y no instruye el anti-patrón por ejemplo).

## 12. TARGET

**DEFERRED.**

Causa exacta: el path EXECUTIVE_STATUS reutiliza `plant_diagnosis`. Ese assembled **no** carga `igf_meta`. El slot `TARGET_COMMITMENT` sigue `UNAVAILABLE` / `truth_semantics: TARGET` / source `igf_meta`.

Conectarlo exigiría nueva adquisición, loader o ampliar scope. Fuera de este slice.

1656 no se tocó. 1656 no es target oficial, no es meta, no es Steering.

Nunca se confunde TARGET / ARR / IGF / forecast / actual / compromiso conversacional.

## 13. Bitácora

**DEFERRED.**

Causa exacta: `arr.director_ia_bitacora` se adquiere en plant_diagnosis y aparece en `sources` del chat result, pero no entra al pack. No existe una regla determinística de materialidad/pertinencia ya soportada para elevar ítems al pack EXECUTIVE_STATUS.

Inventar esa regla o hacer dump de bitácora está fuera de alcance. No se implementó.

## 14. Ledger

Sincronización mínima, consecuencia directa de channel independence:

- `commercial_trend.first_slice_bridge = PER_CHANNEL_OLS`
- filas nuevas `commercial_trend.casa` y `commercial_trend.comisionista` (`IMPLEMENTED_AND_CONVERSATIONALLY_REACHABLE`)
- `CHANNEL_REGISTRY.CASA/COMISIONISTA.independent = true`

No se declaró SEH, ACTUAL_FINANCIAL en «¿Cómo vamos?», Folios dump, TARGET conectado, bitácora en pack, Plaud, Council, live ni Steering readable.

El ledger CEL sigue más estrecho que ARCH en capabilities no conectadas. Eso no se «completó» artificialmente.

## 15. AUTHZ

Preservado. `SOURCE_RESTRICTED` / `abort` → slot TREND `NOT_AUTHORIZED`; ambos canales `NOT_AUTHORIZED` y `direction=null`. No se inventan canales. Fail-closed de planta explícita intacto (tests H/J y E2E previos).

## 16. Specialized modes

Sin secuestro. `resolveExecutiveNeed` / `isUnequivocalDailyBriefQuestion` / `isPreCloseQuestion` / IGF / month_close_result no cambiaron de semántica. Tests I + E2E 12–15 / M1 siguen verdes.

## 17. Tests

Archivo focal: `test/director-ia-conversational-executive-status.test.js`.

| Caso | Resultado |
|------|-----------|
| A CASA DOWN / COMISIONISTA UP separados + diverge | PASS |
| B CASA UP / COMISIONISTA DOWN separados | PASS |
| C ambos DOWN conservan identidad | PASS |
| D CASA UNKNOWN no infiere CASA | PASS |
| E Comisionista NOT_AVAILABLE no se inventa | PASS |
| F periodos distintos; fuse=false; labels por canal | PASS |
| G prompt sin `CASA/comisionista` ni `tendencia_ols` de primary=casa | PASS |
| H ¿Cómo vamos/estamos/va Acapulco/vamos hoy/va Puebla? → EXECUTIVE_STATUS | PASS |
| I resumen diario / pre-cierre / IGF no secuestrados | PASS |
| J AUTHZ no inventa canales | PASS |
| K missing/null ≠ 0 | PASS |
| ledger per-channel; no SEH/FA | PASS |
| guard token fusionado | PASS |
| OLS suelto no se copia a CASA | PASS |
| E2E 1b CASA↓/COMISIONISTA↑ no fusiona en prompt | PASS |

Focal CEL: **55 pass / 0 fail / 0 skipped**.

PRE_CLOSE + commercial_trend (dependencias): `test/director-ia-pre-close-steering.test.js` + `test/director-ia-commercial-trend.test.js` → **55/55**.

Suite Director IA completa (`test/director-ia-*.js` + `test/director-ia-*.test.js`): **1156 pass / 0 fail / 0 skipped** (antes 1141; +15 casos de este slice).

## 18. Regresión

Need EXECUTIVE_STATUS intacto en variantes abiertas. Specialized modes intactos. AUTHZ intacto. missing/null ≠ 0. ACTUAL_FINANCIAL no entra a «¿Cómo vamos?». Steering no finge integración. DICF no sobreafirma medidas. COMPARE_WITH_LABELS intacto.

Matriz: **10.5 / 20 = 52.5%**. Delta **0.0 pp**. Esta IMPL no incrementa %.

## 19. Límites

- No deploy. No PRODUCTION PASS.
- GPT still wording last-mile: el pack + contrato + guard impiden el colapso estructurado; la frase natural no está fijada.
- TARGET y bitácora DEFERRED.
- H1 / H2 / H3 no tocados. H3 (PRE_CLOSE pending clarification / 1656) sigue abierto e independiente.
- Ejecución en `main` sin work branch (desvío). Working tree sucio previo preservado.
- `MANUAL_CHAT_VALIDATION` no es PASS.

## 20. MANUAL_CHAT_VALIDATION

**PENDING** hasta ship/deploy.

Prueba humana posterior (no autorizada aquí): UI Acapulco + «¿Cómo vamos?» e inspeccionar que CASA y Comisionista aparezcan como señales independientes cuando la evidencia diverja.

## 21. PRODUCTION_MANUAL_VALIDATION

**PENDING / NOT_YET_TESTABLE.** No hay deploy de este slice. No se declara PRODUCTION PASS.

## 22. Matriz / delta

| Campo | Valor |
|-------|--------|
| Antes | 10.5 / 20 = 52.5% |
| Después | 10.5 / 20 = 52.5% |
| Delta | 0.0 pp |
| Motivo | IMPL de proyección conversacional; no cierra capability constitucional nueva |

## 23. NEXT_TASK

Exactamente una, **no autorizada, no ejecutada**:

`AUDIT-DIRECTOR-IA-EXECUTIVE-STATUS-CHANNEL-INDEPENDENCE-001`

Propósito propuesto: auditar que el pack/composer/prompt conservan CASA y Comisionista independientes, que TARGET y bitácora siguen DEFERRED con causa, y que no se reabrió alcance (H1/H2/H3, 1656, FA, SQL).

Un DONE no autoriza esa tarea. G5 es humano.

---

## Contratos consultados (no modificados)

- `docs/director-ia/DIRECTOR_IA_CONSTITUTION.md`
- `docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md`
- `docs/dev-loop/reports/ARCH-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-LAYER-001.md`
- `docs/dev-loop/reports/AUDIT-ARCH-DIRECTOR-IA-EXECUTIVE-STATUS-COMPLETENESS-001.md`
- `docs/dev-loop/LOOP_PROTOCOL.md`

Contratos modificados: ninguno. G2/G3 no aplicados.

Contradicciones contractuales: ninguna que detenga el slice. TARGET OPTIONAL en ARCH vs UNAVAILABLE en pack queda documentado como DEFERRED.

Desvíos respecto a CURRENT_TASK original (G1): el objetivo G1 decía «este turno solo autoriza»; la ejecución ocurrió en el turno posterior autorizado por el humano. G1 fields no se reescribieron.

## secrets_check

none

## human_decision_needed

- G5: aceptar o rechazar esta IMPL.
- Cómo aislar el diff (está en `main` working tree, sin commit).
- Autorizar o no `AUDIT-DIRECTOR-IA-EXECUTIVE-STATUS-CHANNEL-INDEPENDENCE-001`.
- Deploy / MANUAL_CHAT_VALIDATION: no forman parte de esta tarea.

---

## G5 CLOSE (humano 2026-08-27)

HUMAN_APPROVER cerró esta tarea: `DONE_PENDING_REVIEW` → `CLOSED`.

Conclusiones preservadas, no reinterpretadas:

- MAJOR CASA/Comisionista corregido en working tree
- causa raíz = colapso `primary=casa`
- nueva representación = `OLS_PER_CHANNEL`
- CASA y Comisionista independientes
- TARGET = DEFERRED
- bitácora = DEFERRED
- ledger sincronizado a `PER_CHANNEL_OLS`
- tests focales CEL = 55/55
- PRE_CLOSE + commercial_trend = 55/55
- full regression = 1156 / 0 / 0
- MANUAL_CHAT_VALIDATION = PENDING
- PRODUCTION_MANUAL_VALIDATION = PENDING / NOT_YET_TESTABLE
- matriz = 10.5 / 20 = 52.5%
- delta = 0.0 pp
- no commit / push / merge / deploy / SQL
- cambios actualmente en working tree de `main`

G5 abre por separado, con G1 propio:
`AUDIT-DIRECTOR-IA-EXECUTIVE-STATUS-CHANNEL-INDEPENDENCE-001` (AUTHORIZED; no ejecutada en el turno de transición).
