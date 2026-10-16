"""AI advisor. The finance engine owns every number; the model only explains it.

Switch models with AI_PROVIDER in the backend .env file:
- gemini (default): GEMINI_API_KEY and GEMINI_MODEL
- anthropic: ANTHROPIC_API_KEY and ANTHROPIC_MODEL
"""
from __future__ import annotations

import json
import os

from . import engine

PROVIDERS = ("gemini", "anthropic")


def provider() -> str:
    name = os.getenv("AI_PROVIDER", "gemini").strip().lower()
    return name if name in PROVIDERS else "gemini"


def _key(name: str) -> str:
    return os.getenv(name, "").strip()


def ai_configured() -> bool:
    if provider() == "anthropic":
        key = _key("ANTHROPIC_API_KEY")
        return key.startswith("sk-ant-") and len(key) > 20
    key = _key("GEMINI_API_KEY")
    return len(key) > 20 and not key.lower().startswith("your-")


def _setup_hint() -> str:
    if provider() == "anthropic":
        return "Claude needs a valid Anthropic API key, starting with sk-ant-, in ANTHROPIC_API_KEY."
    return (
        "Gemini needs a free API key from https://aistudio.google.com/apikey "
        "in GEMINI_API_KEY. To use Claude later, set AI_PROVIDER=anthropic."
    )


def _inr(v: float) -> str:
    n = abs(round(v or 0))
    sign = "-" if (v or 0) < 0 else ""
    if n >= 10_000_000:
        return f"{sign}₹{n / 1e7:.2f}Cr"
    if n >= 100_000:
        return f"{sign}₹{n / 1e5:.1f}L"
    return f"{sign}₹{n:,}"


def answer_from_plan(question: str, plan: dict) -> str:
    """Numbers-only reply used when the selected model is not connected."""
    q = (question or "").lower()
    goals = list(plan.get("goals") or [])
    fixes = list(plan.get("suggestedFixes") or [])
    profile = plan.get("profile") or {}
    status = {"on-track": "on track", "partial": "partly funded", "unfunded": "not funded", "done": "fully saved"}
    if any(w in q for w in ("gap", "short", "close", "fix")):
        lines = []
        for fix in fixes:
            lines.append(f"• {fix}" if isinstance(fix, str) else f"• {fix.get('title', fix)}")
        body = "\n".join(lines) or "You have no gap right now."
    elif any(w in q for w in ("first", "priorit", "order")):
        ranked = sorted(goals, key=lambda g: g.get("priorityRank") or 99)
        body = "\n".join(
            f"{g.get('priorityRank')}. {g.get('name')}: {_inr(g.get('monthlySipNeeded') or 0)}/mo ({status.get(g.get('status'), g.get('status'))})"
            for g in ranked
        ) or "Add a goal to rank them."
    elif "emergency" in q:
        spend = (profile.get("monthlyExpenses") or 0) + (profile.get("emis") or 0)
        body = f"A 6-month emergency fund for you is {_inr(6 * spend)}. You hold {_inr(profile.get('cashSavings') or 0)} in cash."
    else:
        gap = plan.get("monthlyGap") or 0
        body = (
            f"Your goals need {_inr(plan.get('totalSipNeeded') or 0)}/mo in SIPs. "
            f"The monthly gap is {_inr(gap)}."
            if goals else "Add a goal and I'll rank it against your surplus."
        )
    return f"{body}\n\n(Answered from your plan by the finance engine. {_setup_hint()})"


SYSTEM = """You are the Future Funds financial planning advisor for users in India.
Rules:
- Never calculate numbers yourself. Use the tools for every figure (future cost, SIP, probability, delay cost).
- Use get_plan_summary first to see the user's profile, goals, priorities and gaps.
- Show money in Indian format (₹ lakh / crore). Be concise: short paragraphs or a few bullets.
- Give concrete options: raise SIP, cut a spending category, extend a deadline, reduce a target.
- You give educational guidance, not regulated investment advice. Do not recommend specific funds or stocks."""

TOOLS = [
    {
        "name": "get_plan_summary",
        "description": "Return the user's current plan: profile, health score, goals with future cost, required and funded SIP, priority and success probability, and suggested fixes.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "calculate_goal",
        "description": "Compute inflation-adjusted future cost and required monthly SIP for a goal. Use for any what-if on cost, year or return.",
        "input_schema": {
            "type": "object",
            "properties": {
                "cost_today": {"type": "number", "description": "Cost in today's rupees"},
                "inflation_pct": {"type": "number"},
                "years": {"type": "integer", "description": "Years until the goal"},
                "annual_return_pct": {"type": "number"},
                "volatility_pct": {"type": "number", "description": "Yearly volatility %. Pass it so the SIP matches the app's 80% buffer."},
                "saved": {"type": "number", "description": "Amount already saved for the goal"},
                "step_up_pct": {"type": "number", "description": "Yearly SIP increase %"},
            },
            "required": ["cost_today", "inflation_pct", "years", "annual_return_pct"],
        },
    },
    {
        "name": "success_probability",
        "description": "Monte Carlo probability that a monthly contribution reaches a target.",
        "input_schema": {
            "type": "object",
            "properties": {
                "start": {"type": "number"},
                "monthly": {"type": "number"},
                "years": {"type": "integer"},
                "annual_return_pct": {"type": "number"},
                "volatility_pct": {"type": "number"},
                "target": {"type": "number"},
            },
            "required": ["start", "monthly", "years", "annual_return_pct", "volatility_pct", "target"],
        },
    },
    {
        "name": "cost_of_delay",
        "description": "How much final corpus is lost by starting a SIP later, and the SIP needed to catch up.",
        "input_schema": {
            "type": "object",
            "properties": {
                "monthly": {"type": "number"},
                "annual_return_pct": {"type": "number"},
                "years": {"type": "integer"},
                "delay_years": {"type": "integer"},
            },
            "required": ["monthly", "annual_return_pct", "years", "delay_years"],
        },
    },
]


def run_tool(name: str, args: dict, plan: dict) -> dict:
    if name == "get_plan_summary":
        return plan or {"note": "No plan data was sent."}
    if name == "calculate_goal":
        return engine.goal_plan(**args)
    if name == "success_probability":
        return engine.monte_carlo(**args, runs=1000)
    if name == "cost_of_delay":
        return engine.cost_of_delay(**args)
    return {"error": f"Unknown tool {name}"}


def _normalize(messages: list[dict]) -> list[dict]:
    """API needs alternating roles starting with user; merge or drop as needed."""
    out: list[dict] = []
    for m in messages:
        text = m["content"].strip()
        if not text:
            continue
        if not out and m["role"] != "user":
            continue
        if out and out[-1]["role"] == m["role"]:
            out[-1]["content"] += "\n\n" + text
        else:
            out.append({"role": m["role"], "content": text})
    return out


def chat(messages: list[dict], plan: dict) -> str:
    msgs: list[dict] = _normalize(messages)
    if not msgs:
        return "Ask me anything about your plan."
    if not ai_configured():
        return answer_from_plan(msgs[-1]["content"], plan or {})
    try:
        if provider() == "anthropic":
            return _claude(msgs, plan)
        return _gemini(msgs, plan)
    except Exception as exc:
        text = str(exc).lower()
        auth_failed = any(
            marker in text
            for marker in (
                "authentication_error",
                "invalid x-api-key",
                "api_key_invalid",
                "permission_denied",
                "unauthenticated",
            )
        )
        if auth_failed:
            return answer_from_plan(msgs[-1]["content"], plan or {})
        raise


def _claude(msgs: list[dict], plan: dict) -> str:
    from anthropic import Anthropic

    client = Anthropic()
    model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5")
    for _ in range(8):
        resp = client.messages.create(model=model, max_tokens=1200, system=SYSTEM, tools=TOOLS, messages=msgs)
        if resp.stop_reason != "tool_use":
            return "".join(b.text for b in resp.content if b.type == "text").strip()

        msgs.append({"role": "assistant", "content": resp.content})
        results = []
        for block in resp.content:
            if block.type == "tool_use":
                try:
                    output = run_tool(block.name, dict(block.input), plan)
                except Exception as exc:
                    output = {"error": str(exc)}
                results.append({"type": "tool_result", "tool_use_id": block.id, "content": json.dumps(output)})
        msgs.append({"role": "user", "content": results})

    return "I couldn't finish that analysis. Try a more specific question."


def _gemini_tools():
    from google.genai import types

    declarations = [
        types.FunctionDeclaration(
            name=tool["name"],
            description=tool["description"],
            parameters=tool["input_schema"],
        )
        for tool in TOOLS
    ]
    return [types.Tool(function_declarations=declarations)]


def _gemini_text(resp) -> str:
    try:
        return (resp.text or "").strip()
    except Exception:
        parts = []
        for cand in getattr(resp, "candidates", None) or []:
            content = getattr(cand, "content", None)
            for part in getattr(content, "parts", None) or []:
                if getattr(part, "text", None) and not getattr(part, "thought", False):
                    parts.append(part.text)
        return "\n".join(parts).strip()


def _overloaded(exc: Exception) -> bool:
    text = str(exc).lower()
    return "503" in text or "unavailable" in text or "high demand" in text


def _gemini_models() -> list[str]:
    primary = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite").strip() or "gemini-3.5-flash-lite"
    models = [primary]
    for extra in ("gemini-3.5-flash-lite", "gemini-3.8-flash"):
        if extra not in models:
            models.append(extra)
    return models


def _gemini_once(client, model: str, contents: list, plan: dict) -> str:
    from google.genai import types

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM,
        tools=_gemini_tools(),
        temperature=0.4,
        max_output_tokens=2048,
    )
    for _ in range(8):
        resp = client.models.generate_content(model=model, contents=contents, config=config)
        calls = list(resp.function_calls or [])
        if not calls:
            return _gemini_text(resp) or "I couldn't form a reply. Try a more specific question."
        contents.append(resp.candidates[0].content)
        parts = []
        for call in calls:
            try:
                output = run_tool(call.name, dict(call.args or {}), plan)
            except Exception as exc:
                output = {"error": str(exc)}
            parts.append(types.Part.from_function_response(name=call.name, response=output))
        contents.append(types.Content(role="user", parts=parts))
    return "I couldn't finish that analysis. Try a more specific question."


def _gemini(msgs: list[dict], plan: dict) -> str:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=_key("GEMINI_API_KEY"))
    base = [
        types.Content(
            role="model" if msg["role"] == "assistant" else "user",
            parts=[types.Part(text=msg["content"])],
        )
        for msg in msgs
    ]
    last: Exception | None = None
    for model in _gemini_models():
        try:
            return _gemini_once(client, model, list(base), plan)
        except Exception as exc:
            if _overloaded(exc):
                last = exc
                continue
            raise
    raise last if last else RuntimeError("Gemini did not return a reply.")
