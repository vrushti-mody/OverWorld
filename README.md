# Overworld

A zoomable project map: goals, components, testable tasks, dependencies, and progress at a glance.

- **World:** projects grouped by domain, in 2D or 3D.
- **Ongoing areas:** review criteria and finite cases, without a permanent completion ring.
- **Project:** prerequisites flow left to right; hovering highlights the lineage.
- **Component:** click into smaller maps; focus a task to see its checks and steps.
- **Rail:** Next up, missing finish lines, Stuck, Check dependencies, Re-validate, Waiting, and Stale.

Start with [PROJECT.md](PROJECT.md) for product intent, [the philosophy](docs/PHILOSOPHY.md) for visual
principles, [onboarding](docs/ONBOARDING.md) for purpose and scope, and [planning](docs/PLANNING.md) for
testable work. [SCHEMA.md](docs/SCHEMA.md) describes the implemented data format.

## Start managing your own work

Copy [the private workspace starter](starters/my-work/) to a new folder beside this product.
It includes a first project, a case worklog, and instructions for a person or assistant picking up the next task.
[Managing work with Overworld](docs/WORKFLOW.md) walks through the first build, updating work across repositories,
keeping documents and decisions with their owners, handing off progress, and upgrading the product.

## Try the fictional demo

```bash
uv run build.py --demo --check
uv run build.py --demo
open dist/demo/overworld.html
```

`scripts/build.command` builds and opens this demo. The script pins PyYAML; Python 3 with PyYAML installed
also works. The renderer loads D3 and fonts from external services, so this is a local view rather than a
fully offline bundle.

## Build a private dashboard

Create a configuration file **outside this product directory**:

```json
{"version": 1, "sources": ["projects/example.yaml"], "output_dir": "build"}
```

Paths resolve relative to that configuration file. Select every project/archive source explicitly.
A project can reference an existing node-shaped task ledger with `nodes_file` instead of copying it
([SCHEMA.md](docs/SCHEMA.md#project-file)).
Several projects may live in one private monorepo: select each map explicitly, with a unique project ID
and its own canonical purpose and task source. Repository layout is a storage choice; Git is optional.
No repository folders are scanned, no bundled map overrides private state, and duplicate IDs fail validation.
Private configuration, map inputs, and generated output must all be outside the product, including through
symlinks. The selected map may refer to this product's repository for commit recency; that does not enroll
other repositories. See [the boundary and enrollment rules](docs/BASELINE.md).
For projects sharing a repository, `repo` would use every commit in that repository for recency. Omit it
when that would imply false project freshness and maintain supported `touched` dates instead.

```bash
uv run build.py --config /path/to/private/config.json --check
uv run build.py --config /path/to/private/config.json
```

The result is `overworld.html` and `overworld.json` in the configured private output directory. Both contain
the selected data. Source paths are included for edit reconciliation; keep these outputs private.
No default invocation discovers projects. The CLI requires `--demo` or `--config`.

## Navigate and edit

Click a project or component to enter it. Click a task to focus it and open its card. Drag to pan,
scroll or use **− / +** to zoom, and use **Fit** for an overview. Back and breadcrumbs restore your place.
The project rail follows the current project; **All projects** restores the wider view.

A green node with unfinished prerequisites keeps its recorded completion and gains **Check dependencies**.
That mismatch cannot unlock downstream work. It may mean the prerequisite is too broad or the evidence
needs review. The map exposes the question; it does not invent a resolution.

Checking steps is separate from verification. **Mark verified** is a manual assertion; the page never
runs check commands. **Spec changed** marks affected built work for re-validation. Page edits are local
browser drafts. **Copy for agent** exports them for review against the authoritative YAML source. There
is no automatic write or synchronization; a changed source baseline raises a conflict.

Finite work needs an observable finish line. Mark an ongoing root with `work_type: area` and optionally
add `review_criteria` ([schema](docs/SCHEMA.md#ongoing-areas)). Areas show their review criteria instead of
a finish line and completion percentage; their finite children retain ordinary progress and verification.
An area cannot become done/live or act as a completion prerequisite. In 3D it stays at a neutral height.
This recognition does not assess area health, track review dates, or schedule reviews.

## Product layout

| Path | Purpose |
|---|---|
| `web/template.html` | D3/SVG renderer; data injected during build |
| `build.py` | Explicit selection, validation, and output |
| `examples/` | Clearly fictional product demo |
| `starters/my-work/` | Copyable workspace with a fictional first project and worklog |
| `dist/demo/` | Ignored generated demo output |
| `docs/` | Philosophy, schema, planning, onboarding, and proposed knowledge integration |
| `skills/replan/` | Reusable scoped plan/evidence reconciliation skill |
| `AGENTS.md`, `CLAUDE.md` | Shared maintenance instructions |

The [knowledge connection](docs/KNOWLEDGE.md) remains a proposal. Keep notes and evidence in their
existing private sources; a task graph is not a full knowledge store. Current source separation does not
sanitize earlier Git history, remote copies, or exported dashboards. Review those separately before release.
A local build or Git push does not update a hosted page.

## Checks

```bash
uv run --with PyYAML==6.0.2 python -m unittest discover -s tests -v
node --test tests/test_renderer.cjs tests/test_routing.cjs
```

## Gemini phone app + MongoDB workspace (draft)

This draft lets the Gemini app connect to Overworld through a remote MCP server deployed as Netlify Functions. Overworld does not call Gemini’s API and does not need a `GEMINI_API_KEY`; Gemini runs in the user’s Gemini app/account. Google may apply the user’s own Gemini plan limits or availability rules. Netlify Functions host the backend alongside the static site, so no separate server is needed.

Each Google account gets a private MongoDB workspace. The workspace map is stored as MongoDB documents (BSON); the existing YAML remains the starter/example source map. Gemini links to the account through OAuth 2.1 with PKCE. It can read projects, add projects/tasks, and update project status, finish lines, or notes. Writes are validated by the backend and logged. Gemini may require user confirmation for write actions; Overworld also displays any confirmations Gemini’s client provides.

### Local setup

1. Install Node.js 20 or newer and run `npm install` in this directory.
2. Copy `.env.example` to `.env`. Set `GOOGLE_CLIENT_ID`, `APP_BASE_URL` (use your local Netlify dev origin for local development), `MONGODB_URI`, `MONGODB_DB`, and a random `SESSION_SECRET` of at least 32 characters. Set `ALLOWED_EMAILS` to a comma-separated invite list during a private pilot.
3. In Google Cloud Console, configure a Google Identity Services OAuth client with the local and deployed site origins as authorized JavaScript origins.
4. Run `npm run dev` and open `http://localhost:8888`. The local adapter reads `.env`, serves the built UI, and dispatches API requests to the same Netlify function handlers.

### Netlify deployment

Connect the repository to Netlify with the **base directory** set to `overworld`. Netlify runs `npm run build`, publishes `site/`, and deploys `netlify/functions/` with it. Add the environment variables above to the Netlify site settings. Set `APP_BASE_URL` to the site’s final public HTTPS origin. Keep MongoDB credentials and the session secret out of the frontend and source control. Ensure the MongoDB cluster accepts connections from the deployed functions and restrict its database user to the required database.

### Connect the Gemini app

1. Deploy Overworld to a public HTTPS URL and sign in to its web UI with Google so the workspace exists.
2. In Overworld, choose **Connect Gemini** and copy the MCP URL shown (it ends in `/mcp/v1`).
3. In Gemini on the web (or mobile), tap **Menu** → **Customize** (select **More** first if it's hidden) → **Connectors** → **Add**, and add a custom app / MCP server using that URL. If it isn't there, try **Settings → Personal Intelligence → Connected Apps**, and make sure **Settings → Activity** is on. Follow Gemini's authorization screen, sign in with the same Google account that owns the workspace, and click **Allow Gemini to connect**. To reconnect later, use **Customize → Connectors → More options → Disconnect**, then add it again.
4. Ask Gemini to list projects or add/update something in Overworld. Check the result in the Overworld UI.

Google currently documents custom MCP-connected apps as a feature with account, age, language, region, and activity-history eligibility requirements; it may not be available to every account. Adding a custom app is initiated in Gemini on the web. Depending on the current Google Connected Apps process, publishing or review through Google’s Connected Apps Console may be required before general availability. See [Gemini custom app setup](https://support.google.com/gemini/answer/17209137) and [Google Connected Apps MCP documentation](https://developers.google.com/connected-apps/mcp).

This is an early draft. Before inviting more users, review Google’s Connected Apps registration requirements, OAuth behavior, account eligibility, MongoDB access, backups, data retention, and the tool permissions. It currently supports one default workspace per Google account; workspace sharing, user-managed YAML import/export, and tools for deleting items are not implemented.
