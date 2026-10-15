"""
Deterministic claim-state transition logic.
NO LLM calls. This is the source of truth for claim states.
"""
from __future__ import annotations

from typing import Dict, List, Optional

from .models import (
    Claim, Evidence, VerificationResult, SkillAssessment,
    ClaimState, TrustCeiling, QuizStatus, UsageDepth, AuthorshipSignal,
)


# State multipliers per the shared contract
STATE_MULTIPLIERS: Dict[ClaimState, float] = {
    ClaimState.VERIFIED: 1.0,
    ClaimState.SUPPORTED: 0.6,
    ClaimState.CLAIMED: 0.2,
    ClaimState.CONTRADICTED: 0.0,
}

# Maximum state reachable per trust ceiling
CEILING_MAX_STATE: Dict[TrustCeiling, ClaimState] = {
    TrustCeiling.PLATFORM_VERIFIED: ClaimState.VERIFIED,
    TrustCeiling.THIRD_PARTY_ATTESTED: ClaimState.SUPPORTED,
    TrustCeiling.CANDIDATE_SUPPLIED: ClaimState.SUPPORTED,
    TrustCeiling.UNVERIFIED: ClaimState.CLAIMED,
}


def determine_claim_state(
    evidence_list: List[Evidence],
    quiz_passed: bool,
    provenance: TrustCeiling = TrustCeiling.UNVERIFIED,
) -> ClaimState:
    """
    Pure deterministic state assignment.

    Rules (in order):
    1. No evidence -> Claimed (unless ceiling forbids even that; ceiling only caps upward).
    2. Any positive conflict -> Contradicted.
    3. If ceiling caps below Verified, never return Verified.
    4. Strong evidence + quiz passed + ceiling allows -> Verified.
    5. Strong evidence + quiz not passed -> Supported.
    6. Any evidence exists -> Supported.
    7. Otherwise -> Claimed.
    """
    ceiling_max = CEILING_MAX_STATE.get(provenance, ClaimState.CLAIMED)

    if not evidence_list:
        return _cap(ClaimState.CLAIMED, ceiling_max)

    has_conflict = any(len(ev.conflicts) > 0 for ev in evidence_list)
    if has_conflict:
        # Contradicted is never capped upward, but ceiling can cap it downward
        # (in practice Contradicted is the lowest meaningful state)
        return ClaimState.CONTRADICTED

    has_strong_evidence = any(
        ev.authorship_signal == AuthorshipSignal.STRONG
        and ev.usage_depth in (UsageDepth.MODERATE, UsageDepth.SUBSTANTIAL)
        for ev in evidence_list
    )

    if has_strong_evidence and quiz_passed:
        return _cap(ClaimState.VERIFIED, ceiling_max)
    if has_strong_evidence:
        return _cap(ClaimState.SUPPORTED, ceiling_max)

    # Any evidence at all -> Supported (capped by ceiling)
    return _cap(ClaimState.SUPPORTED, ceiling_max)


def _cap(state: ClaimState, ceiling_max: ClaimState) -> ClaimState:
    """Cap a state at the ceiling's maximum allowed state."""
    order = [
        ClaimState.CONTRADICTED,
        ClaimState.CLAIMED,
        ClaimState.SUPPORTED,
        ClaimState.VERIFIED,
    ]
    return state if order.index(state) <= order.index(ceiling_max) else ceiling_max


def compute_credibility(
    evidence_list: List[Evidence],
    state: ClaimState,
    quiz_passed: bool,
) -> float:
    """
    Credibility = (evidence_weight x state_multiplier) + quiz_result
    evidence_weight = max(authorship_pct) across evidence, or 0 if none.
    quiz_result = +0.2 if passed, else 0.
    Clamped to [0, 1].
    """
    evidence_weight = max((ev.authorship_pct for ev in evidence_list), default=0.0)
    base = evidence_weight * STATE_MULTIPLIERS[state]
    bonus = 0.2 if (quiz_passed and state == ClaimState.VERIFIED) else 0.0
    return max(0.0, min(1.0, round(base + bonus, 3)))


def quiz_status_for(state: ClaimState, quiz_passed: Optional[bool]) -> QuizStatus:
    if state == ClaimState.VERIFIED:
        return QuizStatus.PASSED
    if state == ClaimState.SUPPORTED:
        return QuizStatus.AVAILABLE
    if state == ClaimState.CONTRADICTED:
        return QuizStatus.NOT_REQUIRED
    return QuizStatus.NOT_REQUIRED  # Claimed


def assess_skill(
    claim: Claim,
    verification: VerificationResult,
    quiz_passed: bool = False,
) -> SkillAssessment:
    """Evaluate a single skill claim against its evidence."""
    skill_evidence = [ev for ev in verification.evidence if ev.claim_id == claim.claim_id]
    state = determine_claim_state(skill_evidence, quiz_passed, verification.provenance)
    credibility = compute_credibility(skill_evidence, state, quiz_passed)

    return SkillAssessment(
        name=claim.skill,
        claim_state=state,
        evidence_ids=[ev.evidence_id for ev in skill_evidence],
        evidence_ceiling=verification.provenance,
        credibility=credibility,
        quiz_status=quiz_status_for(state, quiz_passed),
    )


def assess_all(
    claims: List[Claim],
    verification: VerificationResult,
    quiz_results: Optional[Dict[str, bool]] = None,
) -> List[SkillAssessment]:
    """Evaluate all claims. quiz_results maps claim_id -> passed."""
    quiz_results = quiz_results or {}
    return [
        assess_skill(claim, verification, quiz_results.get(claim.claim_id, False))
        for claim in claims
    ]