# Plan al cierre · Total del pronóstico en Categorías
task_id: FIX-IGF-CATEGORIAS-TOTAL-PRONOSTICO
status: AUTHORIZED
authorized_by: HUMAN_APPROVER
human_authorization: "Sí, corrígelo y publícalo"
authorization_channel: "Continuación de la corrección autorizada del descuento del tablero. El usuario señala el total de Categorías y aclara que el pronóstico sin plan es la base."
base_sha: 90cb1ec63a010b44f60a20f0f83483996c73b43d
branch: fix/igf-categorias-total-pronostico
objective: "Conciliar el total base y del plan de la hoja Categorías con el IGF para el mismo corte y selección."
in_scope: "Exportador de Plan al cierre, pruebas y verificación de la descarga. Identificar la diferencia entre el desglose por compradores y el pronóstico."
out_of_scope: "Cambios a descuentos de cuentas, al cálculo de rentabilidad, a los datos productivos o a los puntos guardados."
contracts_in_force: "Constitución, índice de arquitectura y protocolo de desarrollo supervisado."
allowed_actions: "Implementar, probar, integrar y verificar la publicación de la corrección autorizada."
acceptance: "Sin propuestas el descuento de cierre es el de la base. Con selección, kilos, importe y tasa de cierre coinciden con la hoja IGF. Preservar los descuentos identificados en cada categoría y mostrar por separado la diferencia."
result_report_path: docs/dev-loop/reports/FIX-IGF-CATEGORIAS-TOTAL-PRONOSTICO.md
max_attempts: 1
