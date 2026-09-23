import { readFileSync } from "node:fs";
import OpenAI from "openai";
import { createEngine } from "./engine.js";
import { createCityAgent } from "./agent.js";
import { createApp } from "./app.js";

const datasetPath =
  process.env.DATASET_PATH || new URL("../data/city.json", import.meta.url);
const engine = createEngine(JSON.parse(readFileSync(datasetPath, "utf8")));
const apiKey = process.env.OPENAI_API_KEY?.trim();
const agent = apiKey
  ? createCityAgent({
      engine,
      client: new OpenAI({ apiKey, timeout: 45000, maxRetries: 0 }),
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
    })
  : null;
const port = Number(process.env.PORT || 3001);
const limit = Number(process.env.AI_REQUESTS_PER_MINUTE || 5);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("Некорректный PORT.");
if (!Number.isInteger(limit) || limit < 1 || limit > 100)
  throw new Error("Некорректный AI_REQUESTS_PER_MINUTE.");
const app = createApp({
  engine,
  agent,
  origins: (
    process.env.FRONTEND_ORIGINS ||
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  aiRequestsPerMinute: limit,
});
const host = process.env.HOST || "127.0.0.1";
const server = app.listen(port, host, () => {
  console.log(`SteppeX backend: http://${host}:${port}`);
  console.log(`Dataset: ${engine.catalog().datasetVersion}`);
  console.log(
    `AI: ${agent ? "configured" : "not configured; set OPENAI_API_KEY in backend/.env"}`,
  );
});
for (const sig of ["SIGINT", "SIGTERM"])
  process.on(sig, () => server.close(() => process.exit(0)));
