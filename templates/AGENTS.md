# AGENTS.md

## Project purpose

This repository is maintained with Codex and other AI coding agents. Agents should plan first, make small changes, run checks, and explain risks before broad refactors.

## Standard commands

- Install dependencies: `./scripts/setup.sh`
- Lint: `./scripts/lint.sh`
- Typecheck: `./scripts/typecheck.sh`
- Test: `./scripts/test.sh`
- Build: `./scripts/build.sh`
- Audit: `./scripts/audit.sh`

## Skills

Use these skills when appropriate:

- `skills/plan-project/SKILL.md` for planning new projects, features, modules, or refactors.
- `skills/audit-repo/SKILL.md` for auditing an existing codebase.
- `skills/code-structure/SKILL.md` for deciding what belongs in actions, services, utilities, and routes/controllers.
- `skills/greploop/SKILL.md` for bounded PR review and CI fix loops.
- `skills/opensrc/SKILL.md` for fetching package source code when dependency internals matter.
- `skills/ralphy-run/SKILL.md` for bounded multi-agent implementation loops after a clear PRD exists.

## Code structure rules

Follow `skills/code-structure/SKILL.md`.

Summary:

- Actions orchestrate workflows and business rules.
- Services contain reusable operational mechanics.
- Utilities are pure helpers.
- Controllers/routes should stay thin.
- Prefer extending existing services before creating new abstractions.
- Do not create god services.
- Do not hide domain mutations inside generic services.
- Do not extract logic used only once unless it is clearly a stable boundary.

## Planning rules

Before implementing a feature:

1. Read the relevant files.
2. Read AGENTS.md.
3. Use the relevant skill file.
4. Produce a short implementation plan.
5. Identify risky assumptions.
6. Add or update tests.
7. Make the smallest viable change.
8. Run the standard checks.
9. Summarize changed files, tests run, and remaining risks.

## Audit rules

When auditing the repo, check:

- failing tests
- type/lint/build errors
- dependency risk
- duplicated logic
- confusing module boundaries
- missing tests
- security-sensitive code
- slow or fragile areas
- outdated docs
- large files
- dead code
- inconsistent patterns

Group findings as:

- quick wins
- medium refactors
- structural changes
- security issues
- test gaps
- recommended PR sequence

## Safety rules

- Do not delete large sections without explaining why.
- Do not change authentication, authorization, payment, data deletion, migrations, encryption, secrets, or security-sensitive code without explicit approval.
- Do not introduce new dependencies unless justified.
- Do not fetch external source code with opensrc unless package internals are needed for the task.
- Do not ignore failing tests.
- Do not make unrelated refactors.
- Prefer PR-sized changes over large rewrites.
- Stop and ask before destructive operations.
- Never commit secrets.
- Never weaken security checks to make tests pass.

## PR rules

Every PR summary should include:

- what changed
- why it changed
- tests run
- risks
- follow-up work
