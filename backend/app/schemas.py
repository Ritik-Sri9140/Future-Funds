from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    plan: dict = Field(default_factory=dict)


class ChatResponse(BaseModel):
    reply: str


class GoalCalcRequest(BaseModel):
    cost_today: float = Field(ge=0)
    inflation_pct: float = Field(ge=0, le=30)
    years: int = Field(ge=0, le=60)
    annual_return_pct: float = Field(ge=0, le=30)
    saved: float = Field(default=0, ge=0)
    step_up_pct: float = Field(default=0, ge=0, le=50)
    volatility_pct: float = Field(default=0, ge=0, le=60)


class MonteCarloRequest(BaseModel):
    start: float = Field(ge=0)
    monthly: float = Field(ge=0)
    years: int = Field(ge=0, le=60)
    annual_return_pct: float
    volatility_pct: float = Field(ge=0, le=60)
    target: float = Field(ge=0)
    runs: int = Field(default=1000, ge=100, le=10000)
    step_up_pct: float = 0
