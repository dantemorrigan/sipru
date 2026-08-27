# Sipru agent registry

Source of truth for every AI agent that can be dispatched to work on Sipru.
The `project-manager` agent reads this file before delegating anything, and
it is how it (and any human) knows what agents exist, what they own, and
which one fits a given task. **Whenever a new file is added under
`.claude/agents/`, add a row here in the same commit** — an agent that
isn't listed here doesn't exist as far as the project manager is concerned.

## Project-specific subagents (`.claude/agents/*.md`)

| Agent | File | Model | Tools | Owns | Use for | Do not use for |
|---|---|---|---|---|---|---|
| `project-manager` | `project-manager.md` | sonnet | Agent, TaskCreate/List/Get/Update/Output/Stop, Read, Grep, Glob, Bash | Coordinating all other agents, task backlog, priority, avoiding duplicate/conflicting work | "who should do X", planning multi-agent work, status of in-flight work, reassigning stuck work | Writing code, running QA, reviewing diffs itself — it delegates those |
| `bugfinder` | `bugfinder.md` | sonnet | Bash, Read, Write, Glob, Grep | Exploratory/manual QA of the running app in a real browser (Playwright) | Bug hunts, regression sweeps, UI stress-testing, export/import round-trips | Static code review, writing/running `npm test`, fixing the bugs it finds |
| `programmer` | `programmer.md` | sonnet | Bash, Read, Write, Edit, Glob, Grep | Implementing features/fixes/refactors as a working, tested commit | Any task whose deliverable is code + build/test verification | Exploratory QA (use bugfinder), reviewing a diff without changing it (use code-review) |
| `architecture` | `architecture.md` | sonnet | Bash, Read, Glob, Grep | Module boundaries, dependency shape, long-term maintainability/scalability | Reviewing multi-module/new-file/storage-format changes, "will this scale" questions, dependency maps | Runtime bug hunting (use bugfinder), line-level diff nitpicks (use code-review) |
| `design-guardian` | `design-guardian.md` | sonnet | Bash, Read, Write, Glob, Grep | Visual/UX quality, design-system consistency, accessibility, design debt | Reviewing any UI-touching change, proactive design pass after a screen/component/CSS edit | Functional/logic bugs unrelated to visuals (use bugfinder), freelancing a redesign |
| `performance` | `performance.md` | haiku | Bash, Read, Write, Glob, Grep | Profiling, re-render/memory audits, bundle size, perf regressions | Investigating jank/slowness, reviewing a diff for a perf regression before it lands | Functional bug hunting (use bugfinder), static correctness/style review (use code-review) |

## Built-in Claude Code agent types (always available via the `Agent` tool)

Not Sipru-specific, but part of the same pool the project manager can draw
on. Listed here so the project manager doesn't reinvent them as new
project-specific agents.

| Agent | Use for | Do not use for |
|---|---|---|
| `Explore` | Read-only codebase search: "where is X defined", "find files matching Y" | Judgment calls, review, writing/editing |
| `Plan` | Designing an implementation approach before coding | Executing the plan itself |
| `general-purpose` | Multi-step tasks that need broad tool access and don't fit a specialist | Anything a specialist (bugfinder, a skill) already covers better/cheaper |
| `claude-code-guide` | Questions about Claude Code / Agent SDK / Claude API itself | Sipru product work |
| `statusline-setup` | Configuring the user's Claude Code status line | Anything unrelated to that one setting |
| `claude` | Generic catch-all (FleetView default) | Prefer a specialist above when one fits |

## Skills that act like specialist workers

Invoked via `Skill`, not `Agent`, but the project manager should route work
to these instead of asking a general agent to reinvent them:

| Skill | Use for |
|---|---|
| `code-review` | Reviewing a diff/PR for correctness and cleanup, optionally posting inline comments or auto-fixing |
| `simplify` | Applying reuse/simplification/efficiency cleanups to already-working code |
| `security-review` | Security review of pending changes on the branch |
| `run` | Launching the app to visually confirm a change works |

## Keeping this file current

- Adding a new `.claude/agents/*.md` file → add a row to the first table in
  the same commit (name, model, tools, what it owns, what it's for).
- Retiring/renaming an agent → update or remove its row, don't leave stale
  entries.
- Repurposing an agent's responsibilities → update the "Owns"/"Use for"
  columns so the project manager keeps routing work correctly.
