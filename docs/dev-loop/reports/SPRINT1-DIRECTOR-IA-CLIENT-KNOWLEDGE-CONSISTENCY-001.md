# SPRINT1-DIRECTOR-IA-CLIENT-KNOWLEDGE-CONSISTENCY-001

```yaml
task_id: SPRINT1-DIRECTOR-IA-CLIENT-KNOWLEDGE-CONSISTENCY-001
outcome: DONE
previous_task_closed: SPRINT1-DIRECTOR-IA-COMMERCIAL-MOVERS-COMMENTS-001
files_touched:
  - lib/director-ia-client-profile.js
  - test/director-ia-client-profile.test.js
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-CLIENT-KNOWLEDGE-CONSISTENCY-001.md
files_not_touched:
  - lib/commercial-trend-engine.js
  - lib/director-ia-commercial-trend.js
  - lib/director-ia-conversational-executive-layer.js
  - lib/director-ia-planner.js
  - lib/director-ia-chat.js
  - lib/dashboard-arr-forecast.js
  - Forecast / IGF / ARR / PROM / DICF / Action Register
  - Dashboard
  - docs/director-ia/
  - reportes COMMENTS-001 / COMMENTS-AUDIT / KNOWLEDGE-CONSISTENCY-AUDIT
contracts_consulted:
  - docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-COMMERCIAL-KNOWLEDGE-CONSISTENCY-HUMAN-REVIEW-AUDIT-001.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/dev-loop/LOOP_PROTOCOL.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "G5 humano: COMMENTS-001 CLOSED y esta tarea AUTHORIZED se transcribieron a CURRENT_TASK.md con la línea AUTHORIZED_BY_HUMAN dictada por Ing. Rogelio Zaragoza. Track B no se inició."
next_task_proposed: "SPRINT1-DIRECTOR-IA-PERIOD-START-SEMANTICS-001 (Track B). No autorizada."
secrets_check: none
human_decision_needed:
  - "G5: HUMAN_APPROVER CLOSED o REJECTED de ESTA tarea."
  - "Validación humana: «¿Cómo vamos?» luego «¿Qué sabemos de TORTILLERIA ERICK?»."
  - "PRODUCTION_PASS = NOT_YET_PROVEN"
```

## Causa raíz

`client_profile` consultaba `arr.cliente_comentarios` solo por `cliente_key` no vacía. Commercial Movers usa `loadRecentCommentsByClienteNombres` (nombre+planta). Un comentario con key NULL era visible en «¿Cómo vamos?» e invisible en «¿Qué sabemos de X?». El prompt decía «ninguno para estas keys»; el LLM lo verbalizaba como «no se han registrado comentarios». `FALSE_ABSENCE_RISK` sistémico. PRE_EXISTING_GAP; no regresión de COMMENTS-001.

## Solución mínima

Reutilizar el loader ya existente. No se creó un sistema de comentarios.

1. **Key primero.** `queryCommentsByKeys` sigue igual.
2. **Complemento nombre+planta** si hay `cliente_norm` / `display_name` / `entity_hint`: `loadRecentCommentsByClienteNombres` con `getPlantaIdsEquivalentes`.
3. **Merge** por `body|created_at`. No duplicar. Key gana en empate.
4. **Falsa ausencia.** Vacío = `NO_ENCONTRADO_EN_ESTA_RUTA` + `comments_absence_not_confirmed`. Prohibido «no se han registrado / no hay / no existen comentarios» como hecho. DICF vacío: no afirmar ausencia global de acciones; AR sigue unsupported.
5. **Verbalización.** `Comentario registrado [YYYY-MM-DD]: «…». El comentario no es la causa.` Fecha solo si ya viene. No causalidad.

## cliente_key

Se conserva. Un hit por key no se descarta. El nombre no sustituye la ruta key.

## Acciones

Solo wording local. DICF sigue por key. AR no se consulta. No rediseño.

## Tests

Focal `director-ia-client-profile.test.js`: 17/17.

Suite `node --test test/director-ia*.js`: **1318/1318**, fail 0.

Cubierto: Erick por nombre; created_at; no-causa; vacío no inventa; ausencia no confirmada; key se conserva; no duplicar; planta 2; mensual/descuento; routing perfil.

## Pendientes (fuera)

- Track B (0 t día 1).
- A2/A3/A8 routing fragmentado.
- «¿Por qué bajó X?».
- Migración schema a `cliente_key`.

```
DASHBOARD_BEHAVIOR_CHANGED = NO
PRODUCTION_PASS = NOT_YET_PROVEN
IMPLEMENTATION_AUTHORIZED_NEXT = NO
TRACK_B_STARTED = NO
```

## STOP

No CLOSED ni APPROVED. Un DONE no autoriza otra tarea.

---

## HUMAN REVIEW CORRECTION

Corrección de la misma tarea. No es tarea nueva. No es Track B. `CURRENT_TASK` permanece `DONE_PENDING_REVIEW`.

### Fallo observado

Caso 1 (PASS, no romper): `¿Qué sabemos de TORTILLERIA ERICK?` recuperó 4713.12 kg julio 2026, 307.26 kg agosto 2026 y dos comentarios `[2026-08-12]` (`POR FALTA DE PIPAS`, `ESTA EN CHILPANCINGO Y LO TOMÓ LA COMPETENCIA`), no tratados como causa.

Caso 2 (FAIL crítico, mismo hilo): `¿Qué sabemos de GRUPO MOVE EMPRESARIAL?` verbalizó «No se dispone de información específica sobre GRUPO MOVE EMPRESARIAL. Sin embargo, se tiene un perfil longitudinal de TORTILLERIA ERICK…» y reutilizó historial, comentarios y acciones de Erick.

### Causa raíz

Clasificación: **INHERIT_PRECEDENCE** + **PROFILE_CONTEXT_REUSE** (canal heredado).

No es ENTITY_EXTRACTION: `extractEntityHint` ya extrae `GRUPO MOVE EMPRESARIAL`.
No es planner: el intent sigue `client_profile`.

`director-ia-chat.js` ~4467–4480 inyecta a la vez:

- `entity_hint` = turno actual (Grupo Move)
- `cliente_norm` / `display_name` / `cliente_keys` / `identity_canal` / `active_channel` = cliente activo heredado (Erick, canal Casa)

`loadClientProfileForChat` resolvía `if (inheritedNorm) identity = Erick` **antes** de `entity_hint`. El hint nunca corría. El pack era Erick; la pregunta era Move; el LLM sintetizaba «no hay Move, aquí está Erick».

Segunda trampa: si se ignoraba `inheritedNorm` pero se dejaba `slots.channel = casa`, `queryMonthlySales` excluía a Grupo Move (Comisionista) y el pack volvía vacío.

`chat.js` no se tocó: la precedencia se corrige localmente en `client_profile` (`in_scope`).

```
STALE_ENTITY_INTRODUCTION_POINT =
  1) lib/director-ia-chat.js ~4470–4480 (inyecta cliente_norm/keys/canal stale; no modificado)
  2) lib/director-ia-client-profile.js (inheritedNorm ANTES de entity_hint; corregido)
```

Traza demostrada antes del cambio:

```
current user text
→ extractEntityHint = "GRUPO MOVE EMPRESARIAL"
→ planner client_profile
→ chat pasa entity_hint=Move + cliente_norm=Erick
→ loadClientProfileForChat: inheritedNorm gana
→ selected cliente = Erick
→ profile/comments/pack = Erick
```

### Archivos modificados

- `lib/director-ia-client-profile.js`
- `test/director-ia-client-profile.test.js`
- `docs/dev-loop/reports/SPRINT1-DIRECTOR-IA-CLIENT-KNOWLEDGE-CONSISTENCY-001.md`

No modificados: `director-ia-chat.js`, planner, commercial-trend, CEL, Dashboard, Forecast, IGF, engine, DICF loader, Action Register, `CURRENT_TASK.md`, constitución, schema.

### Solución

Regla: `EXPLICIT_ENTITY_CURRENT_TURN > INHERITED_ENTITY_PREVIOUS_TURN` cuando el hint actual es resoluble y `exactNorm(hint) !== exactNorm(inherited)`.

1. `explicitClientHintTakesPrecedence(entity_hint, cliente_norm)`.
2. Si gana el hint: `slots.channel = channelNamedInQuestion(question)` (null → ventas `ambos`). No se reusa canal/keys del cliente anterior.
3. Identidad se resuelve contra ventas por `exactNorm`. 1 hit → keys del hit. 0 hits → identity = hint + keys derivadas del hint (nunca keys de Erick). Ambiguo → clarification.
4. Si hint e inherited son el mismo `exactNorm` (pronombre / misma entidad): se conserva continuidad.
5. Inherit global no se desactiva. No phrasebook. No hardcode Erick/Move. No rediseño de planner.

### Semántica de acciones

DICF vacío en esta ruta ≠ ausencia global. Action Register no se consulta.

- Addendum y pack: «no encontré una acción DICF asociada en esta ruta» + `NO_ENCONTRADA_EN_ESTA_RUTA` + `actions_absence_not_confirmed`.
- Prohibido verbalizar como hecho: «no existen acciones», «no se han registrado acciones», «no hay acciones para este cliente».
- No se rediseñó DICF ni Action Register.

### Pruebas

Focal `test/director-ia-client-profile.test.js`: 19/19.

Suite `node --test test/director-ia*.js`: **1320/1320**, fail 0.

Cubierto:

1. Erick solo → Erick (kg julio/agosto + `POR FALTA DE PIPAS`).
2. Mismo hilo Erick → Grupo Move → Move; no Erick; `askDirectorIa` con loader real.
3. Orden inverso Move → Erick → Erick.
4. Entidad explícita distinta domina al heredado.
5. Sin entidad nueva (pronombre / mismo `exactNorm`) conserva continuidad.
6. Grupo Move recupera `COMPRA DIARIAMENTE` (key y fallback nombre+planta).
7. Move no recibe `POR FALTA DE PIPAS`.
8. Erick no recibe `COMPRA DIARIAMENTE`.
9. comentario ≠ causa.
10. Aislamiento por planta se conserva.
11. `cliente_key` válido (`|`) se conserva.
12. Fallback nombre+planta se conserva.
13–14. Historial mensual y descuento no regresan (tests previos intactos).
15–18. Commercial Movers / commercial_trend / Forecast / IGF no se tocaron.
19. Suite Director IA completa.
20. DICF vacío no afirma ausencia global de acciones.

### No regresiones

```
DASHBOARD_BEHAVIOR_CHANGED = NO
PRODUCTION_PASS = NOT_YET_PROVEN
IMPLEMENTATION_AUTHORIZED_NEXT = NO
TRACK_B_STARTED = NO
```

No git add / commit / push / merge / deploy.
No CLOSED ni APPROVED.
Un DONE no autoriza otra tarea. STOP.
