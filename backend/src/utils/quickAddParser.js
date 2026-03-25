const dayjs = require("dayjs");

function parseQuickAdd(input = "") {
  const raw = input.trim();
  if (!raw) {
    return null;
  }

  const amountMatch = raw.match(/(\d+(?:\.\d{1,2})?)/);
  if (!amountMatch) {
    return null;
  }

  const amount = Number(amountMatch[1]);
  const lower = raw.toLowerCase();
  let date = dayjs();

  if (lower.includes("yesterday")) {
    date = date.subtract(1, "day");
  }

  const description =
    raw
      .replace(amountMatch[0], "")
      .replace(/yesterday|today/gi, "")
      .trim() || "Expense";

  return {
    amount,
    description,
    date: date.toDate(),
  };
}

module.exports = parseQuickAdd;
