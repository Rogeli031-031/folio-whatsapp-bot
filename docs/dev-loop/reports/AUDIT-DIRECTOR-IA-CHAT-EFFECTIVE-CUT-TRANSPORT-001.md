# AUDIT-DIRECTOR-IA-CHAT-EFFECTIVE-CUT-TRANSPORT-001

```yaml
task_id: "AUDIT-DIRECTOR-IA-CHAT-EFFECTIVE-CUT-TRANSPORT-001"
outcome: "DONE_PENDING_REVIEW"
mode: "READ_ONLY_PHYSICAL_TRACE"
implementation: false
docs_director_ia_changed: false
live_db: false
live_db_authorized: false
browser_runtime: "HUMAN_EXECUTED_BROWSER_RUNTIME_EVIDENCE"
classification: "A. CHAT_CUT_TRANSPORTED_BUT_NOT_CONSUMED"
dashboard_effective_cut_value: "2026-09-05"
dashboard_effective_cut_source: "FRONTEND_EFFECTIVE_CUT_STATE"
live_post_upload_day: "2026-09-05"
snapshot_consumes_req_body_upload_day: false
live_response_septiembre_resultado_final: "-9565353"
igf_forecast_hosts_chat: false
chat_reads_localstorage_diana: false
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none — no Authorization, Bearer, cookies, tokens, or sensitive headers recorded"
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/director-ia/DIRECTOR_IA_CONSTITUTION.md
  - docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md
  - docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-RENTABILIDAD-LIVE-UPLOAD-DAY-RUNTIME-001.md
  - docs/dev-loop/reports/AUDIT-DIRECTOR-IA-DASHBOARD-EFFECTIVE-CUT-SOURCE-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
human_decision_needed:
  - "Revisión humana. No merge. No deploy. No next task. No FIX."
  - "CHAT_CUT_TRANSPORTED_BUT_NOT_CONSUMED. No diseñar implementación aquí."
```

## 0. G1 y alcance

Rama: `audit/director-ia-chat-effective-cut-transport-001` ≠ `main`.

| Campo | Valor |
|---|---|
| status al arranque | `AUTHORIZED` → solo `IN_PROGRESS` |
| authorized_by | `"Human Approver"` (intacto) |
| authorized_at | `"2026-09-05T21:46:19-06:00"` (intacto) |
| human_authorization | presente, READ_ONLY AUDIT ONLY (intacto) |
| implementation_authorized | NO |
| live_db_authorized | NO |
| merge_authorized | NO |
| deploy_authorized | NO |

No implementación. No tests. No LIVE_DB. No FIX.

Hechos previos (no reabiertos):

- `DASHBOARD_EFFECTIVE_CUT_SOURCE = FRONTEND_EFFECTIVE_CUT_STATE`
- `DASHBOARD_EFFECTIVE_CUT_VALUE = 2026-09-05`
- Director IA resolver: `arr.upload_log` = 0 → null → mini MTD
- `DEPLOY_STALE`, `B_UPLOAD_DAY`, `UPLOAD_DAY_QUERY_RESULT` no se reabren

Pregunta exacta: `¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?`

## 1. Superficies de chat

`/igf-forecast` (`IgfForecastClient`) **no monta** Director IA. El cut `2026-09-05` vive en state / control / `localStorage["Diana"]`. Esa página **no** escribe `upload_day` en su propia URL. El chat **no** lee `"Diana"`.

Montajes que sí POSTean chat:

| FILE | COMPONENT | ¿Pasa `uploadDay`? | Fallback URL |
|---|---|---|---|
| `frontend-dashboard/modules/director-ia/components/DirectorIaShell.tsx` ~240 | `DirectorIaChatPanel` en `/director-ia` | **no** (sin prop) | `window.location.search` `upload_day` |
| `frontend-dashboard/app/acciones/page.tsx` ~2121 | `DirectorIaChatModal` | `searchParams.get("upload_day")` | el panel también lee URL |
| `frontend-dashboard/modules/director-ia/components/DirectorIaChatPanel.tsx` | panel | prop `uploadDay` \|\| URL | sí |

Link Acciones → `/director-ia` (`acciones/page.tsx` ~1367): `t` + `planta_id` **sin** `upload_day`.

Link IGF → Acciones (`buildIgfForecastAccionesHref`): añade `upload_day` **solo si** el state IGF ya es YMD. Eso **puede** poner `2026-09-05` en `/acciones`, y el modal lo reenvía.

## 2. Construcción del POST

`buildDirectorIaChatBody` (`frontend-dashboard/modules/director-ia/lib/chat-request.js`):

```
uploadDay = parseYmd(input.upload_day) || resolveFromSearch(input.search)
si uploadDay: body.upload_day = uploadDay
si no: el campo se omite
```

Body base: `planta_id`, `question`. Opcional: `planta_nombre`, `history`, `conversation_state`.

**No** manda `year` ni `month`.
**No** lee `localStorage["Diana"]`.

`DirectorIaChatPanel.consultar`: `uploadDay = uploadDayProp || fromUrl` → `fetchDirectorIaChat(..., { upload_day, search: window.location.search })`.

## 3. Server hops (independientes del body LIVE)

`server.js` ~10024:

```
app.post("/api/director-ia/chat", dashboardAuthMiddleware, directorIaChat.handlePostChat)
```

`handlePostChat` (`lib/director-ia-chat.js` ~6065): lee `planta_id` y `question`. Pasa el `req` entero a `askDirectorIa`. No borra `req.body.upload_day` si existe.

`askDirectorIa` (~3855): lee `history`, `conversation_state`, `question`. Para esta pregunta entra al snapshot (`isRentabilidadDeterioroSnapshotQuestion` / evidence `rentabilidad_deterioro_snapshot`).

`assembleRentabilidadDeterioroSnapshot` (~5384) recibe **solo**:

- `question`
- `now`
- `pool`
- `loadRentabilidadKpis`
- `loadIgfForecastMiniPayload`
- `loadDeltaTopN`

**No** recibe `upload_day`, `req`, ni `req.body`.

`loadKpiForMonth` (mes B abierto): `resolveOpenMonthUploadDay` → `resolveUploadDayLikeClientesPorMes(..., { upload_day: deps.upload_day || null })`.

Con el call site actual: `deps.upload_day` es `undefined` → el snapshot **no consume** el cut del POST aunque el body lo traiga. El cut efectivo del snapshot sigue siendo `arr.upload_log` (LIVE 0 filas → null). Hecho de código; no reabre `UPLOAD_DAY_QUERY_RESULT`.

## 4. Matriz física (tras evidencia humana)

| HOP | FIELD | VALUE/SOURCE | REACHES NEXT HOP? | VERDICT |
|---|---|---|---|---|
| Dashboard effective cut | `upload_day` | `2026-09-05` / `FRONTEND_EFFECTIVE_CUT_STATE` | sí | **PRESERVED** |
| Director IA / Action Register context | `upload_day` | `2026-09-05` (llegó al POST de esa sesión) | sí | **PRESERVED** |
| POST `/api/director-ia/chat` | `upload_day` | `"2026-09-05"` | sí | **PRESERVED** — PROVEN BY `HUMAN_EXECUTED_BROWSER_RUNTIME_EVIDENCE` |
| HTTP handler | `req.body.upload_day` | no lo extrae; no lo borra; pasa `req` | sí | **PRESERVED** (pasajero) — PROVEN BY CODE |
| `handlePostChat` | `upload_day` | no lo lee; `askDirectorIa(req, …)` | sí (`req.body`) | **PRESERVED** (pasajero) — PROVEN BY CODE |
| `askDirectorIa` | `req.body.upload_day` | no se pasa a `assembleRentabilidadDeterioroSnapshot` | **no** | **DROPPED / NOT CONSUMED** — PROVEN BY CODE |
| rentabilidad snapshot deps | `deps.upload_day` | `undefined`; resolver `arr.upload_log` | no | **NOT_PRESENT** — PROVEN BY CODE + auditoría previa |

Relación con evidencia previa (no reabrir):

```
arr.upload_log LIVE = 0 filas
→ resolver = null
→ mini sin effective cut
→ septiembre MTD
```

Response LIVE observado (Human Approver; no rediseña fórmula):

```
Rentabilidad final septiembre 2026: -$9,565,353
```

Consistente con que `upload_day` del POST no es consumido por el snapshot.

## 5. Clasificación decisiva

```
A. CHAT_CUT_TRANSPORTED_BUT_NOT_CONSUMED
```

El POST LIVE **sí** contiene `upload_day=2026-09-05` (mismo effective cut del Dashboard). El snapshot **no** lo consume.

B REJECTED (el campo no está ausente).
C REJECTED (no es un YMD distinto).
D cerrado: el body LIVE ya no es RUNTIME_REQUIRED.

## 6. Cadena LIVE

```
FRONTEND_EFFECTIVE_CUT_STATE = 2026-09-05
  → Director IA / Action Register context                 PRESERVED
  → POST /api/director-ia/chat
       planta_id=1
       planta_nombre=Acapulco
       upload_day=2026-09-05                              PRESERVED
       HUMAN_EXECUTED_BROWSER_RUNTIME_EVIDENCE
  → HTTP handler / handlePostChat(req)                    PRESERVED (pasajero)
  → askDirectorIa(req.body.upload_day)                    DROPPED / NOT CONSUMED
  → assembleRentabilidadDeterioroSnapshot (sin upload_day)
  → resolveUploadDayLikeClientesPorMes(arr.upload_log=0)
  → null → mini MTD → -$9,565,353
```

## 7. `year` / `month` / `version_as_of_corte`

El Payload LIVE no reportó `year` ni `month`. El builder de chat no los manda. Irrelevantes para el transporte del cut.

## 8. Prohibiciones

No producto. No tests. No DB. No `arr.upload_log`. No FIX. No merge. No deploy. No next task. No navegador desde Cursor.

## 9. HUMAN_EXECUTED_BROWSER_RUNTIME_EVIDENCE

Ejecutor: Human Approver. Cursor no abrió el navegador.

```
POST /api/director-ia/chat
planta_id: 1
planta_nombre: "Acapulco"
question: "¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?"
upload_day: "2026-09-05"
```

No registrados: Authorization, Bearer, cookies, tokens, headers sensibles, history completo.

La auditoría **ya no** está bloqueada.

## 10. Conclusión

```
CHAT_CUT_TRANSPORTED_BUT_NOT_CONSUMED
```

El effective cut del Dashboard llega al POST. Se pierde en `askDirectorIa` → snapshot. El snapshot cae en `arr.upload_log` vacío.

No se diseña FIX. No se abre next task.
