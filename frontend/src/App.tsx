type CategoryKey = 'transport' | 'greenery' | 'social' | 'safety' | 'services';

type Option = {
  id: string;
  title: string;
  category: CategoryKey;
  cost: number;
  impact: number;
  description: string;
};

const options: Option[] = [
  {
    id: 't1',
    title: 'Новые автобусные линии',
    category: 'transport',
    cost: 350,
    impact: 18,
    description: 'Снижает перегрузку и повышает связанность районов.'
  },
  {
    id: 'g1',
    title: 'Парки и зеленые коридоры',
    category: 'greenery',
    cost: 260,
    impact: 15,
    description: 'Улучшает микроклимат и комфорт городской среды.'
  },
  {
    id: 's1',
    title: 'Постройка школ и центров',
    category: 'social',
    cost: 420,
    impact: 22,
    description: 'Решает задачи доступности социальной инфраструктуры.'
  },
  {
    id: 'sa1',
    title: 'Камеры и патрули',
    category: 'safety',
    cost: 310,
    impact: 17,
    description: 'Повышает уровень общественной безопасности.'
  },
  {
    id: 'se1',
    title: 'Цифровые городские сервисы',
    category: 'services',
    cost: 290,
    impact: 16,
    description: 'Улучшают доступность и качество электронных услуг.'
  },
  {
    id: 't2',
    title: 'Электробусы на ключевых маршрутах',
    category: 'transport',
    cost: 480,
    impact: 24,
    description: 'Дает сильный эффект для транспортной модели.'
  },
  {
    id: 'g2',
    title: 'Сады и озеленение дворов',
    category: 'greenery',
    cost: 210,
    impact: 12,
    description: 'Недорогой и заметный эффект на качество жизни.'
  },
  {
    id: 's2',
    title: 'Физкультурные и клубные зоны',
    category: 'social',
    cost: 240,
    impact: 13,
    description: 'Поддерживает здоровье и вовлеченность населения.'
  },
  {
    id: 'sa2',
    title: 'Освещение и общественная безопасность',
    category: 'safety',
    cost: 260,
    impact: 14,
    description: 'Снижает риск и улучшает ощущение комфорта.'
  },
  {
    id: 'se2',
    title: 'Реформы городской сервисной инфраструктуры',
    category: 'services',
    cost: 340,
    impact: 19,
    description: 'Улучшают скорость и прозрачность госуслуг.'
  }
];

const initialBudget = 1000;

export default function App() {
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  const chosenOptions = options.filter((option) => selected[option.id]);
  const totalCost = chosenOptions.reduce((sum, item) => sum + item.cost, 0);
  const remaining = initialBudget - totalCost;

  const score = Math.max(
    0,
    Math.min(
      100,
      50 +
        chosenOptions.reduce((sum, item) => sum + item.impact, 0) * 0.8 -
        Math.max(0, totalCost - initialBudget) * 0.12
    )
  );

  const toggleOption = (id: string) => {
    setSelected((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const canAfford = remaining >= 0;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SteppeX • City Simulator</p>
          <h1>Аким на 5 часов</h1>
        </div>
        <div className="budget-box">
          <span>Бюджет</span>
          <strong>{initialBudget} млн ₸</strong>
        </div>
      </header>

      <main className="layout">
        <section className="panel">
          <h2>Выберите решения</h2>
          <div className="card-grid">
            {options.map((option) => {
              const active = !!selected[option.id];
              const blocked = !active && totalCost + option.cost > initialBudget;

              return (
                <button
                  key={option.id}
                  className={`decision-card ${active ? 'active' : ''} ${blocked ? 'disabled' : ''}`}
                  onClick={() => !blocked && toggleOption(option.id)}
                  disabled={blocked}
                >
                  <div className="card-header">
                    <span className="tag">{option.category}</span>
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
        </section>

        <aside className="panel sidebar">
          <h2>Сводка</h2>
          <div className="summary-row">
            <span>Выбрано</span>
            <strong>{chosenOptions.length}/5</strong>
          </div>
          <div className="summary-row">
            <span>Затраты</span>
            <strong>{totalCost} млн</strong>
          </div>
          <div className="summary-row">
            <span>Остаток</span>
            <strong className={canAfford ? 'ok' : 'danger'}>{remaining} млн</strong>
          </div>

          <div className="score-box">
            <span>Astana Quality of Life Score</span>
            <strong>{score.toFixed(1)}</strong>
          </div>

          <div className="ai-box">
            <h3>AI-объяснение</h3>
            <p>
              {canAfford
                ? 'Сценарий выглядит сбалансированным: вы инвестируете в ключевые отрасли городской среды и сохраняете финансовый запас на экстренные вмешательства.'
                : 'Сценарий превышает бюджет. Необходимо сократить наиболее дорогостоящие инициативы или перераспределить ресурсы между районами.'}
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
