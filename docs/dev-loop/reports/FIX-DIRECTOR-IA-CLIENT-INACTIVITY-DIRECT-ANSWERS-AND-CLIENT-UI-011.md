# FIX-DIRECTOR-IA-CLIENT-INACTIVITY-DIRECT-ANSWERS-AND-CLIENT-UI-011

## Identidad

| Campo | Valor |
|---|---|
| task_id | FIX-DIRECTOR-IA-CLIENT-INACTIVITY-DIRECT-ANSWERS-AND-CLIENT-UI-011 |
| outcome | DONE_PENDING_REVIEW |
| base_sha | fbbdbebb6e975546dc49712d8397451bf779d407 |
| branch | fix/director-ia-client-inactivity-direct-answers-ui-011 |
| schema_changes | false |
| data_mutation | false |
| merge | false |
| deploy | false |
| PR | no |
| frontend | tocado; `npm run build` verde |

## Contratos consultados

- `docs/director-ia/` no se modificó (sin G2/G3).
- `origin/main` `fbbdbebb` (merge de 010 / PR #55) como base.
- Cadena de última compra de 009: `computeDicf.lastPurchaseDate` → `arr.dicf_cliente_mes.last_date` → `MAX(fecha)` de `arr.ventas_diarias_cliente` con `kg > 0`, matching por `cliente_norm`.
- Modal existente `DeltaIngresoClienteForecastModal` (`token`, `planta`, `clienteNombre`).
- Acciones UI previas: `OPEN_CATEGORY_MOVEMENT`, `OPEN_IGF_PRONOSTICO_MODAL`, `OPEN_PRONOSTICO`.

## Contratos modificados

Ninguno.

## Archivos tocados

- `lib/director-ia-client-inactivity-direct-answers-ui-011.js` (nuevo)
- `lib/director-ia-planner.js`
- `lib/director-ia-chat.js`
- `lib/director-ia-category-commission-007.js`
- `lib/director-ia-conversation-state.js`
- `test/director-ia-client-inactivity-direct-answers-ui-011.test.js` (nuevo)
- `test/fixtures/director-ia-client-inactivity-direct-answers-ui-011.js` (nuevo)
- `frontend-dashboard/modules/director-ia/lib/api.ts`
- `frontend-dashboard/modules/director-ia/components/DirectorIaChatPanel.tsx`
- `frontend-dashboard/modules/director-ia/components/DirectorIaChatModal.tsx`
- `frontend-dashboard/components/IgfForecastClient.tsx`
- `docs/dev-loop/reports/FIX-DIRECTOR-IA-CLIENT-INACTIVITY-DIRECT-ANSWERS-AND-CLIENT-UI-011.md`
- `docs/dev-loop/CURRENT_TASK.md` (solo `status`)

No se commitean `.next`, `node_modules` ni reportes OPS-VERIFY ajenos.

## Causa raíz

### INACTIVE_CLIENTS

«¿Qué clientes no han comprado?» no caía en la lista física de inactivos. Caía a materialidad / CEL / diagnóstico de planta y contestaba share, Action Register, ARR, IGF y Bitácora. Eso no responde «quién no compró».

### LAST_PURCHASE_DIRECT

«¿Cuándo fue la última vez que compró BAYAM RESIDENCES?» era absorbida por CEL / materialidad comercial. Aunque 009 ya resolvía `lastPurchaseDate`, la respuesta no usaba esa cadena y podía decir que la fecha no estaba disponible.

### DIRECT_ANSWER_COMPRESSION

Una pregunta de un dato disparaba el pack ejecutivo completo (Action Register + ARR + IGF + Bitácora + DICF). No existía política de «responder primero y solamente lo preguntado».

### OPEN_CLIENT_DELTA_FORECAST

«abre la información del cliente BAYAM RESIDENCES» solo devolvía texto. No existía acción UI ejecutable hacia el modal que IGF Forecast ARR ya abre a mano.

## Fuentes físicas

| Familia | Fuente | Regla |
|---|---|---|
| INACTIVE_CLIENTS | `computeDicf` (buckets) enriquecido por 009 (`arr.dicf_cliente_mes.last_date` → `MAX(fecha)` ventas `kg > 0`) | Inactivo si `status=Inactivo`, o días sin compra > frecuencia, o mes de última compra < mes actual. Una sola fuente declarada; no se mezclan silenciosamente. |
| LAST_PURCHASE / FREQUENCY / DAYS / OVERDUE / EXPECTED | misma cadena 009 | Matching por `cliente_norm`. Sin fecha/frecuencia → `INSUFFICIENT_EVIDENCE`. |
| OPEN_CLIENT_DELTA_FORECAST | catálogo DICF de la planta + planta/periodo del chat | Match único abre; ambiguo pregunta; no encontrado no abre otro cliente. |

No se inventan fecha, frecuencia, estado, planta ni mes.

## Política de respuesta corta

Para `LAST_PURCHASE`, `PURCHASE_FREQUENCY`, `DAYS_SINCE_LAST`, `OVERDUE_STATUS`, `EXPECTED_NEXT_PURCHASE`, `INACTIVE_CLIENTS`:

- responder primero y solamente lo preguntado;
- no expandir a MATERIALIDAD COMERCIAL, Action Register, DICF summary, Bitácora, ARR, IGF, resumen de bloques ni limitaciones genéricas.

Se amplía solo si el usuario pide por qué / diagnóstico / análisis / contexto completo / evidencia / resumen ejecutivo.

Salida de inactivos (por defecto, corta):

```
Clientes que no han comprado / están inactivos:

1. CLIENTE A — última compra DD/MM/AAAA — N días sin comprar
...
¿Quieres que te muestre todos?
```

Salida de última compra:

```
BAYAM RESIDENCES compró por última vez el DD/MM/AAAA.
Frecuencia histórica: cada N días.
Lleva N días sin comprar.
```

Anti-colisión obligatoria: «no compraron / dejaron de comprar / inactivos / sin compra» ≠ «compraron poco / bajaron / disminuyeron / menor volumen / baja participación».

## Flujo de cliente activo

Se mantiene la corrección de 010: `active_entity.kind = CLIENT` + `canonical_name`.

- «¿Cuál fue su última compra?» con cliente activo no lista el universo DICF.
- Hint: primero nombre del catálogo contenido en la pregunta; luego leftover de tokens; luego entidad activa.
- Cambio explícito («¿y TORTILLERIA ERICK?») reemplaza la entidad.
- Planta del chat (`planta_nombre`) se hereda. El nombre del cliente no es planta.
- Periodo: conversación → periodo IGF del body si existe → no se inventa mes.

Expected-next nombrado («¿Cuándo esperamos que vuelva a comprar…?») sigue en `predictive_commercial` (008/009), salvo `LAST_PURCHASE_DIRECT`.

## UI action

Tipo: `OPEN_CLIENT_DELTA_FORECAST`

Payload:

```
{ type, client, plant, plant_id, period }
```

Patrón igual que `OPEN_CATEGORY_MOVEMENT` / `OPEN_IGF_PRONOSTICO_MODAL` / `OPEN_PRONOSTICO`. `sanitizePendingUiAction` (007) acepta el tipo y conserva `client` / `plant_id` / `period`.

Resolución:

- match único → emite `ui_action` y abre;
- varios → aclara, no abre;
- no encontrado con catálogo cargado → no abre otro cliente;
- sin catálogo cargado → usa el hint canónico (el modal ya abre por nombre).

Follow-ups cubiertos:

- última compra / expected-next de un cliente → «abre su información» abre ese cliente;
- lista de inactivos → mención del cliente fija `active_entity` → «abre su información» abre ese;
- «¿y TORTILLERIA ERICK?» + «abre su información» abre ERICK, no el anterior.

## Frontend

No se creó un segundo modal. Se reutiliza el flujo manual de IGF Forecast ARR:

`IgfForecastClient` → estado `dicfModalCliente` / `dicfModalPlant` → `DeltaIngresoClienteForecastModal` (`token`, `planta`, `clienteNombre`, `canDicfAcciones=false`).

El periodo del modal es el del módulo IGF ya abierto. No se cambió el diseño visual.

Archivos:

| Archivo | Cambio |
|---|---|
| `frontend-dashboard/modules/director-ia/lib/api.ts` | `DirectorIaUiAction` acepta `client` / `plant_id` / `period` |
| `frontend-dashboard/modules/director-ia/components/DirectorIaChatPanel.tsx` | ejecuta `OPEN_CLIENT_DELTA_FORECAST` |
| `frontend-dashboard/modules/director-ia/components/DirectorIaChatModal.tsx` | propaga `onOpenClientDeltaForecast` |
| `frontend-dashboard/components/IgfForecastClient.tsx` | `handleOpenClientDeltaForecastFromChat` setea el estado existente del modal |

`npm run build` en `frontend-dashboard`: verde.

## Fixtures (solo test)

No hay phrasebook de 200 frases en runtime.

| Familia | Count |
|---|---|
| INACTIVE_CLIENTS | 50 |
| LAST_PURCHASE_DIRECT | 50 |
| DIRECT_ANSWER_COMPRESSION | 50 |
| OPEN_CLIENT_DELTA_FORECAST | 50 |
| **TOTAL utterances** | **200** |
| Anti-collisions | **160** (≥150) |
| Multi-turn | **105** (≥100) |

Anti-collisions cubiertas: no han comprado vs compraron poco; dejaron de comprar vs disminuyeron; inactivo vs bajo share; última compra vs materialidad; última compra vs expected next; abre cliente vs texto; abre cliente vs `OPEN_PRONOSTICO`; abre cliente vs `OPEN_CATEGORY_MOVEMENT`; abre información vs diagnóstico; `su información` con/sin `active_entity`; cliente no encontrado vs abrir match parecido.

Multi-turn cubiertos: lista inactivos → BAYAM → última compra → frecuencia → atrasado → abre su información; «Háblame de BAYAM» → abre el detalle; «¿y TORTILLERIA ERICK?» → abre su información (abre ERICK).

## No hardcode

Runtime no contiene reglas fijas de BAYAM RESIDENCES, TORTILLERIA ERICK, Acapulco, 2026-09 ni fechas concretas. Generaliza por entidad, operación, evidencia, `active_entity`, planta, periodo y tipo de UI action. Esos nombres viven solo en fixtures/tests.

## Tests

```
node --test test/director-ia-client-inactivity-direct-answers-ui-011.test.js
node --test test/director-ia-executive-context-sales-entity-010.test.js
node --test test/director-ia-purchase-evidence-enrichment-009.test.js
node --test test/director-ia-seh-taller-purchase-evidence-008.test.js
node --test test/director-ia-category-commission-ui-actions-007.test.js
node --test test/director-ia-direct-metrics-context-hardening-006.test.js
node --test test/director-ia-commercial-runtime-hardening-005.test.js
node --test test/director-ia-commercial-runtime-coverage-004.test.js
node --test test/director-ia-predictive-commercial-coverage.test.js
test/director-ia-plant-diagnosis.test.js
test/director-ia-conversational-continuity.test.js
```

011–003 + diagnóstico + continuidad: **186/186**.

Regresiones 010 mantenidas: ¿Cómo va la venta?; diagnóstico de la planta actual; septiembre contra octubre; mismo periodo del mes anterior; hoy/semana/mes; estación de carburación; tendencia al cierre; TORTILLERIA ERICK expected-next + «¿Cuál fue su última compra?»; llantas SUM / LIST → SUM.

Regresiones 009–003 mantenidas: regulación, SEH, Taller, comisión Casa/Comisionista, `OPEN_PRONOSTICO`, `OPEN_CATEGORY_MOVEMENT`, clientes nuevos, movimiento, expected-next.

## Gate

- [x] «¿Qué clientes no han comprado?» lista inactivos reales, no materialidad
- [x] no compraron ≠ compraron poco
- [x] última compra directa usa cadena 009 y es corta
- [x] ops LAST/FREQUENCY/DAYS/OVERDUE/EXPECTED/INACTIVE no expanden Action Register/ARR/IGF/Bitácora
- [x] `OPEN_CLIENT_DELTA_FORECAST` emite `ui_action` ejecutable
- [x] reutiliza `DeltaIngresoClienteForecastModal` existente
- [x] match único abre; ambiguo aclara; no encontrado no abre otro
- [x] hereda planta y cliente activo; «¿y ERICK?» abre ERICK
- [x] ≥200 utterances / ≥150 anti-collisions / ≥100 multi-turn
- [x] 011/010/009/008/007/006/005/004/003 verdes
- [x] frontend `npm run build` verde
- [x] no phrasebook de producción
- [x] no hardcode de clientes / planta / fechas en runtime

## Desvíos respecto a CURRENT_TASK

Ninguno material. «dejaron de comprar» (lista) sigue pudiendo clasificar a `client_movement` (004) cuando es `LOST_CLIENTS`; el chat comprime la respuesta con el builder 011 si la pregunta es de inactivos y no de volumen.

## Contradicciones o ambigüedades

Ninguna que bloquee. Periodo del modal: el componente existente no recibe `period` explícito; usa el contexto IGF ya abierto. El payload de la acción sí puede llevar `period` para el frontend.

## next_task_proposed

Ninguna. Un `DONE_PENDING_REVIEW` no autoriza la siguiente.

## secrets_check

Sin secretos, tokens ni credenciales.

## human_decision_needed

Revisión G1/G4 humana de esta rama. NO PR. NO merge. NO deploy. NO siguiente tarea desde el implementador.

## Cierre

`CURRENT_TASK` → `DONE_PENDING_REVIEW`.  
Commit + push solo a `fix/director-ia-client-inactivity-direct-answers-ui-011`.  
NO PR. NO merge. NO deploy. NO siguiente tarea.

---

## Nota de revisión (reopen humano, misma tarea)

Hallazgo: `client_inactivity` guardaba `active_entities: list.slice(0, 1)`, promoviendo el primer cliente de una lista múltiple. Eso autorizaba en silencio `OPEN_CLIENT_DELTA_FORECAST` ante «abre su información».

Corrección:

- Lista de varios clientes → result set (`kind=client_movement`, `result_set` / `ranked_names`). **No** `active_entity=CLIENT`.
- `active_entity=CLIENT` solo si el usuario nombra un cliente con match único, el result set tiene un solo elemento, o ya había un CLIENT heredado y el turno no lo reemplaza.
- «abre su información» sobre lista múltiple → aclara «¿cuál?», **sin** `ui_action`.
- Nombre explícito (p. ej. BAYAM RESIDENCES) fija CLIENT; el siguiente «abre su información» abre ese cliente.
- Cambio explícito («¿y TORTILLERIA ERICK?») abre el nuevo.
- No hay first-result fallback silencioso.

Pruebas nuevas en `test/director-ia-client-inactivity-direct-answers-ui-011.test.js` (`011 no first-result silencioso`).

Frontend no se tocó; `npm run build` no era necesario.

Re-run: 011 + 010–003 + plant_diagnosis + continuity = **191/191**.

`CURRENT_TASK` permanece `DONE_PENDING_REVIEW`.  
Commit + push a la misma rama. NO PR. NO merge. NO deploy. NO siguiente tarea.
