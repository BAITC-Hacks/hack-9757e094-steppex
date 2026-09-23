import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createEngine } from "../src/engine.js";
import { createCityAgent } from "../src/agent.js";

const data = JSON.parse(
  readFileSync(new URL("../data/city.json", import.meta.url), "utf8"),
);
const engine = createEngine(data);
const validReport = {
  headline: "Город становится доступнее",
  summary: "Приоритет уделён слабому району.",
  strengths: ["Улучшаются социальные показатели Нуры."],
  tradeoffs: ["Бюджетный резерв ограничен."],
  risks: [
    {
      evidenceId: "low-reserve",
      explanation: "После выбранных вложений остаётся небольшой резерв.",
    },
  ],
  recommendations: [
    { strategyId: "quality", reason: "Этот вариант улучшает общий результат." },
  ],
  recommendedStrategyId: "quality",
  limitations: "Это учебная модель; поиск ограничен соседними вариантами.",
  nextQuestion: "Что важнее: резерв или общий результат?",
};
function fakeClient(report = validReport, inspect = {}) {
  let round = 0;
  const requests = [];
  return {
    requests,
    responses: {
      async create(request) {
        requests.push(structuredClone(request));
        if (round++ < 2) {
          const name = round === 1 ? "compare_strategies" : "inspect_risks";
          return {
            status: "completed",
            output: [
              {
                type: "function_call",
                id: `fc_${round}`,
                call_id: `call_${round}`,
                name,
                arguments: "{}",
                status: "completed",
              },
            ],
          };
        }
        return {
          ...inspect,
          status: inspect.status ?? "completed",
          output: [],
          output_text: JSON.stringify(report),
        };
      },
    },
  };
}
test("agent executes real local tools before returning a report; metrics stay server-owned", async () => {
  const client = fakeClient();
  const result = await createCityAgent({ engine, client }).analyze({
    decisions: data.exampleDecisions,
  });
  assert.equal(result.simulation.score, 56.54307);
  assert.equal(result.analysis.status, "complete");
  assert.deepEqual(
    result.toolTrace.map((x) => x.tool),
    ["compare_strategies", "inspect_risks"],
  );
  assert.ok(
    client.requests[1].input.some((x) => x.type === "function_call_output"),
  );
  assert.equal(client.requests[0].store, false);
});
test("unknown risk evidence is rejected", async () => {
  const report = {
    ...validReport,
    risks: [{ evidenceId: "invented-risk", explanation: "Риск." }],
  };
  await assert.rejects(
    createCityAgent({ engine, client: fakeClient(report) }).analyze({
      decisions: data.exampleDecisions,
    }),
    (e) => e.code === "AI_UNKNOWN_EVIDENCE",
  );
});
test("numeric claims in model prose are rejected", async () => {
  await assert.rejects(
    createCityAgent({
      engine,
      client: fakeClient({ ...validReport, summary: "Score равен 99." }),
    }).analyze({ decisions: data.exampleDecisions }),
    (e) => e.code === "AI_INVALID_REPORT",
  );
});
test("incomplete model output cannot appear as successful analysis", async () => {
  await assert.rejects(
    createCityAgent({
      engine,
      client: fakeClient(validReport, { status: "incomplete" }),
    }).analyze({ decisions: data.exampleDecisions }),
    (e) => e.code === "AI_INCOMPLETE",
  );
});
test("invalid scenario never calls the model", async () => {
  const client = fakeClient();
  await assert.rejects(
    createCityAgent({ engine, client }).analyze({ decisions: [] }),
  );
  assert.equal(client.requests.length, 0);
});
