# AUDIT-FOLIO-DASHBOARD-BENEFICIARIO-PDF-STALE-001

```yaml
task_id: AUDIT-FOLIO-DASHBOARD-BENEFICIARIO-PDF-STALE-001
outcome: DONE
mode: AUDIT_ONLY
implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
docs_director_ia_changed: NO
runtime_changed: NO
backend_changed: NO
database_changed: NO
frontend_changed: NO
sql_writes: NO
live_db: NOT_PROVEN
classification: STALE_SOURCE / WRITE_COLUMN_READ_JSON
first_causal_function: getFolioLineasFromRow
recovery_recommendation: A
files_touched:
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/AUDIT-FOLIO-DASHBOARD-BENEFICIARIO-PDF-STALE-001.md
files_not_touched:
  - server.js
  - frontend-dashboard/app/acciones/page.tsx
  - frontend-dashboard/components/EditarFolioModal.tsx
  - frontend-dashboard/lib/api.ts
  - docs/director-ia/
contracts_consulted:
  - AGENTS.md
  - docs/dev-loop/LOOP_PROTOCOL.md
  - docs/dev-loop/CURRENT_TASK.md
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "La creación de rama audit/… fue bloqueada por el entorno. El trabajo es solo docs en el working tree actual (main). No se commitó. No se tocó runtime."
next_task_proposed: ""
secrets_check: none
human_decision_needed:
  - "Autorizar FIX (G1) en rama ≠ main si se quiere aplicar la recomendación A."
```

## Executive summary

El tablero muestra el beneficiario de `public.folios.beneficiario`. El PATCH de edición escribe **solo esa columna**. Los PDF de formato folio, gastos y la parte de gastos de documento-completo leen primero `detalle_lineas[].beneficiario` vía `getFolioLineasFromRow`. Esa función **descarta** la columna vigente cuando el JSON es un array no vacío con líneas válidas.

Clasificación: **`STALE_SOURCE / WRITE_COLUMN_READ_JSON`**. Confirmado en código. No se requirió LIVE_DB.

## 1. Qué escribe `PATCH /api/folios/:id/editar` al cambiar `beneficiario`

Archivo: `server.js` ~13775–13868. Cliente: `patchFolioEditar` → body `{ beneficiario, … }`.

Normalización (~13791):

```text
next.beneficiario = trim(body.beneficiario) o null si vacío
```

Comparación (~13817–13836): campo `beneficiario` entra en `changed` si `String(prev) !== String(next)`.

SQL (~13839–13848): **solo**

```sql
UPDATE public.folios SET beneficiario = $1 WHERE id = $N
```

(más otras columnas del mismo `changed`; **ninguna** es `detalle_lineas`).

Historial: `Edición AD: beneficiario: <prev> → <next>`.

Respuesta: `{ ok: true, changed: true }`. No devuelve el folio ni el JSON.

## 2. `detalle_lineas` queda sin modificar

Grep en `server.js`: **cero** asignaciones `detalle_lineas =`.

La única escritura de `detalle_lineas` en el repo de aplicación es el `INSERT` de `insertFolio` (`detalleJson`, ~3423–3439).

El PATCH de editar no lee, no parsea y no reescribe `detalle_lineas`. Queda el JSON de creación.

## 3. Traza DB → cada salida

| Superficie | SELECT incluye | Función de lectura | Campo pintado | Tras PATCH de header |
|---|---|---|---|---|
| Tablero / card | `f.beneficiario` (`cardFromFolioRow` ~5351) | columna | `row.beneficiario` | **nuevo** |
| Drawer | misma card | `folio.beneficiario` (`FolioDrawer.tsx` ~647) | columna | **nuevo** |
| `GET .../documento-folio` | columna **y** `detalle_lineas` | `getFolioLineasFromRow` → `lineasFolio[0].beneficiario \|\| folio.beneficiario` (~13118–13119); filas ~13349–13351 usan `L.beneficiario` | JSON si existe | **viejo** (si JSON[0].beneficiario no vacío) |
| `GET .../documento-gastos` html/pdf | ambos | `getFolioLineasFromRow` → `L.beneficiario` por fila (~12978–12987, ~13046–13050) | JSON | **viejo** por cada línea |
| `GET .../documento-completo` | ambos | Póliza: `generatePolizaPdfBytes(folio)` usa `folio.beneficiario` (~14290). Gastos: `lineasDoc` = `getFolioLineasFromRow` (~13461–13485) | **mixto** | póliza **nuevo**; gastos **viejo** |
| `GET .../poliza/documento` | `f.beneficiario` **sin** `detalle_lineas` (~14647) | `generatePolizaPdfBytes` ~14290 | columna | **nuevo** |

Imprimir dashboard (`ImprimirGastosModal`): modo `folio` → `documento-folio` (síntoma). Modo `poliza` → columna (no reproduce). Cotización/facturas = PDF adjunto, no regeneran nombre.

## 4. Primera función causal

**`getFolioLineasFromRow`** (`server.js` ~3371–3402).

Si `detalle_lineas` parsea a array con ≥1 ítem válido (`concepto` no vacío e `importe` finito), **devuelve solo el JSON** y no usa `folio.beneficiario`.

Ahí el valor viejo **gana** sobre el vigente.

Consumidor inmediato del formato folio: ~13119  
`(lineasFolio[0] && lineasFolio[0].beneficiario) || folio.beneficiario`  
— la columna solo entra si `lineasFolio[0].beneficiario` es null/"".

El PATCH no es la función que *elige* el viejo; es la que deja el JSON desfasado. La elección es `getFolioLineasFromRow`.

## 5. ¿Todos los folios con `detalle_lineas` reproducen?

No.

Reproduce **solo** si, después del PATCH:

1. `detalle_lineas` es array parseable no vacío, y
2. al menos una línea pasa el filtro de `getFolioLineasFromRow`, y
3. para el nombre “principal” del formato: `lineas[0].beneficiario` es string no vacío **y distinto** de `folios.beneficiario`.

No reproduce si:

- `detalle_lineas` es null / no array / no parseable → fallback a columna (~3398–3402);
- líneas JSON inválidas (sin concepto o importe) → mismo fallback;
- `lineas[0].beneficiario` vacío/null → `|| folio.beneficiario` pinta el **nuevo**.

Casi todo folio creado por dashboard/Excel/WhatsApp vía `insertFolio` **sí** tiene JSON (si hubo líneas), y la línea 0 suele traer beneficiario no vacío → es el caso típico del síntoma.

## 6. Una línea vs múltiples

**Una línea.**  
Creación: `folios.beneficiario` = `detalle.lineas[0].beneficiario` (`resolveFolioDetalleLineas` + `insertFolio`). Al nacer coinciden. Tras PATCH: columna nueva, JSON[0] viejo. Formato folio pinta JSON[0]. **Reproduce.**

**Múltiples.**  
`folios.beneficiario` / `folios.concepto` en creación = agregados (`beneficiario` = solo línea 0; `concepto` = `1) … | 2) …`). El PDF de formato dibuja **una fila por línea** con `L.beneficiario` de cada elemento (~13348–13355). El PATCH no toca ninguna línea del JSON. **Todas las filas del PDF siguen viejas.** La póliza pinta solo la columna (línea 0 semántica). Documento-completo: póliza nueva + filas de gastos viejas.

`EditarFolioModal` no edita líneas; un solo input `beneficiario`.

## 7. Qué es `detalle_lineas[].beneficiario` (sin criterio)

Evidencia de **creación**, no de opinión:

- `CrearFolioModal`: cada solicitud tiene su propio input `beneficiario` (~456, ~220–224). Se envía `lineas: [{beneficiario, concepto, importe}, …]`.
- `resolveFolioDetalleLineas` (~3342–3343): **conserva el beneficiario de cada ítem**; no copia el del folio hacia todas las líneas.
- `folios.beneficiario` se setea a `lineas[0].beneficiario` (~3358–3366, ~3420).
- `documento-folio` / gastos imprimen **N** beneficiarios, uno por línea.

Conclusión física:

- **Por línea: independiente.** El modelo de captura permite nombres distintos en la misma solicitud.
- **La columna del folio es copia de la línea 0 en el INSERT**, no un espejo mantenido.
- **No** hay código que, en edición, trate el JSON como copia redundante del header.
- Mixto solo en el sentido: al crear, línea 0 y columna coinciden; el resto de líneas nunca se reflejó en la columna.

## 8. ¿Alguna ruta ya sincroniza columna ↔ JSON?

| Ruta | ¿Sincroniza? |
|---|---|
| `insertFolio` + `resolveFolioDetalleLineas` | **Sí, solo al crear:** columna = línea 0; JSON = array completo |
| `POST /api/folios` | Sí, vía `insertFolio` |
| COMPARAR/Excel `lineas: [{beneficiario, concepto, importe}]` (~6231, ~6481) | Sí, al crear (1 línea) |
| WhatsApp `sess.dd` → `insertFolio` | Sí, al crear |
| `PATCH /api/folios/:id/editar` | **No** |
| Cualquier `UPDATE … detalle_lineas` | **No existe** |

No hay ruta de **edición** que resincronice.

## 9. Clasificación

**`STALE_SOURCE / WRITE_COLUMN_READ_JSON`**

No es:

- cache del navegador (el GET regenera el PDF);
- plantilla S3 con texto fijo del nombre (el draw usa `benTxt` de `L.beneficiario`);
- bug solo de frontend (el drawer ya muestra el nuevo);
- fallo de póliza (lee columna).

Causa conjunta: escritura en columna + lectura preferente de JSON. La función que hace ganar al viejo es `getFolioLineasFromRow`.

## 10. Recomendación de recuperación (UNA): **A**

**A) Sincronizar `detalle_lineas` en la misma transacción que el PATCH de edición.**

No B: `documento-folio` / gastos / completo-gastos pintan **una fila por línea**. Si todas las salidas usaran solo `folios.beneficiario`, un folio de N líneas perdería beneficiarios 2…N (el create UI los trata como independientes). B contradice el modelo físico de N líneas.

A, acotada por evidencia:

1. En `PATCH /api/folios/:id/editar`, si cambia `beneficiario` y existe `detalle_lineas` válido:
   - actualizar **`detalle_lineas[0].beneficiario`** al mismo valor que la columna;
   - **no** pisar líneas 1…N (son independientes en create);
   - si `detalle_lineas` es null, no inventar JSON (el fallback ya usa la columna).
2. No cambiar los lectores: `getFolioLineasFromRow` sigue siendo correcto para N líneas.
3. Póliza ya usa columna: tras A, formato folio (fila 0), gastos (fila 0), completo-gastos (fila 0) y póliza coinciden en el nombre editado desde el modal.
4. Filas 2…N: el modal actual no las edita; A no las inventa. Un editor por línea sería otra tarea.

Misma lógica si el PATCH cambia `concepto`/`importe` de header: hoy el PDF de 1 línea también puede quedar stale en concepto/importe JSON. Fuera del síntoma pedido; no ampliar en el fix salvo que el G1 del fix lo liste.

## Completion

`DONE_PENDING_REVIEW`. STOP. No implementación. No merge. No deploy. No next task.
