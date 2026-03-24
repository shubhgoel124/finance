const Budget = require("../models/Budget");
const { getDashboardSummary } = require("../services/analyticsService");
const { clearInsightCache } = require("../services/insightCacheService");

async function upsertBudget(req, res, next) {
  try {
    const userId = req.user.id;
    const { month, totalBudget, categoryBudgets = {} } = req.body;

    if (!month) {
      return res.status(400).json({ message: "month is required (YYYY-MM)" });
    }

    const budget = await Budget.findOneAndUpdate(
      { userId, month },
      { totalBudget: Number(totalBudget || 0), categoryBudgets },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    clearInsightCache(userId, month);
    return res.json(budget);
  } catch (error) {
    return next(error);
  }
}

async function getBudgetStatus(req, res, next) {
  try {
    const userId = req.user.id;
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({ message: "month query is required" });
    }

    const [budget, summary] = await Promise.all([
      Budget.findOne({ userId, month }).lean(),
      getDashboardSummary(userId, month)
    ]);

    const totalBudget = budget?.totalBudget || 0;
    const totalSpent = summary.totalSpend;
    const usagePct = totalBudget ? (totalSpent / totalBudget) * 100 : 0;

    const categoryStatus = Object.entries(summary.categoryTotals).map(([category, spent]) => {
      const target = budget?.categoryBudgets?.[category] || 0;
      const pct = target ? (spent / target) * 100 : 0;
      return {
        category,
        spent: Number(spent.toFixed(2)),
        budget: Number(target.toFixed(2)),
        usagePct: Number(pct.toFixed(2)),
        exceeded: pct > 100
      };
    });

    return res.json({
      month,
      totalBudget,
      totalSpent,
      usagePct: Number(usagePct.toFixed(2)),
      exceeded: usagePct > 100,
      categoryStatus
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  upsertBudget,
  getBudgetStatus
};
