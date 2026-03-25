import dayjs from "dayjs";
import { Trash2 } from "lucide-react";

const getCategoryColor = (category) => {
  const normalized = category.toLowerCase();
  if (normalized.includes("food") || normalized.includes("dining"))
    return "mc-badge-amber";
  if (normalized.includes("travel") || normalized.includes("transport"))
    return "mc-badge-indigo";
  if (normalized.includes("shopping") || normalized.includes("retail"))
    return "mc-badge-rose";
  if (normalized.includes("bill") || normalized.includes("utility"))
    return "mc-badge-emerald";
  return "mc-badge-default";
};

function TransactionTable({ transactions = [], onDelete }) {
  if (!transactions.length) {
    return (
      <div className="mc-card p-12 flex flex-col items-center justify-center text-center animate-slide">
        <div className="w-16 h-16 bg-[var(--bg-muted)] rounded-full flex items-center justify-center mb-4">
          <ReceiptText size={24} className="text-[var(--text-muted)]" />
        </div>
        <h3 className="text-base font-semibold">No transactions found</h3>
        <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm">
          Add an expense manually or upload a bank statement to see your history
          here.
        </p>
      </div>
    );
  }

  return (
    <div className="mc-card overflow-x-auto animate-slide">
      <table className="w-full text-sm text-left">
        <thead className="bg-[var(--bg-surface)] border-b border-[var(--border)] text-[var(--text-secondary)]">
          <tr>
            <th className="px-5 py-4 font-medium whitespace-nowrap">Date</th>
            <th className="px-5 py-4 font-medium">Description</th>
            <th className="px-5 py-4 font-medium whitespace-nowrap">
              Category
            </th>
            <th className="px-5 py-4 font-medium text-right whitespace-nowrap">
              Amount
            </th>
            <th className="px-5 py-4 font-medium text-center w-16"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-light)]">
          {transactions.map((tx) => (
            <tr
              key={tx._id}
              className="hover:bg-[var(--bg-surface-hover)] transition-colors group"
            >
              <td className="px-5 py-4 whitespace-nowrap text-[var(--text-secondary)]">
                {dayjs(tx.date).format("MMM DD, YYYY")}
              </td>
              <td className="px-5 py-4">
                <p className="font-medium text-[var(--text-primary)]">
                  {tx.description}
                </p>
                <p className="text-xs text-[var(--text-muted)] capitalize mt-0.5">
                  {tx.source}
                </p>
              </td>
              <td className="px-5 py-4 whitespace-nowrap">
                <span className={`mc-badge ${getCategoryColor(tx.category)}`}>
                  {tx.category}
                </span>
              </td>
              <td className="px-5 py-4 whitespace-nowrap text-right font-semibold">
                ₹{tx.amount.toFixed(2)}
              </td>
              <td className="px-5 py-4 text-center">
                <button
                  onClick={() => onDelete(tx._id)}
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--rose)] hover:bg-[var(--rose-light)] rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label="Delete transaction"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
import { ReceiptText } from "lucide-react";
export default TransactionTable;
