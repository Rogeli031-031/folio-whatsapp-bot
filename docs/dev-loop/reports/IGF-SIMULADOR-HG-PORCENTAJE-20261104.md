# HG como porcentaje de la venta y kilos generados

Corrección solicitada directamente por el usuario: HG se edita como porcentaje de kilos de venta, no como importe por kilo. Continúa el flujo de integración/publicación autorizado en este chat. No se modifican CURRENT_TASK ni aprobaciones.

Base: f4a63d60f5d2c97b02e7f514ac4d4fd0ed0144bb. Rama: fix/igf-simulador-hg-porcentaje.

Campo HG (% de venta) en escenario y propuestas. Kilos de HG = toneladas simuladas * 1000 * porcentaje/100. HG positivo representa generación y aumenta utilidad; negativo representa pérdida. El importe se obtiene multiplicando kilos HG por valoración HG; IGF Diario usa hgDollar (costo gas + flete), o se recupera del cociente HG monetario / porcentaje cuando la fuente Forecast ofrece esos dos datos. El mini de Forecast expone esos supuestos ya existentes. Si no hay valoración o HG conocidos, no se inventa la conversión.

Internamente el costo HG equivalente es -porcentaje/100 * valoración, y se conserva el modelo calibrado al resultado original. El estado inicial/restaurado usa exactamente la base sin redondear el resultado. Venta o porcentaje nuevos cambian kilos, importe, resultado, superficie y equilibrio. Histórico y tendencia real conservan sus cifras.

Propuestas guarda hg_pct como fracción decimal (7% = 0.07), hg_price_kg y costo equivalente hg_kg en JSONB existente; valida finitud/rangos/consistencia. Compatible con propuestas anteriores, cuyo resultado original permanece intacto. El usuario solo edita porcentaje. No cambia presupuestos, capturas ni HG reales.

Validación: 31 pruebas relacionadas correctas, compilación producción/TypeScript y sintaxis servidor. Incluye 1000 t con 7% = 70000 kg, valoración proporcional y sensibilidad a volumen, signos, cero, datos ausentes, paridad de base, restauración, persistencia y conversión consistente. Despliegue/navegador se registran en el PR. Artefactos .next excluidos; sin secretos ni cambios ajenos.
