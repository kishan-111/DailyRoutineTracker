import { countCompleted, formatSavedDate } from "../utils/tasks.js";
import "./LastDaySummary.css";

export default function LastDaySummary({ routine }) {
  if (!routine) return null;

  const { done, total } = countCompleted(routine.tasks);
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <section className="last-day">
      <div className="last-day__header">
        <div>
          <h3>Yesterday&apos;s routine</h3>
          <p className="last-day__date">{formatSavedDate(routine.date)}</p>
        </div>
        <div className="last-day__score">
          <span className="last-day__score-value">{percent}%</span>
          <span className="last-day__score-label">
            {done}/{total} done
          </span>
        </div>
      </div>

      <ul className="last-day__list">
        {routine.tasks.map((task) => (
          <li
            key={task.id}
            className={`last-day__item${task.done ? " last-day__item--done" : ""}`}
          >
            <span className="last-day__check" aria-hidden="true">
              {task.done ? "✓" : "○"}
            </span>
            <span className="last-day__time">
              {task.start} – {task.end}
            </span>
            <span className="last-day__label">{task.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
