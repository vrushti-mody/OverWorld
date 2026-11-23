# Overworld — product purpose

Overworld helps people with many simultaneous projects understand what exists, what is moving, what is
blocked, and what can happen next through a zoomable visual map with little required reading.

## Direction and scope

The established direction is a reusable local-first product with a shared planning contract. Goals come
before tasks. Break finite work into incremental, testable parts; keep hierarchy, hard prerequisites, and
state distinct. Preserve the world view, semantic zoom, smooth navigation, status colors, dependency
lineage, and scoped action rail. Review the entire experience as the model evolves.

This repository owns the renderer, builder, generic schema, planning guidance, skills, tests, and fictional
examples. Real project plans, knowledge, preferences, feedback, and generated dashboards belong in private
sources outside this product. The application may organize software, documents, ongoing responsibilities,
and ideas; it does not require every item to become a separate repository. Workspace organization,
repository storage/access, and project identity are distinct: several projects may share a private
repository while retaining their own purpose, task authority, and evidence.

## Working principles

- Show structure and state visually before asking someone to read.
- Record supported facts, expose uncertainty, and keep verification separate from activity.
- Select sources explicitly and preserve one authority for each fact.
- Let people and assistants reconcile plans with evidence; do not imply autonomous truth or synchronization.
- Preserve private data before an authorized migration; current files do not establish clean history.

## Present capabilities and limits

The builder accepts explicitly selected external YAML sources and writes private output outside the
product; a separate fictional demo supports product development. The UI supports project/component
navigation, task cards, dependencies, and browser-local status/checklist drafts. The replan skill is an
on-demand workflow, not a scheduler.

Top-level ongoing areas have review criteria in place of permanent completion. Their finite cases keep
ordinary progress and verification, while area roots have no completion ring or completion height.
An area does not become verified when its cases finish and cannot be a hard completion prerequisite.

Knowledge references/search, ongoing-area health, domain playbook loading, automatic evidence execution,
and browser-to-source sync remain future work. Hosting is optional. No single permanent product finish
line or release criterion is established here; bounded milestones require their own evidence.

See [PHILOSOPHY.md](docs/PHILOSOPHY.md), [SCHEMA.md](docs/SCHEMA.md), [BASELINE.md](docs/BASELINE.md),
and [KNOWLEDGE.md](docs/KNOWLEDGE.md). Private tracking configuration supplies the authoritative working
map; private evidence and source locations are intentionally absent from this reusable brief.
