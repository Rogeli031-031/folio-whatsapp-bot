"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("../frontend-dashboard/node_modules/typescript");
const React = require("../frontend-dashboard/node_modules/react");
const { renderToStaticMarkup } = require("../frontend-dashboard/node_modules/react-dom/server");
const front = path.join(__dirname, "../frontend-dashboard");
const tick = () => new Promise((resolve) => setImmediate(resolve));

// Execute the real component and event handlers with controlled state and API responses.
// Child panels are isolated; there are no network calls or production writes.
function view(initial, api) {
  const state = { ...initial }, refs = {}, cache = new Map();
  let effects = [];
  const stateHook = (name, initial) => {
    if (!(name in state)) state[name] = typeof initial === "function" ? initial() : initial;
    return [state[name], (value) => { state[name] = typeof value === "function" ? value(state[name]) : value; }];
  };
  const refHook = (name, initial) => refs[name] || (refs[name] = { current: initial });
  const hooks = { ...React, useEffect: (fn) => effects.push(fn), useMemo: (fn) => fn() };
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} }; cache.set(file, module);
    const text = fs.readFileSync(file, "utf8");
    const result = ts.transpileModule(text, {
      fileName: file,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      transformers: { before: [(context) => {
        const visit = (node) => {
          if (ts.isVariableDeclaration(node) && node.initializer && ts.isCallExpression(node.initializer)) {
            const call = node.initializer;
            const kind = call.expression.getText();
            if (kind === "useState" || kind === "useRef") {
              const name = ts.isArrayBindingPattern(node.name) ? node.name.elements[0].name.getText() : node.name.getText();
              return ts.factory.updateVariableDeclaration(node, node.name, node.exclamationToken, node.type,
                ts.factory.createCallExpression(ts.factory.createIdentifier(kind === "useState" ? "__state" : "__ref"), undefined,
                  [ts.factory.createStringLiteral(name), ...call.arguments]));
            }
          }
          return ts.visitEachChild(node, visit, context);
        };
        return (root) => ts.visitNode(root, visit);
      }] },
    });
    const req = (name) => {
      if (name === "react") return hooks;
      if (name === "react/jsx-runtime") return require("../frontend-dashboard/node_modules/react/jsx-runtime");
      if (name === "next/navigation") return { useSearchParams: () => new URLSearchParams(), useRouter: () => ({ replace() {} }) };
      if (name === "next/link") return ({ children }) => React.createElement("a", null, children);
      if (name === "@/lib/api") return api;
      if (name.startsWith("@/components/")) return new Proxy({}, { get: (_target, key) => key === "__esModule" ? true : () => null });
      if (name.startsWith("@/")) {
        const base = path.join(front, name.slice(2));
        return load([base + ".ts", base + ".js", base + ".tsx"].find(fs.existsSync));
      }
      if (name.startsWith(".")) {
        const base = path.resolve(path.dirname(file), name);
        return load([base, base + ".ts", base + ".js"].find((p) => fs.existsSync(p) && fs.statSync(p).isFile()));
      }
      return require(name);
    };
    new Function("require", "module", "exports", "__state", "__ref", result.outputText)(req, module, module.exports, stateHook, refHook);
    return module.exports;
  }
  const Component = load(path.join(front, "components/IgfForecastClient.tsx")).IgfForecastContent;
  return {
    state, refs,
    render() { effects = []; return Component(); },
    async effectContaining(text) {
      const effect = effects.find((fn) => fn.toString().includes(text));
      assert.ok(effect, text); effect(); await tick();
    },
  };
}
function elements(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  return [node, ...elements(node.props && node.props.children)];
}
function fixture(apiOverrides = {}) {
  const token = "test." + Buffer.from(JSON.stringify({ role: "GG", plantas_permitidas: [2] })).toString("base64url") + ".test";
  const row = { empresa: "Tehuacán", plant_code: "Tehuacan", ventaTon: 100, margen: 6, comDesc: -2, impuestos: 0.2, hgKg: -0.3, ingreso: 430000, operativos: 100000, corporativos: 20000, gasto: 120000, utilOperImporte: 330000, resultadoFinalImporte: 310000 };
  const forecast = { year: 2026, month: 10, rows: [{ empresa: "Tehuacán", venta_ton: 100 }], totales: null, mini: { rows: [row], zona: null } };
  let detail = { plant_code: "Tehuacan", days: [{ fecha: "2026-10-14", selected: true, venta_ton: 10 }], corte_day: "2026-10-15" };
  const calls = [];
  const api = {
    fetchIgfDiarioAcumulado: async () => { calls.push("acumulado"); return { rows: [{ plant_code: "Tehuacan", empresa: "Tehuacán", margen: 6, hg: -0.3 }] }; },
    fetchPronosticoDetalle: async () => { calls.push("detail"); return detail; },
    postPronosticoDias: async (_token, value) => { calls.push("save"); detail = { ...detail, days: value.days }; },
    fetchIgfForecast: async () => { calls.push("forecast"); return { ...forecast, mini: { ...forecast.mini, rows: [{ ...row, ventaTon: 110 }] } }; },
    ...apiOverrides,
  };
  const ui = view({ token, igfForecast: forecast, igfMini: forecast.mini, uploadDay: "2026-10-15" }, api);
  return { ui, calls, api };
}

test("GG opens own plant, sees all calculation buttons and no warning from other plants", async () => {
  const { ui } = fixture();
  ui.render();
  await ui.effectContaining("Rows have already been scoped");
  await ui.effectContaining("fetchIgfDiarioAcumulado");
  const tree = ui.render();
  const html = renderToStaticMarkup(tree);
  assert.equal(ui.state.plantaFilter, "Tehuacán");
  const selector = elements(tree).find((node) => node.type === "select");
  assert.deepEqual(elements(selector).filter((node) => node.type === "option").map((node) => node.props.value), ["Tehuacán"]);
  assert.doesNotMatch(html, /IGF Diario acumulado incompleto|GT Puebla|Acapulco/);
  const buttons = elements(tree).filter((node) => node.type === "button");
  assert.equal(buttons.filter((node) => node.props.title === "Editar desglose del mes").length, 2);
  assert.ok(buttons.some((node) => node.props.title === "Margen diario"));
  assert.ok(buttons.some((node) => String(node.props.title).startsWith("Pronóstico (misma")));
});

async function changedProjection(ui) {
  ui.state.pronosticoModal = { empresa: "Tehuacán", plant_code: "Tehuacan" };
  ui.state.pronosticoDetail = { plant_code: "Tehuacan", corte_day: "2026-10-15", days: [{ fecha: "2026-10-14", selected: true }] };
  ui.render();
  ui.refs.pronosticoSavedDaysRef.current = JSON.stringify([["2026-10-14", true]]);
  const checkbox = elements(ui.render()).find((node) => node.type === "input" && node.props.type === "checkbox" && node.props.checked === true);
  assert.ok(checkbox); checkbox.props.onChange();
}
test("closing changed projection saves once, invalidates accumulated data and refreshes the main view", async () => {
  const { ui, calls } = fixture();
  await changedProjection(ui);
  ui.refs.acumuladoCacheRef.current = { key: "old", byPlant: {} };
  const close = elements(ui.render()).find((node) => node.props?.["aria-label"] === "Guardar cambios y cerrar pronóstico");
  close.props.onClick(); close.props.onClick();
  await tick();
  assert.deepEqual(calls, ["save", "forecast", "detail"]);
  assert.equal(ui.refs.acumuladoCacheRef.current, null);
  assert.equal(ui.state.acumuladoNonce, 1);
  assert.equal(ui.state.igfMini.rows[0].ventaTon, 110);
  assert.equal(ui.state.pronosticoModal, null);
  ui.render(); await ui.effectContaining("fetchIgfDiarioAcumulado");
  assert.equal(calls.at(-1), "acumulado");
  assert.deepEqual(ui.state.acumuladoMissing, []);
});

test("save failure keeps the projection open and its pending days available to retry", async () => {
  const { ui } = fixture({ postPronosticoDias: async () => { throw new Error("No se pudo guardar"); } });
  await changedProjection(ui);
  const close = elements(ui.render()).find((node) => node.props?.["aria-label"] === "Guardar cambios y cerrar pronóstico");
  close.props.onClick(); await tick();
  assert.ok(ui.state.pronosticoModal);
  assert.equal(ui.state.pronosticoDetail.days[0].selected, false);
  assert.equal(ui.state.pronosticoError, "No se pudo guardar");
  assert.equal(ui.state.acumuladoNonce, 0);
  assert.equal(ui.refs.pronosticoSaveRef.current, false);
});

test("a stale accumulated response is not reused after a projection change", async () => {
  const { ui, calls } = fixture();
  ui.render(); await ui.effectContaining("fetchIgfDiarioAcumulado");
  const oldCache = ui.refs.acumuladoCacheRef.current;
  ui.state.acumuladoNonce += 1;
  // Simulate an earlier request that completes after the cache was invalidated.
  ui.refs.acumuladoCacheRef.current = oldCache;
  ui.render(); await ui.effectContaining("fetchIgfDiarioAcumulado");
  assert.equal(calls.filter((name) => name === "acumulado").length, 2);
  assert.notEqual(ui.refs.acumuladoCacheRef.current.key, oldCache.key);
});

test("real gaps in the GG plant still display their warning", async () => {
  const { ui } = fixture({ fetchIgfDiarioAcumulado: async () => ({ rows: [] }) });
  ui.render(); await ui.effectContaining("fetchIgfDiarioAcumulado");
  const html = renderToStaticMarkup(ui.render());
  assert.match(html, /IGF Diario acumulado incompleto/);
  assert.match(html, /Tehuacán/);
  assert.doesNotMatch(html, /GT Puebla|GTM Queretaro|Acapulco/);
});
