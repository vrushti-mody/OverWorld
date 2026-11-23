# Knowledge and project data

Proposed integration direction. This describes the intended direction; it does not claim that a knowledge
loader, search index, cloud store, or synchronization service has been implemented.

The [product and project baseline](BASELINE.md) now scopes separation of the reusable product from
private data and explicit source selection. The loader implements that boundary; purpose/scope review
remains a human/agent workflow. The knowledge proposal does not move or synchronize private stores.

## What exists today

Overworld reads the project graph from YAML sources explicitly selected in an external private config.
The graph holds goals, finish lines, components, tasks, prerequisites, status, steps, and checks. The
builder produces JSON and HTML; browser edits remain local drafts until an agent applies them to the
source maps. See [SCHEMA.md](SCHEMA.md).

Overworld also supplies the [planning guidelines](PLANNING.md) that help people and assistants turn
goals into testable tasks and maintain consistent state. This planning role uses the existing graph;
it does not depend on a new backend, an autonomous planner, or the proposed knowledge connection.

The proposed [onboarding contract](ONBOARDING.md) adds one canonical purpose/scope document and reusable
domain playbook guidance. Private preferences and overrides stay in their source documents; a workspace
index links to accepted plans without copying task state. Neither project documents nor playbooks are
automatically loaded, and their structure does not establish the soundness of a plan.

An existing private knowledge store may hold Markdown notes, daily logs, decisions, and document links.
Inspect its actual format before proposing an adapter. Overworld does not load or search such material.

## Recommendation: connect the experience, keep the stores distinct

Use Overworld as the visual front door to projects and their supporting knowledge. Reuse the existing
private context instead of creating a second personal memory store or merging repository histories.
Opening a project should eventually reveal its goal, work, decisions, evidence, and relevant notes in
one place, with the underlying source visible.

Keep one authoritative location for each fact. Accepted task state belongs in the project graph;
supporting context and decision reasoning belong in their source documents. A daily focus board can
select and link to that work rather than maintain another independently editable copy of its status.
Any migration of existing board state needs an explicit reconciliation, not an automatic overwrite.

## Proposed connection contract

The first integration should be a small local adapter with these concepts:

| Concept | Purpose |
|---|---|
| Project ID | Connect a graph to its context without depending on its display name. |
| Document reference | An opaque document ID plus a resolver-managed location; a note can move without breaking project links. |
| Provenance | Record where a claim came from, who stated or inferred it, and when. |
| Revision | Identify the source version that a decision, status, or check refers to. |
| Evidence reference | Link a verification to its result, command output, artifact, or explicit manual confirmation. |

These are proposed concepts, not implemented schema features. Add the smallest needed
schema extension and migration together when implementing the adapter. The current ancestry `key`
identifies a task for browser edits; it changes if the task moves to a different parent, so a future
durable knowledge link needs either a separate identity or an explicit move/redirect record.

Derived search indexes should be disposable. They help find source material; they must not become
another source of truth. An agent-proposed task should retain its origin and acceptance criteria, and
an inferred status should remain visibly unconfirmed until evidence or the user confirms it.

## Dependencies express a contract

`needs` means a hard prerequisite. A broad association such as “uses this library,” “is related to this
idea,” or “reads some data from this service” is not automatically a requirement that the entire other
component be complete. Future informational links must use a distinct relation and visual treatment;
they must not silently block work or appear as prerequisite arrows.

Prefer the smallest testable contract. For example, an importer may be incomplete because additional
file formats are planned, while its CSV export is already verified. A report that only needs CSV export
should depend on that contract, not on “all importer work finished.” Model the contract as an appropriate
sibling deliverable under the current schema, or add explicit cross-scope references in a deliberate
schema change. Do not put unsupported paths into today's sibling-only `needs` field.

Completion and dependency readiness answer different questions. A component can have a recorded passing
check while an asserted prerequisite remains incomplete. That mismatch needs explanation: the dependency
may be too broad, the source status may be stale, or the check may not prove integration. Keep the recorded
evidence visible and flag the mismatch; do not quietly turn prerequisites green or erase completion history.
When a requirement changes, preserve the earlier result and identify which revised contract needs checking.

## Privacy and storage

Start with the existing local context. The baseline keeps accepted task state in an explicitly selected
private source, in its own repository or a project/area folder within a shared private repository.
A reusable product's real tracking map remains outside
that product. The source allowlist and private generated output also stay outside the application/schema
repository. Local admission and remote publication are separate decisions;
storage changes require applicable authorization. A shared repository can hold rules, decisions, and
an index of canonical project sources without becoming a duplicate knowledge or task database.
Supporting knowledge can remain in separate private sources. Adding Google Drive, S3,
or another backend can come later through the same resolver; choosing a backend is a separate decision.
Do not create a cloud service, upload the knowledge base, or copy its contents into this repository as
part of this plan.

The current product layout keeps personal maps and generated views outside the source tree. Generated
JSON/HTML still embed their selected data and source paths; external output is private, not anonymized.
Earlier Git history and exported copies require a separate review before release. A clean working tree
does not erase historical data, and the loader boundary is not a content scanner.

## Smallest next implementation

After validating a private pilot using [BASELINE.md](BASELINE.md),
connect one project's existing local note by reference, show its source and revision in the project
card, and verify that opening it does not duplicate or upload the note. Then add evidence and decision
references where a real workflow needs them. Keep the current UI as the organizing surface while this
knowledge layer grows from use.
