function predictMonthEndSpend(monthlyTotal, dayOfMonth, daysInMonth) {
  if (!dayOfMonth || dayOfMonth <= 0) {
    return monthlyTotal;
  }
  const projected = (monthlyTotal / dayOfMonth) * daysInMonth;
  return Number(projected.toFixed(2));
}

function detectAnomalies(transactions) {
  if (transactions.length < 5) {
    return [];
  }

  const amounts = transactions.map((tx) => tx.amount);
  const mean = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
  const variance = amounts.reduce((sum, val) => sum + (val - mean) ** 2, 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  return transactions.filter((tx) => tx.amount > mean + 2 * stdDev);
}

function calculateFinancialScore({ budgetUsagePct, savingsHintCount, anomalyCount, subscriptionLoad }) {
  let score = 100;
  score -= Math.max(0, budgetUsagePct - 90) * 0.6;
  score -= anomalyCount * 4;
  score -= subscriptionLoad * 0.5;
  score += Math.min(10, savingsHintCount * 2);

  return Math.max(0, Math.min(100, Math.round(score)));
}

module.exports = {
  predictMonthEndSpend,
  detectAnomalies,
  calculateFinancialScore
};
