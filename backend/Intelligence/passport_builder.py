"""
Builds the canonical PassportPayload from claims, assessments, role match, and quiz data.
"""
from __future__ import annotations

from typing import List, Optional

from .models import (
    Claim, SkillAssessment, TargetRole, PassportPayload,
    QuizQuestion, SkillGap, RoleMatchBreakdown,
)
from .role_matcher import match_role, compute_gaps


def build_passport(
    claims: List[Claim],
    assessments: List[SkillAssessment],
    target_role: TargetRole,
    quiz_questions: Optional[List[QuizQuestion]] = None,
    candidate_consent: bool = True,
) -> PassportPayload:
    """
    Assemble the final passport payload.
    """
    quiz_questions = quiz_questions or []

    score, breakdown = match_role(assessments, target_role)
    gaps = compute_gaps(breakdown)

    return PassportPayload(
        candidate_consent=candidate_consent,
        target_role=target_role.role_name,
        skills=assessments,
        role_match_score=score,
        skill_gaps=gaps,
        role_breakdown=breakdown,
        quiz_questions=quiz_questions,
    )