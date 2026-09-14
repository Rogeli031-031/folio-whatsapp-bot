"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
const {
  NEED_TYPES,
  resolveExecutiveNeed,
  shouldHandleExecutiveStatus,
} = require("../lib/director-ia-conversational-executive-layer");

const ROOT = path.join(__dirname, "..");
const CEL_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-conversational-executive-layer.js"), "utf8");
const PLANNER_SRC = fs.readFileSync(path.join(ROOT, "lib", "director-ia-planner.js"), "utf8");

const AUDIT_CLASS = Object.freeze({
  PARAPHRASE_PURE: "PARAPHRASE_PURE",
  TIME: "SPECIALIZATION_TIME",
  DOMAIN: "SPECIALIZATION_DOMAIN",
  PERFORMANCE: "SPECIALIZATION_PERFORMANCE",
  DIAGNOSIS: "SPECIALIZATION_DIAGNOSIS",
  PRIORITY: "SPECIALIZATION_PRIORITY",
  AMBIGUOUS: "AMBIGUOUS",
  FALSE_POSITIVE: "FALSE_POSITIVE",
});

const PREVIOUSLY_REACHING_IDS = Object.freeze([
  1, 2, 3, 5, 7, 9, 12, 14, 15, 18, 21, 22, 25, 27, 30, 32, 38, 41,
]);

const AUDIT_BATTERY = Object.freeze([
  { id: 1, phrase: "¿Cómo vamos?", class: AUDIT_CLASS.PARAPHRASE_PURE, before: "CEL" },
  { id: 2, phrase: "¿Cómo estamos?", class: AUDIT_CLASS.PARAPHRASE_PURE, before: "CEL" },
  { id: 3, phrase: "¿Cómo estamos yendo?", class: AUDIT_CLASS.PARAPHRASE_PURE, before: "CEL" },
  { id: 4, phrase: "¿Qué tal vamos?", class: AUDIT_CLASS.PARAPHRASE_PURE, before: "UNK" },
  { id: 5, phrase: "¿Cómo está la planta?", class: AUDIT_CLASS.PARAPHRASE_PURE, before: "CEL" },
  { id: 6, phrase: "¿Cómo marcha todo?", class: AUDIT_CLASS.PARAPHRASE_PURE, before: "UNK" },
  { id: 7, phrase: "¿Cómo va el día de hoy?", class: AUDIT_CLASS.TIME, before: "BRIEF→CEL" },
  { id: 8, phrase: "¿Qué tal marcha el negocio?", class: AUDIT_CLASS.DOMAIN, before: "UNK" },
  { id: 9, phrase: "¿Cómo se ve la situación?", class: AUDIT_CLASS.PARAPHRASE_PURE, before: "CEL" },
  { id: 10, phrase: "¿Cómo avanza la operación?", class: AUDIT_CLASS.DOMAIN, before: "UNK" },
  { id: 11, phrase: "Dame el estado actual.", class: AUDIT_CLASS.AMBIGUOUS, before: "UNK" },
  { id: 12, phrase: "Dame un panorama de cómo vamos.", class: AUDIT_CLASS.PARAPHRASE_PURE, before: "CEL" },
  { id: 13, phrase: "Dame el resumen ejecutivo.", class: AUDIT_CLASS.PARAPHRASE_PURE, before: "UNK" },
  { id: 14, phrase: "¿Cuál es la situación actual?", class: AUDIT_CLASS.PARAPHRASE_PURE, before: "CEL" },
  { id: 15, phrase: "¿Cómo está el negocio?", class: AUDIT_CLASS.DOMAIN, before: "CEL" },
  { id: 16, phrase: "Preséntame el balance general de la jornada.", class: AUDIT_CLASS.AMBIGUOUS, before: "UNK" },
  { id: 17, phrase: "Requiero el estatus operativo general.", class: AUDIT_CLASS.DOMAIN, before: "UNK" },
  { id: 18, phrase: "Despliégame el reporte de situación de la planta.", class: AUDIT_CLASS.PARAPHRASE_PURE, before: "CEL" },
  { id: 19, phrase: "Dame una lectura rápida de cómo cerramos el indicador.", class: AUDIT_CLASS.AMBIGUOUS, before: "month_close_result" },
  { id: 20, phrase: "Pásame el reporte ejecutivo de cómo nos encontramos.", class: AUDIT_CLASS.PARAPHRASE_PURE, before: "UNK" },
  { id: 21, phrase: "A ver, ¿cómo vamos?", class: AUDIT_CLASS.PARAPHRASE_PURE, before: "CEL" },
  { id: 22, phrase: "Cuéntame cómo estamos.", class: AUDIT_CLASS.PARAPHRASE_PURE, before: "CEL" },
  { id: 23, phrase: "¿Qué tal las cosas?", class: AUDIT_CLASS.AMBIGUOUS, before: "UNK" },
  { id: 24, phrase: "¿Cómo pinta esto?", class: AUDIT_CLASS.PARAPHRASE_PURE, before: "UNK" },
  { id: 25, phrase: "¿Cómo anda la planta?", class: AUDIT_CLASS.PARAPHRASE_PURE, before: "CEL" },
  { id: 26, phrase: "¿Qué onda con los números de hoy?", class: AUDIT_CLASS.TIME, before: "UNK" },
  { id: 27, phrase: "A ver, ¿cómo andamos por aquí?", class: AUDIT_CLASS.PARAPHRASE_PURE, before: "CEL" },
  { id: 28, phrase: "¿Qué dice el tablero de control?", class: AUDIT_CLASS.DOMAIN, before: "UNK" },
  { id: 29, phrase: "Ponme al tanto de cómo marcha todo.", class: AUDIT_CLASS.PARAPHRASE_PURE, before: "UNK" },
  { id: 30, phrase: "¿Cómo se está viendo el panorama en este momento?", class: AUDIT_CLASS.TIME, before: "CEL" },
  { id: 31, phrase: "¿Estamos bien o mal?", class: AUDIT_CLASS.PERFORMANCE, before: "UNK" },
  { id: 32, phrase: "¿Cómo está el desempeño?", class: AUDIT_CLASS.PERFORMANCE, before: "CEL" },
  { id: 33, phrase: "¿Vamos mejorando?", class: AUDIT_CLASS.PERFORMANCE, before: "UNK" },
  { id: 34, phrase: "¿Estamos cumpliendo?", class: AUDIT_CLASS.PERFORMANCE, before: "UNK" },
  { id: 35, phrase: "¿Cómo vienen los resultados?", class: AUDIT_CLASS.PERFORMANCE, before: "UNK" },
  { id: 36, phrase: "¿Qué tal está rindiendo la operación?", class: AUDIT_CLASS.PERFORMANCE, before: "UNK" },
  { id: 37, phrase: "¿Estamos dentro de los objetivos o fuera?", class: AUDIT_CLASS.PERFORMANCE, before: "UNK" },
  { id: 38, phrase: "¿Cómo va el nivel de cumplimiento actual?", class: AUDIT_CLASS.PERFORMANCE, before: "CEL" },
  { id: 39, phrase: "¿El rendimiento va de acuerdo a lo planeado?", class: AUDIT_CLASS.PERFORMANCE, before: "UNK" },
  { id: 40, phrase: "¿Estamos logrando las metas trazadas para el periodo?", class: AUDIT_CLASS.PERFORMANCE, before: "UNK" },
  { id: 41, phrase: "¿Qué está pasando?", class: AUDIT_CLASS.DIAGNOSIS, before: "CEL" },
  { id: 42, phrase: "¿Qué debería preocuparme?", class: AUDIT_CLASS.DIAGNOSIS, before: "UNK" },
  { id: 43, phrase: "¿Qué está funcionando y qué no?", class: AUDIT_CLASS.DIAGNOSIS, before: "UNK" },
  { id: 44, phrase: "¿Dónde estamos fallando?", class: AUDIT_CLASS.DIAGNOSIS, before: "UNK" },
  { id: 45, phrase: "¿Dónde tenemos problemas?", class: AUDIT_CLASS.DIAGNOSIS, before: "UNK" },
  { id: 46, phrase: "¿Qué tengo que atender?", class: AUDIT_CLASS.PRIORITY, before: "UNK" },
  { id: 47, phrase: "¿Qué es lo más importante ahorita?", class: AUDIT_CLASS.PRIORITY, before: "UNK" },
  { id: 48, phrase: "¿Dónde debería poner atención?", class: AUDIT_CLASS.PRIORITY, before: "UNK" },
  { id: 49, phrase: "¿Qué requiere mi atención?", class: AUDIT_CLASS.PRIORITY, before: "UNK" },
  { id: 50, phrase: "¿Qué tenemos pendiente importante?", class: AUDIT_CLASS.PRIORITY, before: "UNK" },
]);

const PERSONAL_FALSE_POSITIVE = "¿Qué tal estás?";

function route(phrase) {
  const plan = planDirectorIaQuestion(phrase);
  const need = resolveExecutiveNeed(phrase);
  const reachesES = shouldHandleExecutiveStatus(need, {}, plan.intent) === true;
  return {
    planner: plan.intent,
    need: need.need_type || null,
    reachesES,
  };
}

function mustReachExecutiveStatus(item) {
  if (item.class === AUDIT_CLASS.PARAPHRASE_PURE) return true;
  if (item.id === 7) return false;
  return PREVIOUSLY_REACHING_IDS.includes(item.id);
}

describe("IMPL executive-status paraphrase coverage", () => {
  it("no introduce una intención planner paralela", () => {
    assert.equal(/executive_status/.test(PLANNER_SRC), false);
    assert.equal(NEED_TYPES.EXECUTIVE_STATUS, "EXECUTIVE_STATUS");
  });

  it("no hardcodea las 50 frases ni las 6 paráfrasis faltantes", () => {
    assert.doesNotMatch(CEL_SRC, /Qué tal vamos/);
    assert.doesNotMatch(CEL_SRC, /Cómo marcha todo/);
    assert.doesNotMatch(CEL_SRC, /resumen ejecutivo de/);
    assert.doesNotMatch(CEL_SRC, /nos encontramos/);
    assert.doesNotMatch(CEL_SRC, /Cómo pinta esto/);
    assert.doesNotMatch(CEL_SRC, /Ponme al tanto/);
  });

  it("100% de PARAPHRASE_PURE llega a EXECUTIVE_STATUS", () => {
    const pures = AUDIT_BATTERY.filter((item) => item.class === AUDIT_CLASS.PARAPHRASE_PURE);
    assert.equal(pures.length, 18);
    for (const item of pures) {
      const r = route(item.phrase);
      assert.equal(r.need, NEED_TYPES.EXECUTIVE_STATUS, item.phrase);
      assert.equal(r.reachesES, true, `${item.phrase} planner=${r.planner}`);
    }
  });

  it("las frases que ya llegaban a CEL siguen, salvo TIME nombrado del día", () => {
    for (const item of AUDIT_BATTERY.filter((row) => PREVIOUSLY_REACHING_IDS.includes(row.id))) {
      const r = route(item.phrase);
      if (item.id === 7) {
        assert.equal(r.reachesES, false, item.phrase);
        assert.equal(r.planner, "daily_executive_brief", item.phrase);
        continue;
      }
      assert.equal(r.reachesES, true, item.phrase);
      assert.equal(r.need, NEED_TYPES.EXECUTIVE_STATUS, item.phrase);
    }
  });

  it("cero regresiones nuevas hacia EXECUTIVE_STATUS en TIME", () => {
    const time = AUDIT_BATTERY.filter((item) => item.class === AUDIT_CLASS.TIME);
    assert.equal(time.length, 3);
    assert.equal(route("¿Cómo va el día de hoy?").reachesES, false);
    assert.equal(route("¿Qué onda con los números de hoy?").reachesES, false);
    assert.equal(route("¿Cómo se está viendo el panorama en este momento?").reachesES, true);
  });

  it("cero regresiones nuevas en PERFORMANCE", () => {
    const perf = AUDIT_BATTERY.filter((item) => item.class === AUDIT_CLASS.PERFORMANCE);
    for (const item of perf) {
      const r = route(item.phrase);
      const expected = item.before === "CEL";
      assert.equal(r.reachesES, expected, item.phrase);
    }
    assert.equal(route("¿Estamos cumpliendo?").reachesES, false);
  });

  it("cero regresiones nuevas en DIAGNOSIS", () => {
    const diag = AUDIT_BATTERY.filter((item) => item.class === AUDIT_CLASS.DIAGNOSIS);
    for (const item of diag) {
      const r = route(item.phrase);
      const expected = item.before === "CEL";
      assert.equal(r.reachesES, expected, item.phrase);
    }
    assert.equal(route("¿Qué debería preocuparme?").reachesES, false);
  });

  it("cero regresiones en PRIORITY", () => {
    const prio = AUDIT_BATTERY.filter((item) => item.class === AUDIT_CLASS.PRIORITY);
    assert.equal(prio.length, 5);
    for (const item of prio) {
      assert.equal(route(item.phrase).reachesES, false, item.phrase);
    }
    assert.equal(route("¿Qué tengo que atender?").reachesES, false);
  });

  it("¿Qué tal estás? permanece fuera de la consulta ejecutiva", () => {
    const r = route(PERSONAL_FALSE_POSITIVE);
    assert.equal(r.reachesES, false);
    assert.notEqual(r.need, NEED_TYPES.EXECUTIVE_STATUS);
  });

  it("ambigüedades protegidas no se fuerzan", () => {
    assert.equal(route("Preséntame el balance general de la jornada.").reachesES, false);
    const indicador = route("Dame una lectura rápida de cómo cerramos el indicador.");
    assert.equal(indicador.reachesES, false);
    assert.equal(indicador.planner, "month_close_result");
    assert.equal(route("Dame el estado actual.").reachesES, false);
    assert.equal(route("¿Qué tal las cosas?").reachesES, false);
  });

  it("batería de 50: expected vs runtime", () => {
    assert.equal(AUDIT_BATTERY.length, 50);
    for (const item of AUDIT_BATTERY) {
      const r = route(item.phrase);
      assert.equal(r.reachesES, mustReachExecutiveStatus(item), `${item.id} ${item.phrase}`);
    }
  });
});
