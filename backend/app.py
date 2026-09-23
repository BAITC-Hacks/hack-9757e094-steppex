from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Literal

app = FastAPI(title="SteppeX Simulator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Category = Literal["transport", "greenery", "social", "safety", "services"]


class Intervention(BaseModel):
    id: str
    category: Category
    title: str
    cost: int
    impact: int
    description: str


class SimulationRequest(BaseModel):
    budget_total: int = 1000
    selected_ids: List[str]


class SimulationResponse(BaseModel):
    total_cost: int
    remaining_budget: int
    score: float
    strengths: List[str]
    risks: List[str]
    recommendations: List[str]


INTERVENTIONS = [
    {"id": "t1", "category": "transport", "title": "Новые автобусные линии", "cost": 350, "impact": 18, "description": "Снижает перегрузку и повышает связанность районов."},
    {"id": "g1", "category": "greenery", "title": "Парки и зеленые коридоры", "cost": 260, "impact": 15, "description": "Улучшает микроклимат и комфорт городской среды."},
    {"id": "s1", "category": "social", "title": "Постройка школ и центров", "cost": 420, "impact": 22, "description": "Решает задачи доступности социальной инфраструктуры."},
    {"id": "sa1", "category": "safety", "title": "Камеры и патрули", "cost": 310, "impact": 17, "description": "Повышает уровень общественной безопасности."},
    {"id": "se1", "category": "services", "title": "Цифровые городские сервисы", "cost": 290, "impact": 16, "description": "Улучшают доступность и качество электронных услуг."},
    {"id": "t2", "category": "transport", "title": "Электробусы на ключевых маршрутах", "cost": 480, "impact": 24, "description": "Дает сильный эффект для транспортной модели."},
    {"id": "g2", "category": "greenery", "title": "Сады и озеленение дворов", "cost": 210, "impact": 12, "description": "Недорогой и заметный эффект на качество жизни."},
    {"id": "s2", "category": "social", "title": "Физкультурные и клубные зоны", "cost": 240, "impact": 13, "description": "Поддерживает здоровье и вовлеченность населения."},
    {"id": "sa2", "category": "safety", "title": "Освещение и общественная безопасность", "cost": 260, "impact": 14, "description": "Снижает риск и улучшает ощущение комфорта."},
    {"id": "se2", "category": "services", "title": "Реформы городской сервисной инфраструктуры", "cost": 340, "impact": 19, "description": "Улучшают скорость и прозрачность госуслуг."},
]


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "steppex-simulator",
        "version": "1.0.0",
    }


@app.get("/api/interventions", response_model=List[Intervention])
def get_interventions():
    return INTERVENTIONS


@app.post("/api/simulate", response_model=SimulationResponse)
def simulate(payload: SimulationRequest):
    if len(payload.selected_ids) > 5:
        raise HTTPException(status_code=400, detail="Можно выбрать не более 5 инициатив.")

    selected = {item["id"]: item for item in INTERVENTIONS if item["id"] in payload.selected_ids}
    total_cost = sum(item["cost"] for item in selected.values())
    remaining_budget = payload.budget_total - total_cost

    if remaining_budget < 0:
        raise HTTPException(status_code=400, detail="Бюджет превышен.")

    score = max(
        0,
        min(
            100,
            50 + sum(item["impact"] for item in selected.values()) * 0.8 - max(0, total_cost - payload.budget_total) * 0.12,
        ),
    )

    strengths = []
    risks = []
    recommendations = []

    if "t1" in selected or "t2" in selected:
        strengths.append("Транспортная связанность улучшается, что снижает перегрузку ключевых коридоров города.")
    else:
        risks.append("Слабый транспортный компонент может вызвать перегрузку и снижение качества перемещения жителей.")

    if "g1" in selected or "g2" in selected:
        strengths.append("Озеленение повышает комфорт городской среды и устойчивость районов.")
    else:
        risks.append("Низкий уровень озеленения ухудшает микроклимат и воспринимаемое качество городской среды.")

    if "s1" in selected or "s2" in selected:
        strengths.append("Социальная инфраструктура поддерживает развитие семей и молодежи.")
    else:
        risks.append("Отсутствие социальных объектов увеличивает нагрузку на существующую инфраструктуру.")

    if "sa1" in selected or "sa2" in selected:
        strengths.append("Меры по безопасности повышают доверие жителей и общественное спокойствие.")
    else:
        risks.append("Низкий уровень безопасности снижает чувство защищенности и ограничивает развитие районов.")

    if "se1" in selected or "se2" in selected:
        strengths.append("Городские сервисы становятся более доступными и эффективными для граждан.")
    else:
        risks.append("Недостаток сервисных реформ ограничивает качество цифровых и административных услуг.")

    if remaining_budget > 150:
        recommendations.append("Оставшийся бюджет стоит сохранить как резерв для непредвиденных городских мер.")
    else:
        recommendations.append("Рекомендуется перераспределить часть средств, чтобы не допустить дисбаланса между районами.")

    if score < 60:
        recommendations.append("Необходимо усилить транспорт и безопасность, чтобы снизить системные риски сценария.")

    return SimulationResponse(
        total_cost=total_cost,
        remaining_budget=remaining_budget,
        score=float(score),
        strengths=strengths,
        risks=risks,
        recommendations=recommendations,
    )
