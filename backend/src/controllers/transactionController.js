const dayjs = require("dayjs");
const customParseFormat = require("dayjs/plugin/customParseFormat");
const path = require("path");
const { parse } = require("csv-parse/sync");
const XLSX = require("xlsx");
const Transaction = require("../models/Transaction");
const { categorizeDescription } = require("../services/categorizationService");
const parseQuickAdd = require("../utils/quickAddParser");
const { generateEmbedding } = require("../services/embeddingService");
const { upsertVectors } = require("../services/vectorStoreService");
const { clearInsightCacheForMonths } = require("../services/insightCacheService");

dayjs.extend(customParseFormat);

function getRowValue(row, keys) {
  const normalizedMap = Object.entries(row).reduce((acc, [key, value]) => {
    acc[String(key).toLowerCase().trim()] = value;
    return acc;
  }, {});

  for (const key of keys) {
    const value = normalizedMap[key.toLowerCase()];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
}

function parseAmount(raw) {
  if (raw === null || raw === undefined) {
    return NaN;
  }

  let cleaned = String(raw).trim();
  if (!cleaned) {
    return NaN;
  }

  const isNegative = /^\(.*\)$/.test(cleaned) || cleaned.startsWith("-");

  cleaned = cleaned
    .replace(/^\((.*)\)$/, "$1")
    .replace(/[₹$€£\s]/g, "")
    .replace(/(cr|dr|credit|debit)$/i, "")
    .trim();

  if (!cleaned) {
    return NaN;
  }

  if (cleaned.includes(",") && cleaned.includes(".")) {
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (cleaned.includes(",") && !cleaned.includes(".")) {
    const parts = cleaned.split(",");
    cleaned = parts.length === 2 && parts[1].length <= 2 ? parts.join(".") : parts.join("");
  }

  const parsed = Number(cleaned);
  return isNegative ? parsed * -1 : parsed;
}

function normalizeDescription(description) {
  return String(description || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function transactionSignature(transaction) {
  return [
    dayjs(transaction.date).format("YYYY-MM-DD"),
    normalizeDescription(transaction.description),
    Number(transaction.amount).toFixed(2)
  ].join("|");
}

function getTransactionMonth(date) {
  return dayjs(date).format("YYYY-MM");
}

function decodeCsvBuffer(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    return String(buffer || "");
  }

  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString("utf16le").replace(/^\uFEFF/, "");
  }

  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const swapped = Buffer.from(buffer);
    swapped.swap16();
    return swapped.toString("utf16le").replace(/^\uFEFF/, "");
  }

  const sample = buffer.subarray(0, Math.min(buffer.length, 128));
  const hasNullBytes = sample.includes(0);
  if (hasNullBytes) {
    return buffer.toString("utf16le").replace(/^\uFEFF/, "");
  }

  return buffer.toString("utf8").replace(/^\uFEFF/, "");
}

function parseDateValue(raw) {
  if (!raw) {
    return null;
  }

  const value = String(raw).trim();

  // Excel serial date support (commonly seen in exported statements)
  if (/^\d{5,}$/.test(value)) {
    const serial = Number(value);
    if (Number.isFinite(serial)) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const millis = excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000;
      const excelDate = new Date(millis);
      if (!Number.isNaN(excelDate.getTime())) {
        return excelDate;
      }
    }
  }

  const formats = ["YYYY-MM-DD", "DD-MM-YYYY", "DD/MM/YYYY", "MM/DD/YYYY", "YYYY/MM/DD", "DD MMM YYYY"];

  for (const fmt of formats) {
    const parsed = dayjs(raw, fmt, true);
    if (parsed.isValid()) {
      return parsed.toDate();
    }
  }

  const fallback = new Date(raw);
  if (!Number.isNaN(fallback.getTime())) {
    return fallback;
  }

  return null;
}

function normalizeCsvRow(row) {
  // --- Paytm Status filter: skip FAILED transactions ---
  const status = getRowValue(row, ["status", "transaction status"]);
  if (status && /fail|rejected|cancelled|pending/i.test(status)) {
    return null;
  }

  // --- Paytm "Paid To/Received From" filter: skip received (income) ---
  const paidDirection = getRowValue(row, ["paid to/received from", "paid to / received from"]);
  if (paidDirection && /received/i.test(paidDirection)) {
    return null;
  }

  // --- Description: try many column variants including Paytm-specific ---
  let description = getRowValue(row, [
    "description",
    "transaction description",
    "narration",
    "particulars",
    "transaction particulars",
    "details",
    "transaction details",
    "merchant",
    "payee",
    "reference",
    "remark",
    "remarks",
    "transaction remarks",                   // Paytm Bank Statement
    "activity",                              // Paytm Wallet History
    "transaction details",                   // Paytm Passbook Payment History (real format)
    "name of person/business",               // Paytm UPI Statement
    "name of person / business",
    "name",
    "beneficiary",
    "receiver name",
    "sender name",
    "comment",                               // Paytm Wallet (fallback)
    "notes/tags",                            // Paytm UPI (fallback)
    "notes",
    "tags"
  ]);

  // Paytm: merge description with comment/notes for richer context
  if (description) {
    const nameCol = getRowValue(row, ["name of person/business", "name of person / business", "transaction details"]);
    const notesCol = getRowValue(row, ["notes/tags", "notes", "comment", "remarks"]);
    if (nameCol && notesCol && nameCol !== notesCol && description === nameCol) {
      description = `${nameCol} - ${notesCol}`;
    }
  }

  // --- Skip income/received rows based on description ---
  if (description && /^(received from|money received|cashback|refund from)/i.test(description)) {
    return null;
  }

  // --- Date ---
  const dateRaw = getRowValue(row, [
    "date",
    "posted date",
    "posting date",
    "transactiondate",
    "transaction date",
    "txn date",
    "value date"
  ]);
  const parsedDate = parseDateValue(dateRaw);

  // --- Amount parsing: handle all variants ---
  const directAmount = parseAmount(
    getRowValue(row, [
      "amount",
      "transaction amount",
      "transaction amount (inr)",
      "txn amount",
      "amt"
    ])
  );

  const txnType = getRowValue(row, [
    "type", "transaction type", "txn type", "dr/cr", "drcr"
  ]).toLowerCase();

  const debitAmount = parseAmount(
    getRowValue(row, [
      "debit",
      "withdrawal",
      "withdrawal amt",
      "withdrawal amount",
      "withdrawal amount (inr)",             // Paytm Bank Statement
      "dr",
      "dr amount"
    ])
  );
  const creditAmount = parseAmount(
    getRowValue(row, [
      "credit",
      "deposit",
      "deposit amt",
      "deposit amount",
      "deposit amount (inr)",                // Paytm Bank Statement
      "cr",
      "cr amount"
    ])
  );

  // Prefer debit/withdrawal columns when available, since app tracks expenses.
  let amount = Number.isFinite(debitAmount) && debitAmount > 0 ? debitAmount : directAmount;

  if (Number.isFinite(directAmount) && directAmount < 0) {
    amount = Math.abs(directAmount);
  }

  // Paytm UPI: "Amount" column + "Transaction Type" = DEBIT/CREDIT
  if (Number.isFinite(directAmount) && directAmount > 0 && ["dr", "debit", "withdrawal"].includes(txnType)) {
    amount = directAmount;
  }

  // Skip credit/income rows
  if (Number.isFinite(directAmount) && ["cr", "credit", "deposit", "received"].includes(txnType)) {
    return null;
  }

  // If only credit exists and no debit/direct amount, skip as non-expense transaction.
  if ((!Number.isFinite(amount) || amount <= 0) && Number.isFinite(creditAmount) && creditAmount > 0) {
    return null;
  }

  if (!description || !parsedDate || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return {
    amount: Math.abs(amount),
    description,
    date: parsedDate
  };
}

function scoreParsedRows(rows) {
  if (!rows.length) {
    return 1;
  }

  const firstRowKeys = Object.keys(rows[0] || {});
  const joinedKeys = firstRowKeys.join(" ");
  const looksCollapsed = firstRowKeys.length <= 1 && /[,;\t|]/.test(joinedKeys);
  const hasUsefulHeaders = /(date|description|narration|amount|debit|credit|activity|withdrawal|transaction remarks|transaction details|name of person)/i.test(joinedKeys);

  return rows.length * 10 + firstRowKeys.length * 5 + (hasUsefulHeaders ? 25 : 0) - (looksCollapsed ? 50 : 0);
}

function parseCsvRows(csvBuffer) {
  const csvText = decodeCsvBuffer(csvBuffer);
  const baseOptions = {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_column_count: true,
    skip_records_with_error: true,
    relax_quotes: true
  };

  let bestRows = [];
  let bestScore = Number.NEGATIVE_INFINITY;
  let lastError = null;

  for (const delimiter of [",", ";", "\t", "|"]) {
    try {
      const rows = parse(csvText, { ...baseOptions, delimiter });
      const score = scoreParsedRows(rows);
      if (score > bestScore) {
        bestRows = rows;
        bestScore = score;
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (bestScore > Number.NEGATIVE_INFINITY) {
    return bestRows;
  }

  throw lastError || new Error("Unable to parse CSV file");
}

function parseXlsxRows(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  if (!workbook.SheetNames.length) {
    throw new Error("No sheets found in the Excel file.");
  }

  // Try all sheets and pick the one with the best score (most usable data)
  let bestRows = [];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: "",
      raw: false
    });
    if (!rows.length) {
      continue;
    }
    const score = scoreParsedRows(rows);
    if (score > bestScore) {
      bestRows = rows;
      bestScore = score;
    }
  }

  if (!bestRows.length) {
    throw new Error("No usable data found in any sheet.");
  }

  return bestRows;
}

function parseUploadedFile(file) {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (ext === ".xlsx" || ext === ".xls") {
    return parseXlsxRows(file.buffer);
  }
  return parseCsvRows(file.buffer);
}

async function safeIndexTransactions(userId, transactions) {
  try {
    const vectors = [];

    for (const tx of transactions) {
      const vector = await generateEmbedding(`${tx.description} ${tx.category} ${tx.amount}`);
      if (!vector?.length) {
        continue;
      }

      vectors.push({
        id: String(tx._id),
        vector,
        metadata: {
          userId: String(userId),
          transactionId: String(tx._id),
          description: tx.description,
          category: tx.category,
          amount: tx.amount,
          date: dayjs(tx.date).format("YYYY-MM-DD")
        }
      });
    }

    if (vectors.length) {
      await upsertVectors(userId, vectors);
    }

    return null;
  } catch (error) {
    console.warn(`[transactions] AI indexing skipped: ${error.message}`);
    return "Transactions were saved, but AI search indexing is temporarily unavailable.";
  }
}

async function createTransaction(req, res, next) {
  try {
    const userId = req.user.id;
    const { amount, category, description, date, quickAdd } = req.body;

    let payload = {
      amount,
      category,
      description,
      date
    };

    if (quickAdd) {
      const parsed = parseQuickAdd(quickAdd);
      if (!parsed) {
        return res.status(400).json({ message: "Could not parse quick add input" });
      }
      payload = {
        ...payload,
        ...parsed,
        category: payload.category || (await categorizeDescription(parsed.description))
      };
    }

    if (!payload.amount || !payload.description || !payload.date) {
      return res.status(400).json({ message: "amount, description, and date are required" });
    }

    const resolvedCategory = payload.category || (await categorizeDescription(payload.description));

    const transaction = await Transaction.create({
      userId,
      amount: Number(payload.amount),
      category: resolvedCategory,
      description: payload.description,
      date: new Date(payload.date),
      source: "manual"
    });

    const indexingWarning = await safeIndexTransactions(userId, [transaction]);

    const responsePayload = transaction.toObject ? transaction.toObject() : transaction;
    if (indexingWarning) {
      responsePayload.warning = indexingWarning;
    }

    clearInsightCacheForMonths(userId, [getTransactionMonth(transaction.date)]);
    return res.status(201).json(responsePayload);
  } catch (error) {
    return next(error);
  }
}

async function uploadTransactions(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    let rows;
    try {
      rows = parseUploadedFile(req.file);
    } catch (error) {
      error.status = 400;
      error.message = "Unable to parse file. Use a CSV or Excel statement export with date, description, and amount/debit columns.";
      throw error;
    }

    const userId = req.user.id;
    const normalized = [];
    const seenRows = new Set();
    let skippedDuplicateRows = 0;

    // First pass: normalize and deduplicate rows
    const pendingRows = [];
    for (const row of rows) {
      const normalizedRow = normalizeCsvRow(row);
      if (!normalizedRow) {
        continue;
      }

      const signature = transactionSignature(normalizedRow);
      if (seenRows.has(signature)) {
        skippedDuplicateRows += 1;
        continue;
      }
      seenRows.add(signature);
      pendingRows.push(normalizedRow);
    }

    // Second pass: Categorize unique descriptions
    const categoryCache = new Map();
    for (const row of pendingRows) {
      if (!categoryCache.has(row.description)) {
        // Fallback to naive rule-based quickly if there are many unique rows (speed optimization)
        const category = await categorizeDescription(row.description);
        categoryCache.set(row.description, category);
      }
      
      normalized.push({
        userId,
        amount: row.amount,
        category: categoryCache.get(row.description),
        description: row.description,
        date: row.date,
        source: "csv"
      });
    }

    if (!normalized.length) {
      return res.status(400).json({
        message:
          "No valid expense rows found. Ensure CSV includes date, description/narration, and amount/debit columns with positive values."
      });
    }

    const normalizedDates = normalized.map((item) => item.date.getTime());
    const existingTransactions = await Transaction.find(
      {
        userId,
        date: {
          $gte: new Date(Math.min(...normalizedDates)),
          $lte: new Date(Math.max(...normalizedDates))
        }
      },
      { amount: 1, description: 1, date: 1 }
    ).lean();

    const existingSignatures = new Set(existingTransactions.map((item) => transactionSignature(item)));
    const recordsToInsert = normalized.filter((item) => !existingSignatures.has(transactionSignature(item)));
    const skippedExistingRows = normalized.length - recordsToInsert.length;

    if (!recordsToInsert.length) {
      return res.json({
        message: "All valid rows in this CSV already exist in your transactions.",
        count: 0,
        skippedCount: rows.length,
        duplicateCount: skippedDuplicateRows + skippedExistingRows
      });
    }

    const inserted = await Transaction.insertMany(recordsToInsert, { ordered: true });
    const indexingWarning = await safeIndexTransactions(userId, inserted);
    const impactedMonths = Array.from(new Set(inserted.map((item) => getTransactionMonth(item.date))));

    clearInsightCacheForMonths(userId, impactedMonths);

    return res.json({
      count: inserted.length,
      skippedCount: Math.max(rows.length - inserted.length, 0),
      duplicateCount: skippedDuplicateRows + skippedExistingRows,
      warning: indexingWarning || undefined,
      transactions: inserted
    });
  } catch (error) {
    return next(error);
  }
}

async function listTransactions(req, res, next) {
  try {
    const userId = req.user.id;
    const { month, category, source } = req.query;
    const query = { userId };

    if (month) {
      const start = dayjs(`${month}-01`).startOf("month").toDate();
      const end = dayjs(`${month}-01`).endOf("month").toDate();
      query.date = { $gte: start, $lte: end };
    }

    if (category) {
      query.category = category;
    }

    if (source) {
      query.source = source;
    }

    const transactions = await Transaction.find(query).sort({ date: -1 }).lean();
    return res.json(transactions);
  } catch (error) {
    return next(error);
  }
}

async function updateTransaction(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const existing = await Transaction.findOne({ _id: id, userId }).lean();

    if (!existing) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const tx = await Transaction.findOneAndUpdate({ _id: id, userId }, req.body, {
      returnDocument: "after",
      runValidators: true
    });

    clearInsightCacheForMonths(userId, [getTransactionMonth(existing.date), getTransactionMonth(tx.date)]);

    return res.json(tx);
  } catch (error) {
    return next(error);
  }
}

async function deleteTransaction(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const tx = await Transaction.findOneAndDelete({ _id: id, userId });
    if (!tx) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    clearInsightCacheForMonths(userId, [getTransactionMonth(tx.date)]);
    return res.json({ message: "Deleted" });
  } catch (error) {
    return next(error);
  }
}

async function exportTransactions(req, res, next) {
  try {
    const userId = req.user.id;
    const { month } = req.query;
    const query = { userId };

    if (month) {
      query.date = {
        $gte: dayjs(`${month}-01`).startOf("month").toDate(),
        $lte: dayjs(`${month}-01`).endOf("month").toDate()
      };
    }

    const transactions = await Transaction.find(query).sort({ date: -1 }).lean();
    const header = "date,description,category,source,amount";
    const rows = transactions.map((tx) => {
      const safeDescription = String(tx.description || "").replace(/"/g, '""');
      return `${dayjs(tx.date).format("YYYY-MM-DD")},"${safeDescription}",${tx.category},${tx.source},${tx.amount}`;
    });

    const csv = [header, ...rows].join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=transactions-${month || "all"}.csv`);
    return res.send(csv);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createTransaction,
  uploadTransactions,
  listTransactions,
  updateTransaction,
  deleteTransaction,
  exportTransactions
};
