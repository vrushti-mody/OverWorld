# CLAUDE.md — rules for agents maintaining Overworld

These rules apply to Codex, Claude, Gemini, and other agents working in this repository.

For maintaining a user's work across sessions or repositories, follow [the work and handoff guide](docs/WORKFLOW.md)
and the owning workspace's instructions.

Read `docs/PHILOSOPHY.md` once, `docs/SCHEMA.md` before editing a map.
Use [docs/ONBOARDING.md](docs/ONBOARDING.md) for a canonical purpose/scope document; keep draft/review
labels in prose, separate from task statuses. Locate and review domain guidance rather than inventing it.
Follow [docs/PLANNING.md](docs/PLANNING.md) when helping a person define goals, divide work, or revise a plan.
Its lifecycle is planning guidance; the current implementation does not enforce state transitions.
Read [docs/BASELINE.md](docs/BASELINE.md) before adding projects or changing discovery/storage. Repository
creation needs an explicit request or a user-configured idea-capture policy, not this architecture alone.
Check fit with an existing project or area first. Use its configured storage policy; several projects may
share one private repository, each with its own purpose and task authority. Authorized idea capture can
preserve provisional context
before active-work acceptance; it does not imply dashboard enrollment, implementation, or publication.

## The job
Keep explicitly selected source maps true. Real maps and generated views stay outside this product;
only fictional examples belong here. The page is derived; never hand-edit generated output.

Product-only boundary: real personal/project data belongs outside
this reusable product. Do not add/update misplaced personal maps or regenerate their payloads here.
Record the conflict privately and propose the smallest safe migration while continuing generic work;
do not silently move/delete data or rewrite history. Current files alone do not prove release readiness.

## Rules
1. **Goals first.** Establish purpose and observable success before tasks. Finite work gets `goal` +
   `done_when`; if the finish line is unaccepted or unknown, leave it absent (the map shows ◎) and ask
   for clarification. An ongoing root uses `work_type: area`, with review criteria in its canonical
   document and optional `review_criteria` display summary. Its finite cases/tasks have their own finish
   lines. Area roots have no completion ring/height and cannot declare `done_when`, done/live status,
   or serve as a hard completion prerequisite. Do not infer health or scheduled reviews from this display.
2. **Facts, not judgments.** Never type NEXT/STUCK/stale/progress. Write status, needs, dates, checks.
3. **Testable leaves.** Every task should have `done_when`; add `check` when a command can prove it.
   `done` means the finish line was verified, by a passing check or an explicit manual validation.
   `live` = done and scheduled. A checked step list alone is not verification. The page's **Mark verified**
   records a manual assertion; it does not run the `check` command or prove an automated test passed.
4. **Mark guesses.** A status you inferred (from git log, files, memory) gets `guess: true`.
5. **Retain history by default.** Drop a node with `status: dropped`. An explicit user request to remove
   tracking takes precedence: preserve the private source, check selected dependents, remove its entry
   from the external config, and rebuild; do not put it on the visible archive shelf. Removing or moving
   the authoritative source itself needs separate authorization and a verified private backup.
   This does not authorize deleting underlying code or private knowledge. Requirement change → edit `goal`/`done_when`,
   set affected built nodes to `drift`, including the changed node, built descendants, and built downstream
   dependents. Keep unfinished work unfinished. Do not fabricate a new requirement merely because the
   page's **Spec changed** action was used.
6. **needs = siblings only.** Cross-project prerequisites go on the project.
   `needs` means a hard prerequisite to the finish line, not just related work or data flow. If built work
   depends on an unfinished aggregate, check whether the map needs a smaller completed contract.
   Preserve recorded status and surface the inconsistency until evidence resolves it; do not invent a fix.
7. **Commitment limits.** The current UI warns above three campaigns. This is a fixed display rule,
   not a discovered personal preference. Do not silently demote projects to satisfy it.
8. **Labels short.** 2–4 words on `name`; sentences go in `done_when` / `note`.
9. Dates ISO (`2026-10-26`). Keep `touched` current when work happens.
10. **Storage is not identity.** Keep stable project IDs and explicit source selection regardless of
    repository layout. A root index links canonical project sources; it is not a second task board.
    Shared-repository access/history applies to all included projects. `repo` reports whole-repository
    activity; omit it if that would falsely refresh unrelated projects, and use supported `touched` facts.

## "Copy for agent" pastes

The page exports local draft changes for any agent to apply. Resolve each node by its project and full
ancestry path; bare node IDs are only unique among siblings. Apply each change to the file named by that
node's `source`: the project file, or the ledger referenced by `nodes_file`. Compare the exported starting value with
the current YAML before applying a change. A rebuilt page warns when a saved draft's baseline no longer
matches; resolve that conflict rather than blindly overwriting newer facts.

Apply accepted changes to the source map, then validate and build. A status assertion from the user can
be recorded as such; do not add a `checked` date or claim a command passed without that evidence.
There is no automatic browser-to-YAML write or synchronization.

## After any change
```bash
uv run build.py --demo --check
uv run build.py --demo
```
For an authorized private refresh, use `--config /path/to/private/config.json` instead of `--demo`.
Plain `python3` also works when PyYAML is installed. When changing the builder, run
`uv run --with PyYAML==6.0.2 python -m unittest discover -s tests -v`.
When changing renderer state or derived rules, run `node --test tests/test_renderer.cjs`.
Report validation and the files changed. Commit with a description of the actual change when committing
is part of the current task (for example, `maps: <what changed>` for map edits).

If publication is requested and the existing Overworld URL and editing access are available, update that
same destination. Do not replace it with a new host or URL. If access is unavailable, deliver the working
local build and say that the hosted copy has not been updated.

## UI changes
`web/template.html` is a single file: CSS tokens at the top (light + dark), then d3 renderer.
Keep the encoding rules in PHILOSOPHY §5 — one variable per channel, violet reserved for "act here".
Test 2D, 3D, a project DAG and a card. Check drill-down and Back camera restoration, task focus,
**− / + / Fit**, prerequisite/unlock navigation, and the project rail / **All projects** toggle.
Status and step edits must preserve the current camera. Test explicit verification, Spec changed,
local edit export, and rebuild conflicts before publishing.

## v4 handoff

The interaction combines a portfolio map with smooth navigation inside one project and direct
status editing. Preserve source facts and the goals-first rules. Keep browser
changes visibly local, and verification distinct from checklist activity. Avoid an additional parallel
schema or a second authoritative task store.
