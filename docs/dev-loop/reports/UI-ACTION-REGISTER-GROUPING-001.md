# UI-ACTION-REGISTER-GROUPING-001

```yaml
task_id: UI-ACTION-REGISTER-GROUPING-001
outcome: DONE
mode: IMPLEMENTATION
branch: implementation/ui-action-register-grouping-001
base_main_sha: 7a2754503a05c36f4fba2740400f4993e56a9f10
implementation_authorized: YES
merge_authorized: NO
deploy_authorized: NO
docs_director_ia_changed: NO
runtime_changed: NO
backend_changed: NO
database_changed: NO
api_contracts_changed: NO
files_touched:
  - frontend-dashboard/app/acciones/page.tsx
  - docs/dev-loop/CURRENT_TASK.md
  - docs/dev-loop/reports/UI-ACTION-REGISTER-GROUPING-001.md
files_not_touched:
  - docs/director-ia/
  - lib/director-ia-*.js
  - lib/action-register-board.js
  - lib/action-register-temas.js
  - server.js
  - frontend-dashboard/lib/api.ts
contracts_consulted:
  - docs/dev-loop/LOOP_PROTOCOL.md
  - AGENTS.md
  - docs/dev-loop/CURRENT_TASK.md
contracts_modified: []
ambiguities_or_contradictions:
  - "CURRENT_TASK.max_attempts=3 contradice LOOP_PROTOCOL §5/§6 (max_attempts siempre 1). Se obedeció el protocolo (1 intento). No se reescribió CURRENT_TASK."
deviations_from_current_task: []
next_task_proposed: ""
secrets_check: none
human_decision_needed:
  - "Revisión visual en planta real (Acapulco u otra) de Registro vivo / Matriz / panel."
  - "G4 merge a main queda en HUMAN_APPROVER. Este reporte no autoriza merge ni deploy."
```

## A. Baseline

Inventario físico de `frontend-dashboard/app/acciones/page.tsx` **antes** de editar (estado `7a275450` + handlers leídos):

### Estados React

token, unauthorized, plantas, plantaId, responsables, board, loading, error, newRevisionDate, draftByCell, draftSubByItem, pickExistingByCell, editItemById, itemSavingById, photosByItem, photosOpenByItem, photoUploadingByItem, photoPreview, directorIaChatOpen, noteDraftByRev, noteSavingByRev, noteEditById, noteEditingById, notePhotosById, notePhotosOpenById, notePhotoUploadingById, notePhotoPreview, notePendingFilesByRev.

### Loaders

loadPlantas, loadBoard, loadResponsables, loadNotePhotos, loadPhotos.

### Mutations / handlers

handleAddNote, handleDeleteNote, handleStartEditNote, handleCancelEditNote, handleSaveEditNote, toggleNotePhotos, handleUploadNotePhoto, handleDeleteNotePhoto, handleCreateRevision, handleAddItem, handleAddSub, handleToggleClosed, handleStartEditItem, handleCancelEditItem, handleSaveEditItem, togglePhotos, handleUploadPhoto, handleDeletePhoto, handleAddExisting.

### Superficie UI

- Auth: no token / no autorizado.
- Planta select (filtro E7–E15 / México).
- Crear columna (fecha).
- Exportar historial a Excel.
- Chat Director IA (modal existente).
- Link Director IA.
- PDF diario por revisión.
- Comentarios del día: lista, editar, borrar, + foto, pending files, preview.
- Acciones propias: título, responsable, vencimiento, editar, cerrar/reabrir, fotos, subacciones, copiar existente.
- DICF virtual: badge, estados propios, Ver en DICF, fotos DICF, no editar/cerrar.
- Preview de fotos (item y nota): anterior/siguiente/descargar/cerrar.
- Sticky de tema + columnas por fecha.
- Formulario completo repetido en cada celda fecha × tema y textarea en cada fecha de comentarios.

### APIs usadas (sin cambio de contrato)

fetchPlantas, fetchActionRegisterBoard, fetchActionRegisterResponsables, createActionRegisterRevision, createActionRegisterItem, addActionRegisterEntry, patchActionRegisterItem, getActionRegisterExportUrl, fetch/upload/delete ActionRegister attachments, create/patch/delete revision notes, DICF attachments, note attachments, getActionRegisterDailyPdfUrl.

## B. Implementación

| Archivo | Propósito |
|---|---|
| `frontend-dashboard/app/acciones/page.tsx` | Solo presentación: panel único, Registro vivo default, Matriz por semana, temas vacíos colapsados, comentarios compactos. Handlers y payloads idénticos. |
| `docs/dev-loop/CURRENT_TASK.md` | Solo `status: AUTHORIZED` → `IN_PROGRESS` → `DONE_PENDING_REVIEW`. G1 no reescrito. |
| `docs/dev-loop/reports/UI-ACTION-REGISTER-GROUPING-001.md` | Este reporte. |

No se tocó `server.js`, `lib/api.ts`, schema, SQL ni Director IA.

## C. Registro vivo

Default al entrar (`boardView = "vivo"`).

- Comentarios del día: una fila compacta por revisión (fecha, primera línea o `Sin comentarios`, PDF, `+`). Las notas existentes se listan debajo con editar/borrar/fotos. Sin textarea permanente.
- Temas con raíces (`parent_id == null`) se muestran con conteo de abiertas. Cada acción conserva tarjeta completa (estado derivado Abierta/Vencida/Terminada, editar, fotos, cerrar/reabrir, + Subacción → mismo panel).
- Temas sin acciones: un bloque `Temas sin acciones (N)` colapsado; al expandir, cada tema canónico sigue disponible con `+`.
- Catálogo de 11 temas no se fusiona.

## D. Matriz por fecha

Vista secundaria, no apilada.

- Revisiones agrupadas lun–dom. La semana más reciente abre por defecto; las demás colapsan.
- Fechas sin comentarios ni acciones: chip `dd/mm/aaaa vacío`. Clic las materializa como columna.
- Columnas visibles: solo fechas con hechos o expandidas. Celdas = tarjetas + `+` (sin formulario).
- Comentarios del día siguen en fila propia.
- Temas sin acciones en las fechas visibles: lista compacta con `+ Tema`.
- PDF por fecha conservado.

## E. Panel único

Drawer derecho, **cerrado** en lectura.

Entradas al mismo panel: `+ Agregar`, `+` de comentario, `+` de tema/fecha, `+ Subacción`.

- Comentario: fecha, texto, + Foto (pending), Agregar comentario → `handleAddNote`.
- Acción: fecha, tema, texto, responsable, vencimiento → `handleAddItem`.
- Subacción: prellena parent → `handleAddSub`.
- Copiar existente: mismo panel → `handleAddExisting`.

Los drafts siguen en `noteDraftByRev` / `draftByCell` / `draftSubByItem` / `pickExistingByCell`.

## F. Información preservada

| Capacidad | Before | After | Estado |
|---|---|---|---|
| Acciones (crear) | Formulario por celda | Panel único, mismos campos/API | PRESERVED |
| Acciones (listar) | Matriz siempre | Vivo + Matriz | PRESERVED |
| Comentarios del día | Textarea por fecha | Compacto + panel; cards existentes | PRESERVED |
| Responsable | Select en celda/edición | Panel + edición inline | PRESERVED |
| Vencimiento | Date en celda/edición | Panel + edición inline | PRESERVED |
| Editar acción | Botón Editar | Igual | PRESERVED |
| Eliminar comentario | ✕ | Igual | PRESERVED |
| Cerrar/reabrir | Botón | Igual | PRESERVED |
| Subacciones | Formulario bajo cada item | `+ Subacción` → panel; hijos se renderizan | PRESERVED |
| Fotos de acción | + Foto / ver / borrar / preview | Igual | PRESERVED |
| Fotos de comentario | + Foto / pending / preview | En card y en panel | PRESERVED |
| Copiar acción previa | Select + Agregar existente por celda | Misma API en el panel | PRESERVED |
| PDF diario | Link por columna | Vivo (fila fecha) y Matriz (header) | PRESERVED |
| Export Excel | Toolbar | Toolbar | PRESERVED |
| Crear columna (fecha) | Toolbar | Toolbar | PRESERVED |
| Selección de planta | Toolbar | Toolbar | PRESERVED |
| Sticky tema | Columna sticky en matriz única | Sticky en Matriz | PRESERVED |
| DICF virtual read-only | Badge, estados propios, Ver en DICF, fotos; no editar/cerrar | Igual; no se normaliza a Abierta/Vencida/Terminada | PRESERVED |
| Chat Director IA / link | Toolbar + modal | Igual; no se modificó el módulo | PRESERVED |
| Auth token / 401 | Pantallas existentes | Igual | PRESERVED |
| Loading / error / empty fechas | Toolbar | Igual | PRESERVED |
| Preview fotos item/nota | Modales | Igual | PRESERVED |
| Comentarios de acción (thread) | No existía como entidad | No inventado | PRESERVED |
| Historial aparte de PDF | No había botón dedicado en page | No eliminado | PRESERVED |
| Catálogo 11 temas | ACTION_REGISTER_TEMAS | Igual; vacíos colapsados | PRESERVED |
| Estados propios | closed + due_date | Abierta / Vencida / Terminada derivados | PRESERVED |
| Estados Programada / En revisión | No existían | No inventados | PRESERVED |

Ninguna fila marcada REMOVED. No hubo STOP por pérdida de capacidad.

## G. Validaciones

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` (cwd `frontend-dashboard`) | exit 0 |
| `npx next lint --dir app/acciones` | no usado: el CLI pidió configurar ESLint de forma interactiva; no se creó config (fuera de alcance) |
| Tests específicos Action Register frontend | no existen; no se fabricaron |
| ReadLints page.tsx | sin errores |
| Panel | cerrado por default; `+` / `+ Agregar` / `+ Subacción` llaman `openCapture` |
| Formularios por celda | eliminados del render; drafts reutilizados en el panel |
| Temas vacíos | colapsados en vivo |
| Fechas vacías | chips en matriz |
| DICF | rama `it.dicf` intacta |

Validación visual en browser contra Render no ejecutada en este entorno (página autenticada por token WhatsApp). Queda en `human_decision_needed`.

## H. Git

- branch: `implementation/ui-action-register-grouping-001`
- base SHA: `7a2754503a05c36f4fba2740400f4993e56a9f10` (= `origin/main` al partir)
- final SHA: el del commit de esta tarea en la rama (no `main`)
- `git status --short` y diff summary se registran en el commit; no se hizo push.

`frontend-dashboard/tsconfig.tsbuildinfo` se generó al typecheck; **no** se incluye.

## I. Declaración de alcance

- Director IA untouched (solo se reutiliza el modal/link ya existentes).
- DB untouched.
- schema untouched.
- API contracts unchanged.
- no merge.
- no deploy.
- no next task.

## Completion

status destino: `DONE_PENDING_REVIEW`. Esperar revisión humana.
