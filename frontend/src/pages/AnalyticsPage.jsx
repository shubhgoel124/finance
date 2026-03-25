import { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  TrendingUp,
  Target,
  AlertCircle,
  RefreshCw,
  Activity,
  ShieldAlert,
  Repeat,
  Zap,
  CheckCircle2,
} from "lucide-react";
import api from "../api/client";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { getApiErrorMessage } from "../utils/apiError";

function AnalyticsPage() {
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const [dashboard, setDashboard] = useState(null);
  const [insight, setInsight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadAnalytics() {
      try {
        setLoading(true);
        setError("");

        const [{ data: dashboardData }, { data: insightData }] =
          await Promise.all([
            api.get("/dashboard", { params: { month } }),
            api.post("/insights", { month }),
          ]);

        if (isCancelled) return;

        setDashboard(dashboardData);
        setInsight(insightData);
      } catch (err) {
        if (!isCancelled) {
          setError(getApiErrorMessage(err, "Could not load deep analytics."));
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadAnalytics();
    return () => {
      isCancelled = true;
    };
  }, [month]);

  const topCategory = dashboard?.topCategories?.[0];
  const topCategoryShare =
    topCategory && dashboard?.totalSpend
      ? ((topCategory.total / dashboard.totalSpend) * 100).toFixed(1)
      : "0.0";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] animate-fade">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={24} className="text-[var(--accent)] animate-spin" />
          <p className="text-sm text-[var(--text-muted)]">
            Crunching the numbers...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade">
      <PageHeader
        title="Deep Analytics"
        subtitle="Comprehensive review of risks, recurring costs, and category footprints."
        right={
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mc-input md:w-[160px]"
          />
        }
      />

      {error ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--rose-light)] text-[var(--rose)] text-sm animate-slide">
          <AlertCircle size={18} />
          <p className="font-medium">{error}</p>
        </div>
      ) : null}

      {!error && dashboard && insight ? (
        <>
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-slide mc-stagger-1">
            <StatCard
              title="Financial Score"
              value={`${insight.financialScore}/100`}
              icon={Activity}
              tone={
                insight.financialScore > 70
                  ? "success"
                  : insight.financialScore < 40
                    ? "danger"
                    : "warning"
              }
            />
            <StatCard
              title="Risk Level"
              value={insight.diagnostics?.riskLevel || "Low"}
              icon={ShieldAlert}
              tone={
                insight.diagnostics?.riskLevel === "High"
                  ? "danger"
                  : insight.diagnostics?.riskLevel === "Medium"
                    ? "warning"
                    : "success"
              }
            />
            <StatCard
              title="Projected End"
              value={`₹${Number(dashboard.prediction || 0).toFixed(0)}`}
              icon={TrendingUp}
              tone="default"
            />
            <StatCard
              title="Category Concentration"
              value={`${topCategoryShare}%`}
              hint={`${topCategory?.category || "Unknown"} driven`}
              icon={Target}
              tone={Number(topCategoryShare) > 40 ? "warning" : "success"}
            />
          </section>

          <section className="mc-card p-6 md:p-8 animate-slide mc-stagger-2 bg-[var(--accent)] text-white border-transparent">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-200" />
              Executive Readout
            </h3>
            <p className="text-lg leading-relaxed text-indigo-50">
              {insight.summary}
            </p>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-slide mc-stagger-3">
            <div className="mc-card p-6">
              <h3 className="mc-section-title flex items-center gap-2">
                <Target size={16} className="text-[var(--accent)]" />
                Largest Categories
              </h3>
              <p className="mc-section-subtitle mb-5">
                Where your money went this month.
              </p>

              <div className="space-y-1">
                {dashboard.topCategories.length ? (
                  dashboard.topCategories.map((item, index) => {
                    const percentage = dashboard.totalSpend
                      ? (item.total / dashboard.totalSpend) * 100
                      : 0;
                    return (
                      <div
                        key={item.category}
                        className="group flex flex-col pt-3 pb-3 border-b border-[var(--border-light)] last:border-0"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-[var(--text-primary)]">
                            {item.category}
                          </span>
                          <span className="font-bold">
                            ₹{Number(item.total).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="mc-progress-track h-2 bg-[var(--bg-muted)]">
                            <div
                              className="mc-progress-fill h-full rounded-full transition-all duration-1000 ease-out"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor:
                                  index === 0
                                    ? "var(--accent)"
                                    : "var(--border)",
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium text-[var(--text-muted)] w-10 text-right">
                            {percentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-[var(--text-muted)] p-5 border border-dashed rounded-xl text-center">
                    No category data yet.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="mc-card p-6 flex-1">
                <h3 className="mc-section-title flex items-center gap-2">
                  <Repeat size={16} className="text-indigo-500" />
                  Fixed Subscriptions
                </h3>
                <p className="mc-section-subtitle mb-4">
                  Recurring costs bound to repeat.
                </p>

                <ul className="space-y-2">
                  {dashboard.subscriptions.length ? (
                    dashboard.subscriptions.map((item) => (
                      <li
                        key={`${item.description}-${item.renewalDate}`}
                        className="flex justify-between items-center bg-[var(--bg-base)] rounded-xl border border-[var(--border-light)] p-3 hover:border-[var(--border)] transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                            <Repeat size={14} className="text-indigo-600" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold capitalize text-sm text-[var(--text-primary)] truncate block">
                              {item.description}
                            </span>
                            <span className="text-xs text-[var(--text-muted)]">
                              Renews {item.renewalDate}
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-sm shrink-0">
                          ₹{Number(item.monthlyCost).toFixed(2)}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-[var(--text-muted)] p-5 border border-dashed rounded-xl text-center">
                      No fixed subscriptions found.
                    </li>
                  )}
                </ul>
              </div>

              <div className="mc-card p-6 flex-1 border-amber-200">
                <h3 className="mc-section-title flex items-center gap-2 text-amber-900">
                  <AlertCircle size={16} className="text-amber-500" />
                  Anomaly Detection
                </h3>
                <p className="mc-section-subtitle mb-4">
                  Unusual spikes deserving review.
                </p>

                <ul className="space-y-2">
                  {dashboard.anomalies.length ? (
                    dashboard.anomalies.map((item) => (
                      <li
                        key={item._id}
                        className="flex justify-between items-center bg-amber-50/50 rounded-xl border border-amber-100 p-3 hover:border-amber-200 transition-colors"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                            <Zap size={14} className="text-amber-600" />
                          </div>
                          <span className="font-semibold text-sm text-amber-900 truncate">
                            {item.description}
                          </span>
                        </div>
                        <span className="font-bold text-sm text-amber-700 shrink-0">
                          ₹{Number(item.amount).toFixed(2)}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                      <CheckCircle2 size={16} />
                      No unusual spikes found this month. Great job!
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
import { Sparkles } from "lucide-react";
export default AnalyticsPage;
