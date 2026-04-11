from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import uuid
from api.llm import run_llm_with_openai
from api.config import (
    openai_plan_to_model_name, 
    chat_history_table_name, 
    questions_table_name,
    agent_briefings_table_name,
)
from api.utils.db import execute_db_operation
from api.signal_engine import get_top_at_risk_learners
from api.db.intelligence import get_systemic_issues
import json

class SentimentResult(BaseModel):
    sentiment: float = Field(..., ge=0.0, le=1.0, description="Struggle sentiment from 0 (happy/easy) to 1 (highly frustrated/confused)")

async def extract_sentiment_score(learner_id: int, task_id: int) -> float:
    """Extracts a continuous frustration/struggle score [0.0, 1.0] from chat history using zero-shot LLM."""
    rows = await execute_db_operation(
        f"""
        SELECT ch.role, ch.content
        FROM {chat_history_table_name} ch
        JOIN {questions_table_name} q ON ch.question_id = q.id
        WHERE ch.user_id = ? AND q.task_id = ?
        ORDER BY ch.created_at ASC
        """,
        (learner_id, task_id), fetch_all=True
    )
    if not rows:
        return 0.0
    
    transcript = "\n".join([f"{r[0].upper()}: {r[1]}" for r in rows if r[1]])
    
    messages = [
        {"role": "system", "content": "Analyze the following learning transcript. Output a struggle sentiment score from 0.0 to 1.0, where 1.0 means extreme frustration, giving up, or total confusion, and 0.0 means smooth, easy progress."},
        {"role": "user", "content": transcript[-2000:]} # Pass only context window bounds
    ]
    
    # We use chat_completions as the API mode for standard instructor structured parsing
    result = await run_llm_with_openai(
        model=openai_plan_to_model_name["text-mini"],
        messages=messages,
        response_model=SentimentResult,
        max_output_tokens=300,
        api_mode="chat_completions"
    )
    
    return result.sentiment


# -------------------------------------------------------------------------
# AGENTIC COPILOT FEED LOGIC
# -------------------------------------------------------------------------

class MentorDraft(BaseModel):
    analysis: str = Field(..., description="1 sentence explaining what the user is stuck on based on data")
    drafted_slack_message: str = Field(..., description="A friendly, personalized slack message offering exact help.")

class MentorBriefingResponse(BaseModel):
    executive_summary: str = Field(..., description="Overall daily briefing addressing the state of the cohort")
    drafts: List[MentorDraft]

async def draft_mentor_briefing(cohort_id: int) -> List[Dict]:
    """Generates the Action Feed for the Mentor Copilot."""
    
    # 1. Find the struggling students mathematically using RL-validated friction
    top_learners = await get_top_at_risk_learners(cohort_id, min_friction=0.6)
    
    if not top_learners:
        return []
        
    feed_items = []
    for learner in top_learners:
        # Prompt the LLM to write the action
        prompt = f"""
        Learner Name: {learner['name']}
        Friction Score: {learner['friction_score']}
        Driving Signals: {', '.join(learner['reasons'])}
        Velocity Risk: {learner['velocity_risk']}
        
        Write a friendly, empowering Slack check-in message. It should not sound like a bot. 
        It should directly mention the signal reasons (e.g. 'noticed you had some retries' or 'saw you've been working hard on this for a bit').
        """
        
        try:
            # We bypass full structured response to just get raw text for speed in the loop, or use struct:
            res = await run_llm_with_openai(
                model=openai_plan_to_model_name["text-mini"],
                messages=[
                    {"role": "system", "content": "You are a helpful teaching assistant drafting Slack messages on behalf of a senior mentor."},
                    {"role": "user", "content": prompt}
                ],
                response_model=MentorDraft,
                max_output_tokens=500,
                api_mode="chat_completions"
            )
            
            feed_items.append({
                "id": str(uuid.uuid4()),
                "learner_id": learner["learner_id"],
                "learner_name": learner["name"],
                "friction_score": learner["friction_score"],
                "context": learner["reasons"],
                "agent_analysis": res.analysis,
                "draft_message": res.drafted_slack_message,
                "action_type": "send_slack",
                "status": "pending_approval"
            })
        except Exception as e:
            # fallback
            pass
            
    # Optionally save to DB agent_briefings table
    return feed_items


class CreatorSystemicDraft(BaseModel):
    diagnosis: str = Field(..., description="Why are all the students failing this specific task? What is wrong with the content?")
    revised_instructions: str = Field(..., description="New markdown instructions fixing the identified gap.")

async def draft_creator_briefing(cohort_id: int) -> List[Dict]:
    """Generates the Action Feed for the Creator Copilot based on actual chat transcripts."""
    systemic_issues = await get_systemic_issues(cohort_id)
    
    feed_items = []
    for issue in systemic_issues:
        if issue.get("severity") == "high" or issue.get("classification") == "systemic":
            task_id = issue["task_id"]
            
            # 1. Fetch recent chat history for this specific failing task across the cohort
            chat_rows = await execute_db_operation(
                f"""
                SELECT ch.role, ch.content, ch.user_id
                FROM {chat_history_table_name} ch
                JOIN {questions_table_name} q ON ch.question_id = q.id
                WHERE q.task_id = ? AND ch.deleted_at IS NULL
                ORDER BY ch.created_at DESC
                LIMIT 50
                """,
                (task_id,), fetch_all=True
            )
            
            transcript_context = "No recent chat history."
            if chat_rows:
                transcript_context = "\n".join([f"User {r[2]} ({r[0]}): {r[1]}" for r in chat_rows if r[1]])
            
            # 2. Ask the LLM to identify the exact cause and write a fix
            prompt = f"""
            Task Title: {issue['task_title']}
            Percentage of Cohort Stuck: {issue.get('stuck_pct', 'Unknown')}%
            
            Recent Chat Transcript from struggling learners:
            {transcript_context[-3500:]}
            
            Analyze these transcripts. Why are all the students failing? What is physically wrong or missing from the current task instructions?
            Then, draft new Markdown instructions that explicitly resolve this issue.
            """
            
            try:
                res = await run_llm_with_openai(
                    model=openai_plan_to_model_name["text-mini"],
                    messages=[
                        {"role": "system", "content": "You are an expert curriculum architect fixing systemic broken modules in an LMS."},
                        {"role": "user", "content": prompt}
                    ],
                    response_model=CreatorSystemicDraft,
                    max_output_tokens=1000,
                    api_mode="chat_completions"
                )
                
                diagnosis_text = res.diagnosis
                draft_text = res.revised_instructions
            except Exception as e:
                print(f"Creator Copilot Draft Error: {e}")
                diagnosis_text = "Multiple learners are expressing confusion based on recent chat volume. Review the instructions closely."
                draft_text = "Failed to generate revised markdown."

            # 3. Append to feed
            feed_items.append({
                "id": str(uuid.uuid4()),
                "task_id": issue["task_id"],
                "task_title": issue["task_title"],
                "stuck_pct": issue.get("stuck_pct", 0),
                "diagnosis": diagnosis_text,
                "action_type": "regenerate_task",
                "action_draft": draft_text,
                "status": "pending_approval"
            })
            
    return feed_items
