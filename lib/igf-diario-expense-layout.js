"use strict";

function usesDetailedExpenseLayout(year, month) {
  const y = Number(year);
  const m = Number(month);
  return y > 2026 || (y === 2026 && m >= 10);
}

module.exports = {
  usesDetailedExpenseLayout,
};
