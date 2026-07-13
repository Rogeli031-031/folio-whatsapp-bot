"use strict";

const assert = require("assert");
const { isInYearMonth } = require("../lib/arr-load");

assert.strictEqual(isInYearMonth("2026-06-15", 2026, 6), true);
assert.strictEqual(isInYearMonth("2026-07-01", 2026, 6), false);
assert.strictEqual(isInYearMonth("2026-05-31", 2026, 6), false);
assert.strictEqual(isInYearMonth("2025-06-15", 2026, 6), false);
assert.strictEqual(isInYearMonth(null, 2026, 6), false);

console.log("OK test-arr-load-month-filter");
