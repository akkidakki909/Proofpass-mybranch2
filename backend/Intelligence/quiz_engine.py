"""
Micro-quiz generation and evaluation.
Questions are built from the candidate's OWN code and commit history.
Includes fake-premise traps and micro-modification tasks.
"""
from __future__ import annotations

import logging
from typing import List, Optional

from .models import (
    Claim, Evidence, QuizQuestion, QuizAnswer, QuizResult, QuestionType,
)
from .llm_service import _call_llm, _extract_json, _sanitize, config

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Generation
# ---------------------------------------------------------------------------

def generate_micro_quiz(
    claim: Claim,
    evidence: List[Evidence],
    code_snippets: Optional[dict] = None,
    commit_messages: Optional[List[str]] = None,
) -> List[QuizQuestion]:
    """
    Generate 2-3 cheat-resistant quiz questions for a skill.
    code_snippets: {file_path: content}
    commit_messages: list of recent commit messages
    """
    code_snippets = code_snippets or {}
    commit_messages = commit_messages or []

    # Try LLM first
    questions = _generate_via_llm(claim, evidence, code_snippets, commit_messages)
    if questions:
        return questions

    # Fallback: deterministic rule-based questions
    return _generate_fallback(claim, evidence, code_snippets, commit_messages)


def _generate_via_llm(
    claim: Claim,
    evidence: List[Evidence],
    code_snippets: dict,
    commit_messages: List[str],
) -> List[QuizQuestion]:
    file_paths = [ev.file_path for ev in evidence if ev.file_path]
    snippet_text = "\n\n".join(
        f"--- {path} ---\n{_sanitize(content, 1500)}"
        for path, content in code_snippets.items()
    )[:4000]
    commits_text = "\n".join(f"- {m}" for m in commit_messages[:10])

    system = (
        "You generate 2-3 cheat-resistant micro-verification questions for a candidate's skill. "
        "Questions must be specific to THEIR code, not generic. "
        "Use these question types:\n"
        "  - fake_premise: ask about something that ISN'T in their code (to catch fakers).\n"
        "  - git_history: ask about a specific commit or refactor.\n"
        "  - business_logic: ask WHY a specific value/decision was made.\n"
        "  - micro_modification: ask them to make a small change to a snippet.\n"
        "Return ONLY JSON: "
        '{"questions": [{"question_type": str, "question_text": str, '
        '"context_snippet": str|null, "expected_answer_hints": [str, ...]}, ...]}. '
        "Limit to 2-3 questions. Keep each question under 200 chars."
    )
    user = (
        f"Skill: {claim.skill}\n"
        f"Files: {file_paths}\n"
        f"Recent commits:\n{commits_text}\n\n"
        f"Code snippets:\n{snippet_text}"
    )

    raw = _call_llm(system, user)
    data = _extract_json(raw)
    if not data:
        return []

    try:
        out: List[QuizQuestion] = []
        for q in data.get("questions", [])[:3]:
            out.append(
                QuizQuestion(
                    claim_id=claim.claim_id,
                    skill=claim.skill,
                    question_type=QuestionType(q.get("question_type", "business_logic")),
                    question_text=str(q.get("question_text", ""))[:300],
                    context_snippet=q.get("context_snippet"),
                    expected_answer_hints=list(q.get("expected_answer_hints", [])),
                )
            )
        return out
    except Exception as e:  # noqa: BLE001
        logger.error("Failed to parse quiz response: %s", e)
        return []


def _generate_fallback(
    claim: Claim,
    evidence: List[Evidence],
    code_snippets: dict,
    commit_messages: List[str],
) -> List[QuizQuestion]:
    """Rule-based fallback when LLM is unavailable."""
    questions: List[QuizQuestion] = []

    # 1. Fake-premise trap
    questions.append(
        QuizQuestion(
            claim_id=claim.claim_id,
            skill=claim.skill,
            question_type=QuestionType.FAKE_PREMISE,
            question_text=(
                f"In your {claim.skill} work, you mentioned using a caching layer "
                f"with Redis. Can you explain why you chose Redis over Memcached?"
            ),
            context_snippet=None,
            expected_answer_hints=["I did not use Redis", "no Redis", "not applicable"],
        )
    )

    # 2. Git history question (if we have commits)
    if commit_messages:
        questions.append(
            QuizQuestion(
                claim_id=claim.claim_id,
                skill=claim.skill,
                question_type=QuestionType.GIT_HISTORY,
                question_text=(
                    f"One of your recent commits was: '{commit_messages[0][:80]}'. "
                    f"What problem were you solving with that change?"
                ),
                context_snippet=None,
                expected_answer_hints=[],
            )
        )

    # 3. Micro-modification (if we have a snippet)
    if code_snippets:
        first_path = next(iter(code_snippets))
        snippet = code_snippets[first_path][:400]
        questions.append(
            QuizQuestion(
                claim_id=claim.claim_id,
                skill=claim.skill,
                question_type=QuestionType.MICRO_MODIFICATION,
                question_text=(
                    f"Here is a snippet from {first_path}. Add error handling "
                    f"(try/except or equivalent) around the main operation. "
                    f"Show the updated code.\n\n{snippet}"
                ),
                context_snippet=snippet,
                expected_answer_hints=["try", "except", "catch", "error"],
            )
        )

    return questions[:3]


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

def evaluate_answer(
    question: QuizQuestion,
    answer: QuizAnswer,
) -> QuizResult:
    """
    Evaluate a quiz answer. Uses LLM if available, else keyword-based heuristic.
    Returns QuizResult with passed=True/False and reasoning.
    """
    # Try LLM evaluation
    result = _evaluate_via_llm(question, answer)
    if result is not None:
        return result

    # Fallback: keyword-based
    return _evaluate_fallback(question, answer)


def _evaluate_via_llm(question: QuizQuestion, answer: QuizAnswer) -> Optional[QuizResult]:
    system = (
        "You evaluate a candidate's answer to a micro-verification question about THEIR OWN code. "
        "The question may be a fake-premise trap: if the candidate accepts a false premise, "
        "they FAIL. If they push back correctly, they PASS. "
        "For other questions: pass if the answer shows genuine understanding of their own code. "
        "Return ONLY JSON: "
        '{"passed": bool, "reasoning": str (under 150 chars)}.'
    )
    hints = "\n".join(f"- {h}" for h in question.expected_answer_hints) if question.expected_answer_hints else "(none)"
    user = (
        f"Skill: {question.skill}\n"
        f"Question type: {question.question_type.value}\n"
        f"Question: {question.question_text}\n"
        f"Context snippet: {question.context_snippet or '(none)'}\n"
        f"Expected hints: {hints}\n\n"
        f"Candidate's answer: {answer.answer_text}"
    )

    raw = _call_llm(system, user)
    data = _extract_json(raw)
    if not data or "passed" not in data:
        return None

    try:
        return QuizResult(
            question_id=question.question_id,
            passed=bool(data["passed"]),
            reasoning=str(data.get("reasoning", ""))[:200],
        )
    except Exception:  # noqa: BLE001
        return None


def _evaluate_fallback(question: QuizQuestion, answer: QuizAnswer) -> QuizResult:
    """Keyword-based fallback evaluator."""
    text = answer.answer_text.lower()

    # Fake-premise: if they accept the false premise, fail
    if question.question_type == QuestionType.FAKE_PREMISE:
        # Check if they push back
        pushback = ["did not", "didn't", "don't use", "not use", "no redis", "no caching", "never used", "incorrect premise"]
        if any(p in text for p in pushback):
            return QuizResult(
                question_id=question.question_id,
                passed=True,
                reasoning="Candidate correctly rejected the false premise.",
            )
        # Check hints
        for hint in question.expected_answer_hints:
            if hint.lower() in text:
                return QuizResult(
                    question_id=question.question_id,
                    passed=True,
                    reasoning="Candidate rejected the false premise (keyword match).",
                )
        return QuizResult(
            question_id=question.question_id,
            passed=False,
            reasoning="Candidate accepted the false premise.",
        )

    # Other types: check for expected hints or minimum length
    if question.expected_answer_hints:
        matched = sum(1 for h in question.expected_answer_hints if h.lower() in text)
        if matched > 0:
            return QuizResult(
                question_id=question.question_id,
                passed=True,
                reasoning=f"Matched {matched} expected hint(s).",
            )

    # Default: pass if answer is substantive (>30 chars)
    if len(answer.answer_text.strip()) > 30:
        return QuizResult(
            question_id=question.question_id,
            passed=True,
            reasoning="Substantive answer (fallback heuristic).",
        )

    return QuizResult(
        question_id=question.question_id,
        passed=False,
        reasoning="Answer too short or no expected hints matched.",
    )