"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const nav = require("../frontend-dashboard/lib/igf-gastos-month-nav");

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function octoberModal(overrides) {
  return {
    requestId: 1,
    plant: "Acapulco",
    group: "operativos",
    year: 2026,
    month: 10,
    concepto: "gasto_operativo",
    ...overrides,
  };
}

function harness(controller, options) {
  const effects = [];
  const pending = deferred();
  let visible = options.visible;
  let dashboard = options.dashboard;
  const running = nav.performGuardedSave(controller, {
    identity: options.identity,
    execute: (operation) => {
      effects.push("patch");
      if (typeof options.onExecute === "function") options.onExecute(operation);
      return pending.promise;
    },
    readVisible: () => visible,
    readDashboard: () => dashboard,
    matches: options.matches,
    onLock: () => effects.push("lock"),
    onCache: () => effects.push("cache"),
    onSuccess: () => effects.push("close"),
    onError: () => effects.push("error"),
    onUnlock: () => effects.push("unlock"),
  });
  return {
    effects,
    running,
    setVisible(next) { visible = next; },
    setDashboard(next) { dashboard = next; },
    resolve: pending.resolve,
    reject: pending.reject,
  };
}

test("durante el guardado no se cambia de mes ni se cierra, y al terminar se liberan los controles", async () => {
  const controller = nav.createExpenseSaveController();
  const run = harness(controller, {
    visible: octoberModal(),
    dashboard: { year: 2026, month: 10 },
    identity: octoberModal(),
    matches: (operation, modal) => controller.matchesDesglose(operation, modal),
  });
  assert.equal(controller.isSaving(), true);
  assert.equal(nav.canLeaveExpenseModal(controller, true, () => {
    throw new Error("no debe pedir confirmación mientras guarda");
  }), false);
  assert.equal(nav.canLeaveExpenseModal(controller, false, () => true), false);
  run.resolve({ plant_code: "Acapulco" });
  const result = await run.running;
  assert.equal(result.status, "saved");
  assert.deepEqual(run.effects, ["lock", "patch", "cache", "close", "unlock"]);
  assert.equal(controller.isSaving(), false);
  assert.equal(nav.canLeaveExpenseModal(controller, false, () => true), true);
});

test("el doble clic genera una sola petición", async () => {
  const controller = nav.createExpenseSaveController();
  const first = harness(controller, {
    visible: octoberModal(),
    dashboard: { year: 2026, month: 10 },
    identity: octoberModal(),
    matches: (operation, modal) => controller.matchesDesglose(operation, modal),
  });
  const second = harness(controller, {
    visible: octoberModal(),
    dashboard: { year: 2026, month: 10 },
    identity: octoberModal(),
    matches: (operation, modal) => controller.matchesDesglose(operation, modal),
  });
  assert.deepEqual(first.effects, ["lock", "patch"]);
  assert.deepEqual(second.effects, []);
  const duplicate = await second.running;
  assert.equal(duplicate.status, "duplicate");
  first.resolve({ plant_code: "Acapulco" });
  await first.running;
  assert.equal(first.effects.filter((item) => item === "patch").length, 1);
  assert.equal(controller.isSaving(), false);
});

test("un éxito tardío no cierra ni pinta error en una sesión nueva del mismo mes", async () => {
  const controller = nav.createExpenseSaveController();
  const run = harness(controller, {
    visible: octoberModal(),
    dashboard: { year: 2026, month: 10 },
    identity: octoberModal(),
    matches: (operation, modal) => controller.matchesDesglose(operation, modal),
  });
  run.setVisible(octoberModal({ requestId: 2 }));
  run.resolve({ plant_code: "Acapulco" });
  const result = await run.running;
  assert.equal(result.status, "stale");
  assert.deepEqual(run.effects, ["lock", "patch", "unlock"]);
  assert.equal(controller.isSaving(), false);
});

test("un error tardío no aparece en una sesión nueva", async () => {
  const controller = nav.createExpenseSaveController();
  const run = harness(controller, {
    visible: octoberModal(),
    dashboard: { year: 2026, month: 10 },
    identity: octoberModal(),
    matches: (operation, modal) => controller.matchesDesglose(operation, modal),
  });
  run.setVisible(octoberModal({ requestId: 2 }));
  run.reject(new Error("falló octubre"));
  const result = await run.running;
  assert.equal(result.status, "error");
  assert.deepEqual(run.effects, ["lock", "patch", "unlock"]);
  assert.equal(controller.isSaving(), false);
});

test("la respuesta de octubre no actualiza la caché cuando el dashboard ya está en noviembre", async () => {
  const controller = nav.createExpenseSaveController();
  const run = harness(controller, {
    visible: octoberModal(),
    dashboard: { year: 2026, month: 10 },
    identity: octoberModal(),
    matches: (operation, modal) => controller.matchesDesglose(operation, modal),
  });
  run.setDashboard({ year: 2026, month: 11 });
  run.resolve({ plant_code: "Acapulco" });
  const result = await run.running;
  assert.equal(result.status, "saved");
  assert.equal(run.effects.includes("cache"), false);
  assert.equal(run.effects.includes("close"), true);
  assert.equal(run.effects.at(-1), "unlock");
});

test("la distribución no mezcla planta, mes, concepto ni una apertura anterior", async () => {
  const cases = [
    octoberModal({ plant: "Morelos" }),
    octoberModal({ month: 11 }),
    octoberModal({ concepto: "otro" }),
    octoberModal({ requestId: 9 }),
  ];
  for (const visible of cases) {
    const controller = nav.createExpenseSaveController();
    const run = harness(controller, {
      visible: octoberModal(),
      dashboard: { year: 2026, month: 10 },
      identity: octoberModal(),
      matches: (operation, modal) => controller.matchesDistribution(operation, modal),
    });
    run.setVisible(visible);
    run.resolve({ days: [] });
    const result = await run.running;
    assert.equal(result.status, "stale");
    assert.equal(run.effects.includes("close"), false);
    assert.equal(controller.isSaving(), false);
  }
});

test("la distribución conserva planta, año, mes y el concepto exacto de la operación", async () => {
  const controller = nav.createExpenseSaveController();
  let seen = null;
  const run = harness(controller, {
    visible: octoberModal({ concepto: "extraordinarios" }),
    dashboard: { year: 2026, month: 10 },
    identity: octoberModal({ concepto: "extraordinarios" }),
    matches: (operation, modal) => controller.matchesDistribution(operation, modal),
    onExecute(operation) { seen = operation; },
  });
  run.setVisible(octoberModal({ concepto: "otro" }));
  assert.equal(seen.plant, "Acapulco");
  assert.equal(seen.year, 2026);
  assert.equal(seen.month, 10);
  assert.equal(seen.concepto, "extraordinarios");
  run.resolve({ days: [] });
  await run.running;
  assert.equal(seen.concepto, "extraordinarios");
});

test("sin guardado pendiente se puede cambiar de mes o cancelar, y la advertencia sigue pidiendo confirmación", () => {
  const controller = nav.createExpenseSaveController();
  let asked = 0;
  assert.equal(nav.canLeaveExpenseModal(controller, false, () => {
    asked += 1;
    return true;
  }), true);
  assert.equal(asked, 0);
  assert.equal(nav.canLeaveExpenseModal(controller, true, () => {
    asked += 1;
    return false;
  }), false);
  assert.equal(asked, 1);
  assert.equal(nav.canLeaveExpenseModal(controller, true, () => true), true);
});
