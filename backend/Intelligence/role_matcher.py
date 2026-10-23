"""
Role matching and gap analysis.
"""
from __future__ import annotations

from typing import Dict, List, Tuple

from .models import SkillAssessment, TargetRole, SkillGap, RoleMatchBreakdown, ClaimState
from .state_engine import STATE_MULTIPLIERS

_CANONICAL_ALIASES: Dict[str, str] = {
    "react.js": "react", "reactjs": "react", "node.js": "node.js", "nodejs": "node.js",
    "python 3": "python", "postgres": "postgresql", "mongo db": "mongodb", "ts": "typescript",
}

def _canonical(skill: str) -> str:
    s = skill.strip().lower()
    return _CANONICAL_ALIASES.get(s, s)


def match_role(assessments: List[SkillAssessment], target_role: TargetRole) -> Tuple[float, List[RoleMatchBreakdown]]:
    skill_lookup = {_canonical(a.name): a for a in assessments}
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
            breakdown.append(RoleMatchBreakdown(skill=req.skill, required_weight=req.weight, current_state=sa.claim_state, contribution=round(contribution, 4), evidence_ids=sa.evidence_ids))
        else:
            breakdown.append(RoleMatchBreakdown(skill=req.skill, required_weight=req.weight, current_state=ClaimState.CLAIMED, contribution=0.0))

    score = earned / total_weight if total_weight > 0 else 0.0
    return round(score, 4), breakdown


def compute_gaps(breakdown: List[RoleMatchBreakdown]) -> List[SkillGap]:
    gaps: List[SkillGap] = []
    for b in breakdown:
        if b.current_state == ClaimState.VERIFIED: continue
        if b.current_state == ClaimState.SUPPORTED:
            gaps.append(SkillGap(skill=b.skill, required_weight=b.required_weight, current_state=b.current_state, recommended_action="Complete the micro-verification quiz to upgrade to Verified.", gap_reduction_pct=0.4))
        elif b.current_state in (ClaimState.CLAIMED, ClaimState.CONTRADICTED):
            gaps.append(SkillGap(skill=b.skill, required_weight=b.required_weight, current_state=b.current_state, recommended_action="Take the iMocha assessment for this skill.", gap_reduction_pct=1.0))
    gaps.sort(key=lambda g: g.required_weight, reverse=True)
    return gaps