"""
Unit tests for Member 3 (Evidence Verification Engine).
"""
import pytest
from pydantic import ValidationError

from verification.models import (
    Claim,
    Evidence,
    RepoMetadata,
    VerificationResult,
    TrustCeiling,
    UsageDepth,
    AuthorshipSignal,
)


# ---------------------------------------------------------------------------
# Milestone 1: Models & Schemas
# ---------------------------------------------------------------------------

def test_claim_model_defaults_and_validation():
    claim = Claim(skill="  Python  ", resume_pointer="Experience, Line 5")
    assert claim.skill == "Python"
    assert claim.claim_id.startswith("cl_")
    assert claim.repo_hint is None

    # Empty skill should fail validation
    with pytest.raises(ValidationError):
        Claim(skill="", resume_pointer="p1")


def test_evidence_model_constraints():
    ev = Evidence(
        claim_id="cl_123",
        skill="FastAPI",
        file_path="main.py",
        file_exists=True,
        usage_depth=UsageDepth.SUBSTANTIAL,
        authorship_pct=0.85,
        authorship_signal=AuthorshipSignal.STRONG,
        commit_count=12,
        conflicts=[],
    )
    assert ev.evidence_id.startswith("ev_")
    assert ev.source_type == "github_code"
    assert ev.authorship_pct == 0.85

    # Out of bounds authorship_pct must fail validation
    with pytest.raises(ValidationError):
        Evidence(
            claim_id="cl_123",
            skill="FastAPI",
            file_exists=True,
            authorship_pct=1.5,
        )


def test_verification_result_serialization():
    meta = RepoMetadata(is_fork=True, fork_of="octocat/Spoon-Knife")
    ev = Evidence(
        claim_id="cl_1",
        skill="React",
        file_exists=True,
        usage_depth=UsageDepth.MODERATE,
    )
    res = VerificationResult(
        provenance=TrustCeiling.PLATFORM_VERIFIED,
        repo=meta,
        evidence=[ev],
    )
    data = res.model_dump()
    assert data["provenance"] == "Platform-Verified"
    assert data["repo"]["is_fork"] is True
    assert data["repo"]["fork_of"] == "octocat/Spoon-Knife"
    assert len(data["evidence"]) == 1

    # Roundtrip check
    restored = VerificationResult.model_validate(data)
    assert restored.provenance == TrustCeiling.PLATFORM_VERIFIED
    assert restored.repo.fork_of == "octocat/Spoon-Knife"


# ---------------------------------------------------------------------------
# Milestone 2: PDF Resume Text Extraction
# ---------------------------------------------------------------------------

import io
import tempfile
from pathlib import Path
import pymupdf
from verification.resume_extractor import extract_resume_text


def _create_sample_pdf(pages_text: list[str]) -> bytes:
    """Helper to generate in-memory PDF bytes with PyMuPDF."""
    doc = pymupdf.open()
    for text in pages_text:
        page = doc.new_page()
        page.insert_text((50, 72), text, fontsize=12)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def test_extract_resume_text_from_bytes():
    pdf_bytes = _create_sample_pdf(["Alex Developer\nExperience: Python Backend\nSkills: FastAPI, PostgreSQL"])
    extracted = extract_resume_text(pdf_bytes)
    assert "Alex Developer" in extracted
    assert "Skills: FastAPI, PostgreSQL" in extracted


def test_extract_resume_text_multipage():
    pdf_bytes = _create_sample_pdf([
        "Page 1: Summary\nExperienced full-stack developer.",
        "Page 2: Projects\nBuilt distributed ledger with React and Python."
    ])
    with tempfile.TemporaryDirectory() as td:
        pdf_path = Path(td) / "resume.pdf"
        pdf_path.write_bytes(pdf_bytes)

        # Test file path input
        extracted = extract_resume_text(pdf_path)
        assert "Page 1: Summary" in extracted
        assert "Page 2: Projects" in extracted


def test_extract_resume_text_stream():
    pdf_bytes = _create_sample_pdf(["Stream test content"])
    bio = io.BytesIO(pdf_bytes)
    extracted = extract_resume_text(bio)
    assert "Stream test content" in extracted


def test_extract_resume_text_empty_doc_raises():
    # Empty PDF with a blank page (no text)
    doc = pymupdf.open()
    doc.new_page()
    empty_bytes = doc.tobytes()
    doc.close()

    with pytest.raises(ValueError, match="no extractable text"):
        extract_resume_text(empty_bytes)


def test_extract_resume_text_corrupt_bytes():
    with pytest.raises(ValueError):
        extract_resume_text(b"corrupt non-pdf raw bytes")


def test_extract_resume_text_missing_file():
    with tempfile.TemporaryDirectory() as td:
        missing_file = Path(td) / "does_not_exist.pdf"
        with pytest.raises(FileNotFoundError):
            extract_resume_text(missing_file)

