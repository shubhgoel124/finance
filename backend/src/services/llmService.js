const OpenAI = require("openai");
const env = require("../config/env");
const fetch = require("node-fetch");

const openaiClient = env.openaiApiKey ? new OpenAI({ apiKey: env.openaiApiKey }) : null;

function logProviderFailure(provider, error) {
  const message = error?.message || "Unknown error";
  console.warn(`[llm] ${provider} request failed: ${message}`);
}

function extractJsonObject(text) {
  if (!text || typeof text !== "string") {
    return null;
  }

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[0]);
  } catch (error) {
    return null;
  }
}

function getProviderOrder() {
  if (env.llmProvider === "openai") {
    return ["openai", "huggingface"];
  }

  if (env.llmProvider === "huggingface" || env.llmProvider === "hf") {
    return ["huggingface", "openai"];
  }

  if (openaiClient) {
    return ["openai", "huggingface"];
  }

  return ["huggingface", "openai"];
}

async function completeWithOpenAi({ systemPrompt, userPrompt }) {
  if (!openaiClient) {
    return null;
  }

  const response = await openaiClient.responses.create({
    model: env.openaiModel,
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    text: {
      format: {
        type: "json_object"
      }
    }
  });

  const text = response.output_text || "{}";
  return JSON.parse(text);
}

async function completeWithHuggingFace({ systemPrompt, userPrompt }) {
  if (!env.hfApiKey) {
    return null;
  }

  const model = env.hfModel || "Qwen/Qwen2.5-72B-Instruct";
  const url = "https://router.huggingface.co/v1/chat/completions";
  const body = {
    model,
    messages: [
      { role: "system", content: `${systemPrompt}\nReturn only valid JSON.` },
      { role: "user", content: userPrompt }
    ],
    max_tokens: 1024,
    temperature: 0.3
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.hfApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    throw new Error(`Hugging Face API error: ${resp.status}`);
  }

  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || "";

  const parsed = extractJsonObject(text);
  if (parsed) {
    return parsed;
  }

  return text ? { answer: text, followUps: [] } : null;
}

async function completeJson({ systemPrompt, userPrompt }) {
  const providerOrder = getProviderOrder();

  for (const provider of providerOrder) {
    try {
      if (provider === "openai") {
        const openAiResult = await completeWithOpenAi({ systemPrompt, userPrompt });
        if (openAiResult) {
          return openAiResult;
        }
      }

      if (provider === "huggingface") {
        const huggingFaceResult = await completeWithHuggingFace({ systemPrompt, userPrompt });
        if (huggingFaceResult) {
          return huggingFaceResult;
        }
      }
    } catch (error) {
      logProviderFailure(provider, error);
    }
  }

  return null;
}

async function createEmbedding(text) {
  if (!openaiClient) {
    return null;
  }

  try {
    const response = await openaiClient.embeddings.create({
      model: env.openaiEmbeddingModel,
      input: text
    });
    return response.data?.[0]?.embedding || null;
  } catch (error) {
    logProviderFailure("openai embeddings", error);
    return null;
  }
}

module.exports = {
  completeJson,
  createEmbedding
};
