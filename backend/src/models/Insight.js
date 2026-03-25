const mongoose = require("mongoose");

const insightSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    month: { type: String, required: true, index: true },
    summary: { type: String, required: true },
    suggestions: [{ type: String }],
    wastefulPatterns: [{ type: String }],
    prioritizedActions: [
      {
        title: { type: String },
        reason: { type: String },
        estimatedMonthlySavings: { type: Number, default: 0 },
        effort: {
          type: String,
          enum: ["Low", "Medium", "High"],
          default: "Medium",
        },
        priority: {
          type: String,
          enum: ["Low", "Medium", "High"],
          default: "Medium",
        },
      },
    ],
    diagnostics: {
      monthOverMonthPct: { type: Number, default: 0 },
      topCategory: { type: String, default: "Other" },
      topCategoryShare: { type: Number, default: 0 },
      subscriptionTotal: { type: Number, default: 0 },
      subscriptionSharePct: { type: Number, default: 0 },
      anomalySpend: { type: Number, default: 0 },
      anomalyCount: { type: Number, default: 0 },
      budgetUsagePct: { type: Number, default: 0 },
      projectedBudgetUsagePct: { type: Number, default: 0 },
      riskLevel: {
        type: String,
        enum: ["Low", "Medium", "High"],
        default: "Low",
      },
    },
    financialScore: { type: Number, default: 50 },
    prediction: { type: Number, default: 0 },
    anomalyCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

insightSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("Insight", insightSchema);
