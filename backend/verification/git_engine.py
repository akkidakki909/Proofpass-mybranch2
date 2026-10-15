"""
Git Blame Authorship & Commit Velocity Engine.
Executes shallow-cloning and `git blame --line-porcelain` to extract deterministic
authorship signals and commit velocity. No LLM calls.
"""
from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from .models import AuthorshipSignal


# ---------------------------------------------------------------------------
# Porcelain Parser
# ---------------------------------------------------------------------------

def parse_git_blame_porcelain(
    porcelain_output: str,
    candidate_identities: List[str],
) -> Tuple[float, AuthorshipSignal, int, int]:
    """
    Parses output of `git blame --line-porcelain` and computes candidate line ratio.

    Args:
        porcelain_output: Raw stdout from `git blame --line-porcelain`.
        candidate_identities: List of identifiers to match (e.g. GitHub username, email, full name).

    Returns:
        (authorship_pct, authorship_signal, candidate_lines, total_lines)
    """
    if not porcelain_output or not porcelain_output.strip():
        return 0.0, AuthorshipSignal.NONE, 0, 0

    # Clean & normalize candidate identities
    normalized_identities = {
        ident.lower().strip().strip("@").strip("<").strip(">")
        for ident in candidate_identities
        if ident and ident.strip()
    }

    # Split into lines
    lines = porcelain_output.splitlines()
    total_lines = 0
    candidate_lines = 0

    current_author = ""
    current_mail = ""

    for line in lines:
        if line.startswith("author "):
            current_author = line[len("author "):].strip().lower()
        elif line.startswith("author-mail "):
            raw_mail = line[len("author-mail "):].strip().strip("<>").lower()
            current_mail = raw_mail
        elif line.startswith("\t"):
            # A line starting with tab is the actual line of code in porcelain format
            total_lines += 1
            is_match = False
            for ident in normalized_identities:
                # Direct match in author name, username, or email handle
                if ident in current_author or ident in current_mail:
                    is_match = True
                    break
                # Handle email prefix (e.g. "alex" from "alex@example.com")
                mail_handle = current_mail.split("@")[0] if "@" in current_mail else current_mail
                if ident in mail_handle or mail_handle in ident:
                    is_match = True
                    break

            if is_match:
                candidate_lines += 1

            # Reset for next line block
            current_author = ""
            current_mail = ""

    if total_lines == 0:
        return 0.0, AuthorshipSignal.NONE, 0, 0

    pct = round(candidate_lines / total_lines, 4)
    pct = max(0.0, min(1.0, pct))

    # AuthorshipSignal classification
    if pct > 0.60:
        signal = AuthorshipSignal.STRONG
    elif pct >= 0.15:
        signal = AuthorshipSignal.PARTIAL
    else:
        signal = AuthorshipSignal.NONE

    return pct, signal, candidate_lines, total_lines


# ---------------------------------------------------------------------------
# Local Repository Blame & Analysis
# ---------------------------------------------------------------------------

def compute_file_authorship(
    repo_path: Path | str,
    relative_file_path: str,
    candidate_identities: List[str],
    timeout_seconds: int = 15,
) -> Tuple[float, AuthorshipSignal]:
    """
    Runs `git blame --line-porcelain` for a file within a git repository.
    """
    repo = Path(repo_path)
    file_path = repo / relative_file_path.lstrip("/")

    if not file_path.exists():
        return 0.0, AuthorshipSignal.NONE

    cmd = ["git", "blame", "--line-porcelain", "--", str(relative_file_path.lstrip("/"))]
    try:
        proc = subprocess.run(
            cmd,
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            encoding="utf-8",
            errors="replace",
        )
        if proc.returncode != 0:
            return 0.0, AuthorshipSignal.NONE
        pct, signal, _, _ = parse_git_blame_porcelain(proc.stdout, candidate_identities)
        return pct, signal
    except Exception:
        return 0.0, AuthorshipSignal.NONE


def analyze_repo_commits(
    repo_path: Path | str,
    candidate_identities: List[str],
    timeout_seconds: int = 15,
) -> Dict[str, Any]:
    """
    Analyzes commit history of a repository:
        - Total commit count
        - Candidate commit count
        - Candidate commit ratio
        - Commit messages
    """
    repo = Path(repo_path)
    cmd = ["git", "log", "--format=%H|%an|%ae|%at|%s", "-n", "100"]

    try:
        proc = subprocess.run(
            cmd,
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            encoding="utf-8",
            errors="replace",
        )
        if proc.returncode != 0:
            return {"total_commits": 0, "candidate_commits": 0, "commits": []}

        normalized_identities = {
            i.lower().strip() for i in candidate_identities if i and i.strip()
        }

        commits = []
        candidate_count = 0

        for line in proc.stdout.splitlines():
            parts = line.strip().split("|", 4)
            if len(parts) < 5:
                continue
            sha, author_name, author_email, ts, subject = parts
            author_lower = author_name.lower()
            email_lower = author_email.lower()

            is_candidate = any(
                ident in author_lower or ident in email_lower
                for ident in normalized_identities
            )
            if is_candidate:
                candidate_count += 1

            commits.append({
                "sha": sha,
                "author": author_name,
                "email": author_email,
                "timestamp": int(ts) if ts.isdigit() else 0,
                "subject": subject,
                "is_candidate": is_candidate,
            })

        total = len(commits)
        return {
            "total_commits": total,
            "candidate_commits": candidate_count,
            "commits": commits,
        }
    except Exception:
        return {"total_commits": 0, "candidate_commits": 0, "commits": []}


# ---------------------------------------------------------------------------
# Shallow Clone & Blame Runner
# ---------------------------------------------------------------------------

def shallow_clone_and_blame(
    github_url: str,
    file_paths: List[str],
    candidate_username: str,
    token: Optional[str] = None,
    max_depth: int = 50,
    timeout_seconds: int = 40,
    max_size_kb: int = 150_000,  # 150 MB cap
) -> Dict[str, Tuple[float, AuthorshipSignal]]:
    """
    Shallow-clones a public repository into a temporary directory and computes
    authorship metrics for all specified files.
    """
    results: Dict[str, Tuple[float, AuthorshipSignal]] = {
        fp: (0.0, AuthorshipSignal.NONE) for fp in file_paths
    }

    if not file_paths:
        return results

    # Insert token into clone URL if provided
    clone_url = github_url.strip()
    if token and "github.com" in clone_url and "@" not in clone_url:
        clone_url = re.sub(r"https://github\.com/", f"https://{token}@github.com/", clone_url)

    temp_dir = tempfile.mkdtemp(prefix="proofpass_clone_")
    try:
        clone_cmd = [
            "git", "clone",
            "--depth", str(max_depth),
            "--single-branch",
            "--no-tags",
            clone_url,
            temp_dir,
        ]
        proc = subprocess.run(
            clone_cmd,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )
        if proc.returncode != 0:
            return results

        candidate_identities = [candidate_username]
        for fp in file_paths:
            results[fp] = compute_file_authorship(
                repo_path=temp_dir,
                relative_file_path=fp,
                candidate_identities=candidate_identities,
                timeout_seconds=10,
            )
        return results
    except Exception:
        return results
    finally:
        # Safe cleanup of temp dir on Windows
        shutil.rmtree(temp_dir, ignore_errors=True)
