# Reporte — ARCH-DIRECTOR-IA-EKS-QUERY-CONTEXT-STORAGE-DECISION-001

```yaml
task_id: "ARCH-DIRECTOR-IA-EKS-QUERY-CONTEXT-STORAGE-DECISION-001"
outcome: "DONE"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EKS-QUERY-CONTEXT-STORAGE-DECISION-001.md"
files_not_touched:
  - "lib/"
  - "sql/"
  - "scripts/"
  - "server.js"
  - "docs/director-ia/"
  - "PostgreSQL / producción"
contracts_consulted:
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/04-IES-STANDARD.md"
contracts_modified: []
ambiguities_or_contradictions:
  - >
    CURRENT_TASK.in_scope cita 04-INTERPRETATION-EVIDENCE-SNAPSHOT.md (inexistente).
    Se consultó 04-IES-STANDARD.md. No impide elegir A.
deviations_from_current_task: []
next_task_proposed: "IMPL-DIRECTOR-IA-EKS-PERSIST-QUERY-CONTEXT-METADATA-001"
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED. Este reporte no autoriza IMPL."
```

## Ejecución

- Rama: `architecture/director-ia-eks-query-context-storage-decision-001` (≠ `main`).
- G1 intacto; `authorized_by` / `authorized_at` / `human_authorization` no modificados por el implementador.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → este reporte → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin implementación, SQL, smoke, commit, push, merge, G2 ni G3.

## Decisión

**Elegida: A** — `query_context_metadata JSONB NULL` como columna sibling en `eks.snapshots`.

**No B.** El implementador futuro no puede sustituir A por B sin nueva tarea y G1.

---

## Evidencia física consultada

### Schema (`sql/015_director_ia_eks.sql`)

`eks.snapshots`: `snapshot_id` PK, `bundle_id`, `trace_id`, `version`, `persisted_at`, `bundle JSONB NOT NULL`, `integrity TEXT NOT NULL`, UNIQUE `(trace_id, version)`, índice `(trace_id, version)`. `eks.trace_locks (trace_id PK)`. Sin columna de query context.

### `createPgStore.insertSnapshot` (`lib/director-ia-eks.js`)

Una transacción: `BEGIN` → INSERT lock `ON CONFLICT DO NOTHING` → `SELECT … FOR UPDATE` en `eks.trace_locks` → `MAX(version)` → **un** `INSERT INTO eks.snapshots (snapshot_id, bundle_id, trace_id, version, persisted_at, bundle, integrity)` → `COMMIT`. Rollback en catch. No segunda tabla.

### Lectura

- `getBySnapshotId` / `getLatestByTraceId`: `SELECT` esas 7 columnas; `toPublicSnapshot` verifica integrity **solo** sobre `bundle` y no expone metadata.
- `list_versions`: mapea `snapshot_id, bundle_id, trace_id, version, persisted_at, integrity` — **sin** `bundle` y sin metadata.

### Lifecycle de la metadata (ciclo real)

1. `buildCycleInput` crea el objeto.
2. `createDirectorIaArrInput.run` → `eks.append_snapshot(bundle)` — Bundle only.
3. `createDirectorIaRealCycle.run` clona `arr_cycle.snapshot` y asigna `query_context_metadata` **después** del persist.
4. IES `buildIes` exige la propiedad en el Snapshot en memoria; no lee PG.

No hay UPDATE de snapshots (D3). La metadata no tiene lifecycle independiente: nace con el Snapshot y es inmutable.

### IES / replay históricos

`MISSING_QUERY_CONTEXT_METADATA` si falta la propiedad. `get_snapshot` PG hoy nunca la trae. Históricos deben seguir **legibles** como Snapshot (bundle+integrity); el fail-closed IES aplica al **replay IES**, no a `get_snapshot`.

---

## Matriz comparativa

| criterion | A_column_jsonb_nullable | B_table_one_to_one | winner | evidence |
|-----------|-------------------------|--------------------|--------|----------|
| contract fit | Sibling de columnas de almacén; no es Bundle; §8 «junto a las columnas de almacén»; D2 no se sustituye (extensión §8) | También fuera del Bundle; añade objeto no descrito como columna de almacén | **A** | `03` §8 Relación con D2/R3; Snapshot §3 lista el campo junto a `bundle`/`integrity` |
| append atomicity | Un INSERT en la transacción V2 existente | Dos INSERTs (snapshots + hija) en la misma TX; riesgo de olvido del segundo | **A** | `insertSnapshot` ya es un INSERT bajo `BEGIN`/`FOR UPDATE` |
| read simplicity | Mismo SELECT; sin JOIN | JOIN o segunda query por `snapshot_id` | **A** | `getBySnapshotId` / `getLatestByTraceId` son SELECT de una tabla |
| backward compatibility | `ADD COLUMN … JSONB` nullable: filas viejas = NULL; SELECT sigue funcionando | Tabla vacía: ausencia de fila; hay que outer-join o tolerar miss | **A** | NULL nativo; no backfill |
| digest isolation | Columna fuera de `bundle`; `computeIntegrity(bundle)` intacto | Igual si no se hashea la hija | empate | `toPublicSnapshot` + `03` D7 / §8 |
| DDL complexity | Un `ALTER … ADD COLUMN IF NOT EXISTS` EKS | `CREATE TABLE` + PK/FK + unique 1:1 + índice | **A** | `015` no toca producto; D6 prohíbe ALTER de **producto**, no extensión EKS §8 |
| production rollout risk | Lock corto ACCESS EXCLUSIVE; no reescribe `bundle`; no backfill | Objeto nuevo + protocolo de dos escrituras en runtime ya productivo | **A** | Prod ya tiene `eks.snapshots` pobladas (ciclo 200) |
| concurrency | Sin cambio de `trace_locks` / `MAX(version)` / UNIQUE | Igual si ambos INSERTs van en la misma TX; más superficie | **A** | locking actual líneas 198–221 |
| query cost | Cero JOIN; JSONB no indexado (no se busca dentro) | JOIN 1:1 en cada get | **A** | IES entra por `get_snapshot`, no por scan de metadata |
| lifecycle alignment | Misma fila, mismo INSERT, append-only, sin UPDATE | 1:1 forzado a mano; permite (por error) fila huérfana o metadata tardía | **A** | Prohibición operativa «No editar un Snapshot persistido»; no hay lifecycle independiente |
| security | Misma tabla; `list_versions` puede seguir **sin** devolver el JSONB | Tabla extra = otra superficie GRANT/SELECT | **A** | `list_versions` ya omite `bundle`; debe omitir también el JSONB de metadata |
| testability | Assert columna NULL vs objeto; digest bundle-only | Tests de FK, orfandad, doble INSERT | **A** | Menos casos de borde |

**Ganador global: A.** B no aporta lifecycle independiente (regla: no crear tabla separada sin beneficio demostrable).

---

## D1–D16

**D1 contract fit.** A representa «metadata del Snapshot» como columna hermana de `bundle`/`integrity`. No va dentro de `bundle`. B también la saca del Bundle pero no es «junto a las columnas de almacén».

**D2 append atomicity.** A: extender el INSERT único. B: segundo INSERT. A es más simple.

**D3 read path.** A: añadir la columna al SELECT de get. B: JOIN/N+1. `list_versions` no necesita el JSONB completo (hoy no devuelve `bundle`).

**D4 backward compatibility.** A: NULL en filas pre-columna. B: ausencia de fila. Ambas OK; A es el NULL SQL estándar.

**D5 integrity.** Ninguna opción incluye metadata en D7. `computeIntegrity` permanece sobre el Bundle. Prohibido copiar el campo dentro de `bundle` antes del hash.

**D6 schema complexity.** A: un ALTER EKS nullable. B: tabla+PK/FK. A gana.

**D7 operational risk.** A sobre tabla productiva existente, nullable, sin reescribir JSONB. Menor que B.

**D8 concurrency.** A no toca `eks.trace_locks` ni UNIQUE `(trace_id, version)`.

**D9 query cost.** A sin JOIN. No índice JSONB (no hay predicados sobre campos internos).

**D10 data lifecycle.** Mismo que el snapshot: insert-once, inmutable. No existe/actualiza independiente → **no B**.

**D11 null semantics.** NULL histórico es aceptable. `get_snapshot` debe devolver `query_context_metadata: null` (propiedad presente, valor null) o omitirla; IES sobre replay de histórico: `MISSING_QUERY_CONTEXT_METADATA` / fail-closed. `get_snapshot` en sí **sigue siendo legible** (bundle+integrity). Sin backfill.

**D12 security.** A no aumenta objetos GRANT. IMPL no debe poner JWT/secretos en el JSONB (`04` §3). `list_versions` no debe serializar el JSONB de metadata.

**D13 DDL mínimo (no ejecutar):**

```sql
ALTER TABLE eks.snapshots
  ADD COLUMN IF NOT EXISTS query_context_metadata JSONB;
```

Archivo propuesto (IMPL futuro): `sql/016_director_ia_eks_query_context_metadata.sql`. **No** reescribir `015`. **No** `NOT NULL`. **No** DEFAULT que rellene históricos. **No** FK nueva. **No** tablas de producto.

**D14 tests obligatorios (IMPL futuro):**

1. Append con metadata: fila tiene `bundle` sin la clave `query_context_metadata` y columna sibling = objeto.
2. `computeIntegrity` idéntico si solo cambia la metadata.
3. `get_snapshot` round-trip del sibling; `get_snapshot` de fila NULL sigue OK (bundle+integrity).
4. IES desde snapshot persistido **con** metadata: no splice operativo.
5. IES desde snapshot persistido **sin** metadata (histórico): fail-closed.
6. Append concurrente: UNIQUE `(trace_id, version)` intacto; metadata no duplica version.
7. `list_versions` no incluye el JSONB de metadata ni `bundle`.
8. Rechazo si se intenta meter metadata **dentro** del Bundle como atajo (no debe persistirse ahí).

**D15 gates.** Implementar A conforme a `03` §8: **G1 sí; G2 no; G3 no; G8 N/A.** G2 solo si se quisiera B o meter el campo en `bundle`.

**D16 decisión.** **A.** Cerrada.

---

## Impacto exacto (para el IMPL, no ejecutado aquí)

### `insertSnapshot`

Añadir `query_context_metadata` al INSERT y al `RETURNING`. Bind JSON o `NULL`. Sigue un solo INSERT bajo el `BEGIN`/`FOR UPDATE` actual. `mapPgRow` copia `row.query_context_metadata` (puede ser `null`). Memory store: mismo campo en el objeto stored. `append_snapshot` debe **recibir** la metadata como argumento sibling, no como clave del Bundle; hashear **después** de clonar el Bundle y **antes** de mezclar metadata.

### `get_snapshot`

SELECT incluye `query_context_metadata`. `toPublicSnapshot` la expone como sibling. Integrity sigue calculándose solo con `bundle`. Si columna NULL: snapshot legible; IES fail-closed si se invoca `build`.

### `list_versions`

Sin cambio de forma pública: no devolver el JSONB de metadata (igual que no devuelve `bundle`). SELECT puede omitir la columna.

### Replay / IES

Ciclo live: persistir en el INSERT y construir IES desde `get_snapshot`/`toPublicSnapshot` (eliminar la reinyección como fuente de verdad). Históricos NULL: `get_snapshot` OK; IES no. Sin backfill.

### Integrity

D7 Bundle-only. Columna A fuera del digest.

---

## NEXT_TASK (no autorizado)

**task_id:** `IMPL-DIRECTOR-IA-EKS-PERSIST-QUERY-CONTEXT-METADATA-001`

Persistir `query_context_metadata` **solo** como columna JSONB nullable `eks.snapshots.query_context_metadata` (opción **A**), hilarla al INSERT de `append_snapshot`, exponerla en `get_snapshot`, no incluirla en D7, no meterla en `bundle`, no tabla 1:1, no backfill, no redefinir D1–D9.

---

## Verificaciones

- `git diff --check`: ver salida de esta ejecución.
- Solo `CURRENT_TASK.md` y este reporte.
