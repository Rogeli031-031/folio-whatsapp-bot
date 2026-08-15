task_id: "ARCH-06-CHANNEL-PROJECTION-001"
status: CLOSED

authorized_by: "HUMAN_APPROVER"
authorized_at: "2026-08-15T10:40:00-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: HUMAN_APPROVER 2026-08-15"

gates:
  G1_task_authorization: AUTHORIZED
  G3_new_architecture_contract: AUTHORIZED

objective: >
  Crear exclusivamente docs/director-ia/06-CHANNEL-PROJECTION.md,
  formalizando contractualmente D1, D2 y D3, sus 12 invariantes
  y el Test de Pureza, asegurando que el módulo actúe como un
  proyector semántico puro sin autoridad epistemológica.

in_scope:
  - "docs/dev-loop/CURRENT_TASK.md"
  - "docs/director-ia/06-CHANNEL-PROJECTION.md"
  - "docs/dev-loop/reports/ARCH-06-CHANNEL-PROJECTION-001.md"

out_of_scope:
  - "modificar cualquier archivo existente en docs/director-ia/"
  - "runtime de Director IA"
  - "código productivo"
  - ".cursor/"
  - ".cursorrules"
  - ".github/"
  - "GitHub Actions o watchers"
  - "calibración k/wi"
  - "ruleset de materiality"
  - "firma IES"
  - "ejecución de tools, bases operacionales, loaders o APIs"
  - "commit, push o merge a main"

contracts_in_force:
  - "docs/director-ia/DIRECTOR_IA_CONSTITUTION.md"
  - "docs/director-ia/DIRECTOR_IA_EXECUTIVE_KNOWLEDGE_ENGINE.md"
  - "docs/director-ia/02-EVIDENCE-BUILDER.md"
  - "docs/director-ia/03-EXECUTIVE-KNOWLEDGE-STORE.md"
  - "docs/director-ia/03A-OBSERVATION-PIPELINE.md"
  - "docs/director-ia/03B-END-TO-END-REFERENCE-FLOWS.md"
  - "docs/director-ia/04-IES-STANDARD.md"
  - "docs/director-ia/05-REASONING-ENGINE.md"
  - "docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md"

allowed_actions:
  - "leer contracts_in_force"
  - "crear exclusivamente docs/director-ia/06-CHANNEL-PROJECTION.md"
  - "formalizar D1: clasificación y contrato de transformación"
  - "formalizar D2: Projection Model y seis superficies ejecutivas"
  - "formalizar D3: projection_depth L0-L3"
  - "formalizar las 12 invariantes de diseño"
  - "formalizar el Test de Pureza"
  - "crear el reporte de esta tarea"
  - "actualizar CURRENT_TASK mediante las transiciones permitidas"
  - "ejecutar git diff --check y verificaciones de solo lectura"

forbidden_actions:
  - "reinterpretar o corregir contratos superiores"
  - "modificar archivos arquitectónicos existentes"
  - "inventar nuevos niveles epistemológicos"
  - "convertir projection_depth L0-L3 en N1-N5"
  - "implementar runtime"
  - "crear reglas de Cursor"
  - "ejecutar tools empresariales o consultar fuentes operacionales"
  - "crear una tarea posterior"
  - "autoaprobar gates"
  - "commit, push o merge a main"

max_attempts: 1
result_report_path: "docs/dev-loop/reports/ARCH-06-CHANNEL-PROJECTION-001.md"

---

## BLOQUE NORMATIVO — D1, D2, D3

### D1 — Contrato de Transformación

06 transforma la forma de exposición, no la verdad.

Clasificación de contenido:

1. IRRENUNCIABLE
   - Conflictos Tipo E.
   - NO_CONOZCO.
   - Limitaciones materiales.
   - Contradicciones críticas.
   - Cualquier elemento cuya omisión cambie la interpretación ejecutiva.
   - Regla: nunca puede omitirse ni quedar detrás de revelación progresiva.

2. OBLIGATORIO_RESUMIBLE
   - Conclusión esencial.
   - Diagnóstico N4.
   - Evidencia principal.
   - Hipótesis N5, solo si existe legítimamente.
   - Regla: debe aparecer, pero puede comprimirse.

3. DIFERIBLE_BAJO_DEMANDA
   - Evidencia ampliada.
   - Hechos N2.
   - Referencias técnicas.
   - Linaje autorizado disponible.
   - Regla: puede diferirse mediante clic, drill-down, "dime más", anexo u otro mecanismo proporcional al canal.

4. ESPECIFICO_DE_CANAL
   - Formato.
   - Densidad.
   - Secuencia.
   - Tono de presentación.
   - Interactividad.
   - Regla: adaptación pura; nunca semántica nueva.

Regla de oro D1:

"El canal puede reducir el detalle, pero nunca reducir el significado crítico ni la veracidad."

---

### D2 — Modelo de Proyecciones por Canal

Los canales son políticas de proyección sobre un modelo semántico común.
No son pipelines independientes.

Superficies ejecutivas:

- Chat
- Voz
- WhatsApp
- Dashboard
- Reporte
- Presentación

Características generales:

- Chat: interactivo / equilibrado / explicación y exploración.
- Voz: secuencial / baja densidad / carga cognitiva mínima.
- WhatsApp: rápido / baja densidad / alerta, acción y consulta.
- Dashboard: alta densidad / visual / exploratorio / drill-down.
- Reporte: alta densidad / persistente / documental / auditable.
- Presentación: media-alta densidad / guiada / conducción de decisión.

### Projection Model

06 debe definir un artefacto intermedio llamado Projection Model.

Su función es describir qué debe comunicarse y con qué prioridad antes de decidir cómo se representa en cada canal.

Ejemplo conceptual:

- content_class
- semantic_type
- priority
- disclosure
- source_reference
- ies_id
- reasoning_run_id cuando exista

El Projection Model no crea inteligencia, no crea hechos y no ejecuta tools.

Cambiar de canal no crea un nuevo ies_id.

Los canales deben preservar equivalencia crítica aunque la representación sea diferente.

---

### D3 — Projection Depth

projection_depth es una dimensión de presentación, no una taxonomía epistemológica.

Nunca redefine N1-N5.

Capas:

- L0_FLASH
  - Irrenunciables.
  - Conclusión esencial.

- L1_EXECUTIVE
  - L0.
  - Diagnóstico N4.
  - Evidencia principal.
  - Hipótesis N5 solo si existe legítimamente.
  - Reservas relevantes.

- L2_SUPPORT
  - L1.
  - Evidencia ampliada.
  - Conflictos detallados.
  - Limitaciones.
  - Soporte adicional.

- L3_AUDIT
  - L2.
  - Hechos N2.
  - Referencias.
  - Linaje autorizado y disponible.

Reglas D3:

- Profundizar agrega detalle; nunca sustituye ni contradice capas previas.
- Un elemento IRRENUNCIABLE atraviesa L0-L3.
- Ningún contenido crítico requiere profundización para descubrirse.
- La ausencia legítima de N5 nunca se rellena.
- 06 no consulta directamente el Knowledge Store para reconstruir N1.
- Si L3 requiere detalle adicional, 06 solo expone referencias o rutas autorizadas hacia el sistema propietario.

---

## 12 INVARIANTES DE 06

1. Fidelidad semántica.
2. Criticidad.
3. Separación epistemológica.
4. No-reinterpretación.
5. Trazabilidad.
6. Compresión controlada.
7. Revelación progresiva.
8. Independencia de canal.
9. No-ejecución.
10. Equivalencia crítica multiinterfaz.
11. Accesibilidad del soporte.
12. Fallo seguro.

### Definiciones mínimas

- Fidelidad semántica:
  Ninguna proyección añade, elimina o altera significado del IES o Reasoning Result.

- Criticidad:
  Todo contenido irrenunciable aparece en la primera capa útil.

- Separación epistemológica:
  Hechos, evidencias, diagnósticos, hipótesis, recomendaciones y limitaciones permanecen distinguibles.

- No-reinterpretación:
  06 no resuelve conflictos, recalcula cobertura, materiality, confidence, severity o hypothesis_strength.

- Trazabilidad:
  Toda proyección conserva ies_id y, cuando aplique, referencia al Reasoning Result o Reasoning Run.

- Compresión controlada:
  Resumir nunca elimina una condición, contradicción o reserva que cambie la interpretación ejecutiva.

- Revelación progresiva:
  El detalle puede diferirse. La verdad crítica no.

- Independencia de canal:
  Cambiar de canal no crea una nueva verdad ni modifica artefactos fuente.

- No-ejecución:
  06 no ejecuta tools, no consulta bases, no llama loaders y no genera conocimiento nuevo.

- Equivalencia crítica multiinterfaz:
  Dos canales distintos deben preservar el mismo conjunto de significados críticos.

- Accesibilidad del soporte:
  Todo soporte resumido debe ser accesible por un mecanismo proporcional al canal.

- Fallo seguro:
  Si un canal no puede representar fielmente un contenido obligatorio, debe declarar la limitación; nunca omitir ni improvisar.

---

## TEST DE PUREZA

"Una proyección es válida solo si, al eliminar sus decisiones puramente visuales o conversacionales, no queda ninguna afirmación que no pueda rastrearse al IES o al Reasoning Result de entrada."

---

## REGLA DE FINALIZACIÓN

Cursor debe:

1. Crear únicamente:
   - docs/director-ia/06-CHANNEL-PROJECTION.md
   - docs/dev-loop/reports/ARCH-06-CHANNEL-PROJECTION-001.md

2. Actualizar CURRENT_TASK solamente mediante:
   AUTHORIZED → IN_PROGRESS → DONE_PENDING_REVIEW
   o STOPPED / BLOCKED si corresponde.

3. Ejecutar git diff --check.

4. Confirmar que ningún archivo arquitectónico existente fue modificado.

5. No hacer commit.
6. No hacer push.
7. No crear la siguiente tarea.
8. STOP.