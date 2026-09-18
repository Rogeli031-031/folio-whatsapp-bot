"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  findPronosticoMiniRow,
  forecastRowsForRender,
  decideOpenPronosticoFromQuery,
  buildOpenPronosticoHref,
  canOpenPronosticoMiniRow,
} = require("../frontend-dashboard/lib/igf-open-pronostico");

const ACA = { empresa: "Acapulco", plant_code: "ACA" };
const PUE = { empresa: "Puebla", plant_code: "PUE" };
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb";
const FORECAST = { year: 2026, month: 9 };

describe("findPronosticoMiniRow", () => {
  it("undefined y [] no lanzan y no abren", () => {
    assert.equal(findPronosticoMiniRow(undefined), null);
    assert.equal(findPronosticoMiniRow(null), null);
    assert.equal(findPronosticoMiniRow([]), null);
    assert.equal(findPronosticoMiniRow([null, undefined]), null);
  });

  it("sin plantHint usa la primera fila válida", () => {
    assert.equal(findPronosticoMiniRow([ACA, PUE]), ACA);
    assert.equal(findPronosticoMiniRow([null, PUE]), PUE);
  });

  it("encuentra Acapulco / Puebla / código", () => {
    assert.equal(findPronosticoMiniRow([ACA, PUE], "Acapulco"), ACA);
    assert.equal(findPronosticoMiniRow([ACA, PUE], "Puebla"), PUE);
    assert.equal(findPronosticoMiniRow([ACA, PUE], "ACA"), ACA);
  });

  it("plantHint sin match no cae a list[0]", () => {
    assert.equal(findPronosticoMiniRow([ACA, PUE], "Monterrey"), null);
    assert.equal(findPronosticoMiniRow([ACA], "xyz-no-existe"), null);
  });
});

describe("forecastRowsForRender", () => {
  it("no lanza si rows falta y permite map", () => {
    assert.deepEqual(forecastRowsForRender(null), []);
    assert.deepEqual(forecastRowsForRender({}), []);
    assert.deepEqual(forecastRowsForRender({ rows: null }), []);
    const rows = forecastRowsForRender({ rows: [{ empresa: "Acapulco" }] });
    assert.equal(rows.map((r) => r.empresa).join(), "Acapulco");
  });
});

describe("decideOpenPronosticoFromQuery — no crash con datos incompletos", () => {
  it("query + mini incompleto no throw y espera", () => {
    const cases = [
      { openFlag: "1", alreadyOpened: false },
      { openFlag: "1", token: TOKEN, alreadyOpened: false },
      { openFlag: "1", token: TOKEN, igfForecast: FORECAST, igfMini: null },
      { openFlag: "1", token: TOKEN, igfForecast: FORECAST, igfMini: {} },
      { openFlag: "1", token: TOKEN, igfForecast: FORECAST, igfMini: { rows: undefined } },
      { openFlag: "1", token: TOKEN, igfForecast: FORECAST, igfMini: { rows: [] } },
    ];
    for (const input of cases) {
      const d = decideOpenPronosticoFromQuery(input);
      assert.ok(d.action === "wait" || d.action === "skip", JSON.stringify(input));
    }
  });

  it("datos tardíos: wait hasta rows, luego open una vez", () => {
    const late = decideOpenPronosticoFromQuery({
      alreadyOpened: false,
      openFlag: "1",
      token: TOKEN,
      igfForecast: FORECAST,
      igfMini: { rows: [ACA, PUE] },
      plantHint: "Acapulco",
    });
    assert.equal(late.action, "open");
    assert.equal(late.row, ACA);
    const again = decideOpenPronosticoFromQuery({
      alreadyOpened: true,
      openFlag: "1",
      token: TOKEN,
      igfForecast: FORECAST,
      igfMini: { rows: [ACA, PUE] },
      plantHint: "Acapulco",
    });
    assert.equal(again.action, "skip");
  });

  it("plantHint inválido consume sin abrir", () => {
    const d = decideOpenPronosticoFromQuery({
      alreadyOpened: false,
      openFlag: "1",
      token: TOKEN,
      igfForecast: FORECAST,
      igfMini: { rows: [ACA] },
      plantHint: "Monterrey",
    });
    assert.equal(d.action, "consume_without_open");
    assert.equal(d.row, null);
  });

  it("sin plantHint abre primera fila", () => {
    const d = decideOpenPronosticoFromQuery({
      alreadyOpened: false,
      openFlag: "1",
      token: TOKEN,
      igfForecast: FORECAST,
      igfMini: { rows: [PUE, ACA] },
      plantHint: null,
    });
    assert.equal(d.action, "open");
    assert.equal(d.row, PUE);
  });

  it("sin query no abre", () => {
    assert.equal(decideOpenPronosticoFromQuery({ alreadyOpened: false, openFlag: null }).action, "skip");
  });
});

describe("token y navegación desde chat", () => {
  it("conserva t y no duplica ?", () => {
    const href = buildOpenPronosticoHref(`t=${TOKEN}&upload_day=2026-09-12`, { plant: "Acapulco" });
    assert.match(href, /^\/igf-forecast\?/);
    assert.equal(href.includes("??"), false);
    const q = new URLSearchParams(href.split("?")[1]);
    assert.equal(q.get("t"), TOKEN);
    assert.equal(q.get("open_pronostico"), "1");
    assert.equal(q.get("empresa"), "Acapulco");
    assert.equal(q.get("upload_day"), "2026-09-12");
    assert.equal(q.get("t").length, TOKEN.length);
  });

  it("sin search no pierde el path", () => {
    const href = buildOpenPronosticoHref("", {});
    assert.equal(href.startsWith("/igf-forecast?"), true);
    assert.equal(new URLSearchParams(href.split("?")[1]).get("open_pronostico"), "1");
  });
});

describe("regresión semántica OPEN_PRONOSTICO", () => {
  it("abre vs cuál es no cambia", () => {
    const cov = require("../lib/director-ia-executive-coverage");
    assert.equal(cov.isOpenPronosticoQuestion("abre el pronóstico"), true);
    assert.equal(cov.isOpenPronosticoQuestion("cuál es el pronóstico"), false);
    const { planDirectorIaQuestion } = require("../lib/director-ia-planner");
    assert.equal(planDirectorIaQuestion("abre el pronóstico").intent, "open_pronostico");
    assert.notEqual(planDirectorIaQuestion("cuál es el pronóstico").intent, "open_pronostico");
  });
});

describe("apertura manual / row inválido", () => {
  it("no abre con row/token/forecast incompleto", () => {
    assert.equal(canOpenPronosticoMiniRow(null, TOKEN, FORECAST), false);
    assert.equal(canOpenPronosticoMiniRow({}, TOKEN, FORECAST), false);
    assert.equal(canOpenPronosticoMiniRow(ACA, null, FORECAST), false);
    assert.equal(canOpenPronosticoMiniRow(ACA, TOKEN, null), false);
    assert.equal(canOpenPronosticoMiniRow(ACA, TOKEN, FORECAST), true);
  });
});
