# Periodos IGF: fuente explícita y recuperación de capturas históricas

Solicitud del usuario: elegir IGF Forecast o IGF Diario acumulado en la tabla mensual y corregir blancos de octubre pese a existir capturas diarias. Continúa el flujo de integración y publicación autorizado en el chat; no se modifican CURRENT_TASK ni campos de aprobación.

Base: 399f9c71eb2d43c1dca7c35c9b8af0965af9add7. Rama: fix/igf-periodos-fuente-datos-diarios.

Causa reproducida: materializePlantMonth usaba corte vacío para meses cerrados y pasaba null como cutoffDay al resolver de canales. Number(null)=0 hacía que fechas capturadas se trataran como posteriores al corte, devolviendo cero; la columna vacía activaba el respaldo de Forecast. Ahora se pasa undefined al no existir corte por día, preservando capturas reales y la lógica vigente con fecha de corte.

La tabla Por mes ofrece Fuente del resultado: IGF Diario acumulado (predeterminada, sin reemplazo por Forecast) o IGF Forecast (solo snapshot mensual cargado, respetando Versión ≤ corte). Las dos opciones no mezclan sus datos. Forecast presenta únicamente conceptos disponibles y marca versión/ausencia; no inventa precio, costo, flete ni desglose de nómina. Semanas conserva fuente diaria: no se distribuye una foto mensual para fabricar semanas.

El endpoint conserva permisos y alcance de plantas. Valida source antes de consultar; llamadas existentes sin source conservan comportamiento auto compatible. La fuente Forecast reutiliza una lectura de versión por mes entre plantas y no consulta hechos diarios. No hay escrituras financieras, migraciones, cambios de presupuesto ni contratos Director IA.

Validación: 58 pruebas relacionadas pasan (12 de periodos/fallback/fuente, 1 UI y 45 de corte, simulador y refresco). Compilación de producción/TypeScript y sintaxis de server.js correctas. La regresión usa el materializador real y comprueba capturas de octubre, ponderación e ingreso, separación de fuentes y corte de versión. Despliegue y validación de navegador se registran en el PR. Artefactos .next excluidos; sin secretos ni cambios ajenos.
