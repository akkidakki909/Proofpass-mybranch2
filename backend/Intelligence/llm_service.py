"""
LLM calls. The LLM only PROPOSES. It never sets states or scores.
Every response is validated against a Pydantic schema.
Resume/repo text is treated as untrusted: we never forward instructions inside it.
"""
from __future__ import annotations

import json
import logging
import os
import re
from typing import List, Optional

from .config import config
from .models import Claim, RequiredSkill, TargetRole

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Safety: sanitize untrusted text before putting it in a prompt
# ---------------------------------------------------------------------------

_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|above)\s+instructions", re.IGNORECASE),
    re.compile(r"you\s+are\s+now", re.IGNORECASE),
    re.compile(r"system\s*:", re.IGNORECASE),
]


def _sanitize(text: str, max_chars: int = 8000) -> str:
    """Strip obvious prompt-injection patterns and truncate."""
    if not text:
        return ""
    cleaned = text
    for pat in _INJECTION_PATTERNS:
        cleaned = pat.sub("[REDACTED]", cleaned)
    return cleaned[:max_chars]


# ---------------------------------------------------------------------------
# LLM client (OpenAI-compatible). Falls back to mock if configured.
# ---------------------------------------------------------------------------

def _call_llm(system: str, user: str) -> Optional[str]:
    """
    Call the LLM. Returns raw text or None on failure.
    Retries up to config.llm_max_retries times.
    """
    if not config.llm_api_key:
        logger.warning("No LLM API key configured; using fallback.")
        return None

    try:
        import openai  # type: ignore
    except ImportError:
        logger.warning("openai package not installed; using fallback.")
        return None

    client = openai.OpenAI(
        api_key=config.llm_api_key,
        base_url=config.llm_base_url,
        timeout=config.llm_timeout,
    )

    last_err: Optional[Exception] = None
    for attempt in range(config.llm_max_retries + 1):
        try:
            resp = client.chat.completions.create(
                model=config.llm_model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=0.0,
                response_format={"type": "json_object"},
            )
            return resp.choices[0].message.content
        except Exception as e:  # noqa: BLE001
            last_err = e
            logger.warning("LLM call failed (attempt %d): %s", attempt + 1, e)

    logger.error("LLM call exhausted retries: %s", last_err)
    return None


def _extract_json(text: Optional[str]) -> Optional[dict]:
    if not text:
        return None
    # Strip markdown fences if present
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```(?:json)?\s*", "", t)
        t = re.sub(r"\s*```$", "", t)
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        # Try to find first JSON object
        m = re.search(r"\{.*\}", t, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0))
            except json.JSONDecodeError:
                return None
        return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_claims(resume_text: str) -> List[Claim]:
    """
    Extract skill claims from resume text.
    Returns [] on failure (safe fallback).
    """
    safe_text = _sanitize(resume_text)
    if not safe_text:
        return []

    system = (
        "You extract technical skill claims from a resume. "
        "Return ONLY JSON with this schema: "
        '{"claims": [{"skill": str, "resume_pointer": str, "repo_hint": str|null}, ...]}. '
        "Include only concrete, verifiable technical skills (languages, frameworks, tools). "
        "Do not include soft skills. If unsure, omit. "
        "repo_hint is an optional file path or keyword that might appear in a repo."
    )
    user = f"Resume text:\n{safe_text}"

    raw = _call_llm(system, user)
    data = _extract_json(raw)

    if data is None:
        if config.fallback_to_mock:
            logger.info("Using mock extract_claims fallback.")
            return _mock_extract_claims(safe_text)
        return []

    try:
        raw_claims = data.get("claims", [])
        claims = [
            Claim(
                skill=str(c.get("skill", "")).strip(),
                resume_pointer=str(c.get("resume_pointer", "")),
                repo_hint=c.get("repo_hint"),
            )
            for c in raw_claims
            if c.get("skill")
        ]
        return claims
    except Exception as e:  # noqa: BLE001
        logger.error("Failed to parse extract_claims response: %s", e)
        return _mock_extract_claims(safe_text) if config.fallback_to_mock else []


def parse_target_role(jd_text: str, default_role_name: str = "Software Engineer") -> TargetRole:
    """
    Parse a job description into a TargetRole with weighted required skills.
    Weights are normalized to sum to 1.0 by the TargetRole validator.
    """
    safe_text = _sanitize(jd_text)
    if not safe_text:
        return TargetRole(role_name=default_role_name, required_skills=[])

    system = (
        "You extract required technical skills from a job description and assign weights. "
        "Return ONLY JSON: "
        '{"role_name": str, "description": str, '
        '"required_skills": [{"skill": str, "weight": float, "importance": "required"|"preferred"|"bonus"}, ...]}. '
        "Raw weights should reflect emphasis (required ~0.2-0.3, preferred ~0.1-0.15, bonus ~0.05-0.1). "
        "They will be normalized to sum to 1.0."
    )
    user = f"Job description:\n{safe_text}"

    raw = _call_llm(system, user)
    data = _extract_json(raw)

    if data is None:
        if config.fallback_to_mock:
            return _mock_target_role(default_role_name)
        return TargetRole(role_name=default_role_name, required_skills=[])

    try:
        skills = [
            RequiredSkill(
                skill=str(s.get("skill", "")).strip(),
                weight=float(s.get("weight", 0.1)),
                importance=s.get("importance", "required"),
            )
            for s in data.get("required_skills", [])
            if s.get("skill")
        ]
        return TargetRole(
            role_name=str(data.get("role_name", default_role_name)),
            description=str(data.get("description", "")),
            required_skills=skills,
        )
    except Exception as e:  # noqa: BLE001
        logger.error("Failed to parse target role: %s", e)
        return _mock_target_role(default_role_name) if config.fallback_to_mock else TargetRole(role_name=default_role_name)


# ---------------------------------------------------------------------------
# Mock fallbacks (used when LLM is unavailable)
# ---------------------------------------------------------------------------

def _mock_extract_claims(text: str) -> List[Claim]:
    """Keyword-based fallback extractor."""
    keywords = {
        "React": ["react", "reactjs", "react.js"],
        "Python": ["python", "python3"],
        "Node.js": ["node", "nodejs", "node.js"],
        "TypeScript": ["typescript", "ts"],
        "PostgreSQL": ["postgres", "postgresql"],
        "Docker": ["docker"],
        "AWS": ["aws", "amazon web services"],
        "Git": ["git"],
    }
    lower = text.lower()
    claims: List[Claim] = []
    for skill, variants in keywords.items():
        for v in variants:
            if v in lower:
                claims.append(Claim(skill=skill, resume_pointer="resume (mock-extracted)", repo_hint=None))
                break
    return claims


def _mock_target_role(default_name: str) -> TargetRole:
    return TargetRole(
        role_name=default_name,
        description="Mock target role (LLM unavailable).",
        required_skills=[
            RequiredSkill(skill="React", weight=0.3, importance="required"),
            RequiredSkill(skill="Python", weight=0.3, importance="required"),
            RequiredSkill(skill="PostgreSQL", weight=0.2, importance="preferred"),
            RequiredSkill(skill="Docker", weight=0.2, importance="bonus"),
        ],
    )