# Overworld — shared agent instructions

For a user's task updates, follow [the work and handoff guide](docs/WORKFLOW.md) and the owning workspace's instructions.
Use the [workspace starter](starters/my-work/) when setting up a new user. Keep real work in their external workspace.

Read `docs/PHILOSOPHY.md` before changing the interface and `docs/SCHEMA.md` before editing maps.
Use [docs/ONBOARDING.md](docs/ONBOARDING.md) to discuss purpose, scope, success/review criteria, and domain
guidance. Its document contract alone does not authorize implementation or repository creation; an explicit
user request or configured idea-capture policy can authorize a lightweight local draft after a fit check.
Use [docs/PLANNING.md](docs/PLANNING.md) when proposing or revising a project's breakdown and lifecycle.
Read [docs/BASELINE.md](docs/BASELINE.md) before adding projects or changing discovery/storage. Admission
for active work requires purpose/scope review; authorized idea capture may precede that acceptance.
Workspace, repository, project, and ongoing area are distinct boundaries. A monorepo may contain several
projects; inspect each project's canonical purpose/task sources and the containing repository's policy.
An index links those authorities without copying their status. These rules do not themselves authorize migration.
The maintenance rules in `CLAUDE.md` apply to every agent, including Codex and Gemini.
Apply the [experience-review principle](docs/PHILOSOPHY.md#experience-review) during work: examine model
fit and the whole workflow, and keep findings, proposals, and implemented behavior distinct.

- Edit `web/template.html`, then rebuild the selected view. Never hand-edit generated output.
- Product-only boundary: keep real personal/project data outside this reusable product, including maps,
  docs/examples, configuration, feedback, and generated payloads. If existing authority is misplaced here,
  flag it privately and propose migration; do not add/update personal facts or rebuild private payloads
  into the product. This takes precedence over older map-maintenance/build guidance; no implicit migration.
- Preserve real project facts. Do not invent finish lines or mark work verified without evidence.
- Recognize ongoing roots with `work_type: area` and optional `review_criteria`; keep finite cases below
  them. Area recognition does not establish health, schedule a review, or allow permanent verification.
- Keep hierarchy, dependencies and status in separate visual channels.
- Browser edits are drafts; the explicitly selected private YAML is the task-state authority. Git is optional.
- Preserve project IDs when storage changes. `repo` is optional whole-repository recency, not project
  identity; omit it when a shared repository's unrelated commits would imply false project freshness.
- Use [replan](skills/replan/SKILL.md) for scoped evidence/plan reconciliation, product-boundary review,
  justified local corrections, and permitted local refreshes. It is on demand, not scheduled monitoring.
- Validate with `uv run build.py --demo --check` or the explicitly authorized external `--config PATH`;
  run relevant tests, then build using the same selected mode. Never use personal inputs for a demo.
- Check 2D, 3D, project drill-down and task editing for interface changes.
- Use the existing publishing destination only when its URL and editing access are available.
  A local commit does not update the hosted page.
