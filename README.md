# AI Finance Dashboard for Students

A full-stack finance dashboard where students can upload statements or add expenses manually, then get AI-driven insights and chat support.

## Stack

- Frontend: React + Vite + Tailwind CSS + Recharts
- Backend: Node.js + Express + MongoDB + JWT
- AI: OpenAI (LLM + embeddings) with fallback heuristics
- Vector retrieval: Pinecone (optional) + local vector fallback

## Features

- JWT auth with password hashing
- Manual expense entry + quick-add parser (`"Swiggy 300 yesterday"`)
- CSV statement upload and normalization
- Transaction CRUD with source tracking (`manual`/`csv`)
- Hybrid categorization (rules + LLM fallback)
- Dashboard with monthly summary, category chart, daily trends
- Budget tracking with over-budget alerts
- Subscription detection for recurring spends
- AI insights with cached monthly summaries
- RAG-style chat over embedded transaction context
- Extra analytics: spend prediction, anomaly detection, financial score
- Export monthly transaction reports as CSV

## Project Structure

```txt
finance/
  backend/
    src/
      config/
      controllers/
      middleware/
      models/
      routes/
      services/
      utils/
      app.js
      server.js
  frontend/
    src/
      api/
      components/
      context/
      layouts/
      pages/
      App.jsx
      main.jsx
```

## Setup

1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

2. Configure environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Start backend

```bash
cd backend
npm run dev
```

4. Start frontend

```bash
cd frontend
npm run dev
```

## API Endpoints

- `POST /auth/signup`
- `POST /auth/login`
- `POST /transactions` (manual + quickAdd)
- `POST /upload` (CSV)
- `GET /transactions`
- `GET /transactions/export`
- `PATCH /transactions/:id`
- `DELETE /transactions/:id`
- `POST /budget`
- `GET /budget`
- `GET /dashboard`
- `POST /insights`
- `POST /chat`

## Sample LLM Prompt Patterns

### Insight Engine prompt

System prompt:

```txt
You are a financial coach for college students.
Return strict JSON with keys: summary (string), wastefulPatterns (array), suggestions (array).
Keep advice practical and specific.
```

User payload includes only aggregated summary data, top categories, budget status, anomalies, and subscriptions.

### Chat Assistant prompt

System prompt:

```txt
You are a student finance assistant.
Answer using only retrieved transaction context.
Return JSON: {"answer": string, "followUps": string[]}
```

## Notes

- If `OPENAI_API_KEY` is missing, app still works with deterministic fallbacks for categorization/insights.
- To enable Pinecone, set `USE_PINECONE=true` and provide API/index details.
