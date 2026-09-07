task_id: AUDIT-DIRECTOR-IA-PROFITABILITY-EXPENSE-SUBTOPIC-DATA-001

task_type: AUDIT
mode: READ_ONLY_PHYSICAL_TRACE

status: CLOSED
authorized_by: "Human Approver"
authorized_at: "2026-09-06T18:35:31-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-06 - READ_ONLY EXPENSE SUBTOPIC DATA AUDIT; NO IMPLEMENTATION; NO LIVE_DB; NO MERGE; NO DEPLOY"

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 6c5aa8dfecd7517fcb4022e7c06073ad537cec21

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PROFITABILITY-EXPENSE-SUBTOPIC-DATA-001.md

objective: Determinar por qué, después de una conversación válida rentabilidad -> gasto -> corporativos -> "¿cuánto subieron?", Director IA conserva correctamente el contexto pero no puede devolver el comparativo corporativo, y definir el cambio físico mínimo necesario sin crear Delta Gastos ni nueva fórmula.

## Evidencia LIVE

T1:
¿Qué está provocando el deterioro de la rentabilidad y sobre qué puedo actuar?

PASS.

T2:
y gasto?

PASS.

T3:
y corporativos?

PASS conversacional.

T4:
¿cuánto subieron?

Respuesta actual:

"Seguimos en el análisis de rentabilidad, dentro de corporativos (2026-08 vs 2026-09). Todavía no está conectado un comparativo que permita decir cuánto se movió esa rama. No invento la cifra ni cambio de tema."

## Hecho

La continuidad conversacional YA funciona.

Después de T3/T4 existe contexto equivalente a:

parent_intent = profitability_deterioro_snapshot
active_subtopic = expense.corporate
active_period_months = A/B

NO auditar nuevamente el problema de continuidad salvo contradicción física.

## Pregunta principal

¿Existe ya en el sistema una fuente física/autoritativa que permita obtener, para los mismos periodos A/B del profitability snapshot:

- gasto corporativo A
- gasto corporativo B
- variación B - A

y análogamente, si existe:

- gasto operativo A
- gasto operativo B
- variación B - A

?

Si existe:

¿por qué esa evidencia no llega actualmente al profitability subtopic route?

## Buscar físicamente

Inspeccionar como mínimo:

- lib/director-ia-rentabilidad-deterioro-snapshot.js
- lib/director-ia-profitability-subtopic.js
- lib/director-ia-chat.js
- loaders/helpers IGF usados por rentabilidad
- endpoint/payload que alimenta el IGF Forecast/dashboard
- campos reales ya existentes para gastos operativos/corporativos
- tests relacionados

Buscar nombres físicos reales, no asumirlos.

Investigar términos como:

corporativo
corporativos
operativo
operativos
gasto
gastos
gasto_total
gasto_corporativo
gasto_operativo
util_oper_importe
resultado_final_importe

y cualquier nombre real encontrado en los loaders/payloads.

## Traza obligatoria

Para CORPORATIVOS:

source physical field
→ loader
→ monthly KPI / IGF payload
→ profitability snapshot A/B
→ chat state/context
→ profitability subtopic
→ T4 "¿cuánto subieron?"

Marcar cada boundary como:

AVAILABLE
LOADED
NOT_LOADED
DROPPED
NOT_EXPOSED
NOT_TRANSPORTED
NOT_CONNECTED
DERIVED_ONLY
SOURCE_MISSING

Identificar exactamente el PRIMER boundary donde deja de estar disponible.

Repetir brevemente para OPERATIVOS si existe la fuente.

## Clasificación final

Elegir exactamente una:

A. DATA_ALREADY_IN_SNAPSHOT_NOT_EXPOSED

Los valores ya están en el snapshot pero el subtopic no los usa.

B. DATA_ALREADY_LOADED_BUT_DROPPED

El loader los obtiene pero el snapshot no los conserva.

C. EXISTING_SOURCE_NOT_LOADED_BY_SNAPSHOT

La fuente física existe y ya se usa en otro módulo/dashboard, pero esta ruta no la carga.

D. ONLY_DERIVABLE_BY_NEW_FORMULA

No existe campo físico; solo podría obtenerse mediante una derivación nueva.

E. SOURCE_NOT_FOUND

No se localiza fuente física suficiente.

F. RUNTIME_REQUIRED

La estática no permite determinarlo.

## Regla crítica

NO aceptar como fuente nueva:

rentabilidad operativa - rentabilidad final

solo porque matemáticamente pudiera parecer gasto corporativo.

Si el sistema YA define explícitamente esa relación como contrato existente, documentarla, pero NO implementarla en esta auditoría.

No crear ninguna fórmula.

## Importante

NO existe formalmente un módulo Delta Gastos.

Esta auditoría NO debe diseñarlo.

La pregunta es mucho más pequeña:

"¿Ya tenemos físicamente los valores de gasto corporativo/operativo de A y B y solamente falta conectarlos a la conversación?"

## Si la fuente YA existe

Proponer el FIX mínimo exacto:

- archivos;
- campos;
- flujo;
- estado/evidence que habría que transportar;
- tests;
- riesgos.

Debe permitir algo conceptualmente como:

T3:
y corporativos?

T4:
¿cuánto subieron?

→ Corporativos pasaron de [A] a [B], una variación de [delta].

Pero solamente si A y B provienen de fuente física existente.

## Si NO existe

Decir exactamente qué falta.

No inventar solución.

No crear SQL nuevo.

No proponer poblar tablas artificialmente.

## También revisar

Si existe gasto total A/B físicamente disponible, documentarlo por separado.

Distinguir claramente:

- gasto operativo
- gasto corporativo
- gasto total
- rentabilidad operativa
- rentabilidad final

No mezclar conceptos.

## Prohibido

NO implementación.
NO modificar producto.
NO tests nuevos.
NO SQL nuevo.
NO DB/schema.
NO LIVE_DB.
NO Delta Gastos.
NO nueva fórmula.
NO hardcodes.
NO frontend changes.
NO merge.
NO push main.
NO deploy.
NO siguiente tarea.

## Cierre

Crear:

docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PROFITABILITY-EXPENSE-SUBTOPIC-DATA-001.md

El reporte debe responder:

1. ¿Dónde vive físicamente gasto corporativo?
2. ¿Dónde vive físicamente gasto operativo?
3. ¿Existe gasto total físico?
4. ¿Están disponibles A/B?
5. ¿Cuál es el FIRST_BAD_BOUNDARY?
6. Clasificación A-F.
7. ¿Cuál sería el FIX mínimo?
8. Archivos exactos que tocaría.
9. Qué pruebas habría que escribir.
10. Qué NO debe hacerse.

Después:

CURRENT_TASK → DONE_PENDING_REVIEW

STOP.

NO implementación.
NO merge.
NO deploy.
NO next task.

## Completion

DONE_PENDING_REVIEW.

Reporte: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-PROFITABILITY-EXPENSE-SUBTOPIC-DATA-001.md

STOP. Esperar revisión humana. No implementación. No commit. No merge. No deploy. No next task.
