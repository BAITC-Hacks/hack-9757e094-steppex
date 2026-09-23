import { useEffect, useState } from 'react';
import type { Catalog, Decision, Health, Simulation, Strategy, AgentReport, Validation } from './api';
import { request } from './api';

const labels: Record<string, string> = { quality: 'Качество жизни', equity: 'Слабый район', reserve: 'Бюджетный резерв' };
const number = (value: number) => value.toFixed(2);

export default function App() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [validation, setValidation] = useState<Validation | null>(null);
  const [result, setResult] = useState<Simulation | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [report, setReport] = useState<AgentReport | null>(null);
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState<'calculate' | 'analyze' | null>(null);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('Как поддержать слабый район и сохранить бюджетный резерв?');

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      request<Catalog>('/api/catalog', undefined, controller.signal),
      request<Health>('/api/health', undefined, controller.signal),
    ]).then(([data, status]) => { setCatalog(data); setHealth(status); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!catalog) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      request<Validation>('/api/validate', { decisions }, controller.signal)
        .then(setValidation)
        .catch(e => { if (!controller.signal.aborted) setError(e.message); });
    }, 150);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [catalog, decisions]);

  const change = (next: Decision[]) => {
    setDecisions(next); setValidation(null); setResult(null);
    setStrategies([]); setReport(null); setError('');
  };
  const calculate = async () => {
    setBusy('calculate'); setError(''); setResult(null); setStrategies([]); setReport(null);
    try {
      const simulation = await request<Simulation>('/api/simulate', { decisions });
      setResult(simulation);
      const alternatives = await request<{ strategies: Strategy[] }>('/api/strategies', { decisions });
      setStrategies(alternatives.strategies);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  };
  const analyze = async () => {
    if (!window.confirm('Запустить один ИИ-анализ? Агент сделает до четырёх обращений к модели. Они расходуют API-баланс; точная сумма зависит от токенов.')) return;
    setBusy('analyze'); setError(''); setReport(null);
    try {
      const data = await request<AgentReport>('/api/analyze', { decisions, question });
      setResult({ ...data.simulation, risks: data.risks });
      setStrategies(data.strategies); setReport(data);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  };

  if (!catalog) return <main className="app-shell"><h1>SteppeX</h1><p role={error ? 'alert' : 'status'}>{error || 'Подключаем локальный backend…'}</p>{error && <button className="calc-btn" onClick={() => window.location.reload()}>Повторить подключение</button>}</main>;
  const selectedMeasures = catalog.measures.filter(m => decisions.some(d => d.measureId === m.id));
  const total = selectedMeasures.reduce((sum, m) => sum + m.cost, 0);
  const remaining = catalog.budget - total;
  const ready = !busy && validation?.valid === true;
  const visible = catalog.measures.filter(m => filter === 'all' || m.direction === filter);
  const describe = (decision: Decision) => {
    const measure = catalog.measures.find(m => m.id === decision.measureId);
    const district = catalog.districts.find(d => d.id === decision.districtId);
    return (measure?.name ?? decision.measureId) + ' · ' + (district?.name ?? 'весь город');
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div><p className="eyebrow">SteppeX • локальная сборка команды</p><h1>Аким на 5 часов</h1></div>
        <div className="topbar-actions">
          <div className="mini-stat"><span>Бюджет</span><strong>{catalog.budget} ед.</strong></div>
          <div className="mini-stat accent"><span>Остаток</span><strong className={remaining < 0 ? 'danger' : ''}>{remaining} ед.</strong></div>
        </div>
      </header>

      <div className="status-strip">
        <span className="status-pill neutral">Демо-режим</span>
        <span className="status-pill neutral">Сценарный анализ активен</span>
        <span className={`status-pill ${health?.aiConfigured ? 'success' : 'warn'}`}>
          {health?.aiConfigured ? 'ИИ-аналитик готов' : 'ИИ ждёт API-ключ'}
        </span>
      </div>

      <section className="hero-panel">
        <div><p className="label">Городская стратегия</p><h2>Пять решений. Один бюджет.</h2>
          <p className="hint">Синтетический датасет организаторов · {catalog.horizonQuarters} кварталов · максимум {catalog.maxPerDirection} меры одного направления.</p>
        </div>
        <div className="hero-score"><span>{result ? 'Результат сценария' : 'Исходный Score'}</span><strong>{number(result?.score ?? catalog.baseline.score)}</strong></div>
      </section>

      {error && <div className="error-banner" role="alert">{error}</div>}
      <main className="layout">
        <section className="panel">
          <div className="panel-header"><div><p className="label">Решения</p><h2>Выберите {catalog.decisionsRequired} приоритетов</h2></div>
            <button className="calc-btn" onClick={calculate} disabled={!ready}>{busy === 'calculate' ? 'Backend + ML считают…' : 'Рассчитать сценарий'}</button>
          </div>
          <div className="action-row">
            <button className="filter-btn primary" disabled={!!busy} onClick={() => change(catalog.exampleDecisions)}>Загрузить пример</button>
            <button className="filter-btn" disabled={!!busy || !decisions.length} onClick={() => change([])}>Сбросить выбор</button>
            <span className="hint soft">Расчёт и стратегии — без расходов API</span>
          </div>
          <p role="status" className="hint">
            {decisions.length !== catalog.decisionsRequired ? 'Выбрано ' + decisions.length + ' из ' + catalog.decisionsRequired : validation ? (validation.valid ? 'Набор соответствует правилам' : 'Исправьте нарушения ниже') : 'Проверяем правила…'}
          </p>
          {!!validation?.errors.filter(e => e.code !== 'DECISION_COUNT').length && <ul className="validation-errors" role="alert">{validation.errors.filter(e => e.code !== 'DECISION_COUNT').map((e, i) => <li key={i}>{e.message}</li>)}</ul>}
          <div className="filter-row">{['all', ...Object.keys(catalog.directions)].map(key => <button key={key} className={'filter-btn ' + (filter === key ? 'active' : '')} aria-pressed={filter === key} onClick={() => setFilter(key)}>{key === 'all' ? 'Все' : catalog.directions[key]}</button>)}</div>
          <div className="card-grid">
            {visible.map(measure => {
              const pick = decisions.find(d => d.measureId === measure.id);
              const blocked = !!busy || (!pick && decisions.length >= catalog.decisionsRequired);
              return <article key={measure.id} className={'decision-card ' + (pick ? 'active' : '')}>
                <div className="card-header"><span className="tag">{catalog.directions[measure.direction]}</span><span className="price">{measure.cost} ед.</span></div>
                <h3>{measure.name}</h3>
                <p>{measure.scope === 'city' ? 'Действует во всех районах' : 'Выберите район применения'} · лаг {measure.lagQuarters} кв.</p>
                <div className="effect-list">{Object.entries(measure.effects).map(([key, value]) => <span key={key}>{catalog.indicators[key].name}: {value > 0 ? '+' : ''}{value}</span>)}</div>
                <p className="hint">Полный эффект; расчёт учитывает лаг.</p>
                <button className="filter-btn select-measure" aria-label={(pick ? 'Убрать ' : 'Выбрать ') + measure.name} aria-pressed={!!pick} disabled={blocked} onClick={() => change(pick ? decisions.filter(d => d.measureId !== measure.id) : [...decisions, { measureId: measure.id, ...(measure.scope === 'district' ? { districtId: catalog.districts[0].id } : {}) }])}>{pick ? '✓ Выбрано — убрать' : 'Выбрать'}</button>
                {pick && measure.scope === 'district' && <label className="district-label">Район<select aria-label={'Район для ' + measure.name} value={pick.districtId ?? ''} disabled={!!busy} onChange={e => change(decisions.map(d => d.measureId === measure.id ? { ...d, districtId: e.target.value } : d))}>{catalog.districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>}
              </article>;
            })}
          </div>
        </section>

        <aside className="panel sidebar">
          <div className="summary-header"><p className="label">Сводка</p><h2>Результат стратегии</h2></div>
          <div className="summary-group">
            <div className="summary-row"><span>Выбрано</span><strong>{decisions.length}/{catalog.decisionsRequired}</strong></div>
            <div className="summary-row"><span>Затраты</span><strong>{total} ед.</strong></div>
            <div className="summary-row"><span>Остаток</span><strong className={remaining >= 0 ? 'ok' : 'danger'}>{remaining} ед.</strong></div>
          </div>
          <div className="score-box"><span>{result ? 'Astana Quality of Life Score' : 'База до ваших решений'}</span><strong data-testid="score">{number(result?.score ?? catalog.baseline.score)}</strong>
            {result && <p>Изменение: <span className={result.scoreDelta >= 0 ? 'ok' : 'danger'}>{result.scoreDelta >= 0 ? '+' : ''}{number(result.scoreDelta)}</span></p>}
          </div>
          {result?.ml && <div className="ml-box"><strong>Проверка сценария</strong><p>Локальная верификация подтвердила согласованность бюджета, Score и показателей по районам.</p><small>Проверка проводится по правилам и формулам, без машинного обучения.</small></div>}
          {result && <div className="result-block"><h3>Анализ рисков</h3><ul>{(result.risks ?? []).map(r => <li key={r.id}>{r.message}</li>)}</ul></div>}
          <div className="ai-box">
            <h3>ИИ-аналитик</h3>
            <p className="hint">{health?.aiConfigured ? 'Задайте вопрос по сценарию — ИИ проанализирует выбранные меры, бюджет, риски и приоритеты.' : 'Без API-ключа доступны расчёт, проверка и стратегии. Для живого анализа нужно подключить OpenAI.'}</p>
            <label htmlFor="question">Вопрос к сценарию</label>
            <textarea id="question" value={question} maxLength={1500} disabled={!!busy} onChange={e => setQuestion(e.target.value)} />
            <button className="calc-btn" disabled={!ready || !health?.aiConfigured} onClick={analyze}>{busy === 'analyze' ? 'ИИ анализирует… до 90 секунд' : 'Спросить ИИ'}</button>
            {report && <div className="result-block ai-report" aria-live="polite">
              <h4>{report.analysis.headline}</h4><p>{report.analysis.summary}</p>
              <h4>Сильные стороны</h4><ul>{report.analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
              <h4>Компромиссы</h4><ul>{report.analysis.tradeoffs.map((s, i) => <li key={i}>{s}</li>)}</ul>
              <h4>Риски</h4><ul>{report.analysis.risks.map((r, i) => <li key={i}>{r.explanation}</li>)}</ul>
              <h4>Рекомендации</h4><ul>{report.analysis.recommendations.map((r, i) => <li key={i}>{labels[r.strategyId]}: {r.reason}</li>)}</ul>
              <p className="hint">{report.analysis.limitations}</p><p>{report.analysis.nextQuestion}</p>
              {report.usage && <p className="hint">Запросов модели: {report.usage.modelRequests}. {report.usage.estimatedUsd != null ? 'Оценка стоимости: $' + report.usage.estimatedUsd.toFixed(4) : 'Стоимость не определена; проверьте Usage у провайдера.'}</p>}
            </div>}
          </div>
        </aside>
      </main>

      {result && <section className="panel below-panel"><p className="label">Проверяемые результаты</p><h2>Как изменились районы</h2><div className="table-scroll"><table><thead><tr><th>Район</th><th>Было</th><th>Стало</th><th>Изменение</th></tr></thead><tbody>{result.districts.map(d => <tr key={d.id}><th>{d.name}</th><td>{number(d.baselineScore)}</td><td>{number(d.score)}</td><td className={d.scoreDelta >= 0 ? 'ok' : 'danger'}>{d.scoreDelta >= 0 ? '+' : ''}{number(d.scoreDelta)}</td></tr>)}</tbody></table></div></section>}
      {!!strategies.length && <section className="panel below-panel"><p className="label">Три приоритета</p><h2>Сравнение стратегий</h2><p className="hint">Замена или перенос одного решения. Это локальный поиск, не доказанный глобальный оптимум; варианты могут совпадать.</p><div className="strategy-grid">{strategies.map(s => <article className="strategy-card" key={s.id}><h3>{s.title}</h3><div className="summary-row"><span>Score</span><strong>{number(s.simulation.score)}</strong></div><p>Остаток: {s.simulation.budget.remaining} ед. · прирост: {number(s.scoreGain)}</p>{s.replacement && s.changed && <p className="hint">{describe(s.replacement.from)} → {describe(s.replacement.to)}</p>}<details><summary>Риски варианта ({s.risks.length})</summary><ul>{s.risks.map(r => <li key={r.id}>{r.message}</li>)}</ul></details><button className="filter-btn" disabled={!s.changed || !!busy} onClick={() => { change(s.simulation.decisions); setResult({ ...s.simulation, risks: s.risks }); }}>{s.changed ? 'Применить вариант' : 'Улучшение не найдено'}</button></article>)}</div></section>}
      <footer className="hint">SteppeX · учебная модель, не прогноз реальной Астаны · {catalog.datasetVersion}</footer>
    </div>
  );
}

