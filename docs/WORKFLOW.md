# Managing work with Overworld

You can run this workflow yourself or use it to hand work between people and assistants. Start with one project and one private folder. You can update the tool later without moving your records.

## Set up your workspace

1. Download or clone Overworld. **Before you enter real work**, copy the entire [my-work starter](../starters/my-work/) to a new folder alongside the product. Keep an existing workspace if you already have one. In a file manager, the resulting layout is two folders side by side, `overworld/` and `my-work/`.
2. In `my-work/projects/first-project.yaml`, replace the fictional workshop with one outcome you care about, how you will know it is complete, and the next task. For a continuing responsibility, use an [ongoing area](SCHEMA.md#ongoing-areas) and give each case its own finish line.
3. From the Overworld product folder, run the commands below with [uv](https://docs.astral.sh/uv/getting-started/installation/). Open `../my-work/build/overworld.html` in your browser. Python 3.10+ with PyYAML 6.0.2 installed also works in place of `uv run`.

```sh
uv run build.py --config ../my-work/config.json --check
uv run build.py --config ../my-work/config.json
```

If you use an assistant, open the private work folder and adapt this request.

> Read my workspace README and AGENTS.md. Help me track [outcome]. I have already [what happened and where to verify it]. Help me agree on a finish line, update the example, and show me what to do next. Validate and rebuild my dashboard.

## Decide where each fact belongs

| When you have… | Where to put it |
|---|---|
| A passing idea | A line in a private inbox or the relevant project note. Select it for the dashboard when you decide to track it. |
| A goal and progress to track | One selected project YAML or its existing task ledger. Give tasks stable IDs, finish lines, and the prerequisites that actually block them. |
| Project scope or an accepted decision | The owning project's README, purpose document, or decision note. Record what was decided, why, and which task it affects. |
| An event someone will need to reconstruct | A dated entry in the owning project's or case's worklog. Include the outcome and a retrievable evidence reference. A small case can keep its log and handoff in a single note. |
| A document, receipt, design or test result | Its appropriate project, document store or system of record. Put a file path, revision, issue link or similar reference into the note. Give readers access only where appropriate. |
| Rules that apply to your workspace | Your private `AGENTS.md` or README. Record which repos own which work, when to commit or sync, where originals live, and which actions people or assistants may take. |
| An improvement useful to all Overworld users | The product repository. Demonstrate it with fictional inputs and keep private cases and generated dashboards in their owner's workspace. |

## Start, update, and hand off work

**Start or resume.** Read the owning repo's instructions, the selected task, and its latest handoff. Look at the evidence if the state is uncertain. If the owner has enabled remote Git handoffs, check for newer committed work and preserve any local changes. Identify who can take the next step and what a successful result would look like.

**Record a meaningful change.** Update the task in its owning YAML and add a worklog entry when there is new evidence, a decision, or a blocker. Save decisions and supporting documents where the table above directs. Use `waiting` when someone else has the next move. A file sent for review can justify `waiting`. Reviewer feedback can satisfy the review task. Verify the final deliverable separately. Only record a check date for a check that actually passed.

**Leave a checkpoint.** Say what happened, where to verify it, who acts next, and what would unblock them. Include any agreed deadline. Leave unknown dates open. Update affected maps, validate, and rebuild with the same config. A browser edit is a local draft. Use **Copy for agent** or reconcile it manually against the current YAML before rebuilding.

Here is a worklog entry a workshop organizer might write.

> **12 May · Facilitator review** — The facilitator reviewed outline v2 and asked us to shorten the opening exercise. Feedback is in the facilitator’s comment on v2, under “Opening exercise”. The review task is complete. The organizer will revise the outline and recheck the 30-minute total. No deadline agreed.

The next person can locate the comments and revise the outline without repeating the review. If two people or agents worked at the same time, read the newer note and diff before saving. Preserve independent changes and resolve different accounts of the same event using the evidence.

**Save at the agreed destination.** Local files are enough for one user. If you choose Git, commit related changes together in each repo that owns them. When an update spans repos, use the worklog to link the related change and record any part still pending. If the team hands off through a remote, push to the configured branch and confirm the commit is reachable there before reporting it shared. A local commit and a successful dashboard build each prove a different thing.

## Add work from another repository

Keep an existing project where its team already maintains it. If it has an Overworld-compatible map, select that file directly in your private config. For example, with `my-work/` and `workshop-materials/` side by side, the config can select both maps.

```json
{
  "version": 1,
  "sources": ["projects/first-project.yaml", "../workshop-materials/plan/map.yaml"],
  "output_dir": "build"
}
```

The second map must exist and have its own project ID. Paths in the config are relative to the config file. If the other repo already uses a compatible node ledger, a thin project map can reference it using [nodes_file](SCHEMA.md#project-file). For an issue tracker or other format, keep the detailed work there and record the agreed milestone and its evidence link in your map. The builder reads only the sources you select. Markdown notes, inboxes, external tools and reminders are maintained by you or your configured assistant.

Keep an index of links if you have many repos. Point it at each project's purpose and source map so teammates can find the owner. When access differs, use a private note or a separate repo as appropriate. Both generated dashboard files embed the selected task data and local source paths. To share the method, distribute the product and fictional starter.

## Keep the product and your work up to date

- **Product updates.** If you cloned the shared product and kept it unmodified, run `git pull --ff-only` on its tracking branch. If you maintain a fork, merge reviewed updates from the original product into your fork first. For a ZIP install, extract the newer product beside your existing private workspace and point your build command at it. Validate and rebuild using your existing config. If a schema check fails, use the file and field in its diagnostic to correct the source. Preserve your customized workspace when updating the starter.
- **Contributing improvements.** Make the smallest reproducible product change on a branch, add or update a fictional example when useful, run the [product checks](../README.md#checks), and send it for review according to the product repository's policy. Shared workflow changes belong in this guide and the starter instructions. Personal conventions belong in the private workspace.
- **Changing machines or assistants.** Restore or clone the private work and the referenced project repos, obtain the product, and restore access to linked documents. Adjust paths in the private config if the folder layout changed. Rebuild the view, then resume from the latest handoff. Git can carry the recorded source and worklogs. External files, permissions and scheduled jobs have their own setup.
