const dayjs = require("dayjs");
const { getDashboardSummary, getMonthlyTransactions } = require("../services/analyticsService");
const { detectSubscriptions } = require("../services/subscriptionService");
const { detectAnomalies, predictMonthEndSpend } = require("../services/advancedAnalyticsService");

async function getDashboard(req, res, next) {
  try {
    const userId = req.user.id;
    const month = req.query.month || dayjs().format("YYYY-MM");

    const [summary, monthlyTransactions] = await Promise.all([
      getDashboardSummary(userId, month),
      getMonthlyTransactions(userId, month)
    ]);

    const subscriptions = detectSubscriptions(monthlyTransactions);
    const anomalies = detectAnomalies(monthlyTransactions);
    const now = dayjs();
    const prediction = predictMonthEndSpend(summary.totalSpend, now.date(), now.daysInMonth());

    return res.json({
      ...summary,
      subscriptions,
      anomalies,
      prediction
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getDashboard
};
