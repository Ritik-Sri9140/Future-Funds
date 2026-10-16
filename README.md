# Future Funds

From "Where is my money going?" to "Will I reach my dreams?" — a living, goal-based financial roadmap.

## Features
- Financial profile: net worth, surplus, savings rate, 0–100 health score
- Goal organizer with templates, inflation-adjusted targets and required SIP
- Life timeline with ages and milestones
- What-if simulator with saved scenarios and baseline comparison
- Gap and fix engine with one-click fixes (cut spending, step-up SIP, delay, reduce)
- Goal prioritizer: urgency × necessity × feasibility with adjustable weights
- Investment comparison and automatic glide-path allocation per goal
- Compounding lab (cost of delay, catch-up SIP, rule of 72)
- Monte Carlo success probability with p10/p50/p90 fan chart
- AI advisor (Gemini by default, Claude if AI_PROVIDER=anthropic; plan fallback if no key)
- Financial news for today and yesterday (India and global, via Marketaux), with read and unread marks kept in this browser
- Export/import JSON, print to PDF, local auto-save

## Run locally
Backend (optional, needed for AI chat):
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env    # set AI_PROVIDER=gemini and add GEMINI_API_KEY
# optional: MARKETAUX_API_TOKEN from https://www.marketaux.com/register for Financial news
uvicorn app.main:app --reload --port 8000
pytest
```
Frontend:
```bash
cd frontend
npm install
npm run dev     # http://localhost:5173
```
Or both with Docker: `docker compose up --build`

## Design notes
- All maths runs in the browser engine (`src/engine`) so every slider recalculates instantly.
  The same formulas are mirrored in `backend/app/engine.py` for the AI's tool calls, so the AI never guesses numbers.
- Future cost = Cost × (1 + inflation)^years; SIP from the future value of an annuity due, with optional annual step-up.

Educational guidance, not regulated investment advice.
