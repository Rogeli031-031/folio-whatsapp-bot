# FIX-IGF-DIARIO-FOLIO-DRAWER-ROLE-GUARD-068-R2

```yaml
task_id: "FIX-IGF-DIARIO-FOLIO-DRAWER-ROLE-GUARD-068-R2"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "frontend-dashboard/components/IgfDiarioFoliosDepositoMatrix.tsx"
  - "test/fix-igf-diario-folio-drawer-role-guard-068-r2.test.js"
  - "test/fix-igf-diario-detail-ux-opening-price-068-r1.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-FOLIO-DRAWER-ROLE-GUARD-068-R2.md"
files_not_touched:
  - "frontend-dashboard/components/FolioDrawer.tsx"
  - "lib/dashboard-arr-forecast.js"
  - "lib/igf-diario-folios-deposito-matrix.js"
  - "server.js"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-DETAIL-UX-AND-OPENING-PRICE-068-R1.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task:
  - "La prueba de 068-R1 exigía role={dashboardRole || \"\"}. Esa línea quedó sustituida por el guard fail-closed, porque el contrato nuevo prohíbe pasar rol vacío."
next_task_proposed: ""
secrets_check: "none"
human_decision_needed: []
```

| Campo | Valor |
|---|---|
| main | 4adab4643e91e10c97d6f492044398f710d0608d |
| padre | 577e7c59b4196192fcf875d93c9365835cb4b73b |
| precio 068-R1 | 2ddcdfd613a2c492cd1e8b8d6ff614e97207cb58 |
| producto | f550670d279264f75a57743072efc0003fc09439 |
| rama | fix/igf-diario-folio-drawer-role-guard-068-r2 |

## Causa

068-R1 resolvía el rol con `getRoleFromDashboardToken` y, si no había rol, pasaba `role=""`. En `FolioDrawer`, `soloLecturaBase` solo es verdadero para `CF_CDMX` y `GA`. Un rol vacío deja ese flag en falso y el fallback de `perm("acceso_aprobar_folios", !soloLecturaBase)` queda en verdadero cuando el token no trae el permiso explícito.

## Riesgo

La UI podía mostrar acciones de aprobación o avance antes de que el backend las rechazara.

## Solución

`handleOpenFolio` es el único camino del código y de «Abrir folio →». Si `resolvedRole` tiene texto, abre el drawer y le pasa ese rol. Si no, no monta `FolioDrawer`, no asigna `role=""` y muestra «No se pudo validar el rol para abrir el folio.» La lista diaria sigue abierta. No se usan `GG`, `AD` ni `ZP` como sustituto.

## Rol conocido

El drawer se monta con `role={resolvedRole}`, el valor recortado que salió del token. Cerrar el drawer solo limpia el id. El modal diario permanece.

## Rol desconocido

No hay drawer. El aviso queda dentro del modal, con `role="status"`.

## Confirmaciones

`FolioDrawer.tsx` no se modificó. `lib/dashboard-arr-forecast.js` no se modificó: sigue el antecedente, la consulta extra, la precedencia exacta/alias, el arrastre, el override manual y la precisión de 068-R1.

## Pruebas

068-R2: 2/2. 068-R1: 6/6, incluido el fixture Morelos 01–08. 068, 067, 066-R1, 065 y 065-R1: pass en la misma corrida. `node --check server.js` correcto. Build del dashboard correcto. `git diff --check` limpio.

## SHA

Producto: `f550670d279264f75a57743072efc0003fc09439`.

No hubo merge ni deploy.
