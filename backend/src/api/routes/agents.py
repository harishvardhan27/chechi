from fastapi import APIRouter
from typing import List, Dict
from pydantic import BaseModel
from api.agentic_engine import draft_mentor_briefing, draft_creator_briefing
from api.bandit import UCB1Bandit

router = APIRouter(tags=["agents"])

class ExecuteActionRequest(BaseModel):
    action_id: str
    action_type: str
    context: Dict

@router.get("/mentor/briefing/{cohort_id}")
async def get_mentor_briefing(cohort_id: int):
    """Returns the Agentic Mentor Action Feed for a specific cohort."""
    feed = await draft_mentor_briefing(cohort_id)
    return {"status": "success", "data": feed}


@router.get("/creator/briefing/{cohort_id}")
async def get_creator_briefing(cohort_id: int):
    """Returns the Agentic Creator Action Feed for systemic anomalies."""
    feed = await draft_creator_briefing(cohort_id)
    return {"status": "success", "data": feed}


@router.get("/bandit/state/{cohort_id}")
async def get_bandit_state(cohort_id: int):
    """Returns the UCB1 internal RL weighting structure for visualization."""
    bandit = UCB1Bandit(cohort_id)
    state = await bandit.get_state()
    return {"status": "success", "state": state}


@router.post("/execute-action")
async def execute_action(request: ExecuteActionRequest):
    """
    Executes the LLM-drafted action.
    Sends realistic mock webhook success signals back to the UI.
    """
    from api.config import friction_computations_table_name
    from api.utils.db import execute_db_operation
    import logging

    # Try to find the arm_id that generated the friction score leading to this action
    learner_id = request.context.get("learner_id")
    task_id = request.context.get("task_id")
    
    query = ""
    params = ()
    if learner_id:
        query = f"SELECT cohort_id, arm_id FROM {friction_computations_table_name} WHERE user_id = ? ORDER BY computed_at DESC LIMIT 1"
        params = (learner_id,)
    elif task_id:
        query = f"SELECT cohort_id, arm_id FROM {friction_computations_table_name} WHERE task_id = ? ORDER BY computed_at DESC LIMIT 1"
        params = (task_id,)

    if query:
        try:
            row = await execute_db_operation(query, params, fetch_one=True)
            if row:
                cohort_id, arm_id = row
                # We simulate a "Reward" because the mentor/creator approved the action
                # +1.0 reinforces that this arm reliably detects actionable friction
                bandit = UCB1Bandit(cohort_id)
                await bandit.update_reward(arm_id, 1.0)
                logging.info(f"Simulated +1.0 Reward for arm {arm_id} in cohort {cohort_id}")
        except Exception as e:
            logging.error(f"Failed to record RL reward: {e}")

    # In a real app we would hit Slack webhooks or trigger the AI task generator celery queue
    if request.action_type == "send_slack":
        # Additional async logic to dispatch message
        pass
    elif request.action_type == "regenerate_task":
        # Trigger Celery / background AI Generation Job
        pass
        
    return {
        "status": "success", 
        "message": f"Action {request.action_id} of type {request.action_type} executed successfully."
    }
