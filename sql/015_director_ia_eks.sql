-- Executive Knowledge Store (EKS) — realización física v1 (M1).
-- Objetos NUEVOS. No altera tablas de producto (folios, ARR, IGF, bitácora, Delta Ingreso).
-- Append-only: el runtime solo inserta filas en eks.snapshots.
-- Cifras de negocio no viven aquí; solo Knowledge Snapshots.

CREATE SCHEMA IF NOT EXISTS eks;

CREATE TABLE IF NOT EXISTS eks.trace_locks (
  trace_id TEXT PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS eks.snapshots (
  snapshot_id TEXT PRIMARY KEY,
  bundle_id TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  persisted_at TIMESTAMPTZ NOT NULL,
  bundle JSONB NOT NULL,
  integrity TEXT NOT NULL,
  CONSTRAINT eks_snapshots_trace_version_uid UNIQUE (trace_id, version)
);

CREATE INDEX IF NOT EXISTS eks_snapshots_trace_id_idx
  ON eks.snapshots (trace_id, version);
