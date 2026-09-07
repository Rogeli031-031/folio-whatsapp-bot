task_id: AUDIT-DIRECTOR-IA-FOLIO-SEARCH-CONCEPT-MORPHOLOGY-001

task_type: AUDIT
mode: READ_ONLY_PHYSICAL_TRACE

status: DONE_PENDING_REVIEW
authorized_by: "Human Approver"
authorized_at: "2026-09-07T10:56:01-06:00"
human_authorization: "AUTHORIZED_BY_HUMAN: Human Approver 2026-09-07 - READ_ONLY FOLIO CONCEPT FRAME/MORPHOLOGY AUDIT; NO IMPLEMENTATION; NO LIVE_DB; NO MERGE; NO DEPLOY"

implementation_authorized: NO
merge_authorized: NO
deploy_authorized: NO
live_db_authorized: NO

max_attempts: 1

base_main_sha: 46d0e5185c55bc295819399f49e0cea7578b1938

result_report_path: docs/dev-loop/reports/AUDIT-DIRECTOR-IA-FOLIO-SEARCH-CONCEPT-MORPHOLOGY-001.md

objective: Determinar la regla lingüística mínima y segura para corregir conjuntamente FRAME OVER-CAPTURE y MORPHOLOGICAL VARIANT MATCH en folio_search, sin tocar periodo, SQL, scope ni fuentes.

## Hallazgos ya demostrados

NO reauditar periodo.

CURRENT TURN EXPLICIT MONTH WINS LOCALLY = YES.

Boundary 1:

CONCEPT_SPAN_OVER_CAPTURE

"qué apoyos de julio fueron de llantas?"
→ concept_query = "fueron de llantas"

Boundary 2:

MORPHOLOGICAL_VARIANT_MATCH_MISSING

Después de corregir el frame:

"llantas"

todavía NO coincide con una fila física:

"LLANTA"

Matcher actual:

concepto.includes(needle) || sub.includes(needle)

## Objetivo

Encontrar un algoritmo genérico mínimo que:

1. quite únicamente el marco gramatical previo al concepto;
2. preserve preposiciones internas;
3. soporte variantes singular/plural españolas comunes;
4. evite stemming destructivo;
5. no use catálogo empresarial.

## Casos obligatorios

A.
"qué apoyos de julio fueron de llantas?"
concepto esperado: llantas
candidate: LLANTA

B.
"qué apoyos de agosto fueron de aceite de motor?"
concepto esperado: aceite de motor
NO: aceite motor

C.
"qué apoyos fueron de bombas?"
candidate: BOMBA

D.
"qué apoyos fueron de bomba?"
candidate: BOMBAS

E.
"qué apoyos fueron de motores?"
candidate: MOTOR

F.
"qué apoyos fueron de motor?"
candidate: MOTORES

G.
"qué apoyos fueron de luces?"
candidate: LUZ

H.
"qué apoyos fueron de gas?"
candidate: GAS

PROHIBIDO gas → ga.

I.
"qué apoyos fueron de parabrisas?"
candidate: PARABRISAS

J.
"qué apoyos fueron de filtros de aire?"
concepto esperado: filtros de aire
candidate: FILTRO DE AIRE

Debe conservar el "de" interno.

## FRAME

Evaluar marco cerrado genérico como:

fueron de
son de
eran de
relacionados con
relacionadas con

sin vocabulario de negocio.

## MORPHOLOGY

Evaluar:

- substring actual;
- token-level comparison;
- variantes singular/plural controladas;
- helpers existentes en repo;
- librerías ya existentes, si las hay.

NO dependencia nueva.

NO strip-final-s global.

Cubrir:

vocal + s
llanta ↔ llantas

consonante + es
motor ↔ motores

z ↔ ces
luz ↔ luces

y proteger:

gas
parabrisas
analisis
mes

## Multiword

Preservar:

aceite de motor
filtro de aire
bomba de agua

No convertir indiscriminadamente a bag-of-words si crea falsos positivos.

## Fuente

Mantener únicamente:

row.concepto
row.subcategoria

NO SQL.
NO fuente nueva.

## Clasificación

FRAME_CLASSIFICATION:
A CLOSED_RELATIONAL_FRAME_SUFFICIENT
B TOKEN_STOPWORD_MODEL_REQUIRED
C OTHER

MORPHOLOGY_CLASSIFICATION:
A CONTROLLED_TOKEN_VARIANTS_SUFFICIENT
B EXISTING_HELPER_REUSABLE
C STEMMING_REQUIRED
D PHRASE_MATCH_REDIRECTION_REQUIRED
E OTHER

## Decisión

ONE_FIX_CAN_SAFELY_HANDLE_FRAME_AND_MORPHOLOGY:
YES / NO

## Reporte obligatorio

FRAME_CLASSIFICATION:
FRAME_FIRST_BAD_BOUNDARY:
MORPHOLOGY_CLASSIFICATION:
MORPHOLOGY_FIRST_BAD_BOUNDARY:
EXISTING_HELPER_REUSABLE:
SAFE_FRAME_STRATEGY:
SAFE_MORPHOLOGY_STRATEGY:
MULTIWORD_PREPOSITION_PRESERVED:
LLANTAS_LLANTA:
MOTORES_MOTOR:
LUCES_LUZ:
GAS_SAFE:
PARABRISAS_SAFE:
ACEITE_DE_MOTOR_SAFE:
ONE_FIX_CAN_SAFELY_HANDLE_FRAME_AND_MORPHOLOGY:
FIX CONTRACT:
FILES FUTUROS:

Incluir matriz A-J.

## Prohibido

NO implementación.
NO SQL.
NO DB/schema.
NO LIVE_DB.
NO frontend.
NO cambios de periodo.
NO concept catalog.
NO regex de llantas.
NO naive strip-final-s.
NO dependencia nueva.
NO merge.
NO push main.
NO deploy.
NO next task.

## Completion

CURRENT_TASK → DONE_PENDING_REVIEW

STOP.
