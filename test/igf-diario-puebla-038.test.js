"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const igf = require("../lib/igf-diario-puebla");

function isSunday(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 0;
}

test("2018 usa el 1 de diciembre y no el 1 de octubre", () => {
  const days = igf.federalRestDays(2018);
  assert.equal(days.includes("2018-12-01"), true);
  assert.equal(days.includes("2018-10-01"), false);
  const oct = igf.monthBusinessDays(2018, 10);
  const dec = igf.monthBusinessDays(2018, 12);
  assert.equal(oct.days.find((d) => d.day === 1).inhabil, isSunday(2018, 10, 1));
  assert.equal(dec.days.find((d) => d.day === 1).inhabil, true);
  assert.equal(isSunday(2018, 12, 1), false);
});

test("desde 2024 el descanso presidencial es el 1 de octubre", () => {
  for (const year of [2024, 2030, 2036]) {
    const days = igf.federalRestDays(year);
    assert.equal(days.includes(`${year}-10-01`), true);
    assert.equal(days.includes(`${year}-12-01`), false);
    assert.equal(igf.monthBusinessDays(year, 10).days.find((d) => d.day === 1).inhabil, true);
  }
  const dec1 = igf.monthBusinessDays(2036, 12).days.find((d) => d.day === 1);
  assert.equal(dec1.inhabil, isSunday(2036, 12, 1));
  assert.equal(isSunday(2036, 12, 1), false);
  assert.equal(dec1.inhabil, false);
});

test("septiembre 2026 conserva 25 hábiles", () => {
  const sep = igf.monthBusinessDays(2026, 9);
  assert.equal(sep.habiles, 25);
  assert.equal(sep.days.filter((d) => d.inhabil).map((d) => d.day).join(","), "6,13,16,20,27");
});
