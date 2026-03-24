const dayjs = require("dayjs");
const Transaction = require("../models/Transaction");
const { generateEmbedding } = require("../services/embeddingService");
const { queryVectors } = require("../services/vectorStoreService");
const { completeJson } = require("../services/llmService");
const { getDashboardSummary } = require("../services/analyticsService");

const analyticsKeywords = [
  "analytics",
  "category",
  "categories",
  "breakdown",
  "where did i spend",
  "top spend",
  "most spent",
  "spending pattern",
  "how much did i spend",
  "total spend",
  "summary",
  "highest",
  "largest"
];

const adviceKeywords = [
  "habit",
  "habits",
  "advice",
  "what should i do",
  "should i",
  "suggest",
  "improve",
  "save more",
  "spending advice",
  "how can i",
  "recommendation",
  "tip",
  "tips",
  "how to save",
  "cut spending",
  "reduce spending",
  "spend less",
  "save",
  "cut costs",
  "lower spending"
];

const comparisonKeywords = ["compare", "vs", "versus", "difference", "change", "last month", "previous month"];

const stopWords = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "for",
  "to",
  "of",
  "in",
  "on",
  "my",
  "me",
  "i",
  "did",
  "do",
  "this",
  "that",
  "with",
  "was",
  "were",
  "is",
  "are",
  "it",
  "at",
  "be",
  "from",
  "show",
  "tell",
  "about"
]);

function getFocusMonth(query) {
  const lowerQuery = String(query || "").toLowerCase();

  if (lowerQuery.includes("last month") || lowerQuery.includes("previous month")) {
    return dayjs().subtract(1, "month").format("YYYY-MM");
  }

  const explicitMonth = lowerQuery.match(/\b(20\d{2})[-/](0[1-9]|1[0-2])\b/);
  if (explicitMonth) {
    return `${explicitMonth[1]}-${explicitMonth[2]}`;
  }

  const namedMonthMatch = lowerQuery.match(
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(20\d{2}))?\b/
  );

  if (namedMonthMatch) {
    const monthNumber = String(
      [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december"
      ].indexOf(namedMonthMatch[1]) + 1
    ).padStart(2, "0");
    const year = namedMonthMatch[2] || dayjs().format("YYYY");
    return `${year}-${monthNumber}`;
  }

  return dayjs().format("YYYY-MM");
}

function tokenizeQuery(query) {
  return Array.from(
    new Set(
      String(query || "")
        .toLowerCase()
        .match(/[a-z0-9]+/g) || []
    )
  ).filter((token) => token.length > 1 && !stopWords.has(token));
}

function normalizeContextItem(item) {
  if (!item) {
    return null;
  }

  return {
    description: item.description || item.metadata?.description || "Unknown transaction",
    category: item.category || item.metadata?.category || "Other",
    amount: Number(item.amount ?? item.metadata?.amount ?? 0),
    date: item.date || item.metadata?.date || null,
    score: Number((item.score || 0).toFixed(4))
  };
}

function scoreLexicalMatch(transaction, tokens) {
  if (!tokens.length) {
    return 0;
  }

  const haystack = `${transaction.description} ${transaction.category}`.toLowerCase();
  const tokenMatches = tokens.reduce((score, token) => (haystack.includes(token) ? score + 3 : score), 0);
  const recencyScore = Math.max(0, 30 - Math.min(dayjs().diff(dayjs(transaction.date), "day"), 30)) / 30;

  return tokenMatches + recencyScore;
}

function detectIntent(query) {
  const lowerQuery = String(query || "").toLowerCase();

  return {
    analytics: analyticsKeywords.some((keyword) => lowerQuery.includes(keyword)),
    advice: adviceKeywords.some((keyword) => lowerQuery.includes(keyword)),
    comparison: comparisonKeywords.some((keyword) => lowerQuery.includes(keyword))
  };
}

async function getDatabaseContext(userId, query, focusMonth) {
  const monthStart = dayjs(`${focusMonth}-01`).startOf("month").toDate();
  const monthEnd = dayjs(`${focusMonth}-01`).endOf("month").toDate();
  const tokens = tokenizeQuery(query);

  const candidates = await Transaction.find({
    userId,
    date: { $gte: monthStart, $lte: monthEnd }
  })
    .sort({ date: -1 })
    .limit(200)
    .lean();

  const ranked = candidates
    .map((transaction) => ({
      ...transaction,
      score: scoreLexicalMatch(transaction, tokens)
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.amount !== a.amount) {
        return b.amount - a.amount;
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  if (tokens.length) {
    return ranked.filter((item) => item.score > 0).slice(0, 8);
  }

  return ranked.slice(0, 8);
}

async function getRelevantContext(userId, query, focusMonth) {
  const merged = new Map();

  try {
    const queryVector = await generateEmbedding(query);
    const vectorMatches = await queryVectors(userId, queryVector, 8);

    for (const item of vectorMatches) {
      const normalized = normalizeContextItem(item);
      if (!normalized) {
        continue;
      }

      const key = `${normalized.date}|${normalized.description}|${normalized.amount}`;
      merged.set(key, normalized);
    }
  } catch (error) {
    console.warn(`[chat] vector retrieval skipped: ${error.message}`);
  }

  const databaseMatches = await getDatabaseContext(userId, query, focusMonth);
  for (const item of databaseMatches) {
    const normalized = normalizeContextItem(item);
    if (!normalized) {
      continue;
    }

    const key = `${normalized.date}|${normalized.description}|${normalized.amount}`;
    const existing = merged.get(key);
    merged.set(key, existing ? { ...normalized, score: Math.max(existing.score, normalized.score) } : normalized);
  }

  return Array.from(merged.values())
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.amount - a.amount;
    })
    .slice(0, 8);
}

function currency(value) {
  return `₹${Number(value || 0).toFixed(2)}`;
}

function percent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function getTopCategoryShare(summary) {
  const topCategory = summary.topCategories[0];
  if (!topCategory || !summary.totalSpend) {
    return 0;
  }

  return (topCategory.total / summary.totalSpend) * 100;
}

function buildAdvice(summary, context) {
  const topCategory = summary.topCategories[0];
  const topCategoryShare = getTopCategoryShare(summary);
  const largestTransaction = [...context].sort((a, b) => b.amount - a.amount)[0];
  const suggestions = [];

  if (topCategory && topCategoryShare >= 35) {
    suggestions.push(
      `Start with ${topCategory.category}. It accounts for ${percent(topCategoryShare)} of spending, so even a 15% cut there saves about ${currency(
        topCategory.total * 0.15
      )}.`
    );
  }

  if (largestTransaction) {
    suggestions.push(
      `Review large discretionary spends like ${largestTransaction.description} (${currency(
        largestTransaction.amount
      )}) before smaller items.`
    );
  }

  const weeklySavingsTarget = Math.max(50, Math.round(summary.totalSpend * 0.1));
  suggestions.push(`Set a weekly savings target of ${currency(weeklySavingsTarget)} until your top category comes down.`);

  return suggestions;
}

function buildComparisonLine(summary, previousSummary) {
  if (!previousSummary?.transactionCount) {
    return "There is no previous-month data available yet for a direct comparison.";
  }

  const difference = summary.totalSpend - previousSummary.totalSpend;
  const direction = difference >= 0 ? "up" : "down";
  const absoluteDifference = Math.abs(difference);
  const changePct = previousSummary.totalSpend ? (absoluteDifference / previousSummary.totalSpend) * 100 : 0;

  return `Compared with the previous month, spending is ${direction} by ${currency(absoluteDifference)} (${percent(changePct)}).`;
}

function buildDeterministicAnswer({ query, focusMonth, summary, previousSummary, context }) {
  const monthLabel = dayjs(`${focusMonth}-01`).format("MMMM YYYY");
  const intent = detectIntent(query);

  if (!summary.transactionCount) {
    return `I do not have any transactions for ${monthLabel} yet. Upload a CSV or add expenses first, then ask about categories, trends, or savings advice.`;
  }

  const topCategory = summary.topCategories[0];
  const topCategoryShare = getTopCategoryShare(summary);
  const topExamples = context
    .slice(0, 3)
    .map((item) => `${item.description} on ${dayjs(item.date).format("DD MMM")} (${currency(item.amount)})`);
  const lines = [
    `For ${monthLabel}, you spent ${currency(summary.totalSpend)} across ${summary.transactionCount} transactions.`
  ];

  if (topCategory) {
    lines.push(
      `Your highest spending category was ${topCategory.category} at ${currency(topCategory.total)} (${percent(topCategoryShare)} of the month).`
    );
  }

  if (summary.topCategories.length > 1) {
    lines.push(
      `Next biggest categories were ${summary.topCategories
        .slice(1, 3)
        .map((item) => `${item.category} ${currency(item.total)}`)
        .join(", ")}.`
    );
  }

  if (intent.comparison) {
    lines.push(buildComparisonLine(summary, previousSummary));
  }

  if (topExamples.length) {
    lines.push(`Relevant transactions: ${topExamples.join(", ")}.`);
  }

  if (intent.advice || intent.analytics) {
    lines.push(`What to do next: ${buildAdvice(summary, context).join(" ")}`);
  } else {
    lines.push("Ask me to compare months, explain a category spike, or suggest a savings target if you want a deeper answer.");
  }

  return lines.join("\n");
}

function buildFollowUps(summary, focusMonth) {
  const monthLabel = dayjs(`${focusMonth}-01`).format("MMMM");
  const topCategory = summary.topCategories[0]?.category;

  return [
    `Compare ${monthLabel} with last month`,
    topCategory ? `Why is ${topCategory} high this month?` : "Show my biggest expenses this month",
    "Suggest a weekly savings target"
  ];
}

async function chat(req, res, next) {
  try {
    const userId = req.user.id;
    const query = String(req.body.query || "").trim();
    const history = Array.isArray(req.body.history) ? req.body.history.slice(-8) : [];

    if (!query) {
      return res.status(400).json({ message: "query is required" });
    }

    const focusMonth = getFocusMonth(query);
    const previousMonth = dayjs(`${focusMonth}-01`).subtract(1, "month").format("YYYY-MM");
    const [summary, previousSummary, context] = await Promise.all([
      getDashboardSummary(userId, focusMonth),
      getDashboardSummary(userId, previousMonth),
      getRelevantContext(userId, query, focusMonth)
    ]);

    const deterministicAnswer = buildDeterministicAnswer({
      query,
      focusMonth,
      summary,
      previousSummary,
      context
    });
    const followUps = buildFollowUps(summary, focusMonth);
    const intent = detectIntent(query);

    if (!summary.transactionCount || intent.analytics || intent.advice || intent.comparison) {
      return res.json({
        answer: deterministicAnswer,
        followUps,
        retrievedContext: context
      });
    }

    const compactHistory = history
      .filter((item) => item && (item.role === "user" || item.role === "assistant") && item.content)
      .map((item) => ({ role: item.role, content: String(item.content).slice(0, 500) }));

    const llm = await completeJson({
      systemPrompt:
        "You are a pragmatic personal finance assistant. Answer with concrete numbers when available, explain your reasoning clearly, and give practical next actions. Use only the supplied summary, conversation history, and transaction context. Return strict JSON with keys: answer (string) and followUps (array of short strings).",
      userPrompt: JSON.stringify({
        today: dayjs().format("YYYY-MM-DD"),
        focusMonth,
        query,
        history: compactHistory,
        monthlySummary: {
          totalSpend: summary.totalSpend,
          transactionCount: summary.transactionCount,
          topCategories: summary.topCategories,
          categoryTotals: summary.categoryTotals
        },
        context
      })
    });

    return res.json({
      answer: llm?.answer || deterministicAnswer,
      followUps: llm?.followUps?.length ? llm.followUps.slice(0, 3) : followUps,
      retrievedContext: context
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  chat
};
