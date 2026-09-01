# IMPL-DIRECTOR-IA-COMPOUND-CLIENT-QUERY-001

```yaml
task_id: IMPL-DIRECTOR-IA-COMPOUND-CLIENT-QUERY-001
outcome: DONE_PENDING_REVIEW
task_type: IMPLEMENTATION
branch: implementation/director-ia-compound-client-query-001
base_main_sha: d348ead3d66c8a02c0bf153f54438a971b1f12b6
implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
docs_director_ia_changed: NO
hardcode_used: NO
golden_set_implemented: NO
leading_y_reopened: NO
enero_parser_changed: NO
planner_js_changed: NO
server_js_changed: NO
slice_a: YES
slice_b: YES
suite_pass: 1384
suite_fail: 0
baseline_prior: 1354 pass / 0 fail
followup_from_sha: fb4445ebd755904f79f244bc1b0290a20871d87c
production_db_queried: NO
render_touched: NO
```

## SHA base

`origin/main` = `HEAD` al iniciar = `d348ead3d66c8a02c0bf153f54438a971b1f12b6`

Contrato de auditoría:

`docs/dev-loop/reports/AUDIT-DIRECTOR-IA-COMPOUND-CLIENT-ENTITY-EXTRACTION-001.md`

G1 humano en `CURRENT_TASK.md` intacto (`authorized_by`, `authorized_at`, `human_authorization`).

## Slice A — embedded client identity

Corrige preguntas que **ya** llegaban a `client_profile` y perdían o recortaban el nombre.

Cubre, con evidencia canónica exacta:

- `Y GRUPO MOVE` embebido (C1–C3, D1)
- `TORTILLERIA ERICK` embebido (C4–C5, D2)
- `GRUPO MOVE EMPRESARIAL` (E1)
- anchor `cliente <nombre>` (D1–D2)
- multi-token, periodo explícito, múltiples métricas (C3, C5)

La regex **no** declara identidad canónica. Solo produce candidatos.

## Slice B — client query without explicit period

Después de estabilizar Slice A: `isClientProfileQuestion` acepta compras/kg **solo** si hay un span embebido defendible (`de <NOMBRE>` o `cliente <NOMBRE>`).

- `Dame las compras de <CLIENTE>.` → `client_profile`
- `Dame los kg comprados de <CLIENTE>.` → `client_profile`
- `Dame las compras.` / `Dame los kg comprados desde enero a la fecha.` / `Dame las compras de la planta…` → **no** `client_profile`

Sin periodo explícito:

- `period_source = default`
- exactamente `3 meses calendario` (2026-07, 2026-08, 2026-09 con reloj 2026-09-01)

## Mecanismo físico

```text
rawQuestion
  → isClientProfileQuestion
       Slice B: namesPurchaseOrKgMetric AND hasDefensibleEmbeddedClientSpan
       (span embebido y NO igualdad exacta con planta conocida)
       (C/D/E ya entraban por mes/periodo + named token)
  → detectDirectorIaIntent → client_profile
  → extractEmbeddedClientHintCandidates
       markers \b(cliente|de)\s+
       tokens capitalizados + conectores internos de/del/el/la/los/las
       Y permitido como primer token
       corte de oración: desde/hasta/fecha/planta/cada/por/meses/métrica
       candidato = span más largo; no identidad
  → resolveConversationTurn
       transporta entity_hint / candidates
       descarta prefijos y sufijos estrictos del span largo
       (D2: no TORTILLERIA; MOLINOS: no ACAPULCO suelto)
       embedded_client_requires_canonical
  → loadClientProfileForChat
       exactNorm vs cliente_norm del catálogo
       unique / ambiguous / not_found
  → director-ia-chat.js pasa el flag al loader y a resolveEntityAgainstAssembled
```

`extractEntityHint` y `extractLeadingYHintCandidates` **no** se reescribieron.

## Candidate extraction

`extractEmbeddedClientHintCandidates(raw)`:

1. Busca anclas `cliente` o `de` (no `del` como ancla; `del` sí puede ser conector interno).
2. Recoge tokens `^[A-ZÁÉÍÓÚÑ]`.
3. `de`/`del`/`el`/`la`/`los`/`las` se aceptan **entre** tokens de nombre si el siguiente sigue siendo name-head.
4. Corta en boundary de oración (`desde`, `hasta`, `fecha`, `planta`, meses, etc.). No captura hasta el final.
5. Varios matches → se conserva el span más largo; se descartan prefijos/sufijos contenidos.
6. `requires_canonical_evidence = true` siempre en el parseo; el transporte enciende el flag si no hay extract, el extract no coincide, o el span tiene ≥2 tokens.

No hay literal de cliente ni de `Acapulco` en runtime.

## Canonical exact evidence

`loadClientProfileForChat` con `embedded_client_requires_canonical` o `leading_y_requires_canonical`:

- `resolveExactRankedByHints` = igualdad `exactNorm(hint) === exactNorm(cliente_norm)`
- hints embebidos pasan por `dropStrictPrefixHints` (prefijo **o** sufijo contenido) para no caer al recorte de un token
- hit 1 → `unique`
- hits >1 del mismo hint → `ambiguous`
- 0 hits → `not_found` (no se fuerza el hint)

## Fail-closed

Sin hit exacto:

- no prefix (`TORTILLERIA` no sustituye `TORTILLERIA ERICK`)
- no substring (`ACME SUR INDUSTRIAL S A` no sustituye `ACME SUR INDUSTRIAL`)
- no fuzzy
- no primer token (`GRUPO` / `TORTILLERIA`)
- no cliente inventado

Controles no-cliente:

- `Dame los kg comprados desde enero a la fecha.` → unknown
- `Dame las compras de la planta desde enero a la fecha.` → unknown
- `Dame las compras.` → unknown

## Ambiguity

Dos filas con el mismo `cliente_norm` exacto (canales distintos) → `clarification.status = ambiguous`.

## Planner

`lib/director-ia-planner.js` **no** se modificó. Sigue delegando en `isClientProfileQuestion`.

B1–B4 pasan a `client_profile` 0.88 porque Slice B enciende el clasificador. C/D/E ya lo hacían.

## Extractor

- `extractEntityHint` intacto: D2 sigue devolviendo `TORTILLERIA`; B1/C1/D1/E1 siguen `null`.
- Nuevo extractor embebido transporta el span completo.
- Leading-Y intacto: solo `^\s*¿?\s*[yY]\s+`.

## Resolver

Misma igualdad exacta que leading-Y. El flag embebido se OR-ea con leading-Y en el loader y en `resolveEntityAgainstAssembled`. Leading-Y de un token (`¿Y Arturo?`) no enciende el flag embebido.

## Periodos

Parser `enero a la fecha` **no tocado**.

| Caso | period_source | meses (reloj 2026-09-01) |
| --- | --- | --- |
| B1–B4 / sabemos | `default` | 2026-07, 2026-08, 2026-09 |
| C1–C5 / D1–D2 / E1 | `explicit` | 2026-01 … 2026-09 |
| C1 con `active_period_months` heredados | `explicit` gana | 2026-01 … 2026-09 |

`query_start=2026-01-01`, `query_end=2026-09-30` en enero→fecha.

## Leading-Y

No reabierto. Controles verdes:

- `Y GRUPO MOVE` leading-Y → `Y GRUPO MOVE`
- `¿Y Arturo?` → `Arturo` / `Arturo Lopez`, no `Y Arturo`
- colisión `Y Arturo` + `Arturo Lopez` intacta
- `¿Qué sabemos de Y Arturo?` → `Y Arturo`
- `¿Qué sabemos de Y GRUPO MOVE?` → `Y GRUPO MOVE`

## Before / after

| ID | Entrada | Antes | Después |
| --- | --- | --- | --- |
| B1 | `Dame las compras de Y GRUPO MOVE.` | `isCPQ=false` → unknown | `client_profile` + hint `Y GRUPO MOVE` + default 3M |
| B2 | `Dame los kg comprados de Y GRUPO MOVE.` | unknown | igual |
| B3 | `Dame las compras de TORTILLERIA ERICK.` | unknown | `TORTILLERIA ERICK` + default 3M |
| B4 | `Dame los kg comprados de TORTILLERIA ERICK.` | unknown | igual |
| C1 | compras Y GRUPO MOVE enero→fecha | intent OK, hint null, `needs_identity` | identidad `Y GRUPO MOVE`, periodo explicit |
| C2 | kg Y GRUPO MOVE enero→fecha | hint null | `Y GRUPO MOVE` |
| C3 | kg+descuento por mes Y GRUPO MOVE | hint null | `Y GRUPO MOVE` |
| C4 | compras TORTILLERIA ERICK enero→fecha | hint null | `TORTILLERIA ERICK` |
| C5 | kg+descuento TORTILLERIA ERICK | hint null | `TORTILLERIA ERICK` |
| D1 | `del cliente Y GRUPO MOVE` | hint null | `Y GRUPO MOVE` |
| D2 | `del cliente TORTILLERIA ERICK` | hint `TORTILLERIA` forzado | `TORTILLERIA ERICK`; recorte no se usa |
| E1 | `de GRUPO MOVE EMPRESARIAL` | hint null | `GRUPO MOVE EMPRESARIAL` |

## Archivos modificados

- `lib/director-ia-client-profile.js` — extractor embebido, Slice B, drop de prefijos, flag canónico
- `lib/director-ia-conversation-state.js` — transporte de candidatos y flag
- `lib/director-ia-chat.js` — pasa `embedded_client_requires_canonical`
- `test/director-ia-compound-client-query.test.js` — nuevo
- `docs/dev-loop/CURRENT_TASK.md` — solo `status` AUTHORIZED→IN_PROGRESS→DONE_PENDING_REVIEW
- `docs/dev-loop/reports/IMPL-DIRECTOR-IA-COMPOUND-CLIENT-QUERY-001.md` — este reporte

No modificados (alcance): `lib/director-ia-planner.js` (innecesario), `server.js`, `docs/director-ia/*`, parser de periodo, leading-Y extractor.

## Tests

Nuevo: `test/director-ia-compound-client-query.test.js` (integración `resolveConversationTurn` + `detectDirectorIaIntent` + `loadClientProfileForChat`, no solo helpers).

Cubre: B1–B4, C1–C5, D1–D2, E1, sabemos Y GRUPO MOVE, leading-Y, `¿Y Arturo?`, colisión Arturo, `¿Qué sabemos de Y Arturo?`, default 3M, enero→fecha, inexistente, duplicate→ambiguous, sin cliente, compras de la planta, control `Y DELTA NORTE`, no-hardcode.

Focalizados:

- `test/director-ia-compound-client-query.test.js` — 30 pass
- `test/director-ia-leading-y-client-hint.test.js` — pass
- `test/director-ia-client-profile.test.js` — pass
- `test/director-ia-conversational-continuity.test.js` — pass (incluye planner continuity hooks)
- `test/director-ia-natural-followup.test.js` — pass
- `test/director-ia-persistent-memory.test.js` — pass

Suite:

```text
node --test test/director-ia-*.test.js
1384 pass / 0 fail
```

Baseline previo: 1354 pass / 0 fail. Tras `fb4445eb`: 1379. Follow-up humano: +5 tests, total 1384. Ningún test existente eliminado.

Protecciones de fórmula descuento/kg, autorización por planta y `DATA_NOT_FOUND`: **PROVEN** por la suite existente (0 fail). No se reabrió su diseño.

## Riesgos

- El ancla `\bde\s+` puede recoger un nombre capitalizado que no sea cliente si aparece después de `de` en otra frase. Mitigado por fail-closed canónico, por no activar Slice B sin métrica compras/kg, y por rechazo exacto de planta conocida.
- `extractEntityHint` sigue recortando D2 a un token; el transporte lo anula. Un caller que ignore `entity_hint_candidates` podría ver el recorte. Chat/loader usan el span largo + flag.
- Preguntas de compras/kg con cliente embebido y la palabra `planta` ahora sí pueden ser `client_profile` si hay span (no era acceptance). `compras de la planta` sin span sigue fuera.
- Un proper noun de un solo token que **no** esté en `PLANTS_PROVINCIA` ni en `ALIAS_PLANTA_NOMBRE` puede seguir abriendo Slice B. No se inventó un catálogo extra. Residual documentado en el follow-up humano.

## OUT_OF_SCOPE

Hallazgos no corregidos (documentados, no implementados):

- `server.js` / Exit 137 / PG pool / Render / deploy
- DB/schema/migrations
- `docs/director-ia/*`, `AGENTS.md`, `LOOP_PROTOCOL.md`, `TASK_TEMPLATE.md`, reports/README
- `plant_switch`
- `Ahora dime lo mismo…` / `inherit=false` de aquel hallazgo
- reescritura de leading-Y CLOSED
- cambio del parser `enero a la fecha`
- clientes nuevos / aumentaron / disminuyeron / dejaron de comprar / movimiento
- Golden Set general
- fuzzy resolver / aliases / LLM para identidad
- `lib/director-ia-planner.js` (no fue necesario)

## Diff summary

```text
docs/dev-loop/CURRENT_TASK.md
lib/director-ia-chat.js
lib/director-ia-client-profile.js
lib/director-ia-conversation-state.js
test/director-ia-compound-client-query.test.js
docs/dev-loop/reports/IMPL-DIRECTOR-IA-COMPOUND-CLIENT-QUERY-001.md
```

Fuera de scope en el diff: ninguno.

## Declaraciones

| Campo | Valor | Evidencia |
| --- | --- | --- |
| Slice A | YES | C1–C5, D1–D2, E1 en test de integración |
| Slice B | YES | B1–B4 + default 3M |
| fail-closed | YES | inexistente + D2 recorte + no-cliente |
| ambiguity | YES | duplicate exact |
| leading-Y intacto | YES | tests leading-Y + controles en compound |
| parser enero→fecha intacto | YES | slots C1 + tests historical range existentes |
| hardcode | NO | test lee runtime sin literales de acceptance |
| merge | NO | no ejecutado |
| deploy | NO | no ejecutado |
| producción verbal | NOT_PROVEN | no se consultó DB ni Render |

## Human review follow-up

Revisión sobre `fb4445ebd755904f79f244bc1b0290a20871d87c`. Misma tarea. Sin nueva rama.

### Gap 1 — conectores internos

**Encontrado.** `collectEmbeddedNameTokens` heredaba `NAME_STOP` (`de`, `del`, `el`, `la`, `los`, `las`) como corte duro.

**Reproducción (antes, SHA `fb4445eb`):**

| Pregunta | longest |
| --- | --- |
| `Dame las compras de COMERCIAL DEL PACIFICO.` | `COMERCIAL` |
| `Dame los kg comprados de MOLINOS DE ACAPULCO desde enero a la fecha.` | `ACAPULCO` (spans `MOLINOS` + `ACAPULCO`) |

**Corrección.** Separar:

- conectores internos `de/del/el/la/los/las`: se aceptan **entre** name-heads;
- sentence-boundary: `desde`, `hasta`, `fecha`, `planta`, meses, `cada`, `por`, canales.

No se quitaron todos los stops. No se captura hasta el final de la oración.

`dropStrictPrefixHints` ahora también descarta **sufijos** contenidos (`ACAPULCO` no sobrevive junto a `MOLINOS DE ACAPULCO`). D2 (`TORTILLERIA` prefijo) se conserva.

**Después:**

| Pregunta | intent | candidate | identity | periodo |
| --- | --- | --- | --- | --- |
| COMERCIAL DEL PACIFICO | `client_profile` | `COMERCIAL DEL PACIFICO` | exacto | default 3M |
| MOLINOS DE ACAPULCO enero→fecha | `client_profile` | `MOLINOS DE ACAPULCO` | exacto | explicit 01–09 |

La regex sigue sin declarar identidad. Canonical exact obligatorio.

### Gap 2 — Slice B demasiado amplio

**Encontrado.** `namesPurchaseOrKgMetric && hasEmbeddedClientSpan` clasificaba cualquier capitalizada tras `de`.

**Reproducción (antes):**

| Pregunta | isCPQ | intent |
| --- | --- | --- |
| `Dame las compras de Acapulco.` | true | `client_profile` |
| `Dame las compras de Puebla.` | false | `unknown` (ya estaba en `NAME_STOP`) |
| `Dame las compras de Arturo.` | true | `client_profile` (debe conservarse) |

**Inspección de mecanismo de planta.** No hay reconocedor de planta en esta capa sin catálogo o DB.

- `extractExplicitPlant` (CEL) exige catálogo inyectado y CEL ya importa `isClientProfileQuestion` → cycle.
- `extractLeadingYHintCandidates` / `plant_switch` no identifican planta por nombre.
- Ya dependemos de `dicf-acciones` (`ALIAS_PLANTA_NOMBRE` exportado).
- `delta-ingreso-commands` ya exporta `PLANTS_PROVINCIA` (lista existente, incluye el nombre de planta del ejemplo). No se inventó un catálogo nuevo. No se escribió el literal `Acapulco` en runtime.

**Corrección.** `hasDefensibleEmbeddedClientSpan`: hay span **y** el span completo **no** es igualdad `exactNorm` contra `PLANTS_PROVINCIA` ∪ keys/values de `ALIAS_PLANTA_NOMBRE`.

No se usó `resolvePlanta` (tiene `.includes`). No se exigió “2+ palabras”. `Dame las compras de Arturo.` sigue siendo `client_profile`.

**Después:**

- `Dame las compras de Acapulco.` → no `client_profile`
- `Dame las compras de Puebla.` → no `client_profile` (control estructural equivalente)
- `Dame las compras de Arturo.` → sí `client_profile`

### Tests del follow-up

Añadidos en `test/director-ia-compound-client-query.test.js`:

1. COMERCIAL DEL PACIFICO
2. MOLINOS DE ACAPULCO + enero→fecha
3. Acapulco / Puebla no abren Slice B
4. Arturo un token sí abre Slice B
5. sentence-boundary `desde`/`fecha`

B1–E1, leading-Y, Arturo, fail-closed, ambiguity, default 3M, enero→fecha, precedencias: verdes.

### Riesgo residual Gap 2

Un proper noun de un solo token **ausente** de `PLANTS_PROVINCIA` y de `ALIAS_PLANTA_NOMBRE` puede seguir abriendo Slice B. Cerrar eso exigiría un catálogo manual nuevo o DB. Fuera de este follow-up. La identidad final sigue siendo fail-closed canónico.

## Human review / closure

HUMAN_REVIEW = APPROVED
IMPLEMENTATION_ACCEPTED = YES
MERGE_AUTHORIZED = YES
DEPLOY_AUTHORIZED = NO
CLOSED_BY_HUMAN = YES

Reviewed implementation head:

d94cf75b7ccaaedbb9d05523dcb10c5c9f72bf1c

Human review accepted:

- Slice A embedded client identity
- Slice B no-period client semantics
- canonical exact resolution
- fail-closed behavior
- multi-token names with internal connectors
- known-plant exclusion from Slice B
- leading-Y / Arturo regressions
- default 3M
- explicit historical period preservation

Residual documented proper-noun routing risk is accepted as non-blocking because final client identity remains canonical-exact and fail-closed.

No deploy authorized.
