import app.advisor as advisor


def test_gemini_is_the_default_provider(monkeypatch):
    monkeypatch.delenv("AI_PROVIDER", raising=False)
    assert advisor.provider() == "gemini"


def test_missing_gemini_key_answers_from_the_plan(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "")
    reply = advisor.chat(
        [{"role": "user", "content": "Which goal should I fund first?"}],
        {
            "goals": [
                {"priorityRank": 1, "name": "Emergency fund", "monthlySipNeeded": 8615, "status": "on-track"},
            ],
            "suggestedFixes": [],
            "profile": {"cashSavings": 300000, "monthlyExpenses": 55000, "emis": 15000},
        },
    )
    assert "Emergency fund" in reply
    assert "GEMINI_API_KEY" in reply
    assert advisor.ai_configured() is False


def test_tax_questions_are_not_estimated(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "")
    reply = advisor.chat([{"role": "user", "content": "How much tax will Section 80C save me?"}], {"goals": []})
    assert "Tax save & reduce" in reply
    assert "does not estimate tax" in reply


def test_tax_questions_are_not_estimated(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "")
    reply = advisor.chat([{"role": "user", "content": "How much tax will Section 80C save me?"}], {"goals": []})
    assert "Tax save & reduce" in reply
    assert "does not estimate tax" in reply


def test_anthropic_provider_can_be_selected(monkeypatch):
    monkeypatch.setenv("AI_PROVIDER", "anthropic")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
    assert advisor.provider() == "anthropic"
    assert advisor.ai_configured() is False
