# FIX-PLAN-MAESTRO-MOBILE-PDF-VIEWER-001

```yaml
task_id: "FIX-PLAN-MAESTRO-MOBILE-PDF-VIEWER-001"
outcome: "DONE_PENDING_REVIEW"
implementation: true
source_code_changed: true
test_code_changed: true
sql_changed: false
backend_changed: false
live_db: false
base_main_sha: "471af52f6cef1a1297e0c0964e087b25bcd1c073"
branch: "fix/plan-maestro-mobile-pdf-viewer-001"
contracts_consulted:
  - "AGENTS.md"
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: false
next_task_authorized: false
next_task_executed: false
secrets_check: "none"
human_decision_needed: "G5: aceptar o rechazar. No merge. No push main. No deploy."
```

## Hallazgo implementado

En celular el modal apilaba Hojas + Chat + Notas en `94vh` con `overflow-hidden`. El canvas del PDF quedaba sin altura útil.

Ahora, bajo `lg` (1024px):

- pestañas `Hojas | Chat | Notas` (default `Hojas` al abrir)
- solo un área completa visible
- visor con `min-h-[50vh]` y catálogo compacto (`max-h-[28vh]` scroll)
- `Maximizar` → overlay `z-[70]` a pantalla completa
- `Volver` cierra el overlay
- hoja ajustada al ancho del contenedor (`ResizeObserver` + scale)

Desktop (`lg+`): grid de dos columnas, scale `1.25`, `Maximizar` oculto, Chat y Notas simultáneos. Sin cambio de API, SQL, S3, Director IA ni Plaud.

---

IMPLEMENTATION_SHA:
0d937518

BASE_MAIN_SHA:
471af52f6cef1a1297e0c0964e087b25bcd1c073

FIX_FILE:
frontend-dashboard/components/PlanMaestroModal.tsx

MOBILE_TABS:
Hojas | Chat | Notas

DEFAULT_MOBILE_PANE:
hojas

MAXIMIZE:
YES (solo < lg)

RETURN_FROM_MAXIMIZE:
Volver

PAGE_CONTROLS:
Anterior / Siguiente conservados (también en maximizado)

FIT_WIDTH_MOBILE:
YES

DESKTOP_SCALE:
1.25 (sin cambio)

DESKTOP_LAYOUT:
lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]

DOWNLOAD_PRESERVED:
YES

CHAT_PAGE_TEXT_PRESERVED:
YES

NOTES_PRESERVED:
YES

BACKEND_CHANGED:
NO

SQL_CHANGED:
NO

S3_CHANGED:
NO

DIRECTOR_IA_CHANGED:
NO

PLAUD_CHANGED:
NO

LIVE_DB_USED:
NO

## Validación móvil (código + tests; viewport representativo 390×844)

No hay herramientas de browser en esta sesión. Evidencia por contrato de layout y suite:

1. Al abrir el modal, `mobilePane` se fuerza a `hojas` y las pestañas están en el header (`lg:hidden`). No hace falta scrollear Chat/Notas para llegar a Hojas.
2. Hojas normal: sección `flex-1`; aside `hidden` en <lg. Visor `min-h-[50vh]`. Chat y Notas no ocupan esa pantalla.
3. Hojas maximizado: overlay `fixed inset-0 z-[70]`, canvas único, Anterior/Siguiente, Descargar, Volver.
4. Anterior / Siguiente: mismos handlers en toolbar normal y maximizada.
5. Chat / Notas: una pestaña a la vez (`hidden` de las otras bajo `lg`).
6. Volver: `setMaximized(false)` restaura el modal.
7. Descarga: `planMaestroFileUrl(..., "attachment")` en tarjetas y en maximizado.
8. Ancho: scale = `(avail - 16) / pageWidth`; `canvas.style.width = 100%` solo si no desktop.

Sustituto de browser: `node --test test/plan-maestro.test.js` 16/16 PASS.

No verificado en dispositivo físico ni en Chrome DevTools live (PDF real / pinch / iOS Safari).

## Validación desktop (≥1024px)

1. Tab bar `lg:hidden`.
2. Grid de dos columnas idéntico al previo.
3. Chat + Notas simultáneos (`lg:flex`).
4. Scale fijo 1.25; no se fuerza width 100% del canvas.
5. Iframe fallback `lg:min-h-[420px]`.
6. `Maximizar` no se muestra.

## Tests

```
node --test test/plan-maestro.test.js
16/16 PASS
```

- catálogo / permisos / notas (existentes)
- visor móvil: pestañas, Maximizar/Volver, exclusión mutua, Anterior/Siguiente/descarga/chat, grid desktop, fit-width, no backend/SQL/Director IA/Plaud

## FILES

- frontend-dashboard/components/PlanMaestroModal.tsx
- test/plan-maestro.test.js
- docs/dev-loop/CURRENT_TASK.md (solo status)
- docs/dev-loop/reports/FIX-PLAN-MAESTRO-MOBILE-PDF-VIEWER-001.md

## RISKS

PDFs grandes (~64 MB) en celular pueden fallar al cargar en memoria; no es de este slice. Sin zoom pinch (el visor previo tampoco lo tenía). Validación live de dispositivo queda a revisión humana.
