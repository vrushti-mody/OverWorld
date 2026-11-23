# Product and project baseline

Local-first product and data boundary. Explicit source selection and external private output are
implemented. Purpose-first admission, storage ownership review, and a separate legacy review UI
remain workflow guidance or proposals. Storage changes require applicable authorization.

## Product code and private project data

Overworld is a reusable product: its source repository should contain the renderer, builder, generic
schema, planning guidance, maintenance rules, tests, and clearly fictional examples. A person's projects,
notes, progress, and personal information must remain outside that product repository. This is a hard
write boundary: flag misplaced personal sources privately and propose an authorized migration, rather
than adding/updating their facts or rebuilding private payloads here.
Do not silently delete/migrate data or rewrite history; clean current files alone do not prove release readiness.

| Material | Intended home |
|---|---|
| Application code, shared schema/rules, fictional examples | Overworld product repository |
| Accepted purpose, scope, goals, and working principles | One canonical document for each project or area, including when several share a repository; see [ONBOARDING.md](ONBOARDING.md) |
| Accepted task state for a deliverable, ongoing area, or grouped tasks | That body's explicitly selected private map or referenced ledger; product tracking stays outside reusable product source |
| Project notes and supporting documents | The project's private workspace or private sources referenced from it; enrollment does not require tracking or uploading every document |
| Optional cross-project registry/index | Private configuration outside the product repo, referring to project locations and authoritative sources rather than duplicating task state |
| Dashboard builds, caches, and exports containing real project data | Private output outside the product repo; shared product demos use fictional data |

The implemented config is a source allowlist, not a new repository or second task database. Search/index data should be rebuildable from authoritative sources. Broader knowledge may stay
in its existing private store; the [knowledge connection](KNOWLEDGE.md) remains unimplemented.

## Workspace, repository, project, and area

These boundaries serve different purposes; they need not be one-to-one:

| Concept | Responsibility |
|---|---|
| Workspace folder | Local organization of repositories and other sources; it need not itself be a repository. |
| Repository | A versioned storage, access, and publication boundary with a stated purpose and inclusion policy. |
| Project | A coherent goal, canonical purpose document, authoritative tasks, and evidence; its home may be a subdirectory or a separate repository. |
| Ongoing area | A continuing responsibility with review criteria; it can contain finite cases, projects, or small tasks. |

A private monorepo may hold several projects, ongoing areas, shared instructions, decisions, and an
index. Each project still has its own purpose and task authority. Keep the root index as references,
not another status database. Plans and document references are useful without software to build.
Git history and repository access cover the repository as a whole; project subfolders are not separate
permission boundaries. A sensitive area's originals may need separate storage even when its plans fit
in a shared private repository.

Choose a separate repository when independent sharing, access, release, or lifecycle needs justify it;
an independent tool does not automatically require one. A reusable product must remain separate from
its user's private data. A repository can later be split or consolidated through an authorized migration
that preserves provenance and identity. Nesting unrelated Git repositories is not required for a monorepo.

Use the [onboarding contract](ONBOARDING.md) for both repository purpose and each project's boundaries,
then the [planning guide](PLANNING.md) for testable work. An idea or folder name alone does not establish
active commitment or dashboard enrollment. Sector/area grouping is a planning choice, not an implemented
tag system.

Domain playbooks are a proposed reusable layer of questions, principles, sources, evaluations, and
limits. Personal preferences and overrides stay private. They do not imply a running domain engine,
autonomous experts, or enforced onboarding; see [playbook guidance](ONBOARDING.md#domain-playbooks-a-proposed-reusable-layer).

## Configurable idea capture

A person may explicitly authorize lightweight local idea capture, either for one idea or through
a standing policy. First check whether the idea fits an existing project or area; if so, preserve the memory
there. Otherwise use the configured home, such as a new project folder in a private monorepo or a separate
repository when justified and authorized. Provisional purpose, known constraints, provenance, and open
questions suffice without an accepted charter, finish line, or task graph.
It may remain dormant or `idea`. Preserve proposals as proposals; do not invent progress or create scaffolding.

This is a configurable collaboration policy, not permission for every user's passing thought to create
a repository or an implemented capture engine. Idea capture, active-work acceptance, dashboard enrollment,
moving existing files, and publishing a remote are distinct decisions. Creation authorization does not
authorize bulk enrollment or account/history migration.

## Explicit enrollment and authority

Local admission and remote publication are separate decisions. Use a configurable managed workspace
root or a private allowlist to identify deliberately admitted projects and sources. Do not hardcode an account,
username, or personal directory into the product. Merely finding a repository under a folder does not
establish its purpose or authorize enrollment.

For accepting active work and defining its authoritative scope, the proposed process is:

1. Discuss the project's purpose: why it exists, what belongs in it, what does not, its observable
   finish line or ongoing review criteria, and its privacy needs. Confirm that its storage fits the
   containing repository's purpose, access, and publishing policy. Use one canonical project
   document as described in [ONBOARDING.md](ONBOARDING.md). Proposed answers remain proposals until accepted;
   leave unclear scope in review rather than treating a suggested plan as a fact. An authorized idea
   capture may already exist while these questions remain open.
2. The person explicitly admits the project and separately decides any storage change. Review the
   intended scope; no automatic active/dashboard enrollment from conversations, folder scans, or an
   existing remote account. Several selected projects may share one repository.
3. Record each project's stable ID, project directory, canonical purpose document, task source, and
   containing repository when applicable in the private index. A display name, chat mention, or generated
   ancestry `key` is not that binding. Repository name and project ID need not match.
   Resolve duplicate IDs or competing map sources explicitly; do not silently replace accepted state.
4. Keep accepted task state in one private source using the shared schema, normally that project's
   `map.yaml` or its referenced ledger. Tracking a reusable/public product is an exception: keep its real working
   map privately outside its source. Overworld reads the explicitly selected source.
   Browser edits remain proposals until reconciled into the project's authoritative map.
5. Select source paths and output in the external config described below. The loader rejects duplicate
   project IDs across all selected sources, including within one repository, but does not
   authenticate repository ownership or enforce the purpose-review workflow.

An explicitly admitted local project can qualify without Git or immediate remote publication. Moving
into the managed workspace does not by itself authorize creating a remote, pushing data, or transferring
account history. Publication covers the containing repository, so review all included projects and shared
files before publishing it; the local workflow must not require credentials.

## Legacy review is separate

Existing repositories remain in place as legacy/to-review, outside the managed set until admitted.
The intended interface has a separate review section/group so projects can be considered one at a time;
that section is not implemented yet. Do not auto-enroll every existing local Git repository or interpret
the review group as an archive/drop decision. Preserve existing maps and facts while planning this change.

## What exists today

`uv run build.py --config /path/to/private/config.json` reads only the declared `sources` and writes
`overworld.html` and `overworld.json` to `output_dir`. Relative paths resolve against the config directory.

```json
{"version": 1, "sources": ["projects/example.yaml"], "output_dir": "build"}
```

Config, source paths, and output paths must resolve outside the product, including symlinks. There is no
home-folder default, folder discovery, bundled override, or implicit archive selection. Duplicate project
IDs and missing selected prerequisites are rejected. `repo` supplies commit recency only; selection does
not require a Git repository or prove repository identity. A project file may take its nodes from an existing
node-shaped ledger through `nodes_file`; that ledger remains their authority and must also resolve outside the
product. `--check` validates without output writes.

Multiple project files within one external repository already work: list each selected map in `sources`.
No new map fields are needed. `repo` reads the latest whole-repository commit, not commits scoped to a
project subdirectory. Omit it for shared-repository projects when that would make unrelated work look
fresh; maintain evidence-based `touched` dates instead. Repository activity never proves task completion.

`--demo` uses fixed fictional sources in `examples/` and writes ignored `dist/demo/` output. Product source
contains no configured personal portfolio. Output HTML/JSON embed the selected maps and source paths, so
private output must stay private. The renderer still uses externally hosted D3/fonts; local hosting does
not make it fully offline. Source separation does not inspect the content of every file for sensitive data.

Historical Git objects, remote copies, and old exports are separate from current source hygiene. Never
claim public release readiness from this layout alone. A review view for unselected legacy maps is not
implemented; retained private maps remain outside the selected source list.

## Next integration

After an authorized one-project pilot, consider a read-only knowledge reference and the missing ongoing-area
health model. Additional projects require their own review and explicit selection. Hosting is optional;
a successful local build does not publish anything. A source-only release may be prepared separately after
reviewing history and artifacts; this document does not authorize moves, history rewrites, or publication.

Ordinary scope reduction keeps `dropped` history. An explicit request to stop tracking an entry instead
removes its source entry from the explicit config; it must not reappear as a visible archive entry. Check
selected dependents, then rebuild. Preserve the private authoritative YAML unless its removal or movement
is separately authorized and backed up. Removing dashboard tracking does not authorize deleting the
underlying project code or private knowledge sources.
