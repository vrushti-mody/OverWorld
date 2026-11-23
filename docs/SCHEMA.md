# Overworld — schema

One selected map per project, with an optional referenced task ledger. Several maps can share a repository.
Same shape at every depth. Facts only; judgments are derived.
For how to choose the goal, breakdown, prerequisites, and state, follow [PLANNING.md](PLANNING.md).
This is the shared data contract; it is not a formally enforced state-transition engine.

[ONBOARDING.md](ONBOARDING.md) proposes a canonical purpose document, repository types, review stages,
and domain playbooks. Repository types, review stages and playbooks remain prose conventions.
The builder does not read `PROJECT.md`; top-level `work_type: area` recognizes ongoing work, but does
not assess health, track review dates, or schedule review cycles. No new status values are introduced.

## Where maps live

The builder requires `--demo` or `--config /path/to/private/config.json`. No folder scan or implicit
source replacement is performed. Private configuration, inputs, and output must resolve outside the
product directory, including symlinks. Paths inside the config resolve against its parent; a relative
`--config` argument resolves against the current working directory.

```json
{"version": 1, "sources": ["projects/example.yaml"], "output_dir": "build"}
```

The three fields are required; unknown or duplicate fields fail validation. `sources` is an explicit
non-empty list of project or archive YAML files. Duplicate project IDs fail rather than override.
An unselected project referenced by `needs` fails validation. `repo`, when present, supplies commit
recency only; it does not select files or prove ownership. IDs are unique across selected project files,
independent of their containing repository. Demo mode uses fixed fictional examples
and writes ignored `dist/demo/` output. See [BASELINE.md](BASELINE.md).

`repo` expects a Git root and reads its latest whole-repository commit; it does not scope recency to a
project subdirectory. For shared-repository projects, omit it when unrelated commits would obscure
project freshness and use evidence-based `touched` dates. No repository field is required for enrollment.
Project-directory and purpose-document bindings belong in a private index; the loader does not read it.

## Project file

```yaml
id: example-tool               # unique project id; fictional illustration
name: Example tool
domain: systems                # systems | content | career | life | money
mode: campaign                 # campaign | practice | fallow | idea | archive  (max 3 campaigns)
work_type: project             # project | area; optional, defaults to project
weight: 5                      # 1–5 → size on the map
goal: Help a fictional club publish a weekly activity report.
done_when: an approved sample report is generated from the example input.
status: partial                # optional on parents (derived from children if absent)
needs: [example-input]             # optional: cross-project prerequisites (other project ids)
repo: /path/to/private/example-tool   # touched = max(touched, last commit here)
touched: 2026-10-26
due: 2026-12-01
nodes: [ ... ]                 # components / tasks
nodes_file: docs/stages.yaml   # optional instead of nodes: an existing node list that stays the authority
```

**Reusing an existing ledger.** When a project's tasks already live in a YAML list that uses the node shape
below, reference it with `nodes_file` instead of copying it into `nodes`. The path resolves against the
project file and follows the same private-path rule as other sources; in demo mode it must be a fictional
example. The ledger stays the authority: its nodes carry it as their `source`, so browser edits point there.
A project uses `nodes` or `nodes_file`, not both, and one ledger feeds one selected project. If other tools
read the same ledger, check what they parse before adding fields or nested structure to it.

## Ongoing areas

Use `work_type: area` only at a selected root for an ongoing responsibility. Keep its finite cases and
tasks as ordinary child nodes with their own `done_when` and verification. `mode` remains the commitment
level: `practice` alone does not make a root an area.

```yaml
id: example-stewardship
name: Garden Stewardship
work_type: area
domain: life
mode: practice
goal: Keep an imaginary community garden usable across seasons.
review_criteria: Active cases have a next action and owner, and maintenance needs are covered.
nodes:
  - id: spring-planting
    name: Spring planting
    status: done
    done_when: The imaginary spring beds are planted and watered.
```

`review_criteria` is an optional non-empty string, allowed only for area roots. It summarizes accepted
review criteria from the canonical purpose document; it is not an assessment or an automatically checked
rule. Missing criteria remain visibly undefined. Reconcile changes deliberately; there is no document sync.

Area roots cannot declare `done_when` or status `done`/`live`, and cannot be the target of another root's
`needs`: an ongoing responsibility does not permanently complete. Use a finite project contract when a
cross-project prerequisite is required. An area may itself depend on a finite selected project; ordinary
inherited dependency rules still gate its child tasks. Nested `work_type`/`review_criteria` fields fail
validation, including in a referenced ledger.

The renderer identifies an area as ongoing, shows review criteria in place of a finish line, and omits
the root's completion ring and percentage. Its finite children retain their progress. Completing every case
does not verify the area, and an empty area is not a NEXT task. In 3D areas have a neutral height rather than
a completion height. Existing activity/blocker statuses do not establish area health. Health assessments,
review dates, recurring schedules and resets remain future work.

`kind: project`, root/child keys and source bindings stay unchanged. Changing only these area metadata
fields does not move child browser edits. Saved root done/live drafts are held as conflicts for review;
they are not silently applied or deleted.

## Node (component, task, step-bearing task)

```yaml
- id: S2                       # unique among siblings
  name: Validate input         # ≤ 3–4 words reads best on the map
  kind: component              # component | task  (default: component if it has nodes, else task)
  status: partial              # see below
  weight: 3
  needs: [S1]                  # sibling ids only
  done_when: valid sample rows import and invalid rows have readable errors
  check: uv run pytest tests/test_import.py   # command, file path, or "manual"
  checked: 2026-10-25          # last date the check passed
  touched: 2026-10-25
  due: 2026-11-02
  guess: true                  # an agent inferred this status; shown as "?"
  note: sample CSV passes; malformed date handling remains unfinished
  steps:                       # optional ordered checklist on a leaf; drives its ring
    - {name: Check the malformed date fixture, done: false}
  nodes: [ ... ]               # next zoom level, any depth
```

## Statuses

| status | colour | meaning |
|---|---|---|
| `idea` | dotted grey | not committed |
| `planned` | blue-grey | committed, not started |
| `partial` | amber | in progress |
| `done` | green | finish line verified by a passing check or explicit manual validation |
| `live` | teal | done **and** running on a schedule |
| `waiting` | lilac | someone else's move |
| `blocked` | red | broken check or external blocker |
| `drift` | pink, dashed | spec changed after it was built: re-validate |
| `dropped` | dim | kept for history, never deleted |

## Derived (never typed)

| Flag | Rule |
|---|---|
| progress | weighted average of non-dropped child progress; done/live leaves = 1, otherwise checklist ratio when present, otherwise partial/drift = ½ |
| parent status | unless declared: finite parents are done only when all non-dropped children are done/live; otherwise partial when work has progressed, planned when it has not; area roots never derive done/live |
| NEXT | finite leaf · planned/partial · own and inherited prerequisite chains are done/live; area roots are excluded |
| STUCK | planned/idea/partial · some own or inherited prerequisite chain is incomplete |
| Check dependencies | recorded done/live, but an own or inherited prerequisite chain is incomplete; keep the recorded status and show the mismatch |
| stale | partial/live · untouched > 14 days |
| overdue | `due` passed · not done |
| ◎ no finish line | finite project (not archive) without `done_when`; ongoing areas show review criteria instead |

Recorded `blocked` and `waiting` are distinct from derived STUCK. The Stuck rail currently lists unmet
prerequisites, not every explicit `blocked` node. Put blocker/waiting reasons and resume conditions in
`note`; see [lifecycle guidance](PLANNING.md#lifecycle-guidance).

## Identity and browser edits

An `id` is unique among siblings. Different components can both contain a task called `check`.
The build adds two fields to its output; do not write either into YAML:

| Built field | Purpose |
|---|---|
| `key` | Stable ancestry, such as `/example-tool/import/validate`; global selection and browser edits use this instead of a bare `id`. |
| `source` | The file to update: an absolute private source path (for `nodes_file` projects, the referenced ledger), or a product-relative fictional example path. |

Each key segment escapes `~` as `~0` and `/` as `~1`. Keys stay the same when siblings are reordered
or the project's domain changes. Changing an ID or moving a node to another parent changes its key;
old browser edits must not silently transfer to the new node. The world uses an empty key. Archive entries
use `/@archive/<escaped name>`, so reordering the shelf does not transfer an edit to another entry.
The project ID `@archive` is reserved to keep those keys distinct from real project/task keys.

`needs` continues to use sibling IDs, never these generated keys. Cross-project prerequisites belong
on the project, where other projects are its siblings. Dependencies must be acyclic.

Browser changes are proposals until applied to the indicated source file and rebuilt. A checked step
records checklist progress; a `done` status asserts that the finish line/check was verified. Completing
every step can fill the progress ring without declaring the task or its parent verified. Prerequisites
on an enclosing component or project also gate its unfinished tasks, so a task cannot be NEXT while
the component containing it is still waiting on another component.

Readiness follows the prerequisite chain, not only the immediate node's colour. A node recorded as
done with an incomplete prerequisite gets a visible mismatch warning and does not unlock downstream
work until the prerequisite is satisfied or the source dependency is corrected. The UI does not infer
that its implementation is broken and does not silently rewrite its status.

Use `needs` only for a hard prerequisite to the declared finish line. If a task consumes one completed
capability from a larger unfinished component, model that smaller contract at a valid dependency scope.
General relationships or data flow should not be represented as completion gates. Separate informational
relations and evidence references are a proposed next schema step; see `KNOWLEDGE.md`.

## Validation

Add `--check` to `uv run build.py --demo` or `uv run build.py --config PATH` to validate without writing.
Without `--check`, the same selected mode validates and builds.
The script pins PyYAML; `python3 build.py --demo` or `python3 build.py --config PATH` also works when
PyYAML is already installed.

Validation fails on unknown status/mode/domain, missing or empty IDs/names, duplicate sibling or project
IDs, malformed node lists, a `nodes_file` that is missing, not a YAML list, combined with `nodes`, or
shared by two projects, non-sibling prerequisites, dependency cycles, non-numeric/non-positive weights or
weights above 5, malformed dates, invalid checklists, and multiple selected sources claiming the same project.
Dates must use `YYYY-MM-DD`; checklist `done` values must be booleans, not quoted strings.
Invalid `work_type`, nested area metadata, empty/non-string `review_criteria`, criteria on finite projects,
area-level `done_when` or done/live status, and hard prerequisites targeting an area also fail validation.
Missing finish lines remain visible on the map; the build does not invent them or reject the project.
Validation does not enforce allowed transitions, require verification evidence, run checks, or judge the
quality of a plan. The browser allows supported statuses except done/live on area roots; verification
of finite work is a human/agent responsibility.

Run the build regression checks with:

```bash
uv run --with PyYAML==6.0.2 python -m unittest discover -s tests -v
```
