"""
ProofPass Verification Engine (Member 3).
Deterministic code validation for skill claims, resume parsing, and GitHub evidence.
"""
from .models import (
    TrustCeiling,
    UsageDepth,
    AuthorshipSignal,
    Claim,
    Evidence,
    RepoMetadata,
    VerificationResult,
)

__all__ = [
    "TrustCeiling",
    "UsageDepth",
    "AuthorshipSignal",
    "Claim",
    "Evidence",
    "RepoMetadata",
    "VerificationResult",
]
