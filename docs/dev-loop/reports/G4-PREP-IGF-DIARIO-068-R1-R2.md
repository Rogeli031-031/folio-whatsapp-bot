# G4-PREP-IGF-DIARIO-068-R1-R2

```yaml
task_id: "G4-PREP-IGF-DIARIO-068-R1-R2"
outcome: "DONE_PENDING_REVIEW"
files_touched:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/G4-PREP-IGF-DIARIO-068-R1-R2.md"
files_not_touched:
  - "frontend-dashboard/components/IgfDiarioFoliosDepositoMatrix.tsx"
  - "frontend-dashboard/components/FolioDrawer.tsx"
  - "lib/dashboard-arr-forecast.js"
  - "tests"
contracts_consulted:
  - "docs/dev-loop/LOOP_PROTOCOL.md"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-DETAIL-UX-AND-OPENING-PRICE-068-R1.md"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-FOLIO-DRAWER-ROLE-GUARD-068-R2.md"
contracts_modified: []
ambiguities_or_contradictions: []
deviations_from_current_task: []
next_task_proposed: ""
secrets_check: "none"
human_decision_needed:
  - "Squash and merge queda reservado al HUMAN_APPROVER."
```

| Campo | Valor |
|---|---|
| main | 4adab4643e91e10c97d6f492044398f710d0608d |
| rama | fix/igf-diario-folio-drawer-role-guard-068-r2 |
| HEAD antes de este commit | e87a4237bf76b081e562e2fe45f9f21fc670ca43 |
| ahead / behind | 4 / 0 |
| PR | https://github.com/Rogeli031-031/folio-whatsapp-bot/pull/113 |
| merge | no |
| deploy | no |

## Cadena

| Paso | SHA |
|---|---|
| 068-R1 producto | 2ddcdfd613a2c492cd1e8b8d6ff614e97207cb58 |
| 068-R1 final | 577e7c59b4196192fcf875d93c9365835cb4b73b |
| 068-R2 producto | f550670d279264f75a57743072efc0003fc09439 |
| 068-R2 final | e87a4237bf76b081e562e2fe45f9f21fc670ca43 |

`git diff --check` contra `main` quedó limpio. `FolioDrawer.tsx` no aparece en el diff.

## UX del detalle

El detalle diario usa tarjetas. El código queda a la izquierda y el monto a la derecha. El estado es un badge. La descripción ocupa el ancho, con salto de línea y hasta tres líneas. «Abrir folio →» y el click del código llaman a `handleOpenFolio` con `folio.id`.

## Apertura y fail-closed

Se reutiliza `FolioDrawer`. El rol sale de `getRoleFromDashboardToken`. El drawer solo se monta si hay rol no vacío, y recibe `role={resolvedRole}`. No se pasa `role=""`. No hay fallback `GG`, `AD` ni `ZP`. Sin rol, la lista sigue abierta y muestra «No se pudo validar el rol para abrir el folio.» Cerrar el drawer solo limpia el id. El modal está en `z-30` y el drawer existente sigue en `z-40` / `z-50`.

## Morelos y antecedente

La consulta mensual de `loadPrecioDiario` permanece. Se agrega una sola consulta del último precio con `fecha < primer día del mes`, `precio > 0` y la misma identidad `precioLookupCodes`. En esa fecha gana el código exacto si es válido. Morelos no está hardcodeado. Enero puede usar diciembre del año anterior. El número no se redondea.

Fixture: antecedente `2026-09-30 = 19.95`. Días 01–06 quedan en `19.95`. El 07 usa `20.05`. El 08 arrastra `20.05`. El precio del 07 no retrocede. Sin antecedente válido, o con 0 o null, el inicio queda vacío. El override manual de 065-R1 sigue primero cuando el rango del corte lo permite. No hay `INSERT`, `UPDATE` ni `DELETE` sobre `arr.precio_diario`.

## Consultas

Antes: 1 consulta por carga de precio. Después: la del mes más una constante del antecedente. `loadUltimoPrecioPrevio` tiene un solo `client.query`. No hay consulta por día.

## Pruebas ya registradas

068-R2 2/2. 068-R1 6/6. 068, 067, 066-R1, 065 y 065-R1 en pass. `node --check server.js` correcto. Build del dashboard correcto.

## Archivos del PR

- `frontend-dashboard/components/IgfDiarioFoliosDepositoMatrix.tsx`
- `lib/dashboard-arr-forecast.js`
- `test/fix-igf-diario-detail-ux-opening-price-068-r1.test.js`
- `test/fix-igf-diario-folio-drawer-role-guard-068-r2.test.js`
- `test/igf-diario-precio-carry-forward-029.test.js`
- `test/igf-diario-precio-sheet-027.test.js`
- `docs/dev-loop/CURRENT_TASK.md`
- `docs/dev-loop/reports/FIX-IGF-DIARIO-DETAIL-UX-AND-OPENING-PRICE-068-R1.md`
- `docs/dev-loop/reports/FIX-IGF-DIARIO-FOLIO-DRAWER-ROLE-GUARD-068-R2.md`
- `docs/dev-loop/reports/G4-PREP-IGF-DIARIO-068-R1-R2.md`

PR [#113](https://github.com/Rogeli031-031/folio-whatsapp-bot/pull/113). Base `main`. Head `fix/igf-diario-folio-drawer-role-guard-068-r2`. Título `FIX 068-R1/R2: detalle de folios y precio inicial IGF Diario`. Preferencia posterior: Squash and merge. El merge y el deploy no se ejecutan aquí.
