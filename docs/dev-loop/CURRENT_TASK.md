# FIX-FOLIO-DASHBOARD-BENEFICIARIO-PDF-STALE-001

task_type: IMPLEMENTATION

mode: IMPLEMENTATION

status: DONE_PENDING_REVIEW

implementation_authorized: YES

merge_authorized: NO

deploy_authorized: NO

rollback_authorized: NO

docs_director_ia_changed: NO

runtime_changed: YES

backend_changed: YES

frontend_changed: NO

database_changed: NO

schema_changed: NO

max_attempts: 3

authorized_by: "Human Approver"

authorized_at: "2026-09-02T16:38:00-06:00"

human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver approved FIX-FOLIO-DASHBOARD-BENEFICIARIO-PDF-STALE-001 to fix stale beneficiary data in generated folio PDFs by synchronizing the edited principal beneficiary with detalle_lineas[0].beneficiario. Preserve independent beneficiaries in lines 1..N. No schema changes, no destructive SQL, no Director IA changes, no merge, no deploy, no next task."

## 1. Objetivo único

Corregir el bug demostrado por:

`AUDIT-FOLIO-DASHBOARD-BENEFICIARIO-PDF-STALE-001`

Síntoma:

Después de editar el beneficiario principal de un folio desde el dashboard, el dashboard muestra el nuevo beneficiario pero los PDFs que leen `detalle_lineas` pueden continuar mostrando el beneficiario anterior.

Causa demostrada:

`PATCH /api/folios/:id/editar`

actualiza:

`public.folios.beneficiario`

pero NO actualiza:

`detalle_lineas[0].beneficiario`

Los documentos que usan `getFolioLineasFromRow` continúan leyendo el valor viejo del JSON.

## 2. Semántica congelada por auditoría

La auditoría demostró:

* `folios.beneficiario` representa el beneficiario principal del folio.
* En creación, esa columna se obtiene de la línea 0.
* `detalle_lineas[0].beneficiario` corresponde al beneficiario principal.
* `detalle_lineas[1..N].beneficiario` puede ser independiente por línea.
* El modal actual de edición NO es un editor multilínea.

Por tanto:

### DEBE

Cuando el PATCH autorizado cambie `beneficiario`:

`folios.beneficiario = NUEVO`

y, si existe `detalle_lineas` válido con línea 0:

`detalle_lineas[0].beneficiario = NUEVO`

### NO DEBE

Modificar:

`detalle_lineas[1]`
`detalle_lineas[2]`
...
`detalle_lineas[N]`

Los beneficiarios de esas líneas son independientes.

## 3. Fuente causal

Ruta principal:

`PATCH /api/folios/:id/editar`

en:

`server.js`

La corrección debe realizarse en la operación de edición persistida.

NO corregir solamente la representación del PDF.

NO pasar beneficiario por querystring desde frontend.

NO alterar `getFolioLineasFromRow` para hacer que la columna gane globalmente sobre todas las líneas.

## 4. Comportamiento requerido

### Caso A — folio sin detalle_lineas

Si `detalle_lineas` es NULL, vacío o no contiene una línea 0 válida:

actualizar normalmente:

`folios.beneficiario`

No fabricar líneas nuevas solamente para resolver este bug.

### Caso B — una línea

ANTES:

`folios.beneficiario = A`
`detalle_lineas[0].beneficiario = A`

Después de editar A → B:

`folios.beneficiario = B`
`detalle_lineas[0].beneficiario = B`

### Caso C — múltiples líneas

ANTES:

`folios.beneficiario = A`
`detalle_lineas[0].beneficiario = A`
`detalle_lineas[1].beneficiario = X`
`detalle_lineas[2].beneficiario = Y`

Después de editar A → B:

`folios.beneficiario = B`
`detalle_lineas[0].beneficiario = B`
`detalle_lineas[1].beneficiario = X`
`detalle_lineas[2].beneficiario = Y`

Solo la línea 0 cambia.

## 5. Atomicidad

La actualización de:

* `folios.beneficiario`
* `detalle_lineas[0].beneficiario`

debe quedar conceptualmente en la misma edición.

Evitar un estado persistido donde uno se actualice y el otro no.

Reutilizar la estrategia SQL/transaccional existente que resulte mínima y consistente con el endpoint.

No introducir una arquitectura nueva.

## 6. Historial

Preservar el historial existente:

`Edición AD: beneficiario: A → B`

No duplicar artificialmente el evento por haber sincronizado `detalle_lineas[0]`.

El cambio de JSON es consecuencia técnica de la misma edición humana del beneficiario.

## 7. PDFs a preservar

Después de la corrección, verificar la coherencia del beneficiario principal en:

* tablero/drawer;
* póliza;
* documento-folio;
* documento-gastos;
* documento-completo.

No modificar el diseño ni formato visual de esos documentos salvo que sea estrictamente necesario para este bug.

La solución esperada es que los documentos actuales reciban el dato ya sincronizado desde DB.

## 8. Frontend

No se espera modificación del frontend.

`EditarFolioModal.tsx` ya envía `beneficiario` correctamente.

Si durante implementación se concluye que es indispensable cambiar frontend para resolver este bug:

STOP.

Documentar la necesidad.

No ampliar alcance automáticamente.

## 9. Base de datos

No cambiar:

* schema;
* tipos;
* tablas;
* constraints;
* migraciones.

No ejecutar SQL destructivo ni correcciones masivas de producción.

Esta tarea corrige el comportamiento FUTURO del endpoint de edición.

La reparación histórica de folios que ya estén divergentes queda fuera de alcance y, si fuera necesaria, requiere otra tarea explícita.

## 10. Protección de datos existentes

La implementación debe preservar íntegramente el objeto de cada elemento de `detalle_lineas`.

Al actualizar línea 0:

cambiar exclusivamente su propiedad:

`beneficiario`

No reconstruir la línea perdiendo propiedades desconocidas o adicionales.

No borrar:

* concepto;
* importe;
* información fiscal;
* metadata;
* campos auxiliares;
* líneas adicionales.

## 11. Gate Git obligatorio

Antes de modificar código:

1. inspeccionar `git status`;
2. identificar la rama actual;
3. preservar los artefactos de auditoría existentes;
4. partir de `main` limpio y sincronizado con `origin/main`;
5. crear:

`fix/folio-dashboard-beneficiario-pdf-stale-001`

6. confirmar rama ≠ `main`;
7. confirmar CURRENT_TASK correcto;
8. confirmar G1;
9. confirmar `implementation_authorized: YES`.

La auditoría reportó working tree con documentación no comprometida.

NO borrar ni sobrescribir esa evidencia.

Si no es posible llegar de forma segura a una rama de implementación sin perder esos archivos:

STOP.

No implementar sobre `main`.

## 12. Alcance técnico

### in_scope

* `server.js`
* `PATCH /api/folios/:id/editar`
* helper mínimo si resulta necesario para modificar de forma segura `detalle_lineas[0]`
* tests existentes relacionados
* test nuevo mínimo del bug si la infraestructura actual de tests lo permite sin introducir framework nuevo
* reporte de implementación

### out_of_scope

* frontend visual
* Director IA
* `docs/director-ia/`
* schema
* migraciones
* reparación histórica masiva
* edición multilínea
* otros campos de `detalle_lineas`
* refactor general de folios
* merge
* deploy

## 13. No ampliar a otros campos

Esta tarea corrige exclusivamente:

`beneficiario`

Aunque la auditoría haya observado que otros campos pudieran tener patrones similares, NO corregir:

* concepto;
* importe;
* otros campos duplicados;

sin una auditoría/autorización específica.

No “arreglar de paso”.

## 14. Validaciones obligatorias

Validar como mínimo:

### Test 1 — sin detalle_lineas

Editar beneficiario.

Esperado:

* columna actualizada;
* endpoint exitoso;
* sin fabricación de JSON.

### Test 2 — una línea

Editar:

A → B

Esperado:

* `folios.beneficiario = B`
* `detalle_lineas[0].beneficiario = B`

### Test 3 — múltiples líneas

Editar línea principal:

A → B

Con:

* línea 1 = X
* línea 2 = Y

Esperado:

* header = B
* línea 0 = B
* línea 1 = X
* línea 2 = Y

### Test 4 — historial

Esperado:

un único cambio lógico del beneficiario A → B.

### Test 5 — documentos

Confirmar por código/test disponible que:

* documento-folio
* documento-gastos
* documento-completo
* póliza

ya no divergen respecto al beneficiario principal después de la edición.

No fabricar navegación autenticada si el entorno no la permite; documentar esa limitación.

## 15. Regresión

Ejecutar las pruebas existentes aplicables a folios/backend.

No inventar comandos.

Registrar:

* comando;
* exit code;
* resultado.

Si existe suite específica de edición/PDF, ejecutarla.

## 16. Evidencia final

Entregar:

### A. Root cause confirmado

Ruta exacta before.

### B. Cambio

Archivo(s), función(es) y comportamiento modificado.

### C. Casos

Tabla:

| Caso | Header | línea 0 | líneas 1..N | Resultado |
| ---- | ------ | ------- | ----------- | --------- |

### D. Historial

Confirmar que no se duplicó.

### E. PDFs

Explicar por qué ahora cada salida obtiene el valor correcto.

### F. Validación

Comandos y resultados reales.

### G. Git

* base SHA
* branch
* commit SHA
* `git status --short`
* diff summary

### H. Alcance

Confirmar:

* no frontend;
* no schema;
* no migración;
* no reparación masiva;
* no Director IA;
* no merge;
* no deploy.

## 17. Completion

Si todas las validaciones son correctas:

`status: DONE_PENDING_REVIEW`

NO CLOSED.

NO merge.

NO deploy.

NO siguiente tarea.

Esperar revisión humana.
