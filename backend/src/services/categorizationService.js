const { completeJson } = require("./llmService");
const { CATEGORIES, ruleBasedCategory } = require("../utils/categories");

async function categorizeDescription(description) {
  const fastCategory = ruleBasedCategory(description);
  if (fastCategory !== "Other") {
    return fastCategory;
  }

  let llmResult = null;
  try {
    llmResult = await completeJson({
      systemPrompt:
        "You categorize student expense descriptions into exactly one category: Food, Travel, Shopping, Bills, Subscriptions, Other. Return JSON: {\"category\":\"...\"}",
      userPrompt: `Description: ${description}`
    });
  } catch (error) {
    llmResult = null;
  }

  if (llmResult?.category && CATEGORIES.includes(llmResult.category)) {
    return llmResult.category;
  }

  return "Other";
}

module.exports = {
  categorizeDescription
};
