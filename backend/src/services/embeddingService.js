const { createEmbedding } = require("./llmService");

function deterministicVector(text, dimensions = 128) {
  const vector = new Array(dimensions).fill(0);
  const clean = String(text || "").toLowerCase();

  for (let i = 0; i < clean.length; i += 1) {
    const code = clean.charCodeAt(i);
    const index = code % dimensions;
    vector[index] += (code % 11) / 10;
  }

  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map((value) => value / norm);
}

async function generateEmbedding(text) {
  const llmEmbedding = await createEmbedding(text);
  if (llmEmbedding?.length) {
    return llmEmbedding;
  }

  return deterministicVector(text);
}

function cosineSimilarity(vecA, vecB) {
  const length = Math.min(vecA.length, vecB.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i += 1) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB) || 1;
  return dot / denom;
}

module.exports = {
  generateEmbedding,
  cosineSimilarity,
};
