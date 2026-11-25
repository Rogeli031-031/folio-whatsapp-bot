# IGF-TALLER-XLSX-VALORES

- outcome: DONE
- files_touched: `lib/igf-acapulco-taller-xlsx.js`, `test/igf-acapulco-taller-xlsx.test.js`, `docs/dev-loop/CURRENT_TASK.md` (registro de rama), este reporte.
- files_not_touched: interfaz, rutas HTTP, configuración, roles, SQL, datos y despliegues.
- contracts_consulted: `docs/director-ia/DIRECTOR_IA_CONSTITUTION.md`, `docs/director-ia/DIRECTOR_IA_ARCHITECTURE_INDEX.md`, `docs/dev-loop/LOOP_PROTOCOL.md`.
- contracts_modified: []
- ambiguities_or_contradictions: []
- deviations_from_current_task: []
- next_task_proposed: ""
- secrets_check: none
- human_decision_needed: revisar el cambio antes de integrar. El registro CURRENT_TASK de esta rama no debe sustituir el G6 integrado.

Validado con el importador y su vista previa local: siete pruebas E9/E10, incluida lectura del cero guardado, fórmulas compartidas, títulos combinados, rechazo de caché ausente/error/tipo incorrecto, claves estructurales literales, vínculos externos y ausencia de escritura en vista previa. La vista previa local aceptó también el Excel original de Uribe remitido por el propietario sin modificarlo. No se incluyeron archivos ni datos de producción en Git. HidroGas se probó con plantilla sintética, no con su archivo real. No se probó contra producción.

Sólo se leen resultados escalares guardados de marca, modelo, capacidad, costo y apoyo en renglones de pipas verificados. No se ejecutan fórmulas ni se cambia la defensa de archivo o controles de permisos. Se evita repetir las etiquetas ancla de celdas combinadas al leer sus descendientes.

G1 por chat verificado: `verified_owner_chat`, 2026-11-25T02:06:06.295253+00:00, recibo `0dbd40a3-bebe-4432-95f8-db12f0102d0f`, SHA-256 `e7f3f8d9cc94d2259f2214965ce1d0cb790d220b206852136c87ccfe837d66b9`.
