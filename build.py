#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["PyYAML==6.0.2"]
# ///
"""Build Overworld from deliberately selected map facts.

uv run build.py --demo                       # fictional examples → dist/demo/
uv run build.py --config /private/config.json # explicit sources → private output
Add --check to validate without writing. No folders are scanned for enrollment.
"""
import argparse
import datetime as dt
import json
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    import yaml
except ImportError:
    raise SystemExit("PyYAML is missing. Run `uv run build.py --demo` to use the pinned dependency.")

ROOT = Path(__file__).resolve().parent
STATUSES = {"idea", "planned", "partial", "live", "done", "waiting", "blocked", "drift", "dropped"}
MODES = {"campaign", "practice", "fallow", "idea", "archive"}
DOMAINS = {"systems", "content", "career", "life", "money"}
WORK_TYPES = {"project", "area"}
DEMO_SOURCES = ("signal-garden.yaml", "garden-stewardship.yaml")
errors: list[str] = []


def s(v):
    """YAML dates become ISO strings in the browser data."""
    return v.isoformat() if isinstance(v, (dt.date, dt.datetime)) else v


def key_part(value: str) -> str:
    return value.replace("~", "~0").replace("/", "~1")


def source_name(path: Path) -> str:
    path = path.resolve()
    try:
        return str(path.relative_to(ROOT.resolve()))
    except ValueError:
        return str(path.resolve())


def read_mapping(path: Path) -> dict:
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, yaml.YAMLError) as exc:
        errors.append(f"{source_name(path)}: cannot read YAML: {exc}")
        return {}
    if not isinstance(data, dict):
        errors.append(f"{source_name(path)}: expected a mapping")
        return {}
    return data


def last_commit(repo: str | None) -> str | None:
    if not isinstance(repo, str) or not repo:
        return None
    path = Path(os.path.expanduser(repo))
    if not (path / ".git").exists():
        return None
    try:
        out = subprocess.run(["git", "-C", str(path), "log", "-1", "--format=%cs"],
                             capture_output=True, text=True, timeout=10)
        return (out.stdout.strip() or None) if out.returncode == 0 else None
    except (OSError, subprocess.TimeoutExpired):
        return None


def valid_id(value) -> bool:
    return isinstance(value, str) and bool(value.strip())


def group(items, where: str) -> list[dict]:
    """Validate one dependency scope, including cycles, before laying it out."""
    if not isinstance(items, list):
        errors.append(f"{where}: nodes must be a list")
        return []
    nodes = []
    seen = set()
    for item in items:
        if not isinstance(item, dict):
            errors.append(f"{where}: each node must be a mapping")
            continue
        ident = item.get("id")
        if not valid_id(ident):
            errors.append(f"{where}: every node needs a non-empty string id")
        elif ident in seen:
            errors.append(f"{where}: duplicate sibling id {ident!r}")
        else:
            seen.add(ident)
        nodes.append(item)
    by_id = {n["id"]: n for n in nodes if valid_id(n.get("id"))}
    visiting, visited = [], set()

    def visit(ident):
        if ident in visiting:
            chain = visiting[visiting.index(ident):] + [ident]
            errors.append(f"{where}: dependency cycle: {' → '.join(chain)}")
            return
        if ident in visited:
            return
        visiting.append(ident)
        needs = by_id[ident].get("needs", [])
        if isinstance(needs, list):
            for dep in needs:
                if isinstance(dep, str) and dep in by_id:
                    visit(dep)
        visiting.pop()
        visited.add(ident)

    for ident in by_id:
        visit(ident)
    return nodes


def node(n: dict, where: str, siblings: set[str], source: str, parent_key="") -> dict:
    ident = n.get("id")
    if not valid_id(ident):
        errors.append(f"{where}: missing or invalid id")
    if not valid_id(n.get("name")):
        errors.append(f"{where}: missing or invalid name")
    if parent_key:
        for field in ("work_type", "review_criteria"):
            if field in n:
                errors.append(f"{where}: {field} is allowed only on a project/area root")
    else:
        work_type = n.get("work_type", "project")
        if not isinstance(work_type, str) or work_type not in WORK_TYPES:
            errors.append(f"{where}: work_type must be 'project' or 'area'")
        if "review_criteria" in n:
            if work_type != "area":
                errors.append(f"{where}: review_criteria is allowed only for work_type: area")
            if not valid_id(n["review_criteria"]):
                errors.append(f"{where}: review_criteria must be a non-empty string")
        if work_type == "area":
            if "done_when" in n:
                errors.append(f"{where}: an ongoing area cannot declare done_when; put finish lines on finite children")
            if n.get("status") in ("done", "live"):
                errors.append(f"{where}: an ongoing area cannot have status done/live; only finite children can complete")
    o = {k: s(v) for k, v in n.items() if k not in ("nodes", "weight")}
    o["key"] = parent_key + "/" + key_part(ident if valid_id(ident) else "?")
    o["source"] = source
    weight = n.get("weight", 1)
    if isinstance(weight, bool) or not isinstance(weight, (int, float)) or not math.isfinite(weight) or not 0 < weight <= 5:
        errors.append(f"{where}: weight must be a number greater than 0 and at most 5")
        weight = 1
    o["w"] = weight
    o.setdefault("kind", "task" if not n.get("nodes") else "component")
    if "status" in o and (not isinstance(o["status"], str) or o["status"] not in STATUSES):
        errors.append(f"{where}: unknown status {o['status']!r}")
    needs = n.get("needs", [])
    if not isinstance(needs, list) or any(not valid_id(dep) for dep in needs):
        errors.append(f"{where}: needs must be a list of sibling ids")
        needs = []
    for dep in needs:
        if dep not in siblings:
            errors.append(f"{where}: needs {dep!r}, which is not a sibling")
    for field in ("touched", "due", "checked"):
        if field not in o:
            continue
        try:
            if not isinstance(o[field], str) or len(o[field]) != 10:
                raise ValueError()
            dt.date.fromisoformat(o[field])
        except ValueError:
            errors.append(f"{where}: {field} must be an ISO date (YYYY-MM-DD)")
    if "steps" in n:
        if not isinstance(n["steps"], list):
            errors.append(f"{where}: steps must be a list")
        else:
            for i, step in enumerate(n["steps"]):
                if not isinstance(step, dict) or not valid_id(step.get("name")) or not isinstance(step.get("done", False), bool):
                    errors.append(f"{where}: step {i + 1} needs a name and a boolean done value")
    kids = group(n.get("nodes", []), where)
    ids = {k["id"] for k in kids if valid_id(k.get("id"))}
    if kids:
        o["children"] = [node(k, f"{where} › {k.get('id')}", ids, source, o["key"]) for k in kids]
    return o


def ledger_nodes(path: Path, data: dict, private: bool, used: set) -> tuple[str, list] | None:
    """Read a project's nodes from an existing node-shaped ledger that remains their authority."""
    where = source_name(path)
    if "nodes" in data:
        errors.append(f"{where}: use nodes or nodes_file, not both")
        return None
    ledger = resolve_path(data.get("nodes_file"), path.parent, f"{where}: nodes_file", private)
    if ledger is None:
        return None
    if not private:
        examples = (ROOT / "examples").resolve()
        if not ledger.is_relative_to(examples) or (path.parent / data["nodes_file"]).is_symlink():
            errors.append(f"{where}: demo nodes_file must be a regular fictional example")
            return None
    label = source_name(ledger)
    if ledger in used:
        errors.append(f"{label}: nodes_file is already used by another selected project")
        return None
    used.add(ledger)
    if ledger.suffix.lower() not in {".yaml", ".yml"} or not ledger.is_file():
        errors.append(f"{where}: nodes_file must be an existing YAML file")
        return None
    try:
        items = yaml.safe_load(ledger.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, yaml.YAMLError) as exc:
        errors.append(f"{label}: cannot read YAML: {exc}")
        return None
    if not isinstance(items, list):
        errors.append(f"{label}: nodes_file must contain a YAML list of nodes")
        return None
    return label, items


def load_maps(paths: list[Path], private: bool = True) -> tuple[list[dict], list[dict]]:
    """Load only selected sources. Duplicate identities never override another file."""
    raw, archive = [], []
    archive_names = set()
    for path in paths:
        data = read_mapping(path)
        if "archive" in data:
            if "id" in data:
                errors.append(f"{source_name(path)}: choose a project or archive mapping, not both")
            archive.extend(load_archive(path, data, archive_names))
        else:
            raw.append((path, data))
    group([data for _, data in raw], "selected projects")
    top = {data["id"] for _, data in raw if valid_id(data.get("id"))}
    areas = {data["id"] for _, data in raw if data.get("work_type") == "area" and valid_id(data.get("id"))}
    out = []
    ledgers: set[Path] = set()
    for path, data in raw:
        where = source_name(path)
        if data.get("id") == "@archive":
            errors.append(f"{where}: project id '@archive' is reserved for the archive shelf")
        for field, allowed in (("mode", MODES), ("domain", DOMAINS)):
            if not isinstance(data.get(field), str) or data[field] not in allowed:
                errors.append(f"{where}: unknown {field} {data.get(field)!r}")
        needs = data.get("needs", [])
        if isinstance(needs, list):
            for dep in needs:
                if valid_id(dep) and dep not in top:
                    errors.append(f"{where}: prerequisite {dep!r} is missing from selected project sources")
                elif valid_id(dep) and dep in areas:
                    errors.append(f"{where}: prerequisite {dep!r} is an ongoing area and cannot complete; use a finite project contract")
        ledger = ledger_nodes(path, data, private, ledgers) if "nodes_file" in data else None
        project = node({k: v for k, v in data.items() if k != "nodes_file"}, where, top, where)
        project["kind"] = "project"
        if ledger is not None:
            # Ledger nodes keep the ledger as their source, so browser edits point at the real authority.
            label, items = ledger
            kids = group(items, label)
            ids = {k["id"] for k in kids if valid_id(k.get("id"))}
            if kids:
                project["children"] = [node(k, f"{label} › {k.get('id')}", ids, label, project["key"]) for k in kids]
        git = last_commit(data.get("repo"))
        if git and (not project.get("touched") or (isinstance(project["touched"], str) and git > project["touched"])):
            project["touched"] = git
        out.append(project)
    return out, archive


def load_archive(path: Path, data: dict, names: set[str]) -> list[dict]:
    """Retain the existing archive shape, but only for an explicitly selected file."""
    where = source_name(path)
    items = data.get("archive", [])
    if not isinstance(items, list):
        errors.append(f"{where}: archive must be a list")
        return []
    out = []
    for i, item in enumerate(items):
        if not isinstance(item, dict) or not valid_id(item.get("name")):
            errors.append(f"{where}: item {i + 1} needs a name")
            continue
        name = item["name"]
        if name in names:
            errors.append(f"{where}: duplicate archive name {name!r}")
        names.add(name)
        out.append({"id": f"arch-{len(names) - 1}", "key": "/@archive/" + key_part(name), "source": where,
                    "name": name, "kind": "project", "domain": "archive", "mode": "archive",
                    "status": "dropped", "w": 1, **({"goal": item["note"]} if item.get("note") else {})})
    return out


def resolve_path(value, base: Path, label: str, private: bool) -> Path | None:
    if not isinstance(value, str) or not value.strip():
        errors.append(f"{label}: expected a non-empty path string")
        return None
    try:
        path = Path(value).expanduser()
        path = path if path.is_absolute() else base / path
        lexical = Path(os.path.abspath(path))
        resolved = path.resolve()
        root = ROOT.resolve()
        if private and (lexical.is_relative_to(root) or resolved.is_relative_to(root)):
            errors.append(f"{label}: private paths must be outside the product directory (including symlinks)")
            return None
        return resolved
    except (OSError, RuntimeError, ValueError) as exc:
        errors.append(f"{label}: invalid path: {exc}")
        return None


def unique_json_fields(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"duplicate config field {key!r}")
        result[key] = value
    return result


def selection(args) -> tuple[list[Path], Path | None, Path | None]:
    """Return validated sources, output directory and optional private config path."""
    if args.demo:
        # A fixed example list cannot silently enroll newly added files or real maps.
        paths = [ROOT / "examples" / name for name in DEMO_SOURCES]
        output = ROOT / "dist" / "demo"
        try:
            for source in paths:
                if not source.resolve().is_relative_to((ROOT / "examples").resolve()) or source.is_symlink():
                    errors.append("demo source must be a regular fictional example, not a symlink")
            if (ROOT / "examples").is_symlink():
                errors.append("demo examples directory must not be a symlink")
            if output.resolve() != ROOT.resolve() / "dist" / "demo":
                errors.append("demo output must stay in the product's dist/demo directory")
        except (OSError, RuntimeError) as exc:
            errors.append(f"demo paths: {exc}")
        config = None
    else:
        config = resolve_path(args.config, Path.cwd(), "config", private=True)
        if config is None:
            return [], None, None
        try:
            data = json.loads(config.read_text(encoding="utf-8"), object_pairs_hook=unique_json_fields)
        except (OSError, UnicodeError, ValueError) as exc:
            errors.append(f"config: cannot read JSON: {exc}")
            return [], None, config
        if not isinstance(data, dict):
            errors.append("config: expected an object with version, sources and output_dir")
            return [], None, config
        if set(data) != {"version", "sources", "output_dir"}:
            errors.append("config: requires exactly version, sources and output_dir")
        if type(data.get("version")) is not int or data["version"] != 1:
            errors.append("config: version must be 1")
        sources = data.get("sources")
        if not isinstance(sources, list) or not sources:
            errors.append("config: sources must be a non-empty list of explicit YAML paths")
            sources = []
        paths = []
        for i, value in enumerate(sources):
            path = resolve_path(value, config.parent, f"source {i + 1}", private=True)
            if path is not None:
                paths.append(path)
        output = resolve_path(data.get("output_dir"), config.parent, "output_dir", private=True)
    seen = set()
    for path in paths:
        if path in seen:
            errors.append(f"{source_name(path)}: duplicate source path")
        seen.add(path)
        if path.suffix.lower() not in {".yaml", ".yml"}:
            errors.append(f"{source_name(path)}: source must be a YAML file")
        if not path.is_file():
            errors.append(f"{source_name(path)}: source file does not exist or is not a regular file")
    validate_output(output, paths, config, private=not args.demo)
    return paths, output, config


def validate_output(output: Path | None, sources: list[Path], config: Path | None, private: bool):
    if output is None:
        return
    # Validate all target paths before reading maps or changing an existing build.
    for ancestor in (output, *output.parents):
        if ancestor.exists() and not ancestor.is_dir():
            errors.append("output_dir: an existing path component is not a directory")
            break
    protected = set(sources) | ({config} if config else set())
    for name in ("overworld.html", "overworld.json"):
        target = output / name
        resolved = resolve_path(str(target), Path.cwd(), f"output {name}", private)
        if target.is_symlink():
            errors.append(f"output {name}: refusing to overwrite a symlink")
        if target.exists() and not target.is_file():
            errors.append(f"output {name}: existing target is not a regular file")
        if resolved in protected:
            errors.append(f"output {name}: would overwrite an input or config file")


def report_errors() -> int:
    print("build errors:\n  " + "\n  ".join(errors), file=sys.stderr)
    return 1


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--config", metavar="PATH", help="external private JSON selection (version, sources, output_dir)")
    mode.add_argument("--demo", action="store_true", help="build only the bundled fictional examples")
    parser.add_argument("--check", action="store_true", help="validate without writing outputs")
    args = parser.parse_args(argv)
    errors.clear()
    sources, output, config = selection(args)
    if errors:
        return report_errors()
    projects, archive = load_maps(sources, private=not args.demo)
    world = {"id": "world", "key": "", "name": "Overworld", "kind": "world", "as_of": dt.date.today().isoformat(),
             "children": projects + archive}
    if errors:
        return report_errors()
    try:
        data = embedded_json(world)
        json_output = json.dumps(world, ensure_ascii=False, indent=1, allow_nan=False)
        # Reject unsupported YAML values and invalid Unicode before any output writes.
        data.encode("utf-8")
        json_output.encode("utf-8")
        if args.check:
            print(f"ok: {len(projects)} projects · {len(archive)} archive entries · {len(sources)} selected sources")
            return 0
        template = (ROOT / "web" / "template.html").read_text(encoding="utf-8")
        if template.count("/*__DATA__*/") != 1:
            raise ValueError("template must contain exactly one data placeholder")
        html = template.replace("/*__DATA__*/", data)
        html.encode("utf-8")
    except (OSError, UnicodeError, TypeError, ValueError) as exc:
        errors.append(f"cannot prepare output: {exc}")
        return report_errors()
    # Recheck destinations before writing. Temporary files avoid truncating a previous build.
    validate_output(output, sources, config, private=not args.demo)
    if errors:
        return report_errors()
    pending = []
    try:
        output.mkdir(parents=True, exist_ok=True)
        for name, contents in (("overworld.html", html), ("overworld.json", json_output)):
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=output, prefix=".overworld-", delete=False) as handle:
                pending.append((Path(handle.name), output / name))
                handle.write(contents)
        for temporary, target in pending:
            temporary.replace(target)
    except OSError as exc:
        errors.append(f"cannot write output: {exc}")
        return report_errors()
    finally:
        for temporary, _ in pending:
            temporary.unlink(missing_ok=True)
    print(f"built {output / 'overworld.html'} · {len(projects)} projects · as of {world['as_of']}")
    return 0


def embedded_json(data: dict) -> str:
    # Escape every '<', including '<!--<script', which can change the HTML parser's
    # raw-text state even inside a non-executable application/json script element.
    return json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")


if __name__ == "__main__":
    sys.exit(main())
