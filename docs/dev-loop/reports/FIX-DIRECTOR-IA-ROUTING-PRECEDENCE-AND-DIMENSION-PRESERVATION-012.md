# FIX-DIRECTOR-IA-ROUTING-PRECEDENCE-AND-DIMENSION-PRESERVATION-012

## Identidad

| Campo | Valor |
|---|---|
| task_id | FIX-DIRECTOR-IA-ROUTING-PRECEDENCE-AND-DIMENSION-PRESERVATION-012 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | 39e3ea3c805caf8089b3ee9e46ade598fd07bbe5 |
| branch | fix/director-ia-routing-precedence-dimensions-012 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |
| PR | no |
| frontend | no tocado; `npm run build` no requerido |

## Contratos consultados

- `docs/director-ia/` no se modificó (sin G2/G3).
- `origin/main` `39e3ea3c` (merge de 011 / PR #56) como base.
- Mapeos físicos ya existentes de categoría/subcategoría/canal (007 / ARR / IGF): `row.canal \|\| row.categoria` → CASA/COMISIONISTA; `subcategoria \|\| subcanal`.
- Movimiento de clientes existente: `kg_B <= 0 AND kg_A > 0` para DEJARON_DE_COMPRAR; ranking `ABS(delta_kg)`.
- Comentarios físicos: `arr.cliente_comentarios`.
- Action Register: `arr.action_register_items` (`created_at` / `creada_ymd` para recencia).
- Bitácora/Plaud: `arr.director_ia_bitacora` (`titulo`, `resumen_ia`, `contenido`, `vista_previa`, `texto`).

## Contratos modificados

Ninguno.

## Archivos tocados

- `lib/director-ia-routing-precedence-dimensions-012.js` (nuevo)
- `lib/director-ia-planner.js`
- `lib/director-ia-chat.js`
- `lib/director-ia-conversation-state.js`
- `lib/director-ia-executive-context-sales-entity-010.js`
- `lib/action-register-board.js` (expone `created_at` / `creada_ymd` del loader existente)
- `test/director-ia-routing-precedence-dimensions-012.test.js` (nuevo)
- `test/fixtures/director-ia-routing-precedence-dimensions-012.js` (nuevo)
- `docs/dev-loop/reports/FIX-DIRECTOR-IA-ROUTING-PRECEDENCE-AND-DIMENSION-PRESERVATION-012.md`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)

No se commitean `.next`, `node_modules` ni reportes OPS-VERIFY ajenos.

## Causa raíz por familia

### CHANNEL_SALES_STATUS

«¿Cómo va la venta Casa?» caía en `SALES_STATUS` de 010 (venta total de planta). 010 no conservaba `channel`. El filtro físico tampoco usaba `canal`/`categoria`. Resultado observado: «Estado de venta de la planta» y `0.0 t` si el total de planta no coincidía con Casa.

### CLIENT_MOVEMENT_DEJARON

«Top 10 clientes que dejaron de comprar» pedía mes. «septiembre» se reclasificaba como `CLIENT_RANKING` (top compradores) porque `isPeriodOnlyAnswer` + herencia de ranking ganaban a movimiento. Se perdían `movement=DEJARON_DE_COMPRAR`, `operation=RANK` y `limit=10`.

### CLIENT_COMMENTS_PERIOD

«¿Qué comentarios de clientes tenemos en septiembre?» era robada por `client_movement` (forceIntent del padre o palabras de movimiento/mes). Devolvía AUMENTÓ / DISMINUYÓ / DEJÓ DE COMPRAR en vez de `arr.cliente_comentarios`.

### ACTION_REGISTER_DIRECT

«¿Qué acciones tenemos?» no cumplía el patrón estrecho del planner (`abiert|pendient|register`) y caía a `unknown`.

### ACTION_REGISTER_RECENT

«últimas / recientes / nuevas» se resolvía como Action Register por criticidad (`dias_vencido`) y expandía diagnóstico ejecutivo. Recencia de registro no era una dimensión.

### BITACORA_TOPIC_LOOKUP

«¿Qué sabemos de Oaxaca?» exigía la palabra literal «bitácora». Sin ella iba a `unknown` o a `client_profile`. Oaxaca se podía interpretar como cambio de planta.

## Matriz de precedencia

Regla central: **explícito del turno actual > contexto heredado > fallback genérico**.

Orden de `classify012Family`:

1. `CLIENT_COMMENTS_PERIOD` — comentario / observación / nota comercial / notas de cliente
2. Follow-up corto de comentarios (`y solo Casa`, etc.) solo si el padre es comentarios y el turno no trae venta/acciones/dejaron
3. `ACTION_REGISTER_RECENT` — últimas / recientes / nuevas / recién / fecha de registro
4. `ACTION_REGISTER_DIRECT` — acciones / Action Register / pendientes / compromisos / vencidas (con ancla de acciones)
5. `CLIENT_MOVEMENT_DEJARON` — dejaron de comprar/consumir/pedir, cayeron a cero, clientes perdidos, ya no compran
6. `CHANNEL_SALES_STATUS` — venta/cómo va + canal o subcategoría explícitos
7. `BITACORA_TOPIC_LOOKUP` — qué sabemos / hay información / qué se ha dicho de X, si no hay intención de mayor prioridad

En el planner:

- Comentarios, Action Register (reciente/directo), DEJARON y venta por canal se resuelven **antes** de inactivos 011 y venta total 010.
- Bitácora temática se resuelve **después** de 011 OPEN/LAST, 010, regulación, SEH y Taller, y **antes** de `client_profile` genérico.
- `CLIENT_MOVEMENT` gana a `CLIENT_RANKING` / inactividad genérica / resumen ejecutivo cuando el movimiento mensual es explícito.
- «comentarios» gana a movimiento/ranking aunque coexistian «septiembre» o «dejaron de comprar».
- «acciones» gana a `unknown` / diagnóstico. «últimas acciones» gana a vencidas/críticas.
- El contexto heredado no fuerza `client_movement` si el turno actual clasifica a una familia 012.

Anti-robos explícitos:

| Señal | No puede caer en |
|---|---|
| venta Casa | venta total de planta |
| venta total / venta proyectada / % Casa y Comisionista | CHANNEL_SALES_STATUS |
| dejaron de comprar (lista) | CLIENT_RANKING / inactivos genéricos |
| dejó de comprar + nombre (singular) | CLIENT_MOVEMENT (sigue `plant_diagnosis`) |
| comentarios | CLIENT_MOVEMENT |
| documentos de regulación pendientes | ACTION_REGISTER |
| últimas acciones | vencidas / críticas |
| Oaxaca como tema | cambio de planta |
| qué sabemos de él (pronombre) | bitácora (hereda diagnóstico/cliente) |
| tiene alguna acción (cliente activo) | Action Register directo |

## Dimensiones preservadas

La cadena classifier → planner → conversation_state → loader → answer conserva:

| Dimensión | Dónde vive |
|---|---|
| plant | planta UI / `planta_nombre`; no se reemplaza por un tema |
| period | turno actual o pending; no se inventa |
| channel | CASA / COMISIONISTA; no se hereda salvo follow-up de la misma familia |
| subcategory | Autotanque / Carburación / Portátil si es explícita |
| movement | DEJARON_DE_COMPRAR |
| operation | STATUS / COMPARE / SHARE / RANK / COMMENTS_LOOKUP |
| limit | top N / últimas N |
| sort | RECENT (`created_at`) vs vencido |
| entity | cliente activo si el turno lo confirma |
| topic | leftover temático de bitácora |

«¿Cómo va la venta?» (sin canal) sigue siendo total de planta (010). No hereda CASA de un turno anterior.

## Fuentes físicas vs fixtures inyectados

`server.js` no inyecta `predictiveSalesRows`, `clienteComentariosRows` ni `actionRegisterItems`. Esos arrays son solo atajo de test.

Si el array inyectado existe, el runtime lo usa y declara `source_mode=injected_test_rows`. Si no existe, carga el loader físico real. `sources[]` no afirma `arr.*` cuando el turno consumió fixtures.

| Familia | Test inyectado | Producción (sin inject) | Loader reutilizado |
|---|---|---|---|
| CHANNEL_SALES_STATUS | `predictiveSalesRows` / `clientRankingSalesRows` / `executiveSalesRows` | `arr.ventas_diarias_cliente` | `queryMonthlySales` + `resolvePlantCodes` (mismo join `cliente_categoria_mes` que ranking/ARR) |
| CLIENT_MOVEMENT_DEJARON | loader de movimiento existente | `arr.ventas_diarias_cliente` | sin cambio; ya tenía loader de chat |
| CLIENT_COMMENTS_PERIOD | `clienteComentariosRows` | `arr.cliente_comentarios` | `loadClienteComentariosForDirectorIa` |
| ACTION_REGISTER_DIRECT / RECENT | `actionRegisterItems` | `arr.action_register_items` (+ DICF del board) | `loadActionPersonBoardForChat` → `buildActionRegisterBoardPayload` |
| BITACORA_TOPIC_LOOKUP | `bitacoraEntries` | `arr.director_ia_bitacora` | `loadBitacoraForChat` (`titulo`, `resumen_ia`, `contenido`, `fecha`, `created_at`) |

Reglas físicas:

- venta: `canal\|\|categoria` → CASA/COMISIONISTA; `subcategoria\|\|subcanal`; periodo/corte 010; no se inventa SQL nuevo.
- comentarios: planta + periodo + canal + cliente si aplica; no lista vacía por falta de fixture.
- Action Register: misma fuente del board; RECENT ordena `created_at` / `creada_ymd` / `dicf_creada_ymd`. El SELECT existente ahora expone esas fechas.
- bitácora: fallback a `loadBitacoraForChat(pool, planta_id)` sin cambiar de planta.

## Pending clarification

«Top 10 clientes que dejaron de comprar» → «¿De qué mes?» → «septiembre» completa el frame original (`CLIENT_MOVEMENT` / DEJARON / RANK / 10). No reclasifica el mes como ranking.

El chat deja de forzar `client_movement` cuando `classify012Family` del turno actual es no nulo. El `selectedPeriod` del loader de movimiento toma el patch del pending.

## Continuidad de result set

`conversation_state` hereda `client_comments`, `action_register_recent` y `bitacora_topic_lookup`. Las entidades sanitizan `channel_sales`, `client_comments`, `action_register` y `bitacora_topic` con `result_set` cuando existe.

Follow-ups cubiertos:

- venta Casa → ¿Y Comisionista? / ¿Y Autotanque? / ¿Y en agosto?
- dejaron → septiembre
- comentarios septiembre → ¿y solo Casa?
- últimas acciones → Dame 10 / Solo Mantenimiento
- Oaxaca → ¿Qué fue lo último? / resúmelo

Un turno explícito nuevo (comentarios después de movimiento) **no** hereda la familia anterior.

## Fixtures (solo test)

No hay phrasebook de 300 frases en runtime. El fixture no se importa desde producción.

| Familia | Count |
|---|---|
| CHANNEL_SALES_STATUS | 50 |
| CLIENT_MOVEMENT_DEJARON | 50 |
| CLIENT_COMMENTS_PERIOD | 50 |
| ACTION_REGISTER_DIRECT | 50 |
| ACTION_REGISTER_RECENT | 50 |
| BITACORA_TOPIC_LOOKUP | 50 |
| **TOTAL utterances** | **300** |
| Anti-collisions | **526** (≥300) |
| Multi-turn | **165** (≥150) |

Anti-collisions cubiertas: venta Casa vs venta total; Casa vs planta; dejaron vs top compradores; dejaron vs disminuyeron; comentarios vs movimiento; comentarios septiembre vs comparación de meses; acciones vs unknown; últimas vs vencidas/críticas; Oaxaca tema vs Oaxaca planta; bitácora vs cliente/proyecto; forecast Casa vs venta observada.

Multi-turn cubiertos: Casa → Comisionista → Autotanque; dejaron → septiembre; dejaron → comentarios de ellos; comentarios → ¿y solo Casa?; acciones → últimas 10; últimas → Solo Mantenimiento; Oaxaca → lo último / resúmelo.

CLIENT_DISCOUNT_MOVEMENT quedó fuera de alcance.

## No hardcode

Runtime no contiene reglas fijas de Acapulco, Oaxaca, BAYAM RESIDENCES, GRUPO MOVE, septiembre, cifras observadas ni responsables. Generaliza por intent, entidad, operación, métrica, dimensión, periodo, contexto y fuente. Esos nombres viven solo en fixtures/tests.

## Frontend

No se tocó ningún archivo de `frontend-dashboard/`. Esta tarea es backend/routing. `npm run build` no era necesario.

## Tests

```
node --test test/director-ia-routing-precedence-dimensions-012.test.js
node --test test/director-ia-client-inactivity-direct-answers-ui-011.test.js
node --test test/director-ia-executive-context-sales-entity-010.test.js
node --test test/director-ia-purchase-evidence-enrichment-009.test.js
node --test test/director-ia-seh-taller-purchase-evidence-008.test.js
node --test test/director-ia-category-commission-ui-actions-007.test.js
node --test test/director-ia-direct-metrics-context-hardening-006.test.js
node --test test/director-ia-commercial-runtime-hardening-005.test.js
node --test test/director-ia-commercial-runtime-coverage-004.test.js
node --test test/director-ia-conversational-continuity.test.js
```

012 + 011–004 + continuidad + runtime físico sin inject: **161/161**.

Regresiones 011 mantenidas: inactivos; última compra de BAYAM; abre su información; lista múltiple no abre first-result; cliente explícito abre el correcto; «¿y TORTILLERIA ERICK?» abre ERICK.

Regresiones 010 mantenidas: ¿Cómo va la venta?; diagnóstico de la planta actual; septiembre contra octubre; mismo periodo del mes anterior; hoy/semana/mes; carburación sin estación; tendencia al cierre; llantas; cliente activo.

Regresiones 009–003 mantenidas: regulación, SEH, Taller, comisión Casa/Comisionista, `OPEN_PRONOSTICO`, `OPEN_CATEGORY_MOVEMENT`, clientes nuevos, movimiento, expected-next.

## Gate

- [x] venta Casa conserva `channel=CASA` y no responde 0.0 t de planta
- [x] venta sin canal sigue siendo total de planta
- [x] Casa Autotanque / Carburación / Portátil conservan subcategoría
- [x] follow-up Comisionista / Autotanque / agosto conservan planta y cambian la dimensión dicha
- [x] Top 10 dejaron + septiembre completa DEJARON/RANK/10, no ranking
- [x] comentarios ganan a movimiento
- [x] acciones directas no son unknown ni diagnóstico
- [x] últimas acciones ordenan por `created_at`
- [x] Oaxaca es tema de bitácora de la planta UI, no cambio de planta
- [x] 300 utterances / ≥300 anti-collisions / ≥150 multi-turn
- [x] 012/011/010/009/008/007/006/005/004 + continuidad verdes
- [x] frontend no tocado
- [x] no phrasebook de producción
- [x] no hardcode de planta / cliente / mes / cifras en runtime
- [x] sin arrays inyectados, venta Casa / comentarios / acciones / bitácora cargan loader físico
- [x] `sources` / `source_mode` distinguen fixture vs `arr.*`

## Desvíos respecto a CURRENT_TASK

Ninguno material. Bitácora temática se colocó después de 010/008 para no robar Taller, regulación ni «qué sabemos de él» de un diagnóstico con cliente activo.

Reopen de revisión de fuentes: el primer commit enrutaba bien en tests porque inyectaba arrays. La producción ahora reusa loaders existentes; no se agregó SQL nuevo de venta ni una segunda tabla de Action Register.

## Contradicciones o ambigüedades

Ninguna que bloquee. «¿Cuánto representa Casa?» es CHANNEL SHARE; «qué porcentaje fue Casa y Comisionista» permanece en `predictive_commercial` (004). Forecast/proyección de Casa no entra a venta observada.

## next_task_proposed

Ninguna. Un `DONE_PENDING_REVIEW` no autoriza la siguiente.

## secrets_check

Sin secretos, tokens ni credenciales.

## human_decision_needed

Revisión G1/G4 humana de esta rama. NO PR. NO merge. NO deploy. NO siguiente tarea desde el implementador.
