"""
Simulation feedback system — collects ratings, tracks quiz scores,
and feeds improvement signals back into the Simulator AI.

Every simulation gets rated on three axes:
  - Realism (1-5): did the attack scenario match real-world techniques?
  - Clarity (1-5): was the explanation clear enough to teach something?
  - Accuracy (1-5): was the vulnerable code analysis correct?

Feedback is persisted as JSON and injected into future simulation prompts
so the AI self-corrects over time toward what actually works educationally.

Quiz scores are tracked per simulation to measure learning effectiveness.
"""

from __future__ import annotations

import json
import time
import uuid
from pathlib import Path
from datetime import datetime, timezone

_FEEDBACK_FILE = Path(__file__).parent / ".bass_feedback.json"


def _load() -> dict:
    if _FEEDBACK_FILE.exists():
        try:
            return json.loads(_FEEDBACK_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {"simulations": {}, "quiz_scores": {}, "summary": {}}


def _save(data: dict) -> None:
    try:
        _FEEDBACK_FILE.write_text(json.dumps(data, indent=2, default=str))
    except OSError:
        pass


def record_feedback(
    simulation_id: str,
    realism: int,
    clarity: int,
    accuracy: int,
    comment: str = "",
    attack_type: str = "",
) -> dict:
    """
    Record a feedback rating for a simulation.
    Scores are 1-5; out-of-range values are clamped.
    Returns the stored record.
    """
    realism  = max(1, min(5, realism))
    clarity  = max(1, min(5, clarity))
    accuracy = max(1, min(5, accuracy))

    record = {
        "feedback_id": str(uuid.uuid4()),
        "simulation_id": simulation_id,
        "attack_type": attack_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "scores": {
            "realism": realism,
            "clarity": clarity,
            "accuracy": accuracy,
            "overall": round((realism + clarity + accuracy) / 3, 2),
        },
        "comment": comment.strip()[:500],
    }

    data = _load()
    if simulation_id not in data["simulations"]:
        data["simulations"][simulation_id] = []
    data["simulations"][simulation_id].append(record)

    _update_summary(data)
    _save(data)
    return record


def record_quiz_score(
    simulation_id: str,
    attack_type: str,
    correct: int,
    total: int,
    answers: dict | None = None,
) -> dict:
    """Record a quiz attempt and score."""
    record = {
        "score_id": str(uuid.uuid4()),
        "simulation_id": simulation_id,
        "attack_type": attack_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "correct": correct,
        "total": total,
        "percentage": round((correct / total * 100) if total else 0, 1),
        "passed": (correct / total >= 0.7) if total else False,
        "answers": answers or {},
    }

    data = _load()
    if simulation_id not in data["quiz_scores"]:
        data["quiz_scores"][simulation_id] = []
    data["quiz_scores"][simulation_id].append(record)

    _update_summary(data)
    _save(data)
    return record


def get_improvement_context(attack_type: str | None = None) -> str:
    """
    Build a feedback context block to inject into future simulation prompts.
    This is how the AI learns from past ratings.
    """
    data = _load()
    summary = data.get("summary", {})

    if not summary:
        return ""

    lines = ["=== FEEDBACK FROM PREVIOUS SIMULATIONS (use to improve this one) ==="]

    # Global averages
    avg = summary.get("global_averages", {})
    if avg:
        lines.append(
            f"Global averages — Realism: {avg.get('realism', 'N/A')}/5, "
            f"Clarity: {avg.get('clarity', 'N/A')}/5, "
            f"Accuracy: {avg.get('accuracy', 'N/A')}/5"
        )

    # Attack-type specific feedback
    if attack_type:
        attack_avg = summary.get("by_attack_type", {}).get(attack_type, {})
        if attack_avg:
            lines.append(
                f"\nFor {attack_type} specifically — "
                f"Realism: {attack_avg.get('realism', 'N/A')}/5, "
                f"Clarity: {attack_avg.get('clarity', 'N/A')}/5, "
                f"Accuracy: {attack_avg.get('accuracy', 'N/A')}/5"
            )
            low = [k for k, v in attack_avg.items() if isinstance(v, (int, float)) and v < 3.5]
            if low:
                lines.append(f"  ⚠ Weak areas for {attack_type}: {', '.join(low)} — improve these in this simulation.")

    # Common complaints from comments
    comments = summary.get("recent_comments", [])
    if comments:
        lines.append("\nRecent feedback comments (incorporate improvements):")
        for c in comments[-3:]:
            lines.append(f"  - {c}")

    # Quiz effectiveness
    quiz_avg = summary.get("quiz_pass_rate", None)
    if quiz_avg is not None:
        lines.append(f"\nAverage quiz pass rate: {quiz_avg:.0f}%")
        if quiz_avg < 60:
            lines.append(
                "  ⚠ Quiz pass rate is LOW — make explanations clearer, "
                "add more context to questions, ensure learning objectives are explicit."
            )

    lines.append("=== END FEEDBACK CONTEXT ===")
    return "\n".join(lines)


def get_stats() -> dict:
    """Return feedback statistics for the dashboard."""
    data = _load()
    return data.get("summary", {})


def _update_summary(data: dict) -> None:
    all_scores = {"realism": [], "clarity": [], "accuracy": []}
    by_type: dict[str, dict] = {}
    recent_comments: list[str] = []

    for sim_feedbacks in data["simulations"].values():
        for fb in sim_feedbacks:
            scores = fb.get("scores", {})
            attack_type = fb.get("attack_type", "unknown")
            for key in all_scores:
                if key in scores:
                    all_scores[key].append(scores[key])
            if attack_type not in by_type:
                by_type[attack_type] = {"realism": [], "clarity": [], "accuracy": []}
            for key in all_scores:
                if key in scores:
                    by_type[attack_type][key].append(scores[key])
            if fb.get("comment"):
                recent_comments.append(fb["comment"])

    def avg(lst: list) -> float | None:
        return round(sum(lst) / len(lst), 2) if lst else None

    global_avgs = {k: avg(v) for k, v in all_scores.items()}

    by_type_avgs = {
        atype: {k: avg(v) for k, v in scores.items()}
        for atype, scores in by_type.items()
    }

    # Quiz pass rate
    all_quiz = [
        score for scores in data["quiz_scores"].values()
        for score in scores
    ]
    quiz_pass_rate = (
        sum(1 for s in all_quiz if s.get("passed")) / len(all_quiz) * 100
        if all_quiz else None
    )

    data["summary"] = {
        "total_feedback_entries": sum(len(v) for v in data["simulations"].values()),
        "total_quiz_attempts": len(all_quiz),
        "global_averages": global_avgs,
        "by_attack_type": by_type_avgs,
        "recent_comments": recent_comments[-10:],
        "quiz_pass_rate": quiz_pass_rate,
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }
