---
name: greploop
description: Fix PR review comments and CI failures in a bounded loop.
---

# Greploop

Use this skill when a PR has Greptile, CI, or reviewer feedback.

## Process

1. Read the current PR feedback.
2. Read failing CI output if available.
3. Group comments by theme.
4. Identify actionable comments.
5. Fix only actionable comments.
6. Run relevant tests.
7. Repeat at most 3 times.

## Rules

- Do not loop forever.
- Do not make unrelated refactors.
- Do not chase style-only comments if they conflict with AGENTS.md.
- Do not weaken tests to pass CI.
- Do not modify auth/payment/data deletion/security-sensitive code without approval.
- Stop and summarize if feedback is ambiguous.

## Output

Return:

- comments addressed
- files changed
- tests run
- comments intentionally not addressed
- remaining risks
