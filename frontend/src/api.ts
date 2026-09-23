export type Decision = { measureId: string; districtId?: string | null };
export type Catalog = {
  budget: number; horizonQuarters: number; decisionsRequired: number; maxPerDirection: number;
  datasetVersion: string; directions: Record<string, string>;
  indicators: Record<string, { name: string }>;
  districts: { id: string; name: string }[];
  measures: { id: string; name: string; direction: string; cost: number; scope: 'city' | 'district'; lagQuarters: number; effects: Record<string, number> }[];
  baseline: { score: number }; exampleDecisions: Decision[];
};
export type Health = { ok: boolean; aiConfigured: boolean; mlStatus: string };
export type Validation = { valid: boolean; errors: { code: string; message: string }[] };
export type Risk = { id: string; message: string };
export type Simulation = {
  decisions: Decision[]; score: number; baselineScore: number; scoreDelta: number;
  budget: { total: number; spent: number; remaining: number };
  districts: { id: string; name: string; score: number; baselineScore: number; scoreDelta: number }[];
  risks?: Risk[];
  ml?: { status: string; score: number; strengths: string[]; recommendations: string[] };
};
export type Strategy = {
  id: string; title: string; changed: boolean; scoreGain: number; simulation: Simulation; risks: Risk[];
  replacement: { from: Decision; to: Decision } | null;
};
export type AgentReport = {
  simulation: Simulation; strategies: Strategy[]; risks: Risk[];
  analysis: { headline: string; summary: string; strengths: string[]; tradeoffs: string[];
    risks: { evidenceId: string; explanation: string }[];
    recommendations: { strategyId: string; reason: string }[]; limitations: string; nextQuestion: string;
  };
  usage?: { inputTokens: number; outputTokens: number; modelRequests: number; estimatedUsd: number | null };
};

export async function request<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(path === '/api/analyze' ? 100000 : 20000);
  const response = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  let data;
  try { data = await response.json(); }
  catch { throw new Error('Backend недоступен или вернул не JSON. Проверьте окно запуска проекта.'); }
  if (!response.ok) {
    const details = Array.isArray(data.errors) ? data.errors.map((e: { message?: string }) => e.message).filter(Boolean).join(' ') : '';
    throw new Error(details || data.error?.message || 'Ошибка запроса: ' + response.status);
  }
  return data as T;
}
