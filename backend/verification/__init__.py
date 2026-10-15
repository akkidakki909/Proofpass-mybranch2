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
from .resume_extractor import extract_resume_text
from .github_client import GitHubClient, parse_github_url

__all__ = [
    "TrustCeiling",
    "UsageDepth",
    "AuthorshipSignal",
    "Claim",
    "Evidence",
    "RepoMetadata",
    "VerificationResult",
    "extract_resume_text",
    "GitHubClient",
    "parse_github_url",
]
