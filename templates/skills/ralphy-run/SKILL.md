---
name: ralphy-run
description: Use Ralph/Ralphy as a bounded multi-agent implementation loop only after a clear PRD or issue exists.
---

# Ralphy Run

Use this skill only after a clear PRD, issue, or implementation plan exists.

Ralphy is an implementation grinder, not the architect.

Upstream Ralphy:

- GitHub: https://github.com/michaelshimeles/ralphy
- npm package: `ralphy-cli`
- CLI command: `ralphy`
- Recommended install: `npm install -g ralphy-cli`

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
6. Confirm the `ralphy` command is installed.
7. Run the loop only after explicit approval.
8. Use `./scripts/ralphy.sh <prd-file>` for the bounded wrapper.
9. Check `.ralphy/lp88.env` for a saved `RALPHY_ENGINE` preference.
10. The wrapper runs `ralphy --prd <prd-file> --max-iterations <n>` by default.
11. If `RALPHY_ENGINE=codex`, the wrapper runs `ralphy --codex --prd <prd-file> --max-iterations <n>`.
12. Prefer `--codex` only when the user explicitly wants Ralphy to use Codex as the engine.
13. Override per run with `RALPHY_ENGINE=<engine> RALPHY_MODEL=<model> ./scripts/ralphy.sh <prd-file>`.
14. Run verification after the loop.
15. Summarize results and remaining risks.

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
