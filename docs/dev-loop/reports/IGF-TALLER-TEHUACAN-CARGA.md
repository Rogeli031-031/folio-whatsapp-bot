# IGF-TALLER-TEHUACAN-CARGA

Resultado: DONE_PENDING_REVIEW. Alcance y autorización humana registrados por Git en CURRENT_TASK. Base reconciliada con main después del #194.

- Agrega carga del reporte E8 de Tehuacán en IGF Diario acumulado, con confirmación explícita de la fecha real si difiere del encabezado. El archivo original no se modifica ni se publica.
- Conserva advertencias, historial por revisión, importes ausentes y salida estimada separada de la efectiva. La vista previa no escribe; la confirmación de los mismos datos no duplica filas.
- La migración se probó en PostgreSQL aislado; no se ejecutó en producción. La lista de operadores queda vacía; no se habilitaron cuentas. Sin cambios a otras plantas, ventas, compras, HG, folios ni exportación de productividad.

Verificación sobre la base actual: 43 pruebas pasaron, 2 pruebas opcionales de muestras de otras plantas se omitieron, y la muestra original privada E8 produjo seis unidades y mantuvo visible la discrepancia de fecha. Se verificó sintaxis de backend y diff sin espacios indebidos. En la preparación previa también se verificó el flujo de vista previa y confirmación con el E8 en navegador local (móvil y escritorio) y una base aislada. No se fusionó ni se desplegó.
