# Planning a project in Overworld

Overworld provides a shared planning contract for people and assistants: divide a goal into useful,
testable work, visualize the relationships, and record state consistently. Use this guide to plan;
use [SCHEMA.md](SCHEMA.md) to write the map and [CLAUDE.md](../CLAUDE.md) to maintain it.

Start with [ONBOARDING.md](ONBOARDING.md) to establish one canonical purpose/scope document. An ongoing
area can contain multiple finite cases; a shared small-task source is an option, not a repository per task.
Keep its review criteria in that document and give finite cases/tasks observable finish lines. Select
an ongoing root with `work_type: area` and optionally summarize its criteria in `review_criteria`.
The UI shows it as ongoing without permanent completion; health assessment and review scheduling remain
future work. Link the map for task state instead of duplicating it.
The same contract applies whether a project lives in its own repository or a shared repository's subfolder.
Plan around accepted outcomes and evidence, not repository count; keep shared rules in one place and
project-specific purpose/tasks in their owning sources.

The [repository baseline](BASELINE.md) governs which projects are enrolled and where their
accepted state belongs. Planning a possibility alone does not enroll it or authorize repository creation;
an explicit request or configured idea-capture policy can permit a local draft after checking existing fit.
Capturing that context does not accept a finish line, milestones, or active work.

The current system is a YAML project schema with derived views. The lifecycle below is guidance,
not an enforced state machine or an autonomous planner. A map can expose missing finish lines and
dependency conflicts; it cannot establish that assumptions are sound or that a plan will work.

## The shared project contract

| Part | Question to settle | Existing representation |
|---|---|---|
| Goal | Why is this worth doing? | Project `goal`, reconciled with the canonical purpose document |
| Finish line | What observable outcome completes this finite work? | `done_when` on finite projects, cases and tasks |
| Ongoing area | What should be reviewed while this responsibility continues? | Top-level `work_type: area`; optional `review_criteria` summary reconciled with the canonical purpose document |
| Deliverable components | What capabilities or outputs must exist? | Nested `nodes`, each with a finish line |
| Testable tasks | What small result can be validated on its own? | Leaf nodes with `done_when`; `check` when useful |
| Optional steps | What actions help complete one task? | Ordered `steps` checklist on that leaf |
| Hard prerequisites | What must already be true to satisfy this finish line? | `needs` containing sibling IDs |
| State and verification | What is true now, and what was actually checked? | `status`, `check`, `checked`, `note`, `touched`; `guess: true` for inferred status |

Keep three questions separate: **hierarchy** says what belongs inside what; **dependency** says what
must be ready first; **state** says where work stands. YAML `nodes` become `children` in the built
graph. Steps stay checklists in the task card: give work its own task if it needs separate status,
verification, or prerequisites. A full checklist is not proof of completion.

## Plan together, then revise from evidence

1. **Agree on the outcome.** The person supplies intent and constraints; the assistant helps make
   them observable. For ongoing work, agree on review criteria and a bounded first milestone rather
   than declaring the whole area permanently complete. Propose a finish line for review when it is
   unclear. Leave an unaccepted finish
   line absent and record the open question in `note`; do not turn an example or suggestion into a fact.
2. **Work backward.** Ask what must exist for that finish line to be true. Group those deliverables
   into components, then split them into tasks with a result another person could check. Avoid vague
   leaves such as “build backend.” Split work when it has independently testable outcomes or different
   prerequisites; keep mere execution instructions as steps.
3. **Choose a small useful milestone.** Pick the smallest end-to-end result that provides value or
   tests the main uncertainty. Keep later scope coarse until evidence justifies detail. “Milestone” is
   a planning choice here, not a new field or node kind; describe it in `note` or model it as a component
   when it is a real deliverable.
4. **Surface unknowns.** Write assumptions and unanswered questions in `note`. Where needed, propose
   a small investigation task whose finish line is an observed result or a documented decision.
   Unknown choices stay unknown; inferred statuses get `guess: true`. The assistant should make
   alternatives and tradeoffs visible, and the person resolves choices that change intended scope.
5. **Connect only genuine prerequisites.** For each arrow, ask “could this finish line be satisfied
   without that result?” If yes, it is probably context or data flow, not `needs`. Keep dependencies
   acyclic and sibling-only; cross-project prerequisites belong on projects. Use the smallest required
   capability, not a whole unfinished component when only one part is needed. Restructure the scope
   to expose that deliverable as a sibling; do not invent cross-scope reference syntax.
6. **Do, verify, and reconcile.** Inspect the map for gaps, work on a ready task, and check its finish
   line. Update accepted facts and explain surprises in `note`. Revisit scope and dependencies when
   evidence contradicts the plan. The person or assistant applies accepted browser drafts to the source
   YAML, resolves conflicts, then validates and rebuilds. [Knowledge integration](KNOWLEDGE.md) remains
   proposed; broader private notes are not automatically loaded or synchronized.

## Lifecycle guidance

A typical finite-work path is `idea → planned → partial → done`, with `done → live` only for verified
work running on a schedule. Area roots cannot declare done/live or `done_when`, or serve as completion
prerequisites; their finite children retain ordinary verification. Use the status that describes the
evidence; these arrows are not enforced transitions.

| Supported status | When to use it / what enables the next move |
|---|---|
| `idea` | Uncommitted possibility. Move to `planned` when its scope is accepted. |
| `planned` | Committed, not started. Start useful work and record `partial`. |
| `partial` | In progress. Verify the declared finish line before recording `done`. |
| `done` | Finish line verified by a passing check or explicit manual validation. Record what was checked. |
| `live` | Verified and running on a schedule. Describe the operation in `note`; scheduling is not managed here. |
| `waiting` | Someone else's move. In `note`, name who/what is awaited and what response enables progress. Resume the appropriate state when it arrives. |
| `blocked` | Broken check or external obstacle. Put the reason and unblock condition in `note`; resolve it and recheck before claiming completion. |
| `drift` | Previously built work needs checking against changed requirements. Revalidate to return to `done`/`live`, or use `partial` while revising it. |
| `dropped` | Work deliberately removed from scope. Keep the node and reason for history; review dependents, since dropped work does not satisfy a prerequisite. |

**STUCK is a derived flag, not a status.** Planned, idea, or in-progress work is STUCK when a direct or
inherited component/project prerequisite is not ready. NEXT applies to planned/in-progress finite leaves
whose entire prerequisite chain is done/live; area roots are excluded. Do not set `blocked` merely to
repeat an unmet `needs` link.
An explicit `blocked` status is shown on the map/card but is not automatically included in today's
Stuck rail; that rail lists derived prerequisite problems. Waiting is also explicitly recorded, not
inferred from dependency arrows. Put reasons in `note`; there are no separate blocker or resume fields.

**Verification is a deliberate act.** `check` can describe a command, a file path, or manual validation;
`checked` records the last date a check passed. Only record that date with evidence. The browser's
**Mark verified** sets a local `done` assertion; it neither runs checks nor writes `checked` or `touched`.
Checklist clicks can move planned work to `partial`, or reopen done/live work as `partial` when a step
is unchecked; checking every step never sets `done`. Keep `touched` current in the source when work happens.

If a finite parent has no explicit status, the view rolls it up from its non-dropped children. All children
done/live yields done; this is not an additional integration check. Area roots never derive done/live
from their finished cases or acquire a health assessment from child progress. Give a finite component
its own observable finish line and verify the combined outcome. An explicit parent status takes precedence over the rollup.
Recorded done/live with an incomplete prerequisite chain gets **Check dependencies** and cannot unlock
downstream work. Preserve the evidence while checking whether scope, status, or verification is wrong.

**Requirement changes reopen the contract.** Edit the accepted `goal`/`done_when` in YAML and explain
the change. **Spec changed** marks affected done/live work `drift`: the selected node, built descendants,
built downstream dependents, and affected built ancestors and their dependents. Unfinished work keeps its
state. The button does not edit requirements or detect changes automatically. Recheck against the revised
finish line, retain earlier context in notes/history, and drop obsolete work rather than deleting it.

## Fictional example: a tiny reading list

This is an illustration only, not an accepted project or a source to enroll.

**Goal:** remember books to read. **Finish line:** add a title, reload, and see it in a saved list.
The first useful milestone is this single-title round trip; search and sharing can wait.

| Sibling task | Observable finish line | `needs` | Illustrative state |
|---|---|---|---|
| Save title (`save`) | A submitted title survives closing and reopening storage. | `[]` | `done`, manually verified |
| Show list (`show`) | The saved title appears after reloading the page. | `[save]` | `partial` |

“Open page, submit title, reload, compare” can be steps of the second task. It becomes done only after
the observed result satisfies its finish line. If the requirement changes to multiple reading lists,
review both contracts and mark affected built work `drift`; do not assume the earlier check proves it.

## What the system enforces today

The builder checks map structure, supported status values, IDs, dependency scope/cycles, dates, weights,
and checklist shape; see [validation details](SCHEMA.md#validation). The view derives readiness,
progress, and dependency mismatches. Browser status controls allow supported statuses except done/live
on area roots, without a transition or evidence gate. Missing finish lines are allowed; absent finite
project finish lines are flagged. Ongoing roots display review criteria instead and prompt when they
are missing.

Sound decomposition, acceptance of requirements, and honest verification are human/assistant
responsibilities. Stricter transition enforcement or evidence requirements would need a deliberate
implementation change. This guide adds no fields, backend, automated planning, or knowledge sync.
