"use strict";

const FAMILY_IDS = Object.freeze([
  "SALES_STATUS",
  "PLANT_DIAGNOSIS_CURRENT",
  "PERIOD_COMPARISON_EXPLICIT",
  "SAME_PERIOD_PREVIOUS_MONTH",
  "SALES_TODAY_WEEK_MONTH",
  "LOW_SALES_CARBURATION",
  "SALES_TREND_TO_CLOSE",
  "ACTIVE_CLIENT_ENTITY_INHERITANCE",
  "KEYWORD_EXPENSE",
]);

function unique(list) {
  return Object.freeze([...new Set(list.filter(Boolean))]);
}

function padFamily(base, extras) {
  const out = [...base];
  let i = 0;
  while (out.length < 50 && i < extras.length) {
    out.push(extras[i]);
    i += 1;
  }
  if (out.length < 50) {
    throw new Error(`family needs 50, got ${out.length}`);
  }
  return unique(out).slice(0, 50);
}

const SALES_STATUS = padFamily(
  [
    "¿Cómo va la venta?",
    "¿Cómo van las ventas?",
    "¿Cómo estamos vendiendo?",
    "¿Cómo vamos de venta?",
    "¿Cómo está la venta?",
    "¿Cómo viene la venta?",
    "¿Cuánto llevamos vendido?",
    "¿Cómo marcha la venta?",
    "¿Cómo pinta la venta?",
    "¿Qué tal vamos en ventas?",
    "Dame el estado de ventas.",
    "Dame un resumen de ventas.",
    "¿Cómo va el volumen vendido?",
    "¿Cómo llevamos el mes?",
    "¿Qué está pasando con la venta?",
  ],
  [
    "¿Cómo va la venta de la planta?",
    "¿Cómo van las ventas de la planta?",
    "Estado de la venta.",
    "Lectura de ventas.",
    "¿Cómo va el volumen?",
    "Resumen de ventas actual.",
    "¿Cómo estamos de venta?",
    "¿Cómo se ve la venta?",
    "¿Cómo andamos de ventas?",
    "Dime el estado de la venta.",
    "¿Cómo va vendiendo la planta?",
    "¿Qué tal la venta?",
    "¿Cómo vamos vendiendo?",
    "Venta actual de la planta.",
    "¿Cómo viene el volumen vendido?",
    "Estado comercial de ventas.",
    "¿Cómo pinta el mes de venta?",
    "¿Cómo marcha el volumen?",
    "Dame lectura de venta.",
    "¿Cómo está el volumen vendido?",
    "¿Cómo vamos en venta?",
    "¿Cómo va la venta observada?",
    "¿Cómo se ve el volumen?",
    "Panorama de ventas.",
    "¿Qué tal está la venta?",
    "¿Cómo andamos vendiendo?",
    "Dime cómo va la venta.",
    "¿Cómo está yendo la venta?",
    "¿Cómo venimos de venta?",
    "¿Cómo va la venta al corte?",
    "Estado de ventas al corte.",
    "¿Cómo vamos al corte de venta?",
    "Resumen ejecutivo de ventas.",
    "¿Cómo pinta la venta al corte?",
    "¿Cómo está la venta observada?",
  ]
);

const PLANT_DIAGNOSIS_CURRENT = padFamily(
  [
    "Diagnóstico de la planta actual.",
    "Dame un diagnóstico de la planta.",
    "¿Cómo está la planta?",
    "¿Cómo vamos en la planta?",
    "Dame el diagnóstico actual.",
    "¿Cuál es la situación actual?",
    "¿Cómo está funcionando la planta?",
    "Dame una lectura ejecutiva.",
    "Dame el panorama de la planta.",
    "¿Cómo estamos en general?",
    "¿Qué riesgos tenemos?",
    "¿Qué desviaciones tenemos?",
    "¿Qué debería revisar?",
    "Dame el resumen ejecutivo.",
    "¿Cómo está esta planta?",
  ],
  [
    "diagnostico de la planta actual",
    "Diagnóstico de planta.",
    "Dame diagnóstico de esta planta.",
    "¿Cómo está la planta actual?",
    "Situación actual de la planta.",
    "Panorama actual.",
    "Lectura ejecutiva de la planta.",
    "Resumen ejecutivo de la planta.",
    "¿Cómo funciona la planta?",
    "¿Cómo andamos en la planta?",
    "Diagnóstico actual.",
    "¿Cuál es el panorama?",
    "¿Qué riesgos veo en la planta?",
    "¿Qué desviaciones hay?",
    "¿Qué debo revisar hoy?",
    "Estado general de la planta.",
    "¿Cómo se ve la planta?",
    "Dame el diagnóstico de planta.",
    "¿Cómo estamos en esta planta?",
    "Situación de la planta.",
    "Diagnóstico ejecutivo.",
    "¿Cómo va la planta?",
    "¿Cómo está operando la planta?",
    "Panorama ejecutivo.",
    "¿Qué debería revisar en la planta?",
    "Lectura de la planta actual.",
    "¿Cómo estamos operando?",
    "Diagnóstico de la planta.",
    "Dame situación actual.",
    "¿Cómo está el panorama de la planta?",
    "¿Qué riesgos tiene la planta?",
    "¿Hay desviaciones en la planta?",
    "Resumen de la planta actual.",
    "¿Cómo se encuentra la planta?",
    "Diagnóstico general.",
  ]
);

const PERIOD_COMPARISON_EXPLICIT = padFamily(
  [
    "¿Cómo va septiembre contra octubre?",
    "septiembre vs octubre",
    "octubre respecto de septiembre",
    "septiembre frente a octubre",
    "entre septiembre y octubre",
  ],
  [
    "¿Cómo vamos septiembre contra octubre?",
    "Compara septiembre contra octubre.",
    "Septiembre versus octubre.",
    "¿Qué diferencia hay entre septiembre y octubre?",
    "Octubre contra septiembre.",
    "¿Cómo va octubre vs septiembre?",
    "Septiembre frente octubre.",
    "Comparación septiembre octubre.",
    "¿Cómo quedó septiembre contra octubre?",
    "Delta septiembre vs octubre.",
    "¿Cómo se ve septiembre respecto de octubre?",
    "Octubre frente a septiembre.",
    "¿Cómo va agosto contra septiembre?",
    "julio vs agosto",
    "agosto respecto de julio",
    "junio frente a julio",
    "entre agosto y septiembre",
    "¿Cómo va mayo contra junio?",
    "abril vs mayo",
    "marzo respecto de abril",
    "febrero frente a marzo",
    "entre enero y febrero",
    "¿Cómo va octubre contra noviembre?",
    "noviembre vs octubre",
    "diciembre respecto de noviembre",
    "septiembre vs agosto",
    "Compara octubre y septiembre.",
    "¿Cuál es el delta de septiembre a octubre?",
    "Variación septiembre-octubre.",
    "¿Cómo comparas septiembre y octubre?",
    "Septiembre comparado con octubre.",
    "Octubre comparado con septiembre.",
    "¿Cómo viene octubre contra septiembre?",
    "Diferencia entre agosto y septiembre.",
    "¿Cómo va septiembre versus octubre?",
    "septiembre contra octubre en toneladas",
    "octubre vs septiembre en %",
    "Compara septiembre frente a octubre.",
    "¿Cómo se mueve septiembre contra octubre?",
    "Lectura septiembre vs octubre.",
    "¿Cómo quedó octubre respecto de septiembre?",
    "septiembre / octubre",
    "¿Septiembre o octubre va mejor?",
    "Contraste septiembre octubre.",
    "septiembre contra octubre observado",
  ]
);

const SAME_PERIOD_PREVIOUS_MONTH = padFamily(
  [
    "¿Cómo vamos contra el mismo periodo del mes anterior?",
    "¿Cómo vamos contra el mismo corte del mes anterior?",
    "Mismo periodo del mes pasado.",
    "Compara el MTD contra el mes anterior.",
    "¿Cómo vamos vs el mismo periodo anterior?",
  ],
  [
    "Mismo corte mes anterior.",
    "Contra el mismo periodo del mes pasado.",
    "¿Cómo vamos al mismo corte del mes anterior?",
    "Comparación mismo periodo mes anterior.",
    "MTD vs mes anterior.",
    "¿Cómo está el mismo periodo contra el mes anterior?",
    "Mismo número de días del mes anterior.",
    "¿Cómo vamos respecto al mes anterior al mismo corte?",
    "Delta vs mismo periodo anterior.",
    "¿Cómo vamos contra el mes pasado al mismo corte?",
    "Mismo periodo mes previo.",
    "Comparar contra el mes anterior mismo corte.",
    "¿Y contra el mismo periodo del mes anterior?",
    "Mismo tramo del mes anterior.",
    "¿Cómo se ve vs el mes anterior?",
    "Corte actual vs mismo corte previo.",
    "¿Cómo vamos contra el periodo equivalente del mes anterior?",
    "Mismo lapso del mes pasado.",
    "Comparativo mismo periodo anterior.",
    "¿Cómo vamos MTD vs mes anterior?",
    "Mes anterior mismo periodo.",
    "¿Cuál es el delta vs el mes anterior al mismo corte?",
    "Mismo periodo del mes que pasó.",
    "Contra mes anterior mismo número de días.",
    "¿Cómo vamos respecto del mes anterior?",
    "Equivalente del mes anterior.",
    "¿Cómo estamos vs mes anterior mismo corte?",
    "Periodo comparable del mes anterior.",
    "Mismo corte vs mes previo.",
    "¿Cómo va el acumulado vs mes anterior?",
    "Acumulado contra mismo periodo anterior.",
    "¿Cómo vamos contra el mes anterior?",
    "Mismo periodo, mes anterior.",
    "Comparar MTD con mes anterior.",
    "¿Hay mejora vs el mismo periodo del mes anterior?",
    "Mismo intervalo del mes pasado.",
    "Corte vs corte del mes anterior.",
    "¿Cómo vamos en toneladas vs mes anterior mismo corte?",
    "¿Y en porcentaje contra el mes anterior?",
    "Mismo periodo anterior en t.",
    "Delta % mismo corte mes anterior.",
    "¿Cómo vamos al corte vs mes pasado?",
    "Mes anterior, mismo corte físico.",
    "Comparación MTD mes previo.",
    "¿Cómo está el MTD contra el mes anterior?",
  ]
);

const SALES_TODAY_WEEK_MONTH = padFamily(
  [
    "¿Cuánto vendió la planta hoy, esta semana y este mes?",
    "Venta de hoy, de la semana y del mes.",
    "¿Cuánto vendimos hoy, esta semana y este mes?",
    "Hoy, semana y mes de venta.",
    "Dame venta hoy semana y mes.",
  ],
  [
    "¿Cuánto vendió hoy y esta semana y este mes?",
    "Venta hoy / semana / mes.",
    "¿Cuánto lleva hoy, en la semana y en el mes?",
    "Horizontes hoy semana mes.",
    "¿Cuánto se vendió hoy, en la semana y en el mes?",
    "Dime hoy, semana y mes vendidos.",
    "Venta del día, de la semana y del mes.",
    "¿Cuánto vendimos hoy y en la semana y en el mes?",
    "Hoy semana mes en toneladas.",
    "Tres horizontes de venta: hoy, semana, mes.",
    "¿Cuánto vendió la planta hoy y esta semana y este mes?",
    "Lectura hoy-semana-mes.",
    "¿Cuánto va hoy, esta semana y este mes?",
    "Venta acumulada hoy semana mes.",
    "¿Cuánto vendimos este día, esta semana y este mes?",
    "Dame los tres cortes: hoy, semana, mes.",
    "¿Cuánto es la venta de hoy, de la semana y del mes?",
    "Hoy + semana + mes vendido.",
    "¿Cuánto vendió hoy, cuánto en la semana y cuánto en el mes?",
    "Reporte hoy semana mes.",
    "Venta de hoy, semanal y mensual.",
    "¿Cuánto llevamos hoy, esta semana y este mes?",
    "Tres ventanas: hoy, semana, mes.",
    "¿Cuánto vendió la planta en el día, la semana y el mes?",
    "Hoy, esta semana y este mes vendido.",
    "¿Me das venta de hoy, de semana y de mes?",
    "Corte diario, semanal y mensual.",
    "¿Cuánto se ha vendido hoy, esta semana y este mes?",
    "Venta día / semana / mes.",
    "¿Cuánto vendimos en el día, la semana y el mes?",
    "Hoy-semana-mes de la planta.",
    "¿Cuánto vendió hoy, esta semana y el mes?",
    "Tres horizontes comerciales hoy semana mes.",
    "¿Cuánto va de venta hoy, en la semana y en el mes?",
    "Día, semana y mes de venta.",
    "¿Cuánto vendió la planta hoy, en la semana y en el mes actual?",
    "Venta de hoy y de esta semana y de este mes.",
    "¿Cuánto es hoy, cuánto la semana y cuánto el mes?",
    "Hoy semana y mes, en t.",
    "¿Cuánto vendimos hoy, esta semana y el mes en curso?",
    "Lectura de venta hoy, semana y mes.",
    "¿Cuánto vendió hoy, esta semana y este mes la planta?",
    "Tres cortes de venta: hoy, semana, mes.",
    "¿Cuánto llevamos vendido hoy, esta semana y este mes?",
    "Venta hoy, venta semana, venta mes.",
  ]
);

const LOW_SALES_CARBURATION = padFamily(
  [
    "¿Qué estación de carburación tiene baja venta?",
    "¿Cuál estación de carburación vende menos?",
    "Estación de carburación con menor venta.",
    "¿Qué punto de carburación tiene baja venta?",
    "Carburación con venta baja.",
  ],
  [
    "¿Qué estación tiene baja venta de carburación?",
    "Ranking de estaciones de carburación por venta.",
    "¿Cuál es la estación de carburación más baja en venta?",
    "Estaciones de carburación con peor venta.",
    "¿Qué estación de carburación está vendiendo poco?",
    "Baja venta en estaciones de carburación.",
    "¿Cuál estación de carburación cayó en venta?",
    "Punto de carburación con menor volumen.",
    "¿Qué estación de carburación va peor en venta?",
    "Carburación: estación con venta más baja.",
    "¿Hay una estación de carburación con venta baja?",
    "Menor venta por estación de carburación.",
    "¿Qué estación de carburación está débil en venta?",
    "Estación carburación venta menor.",
    "¿Cuál punto de carburación vende menos?",
    "Venta baja por estación de carburación.",
    "¿Qué estación de carburación tiene el peor volumen?",
    "Carburación con caída de venta.",
    "¿Qué estación vende menos en carburación?",
    "Peor estación de carburación por venta.",
    "¿Cuál estación de carburación tiene menor volumen?",
    "Estaciones carburación ranking de venta baja.",
    "¿Qué punto de carburación está bajo en venta?",
    "Venta débil en estación de carburación.",
    "¿Qué estación de carburación perdió venta?",
    "Menor venta estación carburación.",
    "¿Cuál es la estación de carburación con venta más baja?",
    "Carburación baja por estación.",
    "¿Qué estación de carburación no está vendiendo?",
    "Punto de carburación con venta débil.",
    "¿Qué estación de carburación está abajo en venta?",
    "Ranking inferior de carburación por venta.",
    "¿Cuál estación de carburación tiene peor desempeño de venta?",
    "Venta por estación de carburación, la más baja.",
    "¿Qué estación de carburación quedó corta de venta?",
    "Carburación: menor venta observada.",
    "¿Hay estaciones de carburación con venta baja?",
    "Estación de carburación con volumen bajo.",
    "¿Qué estación de carburación muestra baja venta?",
    "Punto de carburación peor venta.",
    "¿Cuál estación de carburación está más baja?",
    "Venta menor en carburación por estación.",
    "¿Qué estación de carburación tiene caída?",
    "Baja venta estación carburación periodo actual.",
    "¿Qué estación de carburación debo revisar por venta?",
  ]
);

const SALES_TREND_TO_CLOSE = padFamily(
  [
    "¿Consideras que va a mejorar la tendencia de venta para finales de mes?",
    "¿Va a mejorar la tendencia de venta hacia el cierre?",
    "Tendencia de venta para finales de mes.",
    "¿Cómo se ve la tendencia hacia el cierre?",
    "¿Mejorará la venta a fin de mes?",
  ],
  [
    "¿La tendencia de venta va a mejorar?",
    "Tendencia hacia el cierre de mes.",
    "¿Cómo pinta la tendencia de venta a finales de mes?",
    "Escenario de tendencia al cierre.",
    "¿Se mejora la tendencia de venta este mes?",
    "Ritmo de venta hacia el cierre.",
    "¿La venta va a mejorar para finales de mes?",
    "Tendencia de cierre de venta.",
    "¿Cómo viene la tendencia para el cierre?",
    "¿Hay señal de mejora de venta a fin de mes?",
    "Proyección de tendencia de venta al cierre.",
    "¿El ritmo actual mejora el cierre?",
    "Tendencia de venta, ¿mejora o no?",
    "¿Cómo cierra la tendencia de venta?",
    "Finales de mes: tendencia de venta.",
    "¿Consideras mejora de tendencia comercial?",
    "Señal de tendencia hacia el cierre.",
    "¿Va a mejorar el ritmo de venta?",
    "Tendencia de venta con el ritmo actual.",
    "¿El forecast indica mejora a fin de mes?",
    "Escenario lineal al cierre de venta.",
    "¿Hay evidencia de que mejore la tendencia?",
    "Tendencia de venta a fin de mes con hechos.",
    "¿Cómo se comporta la tendencia hacia el cierre?",
    "Cierre de mes y tendencia de venta.",
    "¿Mejora la venta según el ritmo reciente?",
    "Tendencia reciente vs cierre.",
    "¿La semana reciente mejora el cierre?",
    "Hecho y escenario de tendencia al cierre.",
    "¿Puede mejorar la venta a finales de mes?",
    "Tendencia de venta, no certeza.",
    "¿Qué escenario hay hacia el cierre?",
    "Ritmo actual y cierre de mes.",
    "¿La tendencia apunta a mejorar?",
    "Cierre: tendencia de venta observada.",
    "¿Cómo evoluciona la tendencia de venta?",
    "Mejora de tendencia para el cierre.",
    "¿El cierre se ve mejor por tendencia?",
    "Tendencia de venta del mes en curso.",
    "¿Hay proyección de mejora al cierre?",
    "Señal reciente de tendencia de venta.",
    "¿Cómo va la tendencia para finales de mes?",
    "Escenario al cierre con ritmo actual.",
    "¿La tendencia de venta sostiene el cierre?",
    "Finales de mes, tendencia comercial.",
  ]
);

const ACTIVE_CLIENT_ENTITY_INHERITANCE = padFamily(
  [
    "¿Cuál fue su última compra?",
    "¿Y su última compra?",
    "¿Cada cuántos días compra?",
    "¿Está atrasada?",
    "¿Cuántos días lleva sin comprar?",
    "¿Y cuándo esperamos que vuelva?",
    "¿Y cuándo vuelve?",
    "¿Y cada cuánto?",
    "su última compra",
    "ese cliente, ¿cuándo vuelve?",
  ],
  [
    "¿Cuál fue la última compra de ese cliente?",
    "¿Y su frecuencia?",
    "¿Está atrasado?",
    "¿Cuántos días lleva?",
    "¿Y cada cuántos días?",
    "este cliente, última compra",
    "el mismo, ¿cuándo vuelve?",
    "la misma, ¿está atrasada?",
    "¿Y cuántos días lleva sin comprar?",
    "¿Cuándo debería haber comprado?",
    "él, ¿cuándo vuelve?",
    "ella, última compra",
    "¿Y su frecuencia histórica?",
    "¿Ese cliente está atrasado?",
    "¿Esta cliente cuándo vuelve?",
    "¿El mismo cada cuántos días?",
    "¿La misma está atrasada?",
    "¿Y cuándo le toca?",
    "su frecuencia",
    "¿cuántos días sin comprar?",
    "¿y la última compra?",
    "¿y si está atrasada?",
    "ese, ¿última compra?",
    "esa, ¿cuándo vuelve?",
    "¿este cliente está atrasado?",
    "¿y cuántos días lleva?",
    "¿y cuándo debería volver?",
    "su ciclo de compra",
    "¿y el expected next?",
    "¿cuándo vuelve ese cliente?",
    "¿cuál fue su fecha de última compra?",
    "¿está atrasada esa cliente?",
    "¿lleva muchos días sin comprar?",
    "¿y su expected next?",
    "sí, su última compra",
    "ok, ¿cada cuánto compra?",
    "entonces, ¿está atrasada?",
    "y la frecuencia de ese cliente",
    "¿cuántos días lleva el mismo?",
    "¿cuándo esperamos que vuelva ese cliente?",
  ]
);

const KEYWORD_EXPENSE = padFamily(
  [
    "¿Cuánto hemos gastado en llantas?",
    "¿Cuánto gastamos en llantas?",
    "¿Cuánto llevamos gastado en llantas?",
    "¿Cuál es el gasto en llantas?",
    "¿Cuánto hemos pagado por llantas?",
    "¿Cuánto suman los folios de llantas?",
    "¿Cuál es el total de folios con llantas?",
    "¿Cuánto hemos gastado en neumáticos?",
    "¿Cuánto gastamos en llantas de enero a septiembre?",
    "¿Cuánto suman los folios que contienen llanta?",
    "¿Qué importe total tienen los folios con llantas?",
    "¿Cuánto dinero está asociado a llantas?",
  ],
  [
    "¿Cuánto gasté en llantas?",
    "Gasto en llantas de enero a agosto.",
    "¿Cuánto hemos gastado en llantas de enero a agosto?",
    "Total de folios con llanta.",
    "¿Cuánto suman las llantas?",
    "Importe de folios de neumáticos.",
    "¿Cuánto pagamos en llantas?",
    "¿Cuánto gastamos en neumáticos de enero a septiembre?",
    "Folios que contienen llantas, ¿cuánto suman?",
    "¿Cuál es el importe registrado de llantas?",
    "Gasto asociado a llantas.",
    "¿Cuánto llevamos en llantas?",
    "¿Cuánto se ha gastado en llantas?",
    "Suma de folios con llanta.",
    "¿Cuánto gastamos en llantas en el año?",
    "¿Cuánto hemos gastado en llantas de enero a julio?",
    "Neumáticos: ¿cuánto suman los folios?",
    "¿Qué total tienen los folios de llantas?",
    "Importe total llantas.",
    "¿Cuánto dinero hay en folios de llantas?",
    "¿Cuánto gastamos en llantas de enero a junio?",
    "¿Cuánto hemos pagado de llantas de enero a agosto?",
    "Folios con la palabra llanta, total.",
    "¿Cuánto suman los folios con neumático?",
    "Gasto en neumáticos.",
    "¿Cuánto está registrado en llantas?",
    "¿Cuánto gastamos en llantas este año hasta septiembre?",
    "Total registrado de llantas.",
    "¿Cuánto suman llantas y neumáticos?",
    "¿Cuál es el gasto de folios de llantas?",
    "Llantas de enero a septiembre, ¿cuánto?",
    "¿Cuánto hemos gastado en llantas de enero a mayo?",
    "Importe pagado de llantas.",
    "¿Cuánto suman los folios que dicen llanta?",
    "¿Cuánto dinero de llantas hay de enero a agosto?",
    "¿Cuánto gastamos en llantas de febrero a septiembre?",
    "Neumáticos enero a agosto.",
    "¿Cuánto total de folios de llantas?",
  ]
);

function expandAnti() {
  const rows = [
    { q: "¿Cómo va la venta?", not_family: "PLANT_DIAGNOSIS_CURRENT" },
    { q: "Diagnóstico de la planta actual.", not_family: "SALES_STATUS" },
    { q: "¿Cómo va septiembre contra octubre?", not_family: "SALES_STATUS" },
    { q: "¿Cómo vamos contra el mismo periodo del mes anterior?", not_family: "PERIOD_COMPARISON_EXPLICIT" },
    { q: "¿Cuánto vendió la planta hoy, esta semana y este mes?", not_family: "LOW_SALES_CARBURATION" },
    { q: "¿Qué estación de carburación tiene baja venta?", not_family: "SALES_STATUS" },
    { q: "¿Consideras que va a mejorar la tendencia de venta para finales de mes?", not_family: "SALES_STATUS" },
    { q: "¿Cuál fue su última compra?", not_family: "SALES_STATUS" },
    { q: "¿Cuánto hemos gastado en llantas de enero a septiembre?", not_family: "SALES_STATUS" },
    { q: "¿Cuántas estaciones tiene Puebla?", not_family: "LOW_SALES_CARBURATION" },
    { q: "¿Cómo estamos en regulaciones?", not_family: "SALES_STATUS" },
    { q: "¿Qué permisos están vencidos?", not_family: "KEYWORD_EXPENSE" },
    { q: "Dame los documentos pendientes de regulación.", not_family: "PLANT_DIAGNOSIS_CURRENT" },
    { q: "¿Cuánto gastamos en taller de enero a septiembre?", not_family: "KEYWORD_EXPENSE" },
    { q: "¿Qué comisión tenemos en Casa?", not_family: "SALES_STATUS" },
    { q: "¿Qué comisión tenemos en Comisionista?", not_family: "SALES_TREND_TO_CLOSE" },
    { q: "abre la venta diaria", not_family: "SALES_STATUS" },
    { q: "total de clientes nuevos", not_family: "SALES_STATUS" },
    { q: "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?", not_family: "SALES_STATUS" },
    { q: "¿Está atrasado el Action Register?", not_family: "ACTIVE_CLIENT_ENTITY_INHERITANCE" },
    { q: "¿Cuánto pagamos en llantas?", not_family: "SALES_STATUS" },
    { q: "¿Cuánto suman?", not_family: "KEYWORD_EXPENSE" },
    { q: "venta", not_family: "PLANT_DIAGNOSIS_CURRENT" },
    { q: "actual", not_family: "SALES_STATUS" },
    { q: "septiembre contra octubre", not_family: "SALES_TODAY_WEEK_MONTH" },
    { q: "¿Cómo estamos en SEH?", not_family: "LOW_SALES_CARBURATION" },
    { q: "forecast por cliente", not_family: "SALES_TREND_TO_CLOSE" },
    { q: "¿Cuánto gastamos en taller?", not_family: "KEYWORD_EXPENSE" },
    { q: "folios cancelados de llantas", not_family: "SALES_STATUS" },
    { q: "¿Me los puedes listar?", not_family: "SALES_STATUS" },
  ];
  const extras = [];
  for (const fam of FAMILY_IDS) {
    extras.push({ q: "¿Cómo estamos en regulaciones?", not_family: fam });
    extras.push({ q: "¿Cuánto gastamos en taller de enero a septiembre?", not_family: fam });
    extras.push({ q: "¿Qué comisión tenemos en Casa?", not_family: fam });
    extras.push({ q: "abre la venta diaria", not_family: fam });
    extras.push({ q: "total de clientes nuevos", not_family: fam });
    extras.push({ q: "¿Qué permisos están vencidos?", not_family: fam });
    extras.push({ q: "Dame los documentos pendientes de regulación.", not_family: fam });
    extras.push({ q: "¿Cuántas estaciones de carburación hay?", not_family: fam });
    extras.push({ q: "extintor vencido de estación", not_family: fam });
    extras.push({ q: "Brief ejecutivo diario", not_family: fam });
    extras.push({ q: "¿Cómo cerramos el mes?", not_family: fam });
    extras.push({ q: "Pronóstico contractual de la planta", not_family: fam });
    extras.push({ q: "clientes nuevos de agosto", not_family: fam });
    extras.push({ q: "Action Register atrasado", not_family: fam });
    extras.push({ q: "¿Cuál es el margen de enero?", not_family: fam });
    extras.push({ q: "Exporta el excel de SEH", not_family: fam });
    extras.push({ q: "Taller por AT-12", not_family: fam });
    extras.push({ q: "¿Cómo va seguridad?", not_family: fam });
    extras.push({ q: "Prejunta de septiembre", not_family: fam });
    extras.push({ q: "¿Qué folio de taller mayor hay?", not_family: fam });
    extras.push({ q: "Cierre proyectado de planta", not_family: fam });
    extras.push({ q: "¿Cuánto vendimos de Casa en enero?", not_family: fam });
    extras.push({ q: "Lista folios de enero", not_family: fam });
    extras.push({ q: "¿Cómo está la rentabilidad?", not_family: fam });
    extras.push({ q: "Diagnóstico financiero", not_family: fam });
    extras.push({ q: "¿Cuánto invertimos de enero a septiembre?", not_family: fam });
    extras.push({ q: "top clientes de enero", not_family: fam });
    extras.push({ q: "¿Quiénes dejaron de comprar?", not_family: fam });
    extras.push({ q: "¿Cómo vamos de IGF?", not_family: fam });
    extras.push({ q: "¿Cómo vamos de ARR?", not_family: fam });
    extras.push({ q: "Gasto operativo IGF", not_family: fam });
    extras.push({ q: "¿Qué cumplimiento de venta tenemos?", not_family: fam });
    extras.push({ q: "Abre el folio F-260101-1", not_family: fam });
    extras.push({ q: "¿Cuánto suman los folios de gastos?", not_family: fam });
    extras.push({ q: "¿Cuánto gastamos en comidas?", not_family: fam });
    extras.push({ q: "¿Quién es responsable de seguridad?", not_family: fam });
    extras.push({ q: "¿Cuál es el descuento de septiembre?", not_family: fam });
    extras.push({ q: "¿Qué porcentaje de forecast llevamos?", not_family: fam });
    extras.push({ q: "Clientes de enero", not_family: fam });
  }
  return Object.freeze(rows.concat(extras));
}

function expandMultiTurn() {
  const base = [
    { turns: ["¿Cómo va la venta?", "Acapulco"], intents: ["plant_diagnosis", "plant_diagnosis"] },
    { turns: ["Diagnóstico de la planta actual."], families: ["PLANT_DIAGNOSIS_CURRENT"] },
    { turns: ["¿Cómo va septiembre contra octubre?"], families: ["PERIOD_COMPARISON_EXPLICIT"] },
    {
      turns: ["¿Cómo vamos contra el mismo periodo del mes anterior?", "¿En toneladas?", "¿Y en porcentaje?"],
      families: ["SAME_PERIOD_PREVIOUS_MONTH", "SAME_PERIOD_PREVIOUS_MONTH", "SAME_PERIOD_PREVIOUS_MONTH"],
    },
    {
      turns: [
        "¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?",
        "¿Cuál fue su última compra?",
        "¿Cada cuántos días compra?",
        "¿Está atrasada?",
        "¿Cuántos días lleva sin comprar?",
        "¿Y cuándo esperamos que vuelva?",
      ],
      inherit_client: true,
    },
    {
      turns: ["¿Cuándo vuelve TORTILLERIA ERICK?", "¿Y CLIENTE B?", "¿Cuál fue su última compra?"],
      switch_client: "CLIENTE B",
    },
    {
      turns: ["¿Qué folios contienen la palabra llanta?", "enero a agosto", "¿Cuánto suman?"],
      intents: ["folio_search", "folio_search", "folio_search"],
    },
    {
      turns: ["¿Cuánto gastamos en llantas de enero a agosto?", "¿Me los puedes listar?"],
      families: ["KEYWORD_EXPENSE", "KEYWORD_EXPENSE"],
    },
  ];
  const extra = [];
  for (const q of SALES_STATUS.slice(0, 20)) extra.push({ turns: [q], families: ["SALES_STATUS"] });
  for (const q of PLANT_DIAGNOSIS_CURRENT.slice(0, 20)) extra.push({ turns: [q], families: ["PLANT_DIAGNOSIS_CURRENT"] });
  for (const q of PERIOD_COMPARISON_EXPLICIT.slice(0, 20)) extra.push({ turns: [q], families: ["PERIOD_COMPARISON_EXPLICIT"] });
  for (const q of SAME_PERIOD_PREVIOUS_MONTH.slice(0, 20)) extra.push({ turns: [q], families: ["SAME_PERIOD_PREVIOUS_MONTH"] });
  for (const q of SALES_TODAY_WEEK_MONTH.slice(0, 20)) extra.push({ turns: [q], families: ["SALES_TODAY_WEEK_MONTH"] });
  for (const q of LOW_SALES_CARBURATION.slice(0, 20)) extra.push({ turns: [q], families: ["LOW_SALES_CARBURATION"] });
  for (const q of SALES_TREND_TO_CLOSE.slice(0, 20)) extra.push({ turns: [q], families: ["SALES_TREND_TO_CLOSE"] });
  for (const q of KEYWORD_EXPENSE.slice(0, 20)) extra.push({ turns: [q], families: ["KEYWORD_EXPENSE"] });
  extra.push({
    turns: ["¿Cuándo esperamos que vuelva a comprar TORTILLERIA ERICK?", "¿Cuánto gastamos en Taller?", "enero", "¿Cuál fue su última compra?"],
    clears_client: true,
  });
  extra.push({ turns: ["¿Cómo va la venta?"], families: ["SALES_STATUS"] });
  extra.push({ turns: ["¿Cuánto vendió la planta hoy, esta semana y este mes?"], families: ["SALES_TODAY_WEEK_MONTH"] });
  extra.push({ turns: ["¿Qué estación de carburación tiene baja venta?"], families: ["LOW_SALES_CARBURATION"] });
  extra.push({ turns: ["¿Consideras que va a mejorar la tendencia de venta para finales de mes?"], families: ["SALES_TREND_TO_CLOSE"] });
  extra.push({ turns: ["¿Cuánto hemos gastado en llantas de enero a septiembre?"], families: ["KEYWORD_EXPENSE"] });
  extra.push({ turns: ["Diagnóstico de la planta.", "Acapulco"], intents: ["plant_diagnosis", "plant_diagnosis"] });
  extra.push({ turns: ["¿Cómo va septiembre contra octubre?", "Acapulco"], intents: ["executive_sales_context", "executive_sales_context"] });
  extra.push({ turns: ["¿Cómo va la venta?", "¿Y en toneladas?"], families: ["SALES_STATUS", "SALES_STATUS"] });
  extra.push({ turns: ["¿Cómo vamos contra el mismo periodo del mes anterior?", "¿Y el delta?"], families: ["SAME_PERIOD_PREVIOUS_MONTH", "SAME_PERIOD_PREVIOUS_MONTH"] });
  extra.push({ turns: ["¿Cuánto vendió la planta hoy, esta semana y este mes?", "¿Y el corte?"], families: ["SALES_TODAY_WEEK_MONTH", "SALES_TODAY_WEEK_MONTH"] });
  extra.push({ turns: ["¿Cuánto hemos gastado en llantas?", "enero a agosto", "¿Me los puedes listar?"], families: ["KEYWORD_EXPENSE", "KEYWORD_EXPENSE", "KEYWORD_EXPENSE"] });
  extra.push({ turns: ["¿Qué estación de carburación tiene baja venta?", "¿Hay fuente?"], families: ["LOW_SALES_CARBURATION", "LOW_SALES_CARBURATION"] });
  return Object.freeze([...base, ...extra]);
}

const ERICK_FOLLOWUP_FORBIDDEN = Object.freeze([
  "164 ZAPATA",
  "171 COSTA AZUL",
  "173 SAN AGUSTIN",
  "209 LA PALMA",
]);

module.exports = {
  FAMILY_IDS,
  SALES_STATUS,
  PLANT_DIAGNOSIS_CURRENT,
  PERIOD_COMPARISON_EXPLICIT,
  SAME_PERIOD_PREVIOUS_MONTH,
  SALES_TODAY_WEEK_MONTH,
  LOW_SALES_CARBURATION,
  SALES_TREND_TO_CLOSE,
  ACTIVE_CLIENT_ENTITY_INHERITANCE,
  KEYWORD_EXPENSE,
  ANTI_COLLISIONS: expandAnti(),
  MULTI_TURN: expandMultiTurn(),
  ERICK_FOLLOWUP_FORBIDDEN,
};
