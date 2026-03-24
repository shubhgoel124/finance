const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true },
    category: {
      type: String,
      enum: ["Food", "Travel", "Shopping", "Bills", "Subscriptions", "Other"],
      default: "Other"
    },
    description: { type: String, required: true, trim: true },
    date: { type: Date, required: true, index: true },
    source: { type: String, enum: ["manual", "csv"], required: true },
    recurringGroupKey: { type: String, default: null }
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1, date: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
