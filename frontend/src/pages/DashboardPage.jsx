import { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  Wallet,
  TrendingUp,
  CreditCard,
  Target,
  AlertCircle,
} from "lucide-react";
import api from "../api/client";
import StatCard from "../components/StatCard";
import ChartsPanel from "../components/ChartsPanel";
import PageHeader from "../components/PageHeader";
import { getApiErrorMessage } from "../utils/apiError";

function DashboardPage() {
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const [dashboard, setDashboard] = useState(null);
  const [budget, setBudget] = useState({
    totalBudget: "",
    categoryBudgets: {},
  });
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadDashboard() {
      try {
        setError("");
        const [{ data: dash }, { data: budgetStatus }] = await Promise.all([
          api.get("/dashboard", { params: { month } }),
          api
            .get("/budget", { params: { month } })
            .catch(() => ({ data: null })),
        ]);

        if (isCancelled) return;

        setDashboard(dash);
        if (budgetStatus) {
          setBudget({
            totalBudget: budgetStatus.totalBudget || "",
            categoryBudgets: Object.fromEntries(
              (budgetStatus.categoryStatus || []).map((status) => [
                status.category,
                status.budget,
              ]),
            ),
          });
        }
      } catch (err) {
        if (!isCancelled) {
          setError(getApiErrorMessage(err, "Could not load the dashboard."));
        }
      }
    }

    loadDashboard();
    return () => {
      isCancelled = true;
    };
  }, [month]);

  const saveBudget = async (e) => {
    e.preventDefault();
    try {
      setError("");
      await api.post("/budget", {
        month,
        totalBudget: Number(budget.totalBudget),
        categoryBudgets: budget.categoryBudgets,
      });
      const [{ data: dash }, { data: budgetStatus }] = await Promise.all([
        api.get("/dashboard", { params: { month } }),
        api.get("/budget", { params: { month } }).catch(() => ({ data: null })),
      ]);
      setDashboard(dash);
      if (budgetStatus) {
        setBudget({
          totalBudget: budgetStatus.totalBudget || "",
          categoryBudgets: Object.fromEntries(
            (budgetStatus.categoryStatus || []).map((status) => [
              status.category,
              status.budget,
            ]),
          ),
        });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not save the budget."));
    }
  };

  if (!dashboard && !error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] animate-fade">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-[var(--text-muted)]">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  const budgetUsage = budget.totalBudget
    ? (dashboard?.totalSpend / Number(budget.totalBudget || 1)) * 100
    : 0;

  return (
    <div className="space-y-6 animate-fade">
      <PageHeader
        title="Dashboard"
        subtitle="Track spending, monitor risk, and keep your budget on course."
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
        <div className="flex items-center gap-2 p-4 rounded-xl bg-[var(--rose-light)] text-[var(--rose)] text-sm animate-slide">
          <AlertCircle size={16} />
          <p>{error}</p>
        </div>
      ) : null}

      {dashboard ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              title="Monthly Spend"
              value={`₹${dashboard.totalSpend.toFixed(2)}`}
              hint={`${dashboard.transactionCount} transactions`}
              icon={Wallet}
              className="mc-stagger-1"
            />
            <StatCard
              title="Month End Projection"
              value={`₹${dashboard.prediction.toFixed(2)}`}
              hint="Based on current burn rate"
              tone="warning"
              icon={TrendingUp}
              className="mc-stagger-2"
            />
            <StatCard
              title="Active Subscriptions"
              value={`${dashboard.subscriptions.length}`}
              hint="Recurring services detected"
              icon={CreditCard}
              className="mc-stagger-3"
            />
            <StatCard
              title="Budget Usage"
              value={`${budgetUsage.toFixed(1)}%`}
              hint={budgetUsage > 100 ? "Budget exceeded" : "Within limit"}
              tone={budgetUsage > 100 ? "danger" : "default"}
              icon={Target}
              className="mc-stagger-4"
            />
          </div>

          <ChartsPanel
            categoryTotals={dashboard.categoryTotals}
            dailyTrend={dashboard.dailyTrend}
          />

          <section className="mc-card p-5 md:p-6 animate-slide">
            <h3 className="mc-section-title">Budget Planner</h3>
            <p className="mc-section-subtitle mb-4">
              Set your monthly cap and keep this score under 100%.
            </p>
            <form
              className="flex flex-col sm:flex-row gap-3"
              onSubmit={saveBudget}
            >
              <input
                type="number"
                placeholder="Total monthly budget"
                className="mc-input sm:max-w-xs"
                value={budget.totalBudget}
                onChange={(e) =>
                  setBudget((s) => ({ ...s, totalBudget: e.target.value }))
                }
              />
              <button className="mc-btn whitespace-nowrap">Save Target</button>
            </form>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="mc-card p-5 animate-slide">
              <h3 className="mc-section-title mb-4">Top Categories</h3>
              <div className="space-y-3">
                {dashboard.topCategories.length ? (
                  dashboard.topCategories.map((item) => (
                    <div
                      key={item.category}
                      className="flex items-center justify-between rounded-xl bg-[var(--bg-base)] border border-[var(--border-light)] px-4 py-3"
                    >
                      <p className="font-medium text-[var(--text-primary)]">
                        {item.category}
                      </p>
                      <p className="font-semibold">₹{item.total.toFixed(2)}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[var(--text-muted)] text-sm border border-dashed border-[var(--border)] rounded-xl">
                    No spending data for this month yet
                  </div>
                )}
              </div>
            </div>

            <div className="mc-card p-5 animate-slide">
              <h3 className="mc-section-title mb-4">Detected Subscriptions</h3>
              <div className="space-y-3">
                {dashboard.subscriptions.length ? (
                  dashboard.subscriptions.slice(0, 5).map((item) => (
                    <div
                      key={`${item.description}-${item.renewalDate}`}
                      className="flex items-center justify-between rounded-xl bg-[var(--bg-base)] border border-[var(--border-light)] px-4 py-3"
                    >
                      <div>
                        <p className="font-medium capitalize text-[var(--text-primary)]">
                          {item.description}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          Renews {item.renewalDate}
                        </p>
                      </div>
                      <p className="font-semibold">
                        ₹{item.monthlyCost.toFixed(2)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[var(--text-muted)] text-sm border border-dashed border-[var(--border)] rounded-xl">
                    No recurring subscriptions detected
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

export default DashboardPage;
