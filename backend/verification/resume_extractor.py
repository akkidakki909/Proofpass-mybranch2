"""
Resume text extraction using PyMuPDF (pymupdf).
Pure deterministic extraction; no external or LLM calls.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Union, BinaryIO

import pymupdf


def extract_resume_text(pdf_input: Union[str, Path, bytes, BinaryIO]) -> str:
    """
    Extracts structured, normalized plain text from a resume PDF using PyMuPDF.

    Args:
        pdf_input: File path (str or Path), raw bytes, or binary stream.

    Returns:
        Cleaned plain text of the resume.

    Raises:
        ValueError: If PDF is encrypted, corrupt, empty, or has no extractable text.
        TypeError: If input type is unsupported.
    """
    doc: pymupdf.Document | None = None
    try:
        if isinstance(pdf_input, (str, Path)):
            path = Path(pdf_input)
            if not path.exists():
                raise FileNotFoundError(f"PDF file does not exist: {path}")
            doc = pymupdf.open(str(path))
        elif isinstance(pdf_input, bytes):
            if not pdf_input:
                raise ValueError("PDF byte content is empty.")
            doc = pymupdf.open(stream=pdf_input, filetype="pdf")
        elif hasattr(pdf_input, "read"):
            data = pdf_input.read()
            if isinstance(data, str):
                data = data.encode("utf-8")
            if not data:
                raise ValueError("PDF stream content is empty.")
            doc = pymupdf.open(stream=data, filetype="pdf")
        else:
            raise TypeError(f"Unsupported input type for PDF extraction: {type(pdf_input)}")

        if doc.is_encrypted:
            raise ValueError("PDF is password-protected or encrypted.")

        if doc.page_count == 0:
            raise ValueError("PDF document contains 0 pages.")

        extracted_pages: list[str] = []
        for page_idx in range(doc.page_count):
            page = doc.load_page(page_idx)
            text = page.get_text("text")
            if text:
                extracted_pages.append(text)

        full_text = "\n\n".join(extracted_pages).strip()

        # Check for scanned image or empty document
        if not full_text or len(re.sub(r"\s+", "", full_text)) == 0:
            raise ValueError("PDF contains no extractable text (document may be a scanned image or empty).")

        # Normalize line endings & repetitive whitespace
        normalized = re.sub(r"\r\n", "\n", full_text)
        normalized = re.sub(r"\r", "\n", normalized)
        # Collapse 3+ newlines to 2 newlines (preserve paragraph separation)
        normalized = re.sub(r"\n{3,}", "\n\n", normalized)
        # Strip trailing whitespaces per line
        lines = [line.rstrip() for line in normalized.split("\n")]
        return "\n".join(lines).strip()

    except pymupdf.FileDataError as exc:
        raise ValueError(f"Corrupted or invalid PDF data: {exc}") from exc
    except Exception:
        raise
    finally:
        if doc is not None:
            doc.close()
