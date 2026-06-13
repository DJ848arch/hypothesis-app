"""
Quiz Manager — handles quiz scheduling, assignment, result tracking,
and automatic training scheduling for wrong answers.

Flow:
  1. Manager schedules a quiz for selected team members
  2. Members see a pop-up when they open the dashboard
  3. They complete the quiz; results are recorded per question
  4. For each wrong answer, AI generates a targeted training plan
  5. Training is auto-scheduled; manager and member are notified

All state is persisted to .bass_quiz_state.json.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

import anthropic

_STATE_FILE = Path(__file__).parent / ".bass_quiz_state.json"

# ──────────────────────────────────────────────────────────────
# Persistence helpers
# ──────────────────────────────────────────────────────────────

def _load() -> dict:
    if _STATE_FILE.exists():
        try:
            return json.loads(_STATE_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {
        "team_members": {},
        "quiz_assignments": {},
        "quiz_results": {},
        "training_schedule": {},
        "notifications": {},
    }


def _save(state: dict) -> None:
    try:
        _STATE_FILE.write_text(json.dumps(state, indent=2, default=str))
    except OSError:
        pass


# ──────────────────────────────────────────────────────────────
# Team management
# ──────────────────────────────────────────────────────────────

def upsert_member(name: str, email: str, role: str = "Security Analyst") -> dict:
    state = _load()
    member_id = _name_to_id(name)
    state["team_members"][member_id] = {
        "member_id": member_id,
        "name": name,
        "email": email,
        "role": role,
        "joined": datetime.now(timezone.utc).isoformat(),
    }
    _save(state)
    return state["team_members"][member_id]


def list_members() -> list[dict]:
    state = _load()
    return list(state["team_members"].values())


def _name_to_id(name: str) -> str:
    return name.lower().replace(" ", "_").replace("-", "_")


def get_member(member_id: str) -> dict | None:
    return _load()["team_members"].get(member_id)


# ──────────────────────────────────────────────────────────────
# Quiz scheduling
# ──────────────────────────────────────────────────────────────

def schedule_quiz(
    member_ids: list[str],
    questions: list[dict],
    attack_types: list[str],
    title: str = "Security Knowledge Check",
    scheduled_by: str = "manager",
    deliver_at: datetime | None = None,
) -> dict:
    """
    Create and assign a quiz to a list of team members.
    Returns the assignment record.
    """
    assignment_id = str(uuid.uuid4())
    deliver_at = deliver_at or datetime.now(timezone.utc)

    assignment = {
        "assignment_id": assignment_id,
        "title": title,
        "questions": questions,
        "attack_types": attack_types,
        "member_ids": member_ids,
        "scheduled_by": scheduled_by,
        "deliver_at": deliver_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "pending",
        "completion": {mid: "pending" for mid in member_ids},
    }

    state = _load()
    state["quiz_assignments"][assignment_id] = assignment

    # Create pending notification for each member
    for mid in member_ids:
        if mid not in state["notifications"]:
            state["notifications"][mid] = []
        state["notifications"][mid].append({
            "notification_id": str(uuid.uuid4()),
            "type": "quiz_assigned",
            "assignment_id": assignment_id,
            "title": title,
            "deliver_at": deliver_at.isoformat(),
            "seen": False,
        })

    _save(state)
    return assignment


def get_pending_quizzes(member_id: str) -> list[dict]:
    """Return quizzes assigned to this member that are due and not yet completed."""
    state = _load()
    now = datetime.now(timezone.utc)
    pending = []
    for assignment in state["quiz_assignments"].values():
        if member_id not in assignment.get("member_ids", []):
            continue
        if assignment["completion"].get(member_id) != "pending":
            continue
        deliver_at = datetime.fromisoformat(assignment["deliver_at"])
        if deliver_at <= now:
            pending.append(assignment)
    return pending


# ──────────────────────────────────────────────────────────────
# Result recording + auto-training
# ──────────────────────────────────────────────────────────────

def submit_quiz_result(
    assignment_id: str,
    member_id: str,
    answers: dict[str, str],  # question_id → chosen option letter
    api_key: str = "",
) -> dict:
    """
    Record quiz answers, compute score, auto-schedule training for wrong answers.
    Returns full result record including any training items scheduled.
    """
    state = _load()
    assignment = state["quiz_assignments"].get(assignment_id)
    if not assignment:
        return {"error": "Assignment not found"}

    member = state["team_members"].get(member_id, {"name": member_id, "member_id": member_id})
    questions = assignment["questions"]

    correct: list[dict] = []
    wrong: list[dict] = []

    for q in questions:
        qid = str(q.get("id", q.get("question_id", "")))
        chosen = answers.get(qid, "")
        expected = q.get("correct", "")
        if chosen == expected:
            correct.append(q)
        else:
            wrong.append({**q, "chosen": chosen})

    score_pct = round(len(correct) / len(questions) * 100) if questions else 0
    passed = score_pct >= 70

    result = {
        "result_id": str(uuid.uuid4()),
        "assignment_id": assignment_id,
        "member_id": member_id,
        "member_name": member.get("name", member_id),
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "total": len(questions),
        "correct": len(correct),
        "wrong": len(wrong),
        "score_pct": score_pct,
        "passed": passed,
        "wrong_questions": wrong,
        "training_scheduled": [],
    }

    # Auto-schedule training for wrong answers
    if wrong:
        training_items = _auto_schedule_training(
            member=member,
            wrong_questions=wrong,
            assignment=assignment,
            api_key=api_key,
        )
        result["training_scheduled"] = training_items

        # Notify manager
        manager_notif = {
            "notification_id": str(uuid.uuid4()),
            "type": "training_auto_scheduled",
            "member_id": member_id,
            "member_name": member.get("name", member_id),
            "score_pct": score_pct,
            "wrong_count": len(wrong),
            "training_items": training_items,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "seen": False,
        }
        state["notifications"].setdefault("__manager__", []).append(manager_notif)

    # Mark assignment as completed for this member
    assignment["completion"][member_id] = "completed"
    if all(v == "completed" for v in assignment["completion"].values()):
        assignment["status"] = "complete"

    # Store result
    state["quiz_results"].setdefault(member_id, []).append(result)
    _save(state)
    return result


def _auto_schedule_training(
    member: dict,
    wrong_questions: list[dict],
    assignment: dict,
    api_key: str,
) -> list[dict]:
    """
    For each wrong answer, schedule a targeted training session.
    Uses Claude to generate a personalized training plan if api_key is available.
    """
    state = _load()
    training_items: list[dict] = []

    # Group wrong answers by attack type
    by_topic: dict[str, list[dict]] = {}
    for q in wrong_questions:
        topic = q.get("attack_type") or (assignment.get("attack_types") or ["General Security"])[0]
        by_topic.setdefault(topic, []).append(q)

    for topic, questions in by_topic.items():
        scheduled_for = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        training_id = str(uuid.uuid4())

        # Generate AI training plan if API key available
        ai_plan = _generate_training_plan(member, topic, questions, api_key) if api_key else None

        item = {
            "training_id": training_id,
            "member_id": member.get("member_id"),
            "member_name": member.get("name"),
            "topic": topic,
            "reason": f"Failed {len(questions)} question(s) on {topic}",
            "wrong_questions": [q.get("question") for q in questions],
            "scheduled_for": scheduled_for,
            "status": "scheduled",
            "ai_plan": ai_plan,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        training_items.append(item)

        mid = member.get("member_id", "")
        state["training_schedule"].setdefault(mid, []).append(item)

        # Member notification
        state["notifications"].setdefault(mid, []).append({
            "notification_id": str(uuid.uuid4()),
            "type": "training_scheduled",
            "training_id": training_id,
            "topic": topic,
            "scheduled_for": scheduled_for,
            "reason": item["reason"],
            "seen": False,
        })

    _save(state)
    return training_items


def _generate_training_plan(
    member: dict,
    topic: str,
    wrong_questions: list[dict],
    api_key: str,
) -> dict | None:
    """Ask Claude to generate a targeted 1-hour training plan."""
    try:
        client = anthropic.Anthropic(api_key=api_key)
        wrong_summary = "\n".join(
            f"- Q: {q.get('question', '')} | Chose: {q.get('chosen', '?')} | Correct: {q.get('correct', '?')} | Explanation: {q.get('explanation', '')}"
            for q in wrong_questions
        )
        message = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=1024,
            messages=[{
                "role": "user",
                "content": (
                    f"Create a focused 1-hour training plan for {member.get('name', 'a security analyst')} "
                    f"({member.get('role', 'Security Analyst')}) who got these questions wrong about {topic}:\n\n"
                    f"{wrong_summary}\n\n"
                    "Return a JSON object with:\n"
                    "- objectives: list of 3 specific learning objectives\n"
                    "- modules: list of training modules [{title, duration_mins, content_summary, exercises}]\n"
                    "- key_concepts: list of concepts to master\n"
                    "- practical_lab: a hands-on exercise description\n"
                    "- assessment: 2 follow-up questions to verify learning\n"
                    "Keep it targeted to the specific gaps shown by the wrong answers."
                ),
            }],
        )
        import re, json as _json
        text = message.content[0].text
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return _json.loads(match.group())
    except Exception:
        pass
    return None


# ──────────────────────────────────────────────────────────────
# Queries
# ──────────────────────────────────────────────────────────────

def get_training_schedule(member_id: str) -> list[dict]:
    return _load()["training_schedule"].get(member_id, [])


def get_all_training() -> list[dict]:
    state = _load()
    return [item for items in state["training_schedule"].values() for item in items]


def get_notifications(member_id: str, unseen_only: bool = False) -> list[dict]:
    state = _load()
    notifs = state["notifications"].get(member_id, [])
    if unseen_only:
        notifs = [n for n in notifs if not n.get("seen")]
    return sorted(notifs, key=lambda n: n.get("notification_id", ""), reverse=True)


def mark_notifications_seen(member_id: str) -> None:
    state = _load()
    for n in state["notifications"].get(member_id, []):
        n["seen"] = True
    _save(state)


def get_quiz_results(member_id: str | None = None) -> list[dict]:
    state = _load()
    if member_id:
        return state["quiz_results"].get(member_id, [])
    return [r for results in state["quiz_results"].values() for r in results]


def get_team_dashboard() -> dict:
    """Aggregated stats for the manager's team overview."""
    state = _load()
    members = state["team_members"]
    results = [r for rs in state["quiz_results"].values() for r in rs]
    training = [t for ts in state["training_schedule"].values() for t in ts]

    member_stats = {}
    for mid, member in members.items():
        m_results = state["quiz_results"].get(mid, [])
        m_training = state["training_schedule"].get(mid, [])
        avg_score = round(sum(r["score_pct"] for r in m_results) / len(m_results), 1) if m_results else None
        member_stats[mid] = {
            **member,
            "quizzes_taken": len(m_results),
            "avg_score": avg_score,
            "pass_rate": round(sum(1 for r in m_results if r["passed"]) / len(m_results) * 100, 1) if m_results else None,
            "pending_training": sum(1 for t in m_training if t.get("status") == "scheduled"),
            "pending_quizzes": len(get_pending_quizzes(mid)),
        }

    return {
        "team_size": len(members),
        "members": member_stats,
        "total_quizzes_taken": len(results),
        "avg_team_score": round(sum(r["score_pct"] for r in results) / len(results), 1) if results else None,
        "team_pass_rate": round(sum(1 for r in results if r["passed"]) / len(results) * 100, 1) if results else None,
        "training_scheduled": len([t for t in training if t.get("status") == "scheduled"]),
        "manager_notifications": get_notifications("__manager__", unseen_only=True),
    }
