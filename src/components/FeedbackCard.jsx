import { useEffect, useState } from "react";
import { fetchFeedback } from "../api/feedback.js";
import "./FeedbackCard.css";

const STATE = {
  IDLE: "idle",
  LOADING: "loading",
  DONE: "done",
  ERROR: "error",
};

/**
 * FeedbackCard
 * Renders a "Get AI Feedback" button for a past routine date.
 * On click it calls the backend which runs the Python LLM agent and
 * returns two paragraphs: motivation and improvement.
 *
 * Props:
 *   date {string} – YYYY-MM-DD of the routine to analyse
 */
export default function FeedbackCard({ date }) {
  const [state, setState] = useState(STATE.IDLE);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  // Reset when the date changes (different day's summary shown)
  useEffect(() => {
    setState(STATE.IDLE);
    setFeedback(null);
    setError(null);
  }, [date]);

  async function handleGenerate() {
    setState(STATE.LOADING);
    setError(null);
    try {
      const data = await fetchFeedback(date);
      setFeedback(data);
      setState(STATE.DONE);
    } catch (err) {
      setError(err.message);
      setState(STATE.ERROR);
    }
  }

  return (
    <div className="feedback">
      {/* Trigger button – shown while idle or after an error */}
      {(state === STATE.IDLE || state === STATE.ERROR) && (
        <button
          type="button"
          className="feedback__btn"
          onClick={handleGenerate}
          aria-label="Generate AI feedback for this day"
        >
          <span className="feedback__btn-icon" aria-hidden="true">✨</span>
          Get AI Feedback
        </button>
      )}

      {/* Loading state */}
      {state === STATE.LOADING && (
        <div className="feedback__loading" role="status" aria-live="polite">
          <span className="feedback__spinner" aria-hidden="true" />
          <span>Analysing your day…</span>
        </div>
      )}

      {/* Error state */}
      {state === STATE.ERROR && (
        <p className="feedback__error" role="alert">
          {error || "Something went wrong. Try again."}
        </p>
      )}

      {/* Result */}
      {state === STATE.DONE && feedback && (
        <div className="feedback__result" aria-live="polite">
          <div className="feedback__block feedback__block--motivation">
            <span className="feedback__block-icon" aria-hidden="true">🌟</span>
            <div>
              <p className="feedback__block-label">Motivation</p>
              <p className="feedback__block-text">{feedback.motivation}</p>
            </div>
          </div>

          <div className="feedback__block feedback__block--improvement">
            <span className="feedback__block-icon" aria-hidden="true">📈</span>
            <div>
              <p className="feedback__block-label">Improvement</p>
              <p className="feedback__block-text">{feedback.improvement}</p>
            </div>
          </div>

          <button
            type="button"
            className="feedback__regenerate"
            onClick={handleGenerate}
            aria-label="Regenerate AI feedback"
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}
