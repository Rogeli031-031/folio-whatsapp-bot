"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const TARGET = path.join(ROOT, "lib", "arr-annual-category-analysis.js");

describe("FIX-ARR-ANNUAL-EXPORT-WEBPACK-ALIAS-001", () => {
  it("arr-export-excel importa desde ../../lib y no sale del repo", () => {
    const src = fs.readFileSync(
      path.join(ROOT, "frontend-dashboard/lib/arr-export-excel.ts"),
      "utf8"
    );
    assert.match(src, /from \"\.\.\/\.\.\/lib\/arr-annual-category-analysis\.js\"/);
    assert.equal(src.includes("../../../lib/arr-annual-category-analysis.js"), false);
    const resolved = path.resolve(path.join(ROOT, "frontend-dashboard/lib"), "../../lib/arr-annual-category-analysis.js");
    assert.equal(resolved, TARGET);
    assert.equal(fs.existsSync(resolved), true);
    const escaped = path.resolve(path.join(ROOT, "frontend-dashboard/lib"), "../../../lib/arr-annual-category-analysis.js");
    assert.notEqual(escaped, TARGET);
  });

  it("next.config aliasa ambas rutas al archivo físico", () => {
    const src = fs.readFileSync(path.join(ROOT, "frontend-dashboard/next.config.js"), "utf8");
    assert.match(src, /"\.\.\/\.\.\/\.\.\/lib\/arr-annual-category-analysis\.js"/);
    assert.match(src, /"\.\.\/\.\.\/lib\/arr-annual-category-analysis\.js"/);
    assert.match(src, /path\.join\(__dirname, "\.\.", "lib", "arr-annual-category-analysis\.js"\)/);
    assert.equal(fs.existsSync(TARGET), true);
  });
});
