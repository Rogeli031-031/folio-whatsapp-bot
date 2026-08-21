# Reporte — IMPL-DIRECTOR-IA-EKS-PERSIST-QUERY-CONTEXT-METADATA-001

```yaml
task_id: "IMPL-DIRECTOR-IA-EKS-PERSIST-QUERY-CONTEXT-METADATA-001"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/IMPL-DIRECTOR-IA-EKS-PERSIST-QUERY-CONTEXT-METADATA-001.md"
  - "sql/015_director_ia_eks.sql"
  - "scripts/apply-director-ia-eks-schema.js"
  - "lib/director-ia-eks.js"
  - "lib/director-ia-real-input-arr.js"
  - "lib/director-ia-real-cycle.js"
  - "test/director-ia-eks.test.js"
  - "test/director-ia-eks-integration.test.js"
  - "test/director-ia-real-input-arr.test.js"
  - "test/director-ia-real-cycle.test.js"
files_not_touched:
  - "docs/director-ia/"
  - "frontend-dashboard/"
  - "package.json"
  - "package-lock.json"
  - "frontend-dashboard/package.json"
  - "frontend-dashboard/package-lock.json"
  - ".env"
  - ".env.example"
  - "lib/director-ia-ies-builder.js"
  - "lib/director-ia-observation-pipeline.js"
  - "lib/director-ia-evidence-builder.js"
  - "lib/director-ia-reasoning-engine.js"
  - "lib/director-ia-channel-projection.js"
  - "server.js"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/README.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/dev-loop/reports/ARCH-DIRECTOR-IA-EKS-QUERY-CONTEXT-STORAGE-DECISION-001.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: "Ninguna autorizada. Este reporte no es G5. No se encadena otra tarea."
secrets_check: "none"
human_decision_needed:
  - "G5: HUMAN_APPROVER debe CLOSED o REJECTED."
  - "G2/G3/G8 permanecen N/A."
  - "Acto humano posterior en producción (no ejecutado en esta tarea): aplicar sql/015_director_ia_eks.sql canónico; verificar information_schema.columns; smoke solo en otro gate/tarea humana."
```

## Ejecución

- Rama: `implementation/director-ia-eks-persist-query-context-metadata-001` (≠ `main`).
- G1 intacto: `HUMAN_APPROVER` / `2026-08-21T16:45:00-06:00`.
- G2/G3/G8: `N/A`. No se modificó `docs/director-ia/`. No se redefinieron D1–D9. No se usó calibración. No se añadieron dependencias.
- Transición: `AUTHORIZED` → `IN_PROGRESS` (solo `status`) → `DONE_PENDING_REVIEW`.
- `max_attempts: 1`. Sin commit, push, merge ni siguiente tarea.
- Sin ALTER productivo. Sin Render Shell. Sin smoke productivo.

## Decisión arquitectónica aplicada (cerrada; no reabierta)

- storage = columna sibling
- tabla = `eks.snapshots`
- columna = `query_context_metadata`
- tipo = JSONB
- nullable = true
- NO tabla 1:1
- NO backfill
- históricos NULL permitidos
- `query_context_metadata` NO entra en bundle
- `query_context_metadata` NO entra en D7/integrity

## Qué se implementó

### 1. SQL idempotente (`sql/015_director_ia_eks.sql`)

`CREATE TABLE IF NOT EXISTS eks.snapshots` incluye `query_context_metadata JSONB` (nullable, sin default). Tras el `CREATE`/`INDEX` existentes:

```sql
ALTER TABLE eks.snapshots
  ADD COLUMN IF NOT EXISTS query_context_metadata JSONB;
```

- DB nueva: la columna nace en el `CREATE`; el `ALTER IF NOT EXISTS` es no-op.
- DB existente con `eks.snapshots` ya creada: el `CREATE TABLE IF NOT EXISTS` no toca la tabla; el `ALTER` agrega la columna.
- Reaplicar el artefacto es idempotente.
- Sin DROP/TRUNCATE/DELETE/UPDATE. Sin backfill. Sin índice nuevo.

`scripts/apply-director-ia-eks-schema.js` sigue aplicando el mismo SQL; añade verificación read-only de `information_schema.columns` para `query_context_metadata`. No se ejecutó contra producción.

### 2. EKS runtime (`lib/director-ia-eks.js`)

- `append_snapshot(bundle, queryContextMetadata)` persiste metadata como sibling.
- Si metadata falta o no es objeto plano: `NULL`.
- Misma transacción PG: el `INSERT INTO eks.snapshots` incluye `query_context_metadata` junto a `bundle`/`integrity` bajo el `BEGIN` + lock `eks.trace_locks` + `MAX(version)+1` existentes.
- Bundle no se muta para contener metadata. Integrity/digest sigue siendo `computeIntegrity(bundle)` únicamente.
- `get_snapshot` devuelve `query_context_metadata` como sibling (`null` si ausente; no se fabrica).
- `list_versions` conserva el shape previo (sin bundle ni JSONB de metadata; sin JOIN/N+1).

### 3. Ciclo real

- `createDirectorIaArrInput` propaga `query_context_metadata` al append (fija `trace_id` ARR antes del INSERT). Sin metadata de entrada: persiste `NULL`.
- `createDirectorIaRealCycle` deja de reinyectar metadata en memoria sobre el snapshot. Fuente para IES: sibling persistido del snapshot leído.
- Histórico/`NULL`: fail-closed `MISSING_QUERY_CONTEXT_METADATA`. No reconstrucción.
- Semántica ARR/OP/EB/IES/RE/CP no redefinida. IES builder no modificado.

## Tests

Comando focal EKS:

`node --test test/director-ia-eks.test.js test/director-ia-eks-integration.test.js`

- tests: **27**
- pass: **27**
- fail: **0**

Comando real-input-arr:

`node --test test/director-ia-real-input-arr.test.js`

- tests: **24**
- pass: **24**
- fail: **0**

Comando real-cycle:

`node --test test/director-ia-real-cycle.test.js`

- tests: **20**
- pass: **20**
- fail: **0**

Regresión:

`node --test test/director-ia-*.test.js`

- tests: **385**
- pass: **385**
- fail: **0**
- skipped: **0**

Cubre, entre otros: SQL nuevo JSONB nullable; ALTER sobre schema existente (texto canónico `ADD COLUMN IF NOT EXISTS`); reaplicar idempotente; append con/sin metadata; bundle sin la clave; integrity estable ante metadata distinta; INSERT transaccional PG (pool fake); `get_snapshot` round-trip y histórico `NULL`; `list_versions` sin cambio semántico; ciclo real verde; fail-closed sin reinyección; no backfill; no tabla 1:1.

## Producción — acto humano posterior (NO ejecutado)

Esta tarea **no** aplicó SQL en PostgreSQL productiva, **no** usó Render Shell y **no** ejecutó smoke productivo.

Acto humano requerido en un gate/tarea posterior:

1. Aplicar el artefacto canónico actualizado `sql/015_director_ia_eks.sql` (equivalente a `ALTER TABLE eks.snapshots ADD COLUMN IF NOT EXISTS query_context_metadata JSONB`).
2. Verificar read-only:

```sql
SELECT data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'eks'
   AND table_name = 'snapshots'
   AND column_name = 'query_context_metadata';
```

Esperado: `data_type = jsonb`, nullable.

3. Smoke autenticado: solo si otro loop humano lo autoriza. No forma parte de esta tarea.

## Scope confirmado (sin cambios)

- `docs/director-ia/*`: no
- `frontend-dashboard/*`: no
- `package.json` / lockfiles: no
- Render env: no
- contratos D1–D9: no
- G2/G3/G8: no usados
- tabla 1:1: no
- backfill: no
- digest D7: intacto (solo bundle)

## Cierre

- `git diff --check`: limpio (ver evidencia de cierre de tarea).
- `status = DONE_PENDING_REVIEW`
- Sin commit. Sin push. Sin merge. Sin siguiente tarea.
- STOP.
