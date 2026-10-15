"""
Offline Fixtures & Mock Repositories for Verification Engine.
Provides deterministic, zero-network test cases matching the shared contract.
"""
from __future__ import annotations

from typing import Any, Dict, List

from .models import (
    AuthorshipSignal,
    Claim,
    Evidence,
    RepoMetadata,
    TrustCeiling,
    UsageDepth,
    VerificationResult,
)


# ---------------------------------------------------------------------------
# Claims Fixtures
# ---------------------------------------------------------------------------

FIXTURE_CLAIMS: List[Claim] = [
    Claim(claim_id="cl_001", skill="React", resume_pointer="Projects, line 4", repo_hint="src/App.tsx"),
    Claim(claim_id="cl_002", skill="Python", resume_pointer="Experience, line 2", repo_hint="main.py"),
    Claim(claim_id="cl_003", skill="AWS", resume_pointer="Skills, line 1", repo_hint=None),
    Claim(claim_id="cl_004", skill="PostgreSQL", resume_pointer="Projects, line 10", repo_hint="db/schema.sql"),
]


# ---------------------------------------------------------------------------
# Synthetic Repo File Trees & Contents
# ---------------------------------------------------------------------------

STRONG_REPO_FILES: Dict[str, str] = {
    "package.json": """{
  "name": "fullstack-demo",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}""",
    "src/App.tsx": """import React, { useState, useEffect } from 'react';

export default function App() {
  const [items, setItems] = useState<string[]>([]);
  useEffect(() => {
    fetch('/api/data').then(res => res.json()).then(setItems);
  }, []);

  return (
    <div className="container">
      <h1>React Production App</h1>
      <ul>{items.map((it, idx) => <li key={idx}>{it}</li>)}</ul>
    </div>
  );
}
""",
    "main.py": """from fastapi import FastAPI
import psycopg2

app = FastAPI(title="Backend Service")

@app.get("/items")
def get_items():
    conn = psycopg2.connect("dbname=demo user=postgres")
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM items")
    rows = cur.fetchall()
    return {"items": rows}
""",
    "db/schema.sql": """-- Database schema for PostgreSQL
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_items_name ON items (name);
""",
}

CONFLICT_REPO_FILES: Dict[str, str] = {
    "package.json": """{
  "name": "react-tutorial",
  "dependencies": {
    "react": "^18.0.0"
  }
}""",
    "src/App.tsx": """import React from 'react';
function App() { return <div>Tutorial Clone</div>; }
export default App;
""",
}


# ---------------------------------------------------------------------------
# Expected Verification Outputs (Shared Contract)
# ---------------------------------------------------------------------------

EXPECTED_VERIFICATION_STRONG = VerificationResult(
    provenance=TrustCeiling.PLATFORM_VERIFIED,
    repo=RepoMetadata(
        is_fork=False,
        fork_of=None,
        default_branch="main",
        size_kb=1200,
        commit_count=15,
    ),
    evidence=[
        Evidence(
            evidence_id="ev_001",
            claim_id="cl_001",
            skill="React",
            source_type="github_code",
            file_path="src/App.tsx",
            file_exists=True,
            content_sha256="mock_sha_react",
            usage_depth=UsageDepth.SUBSTANTIAL,
            authorship_pct=0.88,
            authorship_signal=AuthorshipSignal.STRONG,
            commit_count=12,
            conflicts=[],
        ),
        Evidence(
            evidence_id="ev_002",
            claim_id="cl_002",
            skill="Python",
            source_type="github_code",
            file_path="main.py",
            file_exists=True,
            content_sha256="mock_sha_python",
            usage_depth=UsageDepth.MODERATE,
            authorship_pct=0.75,
            authorship_signal=AuthorshipSignal.STRONG,
            commit_count=8,
            conflicts=[],
        ),
        Evidence(
            evidence_id="ev_003",
            claim_id="cl_003",
            skill="AWS",
            source_type="github_code",
            file_path=None,
            file_exists=False,
            content_sha256=None,
            usage_depth=UsageDepth.NONE,
            authorship_pct=0.0,
            authorship_signal=AuthorshipSignal.NONE,
            commit_count=0,
            conflicts=[],
        ),
        Evidence(
            evidence_id="ev_004",
            claim_id="cl_004",
            skill="PostgreSQL",
            source_type="github_code",
            file_path="db/schema.sql",
            file_exists=True,
            content_sha256="mock_sha_postgres",
            usage_depth=UsageDepth.SUBSTANTIAL,
            authorship_pct=0.90,
            authorship_signal=AuthorshipSignal.STRONG,
            commit_count=6,
            conflicts=[],
        ),
    ],
)


EXPECTED_VERIFICATION_CONFLICT = VerificationResult(
    provenance=TrustCeiling.PLATFORM_VERIFIED,
    repo=RepoMetadata(
        is_fork=True,
        fork_of="facebook/react-tutorial",
        default_branch="main",
        size_kb=850,
        commit_count=1,
    ),
    evidence=[
        Evidence(
            evidence_id="ev_005",
            claim_id="cl_001",
            skill="React",
            source_type="github_code",
            file_path="src/App.tsx",
            file_exists=True,
            content_sha256="mock_sha_conflict",
            usage_depth=UsageDepth.MODERATE,
            authorship_pct=0.0,
            authorship_signal=AuthorshipSignal.NONE,
            commit_count=0,
            conflicts=["forked tutorial repo with no original commits"],
        ),
    ],
)
