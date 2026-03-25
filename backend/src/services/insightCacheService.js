const NodeCache = require("node-cache");

const insightCache = new NodeCache({ stdTTL: 60 * 10 });

function monthKey(userId, month) {
  return `${userId}:${month}`;
}

function getInsightCache(userId, month) {
  return insightCache.get(monthKey(userId, month));
}

function setInsightCache(userId, month, payload) {
  insightCache.set(monthKey(userId, month), payload);
}

function clearInsightCache(userId, month) {
  insightCache.del(monthKey(userId, month));
}

function clearInsightCacheForMonths(userId, months = []) {
  for (const month of months) {
    if (month) {
      clearInsightCache(userId, month);
    }
  }
}

module.exports = {
  getInsightCache,
  setInsightCache,
  clearInsightCache,
  clearInsightCacheForMonths,
};
