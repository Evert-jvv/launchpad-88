---
name: audit-repo
description: Audit an existing repo and produce a prioritized improvement plan.
---

# Audit Repo

Use this skill when the user asks to improve, clean up, refactor, harden, or understand an existing project.

## Process

1. Read AGENTS.md.
2. Run `./scripts/audit.sh`.
3. Inspect project structure.
4. Inspect package/config files.
5. Inspect important source folders.
6. Look for structural, reliability, security, testing, and maintainability issues.

## Check for

- failing tests
- missing tests
- duplicated logic
- overly large files
- unclear module boundaries
- weak error handling
- security-sensitive code
- dependency risk
- missing observability
- stale documentation
- fragile scripts
- inconsistent patterns
- code that violates `skills/code-structure/SKILL.md`

## Output

Group findings by:

- quick wins
- high-impact fixes
- risky refactors
- security concerns
- test gaps
- code-structure concerns
- recommended PR sequence

## Rules

- Prefer incremental improvements over rewrites.
- Do not make changes unless asked.
- Do not recommend broad rewrites unless clearly justified.
- Prioritize issues that reduce bugs, risk, and future development friction.
