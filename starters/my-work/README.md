# My work

This folder is a starter for a private task workspace. It contains a fictional workshop project and one example case note. Replace them with your own work after copying the complete folder outside the Overworld product directory.

## Build your first dashboard

With this folder and `overworld/` next to each other, run these commands from this folder. Use [uv](https://docs.astral.sh/uv/getting-started/installation/) or a Python 3.10+ interpreter with PyYAML 6.0.2 installed.

```sh
uv run ../overworld/build.py --config config.json --check
uv run ../overworld/build.py --config config.json
```

Open `build/overworld.html` in your browser. If your Overworld checkout has a different name or location, adjust the path to `build.py`.

Open `docs/WORKFLOW.md` in the Overworld product folder for the full workflow, including worklogs, documents, additional project repos, and product updates.

## Start tracking real work

- Edit `projects/first-project.yaml` to set your goal, the outcome that counts as done, and the first tasks. Set the IDs once for the project you are starting. Keep those IDs stable across later changes.
- Use a note such as `notes/workshop-review.md` for a decision, a reference to evidence, and who acts next. The YAML owns task status. Markdown notes are for people and assistants to read directly.
- Add another project by copying the YAML, changing the project ID, and adding its path to the `sources` array in `config.json`. Run the validation and build commands again, then refresh the dashboard.
- Edits made inside the dashboard are browser drafts. Use **Copy for agent** to hand them to an assistant, or apply them yourself to the YAML. Rebuild after saving the source.

For version history, run `git init` inside this workspace and commit your starting files. Then you can ask an assistant to commit each meaningful update to the task and its case note together. Keep the workspace private if it contains personal information. The generated dashboard includes your task data and local paths, and `build/` is excluded by the supplied Git ignore file.

### First prompt for your assistant

> Read README.md and AGENTS.md in this workspace. Help me track [project]. My goal is [outcome], and the work I have already completed is [brief evidence or “none yet”]. Replace the fictional workshop with my project, give each task a clear finish line, then validate and build the dashboard. Show me my next action.
