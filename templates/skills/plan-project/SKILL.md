---
name: plan-project
description: Plan a new feature, app, module, or refactor before implementation.
---

# Plan Project

Use this skill when the user asks to plan a new project, feature, module, refactor, or implementation strategy.

## Process

1. Read README.md if present.
2. Read AGENTS.md.
3. Read package/config files.
4. Inspect relevant source folders.
5. Identify the current architecture and conventions.
6. Ask only blocking questions.
7. Produce a plan before writing code.

## Output

Return:

- goal
- current architecture summary
- assumptions
- proposed architecture
- milestones
- implementation steps
- files likely to change
- tests required
- risks
- rollout plan
- recommended first PR

## Rules

- Do not implement until asked.
- Prefer small PR-sized changes.
- Identify security-sensitive areas.
- Use `skills/code-structure/SKILL.md` when deciding where code belongs.
- Prefer extending existing patterns over introducing new ones.
- Be explicit about assumptions.
