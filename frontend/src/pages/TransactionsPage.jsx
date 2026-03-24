import { useEffect, useState } from "react";
import dayjs from "dayjs";
import { Download, AlertCircle } from "lucide-react";
import api from "../api/client";
import TransactionTable from "../components/TransactionTable";
import PageHeader from "../components/PageHeader";
import { getApiErrorMessage } from "../utils/apiError";

function TransactionsPage() {
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadTransactions() {
      try {
        setError("");
        const { data } = await api.get("/transactions", { params: { month } });
        if (!isCancelled) {
          setTransactions(data);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(getApiErrorMessage(err, "Could not load transactions."));
        }
      }
    }

    loadTransactions();

    return () => {
      isCancelled = true;
    };
  }, [month]);

  const onDelete = async (id) => {
    try {
      setError("");
      await api.delete(`/transactions/${id}`);
      setTransactions((prev) => prev.filter((tx) => tx._id !== id));
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not delete the transaction."));
    }
  };

  const exportCsv = async () => {
    try {
      setError("");
      const response = await api.get("/transactions/export", {
        params: { month },
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `transactions-${month}.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not export transactions."));
    }
  };

  return (
    <div className="space-y-6 animate-fade">
      <PageHeader
        title="Transactions"
        subtitle={`Viewing ${transactions.length} record${transactions.length === 1 ? "" : "s"} for this month.`}
        right={
          <div className="flex items-center gap-3">
            <input 
              type="month" 
              value={month} 
              onChange={(e) => setMonth(e.target.value)} 
              className="mc-input md:w-[160px]" 
            />
            <button 
              onClick={exportCsv} 
              className="mc-btn whitespace-nowrap"
              disabled={transactions.length === 0}
            >
              <Download size={16} />
              Export
            </button>
          </div>
        }
      />
      
      {error ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--rose-light)] text-[var(--rose)] text-sm animate-slide">
          <AlertCircle size={18} />
          <p className="font-medium">{error}</p>
        </div>
      ) : null}
      
      <TransactionTable transactions={transactions} onDelete={onDelete} />
    </div>
  );
}

export default TransactionsPage;
