"""
Role matching and gap analysis.
Uses evidence-aware weights: Verified 100%, Supported 60%, Claimed 20%, Contradicted 0%.
"""
from __future__ import annotations

from typing import Dict, List, Tuple

from .models import (
    SkillAssessment, TargetRole, SkillGap, RoleMatchBreakdown, ClaimState,
)
from .state_engine import STATE_MULTIPLIERS


# Canonical skill name normalization (shared with M3 conceptually)
_CANONICAL_ALIASES: Dict[str, str] = {
    "react.js": "react", "reactjs": "react", "react jsx": "react",
    "node.js": "node.js", "nodejs": "node.js", "node": "node.js",
    "express.js": "express.js", "expressjs": "express.js",
    "python 3": "python", "python3": "python", "py": "python",
    "postgres": "postgresql", "postgre sql": "postgresql", "pg": "postgresql",
    "mongo db": "mongodb", "mongo": "mongodb", "mongo-db": "mongodb",
    "my sql": "mysql", "my-sql": "mysql",
    "aws": "aws", "amazon web services": "aws", "amazon aws": "aws",
    "ts": "typescript", "type script": "typescript",
    "js": "javascript", "ecmascript": "javascript", "es6": "javascript",
}


def _canonical(skill: str) -> str:
    s = skill.strip().lower()
    s = s.replace(".js", "").replace("js", "") if s not in ("node.js", "express.js") else s
    s = " ".join(s.split())
    return _CANONICAL_ALIASES.get(s, s)


def match_role(
    assessments: List[SkillAssessment],
    target_role: TargetRole,
) -> Tuple[float, List[RoleMatchBreakdown]]:
    """
    Compute role match score and per-skill breakdown.
    Returns (score in [0,1], breakdown list).
    """
    # Build lookup of candidate skills by canonical name
    skill_lookup: Dict[str, SkillAssessment] = {}
    for a in assessments:
        skill_lookup[_canonical(a.name)] = a

    breakdown: List[RoleMatchBreakdown] = []
    total_weight = 0.0
    earned = 0.0

    for req in target_role.required_skills:
        canon = _canonical(req.skill)
        total_weight += req.weight

        if canon in skill_lookup:
            sa = skill_lookup[canon]
            multiplier = STATE_MULTIPLIERS[sa.claim_state]
            contribution = req.weight * multiplier
            earned += contribution
            breakdown.append(
                RoleMatchBreakdown(
                    skill=req.skill,
                    required_weight=req.weight,
                    current_state=sa.claim_state,
                    contribution=round(contribution, 4),
                    evidence_ids=sa.evidence_ids,
                )
            )
        else:
            breakdown.append(
                RoleMatchBreakdown(
                    skill=req.skill,
                    required_weight=req.weight,
                    current_state=ClaimState.CLAIMED,  # treated as missing
                    contribution=0.0,
                    evidence_ids=[],
                )
            )

    score = earned / total_weight if total_weight > 0 else 0.0
    return round(score, 4), breakdown


def compute_gaps(
    breakdown: List[RoleMatchBreakdown],
) -> List[SkillGap]:
    """
    Identify skills that are not fully Verified and recommend actions.
    iMocha assessment is the #1 recommended action (highest gap reduction).
    """
    gaps: List[SkillGap] = []

    for b in breakdown:
        if b.current_state == ClaimState.VERIFIED:
            continue

        # Recommend actions based on current state
        if b.current_state == ClaimState.SUPPORTED:
            # One quiz away from Verified
            gaps.append(SkillGap(
                skill=b.skill,
                required_weight=b.required_weight,
                current_state=b.current_state,
                recommended_action="Complete the micro-verification quiz to upgrade to Verified.",
                gap_reduction_pct=0.4,  # 60% -> 100% = 40% of weight gained
            ))
        elif b.current_state == ClaimState.CLAIMED:
            # No evidence: recommend iMocha assessment as #1
            gaps.append(SkillGap(
                skill=b.skill,
                required_weight=b.required_weight,
                current_state=b.current_state,
                recommended_action="Take the iMocha assessment for this skill (fastest path to Verified).",
                gap_reduction_pct=1.0,  # 0% -> 100%
            ))
            gaps.append(SkillGap(
                skill=b.skill,
                required_weight=b.required_weight,
                current_state=b.current_state,
                recommended_action="Build a verified project using this skill and link the GitHub repo.",
                gap_reduction_pct=0.8,
            ))
            gaps.append(SkillGap(
                skill=b.skill,
                required_weight=b.required_weight,
                current_state=b.current_state,
                recommended_action="Complete a structured course and pass the end-of-course quiz.",
                gap_reduction_pct=0.5,
            ))
        elif b.current_state == ClaimState.CONTRADICTED:
            gaps.append(SkillGap(
                skill=b.skill,
                required_weight=b.required_weight,
                current_state=b.current_state,
                recommended_action="Evidence conflicts detected. Provide alternative verifiable proof or take an iMocha assessment.",
                gap_reduction_pct=1.0,
            ))

    # Sort by required_weight descending (biggest gaps first)
    gaps.sort(key=lambda g: g.required_weight, reverse=True)
    return gaps