"""
Unit tests for Member 3 (Evidence Verification Engine).
"""
import pytest
from pydantic import ValidationError

from verification.models import (
    Claim,
    Evidence,
    RepoMetadata,
    VerificationResult,
    TrustCeiling,
    UsageDepth,
    AuthorshipSignal,
)


# ---------------------------------------------------------------------------
# Milestone 1: Models & Schemas
# ---------------------------------------------------------------------------

def test_claim_model_defaults_and_validation():
    claim = Claim(skill="  Python  ", resume_pointer="Experience, Line 5")
    assert claim.skill == "Python"
    assert claim.claim_id.startswith("cl_")
    assert claim.repo_hint is None

    # Empty skill should fail validation
    with pytest.raises(ValidationError):
        Claim(skill="", resume_pointer="p1")


def test_evidence_model_constraints():
    ev = Evidence(
        claim_id="cl_123",
        skill="FastAPI",
        file_path="main.py",
        file_exists=True,
        usage_depth=UsageDepth.SUBSTANTIAL,
        authorship_pct=0.85,
        authorship_signal=AuthorshipSignal.STRONG,
        commit_count=12,
        conflicts=[],
    )
    assert ev.evidence_id.startswith("ev_")
    assert ev.source_type == "github_code"
    assert ev.authorship_pct == 0.85

    # Out of bounds authorship_pct must fail validation
    with pytest.raises(ValidationError):
        Evidence(
            claim_id="cl_123",
            skill="FastAPI",
            file_exists=True,
            authorship_pct=1.5,
        )


def test_verification_result_serialization():
    meta = RepoMetadata(is_fork=True, fork_of="octocat/Spoon-Knife")
    ev = Evidence(
        claim_id="cl_1",
        skill="React",
        file_exists=True,
        usage_depth=UsageDepth.MODERATE,
    )
    res = VerificationResult(
        provenance=TrustCeiling.PLATFORM_VERIFIED,
        repo=meta,
        evidence=[ev],
    )
    data = res.model_dump()
    assert data["provenance"] == "Platform-Verified"
    assert data["repo"]["is_fork"] is True
    assert data["repo"]["fork_of"] == "octocat/Spoon-Knife"
    assert len(data["evidence"]) == 1

    # Roundtrip check
    restored = VerificationResult.model_validate(data)
    assert restored.provenance == TrustCeiling.PLATFORM_VERIFIED
    assert restored.repo.fork_of == "octocat/Spoon-Knife"
