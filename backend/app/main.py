import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from . import advisor, engine, news  # noqa: E402
from .schemas import ChatRequest, ChatResponse, GoalCalcRequest, MonteCarloRequest  # noqa: E402

app = FastAPI(title="Future Funds API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict:
    return {
        "status": "ok",
        "ai_enabled": advisor.ai_configured(),
        "ai_provider": advisor.provider(),
        "news_enabled": news.configured(),
    }


@app.get("/api/news")
def market_news(tz_offset_minutes: int = news.DEFAULT_TZ_OFFSET) -> dict:
    return news.load_news_or_demo(tz_offset_minutes=tz_offset_minutes)


@app.post("/api/calc/goal")
def calc_goal(req: GoalCalcRequest) -> dict:
    return engine.goal_plan(**req.model_dump())


@app.post("/api/calc/monte-carlo")
def calc_monte_carlo(req: MonteCarloRequest) -> dict:
    return engine.monte_carlo(**req.model_dump())


@app.post("/api/advisor/chat", response_model=ChatResponse)
def advisor_chat(req: ChatRequest) -> ChatResponse:
    try:
        reply, source = advisor.chat_result([m.model_dump() for m in req.messages], req.plan, req.language)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Advisor error: {exc}") from exc
    return ChatResponse(reply=reply, source=source, provider=advisor.provider())
