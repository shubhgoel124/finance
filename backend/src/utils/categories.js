const CATEGORY_RULES = [
  { category: "Food", keywords: ["swiggy", "zomato", "restaurant", "cafe", "food", "pizza", "burger"] },
  { category: "Travel", keywords: ["uber", "ola", "rapido", "metro", "flight", "bus", "train", "fuel", "petrol"] },
  { category: "Shopping", keywords: ["amazon", "flipkart", "myntra", "shopping", "store", "mall"] },
  { category: "Bills", keywords: ["electricity", "water", "internet", "rent", "bill", "recharge", "mobile"] },
  { category: "Subscriptions", keywords: ["netflix", "spotify", "prime", "subscription", "youtube", "apple", "google one"] }
];

function normalizeDescription(text = "") {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function ruleBasedCategory(description = "") {
  const normalized = normalizeDescription(description);

  for (const entry of CATEGORY_RULES) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword))) {
      return entry.category;
    }
  }

  return "Other";
}

module.exports = {
  CATEGORIES: ["Food", "Travel", "Shopping", "Bills", "Subscriptions", "Other"],
  CATEGORY_RULES,
  normalizeDescription,
  ruleBasedCategory
};
