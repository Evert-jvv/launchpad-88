Use AGENTS.md and skills/ralphy-run/SKILL.md.

Task:
Review the current PRD or issue and decide whether it is safe to run the bounded Ralphy loop.

Rules:
- Ralphy is an implementation grinder, not the architect.
- Require a clear PRD or issue.
- Stop if scope is unclear.
- Stop if auth/payment/data deletion/security-sensitive areas would be changed without approval.
- Use MAX_ITERATIONS=3 by default.
- Do not run scripts/ralphy.sh unless explicitly approved.
