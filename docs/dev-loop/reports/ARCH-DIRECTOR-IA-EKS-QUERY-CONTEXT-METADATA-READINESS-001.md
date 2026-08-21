# Reporte — ARCH-DIRECTOR-IA-EKS-QUERY-CONTEXT-METADATA-READINESS-001

```yaml
task_id: "ARCH-DIRECTOR-IA-EKS-QUERY-CONTEXT-METADATA-READINESS-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EKS-QUERY-CONTEXT-METADATA-READINESS-001.md"
files_not_touched:
  - "lib/"
  - "sql/"
  - "scripts/"
  - "server.js"
  - "frontend-dashboard/"
  - "docs/director-ia/"
  - "PostgreSQL / producción"
contracts_consulted:
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"
contracts_modified: []
ambiguities_or_contradictions:
  - >
    CURRENT_TASK.in_scope cita docs/director-ia/04-INTERPRETATION-EVIDENCE-SNAPSHOT.md,
    archivo inexistente. Se leyó el contrato real 04-IES-STANDARD.md. No bloquea el slice.
deviations_from_current_task:
  - >
    Lectura adicional solo-lectura de lib/director-ia-dashboard-cycle-transport.js
    (no estaba en in_scope) porque es el único productor físico del shape de
    query_context_metadata del ciclo dashboard. No se modificó.
next_task_proposed: "IMPL-DIRECTOR-IA-EKS-PERSIST-QUERY-CONTEXT-METADATA-001"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED. Este reporte no autoriza la siguiente tarea."
  - "G2/G3 no son necesarios para el NEXT_TASK si persiste metadata como sibling de Snapshot fuera del Bundle y fuera del digest D7, conforme a 03 §8."
```

## Ejecución

- Rama: `architecture/director-ia-eks-query-context-metadata-readiness-001` (≠ `main`).
- G1 leído: `authorized_by`, `authorized_at`, `human_authorization` intactos; no modificados por el implementador.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → este reporte → `DONE_PENDING_REVIEW` (solo `status` + bloque de resultado de auditoría).
- `max_attempts: 1`. Sin implementación, SQL, smoke, commit, push, merge ni G2/G3.

---

## Mandatory findings

### Shape exacto actual de `query_context_metadata`

Contrato (`03` §8 / `04` §3), campos mínimos:

| Campo | Obligatorio |
|-------|-------------|
| `executive_query_id` | Sí |
| `query_fingerprint` | No |
| `trace_id` | Sí |
| `original_question` | Sí |
| `intent` | Sí |
| `requesting_user_id` | Sí |
| `requesting_role` | Sí |
| `channel` | Sí |
| `plant_or_scope` | Condicional |
| `period` | Condicional |
| `resolved_entities` | Sí (lista, puede vacía) |
| `permission_restrictions` | Sí (lista, puede vacía; sin tokens) |
| `knowledge_effective_date` | Sí |

Shape que **crea** el ciclo dashboard (`lib/director-ia-dashboard-cycle-transport.js` `buildCycleInput`):

```text
{
  executive_query_id: "eq_dashboard_arr_venta_ton",
  trace_id: "pending_arr_trace",          // placeholder; real-cycle lo sustituye por trace ARR
  original_question: "venta_ton",
  intent: "arr_venta_ton",
  requesting_user_id: <actor_id o "dashboard_user">,
  requesting_role: <rol JWT o "unknown">,
  channel: "dashboard",
  resolved_entities: [{
    entity_type: "planta",
    original_value: "<planta_id>",
    resolution_state: "RESOLVED" | "UNRESOLVED",
    candidates: [],
    entity_id?: <plant_code si RESOLVED>
  }],
  permission_restrictions: [],
  knowledge_effective_date: <clock() ISO>,
  plant_or_scope?: <plant_code>,
  period?: "<year>-<MM>"                 // solo si year y month presentes
}
```

`query_fingerprint` **no** se emite hoy. IES `QUERY_REQUIRED` coincide con los obligatorios de `04` (sin `query_fingerprint` / `plant_or_scope` / `period`).

### Shape persistido en `eks.snapshots.bundle`

JSONB = Knowledge Bundle N1–N4 validado por `validate_structure` (listas, `source_health`, `ruleset_versions`, `traceability`, `bundle_id`, `trace_id`, `produced_at`, `producer=evidence_builder`, `knowledge_coverage`). **No** incluye `query_context_metadata`.

Columnas INSERT actuales (`createPgStore.insertSnapshot` / `sql/015_director_ia_eks.sql`):

`snapshot_id, bundle_id, trace_id, version, persisted_at, bundle, integrity`

### Punto exacto de divergencia

1. Transporte construye `query_context_metadata` y lo pone en el input del ciclo.
2. `createDirectorIaArrInput.run` llama `eks.append_snapshot(bundle)` — solo Bundle.
3. `append_snapshot` hashea e inserta **solo** el Bundle (`computeIntegrity(persistedBundle)`).
4. `arr_cycle.snapshot` público **no** lleva `query_context_metadata` (test `director-ia-real-cycle.test.js` lo afirma).
5. `createDirectorIaRealCycle.run` **después** del append: `snapshotForIes = clone(arr_cycle.snapshot); snapshotForIes.query_context_metadata = metadata;` y `metadata.trace_id = traceId`.
6. IES `build()` exige el sibling en el objeto Snapshot en memoria. Nunca lee PG para esa metadata.

Pérdida de persistencia = paso 2–3. El splice del paso 5 no se escribe.

### Compatibilidad histórica

Filas actuales de `eks.snapshots` no tienen columna ni clave de Bundle para la metadata. No hay obligación contractual de backfill. Replay IES de un `get_snapshot` histórico fallaría `MISSING_QUERY_CONTEXT_METADATA` (ya ocurre: `get_snapshot` no devuelve el campo). El ciclo live no depende de PG para IES.

### Integrity / canonicalization

`03` §8 Relación con D2/R3: la metadata **no entra** en el digest D7 del Bundle. Runtime: `computeIntegrity` hashea el Bundle completo. Meter la metadata **dentro** de `bundle` la incluiría en D7 y violaría «sin incorporarla al Bundle». IES tiene huella propia (`content_fingerprint`) sobre el IES proyectado, distinta de D7.

### Impacto en IES

IES **sí** depende de `query_context_metadata` (`MISSING_QUERY_CONTEXT_METADATA` / `MISSING_QUERY_CONTEXT_FIELD`). Hoy se satisface **solo** con el splice en memoria post-append. Eso es una segunda vía operacional respecto al Snapshot persistido, en tensión con `04` («proyecta solo desde metadata persistida del Snapshot»; «sin segunda entrada operacional»). El ciclo productivo funciona; el Snapshot PG no es entrada IES completa.

### Gates

Cerrar el gap **implementando `03` §8 ya aprobado** (metadata sibling, no Bundle, no D7): **G2 N/A, G3 N/A**.  
G2 sería necesario **solo** si se quisiera meter la metadata en el Bundle o redefinir D1–D9.  
G3 no: no hay contrato nuevo.

---

## D1 — Contrato

`03` Knowledge Snapshot incluye `query_context_metadata` como campo de Snapshot, **no** de Bundle N1–N4. `append_snapshot` debe persistirla inmutable **sin** interpretarla y **sin** incorporarla al Bundle. Invariante 9: EKS la persiste; no vive en `bundle.observations`.

`03` §8: **SNAPSHOT_CARRIES_QUERY_CONTEXT_METADATA** + **MINIMAL_QUERY_METADATA_EXTENSION**. «Persistida junto a las columnas de almacén; no descompone el Bundle; no entra en el digest D7».

`04` §3 / D5: IES proyecta `query_context` solo desde esa metadata persistida. Prohibido JWT/secretos/tokens en el objeto.

D1–D9 no se sustituyen.

## D2 — Creación

Único productor del ciclo dashboard: `buildCycleInput` en `lib/director-ia-dashboard-cycle-transport.js` (shape arriba).  
Consumo aguas abajo: `metadataFrom` en `lib/director-ia-real-cycle.js` (acepta `query_context_metadata` o `queryContextMetadata`).  
`lib/director-ia-e2e.js` replica el splice post-snapshot para tests.  
EB/OP/EKS **no** crean este objeto.

## D3 — Persistencia actual

`eks.snapshots.bundle` = copia JSONB del Knowledge Bundle. Integrity = `sha256:` + digest canónico **del Bundle**. Ni `insertSnapshot` ni `mapPgRow` ni `toPublicSnapshot` ni `list_versions` conocen `query_context_metadata`.

## D4 — Punto de pérdida

`eks.append_snapshot(bundle)` dentro de `createDirectorIaArrInput.run`. La metadata existe en el input del ciclo **antes** del append y se reinyecta **después** solo para IES.

## D5 — Dependencia IES

Sí. `lib/director-ia-ies-builder.js` `buildIes`: exige la propiedad en el Snapshot; `projectQueryContext` mapea 1:1 a `query_context`. Hoy: objeto sintético en memoria, no fila PG.

## D6 — ¿Dentro del JSONB `bundle`?

**No lo permite el contrato.** «Sin incorporarla al Bundle»; «junto a las columnas de almacén»; «no entra en D7».

Físicamente `bundle JSONB` **podría** guardar una clave extra (`validate_structure` no rechaza unknown keys). Eso violaría `03` §8 y ensuciaría D7. **No** es el modelo recomendado.

Modelo conforme: campo de Snapshot **hermano** de `bundle` (columna JSONB nueva en `eks.snapshots`, o tabla EKS nueva 1:1 por `snapshot_id`). No es tabla de producto.

## D7 — ¿ALTER / migration?

Cerrar el gap **conforme a §8** exige persistencia **fuera** de la columna `bundle`. Eso es extensión de objetos EKS, no ALTER de folios/ARR/IGF.

Camino mínimo: `ALTER TABLE eks.snapshots ADD COLUMN IF NOT EXISTS query_context_metadata JSONB` (nullable) en un `sql/` nuevo, o `CREATE TABLE IF NOT EXISTS` hermana. D6 M1 prohíbe ALTER de **tablas de producto**; `eks.snapshots` no lo es.

**No** hace falta columna si se violara el contrato metiendo la clave en `bundle`. Esa vía se descarta.

No backfill. No se asume que `015` se reescriba.

## D8 — Históricos

Sin migración de filas. Columna/tabla nueva NULL/ausente. `get_snapshot` histórico sigue sin metadata. IES sobre esos snapshots: fail-closed `MISSING_QUERY_CONTEXT_METADATA`. Aceptable: `decision_rules` no migrar históricos salvo necesidad contractual; no hay mandato de replay IES de filas pre-gap.

## D9 — Replay / list_versions / get_snapshot

`get_snapshot` / `toPublicSnapshot` deben **exponer** el sibling para que IES no necesite splice. Semántica D4/D5 (latest / list by `trace_id`) no cambia. `list_versions` hoy no devuelve `bundle`; no es la entrada IES. Mínimo: persistir + devolver en `get_snapshot`. No UPDATE de filas viejas (append-only).

## D10 — Integrity

**No** debe participar en canonicalization/integrity D7 del Bundle. Persistirse aparte. IES fingerprint permanece sobre el IES emitido.

## D11 — Seguridad / PII

`04` §3 prohibiciones: no JWT, secretos, API keys, cookies, connection strings, tokens de sesión. Shape actual: `requesting_user_id` (id interno), `requesting_role`, pregunta fija del slice, planta, periodo. `permission_restrictions` vacío. Persistible si el IMPL **no** copia el JWT ni `DATABASE_URL`. Riesgo: bajo–medio (identificador de usuario + rol + planta), no secreto de sesión.

## D12 — Gates del cierre

| Gate | ¿Para el NEXT_TASK mínimo? |
|------|----------------------------|
| G1 | Sí (autorizar IMPL) |
| G2 | No, si se implementa §8 sin redefinir D1–D9 ni meter metadata en el Bundle |
| G3 | No |
| G8 | N/A |

Registrar G2 como requerido **solo** si el humano prefiriera cambiar `03` para permitir metadata dentro de `bundle`. Esta auditoría **no** recomienda esa vía.

## D13 — Exactamente un NEXT_TASK

**task_id:** `IMPL-DIRECTOR-IA-EKS-PERSIST-QUERY-CONTEXT-METADATA-001`

**objetivo:** Persistir `query_context_metadata` como metadata inmutable de Snapshot **fuera** del Knowledge Bundle y **fuera** del digest D7, en el INSERT de `append_snapshot`, y exponerla en `get_snapshot` para que IES no dependa del splice post-append.

**alcance mínimo:**

- Runtime EKS (`lib/director-ia-eks.js`): aceptar metadata en append; INSERT sibling; `mapPgRow` / `toPublicSnapshot` la devuelven; integrity sigue solo sobre Bundle.
- Hilo desde el ciclo: metadata ya construida en transporte debe llegar al INSERT (hoy el append vive en `createDirectorIaArrInput.run`). Sin UPDATE posterior.
- Schema EKS-only: columna JSONB nullable en `eks.snapshots` **o** tabla EKS 1:1; no tocar tablas de producto; no reescribir `015` salvo lectura.
- Tests focales: persistido ≠ bundle; D7 estable si cambia metadata; `get_snapshot` round-trip; IES desde snapshot persistido; históricos NULL fail-closed.
- `real-cycle`: IES lee sibling del snapshot persistido (el splice deja de ser la fuente de verdad).

**fuera:** D1–D9, 02/03A/04/05/06, chat, smoke prod, backfill, G8, LLM.

**acceptance (IMPL futuro, no esta tarea):** Snapshot PG recuperado por `get_snapshot` incluye `query_context_metadata`; `bundle` idéntico bit-a-bit al EB; `integrity` no cambia al variar solo la metadata; IES no requiere segunda entrada operacional.

---

## Verificaciones

- `git diff --check`: ver salida de esta ejecución.
- Solo `CURRENT_TASK.md` y este reporte modificados (además del untracked del reporte).
- Sin implementación.
