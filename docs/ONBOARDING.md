# Onboarding projects and repositories

Proposed design guidance for people and assistants. Overworld is a reusable progress visualization
tool with a shared planning contract: start from what matters, then make the work and its evidence
visible. An organized graph can expose gaps; it cannot guarantee a correct plan or sound assumptions.

Use this guide before [planning tasks](PLANNING.md) and follow the [repository baseline](BASELINE.md)
for admission. These questions are not enforced by the current loader or an autonomous onboarding agent.

## Repository purpose and project purpose

First identify the storage boundary. A repository's README or equivalent should explain why that
repository exists, which projects/areas belong, what stays out, and its access/publication policy.
A private monorepo can contain several distinct projects and ongoing areas. A shared instructions file
can govern them, while a root index links each project directory, purpose document, and task authority.
The index does not duplicate their tasks. Separate repositories are useful when sharing, access, release,
or lifecycle requirements warrant them; project identity does not depend on a repository name.

## One canonical document per project or area

Recommend one `PROJECT.md`, or an existing equivalent, as the canonical home for purpose, north star,
working philosophy, scope, and accepted decisions. Link to deeper reference material instead of requiring
separate overlapping north-star, philosophy, and project briefs. The filename is a recommendation, not
a loader requirement. Do not create or replace a project's document without reviewing what it already uses.

| Question | What to record in that document |
|---|---|
| Purpose and beneficiary | Who benefits, what matters to them, and why this body of work should exist. |
| Scope and non-goals | What belongs to this project or area, what does not, and where related work is owned. |
| Type of work | Finite deliverable, ongoing area, or deliberately grouped small tasks. Selected roots use `work_type: project` (default) or `area`; `mode` remains separate commitment metadata. |
| Important goals and success | Priorities and observable completion criteria for finite work; health/review criteria and a review cadence for an ongoing area. |
| Constraints and privacy | Time/resources, permissions, sensitive material, storage boundaries, and the separate decision about publication. |
| Assumptions and unknowns | What is supported by evidence, what is inferred, and what still needs an answer or investigation. |
| Domain guidance | Links to authoritative sources and any reviewed playbook; note source/revision, applicability, and unresolved conflicts. |
| First useful milestone | A small valuable or uncertainty-reducing result, its evaluation, and whether the person has accepted it. |
| Work and evidence | A link to the authoritative task map and the location of evaluation results or explicit manual confirmations. |

For a monorepo, put the canonical document in the relevant project or area directory, or link its existing
equivalent. Repository-wide rules may be inherited; project-specific purpose and evidence must remain
clear. When one repository owns one project, its existing README or purpose document can cover both
responsibilities without adding another brief. Keep reusable product instructions generic and real
project tracking outside that product, even when the product itself is tracked.

Keep one authority for each fact. The project document owns intent and reasoning; `map.yaml` remains
the accepted task-state source under the current schema. Link tasks and checklists rather than keeping
a second status board in the project document or workspace index. Keep evidence in its appropriate
source and reference it; do not copy sensitive evidence into a public brief.

Today's map also carries display summaries such as `goal`, `done_when`, and an area's `review_criteria`. When accepted intent changes,
deliberately reconcile those summaries and affected task contracts. There is no `PROJECT.md` reader or
automatic synchronization. Existing repositories with another task authority need explicit reconciliation
before adopting this convention, not an additional competing task store. If that authority is already a YAML
list in the node shape, the project file can reference it with `nodes_file` instead of copying it.

## Draft, review, and acceptance

Keep decisions legible in prose: **user-stated direction**, **assistant proposal**, **open question**,
and **accepted decision**, with source/date where useful. A stated intention is not acceptance of an
assistant's invented finish line or breakdown.

| Documentary stage | What it means |
|---|---|
| Draft | Known intent and unknowns are recorded in an appropriate project folder or authorized repository; proposed answers remain visibly proposed. |
| Review | The person and assistant examine scope, assumptions, evidence, privacy, and the first milestone. |
| Accepted for active work | The person explicitly accepts a bounded purpose/scope and initial work; unresolved details remain visible. |

These are review labels, not values for `status`, `mode`, or `kind`. Onboarding readiness is separate
from task readiness: accepting a purpose does not complete tasks or satisfy their dependencies. A task
can be documented in a draft without enrolling its project. Moving files and publishing remain
separate decisions. If scope is too uncertain, review a bounded investigation instead of fabricating answers.

An explicit request or [configured idea-capture policy](BASELINE.md#configurable-idea-capture) can authorize
a lightweight local draft after checking existing-project/area fit and the configured storage policy.
Provisional purpose, constraints, provenance, and open questions suffice for capture; a complete charter
or accepted milestone is not required.
Capture itself does not accept active work or select the project for the dashboard.

## An ongoing area can contain finite cases

An ongoing area may have its own repository or a directory in a shared repository, and contain several
finite cases, projects, or review cycles. Each case can have its own finish line; completing it does not
finish the area forever.
Small unrelated actions may share a deliberately chosen task source, with area/sector grouping if useful.
That grouping is an option to review, not a reason to create a new repository for every task.

For an ongoing area, record observable review criteria in the canonical document and select the map with
`work_type: area`. An optional non-empty `review_criteria` string carries the display summary. Put finite
milestones/cases below it with their own `done_when`. Do not invent permanent completion just to remove
a warning. Area roots show review criteria instead of finish-line warnings, completion rings or percentages;
they do not derive done/live when their children finish. Their neutral 3D height has no completion meaning.
An area cannot declare `done_when`, done/live status, or serve as a hard completion prerequisite. A finite
selected project can expose a bounded cross-project contract instead. Child identity and task semantics
stay unchanged. `mode: practice` remains a commitment choice and does not itself identify an area.

Area recognition does not evaluate health, track review dates, schedule recurring reviews, or reset work.
Record accepted cadence in prose when useful; no scheduler is implied by the criteria or the area marker.

## Domain playbooks: a proposed reusable layer

A domain playbook documents the guidance an expert would ask someone to consider. If described as a
domain's “soul,” it means written principles and limits, not a running expert or agent. Use the same
onboarding contract across domains and adapt evaluation to the work:

| Playbook part | Content to establish and review |
|---|---|
| Questions and principles | Domain-specific questions, tradeoffs, working practices, and when they apply. |
| Sources | Authoritative references, provenance/revision, and when freshness must be checked. |
| Evaluations | Observable success, suitable tests or manual review, required evidence, and who can judge it. |
| Limits | What the playbook cannot establish, uncertainties, and decisions requiring the person's judgment. |

An improvement-oriented software playbook might discuss how proposed changes are evaluated; its actual
principles must come from a located, reviewed source, not an assistant's reconstruction. Other domains
may require different evidence and review. A file of principles does not run evaluations or grant autonomy.

Reusable playbook structure and fictional examples belong in the product; a person's preferences,
overrides, and private source material stay in their project/workspace documentation. Playbook selection,
loading, expert orchestration, and enforcement are not implemented.

## Fictional illustration

An imagined community garden could be an ongoing area: its purpose is to keep shared beds usable,
and a proposed monthly review checks whether watering and maintenance needs are covered. A spring
planting case has a finite finish line and its own tasks. Finishing that case does not end stewardship.
These are illustrative criteria, not accepted requirements or a project to enroll.

## Current implementation boundary

The [schema validator](SCHEMA.md#validation) checks map structure and supported values. It does not
read this contract, enforce admission, validate domain judgments, or prove that evidence is sufficient.
Top-level `work_type` and `review_criteria` have the limited display and validation semantics described
above. Repository types, sector tags, review stages/cadences, and playbook references remain documentary
concepts. No new task statuses, health assessment, integrations, or automatic planning are implemented.
