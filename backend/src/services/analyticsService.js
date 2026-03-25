const dayjs = require("dayjs");
const Transaction = require("../models/Transaction");

function mapCategoryTotals(transactions) {
  return transactions.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {});
}

function formatTrendLabel(date, bucket) {
  if (bucket === "week") {
    return dayjs(date).startOf("week").format("YYYY-MM-DD");
  }

  return dayjs(date).format("YYYY-MM-DD");
}

function mapTrend(transactions, bucket) {
  const byBucket = {};
  for (const tx of transactions) {
    const key = formatTrendLabel(tx.date, bucket);
    byBucket[key] = (byBucket[key] || 0) + tx.amount;
  }

  return Object.entries(byBucket)
    .map(([label, amount]) => ({ label, amount: Number(amount.toFixed(2)) }))
    .sort((a, b) => (a.label > b.label ? 1 : -1));
}

async function getMonthlyTransactions(userId, month) {
  const start = dayjs(`${month}-01`).startOf("month");
  const end = start.endOf("month");

  return Transaction.find({
    userId,
    date: { $gte: start.toDate(), $lte: end.toDate() },
  }).lean();
}

async function getDashboardSummary(userId, month) {
  const monthlyTransactions = await getMonthlyTransactions(userId, month);
  const monthlyTotal = monthlyTransactions.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const categoryTotals = mapCategoryTotals(monthlyTransactions);
  const topCategories = Object.entries(categoryTotals)
    .map(([category, total]) => ({ category, total: Number(total.toFixed(2)) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    month,
    totalSpend: Number(monthlyTotal.toFixed(2)),
    transactionCount: monthlyTransactions.length,
    categoryTotals,
    topCategories,
    dailyTrend: mapTrend(monthlyTransactions, "day"),
    weeklyTrend: mapTrend(monthlyTransactions, "week"),
  };
}

module.exports = {
  getMonthlyTransactions,
  getDashboardSummary,
};
