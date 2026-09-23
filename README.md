# SteppeX Hack Project

## Команда
- Frontend: 1 человек
- Backend: 1 человек
- ML: 1 человек

## Структура репозитория
- [frontend/](frontend) — интерфейс пользователя
- [backend/](backend) — API и бизнес-логика
- [ml/](ml) — модели и расчёт Astana Quality of Life Score
- [docs/](docs) — архитектура и план разработки

## Идея проекта
AI-симулятор управления городом: команда получает одинаковый виртуальный бюджет и принимает 5 решений в направлениях:
- транспорт;
- озеленение;
- социальная инфраструктура;
- безопасность;
- городской сервис.

Система проверяет бюджет, рассчитывает итоговый score и формирует AI-объяснение.

## Выбранный стек
### Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- Recharts

### Backend
- Python
- FastAPI
- Pydantic

### ML
- Python
- pandas
- numpy
- scikit-learn
- Jupyter (для экспериментов)

## Архитектура
См. раздел [docs/architecture.md](docs/architecture.md).

## План разработки
См. раздел [docs/development-plan.md](docs/development-plan.md).

## Следующий шаг
После согласования стека и формата данных каждый участник может начать работу в своей папке параллельно.
