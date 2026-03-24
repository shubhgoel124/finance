const dayjs = require("dayjs");

function normalize(text = "") {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function detectSubscriptions(transactions) {
  const grouped = transactions.reduce((acc, tx) => {
    const key = normalize(tx.description);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(tx);
    return acc;
  }, {});

  const subscriptions = [];

  for (const [description, items] of Object.entries(grouped)) {
    if (items.length < 2) {
      continue;
    }

    const sorted = [...items].sort((a, b) => new Date(a.date) - new Date(b.date));
    const gaps = [];
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = dayjs(sorted[i - 1].date);
      const curr = dayjs(sorted[i].date);
      gaps.push(curr.diff(prev, "day"));
    }

    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / (gaps.length || 1);
    const isMonthly = avgGap >= 25 && avgGap <= 35;

    if (isMonthly) {
      const monthlyCost = sorted.reduce((sum, item) => sum + item.amount, 0) / sorted.length;
      const lastDate = dayjs(sorted[sorted.length - 1].date);
      subscriptions.push({
        description,
        monthlyCost: Number(monthlyCost.toFixed(2)),
        renewalDate: lastDate.add(30, "day").format("YYYY-MM-DD")
      });
    }
  }

  return subscriptions.sort((a, b) => b.monthlyCost - a.monthlyCost);
}

module.exports = {
  detectSubscriptions
};
