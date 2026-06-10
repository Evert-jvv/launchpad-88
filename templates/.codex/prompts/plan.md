Use AGENTS.md, skills/plan-project/SKILL.md, and skills/code-structure/SKILL.md.

Task:
{{TASK}}

Return a combined PRD and implementation plan that can be saved to:

  docs/prd/current.md

Use this structure:

# PRD

## Goal

## User / Actor

## Problem

## Requirements

## Acceptance Criteria

## Non-goals

## Constraints

## Risks

# Implementation Plan

## Assumptions

## Architecture Impact

## Files Likely To Change

## Implementation Steps

## Tests Required

## Security / Privacy Concerns

## Rollout Plan

## Recommended First PR

Include:
- goal
- assumptions
- architecture impact
- implementation plan
- files likely to change
- tests required
- security risks
- rollout plan
- recommended first PR

Rules:
- Do not implement yet.
- Ask only blocking questions.
- Prefer small PR-sized changes.
- Make the PRD specific enough for `./scripts/ralphy.sh docs/prd/current.md`.
- Keep acceptance criteria testable.
