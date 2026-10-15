# ProofPass — M4: AI, Skill Intelligence and Passport Logic

This module owns `backend/intelligence/`. It implements:

- **Claim extraction** from resume text (LLM + mock fallback)
- **Target role parsing** from job descriptions (LLM + mock fallback)
- **Deterministic claim-state engine** (Verified / Supported / Claimed / Contradicted)
- **Cheat-resistant micro-quiz generation** (fake-premise traps, git history, micro-modifications)
- **Role matching** with evidence-aware weights (100/60/20/0)
- **Gap analysis** with iMocha assessment as the #1 recommended action
- **Passport payload builder** (canonical JSON ready for M2 to hash and sign)

## Principles

- The LLM **only proposes**. It never sets states or scores.
- Deterministic code validates evidence.
- Every LLM response is validated against a Pydantic schema.
- Resume/repo text is treated as untrusted (prompt-injection sanitized).
- Keys come from environment variables only.

## Quick Start

```bash
pip install -r requirements.txt
cp .env.example .env
python run_demo.py