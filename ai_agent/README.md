# AI Agent – Daily Routine Feedback

A Python LLM agent that takes a day's routine tasks (with completion status) and returns two focused paragraphs:

| Paragraph | Purpose |
|-----------|---------|
| **Motivation** | Celebrates completed tasks; energises the user |
| **Improvement** | Honest, actionable advice on missed/incomplete tasks |

---

## Setup

```bash
cd ai_agent
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and set your OPENAI_API_KEY
```

---

## Usage

### Run the built-in demo

```bash
python agent.py
```

### Pass your own tasks as JSON

Create a file `my_tasks.json`:

```json
[
  { "id": "1", "start": "07:00", "end": "07:30", "label": "Wake up + Freshen up", "done": true },
  { "id": "2", "start": "07:30", "end": "08:00", "label": "LeetCode",             "done": false }
]
```

Then run:

```bash
python agent.py --tasks-json my_tasks.json --date 2026-06-10 --day-of-week 3
```

### Import as a module

```python
from agent import generate_feedback

tasks = [
    {"id": "1", "start": "07:00", "end": "07:30", "label": "Wake up", "done": True},
    {"id": "2", "start": "07:30", "end": "08:00", "label": "LeetCode", "done": False},
]

result = generate_feedback(tasks, date="2026-06-10", day_of_week=3)
print(result["motivation"])   # motivational paragraph
print(result["improvement"])  # improvement paragraph
```

---

## Task schema

Each task object must follow the same structure used by the backend:

```json
{
  "id":    "string",
  "start": "HH:MM",
  "end":   "HH:MM",
  "label": "Task name",
  "done":  true | false
}
```

This matches the `RoutineTask` model in `backend/internal/models/daily_routine.go`.

---

## Configuration

| Env var | Description |
|---------|-------------|
| `OPENAI_API_KEY` | Required. Your OpenAI API key. |

| CLI flag | Default | Description |
|----------|---------|-------------|
| `--tasks-json` | – | Path to JSON file with tasks array |
| `--date` | – | Date string, e.g. `2026-06-10` |
| `--day-of-week` | – | 0 = Sunday … 6 = Saturday |
| `--model` | `gpt-4o-mini` | OpenAI model to use |
