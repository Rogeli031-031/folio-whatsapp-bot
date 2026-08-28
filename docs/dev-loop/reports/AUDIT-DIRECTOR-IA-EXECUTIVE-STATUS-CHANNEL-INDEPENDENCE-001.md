# AUDIT-DIRECTOR-IA-EXECUTIVE-STATUS-CHANNEL-INDEPENDENCE-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-EXECUTIVE-STATUS-CHANNEL-INDEPENDENCE-001"
outcome: "DONE_PENDING_REVIEW"
verdict: "PASS_WITH_FINDINGS"
mode: "AUDIT / EVALUATION"
implementation: false
code_changes: false
test_changes: false
sql_changes: false
docs_director_ia_changes: false
working_branch: "main"
deployed_main: "de4513859a17e9bf15aed40cdb2362b018fc9c3d"
changes_audited: "working tree (uncommitted CEL IMPL)"
original_major_reproduced: false
ols_per_channel_represents_both: true
primary_casa_used_as_joint_trend: false
critical: 0
major: 0
minor: 1
observation: 5
independent_probes: "23/24 (1 auditor-strict provenance-string assert; no fused trend)"
focal_cel: "55/55"
pre_close_and_trend: "55/55"
director_ia_suite: "1156/0/0"
manual_chat_validation: "PENDING"
production_manual_validation: "NOT_YET_TESTABLE"
matrix_increment: false
global_before: "10.5 / 20 = 52.5%"
global_after: "10.5 / 20 = 52.5%"
gain_pp: 0.0
next_task_proposed: "ARCH-DIRECTOR-IA-PRE-CLOSE-PENDING-CLARIFICATION-001"
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
```

## 1. VERDICT

**PASS_WITH_FINDINGS.**

El MAJOR original **no se reproduce** en el working tree auditado. CASA y Comisionista llegan al composer y al prompt como dos señales OLS independientes. El motor sigue exponiendo `primary=casa` cuando `channel=both`; CEL **ya no** usa esa dirección como tendencia conjunta.

No hay CRITICAL. No hay MAJOR nuevo. Un MINOR de proyección de provenance (el string proyectado prefiere `source` del motor y no transporta `canal`). Observaciones residuales no reabren el defecto.

`MANUAL_CHAT_VALIDATION = PENDING`. `PRODUCTION_MANUAL_VALIDATION = NOT_YET_TESTABLE`. Este cambio no está en Render. No se declara PRODUCTION PASS. Matriz **10.5 / 20 = 52.5%**; delta **0.0 pp**.

H1 / H2 / H3 permanecen fuera de alcance. H3 sigue independiente.

---

## 2. Causa raíz original

Confirmada por inspección del AUDIT-ARCH previo y del motor vigente (`lib/director-ia-commercial-trend.js`):

1. CEL pide `channel: "both"`, `compare: true`.
2. El motor carga dos OLS (`channels.casa`, `channels.comisionista`) y pone `assembled.ols = null`.
3. El motor **sigue** asignando `primary = casaBlock`.
4. El pack previo leía `(trend.ols && trend.ols.direction) || (trend.primary && trend.primary.ols.direction)`, `truth_semantics: OLS_CASA_COMISIONISTA`, y emitía `tendencia_ols=` + copy «CASA/comisionista».

Si CASA=DOWN y Comisionista=UP, GPT recibía una sola dirección (la de CASA) rotulada como tendencia conjunta.

---

## 3. ¿Se reproduce?

**No.**

Probes independientes (no el archivo de tests del IMPL) construyeron el **shape real del motor**, incluido `primary=casa` + `ols=null` + `channels.*`:

| Superficie | Resultado |
|------------|-----------|
| `projectExecutiveTrendChannels` | CASA=DOWN, COMISIONISTA=UP, `diverge=true` |
| `buildExecutiveStatusPack` TREND | `OLS_PER_CHANNEL`; `payload.direction` ausente |
| Prompt | dos líneas CASA / COMISIONISTA; `diverge=true`; sin `tendencia_ols=`; sin token `CASA/comisionista` |
| E2E `askDirectorIa` «¿Cómo vamos?» y «¿Cómo vamos hoy?» | mismo pack inequívoco al LLM |
| `primary` solo, `channels` nulos, `channel=both` | no infiere CASA desde `primary` |
| OLS suelto sin `channels` | no se copia a CASA |

La causa raíz (colapso `primary=casa` → tendencia única) **desapareció de la proyección CEL**. El campo `primary` **sigue existiendo en el motor**; ya no es la fuente del slot TREND.

---

## 4. Tabla de los 9 casos

Fixture: motor `wantBoth` (`primary=casa`, `ols=null`). Pack + prompt.

| # | Caso | CASA dir / av | COMISIONISTA dir / av | diverge | identidad | fused `CASA/comisionista` | `tendencia_ols` | promedio / primary-as-set |
|---|------|---------------|------------------------|---------|-----------|---------------------------|-----------------|---------------------------|
| 1 | ↓ / ↑ | DOWN / REQUIRED | UP / REQUIRED | true | sí | no | no | no |
| 2 | ↑ / ↓ | UP / REQUIRED | DOWN / REQUIRED | true | sí | no | no | no |
| 3 | ↑ / ↑ | UP / REQUIRED | UP / REQUIRED | false | sí (no serie agregada) | no | no | no |
| 4 | ↓ / ↓ | DOWN / REQUIRED | DOWN / REQUIRED | false | sí | no | no | no |
| 5 | estable / ↑ | FLAT / REQUIRED (`STABLE`→`FLAT`) | UP / REQUIRED | true | sí | no | no | no |
| 6 | ↓ / ausente | DOWN / REQUIRED | null / UNAVAILABLE | false | sí; no inventa Comisionista | no | no | no |
| 7 | ausente / ↑ | null / UNAVAILABLE | UP / REQUIRED | false | sí; no infiere CASA | no | no | no |
| 8 | ambos UNKNOWN | null / UNAVAILABLE | null / UNAVAILABLE | false | sí; ausencia ≠ 0 | no | no | no |
| 9 | parcial + periodos distintos | DOWN `2026-07-01→2026-07-31` | UP `2026-08-01→2026-08-23` | true | sí; `fuse=false`; labels `commercial_trend.casa` / `.comisionista` | no | no | no |

Periodo propio: sí cuando el bloque OLS trae `range_start`/`range_end`.
Availability propia: sí.
GPT: representación inequívoca (dos líneas + `diverge=`).

---

## 5. Evidencia end-to-end

Flujo físico inspeccionado:

`askDirectorIa` → need `EXECUTIVE_STATUS` → `loadPlantDiagnosisForChat` + `loadCommercialTrendForChat({ channel:"both", compare:true })` → `buildExecutiveStatusPack` → `projectExecutiveTrendChannels` → `buildExecutiveStatusPrompt` → GPT → `applyExecutiveLanguageGuard`.

Probe E2E independiente (deps inyectadas, trend motor-shaped CASA↓/COMISIONISTA↑):

- «¿Cómo vamos?» + UI Acapulco → `semantic_need=EXECUTIVE_STATUS`, `scope_source=ui_plant_anchor`.
- Prompt: `CASA availability=REQUIRED direction=DOWN` y `COMISIONISTA availability=REQUIRED direction=UP`.
- Slots SITUATION, MAGNITUDE, TREND, RISKS, EXECUTION presentes en el user content.
- System: «tendencias independientes».
- «¿Cómo vamos hoy?» → mismo need; `diverge=true`.
- «¿Cómo va Puebla?» → `explicit_plant`, `planta_id=2`.
- «Dame el resumen diario» → no CEL.

No se usó Render.

---

## 6. Representación CASA

```
channel: "CASA"
availability: REQUIRED | UNAVAILABLE | NOT_AUTHORIZED
direction: UP | DOWN | FLAT | null
period: range_start→range_end | null
provenance: block.provenance.source || canal || "commercial-trend-engine"
source: "commercial-trend-engine"
limitations: del bloque
```

Origen: `trend.channels.casa`. Solo si `trend.channel === "casa"` puede caer a `primary`/`ols` de ese canal. Con `channel=both` **no** se usa `primary` como CASA si el bloque de canal falta.

---

## 7. Representación COMISIONISTA

Simétrica (`channel: "COMISIONISTA"`, `trend.channels.comisionista`). No se deriva de CASA. No es Portátil ni Carburación.

---

## 8. Divergencia

`diverge=true` solo si ambos REQUIRED y ambas direcciones existen y difieren.

Si divergen, el summary del slot dice `Divergen. No hay tendencia combinada` **antes** de GPT. El prompt instruye conservar ambas y no inventar tendencia combinada ni rótulo con barra.

Si coinciden, identidad y provenance de canal se conservan; se permite síntesis verbal; no hay métrica agregada CASA+Comisionista.

---

## 9. Missing / null

- `INSUFFICIENT_DATA` / `no_rows` / `*_missing` / `insufficient_observations` / direction null → UNAVAILABLE, `direction=null`.
- No se convierte en 0, STABLE ni DOWN inventado.
- Un canal ausente no autoriza inferir el otro.
- `primary` huérfano con `channel=both` y `channels` nulos **no** rellena CASA.
- ARR `venta_ton=null` no se vuelve 0 (probe independiente).

---

## 10. Composer / prompt

`formatPackForPrompt` emite, para TREND:

```
CASA availability=… direction=… period=… provenance=…
COMISIONISTA availability=… direction=… period=… provenance=…
diverge=true|false (no tendencia combinada; no uses primary=casa)
```

System prompt: CASA y Comisionista independientes; si divergen, conservar ambas; no tendencia combinada ni rótulo con barra.

Guard last-mile: `CASA/comisionista(s)` → `CASA y Comisionista`. No hardcodea la respuesta.

Rama muerta residual: `tendencia_ols=` solo si un item TREND tuviera `payload.direction` y no `payload.casa`. El pack actual **no** emite esa forma. Los probes no la vieron.

---

## 11. Ledger

| Capability | first_slice_bridge | conversational_status |
|------------|--------------------|------------------------|
| commercial_trend | PER_CHANNEL_OLS | IMPLEMENTED_BUT_PARTIALLY_REACHABLE |
| commercial_trend.casa | PER_CHANNEL_OLS | IMPLEMENTED_AND_CONVERSATIONALLY_REACHABLE |
| commercial_trend.comisionista | PER_CHANNEL_OLS | IMPLEMENTED_AND_CONVERSATIONALLY_REACHABLE |
| ACTUAL_FINANCIAL | NOT_APPLICABLE | specialized only |

`CHANNEL_REGISTRY.CASA/COMISIONISTA.independent = true`. No se declaró SEH, FA en «¿Cómo vamos?», TARGET conectado ni bitácora en pack.

---

## 12. Respuesta ejecutiva completa (no solo TREND)

«¿Cómo vamos?» / «¿Cómo vamos hoy?» siguen componiendo la jerarquía:

| Slot | Estado auditado |
|------|-----------------|
| SITUATION | presente; mixto etiquetado |
| MAGNITUDE | ARR + IGF separados; no fusionados con TREND |
| TREND | per-channel; no degrada a los demás |
| TARGET_COMMITMENT | UNAVAILABLE / `igf_meta` / truth TARGET — **DEFERRED**, no inventado |
| DRIVERS | materialidad CS |
| RISKS | overdue AR |
| EXECUTION | DICF registered_actions_only |
| NEXT_DECISION | condicional a vencidas |
| STEERING | NOT_APPLICABLE |

Bitácora: se adquiere en plant_diagnosis (`arr.director_ia_bitacora` en sources del chat result); **no** entra al pack. Sigue **DEFERRED**. No inventada. No implementada aquí.

La corrección de canales no elimina ni degrada SITUATION / MAGNITUDE / RISKS / EXECUTION / NEXT_DECISION.

---

## 13. Regresiones

| Caso | Resultado |
|------|-----------|
| UI Acapulco + «¿Cómo vamos?» | EXECUTIVE_STATUS, ancla UI |
| «¿Cómo vamos hoy?» | CEL, no daily |
| «Dame el resumen diario» | specialized / no CEL |
| «¿Cómo va Puebla?» | explicit override |
| Planta explícita no resoluble | ASK_CLARIFICATION; no fallback UI |
| AUTHZ / 403 | fail-closed; trend NOT_AUTHORIZED no inventa canales |
| PRE_CLOSE | specialized; suite  verde |
| commercial_trend keyword | specialized; suite verde |
| IGF | specialized |
| «cómo cerramos julio» | month_close_result; no CEL |
| Greeting | `buildNeutralGreeting`; H1 nombre fuera de alcance |
| DICF wording | guard intacto |
| null ≠ 0 | pack + probe |
| Specialized no secuestrados | PASS |

H3 PRE_CLOSE pending clarification: **no auditado para corrección**; permanece hallazgo independiente.

---

## 14. Independent probes

Script fuera del repo (`%TEMP%\cel-channel-independence-audit-probe.js`). No se modificó ningún test del IMPL.

- 23 PASS
- 1 FAIL de aserción del auditor: en el caso 9 se exigió `provenance` string distinto entre canales. Ambos proyectan `commercial-trend-engine` porque se toma `block.provenance.source` antes que `canal`. Periodos, direcciones, `diverge` y labels **sí** eran independientes. No es tendencia conjunta falsa.

E2E independientes: cómo vamos, cómo vamos hoy, Puebla, daily.

---

## 15. Tests focales

`test/director-ia-conversational-executive-status.test.js`: **55 pass / 0 fail / 0 skipped**.

No se modificaron tests para obtener PASS.

---

## 16. Full regression

| Suite | pass / fail / skipped |
|-------|------------------------|
| CEL focal | 55 / 0 / 0 |
| PRE_CLOSE + commercial_trend | 55 / 0 / 0 |
| Director IA completa | **1156 / 0 / 0** |

---

## 17. MANUAL_CHAT_VALIDATION

**PENDING** hasta ship/deploy. Prueba humana posterior: UI Acapulco + «¿Cómo vamos?» con evidencia divergente.

## 18. PRODUCTION_MANUAL_VALIDATION

**NOT_YET_TESTABLE.** Working tree de `main`, no desplegado. No se usó Render como evidencia.

---

## 19. Branch / working tree

- Branch: `main`
- Cambio auditado: uncommitted (`lib/director-ia-conversational-executive-layer.js`, `test/director-ia-conversational-executive-status.test.js`)
- Este turno solo añadió el reporte AUDIT y actualizó `CURRENT_TASK`
- No git add / commit / push / merge / deploy / stash / checkout / reset / restore / clean / SQL
- Desvío de rama **no** corregido

---

## 20. Matriz / delta

| Campo | Valor |
|-------|--------|
| Antes | 10.5 / 20 = 52.5% |
| Después | 10.5 / 20 = 52.5% |
| Delta | 0.0 pp |

No se incrementa por esta corrección conversacional.

---

## 21. Hallazgos por severidad

### CRITICAL

Ninguno.

### MAJOR

Ninguno. El MAJOR original **no se reproduce**.

### MINOR

1. **Provenance proyectada no transporta `canal`.** `projectOneTrendChannel` usa `provenance.source || provenance.canal`. Ambos canales pueden mostrar el mismo string `commercial-trend-engine`. La identidad vive en `channel` / líneas del prompt, no se pierde. Periodos no se mezclan. No autoriza fusión de dirección. No se corrige en esta AUDIT.

### OBSERVATION

1. El motor **sigue** publicando `primary=casa` en `wantBoth`. CEL lo ignora para el conjunto. Superficie residual si alguien lee `trend.primary` fuera del pack.
2. Rama muerta `tendencia_ols=` en `formatPackForPrompt` si existiera `payload.direction` sin `casa`. El pack actual no la emite.
3. Trabajo en working tree de `main`, sin commit. Isolación pendiente (humano).
4. TARGET `igf_meta` y bitácora siguen **DEFERRED** con causa; no inventados. Correcto para este slice.
5. H1 greeting con nombre, H2 reviewable, H3 PRE_CLOSE pending clarification: abiertos e independientes. No reevaluados como defectos de esta corrección.

---

## Contratos consultados (no modificados)

- `docs/director-ia/DIRECTOR_IA_CONSTITUTION.md`
- `docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md`
- `docs/dev-loop/reports/ARCH-DIRECTOR-IA-CONVERSATIONAL-EXECUTIVE-LAYER-001.md`
- `docs/dev-loop/reports/IMPL-DIRECTOR-IA-EXECUTIVE-STATUS-CHANNEL-INDEPENDENCE-001.md`
- `docs/dev-loop/reports/AUDIT-ARCH-DIRECTOR-IA-EXECUTIVE-STATUS-COMPLETENESS-001.md`

Contratos modificados: ninguno.

## NEXT_TASK

Exactamente una, **no autorizada, no ejecutada**:

`ARCH-DIRECTOR-IA-PRE-CLOSE-PENDING-CLARIFICATION-001`

H3 permanece el hallazgo funcional abierto e independiente (pending clarification PRE_CLOSE / 1656 no es meta). Esta AUDIT no lo abre.

Un DONE no autoriza esa tarea. G5 es humano.

## secrets_check

none

## human_decision_needed

- G5: aceptar o rechazar esta AUDIT.
- Isolación del working tree en `main` (no hecha aquí).
- Deploy + MANUAL_CHAT_VALIDATION posteriores.
- Autorizar o no la NEXT_TASK propuesta.

---

## G5 CLOSE (humano 2026-08-27)

HUMAN_APPROVER cerró esta tarea: `DONE_PENDING_REVIEW` → `CLOSED`.

VERDICT preservado, no reinterpretado: **PASS_WITH_FINDINGS**.

Conclusiones preservadas:

- MAJOR original CASA/Comisionista = CLOSED / no reproduce
- OLS_PER_CHANNEL end-to-end
- CASA y Comisionista conservan identidad, direction, period y availability
- no tendencia agregada falsa
- independent probes = 23/24
- único fallo = aserción adicional del auditor sobre provenance string, no defecto de channel independence
- CEL = 55/55
- PRE_CLOSE + commercial_trend = 55/55
- full Director IA = 1156 / 0 / 0
- 0 CRITICAL
- 0 MAJOR
- 1 MINOR provenance no transporta canal; identidad vive en channel
- TARGET = DEFERRED
- bitácora = DEFERRED
- MANUAL_CHAT_VALIDATION = PENDING
- PRODUCTION_MANUAL_VALIDATION = NOT_YET_TESTABLE
- matriz = 10.5 / 20 = 52.5%
- delta = 0.0 pp

`ARCH-DIRECTOR-IA-PRE-CLOSE-PENDING-CLARIFICATION-001` **no** se autoriza en este G5.

G5 abre por separado, con G1 propio:
`PACKAGE-DIRECTOR-IA-EXECUTIVE-STATUS-CHANNEL-INDEPENDENCE-001` (AUTHORIZED; no ejecutada en el turno de transición).
