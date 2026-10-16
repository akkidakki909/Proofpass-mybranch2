"""
Verification Engine Pydantic Models.
Matches the shared contract with Member 4 (Intelligence) and Member 2 (Backend Orchestration).
"""
from __future__ import annotations

import uuid
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class TrustCeiling(str, Enum):
    """The highest state a skill claim can reach based on evidence provenance."""
    PLATFORM_VERIFIED = "Platform-Verified"
    THIRD_PARTY_ATTESTED = "Third-Party-Attested"
    CANDIDATE_SUPPLIED = "Candidate-Supplied"
    UNVERIFIED = "Unverified"


class UsageDepth(str, Enum):
    """Usage depth heuristic derived from manifests and code analysis."""
    NONE = "none"
    DETECTED = "detected"
    MODERATE = "moderate"
    SUBSTANTIAL = "substantial"


class AuthorshipSignal(str, Enum):
    """Authorship confidence derived from git blame line-porcelain metrics."""
    NONE = "none"
    PARTIAL = "partial"
    STRONG = "strong"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class Claim(BaseModel):
    """A single skill claim extracted from a candidate's resume."""
    claim_id: str = Field(default_factory=lambda: f"cl_{uuid.uuid4().hex[:8]}")
    skill: str = Field(min_length=1)
    resume_pointer: str
    repo_hint: Optional[str] = None

    @field_validator("skill")
    @classmethod
    def _strip_skill(cls, v: str) -> str:
        return v.strip()


class Evidence(BaseModel):
    """Corroborating code evidence discovered for a specific claim."""
    evidence_id: str = Field(default_factory=lambda: f"ev_{uuid.uuid4().hex[:8]}")
    claim_id: str
    skill: str
    source_type: str = "github_code"  # e.g. "github_code", "zip_upload"
    file_path: Optional[str] = None
    file_exists: bool
    content_sha256: Optional[str] = None
    usage_depth: UsageDepth = UsageDepth.NONE
    authorship_pct: float = Field(ge=0.0, le=1.0, default=0.0)
    authorship_signal: AuthorshipSignal = AuthorshipSignal.NONE
    commit_count: int = Field(ge=0, default=0)
    conflicts: List[str] = Field(default_factory=list)


class RepoMetadata(BaseModel):
    """Public repository metadata."""
    is_fork: bool = False
    fork_of: Optional[str] = None
    default_branch: str = "main"
    size_kb: int = 0
    commit_count: int = 0


class VerificationResult(BaseModel):
    """Deterministic output payload returned by M3.verify() to M4.assess()."""
    provenance: TrustCeiling = TrustCeiling.UNVERIFIED
    repo: RepoMetadata = Field(default_factory=RepoMetadata)
    evidence: List[Evidence] = Field(default_factory=list)
