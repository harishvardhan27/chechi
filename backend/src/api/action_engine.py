"""
Action Recommendation Engine

Logic:  rule-based (deterministic, fast, no LLM cost)
Message: AI-generated (OpenAI, context-aware)
"""

from typing import Dict, Optional
from pydantic import BaseModel
from api.llm import run_llm_with_openai
from api.config import openai_plan_to_model_name


# ---------------------------------------------------------------------------
# Rule-based action recommender
# ---------------------------------------------------------------------------

ACTION_RULES = [
    # (condition_fn, action_type, urgency, description_template)
    (
        lambda s: s.get("friction_score", 0) >= 0.75,
        "immediate_outreach",
        "immediate",
        "Learner shows critical friction — schedule a 1:1 session immediately.",
    ),
    (
        lambda s: s.get("velocity_risk") is True,
        "engagement_check",
        "this_week",
        "Completion pace dropped >50% — send a re-engagement nudge.",
    ),
    (
        lambda s: "multiple_retries" in " ".join(s.get("reasons", [])),
        "resource_assignment",
        "this_week",
        "Multiple retries detected — assign supplementary practice material.",
    ),
    (
        lambda s: "low_score" in " ".join(s.get("reasons", [])),
        "concept_reinforcement",
        "this_week",
        "Low scorecard score — recommend a concept review resource.",
    ),
    (
        lambda s: "high_chat_volume" in " ".join(s.get("reasons", [])),
        "hint_delivery",
        "this_week",
        "High chat volume — deliver a targeted hint or worked example.",
    ),
    (
        lambda s: s.get("classification") == "systemic",
        "content_revision",
        "this_week",
        "Systemic issue detected — review and revise task content.",
    ),
]

DEFAULT_ACTION = {
    "action_type": "monitor",
    "urgency": "monitor",
    "description": "No critical signals. Continue monitoring learner progress.",
}


def recommend_action(signal: Dict) -> Dict:
    """
    Rule-based action recommender.
    Evaluates signal dict against priority-ordered rules and returns first match.

    signal keys used: friction_score, velocity_risk, reasons, classification
    """
    for condition, action_type, urgency, description in ACTION_RULES:
        try:
            if condition(signal):
                return {
                    "action_type": action_type,
                    "urgency": urgency,
                    "description": description,
                }
        except Exception:
            continue
    return DEFAULT_ACTION


# ---------------------------------------------------------------------------
# LLM-based message generator
# ---------------------------------------------------------------------------

class InterventionMessage(BaseModel):
    subject: str
    message: str
    tone: str  # e.g. "supportive", "motivational", "informational"


async def generate_action_message(context: Dict) -> Dict:
    """
    Generates a personalized intervention message using OpenAI.

    context keys:
      - learner_name: str
      - action_type: str
      - reasons: list[str]
      - task_title: str (optional)
      - friction_score: float (optional)
      - velocity_risk: bool (optional)
    """
    learner_name = context.get("learner_name", "the learner")
    action_type = context.get("action_type", "monitor")
    reasons = context.get("reasons", [])
    task_title = context.get("task_title", "their current task")
    friction_score = context.get("friction_score")
    velocity_risk = context.get("velocity_risk", False)

    signals_text = ", ".join(reasons) if reasons else "general struggle signals"
    velocity_note = " Their completion pace has also dropped recently." if velocity_risk else ""

    system_prompt = (
        "You are a supportive learning coach writing a short, empathetic message "
        "to a learner who needs help. Be warm, specific, and actionable. "
        "Keep the message under 100 words."
    )

    user_prompt = (
        f"Write a {action_type.replace('_', ' ')} message for {learner_name}.\n"
        f"They are struggling with: {task_title}.\n"
        f"Signals detected: {signals_text}.{velocity_note}\n"
        f"{'Friction score: ' + str(friction_score) + '/1.0.' if friction_score else ''}\n"
        "Generate a subject line and message body."
    )

    result = await run_llm_with_openai(
        model=openai_plan_to_model_name["text-mini"],
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_model=InterventionMessage,
        max_output_tokens=300,
        api_mode="chat_completions",
    )

    return {
        "subject": result.subject,
        "message": result.message,
        "tone": result.tone,
        "action_type": action_type,
        "generated_for": learner_name,
    }
