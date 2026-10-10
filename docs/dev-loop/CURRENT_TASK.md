task_id: "DEPLOY-CHANGE-IGF-DIARIO-CUTOFF-REAL-SALES-PRECEDENCE-072"

title: "Desplegar CHANGE 072 a producción"

status: "DEPLOYED_PENDING_PRODUCTION_VALIDATION"

human_authorization: "AUTHORIZED_FOR_PRODUCTION_BY_HUMAN: Luis Rogelio Zaragoza Álvarez"

authorized_main_sha: "5de98adc664185351afe0c69e29222903ba2b47e"

pr: 119

deployment_authorization:
  deploy: true
  authorized_sha_only: "5de98adc664185351afe0c69e29222903ba2b47e"
  additional_code_changes: false
  database_changes: false

pre_deploy_requirements:
  - "git fetch origin"
  - "origin/main debe ser exactamente authorized_main_sha"
  - "working tree limpio"
  - "PR #119 merged = true"
  - "No crear commits funcionales"
  - "No modificar tests"
  - "No modificar configuración de producción"
  - "No ejecutar migraciones DB"
  - "Si main avanzó respecto al SHA autorizado, STOP"

deploy:
  source: "main"
  sha: "5de98adc664185351afe0c69e29222903ba2b47e"
  environment: "production"

post_deploy_validation:
  - "Confirmar deploy exitoso"
  - "Confirmar SHA/revisión desplegada"
  - "Confirmar aplicación saludable"
  - "Revisar logs de arranque"
  - "Revisar errores/excepciones posteriores al deploy"
  - "Smoke test IGF Diario"
  - "Validar contrato de fecha de corte"
  - "Validar que días posteriores continúan usando forecast"
  - "No alterar datos productivos para fabricar una prueba"

production_contract:
  - "fecha < corte: comportamiento anterior"
  - "fecha == corte: por canal real válido -> forecast válido -> null"
  - "fecha > corte: forecast continúa prevaleciendo"
  - "0 explícito es captura válida en fecha de corte"

stop_conditions:
  - "origin/main != authorized_main_sha"
  - "El proveedor intenta desplegar un SHA diferente"
  - "Build falla"
  - "Startup falla"
  - "Health check falla"
  - "Aparecen errores nuevos atribuibles a 072"
  - "Se requiere modificar código para completar deploy"
  - "Se requiere migración DB no autorizada"

completion:
  success_status: "DEPLOYED_PENDING_PRODUCTION_VALIDATION"
  failure_status: "STOPPED_DEPLOY_FAILURE"