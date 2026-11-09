# Conciliación de compras: PEMEX TEPEJI

- task_id: FIX-COMPRAS-PEMEX-TEPEJI-ALIAS
- outcome: DONE
- base_sha: c98af2c07e433a13c78674322060b9581a544344
- branch: fix/compras-pemex-tepeji-alias
- human_decision_needed: integrar y publicar esta corrección.
- next_task_proposed: ninguna.

## Cambio

El origen PEMEX TEPEJI provocaba UNKNOWN_ORIGIN al leer el detalle de compras.
El usuario indicó «Usar la columna actual de TEPEJI». Se agrega únicamente ese
alias al proveedor canónico TOMZA TEPEJI, manteniendo el texto original para trazabilidad.
No se crea otro proveedor ni se amplía el reconocimiento a nombres aproximados.

## Validación

- 49 pruebas aprobadas en cinco suites de importación y conciliación.
- Regresión con datos sintéticos: seis plantas, incluidas ambas empresas de Acapulco,
  importes y kilos agrupados, reutilización del proveedor existente, facturas e HG
  preservados, aislamiento de la otra empresa y reimportación sin duplicar compras.
- Los nombres desconocidos continúan bloqueando la conciliación.
- Archivo reportado por el usuario comprobado localmente en lectura: reproduce
  UNKNOWN_ORIGIN antes del cambio; después reconoce ambas filas y el total del periodo.
  El archivo privado y sus cifras no se incorporan al repositorio.
- git diff --check sin errores.

Comando:

```text
node --test test/fix-compras-crossplant-reconcile-normalization-088-r5.test.js test/impl-compras-excel-authoritative-import-088.test.js test/impl-compras-excel-reconcile-effective-088-r4.test.js test/fix-compras-excel-authoritative-import-088-r1.test.js test/fix-compras-excel-authoritative-import-088-r2.test.js
```

## Alcance y revisión

- Archivos tocados: lib/compras-dashboard.js, test/fix-compras-crossplant-reconcile-normalization-088-r5.test.js, CURRENT_TASK y este reporte.
- No tocados: frontend, esquema, fórmulas financieras, HG, datos productivos y contratos.
- Contratos consultados: Constitución, índice de arquitectura, LOOP_PROTOCOL y reglas de reportes.
- Contratos modificados: ninguno.
- Ambigüedad resuelta por el usuario: PEMEX TEPEJI utiliza la columna existente de TEPEJI.
- Desvíos: ninguno. Autorización registrada por chat según la preferencia expresa vigente.
- secrets_check: no se agregan credenciales, archivos privados ni datos productivos.
- Publicación pendiente; no se aplicó ninguna conciliación productiva.

## Autorización de publicación · 2026-11-09

El usuario respondió «adelante a produccion» a integrar y publicar la PR #179.
Se autoriza Squash and merge y verificación del despliegue. El código y las
pruebas permanecen idénticos a la revisión validada; solo se registra esta decisión.
