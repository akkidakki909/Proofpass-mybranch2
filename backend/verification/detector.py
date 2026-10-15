"""
Evidence Locator & Regex-based Usage Depth Engine.
Pure deterministic inspection of repository trees, manifests, and source files.
No LLM calls.
"""
from __future__ import annotations

import hashlib
from pathlib import Path
import re
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

from .models import AuthorshipSignal, Claim, Evidence, UsageDepth


# ---------------------------------------------------------------------------
# Skill Aliases & Heuristic Knowledge Base
# ---------------------------------------------------------------------------

SKILL_ALIASES: Dict[str, Set[str]] = {
    "react": {"react", "react-dom", "reactjs", "react-native"},
    "python": {"python", "python3"},
    "fastapi": {"fastapi", "uvicorn", "starlette"},
    "flask": {"flask", "werkzeug"},
    "django": {"django"},
    "postgresql": {"postgres", "postgresql", "psycopg2", "asyncpg", "pg"},
    "mysql": {"mysql", "pymysql", "mysqlclient"},
    "mongodb": {"mongo", "mongodb", "pymongo", "mongoose"},
    "redis": {"redis", "aioredis"},
    "docker": {"docker", "dockerfile", "docker-compose"},
    "aws": {"aws", "boto3", "aws-sdk", "s3", "dynamodb", "lambda", "cloudformation"},
    "kubernetes": {"kubernetes", "k8s", "kubectl", "helm"},
    "typescript": {"typescript", "ts"},
    "javascript": {"javascript", "js", "node", "nodejs"},
    "go": {"go", "golang"},
    "rust": {"rust", "cargo"},
    "c++": {"cpp", "c++"},
    "pytorch": {"torch", "pytorch"},
    "tensorflow": {"tensorflow", "tf", "keras"},
    "pandas": {"pandas"},
    "graphql": {"graphql", "apollo", "strawberry"},
}

MANIFEST_FILES = {
    "package.json",
    "requirements.txt",
    "pyproject.toml",
    "Pipfile",
    "setup.py",
    "go.mod",
    "Cargo.toml",
    "pom.xml",
    "build.gradle",
    "Dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
}

LANGUAGE_EXTENSIONS: Dict[str, Set[str]] = {
    "react": {".tsx", ".jsx", ".ts", ".js"},
    "python": {".py"},
    "fastapi": {".py"},
    "flask": {".py"},
    "django": {".py"},
    "postgresql": {".sql", ".py", ".ts", ".js"},
    "mysql": {".sql", ".py", ".ts", ".js"},
    "mongodb": {".py", ".ts", ".js"},
    "typescript": {".ts", ".tsx"},
    "javascript": {".js", ".jsx", ".mjs"},
    "go": {".go"},
    "rust": {".rs"},
    "c++": {".cpp", ".hpp", ".cc", ".h"},
    "docker": {"dockerfile", ".yml", ".yaml"},
}


# ---------------------------------------------------------------------------
# Utility Functions
# ---------------------------------------------------------------------------

def compute_content_sha256(content: str | bytes) -> str:
    """Computes hexadecimal SHA-256 checksum of file content."""
    if isinstance(content, str):
        content = content.encode("utf-8", errors="replace")
    return hashlib.sha256(content).hexdigest()


def _get_skill_aliases(skill_name: str) -> Set[str]:
    """Retrieves normalized skill keywords including aliases."""
    normalized = skill_name.lower().strip()
    aliases = {normalized}
    if normalized in SKILL_ALIASES:
        aliases.update(SKILL_ALIASES[normalized])
    # Also strip spaces and hyphens
    compact = normalized.replace(" ", "").replace("-", "")
    aliases.add(compact)
    return aliases


def classify_usage_depth(
    skill: str,
    file_path: str,
    content: str,
    is_manifest: bool = False,
) -> Tuple[UsageDepth, int]:
    """
    Deterministically computes UsageDepth and hit count based on regex patterns.

    Levels:
        - NONE: 0 occurrences or file empty.
        - DETECTED: Listed in manifest only, or 1 shallow reference/import in code.
        - MODERATE: 2 to 4 imports/usages or function calls.
        - SUBSTANTIAL: >= 5 occurrences, class definitions, extensive API logic.
    """
    if not content or not content.strip():
        return UsageDepth.NONE, 0

    aliases = _get_skill_aliases(skill)
    total_hits = 0

    for alias in aliases:
        escaped = re.escape(alias)
        # Search word boundaries or common import statements
        pattern = rf"\b{escaped}\b"
        hits = len(re.findall(pattern, content, flags=re.IGNORECASE))
        total_hits += hits

    if total_hits == 0:
        return UsageDepth.NONE, 0

    if is_manifest:
        # A manifest dependency entry alone is DETECTED
        return UsageDepth.DETECTED, total_hits

    # Source code depth heuristics
    # Check for substantial markers: e.g. class definitions, multiple function calls, decorators
    has_deep_patterns = False
    for alias in aliases:
        escaped = re.escape(alias)
        # Deep architectural usage: class inheritance, decorators, or component instantiation
        deep_re = rf"(class\s+\w+.*{escaped}|@{escaped}|import\s+.*{escaped}.*from|<{escaped})"
        if re.search(deep_re, content, flags=re.IGNORECASE):
            has_deep_patterns = True
            break

    if total_hits >= 5 or (total_hits >= 3 and has_deep_patterns):
        return UsageDepth.SUBSTANTIAL, total_hits
    elif total_hits >= 2 or has_deep_patterns:
        return UsageDepth.MODERATE, total_hits
    else:
        return UsageDepth.DETECTED, total_hits


# ---------------------------------------------------------------------------
# Evidence Locator
# ---------------------------------------------------------------------------

def locate_evidence_for_claim(
    claim: Claim,
    file_tree: List[Dict[str, Any]],
    file_fetcher: Callable[[str], Optional[str]],
) -> Evidence:
    """
    Locates and scores code evidence for a specific candidate claim.

    Strategy:
        1. Check `claim.repo_hint` first.
        2. Inspect manifests (e.g. package.json, requirements.txt).
        3. Search source files by relevant extension and regex match.
        4. If no matching file exists, returns Evidence with file_exists=False.
    """
    file_paths = [item["path"] for item in file_tree if item.get("type") in ("blob", None)]
    aliases = _get_skill_aliases(claim.skill)

    # -----------------------------------------------------------------------
    # Step 1: Check repo_hint first
    # -----------------------------------------------------------------------
    if claim.repo_hint:
        hint = claim.repo_hint.strip().lstrip("/")
        # Exact match or directory prefix match
        matching_paths = [p for p in file_paths if p == hint or p.startswith(hint.rstrip("/") + "/")]
        for p in matching_paths:
            content = file_fetcher(p)
            if content is not None:
                is_manifest = Path(p).name.lower() in MANIFEST_FILES
                depth, hits = classify_usage_depth(claim.skill, p, content, is_manifest=is_manifest)
                if depth != UsageDepth.NONE or p == hint:
                    return Evidence(
                        claim_id=claim.claim_id,
                        skill=claim.skill,
                        source_type="github_code",
                        file_path=p,
                        file_exists=True,
                        content_sha256=compute_content_sha256(content),
                        usage_depth=depth,
                        authorship_pct=0.0,  # Blame engine (M5) populates this
                        authorship_signal=AuthorshipSignal.NONE,
                        commit_count=0,
                        conflicts=[],
                    )

    # -----------------------------------------------------------------------
    # Step 2: Search source files by relevant extensions
    # -----------------------------------------------------------------------
    normalized_skill = claim.skill.lower().strip()
    relevant_exts = LANGUAGE_EXTENSIONS.get(normalized_skill, set())

    candidate_evidences: List[Tuple[int, UsageDepth, str, str]] = []

    # Prioritize non-vendor files (skip node_modules, venv, vendor, dist, .git)
    clean_paths = [
        p for p in file_paths
        if not re.search(r"(?:^|/)(?:node_modules|venv|\.venv|vendor|dist|build|\.git)/", p, re.IGNORECASE)
    ]

    for p in clean_paths:
        ext = "." + p.split(".")[-1].lower() if "." in p else ""
        file_name = p.split("/")[-1].lower()

        is_manifest = file_name in MANIFEST_FILES
        is_relevant_ext = ext in relevant_exts or not relevant_exts

        if not (is_manifest or is_relevant_ext):
            continue

        content = file_fetcher(p)
        if content is None:
            continue

        depth, hits = classify_usage_depth(claim.skill, p, content, is_manifest=is_manifest)
        if depth != UsageDepth.NONE:
            # Rank source code higher than manifests if both exist
            score = hits * 2 if not is_manifest else hits
            candidate_evidences.append((score, depth, p, content))

    if candidate_evidences:
        # Pick the evidence with the strongest usage
        candidate_evidences.sort(key=lambda x: x[0], reverse=True)
        best_score, best_depth, best_path, best_content = candidate_evidences[0]

        return Evidence(
            claim_id=claim.claim_id,
            skill=claim.skill,
            source_type="github_code",
            file_path=best_path,
            file_exists=True,
            content_sha256=compute_content_sha256(best_content),
            usage_depth=best_depth,
            authorship_pct=0.0,
            authorship_signal=AuthorshipSignal.NONE,
            commit_count=0,
            conflicts=[],
        )

    # -----------------------------------------------------------------------
    # Step 3: No evidence found
    # -----------------------------------------------------------------------
    return Evidence(
        claim_id=claim.claim_id,
        skill=claim.skill,
        source_type="github_code",
        file_path=claim.repo_hint,
        file_exists=False,
        content_sha256=None,
        usage_depth=UsageDepth.NONE,
        authorship_pct=0.0,
        authorship_signal=AuthorshipSignal.NONE,
        commit_count=0,
        conflicts=[],
    )
