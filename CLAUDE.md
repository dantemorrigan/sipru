# CLAUDE.md

Repo-specific instructions for Claude Code sessions working on Sipru.

## Auto-merge to `main`

The owner wants fixes and small features shipped straight through, without
being asked to confirm the merge each time:

- After finishing a change, run `npm run build` and `npm test`. Both must
  pass (all suites green) before going further.
- Open a PR from the working branch into `main` as usual (each session gets
  its own branch — pushing directly to `main` isn't possible).
- If `npm run build` and `npm test` are clean, **merge the PR into `main`
  immediately (squash) without asking for confirmation first.** Standing
  authorization for this one action is given here — no need to re-ask the
  owner "should I merge?" for a green PR.
- Still apply judgement: don't auto-merge if the change is large/risky,
  touches release or CI config, or if tests are flaky/failing — in those
  cases stop and ask as usual.
- Do NOT force-push over unmerged work on someone else's branch, skip
  hooks, or bypass a red test suite to get to green.

## AI agent coordination

Sipru is worked on by multiple AI agents (Claude Code subagents), not just
whichever session is currently active. `.claude/agents/project-manager.md`
defines a `project-manager` agent that acts as the central coordinator:
it knows the full agent roster, decides which agent handles a given task,
tracks task status/priority/dependencies via the `TaskCreate`/`TaskList`
tools, and prevents duplicate or colliding work.

- `.claude/agents/REGISTRY.md` is the source of truth for every agent
  (project-specific and built-in) and coordinating skill. **Adding a new
  `.claude/agents/*.md` file requires adding a row to `REGISTRY.md` in the
  same commit** — an unregistered agent is invisible to the project
  manager's routing.
- For any task that should be split across agents, that overlaps with
  work already in flight, or where it's unclear which agent should own
  it, invoke the `project-manager` agent rather than deciding ad hoc.

## Build & test

- `npm run build` — transpiles the `.jsx`/`.js` sources into `build/`
  (esbuild, classic JSX runtime, React as a global UMD — no bundler,
  every file stays a separate `<script>`). `build/` is committed, so
  after editing a source file always rebuild and stage the matching
  `build/*.js` output in the same commit.
- `npm test` — runs `test/run.js` (rebuilds first, then runs the suites).
  Expect three passing counts printed (unit / editor / format suites).
- Deployment to GitHub Pages runs automatically via GitHub Actions on
  push to `main` — no manual deploy step needed.
