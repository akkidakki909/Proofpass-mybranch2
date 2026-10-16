"""
Conflict & Anti-Fraud Detection Engine.
Identifies forked tutorial repositories with zero original commits,
computes positive conflicts without penalizing missing evidence,
and determines evidence TrustCeiling provenance.
"""
from __future__ import annotations

import re
from typing import List, Optional

from .models import AuthorshipSignal, Evidence, RepoMetadata, TrustCeiling


# ---------------------------------------------------------------------------
# Tutorial & Template Patterns
# ---------------------------------------------------------------------------

TUTORIAL_PATTERNS = [
    r"tutorial",
    r"learn-",
    r"starter",
    r"boilerplate",
    r"template",
    r"sample",
    r"100-days-of",
    r"bootcamp",
]


def is_tutorial_name(name: Optional[str]) -> bool:
    """Checks if repository name or fork source matches tutorial or template patterns."""
    if not name:
        return False
    lower = name.lower()
    return any(re.search(pat, lower) for pat in TUTORIAL_PATTERNS)


# ---------------------------------------------------------------------------
# Conflict Detection
# ---------------------------------------------------------------------------

def detect_conflicts_for_evidence(
    repo_metadata: RepoMetadata,
    evidence: Evidence,
    candidate_commit_count: int,
    total_commits: int,
) -> List[str]:
    """
    Identifies positive conflicting signals.

    Rules:
        1. Missing evidence alone is NEVER a conflict (Contradicted requires positive counter-evidence).
        2. Forked repository with 0 candidate commits -> "forked tutorial repo with no original commits".
        3. Fork of a known tutorial repo where candidate has no significant commits -> "forked tutorial repo with no original commits".
        4. Zero candidate authorship on a forked repository evidence file.
    """
    conflicts: List[str] = []

    # Rule 1: If file doesn't exist, this is a lack of evidence, NEVER a conflict.
    if not evidence.file_exists:
        return conflicts

    # Rule 2 & 3: Forked repository with no original candidate commits
    if repo_metadata.is_fork:
        is_tutorial = is_tutorial_name(repo_metadata.fork_of)

        if candidate_commit_count == 0:
            conflicts.append("forked tutorial repo with no original commits")
        elif is_tutorial and candidate_commit_count <= 1 and evidence.authorship_pct < 0.10:
            conflicts.append("forked tutorial repo with no original commits")
        elif evidence.authorship_pct == 0.0 and evidence.authorship_signal == AuthorshipSignal.NONE and candidate_commit_count <= 1:
            conflicts.append("forked repository with no original candidate commits on evidence file")

    return conflicts


# ---------------------------------------------------------------------------
# Provenance & Trust Level
# ---------------------------------------------------------------------------

def compute_provenance(
    repo_metadata: RepoMetadata,
    evidence_list: List[Evidence],
    is_github_repo: bool = True,
) -> TrustCeiling:
    """
    Determines the TrustCeiling for the verification payload.

    Principles:
        - Platform-Verified: Evidence is fetched directly from public GitHub repository with verified commits and code.
        - Candidate-Supplied: Code is provided via unverified candidate upload (e.g. zip upload).
        - Unverified: No evidence files exist or repository could not be verified.
    """
    has_existing_files = any(ev.file_exists for ev in evidence_list)

    if not has_existing_files:
        return TrustCeiling.UNVERIFIED

    if is_github_repo:
        return TrustCeiling.PLATFORM_VERIFIED

    return TrustCeiling.CANDIDATE_SUPPLIED
