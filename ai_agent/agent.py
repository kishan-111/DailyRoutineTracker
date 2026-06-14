"""
LLM Agent: Routine Task Feedback Generator

Takes a list of routine tasks (with completion status) and generates:
  1. A motivational paragraph – celebrating wins and encouraging the user.
  2. An improvement paragraph – honest, constructive feedback on missed/incomplete tasks.

Usage:
    python agent.py                      # runs built-in demo
    python agent.py --date 2026-06-10    # generates feedback for a specific date
"""

import os
import json
import argparse
from typing import Optional
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


# ---------------------------------------------------------------------------
# Data helpers
# ---------------------------------------------------------------------------

def build_task_summary(tasks: list[dict]) -> tuple[list[str], list[str]]:
    """
    Split tasks into two lists: completed and pending/missed.

    Each task dict should contain at least:
        {
            "id": "...",
            "start": "HH:MM",
            "end": "HH:MM",
            "label": "Task name",
            "done": true | false
        }
    """
    completed = []
    missed = []
    for task in tasks:
        label = task.get("label", "Unknown task")
        time_range = f"{task.get('start', '')}–{task.get('end', '')}"
        entry = f"{label} ({time_range})"
        if task.get("done"):
            completed.append(entry)
        else:
            missed.append(entry)
    return completed, missed


def format_task_list(tasks: list[str]) -> str:
    if not tasks:
        return "None"
    return "\n".join(f"  • {t}" for t in tasks)


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def build_prompt(
    tasks: list[dict],
    date: Optional[str] = None,
    day_of_week: Optional[int] = None,
) -> str:
    """Build the user-side prompt sent to the LLM."""
    completed, missed = build_task_summary(tasks)

    day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    day_label = day_names[day_of_week] if day_of_week is not None else "Unknown day"
    date_line = f"Date: {date} ({day_label})" if date else f"Day: {day_label}"

    prompt = f"""
{date_line}

COMPLETED TASKS ({len(completed)}):
{format_task_list(completed)}

MISSED / INCOMPLETE TASKS ({len(missed)}):
{format_task_list(missed)}

Based on the above daily routine log, write exactly two paragraphs:

**Paragraph 1 – Motivation:**
Acknowledge and celebrate what was accomplished. Be warm, specific, and energising.
Reference the actual tasks that were completed. Keep it genuine, not over-the-top.

**Paragraph 2 – Improvement:**
Give honest, constructive, and actionable feedback about the tasks that were missed or left incomplete.
Identify any patterns (e.g., evening tasks consistently missed), suggest small adjustments, and end on
an encouraging note. Be direct but compassionate.

Return only the two paragraphs, separated by a blank line. Do NOT include headers or labels.
""".strip()

    return prompt


# ---------------------------------------------------------------------------
# LLM agent
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = (
    "You are a personal productivity coach. You receive a user's daily routine log "
    "showing which tasks they completed and which they missed. You write two focused, "
    "human-sounding paragraphs: one motivational and one with practical improvement suggestions. "
    "You are honest, warm, and concise. Avoid generic fluff – always reference the specific tasks."
)


def generate_feedback(
    tasks: list[dict],
    date: Optional[str] = None,
    day_of_week: Optional[int] = None,
    model: str = "gpt-4o-mini",
) -> dict[str, str]:
    """
    Call the LLM and return a dict with keys:
        'motivation'  – motivational paragraph
        'improvement' – improvement paragraph
        'raw'         – full raw response text
    """
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    user_prompt = build_prompt(tasks, date=date, day_of_week=day_of_week)

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.7,
        max_tokens=600,
    )

    raw_text: str = response.choices[0].message.content.strip()

    # Split into two paragraphs (separated by a blank line)
    parts = [p.strip() for p in raw_text.split("\n\n") if p.strip()]
    motivation = parts[0] if len(parts) >= 1 else raw_text
    improvement = parts[1] if len(parts) >= 2 else ""

    return {
        "motivation": motivation,
        "improvement": improvement,
        "raw": raw_text,
    }


# ---------------------------------------------------------------------------
# CLI / demo
# ---------------------------------------------------------------------------

DEMO_TASKS = [
    {"id": "1", "start": "07:00", "end": "07:30", "label": "Wake up + Freshen up", "done": True},
    {"id": "2", "start": "07:30", "end": "08:00", "label": "LeetCode", "done": True},
    {"id": "3", "start": "08:00", "end": "08:30", "label": "ByteByteGo", "done": False},
    {"id": "4", "start": "08:30", "end": "09:00", "label": "Bath & Get Ready", "done": True},
    {"id": "5", "start": "09:00", "end": "09:15", "label": "Breakfast", "done": True},
    {"id": "6", "start": "09:15", "end": "09:30", "label": "Reach Office / Commute", "done": True},
    {"id": "7", "start": "10:30", "end": "11:00", "label": "DSM", "done": True},
    {"id": "8", "start": "11:15", "end": "11:20", "label": "Improve one naming decision", "done": False},
    {"id": "9", "start": "11:20", "end": "13:15", "label": "Office Work", "done": True},
    {"id": "10", "start": "13:15", "end": "14:00", "label": "Lunch", "done": True},
    {"id": "11", "start": "14:00", "end": "17:30", "label": "Office Work", "done": True},
    {"id": "12", "start": "17:35", "end": "17:40", "label": "Update JIRA", "done": False},
    {"id": "13", "start": "17:40", "end": "18:00", "label": "DSM Updates", "done": True},
    {"id": "14", "start": "18:00", "end": "19:00", "label": "Self Review", "done": False},
    {"id": "15", "start": "19:00", "end": "19:15", "label": "Learning Block", "done": False},
    {"id": "16", "start": "19:15", "end": "19:30", "label": "Talk/Reels", "done": True},
    {"id": "17", "start": "20:00", "end": "21:00", "label": "Cooking", "done": True},
    {"id": "18", "start": "21:00", "end": "21:30", "label": "Dinner", "done": True},
    {"id": "19", "start": "21:30", "end": "23:30", "label": "Talk/Reels / Free", "done": True},
    {"id": "20", "start": "23:30", "end": "24:00", "label": "Book Reading", "done": False},
]


def main():
    parser = argparse.ArgumentParser(description="Generate motivational + improvement feedback for a day's tasks.")
    parser.add_argument("--tasks-json", type=str, help="Path to a JSON file containing a tasks array")
    parser.add_argument("--date", type=str, help="Date string, e.g. 2026-06-10")
    parser.add_argument("--day-of-week", type=int, help="Day of week index (0=Sunday … 6=Saturday)")
    parser.add_argument("--model", type=str, default="gpt-4o-mini", help="OpenAI model to use")
    parser.add_argument(
        "--output-json",
        action="store_true",
        help="Write output as JSON to stdout (used when called programmatically)",
    )
    args = parser.parse_args()

    # Load tasks
    if args.tasks_json:
        with open(args.tasks_json, "r") as f:
            data = json.load(f)
        # Accept either a plain array or {"tasks": [...]}
        tasks = data if isinstance(data, list) else data.get("tasks", [])
    else:
        if not args.output_json:
            print("No --tasks-json provided. Using built-in demo tasks.\n")
        tasks = DEMO_TASKS

    result = generate_feedback(
        tasks,
        date=args.date,
        day_of_week=args.day_of_week,
        model=args.model,
    )

    if args.output_json:
        # Structured output for programmatic callers (e.g. Go backend)
        print(json.dumps({
            "motivation": result["motivation"],
            "improvement": result["improvement"],
        }))
    else:
        print("=" * 60)
        print("\n🌟 MOTIVATION\n")
        print(result["motivation"])
        print("\n📈 IMPROVEMENT\n")
        print(result["improvement"])


if __name__ == "__main__":
    main()
