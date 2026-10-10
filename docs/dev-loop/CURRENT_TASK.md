task_id: "CHANGE-IGF-DIARIO-CUTOFF-REAL-SALES-PRECEDENCE-072"

title: "Cambiar precedencia de venta en día de corte: real antes que pronóstico"

status: "DONE_PENDING_REVIEW"

human_authorization: "AUTHORIZED_BY_HUMAN: Luis Rogelio Zaragoza Álvarez 2026-10-09"

main_reference_sha: "ad8a8ba8e00557993a8da62f735f9fe6ee020ada"

branch: "change/igf-diario-cutoff-real-sales-precedence-072"

supersedes_contract:
  task: "054-R2"
  scope: >
    Modificar exclusivamente la precedencia de venta Casa/Comisionista
    en la FECHA DE CORTE. No eliminar ni reescribir otros contratos de 054-R2.

objective: >
  Unificar el tratamiento de la fecha de corte para que una venta real
  capturada en Casa o Comisionista no sea descartada únicamente porque
  fecha >= corte. En la fecha exacta de corte, cada canal debe conservar
  su captura real válida cuando exista y utilizar pronóstico únicamente
  cuando esa captura falte. Después del corte permanece la lógica
  proyectada vigente.

root_cause_confirmed:
  - >
    Provincia Venta Diaria total planta considera la fecha de corte todavía
    como real y el primer día proyectado es el día siguiente.
  - >
    Casa/Comisionista pasan por resolveCanalTon y actualmente fecha >= corte
    entra a la rama proyectada.
  - >
    Esto puede descartar una captura existente exactamente en la fecha de corte.
  - >
    Venta KG exige Casa y Comisionista numéricos.
  - >
    Si un canal no tiene pronóstico para la fecha de corte, Venta KG termina
    null aunque exista venta real visible en Provincia Venta Diaria.
  - "isSunday no es la causa."
  - "069-R1 no es la causa."
  - "RESUMEN no es la causa."

new_business_contract:
  before_cutoff:
    rule: "Conservar comportamiento real vigente."

  on_cutoff:
    rule: >
      Resolver cada canal Casa/Comisionista con precedencia:
      captura real válida -> pronóstico válido -> null.

  after_cutoff:
    rule: >
      Mantener comportamiento proyectado vigente.
      No introducir fallback general a captura real después del corte.

important_per_channel_rule:
  - "La precedencia debe resolverse por canal, no únicamente sobre el total de planta."
  - >
    En fecha de corte, si Casa tiene captura real y Comisionista no,
    Casa conserva su real y Comisionista puede usar su pronóstico válido.
  - >
    Si ambos tienen captura real válida, ambos conservan real.
  - >
    Si ninguno tiene captura y ambos tienen pronóstico, ambos usan pronóstico.
  - >
    Si después de resolver los canales alguno continúa no numérico,
    Venta KG conserva el contrato existente y queda null.
  - "No convertir canal faltante en cero."

real_value_semantics:
  - "Determinar 'captura real válida' usando exactamente la semántica existente de la fuente."
  - "No asumir que 0 equivale a missing."
  - >
    Si el contrato existente considera 0 una captura real explícita,
    preservarlo como real.
  - >
    Si la fuente distingue null/missing de 0, mantener esa distinción.

san_luis_acceptance:
  plant: "San Luis"
  cutoff: "2026-10-04"
  source_total_provincia_tons: 2.000
  expected_behavior: >
    Las capturas reales de Casa/Comisionista que originan esas 2.000 t
    deben conservarse en la fecha de corte en vez de ser descartadas
    por la rama forecast.
  expected_igf_venta_kg: 2000
  expected_weekly_inclusion: true

not_sunday_specific:
  - "La misma regla aplica lunes, martes, miércoles, jueves, viernes, sábado o domingo."
  - "No agregar condición isSunday."
  - "No hardcodear 04/10/2026."
  - "No hardcodear San Luis."

weekly_effect:
  - >
    Una vez corregido Venta KG en la fuente, RESUMEN semanal debe incorporar
    naturalmente el día mediante los agregadores existentes.
  - "No modificar RESUMEN para forzar el dato."
  - "No modificar 069-R1 para conseguir el resultado."

required_acceptance_matrix:
  - "Antes del corte + real -> real."
  - "Fecha de corte + ambos canales reales -> reales."
  - "Fecha de corte + Casa real + Comisionista forecast -> combinación resuelta por canal."
  - "Fecha de corte + Casa forecast + Comisionista real -> combinación resuelta por canal."
  - "Fecha de corte + sin real + ambos forecast -> forecast."
  - "Fecha de corte + canal sin real ni forecast -> ese canal null; Venta KG respeta contrato existente."
  - "Después del corte + real histórico/capturado + forecast -> comportamiento forecast vigente."
  - "Después del corte no debe comenzar a preferir real por efecto colateral."
  - "Domingo de corte con real -> real."
  - "Domingo de corte sin real pero forecast -> forecast."
  - "Domingo de corte sin real ni forecast -> null."
  - "Día de corte con 0 real explícito -> respetar semántica existente de 0."

san_luis_regression:
  - "San Luis 01/10 permanece correcto."
  - "San Luis 02/10 permanece correcto."
  - "San Luis 03/10 permanece correcto."
  - "San Luis 04/10 cambia de null a 2,000 kg si el fixture reproduce las capturas reales observadas."
  - >
    Semana 41 incorpora los 2,000 kg y recalcula Ingreso y ponderados
    mediante la lógica existente, sin hardcodear totales.

scope_protection:
  - "No modificar fuente de Provincia Venta Diaria."
  - "No modificar fórmula financiera de Ingreso."
  - "No modificar Precio."
  - "No modificar Compras."
  - "No modificar Costo/Flete."
  - "No modificar DESCUENTOS 070/070-R1."
  - "No modificar RESUMEN SEMANAL 069."
  - "No modificar gráfica."
  - "No modificar DB schema."
  - "No modificar días posteriores al corte salvo lo necesario para demostrar que permanecen iguales."

tests_required:
  - "Fixture San Luis 04/10/2026."
  - "Día de corte ambos canales reales."
  - "Día de corte real/forecast."
  - "Día de corte forecast/real."
  - "Día de corte ambos forecast."
  - "Día de corte canal irresoluble -> Venta KG null según contrato."
  - "Día antes del corte sin regresión."
  - "Día después del corte sin regresión."
  - "Domingo no recibe tratamiento especial."
  - "0 explícito probado según contrato existente."
  - "null permanece null cuando corresponde."
  - "Semana con domingo real incluye el día."
  - "Semana con domingo realmente null conserva protección 069-R1."
  - "Export individual correcto."
  - "Export Todas sin regresión."
  - "070/070-R1 sin regresión."
  - "Regresiones 054-R2 actualizadas exclusivamente donde el contrato cambió."
  - "Regresiones 069–070-R1 PASS."
  - "node --check server.js PASS."
  - "frontend build si corresponde."
  - "git diff --check PASS."

documentation_requirement:
  - >
    Las pruebas/documentación de 054-R2 que afirmaban que en fecha de corte
    siempre se usa forecast deben actualizarse explícitamente para registrar
    que ese contrato fue sustituido por 072.
  - >
    No borrar silenciosamente la evidencia histórica de 054-R2.
    Documentar el superseding contract.

report:
  path: "docs/dev-loop/reports/CHANGE-IGF-DIARIO-CUTOFF-REAL-SALES-PRECEDENCE-072.md"

  must_include:
    - "Contrato anterior 054-R2."
    - "Motivo del cambio."
    - "Contrato nuevo 072."
    - "Causa raíz descubierta durante 071."
    - "Ruta Provincia Venta Diaria vs resolveCanalTon."
    - "Precedencia por canal."
    - "Tratamiento de 0/null."
    - "Caso San Luis 04/10."
    - "Antes/después."
    - "Efecto Semana 41."
    - "Protección de días posteriores al corte."
    - "Pruebas actualizadas de 054-R2."
    - "Regresiones."
    - "SHA producto."
    - "SHA final."

stop_conditions:
  - "Si origin/main != ad8a8ba8e00557993a8da62f735f9fe6ee020ada, STOP."
  - "Si la evidencia demuestra que Casa/Comisionista no tienen captura real válida el 04/10, STOP antes de fabricar 2,000 kg."
  - "Si el total 2.000 t no puede reconciliarse con los canales fuente, STOP y documentar."
  - "Si la solución requiere hardcodear fecha/planta/domingo, STOP."
  - "Si cambia la precedencia después del corte, STOP."
  - "Si requiere DB schema, STOP."
  - "No merge."
  - "No deploy."

completion:
  status: "DONE_PENDING_REVIEW"
  commit: true
  push_branch_only: true
  merge: false
  deploy: false