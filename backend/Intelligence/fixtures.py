"""
Mock data for standalone testing.
"""
from .models import (
    Claim, Evidence, VerificationResult, RepoMetadata,
    TrustCeiling, UsageDepth, AuthorshipSignal, TargetRole, RequiredSkill,
)


MOCK_CLAIMS = [
    Claim(claim_id="cl_001", skill="React", resume_pointer="Projects, line 4", repo_hint="src/App.tsx"),
    Claim(claim_id="cl_002", skill="Python", resume_pointer="Experience, line 2", repo_hint="main.py"),
    Claim(claim_id="cl_003", skill="AWS", resume_pointer="Skills, line 1", repo_hint=None),
    Claim(claim_id="cl_004", skill="PostgreSQL", resume_pointer="Projects, line 10", repo_hint="db/"),
]


MOCK_VERIFICATION_STRONG = VerificationResult(
    provenance=TrustCeiling.PLATFORM_VERIFIED,
    repo=RepoMetadata(is_fork=False, fork_of=None),
    evidence=[
        Evidence(
            evidence_id="ev_001", claim_id="cl_001", skill="React",
            source_type="github_code", file_path="src/App.tsx", file_exists=True,
            content_sha256="abc123", usage_depth=UsageDepth.SUBSTANTIAL,
            authorship_pct=0.85, authorship_signal=AuthorshipSignal.STRONG,
            commit_count=12, conflicts=[],
        ),
        Evidence(
            evidence_id="ev_002", claim_id="cl_002", skill="Python",
            source_type="github_code", file_path="main.py", file_exists=True,
            content_sha256="def456", usage_depth=UsageDepth.MODERATE,
            authorship_pct=0.40, authorship_signal=AuthorshipSignal.PARTIAL,
            commit_count=3, conflicts=[],
        ),
        # cl_003 (AWS) has NO evidence -> Claimed
        Evidence(
            evidence_id="ev_004", claim_id="cl_004", skill="PostgreSQL",
            source_type="github_code", file_path="db/schema.sql", file_exists=True,
            content_sha256="ghi789", usage_depth=UsageDepth.SUBSTANTIAL,
            authorship_pct=0.92, authorship_signal=AuthorshipSignal.STRONG,
            commit_count=5, conflicts=[],
        ),
    ],
)


MOCK_VERIFICATION_CONFLICT = VerificationResult(
    provenance=TrustCeiling.PLATFORM_VERIFIED,
    repo=RepoMetadata(is_fork=True, fork_of="facebook/react-tutorial"),
    evidence=[
        Evidence(
            evidence_id="ev_005", claim_id="cl_001", skill="React",
            source_type="github_code", file_path="src/App.tsx", file_exists=True,
            content_sha256="xyz999", usage_depth=UsageDepth.SUBSTANTIAL,
            authorship_pct=0.05, authorship_signal=AuthorshipSignal.NONE,
            commit_count=1, conflicts=["forked tutorial repo with no original commits"],
        ),
    ],
)


MOCK_VERIFICATION_WEAK = VerificationResult(
    provenance=TrustCeiling.CANDIDATE_SUPPLIED,
    repo=RepoMetadata(is_fork=False, fork_of=None),
    evidence=[
        Evidence(
            evidence_id="ev_006", claim_id="cl_001", skill="React",
            source_type="zip_upload", file_path="App.tsx", file_exists=True,
            content_sha256="weak123", usage_depth=UsageDepth.DETECTED,
            authorship_pct=0.0, authorship_signal=AuthorshipSignal.NONE,
            commit_count=0, conflicts=[],
        ),
    ],
)


MOCK_TARGET_ROLE = TargetRole(
    role_name="Full Stack Developer",
    description="Build web applications using React and Python.",
    required_skills=[
        RequiredSkill(skill="React", weight=0.3, importance="required"),
        RequiredSkill(skill="Python", weight=0.3, importance="required"),
        RequiredSkill(skill="PostgreSQL", weight=0.2, importance="preferred"),
        RequiredSkill(skill="AWS", weight=0.1, importance="bonus"),
        RequiredSkill(skill="Docker", weight=0.1, importance="bonus"),
    ],
)


MOCK_CODE_SNIPPETS = {
    "src/App.tsx": """
import React, { useState, useEffect } from 'react';

function App() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData);
  }, []);

  return <div>{data ? JSON.stringify(data) : 'Loading...'}</div>;
}
export default App;
""",
    "main.py": """
from fastapi import FastAPI
app = FastAPI()

@app.get("/")
def root():
    return {"message": "hello"}
""",
}


MOCK_COMMIT_MESSAGES = [
    "fix: handle null data in App component",
    "feat: add FastAPI root endpoint",
    "refactor: move data fetching to custom hook",
    "chore: update dependencies",
]