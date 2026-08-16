"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { createEks, createEksRuntime, validate_structure } = require("../lib/director-ia-eks");

const SERVER_PATH = path.join(__dirname, "..", "server.js");
const CHAT_PATH = path.join(__dirname, "..", "lib", "director-ia-chat.js");
const LIB_PATH = path.join(__dirname, "..", "lib", "director-ia-eks.js");

function fakePool(label) {
  return {
    label,
    ended: false,
    async end() {
      this.ended = true;
    },
  };
}

describe("EKS integration runtime", () => {
  it("queda deshabilitado si ENABLE_DIRECTOR_IA no está activo (sin pool)", () => {
    let poolFactoryCalls = 0;
    const rt = createEksRuntime({
      env: {},
      operationalPool: fakePool("ops"),
      createDedicatedPool: () => {
        poolFactoryCalls += 1;
        return fakePool("eks");
      },
    });
    const st = rt.start();
    assert.equal(st.enabled, false);
    assert.equal(st.reason, "director_ia_disabled");
    assert.equal(st.pool, null);
    assert.equal(poolFactoryCalls, 0);
  });

  it("queda deshabilitado de forma controlada si falta DATABASE_URL", () => {
    let poolFactoryCalls = 0;
    const rt = createEksRuntime({
      env: { ENABLE_DIRECTOR_IA: "true" },
      createDedicatedPool: () => {
        poolFactoryCalls += 1;
        return fakePool("eks");
      },
    });
    const st = rt.start();
    assert.equal(st.enabled, false);
    assert.equal(st.reason, "missing_database_url");
    assert.equal(poolFactoryCalls, 0);
  });

  it("usa un pool dedicado distinto del operacional y no abre uno por start extra", () => {
    const ops = fakePool("ops");
    let poolFactoryCalls = 0;
    const dedicated = fakePool("eks");
    const rt = createEksRuntime({
      env: { ENABLE_DIRECTOR_IA: "1", DATABASE_URL: "postgresql://integration.invalid/eks_test" },
      operationalPool: ops,
      createDedicatedPool: () => {
        poolFactoryCalls += 1;
        return dedicated;
      },
    });
    const a = rt.start();
    const b = rt.start();
    assert.equal(a.enabled, true);
    assert.equal(a.pool, dedicated);
    assert.equal(a.poolIsDedicated, true);
    assert.notEqual(a.pool, ops);
    assert.equal(b.pool, a.pool);
    assert.equal(poolFactoryCalls, 1);
  });

  it("cierra el pool de forma controlada", async () => {
    const dedicated = fakePool("eks");
    const rt = createEksRuntime({
      env: { ENABLE_DIRECTOR_IA: "true", DATABASE_URL: "postgresql://integration.invalid/eks_test" },
      createDedicatedPool: () => dedicated,
    });
    rt.start();
    await rt.stop();
    assert.equal(dedicated.ended, true);
    assert.equal(rt.getStatus().pool, null);
    assert.equal(rt.getStatus().enabled, false);
  });

  it("start no dispara append_snapshot", () => {
    let appendCalls = 0;
    const rt = createEksRuntime({
      env: { ENABLE_DIRECTOR_IA: "true", DATABASE_URL: "postgresql://integration.invalid/eks_test" },
      createDedicatedPool: () => fakePool("eks"),
      createEks: () => ({
        append_snapshot: async () => {
          appendCalls += 1;
          throw new Error("append_must_not_run_on_start");
        },
      }),
    });
    const st = rt.start();
    assert.equal(st.enabled, true);
    assert.equal(appendCalls, 0);
  });

  it("no cambia semántica validate_structure / createEks en memoria", () => {
    const eks = createEks();
    const r = validate_structure({ observations: [] });
    assert.equal(r.ok, false);
    assert.equal(typeof eks.append_snapshot, "function");
    assert.equal(typeof eks.get_snapshot, "function");
    assert.equal(typeof eks.list_versions, "function");
  });
});

describe("EKS integration source guards", () => {
  it("server.js hace bootstrap/lifecycle y no append ni rutas públicas", () => {
    const src = fs.readFileSync(SERVER_PATH, "utf8");
    assert.match(src, /createEksRuntime/);
    assert.match(src, /eksRuntime\.start\(\)/);
    assert.match(src, /eksRuntime\.stop/);
    assert.equal(/append_snapshot/.test(src), false);
    assert.equal(/app\.(get|post|put|delete)\(\s*['"`]\/eks/.test(src), false);
    assert.equal(/ON CONFLICT DO UPDATE/.test(src), false);
  });

  it("chat no queda acoplado al EKS", () => {
    const chat = fs.readFileSync(CHAT_PATH, "utf8");
    assert.equal(/director-ia-eks/.test(chat), false);
    assert.equal(/append_snapshot/.test(chat), false);
    assert.equal(/createEksRuntime/.test(chat), false);
  });

  it("runtime EKS sigue sin ON CONFLICT DO UPDATE sobre snapshots", () => {
    const src = fs.readFileSync(LIB_PATH, "utf8");
    assert.equal(/ON CONFLICT DO UPDATE/i.test(src), false);
    assert.equal(/\bDELETE FROM eks\.snapshots\b/i.test(src), false);
  });
});
