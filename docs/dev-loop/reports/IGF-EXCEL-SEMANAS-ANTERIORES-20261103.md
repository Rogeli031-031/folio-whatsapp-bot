# Excel IGF: semanas de meses anteriores

Petición directa del usuario: imprimir/descargar semanas anteriores desde el selector marcado en Gráfica · Rentabilidad IGF Diario. Continúa el flujo de integración y publicación autorizado en el chat. No se modifican CURRENT_TASK ni aprobaciones.

Base: dc9692ef1a69b5fae81006e0cf8fca4dd4dc7d0b. Rama: fix/igf-excel-semanas-meses-anteriores.

El selector antes generaba solamente las semanas del mes abierto. Se añade Mes de la semana (desde 2000 hasta el mes de contexto); al elegir otro mes se reconstruyen sus semanas domingo-sábado con estado REAL/PARCIAL/PROYECTADA respecto del corte original. Se admite cruce de año. La selección efectiva se valida contra la lista actual antes de descargar, para evitar reutilizar por una carrera una semana del mes anterior. Se aclara que la hoja RESUMEN corresponde a la semana elegida. Las demás hojas siguen el contexto mensual original del exportador.

Se preservan planta/TODAS, corte, versión, métrica y carga de la gráfica. El endpoint ya admite week_anchor fuera del mes y materializa los meses tocados por la semana; no requiere cambios. No se modifican datos, fórmulas, permisos ni presupuestos. La cabecera se acomoda en flujo para evitar superponer el nombre de la planta con los controles adicionales.

Validación: 15 pruebas relacionadas correctas, incluyendo selección interactiva con el componente real, descarga inmediata tras cambiar mes, semanas 40–44 desde noviembre, años previos, rechazo de mes vacío/futuro y RESUMEN Excel histórico/parcial/proyectado. Compilación de producción/TypeScript verificada antes de publicar. Artefactos .next excluidos. Verificación Render/navegador se registra en el PR. Sin secretos ni cambios ajenos.
