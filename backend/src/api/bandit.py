import math
import uuid
from typing import List, Dict, Tuple, Optional
from datetime import datetime
from pydantic import BaseModel
from api.utils.db import execute_db_operation
from api.config import bandit_weight_history_table_name, friction_computations_table_name

class ArmWeights(BaseModel):
    chat: float
    attempts: float
    score: float
    time: float
    llm: float  # Added LLM for the ensemble approach

# 16 Discretized Weight Configurations (The "Arms")
# Each arm must sum to 1.0 (100%)
BANDIT_ARMS: Dict[str, ArmWeights] = {
    "balanced": ArmWeights(chat=0.20, attempts=0.20, score=0.20, time=0.10, llm=0.30),
    "llm_dominant": ArmWeights(chat=0.10, attempts=0.10, score=0.10, time=0.05, llm=0.65),
    "llm_heavy": ArmWeights(chat=0.15, attempts=0.15, score=0.15, time=0.05, llm=0.50),
    "chat_heavy": ArmWeights(chat=0.40, attempts=0.15, score=0.15, time=0.05, llm=0.25),
    "attempt_heavy": ArmWeights(chat=0.15, attempts=0.40, score=0.15, time=0.05, llm=0.25),
    "score_heavy": ArmWeights(chat=0.15, attempts=0.15, score=0.40, time=0.05, llm=0.25),
    "time_sensitive": ArmWeights(chat=0.20, attempts=0.20, score=0.20, time=0.20, llm=0.20),
    "no_time": ArmWeights(chat=0.25, attempts=0.25, score=0.25, time=0.00, llm=0.25),
    "no_llm": ArmWeights(chat=0.35, attempts=0.30, score=0.25, time=0.10, llm=0.00),
    "llm_chat": ArmWeights(chat=0.40, attempts=0.10, score=0.10, time=0.00, llm=0.40),
    "llm_attempt": ArmWeights(chat=0.10, attempts=0.40, score=0.10, time=0.00, llm=0.40),
    "llm_score": ArmWeights(chat=0.10, attempts=0.10, score=0.40, time=0.00, llm=0.40),
    "outcome_focused": ArmWeights(chat=0.10, attempts=0.20, score=0.50, time=0.00, llm=0.20),
    "effort_focused": ArmWeights(chat=0.10, attempts=0.50, score=0.10, time=0.10, llm=0.20),
    "pure_llm": ArmWeights(chat=0.00, attempts=0.00, score=0.00, time=0.00, llm=1.00),
    "equal": ArmWeights(chat=0.20, attempts=0.20, score=0.20, time=0.20, llm=0.20),
}


class UCB1Bandit:
    def __init__(self, cohort_id: int):
        self.cohort_id = cohort_id
        self.arms = [arm_id for arm_id in BANDIT_ARMS.keys()]

    async def get_state(self) -> Dict[str, Dict]:
        """Fetch current MAB state for this cohort from DB. Initialize if empty."""
        rows = await execute_db_operation(
            f"""
            SELECT arm_id, pull_count, avg_reward, ucb_score 
            FROM {bandit_weight_history_table_name}
            WHERE cohort_id = ?
            """,
            (self.cohort_id,),
            fetch_all=True
        )

        state = {}
        for r in rows:
            state[r[0]] = {
                "pull_count": r[1],
                "avg_reward": r[2],
                "ucb_score": r[3]
            }

        # Cold Start: Initialize missing arms
        missing_arms = [m for m in self.arms if m not in state]
        if missing_arms:
            for arm_id in missing_arms:
                state[arm_id] = {
                    "pull_count": 0,
                    "avg_reward": 0.0,
                    "ucb_score": float('inf') # Infinity ensures it gets picked at least once
                }
                # Create initial row
                new_id = str(uuid.uuid4())
                await execute_db_operation(
                    f"""
                    INSERT INTO {bandit_weight_history_table_name} 
                    (id, cohort_id, arm_id, pull_count, avg_reward, ucb_score)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (new_id, self.cohort_id, arm_id, 0, 0.0, float('inf'))
                )
                
        return state

    async def select_arm(self) -> Tuple[str, ArmWeights]:
        """UCB1 Selection logic. Returns the arm_id and its Weights."""
        state = await self.get_state()
        
        # Calculate total pulls to use in UCB formula
        total_pulls = sum(arm_data["pull_count"] for arm_data in state.values())

        best_arm = None
        best_ucb = -float('inf')

        for arm_id, data in state.items():
            pulls = data["pull_count"]
            avg_reward = data["avg_reward"]

            if pulls == 0:
                # Force exploration if never picked
                return arm_id, BANDIT_ARMS[arm_id]

            # UCB1 Math
            # C = sqrt(2) is standard, but since we want quick adaptation in a cohort, we use 1.41
            exploration_bonus = 1.41 * math.sqrt(math.log(total_pulls) / pulls)
            ucb_score = avg_reward + exploration_bonus

            if ucb_score > best_ucb:
                best_ucb = ucb_score
                best_arm = arm_id

        # Update DB with the new UCB scores just evaluated
        for arm_id, data in state.items():
            pulls = data["pull_count"]
            if pulls > 0:
                score = data["avg_reward"] + 1.41 * math.sqrt(math.log(total_pulls) / pulls)
                await execute_db_operation(
                    f"UPDATE {bandit_weight_history_table_name} SET ucb_score = ? WHERE cohort_id = ? AND arm_id = ?",
                    (score, self.cohort_id, arm_id)
                )

        if not best_arm:
            best_arm = "balanced" # Fallback

        return best_arm, BANDIT_ARMS[best_arm]

    async def update_reward(self, arm_id: str, reward: float):
        """Update an arm with a received reward and recalculate its average."""
        state = await self.get_state()
        if arm_id not in state:
            return
        
        # Online average update: new_avg = old_avg + (reward - old_avg) / new_count
        current_pulls = state[arm_id]["pull_count"]
        current_avg = state[arm_id]["avg_reward"]
        
        new_pulls = current_pulls + 1
        new_avg = current_avg + (reward - current_avg) / new_pulls

        await execute_db_operation(
            f"""
            UPDATE {bandit_weight_history_table_name}
            SET pull_count = ?, avg_reward = ?
            WHERE cohort_id = ? AND arm_id = ?
            """,
            (new_pulls, new_avg, self.cohort_id, arm_id)
        )
