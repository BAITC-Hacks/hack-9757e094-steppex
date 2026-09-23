# Контракт API SteppeX v1

Локальная объединённая сборка: frontend `http://127.0.0.1:5173`, backend `http://127.0.0.1:3002`. Frontend использует относительные `/api/...` через proxy. Примеры ниже с портом 3001 относятся к исходной отдельной backend-версии; в этой сборке используйте 3002 или относительный путь. Все POST-запросы содержат `Content-Type: application/json`. Поля `budget`, `cost`, `score`, пользовательские эффекты и неизвестные поля запрещены.

## Дополнения локальной интеграции

- `/api/health`: `mlStatus: "connected"` после контрольного запуска Python при старте сервера.
- `/api/simulate`: дополнительно `risks` и `ml` с `status: "verified"`, округлённым Python Score и пояснением. У стратегий `simulation.ml` содержит такую же проверку.
- Ошибки `ML_UNAVAILABLE`, `ML_INVALID_OUTPUT`, `ML_RESULT_MISMATCH` возвращаются с HTTP 503. Не показывайте успешный результат при этих ошибках.
- Успешный `/api/analyze` содержит `usage`: `inputTokens`, `cachedInputTokens`, `outputTokens`, `modelRequests`, `complete`, `estimatedUsd`, `pricingNote`. Оценка USD доступна только для `gpt-5-mini` с полной статистикой всех шагов. Это не счёт провайдера.
- Python-модуль не вызывает нейросеть; его текстовые замечания нельзя подписывать как живой ИИ-ответ.

## Маршруты

| Метод | Путь              | Назначение                                                                     |
| ----- | ----------------- | ------------------------------------------------------------------------------ |
| GET   | `/api/health`     | Статус, версия датасета, наличие настройки ИИ                                  |
| GET   | `/api/catalog`    | Районы, меры, показатели, бюджет, правила, база, пример                        |
| POST  | `/api/validate`   | Проверка текущего набора, включая неполный; `200`, `valid`, `errors`, `budget` |
| POST  | `/api/simulate`   | Итоговый расчёт валидных пяти решений                                          |
| POST  | `/api/strategies` | Три вычисленные стратегии без LLM                                              |
| POST  | `/api/compare`    | Сравнение двух или трёх пользовательских наборов                               |
| POST  | `/api/analyze`    | Расчёт + настоящий AI-анализ, инструменты, риски, стратегии                    |

Пример для `/api/validate`, `/api/simulate` и `/api/strategies`:

```json
{
  "decisions": [
    { "measureId": "M7", "districtId": "nura" },
    { "measureId": "M8", "districtId": "nura" },
    { "measureId": "M10", "districtId": "nura" },
    { "measureId": "M12" },
    { "measureId": "M5", "districtId": "saryarka" }
  ]
}
```

Для `/api/analyze` можно добавить `question`, до 1500 символов, например: «Какая стратегия лучше поддерживает слабый район и что она ухудшит?». Предыдущий контракт учебного чата `/api/chat` к новой задаче не относится.

Районы: `esil`, `almaty`, `saryarka`, `baikonur`, `nura`. Для городских мер `districtId` не передаётся либо равен `null`. Для районных обязателен существующий ID.

## Основной ответ расчёта

`/api/simulate` возвращает:

```json
{
  "valid": true,
  "budget": { "total": 100, "spent": 95, "remaining": 5 },
  "baselineScore": 52.55768,
  "score": 56.54307,
  "scoreDelta": 3.98539
}
```

Это сокращённый пример. Полный ответ содержит `datasetVersion`, нормализованные `decisions`, `formula`, `districts` с `before/after/deltas`, `criticalIndicators`, `synergies`, `measures` с реализованными эффектами, лагами и предельным вкладом.

`/api/analyze` возвращает объект с полями:

- `simulation`: полный детерминированный расчёт.
- `analysis`: `status: "complete"`, `model`, `headline`, `summary`, `strengths`, `tradeoffs`, `risks`, `recommendations`, `recommendedStrategyId`, `limitations`, `nextQuestion`.
- `risks`: вычисленные предупреждения для текущего набора.
- `strategies`: три карточки `quality`, `equity`, `reserve`, каждая с `changed`, `replacement`, `scoreGain`, `reserveGain`, `weakestDistrictGain`, полным `simulation` и `risks`.
- `verifiedAlternatives`: дополнительные наборы, которые агент проверил инструментом; может быть пустым.
- `toolTrace`: имена вызванных инструментов и успешность. Это журнал действий, а не скрытые рассуждения модели.

В `analysis.risks[].evidenceId` ссылка ведёт в текущие `risks[].id` либо в риск стратегии с префиксом `<strategyId>:`. Числовые значения показывайте из вычисленного объекта, пояснение — из `analysis`.

Если `strategy.changed` равно `false`, улучшенный соседний вариант по этой цели не найден; не показывайте кнопку «Улучшить» для этой карточки. Несколько стратегий могут совпадать. Применение рекомендации выполняется только по действию пользователя: возьмите `strategy.simulation.decisions` и повторно отправьте их на `/api/simulate`.

## Пример подключения сайта

```js
const API = "http://127.0.0.1:3001";
const catalog = await fetch(`${API}/api/catalog`).then((r) => r.json());
const response = await fetch(`${API}/api/analyze`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    decisions: catalog.exampleDecisions,
    question: "Какие риски остаются у слабого района?",
  }),
});
const result = await response.json();
if (!response.ok) {
  // result.simulation может присутствовать при отсутствии API-ключа.
  showError(result.error.message);
} else {
  showScore(result.simulation.score.toFixed(2));
  showReport(result.analysis);
  showStrategyCards(result.strategies);
}
```

Функции `showError`, `showScore`, `showReport`, `showStrategyCards` реализует frontend. Выводите строки через `textContent` или стандартные текстовые компоненты фреймворка. API-ключ в браузере не используется.

## Сравнение

`POST /api/compare`: `{ "scenarios": [{ "name": "Наш вариант", "decisions": [...] }, { "name": "Альтернатива", "decisions": [...] }] }`.

Ответ: `results`, в каждом `name`, `simulation`, `risks`; `bestIndexes` — индексы лучшего результата (несколько при равенстве), `datasetVersion`. Невалидный набор отклоняет весь запрос.

## Ошибки

Все ошибки содержат `error.code` и `error.message`.

| HTTP      | Код                                   | Значение                                                                                       |
| --------- | ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 400       | `INVALID_REQUEST` / `INVALID_JSON`    | Формат или неизвестные поля                                                                    |
| 403       | `ORIGIN_NOT_ALLOWED`                  | Адрес сайта отсутствует в `FRONTEND_ORIGINS`                                                   |
| 413 / 415 | `REQUEST_TOO_LARGE` / `JSON_REQUIRED` | Размер или Content-Type                                                                        |
| 422       | `INVALID_SCENARIO`                    | Бюджет, количество, несовместимость, район или направление; `score: null`, `errors` с деталями |
| 429       | `AI_RATE_LIMIT`                       | Лимит запросов либо параллельных анализов; `Retry-After: 60`                                   |
| 502       | `AI_*`                                | Провайдер недоступен, анализ не завершён или отчёт не прошёл проверку                          |
| 503       | `AI_NOT_CONFIGURED`                   | На сервере нет ключа; детерминированный `simulation` присутствует                              |

`/api/validate` возвращает HTTP 200 и `valid: false` для обычных нарушений правил — это удобно при выборе карточек. `/api/simulate` и `/api/analyze` требуют полностью допустимый набор и вернут HTTP 422.

Для ИИ показывайте индикатор ожидания. Один анализ ограничен четырьмя запросами модели, шестью вызовами инструментов и общим тайм-аутом около полутора минут. На клиенте кнопка анализа должна блокироваться на время текущего запроса.

## Работа команды

- Backend-разработчик: `backend/**`, этот контракт и документация расчёта.
- Frontend-разработчик: `frontend/**` или отдельный `public/**`; получает данные через API, не переносит серверные секреты.
- Третий участник: UX сценария, демонстрация, проверка требований и итоговая интеграция.

При изменении API обновите контракт до объединения веток. Датасет и формула едины для всех участников.
