const dayjs = require("dayjs");
const Insight = require("../models/Insight");
const Budget = require("../models/Budget");
const {
  getDashboardSummary,
  getMonthlyTransactions,
} = require("../services/analyticsService");
const { detectSubscriptions } = require("../services/subscriptionService");
const {
  predictMonthEndSpend,
  detectAnomalies,
  calculateFinancialScore,
} = require("../services/advancedAnalyticsService");
const { completeJson } = require("../services/llmService");
const {
  getInsightCache,
  setInsightCache,
} = require("../services/insightCacheService");

function safePercent(numerator, denominator) {
  if (!denominator) {
    return 0;
  }
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildDiagnostics({
  summary,
  previousSummary,
  budget,
  subscriptions,
  anomalies,
  prediction,
}) {
  const prevTotal = previousSummary?.totalSpend || 0;
  const monthOverMonthPct = prevTotal
    ? Number((((summary.totalSpend - prevTotal) / prevTotal) * 100).toFixed(2))
    : 0;

  const topCategory = summary.topCategories?.[0] || null;
  const topCategoryShare = topCategory
    ? safePercent(topCategory.total, summary.totalSpend)
    : 0;
  const subscriptionTotal = subscriptions.reduce(
    (sum, item) => sum + item.monthlyCost,
    0,
  );
  const subscriptionSharePct = safePercent(
    subscriptionTotal,
    summary.totalSpend,
  );
  const anomalySpend = anomalies.reduce((sum, item) => sum + item.amount, 0);

  const budgetUsagePct = budget?.totalBudget
    ? safePercent(summary.totalSpend, budget.totalBudget)
    : 0;
  const projectedBudgetUsagePct = budget?.totalBudget
    ? safePercent(prediction, budget.totalBudget)
    : 0;

  let riskLevel = "Low";
  if (
    projectedBudgetUsagePct > 100 ||
    anomalySpend > summary.totalSpend * 0.2
  ) {
    riskLevel = "High";
  } else if (
    projectedBudgetUsagePct > 90 ||
    topCategoryShare > 45 ||
    monthOverMonthPct > 20
  ) {
    riskLevel = "Medium";
  }

  return {
    monthOverMonthPct,
    topCategory: topCategory?.category || "Other",
    topCategoryShare,
    subscriptionTotal: Number(subscriptionTotal.toFixed(2)),
    subscriptionSharePct,
    anomalySpend: Number(anomalySpend.toFixed(2)),
    anomalyCount: anomalies.length,
    budgetUsagePct,
    projectedBudgetUsagePct,
    riskLevel,
  };
}

function buildFallbackActions({ summary, diagnostics, subscriptions, budget }) {
  const actions = [];

  if (diagnostics.projectedBudgetUsagePct > 100 && budget?.totalBudget) {
    actions.push({
      title: "Freeze discretionary spends for 7 days",
      reason: "Your projected spend is above budget this month.",
      estimatedMonthlySavings: Number((summary.totalSpend * 0.08).toFixed(2)),
      effort: "Medium",
      priority: "High",
    });
  }

  if (diagnostics.topCategoryShare > 35) {
    actions.push({
      title: `Set a weekly cap for ${diagnostics.topCategory}`,
      reason: `${diagnostics.topCategory} is consuming ${diagnostics.topCategoryShare}% of monthly spend.`,
      estimatedMonthlySavings: Number((summary.totalSpend * 0.06).toFixed(2)),
      effort: "Low",
      priority: diagnostics.topCategoryShare > 45 ? "High" : "Medium",
    });
  }

  if (subscriptions.length) {
    actions.push({
      title: "Trim or pause low-value subscriptions",
      reason: `You have ${subscriptions.length} recurring services active.`,
      estimatedMonthlySavings: Number(
        (diagnostics.subscriptionTotal * 0.3).toFixed(2),
      ),
      effort: "Low",
      priority: diagnostics.subscriptionSharePct > 20 ? "High" : "Medium",
    });
  }

  if (diagnostics.anomalyCount > 0) {
    actions.push({
      title: "Review unusual high-value transactions",
      reason:
        "Detected spending spikes that can often be deferred or replaced.",
      estimatedMonthlySavings: Number(
        (diagnostics.anomalySpend * 0.25).toFixed(2),
      ),
      effort: "Medium",
      priority: "Medium",
    });
  }

  if (!actions.length) {
    actions.push({
      title: "Create an automatic weekly savings transfer",
      reason:
        "A fixed transfer protects savings before discretionary spending begins.",
      estimatedMonthlySavings: Number(
        clamp(summary.totalSpend * 0.05, 300, 3000).toFixed(2),
      ),
      effort: "Low",
      priority: "Medium",
    });
  }

  return actions.slice(0, 4);
}

async function generateInsights(req, res, next) {
  try {
    const userId = req.user.id;
    const month = req.body.month || dayjs().format("YYYY-MM");

    const cached = getInsightCache(userId, month);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const previousMonth = dayjs(`${month}-01`)
      .subtract(1, "month")
      .format("YYYY-MM");

    const [summary, previousSummary, monthlyTransactions, budget] =
      await Promise.all([
        getDashboardSummary(userId, month),
        getDashboardSummary(userId, previousMonth),
        getMonthlyTransactions(userId, month),
        Budget.findOne({ userId, month }).lean(),
      ]);

    const subscriptions = detectSubscriptions(monthlyTransactions);
    const anomalies = detectAnomalies(monthlyTransactions);
    const now = dayjs();
    const prediction = predictMonthEndSpend(
      summary.totalSpend,
      now.date(),
      now.daysInMonth(),
    );

    const diagnostics = buildDiagnostics({
      summary,
      previousSummary,
      budget,
      subscriptions,
      anomalies,
      prediction,
    });

    const fallback = {
      summary: `You spent ${summary.totalSpend.toFixed(2)} this month across ${summary.transactionCount} transactions, with ${diagnostics.topCategory} contributing ${diagnostics.topCategoryShare}% of the total.`,
      wastefulPatterns: [
        diagnostics.monthOverMonthPct > 0
          ? `Spending increased by ${diagnostics.monthOverMonthPct}% versus last month.`
          : "Spending is stable versus last month.",
        diagnostics.topCategoryShare > 40
          ? `${diagnostics.topCategory} concentration is high (${diagnostics.topCategoryShare}%).`
          : "Category concentration is balanced.",
        anomalies.length
          ? `Detected ${anomalies.length} anomaly transactions totaling ${diagnostics.anomalySpend.toFixed(2)}.`
          : "No major anomalies detected.",
      ],
      suggestions: [
        "Set weekly caps for your top spending category.",
        "Review active subscriptions and cancel low-value ones.",
        "Use cashbacks/student discounts for food and travel expenses.",
      ],
      prioritizedActions: buildFallbackActions({
        summary,
        diagnostics,
        subscriptions,
        budget,
      }),
    };

    const llm = await completeJson({
      systemPrompt:
        "You are a financial coach for college students. Return strict JSON with keys: summary (string), wastefulPatterns (array of strings), suggestions (array of strings), prioritizedActions (array of objects). Each action object must include: title, reason, estimatedMonthlySavings, effort (Low|Medium|High), priority (Low|Medium|High). Keep outputs practical, numeric, and actionable.",
      userPrompt: JSON.stringify({
        month,
        previousMonth,
        totalSpend: summary.totalSpend,
        previousTotalSpend: previousSummary.totalSpend,
        transactionCount: summary.transactionCount,
        topCategories: summary.topCategories,
        categoryTotals: summary.categoryTotals,
        prediction,
        budget: budget || null,
        diagnostics,
        anomalies: anomalies.map((a) => ({
          amount: a.amount,
          description: a.description,
        })),
        subscriptions,
      }),
    });

    const data = {
      summary: llm?.summary || fallback.summary,
      wastefulPatterns: llm?.wastefulPatterns?.length
        ? llm.wastefulPatterns
        : fallback.wastefulPatterns,
      suggestions: llm?.suggestions?.length
        ? llm.suggestions
        : fallback.suggestions,
      prioritizedActions:
        llm?.prioritizedActions
          ?.filter((item) => item?.title && item?.reason)
          ?.slice(0, 4) || fallback.prioritizedActions,
    };

    const financialScore = calculateFinancialScore({
      budgetUsagePct: diagnostics.budgetUsagePct,
      savingsHintCount: data.suggestions.length,
      anomalyCount: anomalies.length,
      subscriptionLoad: subscriptions.reduce(
        (sum, s) => sum + s.monthlyCost,
        0,
      ),
    });

    const insight = await Insight.findOneAndUpdate(
      { userId, month },
      {
        ...data,
        financialScore,
        prediction,
        anomalyCount: anomalies.length,
        diagnostics,
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    const totalSavingsOpportunity = Number(
      (data.prioritizedActions || [])
        .reduce(
          (sum, item) => sum + Number(item.estimatedMonthlySavings || 0),
          0,
        )
        .toFixed(2),
    );

    const payload = {
      month,
      ...data,
      diagnostics,
      previousMonth,
      totalSavingsOpportunity,
      financialScore,
      prediction,
      anomalyCount: anomalies.length,
      subscriptions,
      cached: false,
      insightId: insight._id,
    };

    setInsightCache(userId, month, payload);
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  generateInsights,
};
