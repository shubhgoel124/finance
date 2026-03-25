import { useRef, useState } from "react";
import dayjs from "dayjs";
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import api from "../api/client";
import PageHeader from "../components/PageHeader";
import { getApiErrorMessage } from "../utils/apiError";

const categories = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Subscriptions",
  "Other",
];
const maxUploadSizeMb = Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB || 5);

function AddExpensePage() {
  const [form, setForm] = useState({
    amount: "",
    category: "",
    description: "",
    date: dayjs().format("YYYY-MM-DD"),
  });
  const [quickAdd, setQuickAdd] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const messageRef = useRef(null);

  const clearAlerts = () => {
    setMessage("");
    setError("");
  };

  const submitManual = async (e) => {
    e.preventDefault();
    clearAlerts();
    try {
      const { data } = await api.post("/transactions", {
        ...form,
        amount: Number(form.amount),
      });
      setMessage(data.warning || "Manual expense added successfully.");
      setForm({
        amount: "",
        category: "",
        description: "",
        date: dayjs().format("YYYY-MM-DD"),
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not add the expense."));
    }
  };

  const submitQuick = async (e) => {
    e.preventDefault();
    clearAlerts();
    try {
      const { data } = await api.post("/transactions", { quickAdd });
      setMessage(data.warning || "Quick expense parsed and added.");
      setQuickAdd("");
    } catch (err) {
      setError(
        getApiErrorMessage(err, "Could not parse and save the expense."),
      );
    }
  };

  const processFile = (fileToProcess) => {
    if (!fileToProcess) return;

    setFile(fileToProcess);
    clearAlerts();
    setUploadProgress(0);

    if (fileToProcess.size > maxUploadSizeMb * 1024 * 1024) {
      setError(
        `File is too large (max ${maxUploadSizeMb}MB). Please split your statement.`,
      );
      setFile(null);
    }
  };

  const submitCsv = async (e) => {
    e.preventDefault();
    clearAlerts();
    setUploadProgress(0);

    if (!file) {
      setError("Please select a CSV or Excel file first.");
      return;
    }
    if (!file.name.match(/\.(csv|xlsx|xls)$/i)) {
      setError("File must be a .csv or .xlsx file.");
      return;
    }

    const data = new FormData();
    data.append("file", file);
    try {
      setIsUploading(true);
      const res = await api.post("/upload", data, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(
              Math.round((progressEvent.loaded * 100) / progressEvent.total),
            );
          }
        },
      });

      const importedCount = Number(res.data.count || 0);
      const skippedCount = Number(res.data.skippedCount || 0);
      const duplicateCount = Number(res.data.duplicateCount || 0);
      const warning = res.data.warning ? ` ${res.data.warning}` : "";
      const summaryParts = [
        importedCount === 0 && res.data.message
          ? res.data.message
          : `Imported ${importedCount} transaction${importedCount === 1 ? "" : "s"} successfully.`,
      ];

      if (skippedCount > 0)
        summaryParts.push(`Skipped ${skippedCount} un-matched rows.`);
      if (duplicateCount > 0)
        summaryParts.push(`Ignored ${duplicateCount} duplicates.`);

      setMessage(summaryParts.join(" ") + warning);
      setFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          "Statement upload failed. Please verify the file format.",
        ),
      );
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
      setTimeout(() => {
        if (messageRef.current)
          messageRef.current.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
      }, 100);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6 animate-fade">
      <PageHeader
        title="Track Expenses"
        subtitle="Capture transactions with manual entry, natural language, or bank statement uploads."
      />

      <div ref={messageRef} />
      {message ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--emerald-light)] text-[var(--emerald)] text-sm animate-slide">
          <CheckCircle2 size={18} />
          <p className="font-medium">{message}</p>
        </div>
      ) : null}
      {error ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--rose-light)] text-[var(--rose)] text-sm animate-slide">
          <AlertCircle size={18} />
          <p className="font-medium">{error}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <form
          onSubmit={submitManual}
          className="mc-card p-6 space-y-4 mc-stagger-1"
        >
          <div>
            <h3 className="text-lg font-bold">Manual Entry</h3>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Add a single transaction
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              Amount (₹)
            </label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              className="mc-input"
              value={form.amount}
              onChange={(e) =>
                setForm((s) => ({ ...s, amount: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              Category
            </label>
            <select
              className="mc-input bg-white"
              value={form.category}
              onChange={(e) =>
                setForm((s) => ({ ...s, category: e.target.value }))
              }
            >
              <option value="">Auto-detect via AI</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              Description
            </label>
            <input
              required
              placeholder="Merchant or item name"
              className="mc-input"
              value={form.description}
              onChange={(e) =>
                setForm((s) => ({ ...s, description: e.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              Date
            </label>
            <input
              type="date"
              required
              className="mc-input"
              value={form.date}
              onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
            />
          </div>

          <div className="pt-2">
            <button className="mc-btn w-full">Save Expense</button>
          </div>
        </form>

        <div className="space-y-5">
          <form
            onSubmit={submitQuick}
            className="mc-card p-6 space-y-4 mc-stagger-2"
          >
            <div>
              <h3 className="text-lg font-bold">Natural Language Parsing</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Let AI extract the details for you
              </p>
            </div>
            <div className="space-y-3">
              <input
                required
                placeholder="e.g. Swiggy 300 yesterday"
                className="mc-input"
                value={quickAdd}
                onChange={(e) => setQuickAdd(e.target.value)}
              />
              <button className="mc-btn-ghost w-full">Parse & Save</button>
            </div>
          </form>

          <form
            onSubmit={submitCsv}
            className="mc-card p-6 space-y-4 mc-stagger-3"
          >
            <div>
              <h3 className="text-lg font-bold">Statement Upload</h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Bulk import via CSV or Excel
              </p>
            </div>

            <div
              className={`mc-dropzone mt-4 ${isDragOver ? "dragover" : ""}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => processFile(e.target.files?.[0])}
              />
              <div className="flex flex-col items-center justify-center space-y-3 pt-2 pb-2 pointer-events-none">
                {file ? (
                  <>
                    <div className="w-12 h-12 bg-[var(--accent-light)] rounded-full flex items-center justify-center">
                      <FileSpreadsheet
                        size={24}
                        className="text-[var(--accent)]"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold">{file.name}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {(file.size / 1024).toFixed(1)} KB • Click to replace
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-[var(--bg-muted)] rounded-full flex items-center justify-center">
                      <UploadCloud
                        size={24}
                        className="text-[var(--text-secondary)]"
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold">
                        Click to browse or drag file here
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[200px] mx-auto">
                        Supports standard bank formats, UPI, Paytm, and custom
                        CSVs.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {isUploading && (
              <div className="space-y-2 mt-4 animate-fade">
                <div className="flex justify-between text-xs font-semibold text-[var(--text-secondary)]">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="mc-progress-track">
                  <div
                    className="mc-progress-fill"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="mc-btn w-full"
                disabled={!file || isUploading}
              >
                {isUploading ? "Processing..." : "Import Statement"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddExpensePage;
