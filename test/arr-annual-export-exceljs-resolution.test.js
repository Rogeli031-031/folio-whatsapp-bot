"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const FRONTEND = path.join(ROOT, "frontend-dashboard");
const NEXT_CONFIG = path.join(FRONTEND, "next.config.js");

describe("FIX-ARR-ANNUAL-EXPORT-EXCELJS-RESOLUTION-001", () => {
  it("next.config aliasa exceljs al paquete del frontend sin fijar el entry Node", () => {
    const src = fs.readFileSync(NEXT_CONFIG, "utf8");
    assert.match(src, /exceljs:\s*path\.dirname\(require\.resolve\("exceljs\/package\.json"\)\)/);
    assert.equal(src.includes('exceljs: require.resolve("exceljs")'), false);
  });

  it("require.resolve encuentra exceljs en frontend-dashboard/node_modules", () => {
    const pkgJson = require.resolve("exceljs/package.json", { paths: [FRONTEND] });
    const pkgDir = path.dirname(pkgJson);
    assert.equal(pkgDir, path.join(FRONTEND, "node_modules", "exceljs"));
    assert.equal(fs.existsSync(pkgJson), true);
    const pkg = require(pkgJson);
    assert.equal(pkg.name, "exceljs");
    assert.equal(typeof pkg.browser, "string");
  });
});
