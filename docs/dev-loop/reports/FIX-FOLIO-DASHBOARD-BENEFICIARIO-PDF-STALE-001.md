# FIX-FOLIO-DASHBOARD-BENEFICIARIO-PDF-STALE-001

```yaml
task_id: "FIX-FOLIO-DASHBOARD-BENEFICIARIO-PDF-STALE-001"
outcome: "DONE_PENDING_REVIEW"
mode: "IMPLEMENTATION"
implementation: true
schema_changes: false
sql_destructive: false
historical_repair: false
frontend_changed: false
docs_director_ia_changed: false
merge: false
deploy: false
next_task_proposed: ""
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed:
  - "Revisión humana G4. No merge. No deploy."
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/AUDIT-FOLIO-DASHBOARD-BENEFICIARIO-PDF-STALE-001.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
```

## A. Root cause confirmado

Ruta before: `PATCH /api/folios/:id/editar` en `server.js`.

El endpoint construía `changed` sobre columnas de `public.folios` y ejecutaba:

```sql
UPDATE public.folios SET beneficiario = $1 WHERE id = $N
```

No leía ni reescribía `detalle_lineas`.

`getFolioLineasFromRow` (~3373–3404) si `detalle_lineas` es un array no vacío con líneas válidas **ignora** `folios.beneficiario` y usa `detalle_lineas[i].beneficiario`. Esa función no se modificó.

Efecto after header PATCH:

| Salida | Fuente | Valor |
| --- | --- | --- |
| Tablero / drawer (`cardFromFolioRow`) | columna | nuevo |
| Póliza (`generatePolizaPdfBytes`) | columna | nuevo |
| documento-gastos | JSON vía `getFolioLineasFromRow` | viejo en línea 0 |
| documento-folio | JSON vía `getFolioLineasFromRow` | viejo en línea 0 |
| documento-completo (gastos) | JSON | viejo en línea 0 |
| documento-completo (póliza) | columna | nuevo |

Clasificación de auditoría: `STALE_SOURCE / WRITE_COLUMN_READ_JSON`.

## B. Cambio

Persistencia del PATCH, no maquillaje de PDF.

| Archivo | Qué cambió |
| --- | --- |
| `lib/folio-detalle-lineas-principal-beneficiario.js` | Helper `syncDetalleLineasPrincipalBeneficiario(raw, nuevoBeneficiario)`. No fabrica JSON. Copia línea 0 con `Object.assign` y solo pisa `beneficiario`. Concatena `slice(1)` sin mutar 1..N. |
| `server.js` | `require` del helper. Si `beneficiario` entra en `changed`, `SELECT detalle_lineas` y, si `synced`, añade `detalle_lineas = $n::jsonb` al **mismo** `UPDATE`. Historial intacto. |
| `test/folio-detalle-lineas-principal-beneficiario.test.js` | Casos A/B/C + aserciones de fuente: mismo UPDATE, `getFolioLineasFromRow` sin reescritura global, documentos siguen leyendo JSON por línea, póliza lee columna. |
| `docs/dev-loop/CURRENT_TASK.md` | Solo `status: DONE_PENDING_REVIEW`. G1 intacto. |
| `docs/dev-loop/reports/AUDIT-FOLIO-DASHBOARD-BENEFICIARIO-PDF-STALE-001.md` | Preservado (evidencia de auditoría). |
| `docs/dev-loop/reports/FIX-FOLIO-DASHBOARD-BENEFICIARIO-PDF-STALE-001.md` | Este reporte. |

`getFolioLineasFromRow` **no** se cambió. No se priorizó `folios.beneficiario` sobre todas las líneas.

No se sincronizaron concepto, importe ni otros campos.

## C. Casos

| Caso | Header | línea 0 | líneas 1..N | Resultado |
| ---- | ------ | ------- | ----------- | --------- |
| A — sin `detalle_lineas` (null / `[]` / inválido) | B | no se fabrica | n/a | columna B; JSON intacto (null); `synced: false` |
| B — una línea A → B | B | B | n/a | columna + JSON[0] = B; resto de props de línea 0 conservadas |
| C — múltiples líneas | B | B | X, Y intactos | solo índice 0 cambia |

## D. Historial

`insertHistorial` sigue usando únicamente `changed` (campos de columna). Texto:

`Edición AD: beneficiario: A → B`

No se añade un segundo evento por la sincronización JSON. El JSON es consecuencia técnica de la misma edición.

## E. PDFs

Tras el PATCH, columna y `detalle_lineas[0].beneficiario` quedan iguales cuando existía línea 0 válida. Por eso cada salida recibe el principal correcto **sin** cambiar el render:

1. **documento-gastos** (`GET /api/folios/:id/documento-gastos` ~12979): `getFolioLineasFromRow` → JSON[0] ya es B; 1..N siguen independientes.
2. **documento-folio** (`GET /api/folios/:id/documento-folio` ~13119–13120): línea 0 / fallback de columna ahora coinciden en B.
3. **documento-completo** (`GET /api/folios/:id/documento-completo` ~13462 + ~13469): mitad gastos lee JSON sincronizado; mitad póliza llama `generatePolizaPdfBytes(folio)` que lee la columna B. Ya no hay mixto viejo/nuevo en el principal.
4. **póliza** (`generatePolizaPdfBytes` ~14304): `folio.beneficiario` (columna) = B, igual que antes del fix; ahora alineada con los documentos JSON.

Tablero/drawer (`cardFromFolioRow` ~5352) sigue leyendo la columna.

## F. Validación

No existe script `test` de folio/PDF en `package.json` (`test:eks` es otra suite). No se inventó framework. No hay suite previa de edición/PDF.

Comando real:

```text
node --test test/folio-detalle-lineas-principal-beneficiario.test.js
```

| Resultado | Valor |
| --- | --- |
| exit code | `0` |
| tests | 5 |
| pass | 5 |
| fail | 0 |

Cobertura explícita:

1. sin `detalle_lineas` — no fabrica JSON;
2. una línea A → B;
3. múltiples líneas sin tocar 1..N;
4. historial — un solo `Edición AD: ${cambiosTxt}` sobre `changed`, sin evento `detalle_lineas`;
5. documento-folio — sigue `getFolioLineasFromRow`;
6. documento-gastos — sigue `getFolioLineasFromRow`;
7. documento-completo — `getFolioLineasFromRow` + `generatePolizaPdfBytes(folio)`;
8. póliza — `(folio.beneficiario || "").trim()`.

Limitación: no se imprimieron PDFs live ni se navegó el dashboard autenticado. El entorno no expone token WhatsApp/dashboard ni LIVE_DB para ese flujo. La coherencia se demostró por persistencia + fuentes de lectura en código.

## G. Git

* base SHA: `7619f0bf`
* branch: `fix/folio-dashboard-beneficiario-pdf-stale-001` (≠ `main`)
* commit SHA: ver commit de esta rama que incluye este reporte
* evidencia de auditoría preservada en el working tree y versionada en esta rama
* no push a `main`
* no merge

## H. Alcance

* no frontend;
* no schema;
* no migración;
* no reparación histórica masiva;
* no Director IA;
* no cambio de `getFolioLineasFromRow` para preferir la columna globalmente;
* no corrección de concepto/importe;
* no merge;
* no deploy;
* no siguiente tarea.
