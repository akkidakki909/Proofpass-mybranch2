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
from .detector import (
    classify_usage_depth,
    locate_evidence_for_claim,
    compute_content_sha256,
)
from .git_engine import (
    parse_git_blame_porcelain,
    compute_file_authorship,
    shallow_clone_and_blame,
    analyze_repo_commits,
)
from .heuristics import detect_conflicts_for_evidence, compute_provenance

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
    "classify_usage_depth",
    "locate_evidence_for_claim",
    "compute_content_sha256",
    "parse_git_blame_porcelain",
    "compute_file_authorship",
    "shallow_clone_and_blame",
    "analyze_repo_commits",
    "detect_conflicts_for_evidence",
    "compute_provenance",
]
