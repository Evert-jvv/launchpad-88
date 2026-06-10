---
name: ralphy-run
description: Use Ralph/Ralphy as a bounded multi-agent implementation loop only after a clear PRD or issue exists.
---

# Ralphy Run

Use this skill only after a clear PRD, issue, or implementation plan exists.

Ralphy is an implementation grinder, not the architect.

## Good uses

- implementing a scoped feature
- fixing failing tests
- resolving PR review comments
- applying a defined refactor
- cleaning up a bounded set of issues

## Bad uses

- deciding product direction
- designing the whole architecture from scratch
- rewriting the repo
- running without tests
- running without a max iteration limit
- modifying security-sensitive systems without approval

## Process

1. Read AGENTS.md.
2. Read the PRD or issue.
3. Confirm scope is bounded.
4. Confirm tests/checks exist.
5. Set MAX_ITERATIONS=3 unless explicitly changed.
6. Run the loop only after explicit approval.
7. Run verification after the loop.
8. Summarize results and remaining risks.

## Stop conditions

Stop if:

- acceptance criteria are met
- max iterations are reached
- tests cannot be made to pass without changing scope
- the agent wants to change unrelated systems
- auth/payment/data deletion/security-sensitive areas would be changed without approval
- the PRD is unclear

## Output

Return:

- task file used
- iterations run
- files changed
- tests run
- whether acceptance criteria were met
- unresolved risks
