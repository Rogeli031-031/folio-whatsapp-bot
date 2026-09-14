```yaml
task_id: "FIX-PLAN-MAESTRO-MOBILE-PDF-VIEWER-001"

status: DONE_PENDING_REVIEW

authorized_by: "HUMAN"

authorized_at: "2026-09-14"

human_authorization: "AUTHORIZED_BY_HUMAN"

objective: >
  Corregir la experiencia móvil del visor de Plan Maestro para que las hojas PDF
  sean realmente visibles y utilizables en celular. Implementar navegación móvil
  por pestañas Hojas | Chat | Notas y permitir maximizar la vista de Hojas a
  pantalla completa, conservando el comportamiento actual de escritorio.

acceptance_criteria:
  - "En viewport móvil existe una forma visible y directa de abrir la sección Hojas."
  - "La hoja PDF activa se renderiza con altura útil y no queda recortada por Chat o Notas."
  - "En móvil existen pestañas o navegación equivalente: Hojas | Chat | Notas."
  - "La vista Hojas permite maximizar el visor a pantalla completa."
  - "Desde la vista maximizada existe una forma clara de regresar al modal."
  - "Se conservan controles Anterior / Siguiente cuando existan varias hojas."
  - "La hoja se adapta al ancho disponible del dispositivo."
  - "Si el visor actual soporta zoom, conservarlo; no introducir una regresión."
  - "Cambiar de hoja o documento activo sigue funcionando."
  - "La descarga existente sigue funcionando."
  - "El chat asociado a la hoja sigue funcionando."
  - "Notas siguen disponibles."
  - "Desktop conserva el comportamiento y layout actuales."
  - "No modificar backend, SQL, S3, Director IA ni Plaud."
  - "Agregar o actualizar pruebas relevantes para comportamiento responsive."
  - "Documentar evidencia de validación móvil y desktop en el reporte."

in_scope:
  - "frontend-dashboard/components/PlanMaestroModal.tsx"
  - "test/plan-maestro.test.js"
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/dev-loop/reports/FIX-PLAN-MAESTRO-MOBILE-PDF-VIEWER-001.md"

out_of_scope:
  - "docs/director-ia/"
  - "lib/director-ia-*"
  - "Plaud"
  - "chat/notas backend"
  - "SQL / schema / S3"
  - "cambios funcionales de escritorio salvo los mínimos requeridos para compartir componentes"
  - "main (push/merge)"

implementation_constraints:
  - "Preferir tabs Hojas | Chat | Notas en móvil."
  - "Agregar acción Maximizar dentro de Hojas."
  - "No renderizar las tres áreas completas simultáneamente en viewport móvil."
  - "No duplicar lógica de carga del PDF si puede reutilizarse el visor existente."
  - "Mantener desktop sin regresiones."
  - "No alterar contratos API."
  - "No alterar persistencia."

validation:
  - "Validar viewport móvil representativo."
  - "Validar que al entrar al modal se pueda llegar a Hojas sin scroll imposible."
  - "Validar Hojas normal."
  - "Validar Hojas maximizado."
  - "Validar Anterior / Siguiente."
  - "Validar cambio entre Hojas, Chat y Notas."
  - "Validar regreso desde pantalla completa."
  - "Validar descarga."
  - "Validar viewport desktop."
  - "Ejecutar pruebas existentes y nuevas relacionadas con Plan Maestro."

allowed_actions:
  - "crear rama fix/plan-maestro-mobile-pdf-viewer-001"
  - "implementar tabs móviles"
  - "implementar maximización del visor"
  - "ajustar layout responsive"
  - "agregar pruebas"
  - "crear reporte de evidencia"
  - "commit y push únicamente a la rama de trabajo si el protocolo vigente lo permite"

forbidden_actions:
  - "merge a main"
  - "push directo a main"
  - "LIVE_DB"
  - "cambios SQL"
  - "cambios de backend"
  - "cambios en Director IA"
  - "cambios en Plaud"
  - "iniciar siguiente tarea"

max_attempts: 1

result_report_path: "docs/dev-loop/reports/FIX-PLAN-MAESTRO-MOBILE-PDF-VIEWER-001.md"

final_state: "DONE_PENDING_REVIEW"
```
