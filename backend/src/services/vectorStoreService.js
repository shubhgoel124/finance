const { Pinecone } = require("@pinecone-database/pinecone");
const env = require("../config/env");
const { cosineSimilarity } = require("./embeddingService");

const localStore = new Map();

let pineconeIndex = null;
if (env.usePinecone && env.pineconeApiKey) {
  const pinecone = new Pinecone({ apiKey: env.pineconeApiKey });
  pineconeIndex = pinecone.index(env.pineconeIndex);
}

function localKey(userId) {
  return String(userId);
}

async function upsertVectors(userId, vectors) {
  if (pineconeIndex) {
    const records = vectors.map((item) => ({
      id: `${userId}-${item.id}`,
      values: item.vector,
      metadata: item.metadata
    }));
    await pineconeIndex.upsert(records);
    return;
  }

  const key = localKey(userId);
  const existing = localStore.get(key) || [];
  localStore.set(key, [...existing, ...vectors]);
}

async function queryVectors(userId, queryVector, topK = 8) {
  if (pineconeIndex) {
    const result = await pineconeIndex.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
      filter: { userId: { $eq: String(userId) } }
    });

    return (result.matches || []).map((match) => ({
      score: match.score,
      metadata: match.metadata || {}
    }));
  }

  const key = localKey(userId);
  const existing = localStore.get(key) || [];
  return existing
    .map((item) => ({
      score: cosineSimilarity(item.vector, queryVector),
      metadata: item.metadata
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

module.exports = {
  upsertVectors,
  queryVectors
};
