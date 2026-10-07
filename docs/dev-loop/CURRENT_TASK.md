task_id: "FIX-IGF-DIARIO-FOLIO-DRAWER-ROLE-GUARD-068-R2"

title: "Cerrar fallback de permisos al abrir FolioDrawer desde matriz 068"

status: "DONE_PENDING_REVIEW"

mode: "IMPLEMENTATION"

authorized_by: "HUMAN_APPROVER"

authorized_at: "2026-10-07"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-07"

objective: >
  Corregir exclusivamente el guard de rol/permisos al abrir FolioDrawer
  desde la matriz diaria 068-R1.

  La UX de tarjetas y la corrección de precio inicial de Morelos implementada
  en 068-R1 deben permanecer intactas.

base_sha: "577e7c59b4196192fcf875d93c9365835cb4b73b"

branch: "fix/igf-diario-folio-drawer-role-guard-068-r2"

parent_chain:
  main: "4adab4643e91e10c97d6f492044398f710d0608d"
  r1_product: "2ddcdfd613a2c492cd1e8b8d6ff614e97207cb58"
  r1_final: "577e7c59b4196192fcf875d93c9365835cb4b73b"

problem:
  component: "frontend-dashboard/components/IgfDiarioFoliosDepositoMatrix.tsx"

  current_behavior: >
    La matriz obtiene el rol con getRoleFromDashboardToken(token).
    Si no puede resolverlo, actualmente pasa role="" a FolioDrawer.

  downstream_risk: >
    FolioDrawer usa varios permisos con fallback basado en roleUpper.
    Un role vacío no pertenece a CF_CDMX ni GA, por lo que
    soloLecturaBase=false y ciertos fallbacks pueden resultar permisivos
    cuando el token tampoco contiene permisos explícitos.

  example:
    code: >
      perm("acceso_aprobar_folios", !soloLecturaBase)

    unknown_role_effect: >
      role="" => soloLecturaBase=false => fallback=true.

security_contract:
  primary_rule: >
    Un rol desconocido/no decodificable nunca debe obtener más acciones
    que un rol conocido.

  fail_closed: true

  backend:
    - "El backend continúa siendo autoridad final."
    - "No modificar permisos backend."
    - "No modificar endpoints de folios."

preferred_solution:
  rule: >
    No abrir FolioDrawer desde la matriz hasta tener un role válido
    decodificado del token.

  behavior_if_role_known:
    - "Abrir FolioDrawer normalmente."
    - "Pasar el role real."
    - "Conservar permisos existentes del rol."
    - "Conservar permisos explícitos del token."

  behavior_if_role_unknown:
    - "No pasar role vacío a FolioDrawer."
    - "No asumir GG."
    - "No asumir AD."
    - "No asumir ZP."
    - "No ofrecer acciones con fallback permisivo."
    - "Mostrar un mensaje discreto: No se pudo validar el rol para abrir el folio."
    - "La lista diaria permanece abierta."

alternative_solution:
  allowed_only_if_proven_safe: >
    Se puede adaptar FolioDrawer para aceptar explícitamente un modo
    readOnly/failClosed, pero únicamente si el cambio es pequeño,
    no altera el comportamiento normal del Dashboard y queda cubierto
    por regresión.

  preferred_over_global_change: false

known_role_contract:
  source: "getRoleFromDashboardToken(token)"

  examples:
    - "GG"
    - "GA"
    - "ZP"
    - "AD"
    - "CF_CDMX"

  rule: >
    No mantener una lista rígida si el helper/token ya define el rol.
    Solo requerir que exista un string no vacío válido antes de abrir.

folio_ux_contract:
  preserve:
    - "Tarjetas individuales."
    - "Código del folio clicable."
    - "Monto destacado."
    - "Badge de estado."
    - "Descripción de hasta tres líneas."
    - "Abrir folio →."
    - "Modal diario permanece abierto detrás."
    - "Cerrar drawer regresa al mismo detalle."
    - "z-index actual."

price_contract:
  preserve_exactly:
    - "Último precio válido anterior al mes."
    - "No future backfill."
    - "Precio propio reemplaza antecedente."
    - "Carry forward posterior."
    - "Aliases actuales."
    - "Override manual 065-R1."
    - "Precisión completa."
    - "Morelos 01–06 recibe antecedente solo si existe."
    - "No modificar arr.precio_diario."

out_of_scope:
  - "Cambiar SQL de precio."
  - "Cambiar cálculo financiero."
  - "Cambiar ventas."
  - "Cambiar costos."
  - "Cambiar fletes."
  - "Cambiar agregación 068."
  - "Cambiar backend de autorización."
  - "Cambiar estados."
  - "Cambiar DB."
  - "Merge."
  - "Deploy."

mandatory_tests:
  security:
    - "Role conocido abre FolioDrawer."
    - "Se pasa exactamente el role del token."
    - "Role desconocido no abre FolioDrawer con role vacío."
    - "Role desconocido no asume GG."
    - "Role desconocido no asume AD/ZP."
    - "Role desconocido no expone acciones por fallback."
    - "La lista diaria permanece abierta."
    - "Se muestra mensaje discreto si no se puede resolver rol."

  ux:
    - "Click en código abre folio con role válido."
    - "Abrir folio → abre folio con role válido."
    - "Cerrar drawer conserva modal diario."
    - "Tarjetas 068-R1 permanecen."

  price:
    - "Suite 068-R1 de precio PASS sin modificación."
    - "Morelos fixture 01–08 sigue igual."
    - "No future backfill sigue cubierto."

  regression:
    - "068 PASS."
    - "068-R1 PASS."
    - "067 PASS."
    - "066-R1 PASS."
    - "065-R1 PASS."
    - "frontend npm run build PASS."
    - "git diff --check limpio."

recommended_files:
  - "frontend-dashboard/components/IgfDiarioFoliosDepositoMatrix.tsx"
  - "test/fix-igf-diario-folio-drawer-role-guard-068-r2.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/FIX-IGF-DIARIO-FOLIO-DRAWER-ROLE-GUARD-068-R2.md"

avoid_if_possible:
  - "frontend-dashboard/components/FolioDrawer.tsx"

stop_conditions:
  - "Si origin/main != 4adab4643e91e10c97d6f492044398f710d0608d, STOP."
  - "Si la rama padre no contiene 577e7c59b4196192fcf875d93c9365835cb4b73b, STOP."
  - "Si para resolver esto se requiere ampliar permisos, STOP."
  - "Si cambia la lógica de precio 068-R1, STOP."
  - "Si cambia la agregación 068, STOP."

merge_contract:
  executor: "HUMAN_APPROVER_ONLY"
  merge_authorized: false
  deploy_authorized: false

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-IGF-DIARIO-FOLIO-DRAWER-ROLE-GUARD-068-R2.md"