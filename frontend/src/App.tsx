import React, { useEffect, useState } from 'react';

type CategoryKey = 'transport' | 'greenery' | 'social' | 'safety' | 'services';
type FilterKey = 'all' | CategoryKey;

type Intervention = {
  id: string;
  title: string;
  category: CategoryKey;
  cost: number;
  impact: number;
  description: string;
};

type SimulationResult = {
  total_cost: number;
  remaining_budget: number;
  score: number;
  strengths: string[];
  risks: string[];
  recommendations: string[];
};

const initialBudget = 1000;

const categoryLabels: Record<CategoryKey, string> = {
  transport: 'Транспорт',
  greenery: 'Озеленение',
  social: 'Соц. инфраструктура',
  safety: 'Безопасность',
  services: 'Городские сервисы'
};

export default function App() {
  const [options, setOptions] = useState<Intervention[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/interventions');
        if (!response.ok) {
          throw new Error('Не удалось загрузить варианты решений');
        }
        const data = await response.json();
        setOptions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, []);

  const chosenOptions = options.filter((option) => selected[option.id]);
  const totalCost = chosenOptions.reduce((sum, item) => sum + item.cost, 0);
  const remaining = initialBudget - totalCost;
  const selectedCount = chosenOptions.length;
  const canAfford = remaining >= 0;

  const visibleOptions = activeFilter === 'all'
    ? options
    : options.filter((option) => option.category === activeFilter);

  const localScore = Math.max(
    0,
    Math.min(
      100,
      50 + chosenOptions.reduce((sum, item) => sum + item.impact, 0) * 0.8 - Math.max(0, totalCost - initialBudget) * 0.12
    )
  );

  const scoreValue = result?.score ?? localScore;

  const toggleOption = (id: string, cost: number) => {
    if (selected[id]) {
      setSelected((prev) => ({ ...prev, [id]: false }));
      setResult(null);
      return;
    }

    if (selectedCount >= 5) {
      return;
    }

    if (totalCost + cost > initialBudget) {
      return;
    }

    setSelected((prev) => ({ ...prev, [id]: true }));
    setResult(null);
  };

  const handleCalculate = async () => {
    if (selectedCount === 0) {
      setError('Выберите хотя бы одно решение.');
      return;
    }

    try {
      setError(null);
      const response = await fetch('http://127.0.0.1:8000/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budget_total: initialBudget,
          selected_ids: chosenOptions.map((item) => item.id)
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Ошибка расчёта сценария');
      }

      const data: SimulationResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выполнить расчёт');
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SteppeX • City Simulator</p>
          <h1>Аким на 5 часов</h1>
        </div>

        <div className="topbar-actions">
          <div className="mini-stat">
            <span>Бюджет</span>
            <strong>{initialBudget} млн</strong>
          </div>
          <div className="mini-stat accent">
            <span>Остаток</span>
            <strong>{remaining} млн</strong>
          </div>
        </div>
      </header>

      <section className="hero-panel">
        <div>
          <p className="label">Городская стратегия</p>
          <h2>AI-симулятор управления городом</h2>
        </div>
        <div className="hero-score">
          <span>Score</span>
          <strong>{scoreValue.toFixed(1)}</strong>
        </div>
      </section>

      <main className="layout">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="label">Решения</p>
              <h2>Выберите 5 приоритетов</h2>
            </div>
            <button className="calc-btn" onClick={handleCalculate} disabled={selectedCount === 0}>
              Рассчитать сценарий
            </button>
          </div>

          <div className="filter-row">
            {(['all', 'transport', 'greenery', 'social', 'safety', 'services'] as FilterKey[]).map((filter) => (
              <button
                key={filter}
                className={`filter-btn ${activeFilter === filter ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter === 'all' ? 'Все' : categoryLabels[filter]}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="state-text">Загрузка вариантов...</p>
          ) : error ? (
            <p className="state-text error">{error}</p>
          ) : (
            <div className="card-grid">
              {visibleOptions.map((option) => {
                const active = !!selected[option.id];
                const blocked = !active && totalCost + option.cost > initialBudget;
                const maxReached = !active && selectedCount >= 5;

                return (
                  <button
                    key={option.id}
                    className={`decision-card ${active ? 'active' : ''} ${blocked || maxReached ? 'disabled' : ''}`}
                    onClick={() => !blocked && !maxReached && toggleOption(option.id, option.cost)}
                    disabled={blocked || maxReached}
                  >
                    <div className="card-header">
                      <span className="tag">{categoryLabels[option.category]}</span>
                      <span className="price">{option.cost} млн</span>
                    </div>
                    <h3>{option.title}</h3>
                    <p>{option.description}</p>
                    <div className="impact-row">
                      <span>Эффект</span>
                      <strong>+{option.impact}</strong>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <aside className="panel sidebar">
          <div className="summary-header">
            <p className="label">Сводка</p>
            <h2>Результат стратегии</h2>
          </div>

          <div className="summary-group">
            <div className="summary-row">
              <span>Выбрано</span>
              <strong>{selectedCount}/5</strong>
            </div>
            <div className="summary-row">
              <span>Затраты</span>
              <strong>{totalCost} млн</strong>
            </div>
            <div className="summary-row">
              <span>Остаток</span>
              <strong className={canAfford ? 'ok' : 'danger'}>{remaining} млн</strong>
            </div>
          </div>

          <div className="score-box">
            <span>Astana Quality of Life Score</span>
            <strong>{scoreValue.toFixed(1)}</strong>
          </div>

          <div className="ai-box">
            <h3>AI-объяснение</h3>
            {result ? (
              <div className="result-block">
                <div>
                  <h4>Сильные стороны</h4>
                  <ul>
                    {result.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4>Риски</h4>
                  <ul>
                    {result.risks.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4>Рекомендации</h4>
                  <ul>
                    {result.recommendations.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p>
                {canAfford
                  ? 'Сценарий выглядит сбалансированным: вы инвестируете в ключевые отрасли городской среды и сохраняете финансовый запас на экстренные вмешательства.'
                  : 'Сценарий превышает бюджет. Необходимо сократить наиболее дорогостоящие инициативы или перераспределить ресурсы между районами.'}
              </p>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
