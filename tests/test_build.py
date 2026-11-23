"""Regression checks for map identity, dependency safety, and readable validation."""
import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import yaml
import build


class MapValidationTests(unittest.TestCase):
    def setUp(self):
        build.errors.clear()

    def convert(self, data):
        return build.node(data, "example.yaml", {"project"}, "maps/example.yaml")

    def test_repeated_ids_in_different_branches_have_distinct_edit_keys(self):
        result = self.convert({"id": "project", "name": "Project", "nodes": [
            {"id": "a", "name": "A", "nodes": [{"id": "check", "name": "Check"}]},
            {"id": "b", "name": "B", "nodes": [{"id": "check", "name": "Check"}]},
        ]})
        leaves = [branch["children"][0] for branch in result["children"]]
        self.assertEqual([n["key"] for n in leaves], ["/project/a/check", "/project/b/check"])
        self.assertTrue(all(n["source"] == "maps/example.yaml" for n in leaves))
        self.assertEqual(build.errors, [])

    def test_keys_escape_separators_without_aliasing_other_paths(self):
        result = self.convert({"id": "project", "name": "P", "nodes": [
            {"id": "a/b", "name": "One"}, {"id": "a~1b", "name": "Two"}]})
        self.assertEqual([n["key"] for n in result["children"]], ["/project/a~1b", "/project/a~01b"])

    def test_cycle_reports_the_actual_dependency_chain(self):
        self.convert({"id": "project", "name": "Project", "nodes": [
            {"id": "a", "name": "A", "needs": ["b"]},
            {"id": "b", "name": "B", "needs": ["a"]},
        ]})
        self.assertTrue(any("dependency cycle: a → b → a" in e for e in build.errors))

    def test_duplicate_siblings_and_cross_scope_needs_are_rejected(self):
        self.convert({"id": "project", "name": "Project", "nodes": [
            {"id": "a", "name": "A"}, {"id": "a", "name": "Again"},
            {"id": "b", "name": "B", "nodes": [{"id": "leaf", "name": "Leaf", "needs": ["a"]}]},
        ]})
        self.assertTrue(any("duplicate sibling id" in e for e in build.errors))
        self.assertTrue(any("which is not a sibling" in e for e in build.errors))

    def test_invalid_values_report_errors_instead_of_crashing_the_browser(self):
        self.convert({"id": "project", "name": "P", "weight": float("nan"), "needs": "a",
                      "status": [], "due": "yesterday", "nodes": [None],
                      "steps": [{"name": "Check", "done": "false"}]})
        message = "\n".join(build.errors)
        for expected in ("weight", "needs must be a list", "unknown status", "ISO date", "mapping", "boolean done"):
            self.assertIn(expected, message)

    def test_script_like_text_stays_json_and_cannot_change_html_parser_state(self):
        data = {"note": "<!--<script> hello </ScRiPt><script>alert(1)</script>", "name": "Café → map"}
        embedded = build.embedded_json(data)
        self.assertNotIn("<", embedded)
        self.assertEqual(json.loads(embedded), data)

    def test_area_fields_are_root_only_including_inside_finite_cases(self):
        for field, value in (("work_type", "area"), ("review_criteria", "Keep cases actionable.")):
            with self.subTest(field=field):
                build.errors.clear()
                self.convert({"id": "project", "name": "Area", "work_type": "area", "nodes": [
                    {"id": "case", "name": "Case", "nodes": [
                        {"id": "task", "name": "Task", field: value}]}]})
                self.assertTrue(any(f"{field} is allowed only on a project/area root" in e for e in build.errors))

    def test_area_metadata_rejects_invalid_values_and_finite_completion(self):
        cases = [
            ({"work_type": "practice"}, "work_type must be"),
            ({"work_type": []}, "work_type must be"),
            ({"work_type": None}, "work_type must be"),
            ({"review_criteria": "Keep cases actionable."}, "allowed only for work_type: area"),
            ({"work_type": "area", "review_criteria": " "}, "non-empty string"),
            ({"work_type": "area", "review_criteria": []}, "non-empty string"),
            ({"work_type": "area", "done_when": None}, "cannot declare done_when"),
            ({"work_type": "area", "status": "done"}, "cannot have status done/live"),
            ({"work_type": "area", "status": "live"}, "cannot have status done/live"),
        ]
        for values, expected in cases:
            with self.subTest(values=values):
                build.errors.clear()
                self.convert({"id": "project", "name": "Area", **values})
                self.assertIn(expected, "\n".join(build.errors))


class SourceLoadingTests(unittest.TestCase):
    def setUp(self):
        build.errors.clear()
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.base = Path(self.tmp.name).resolve()
        self.root = self.base / "product"
        self.private = self.base / "private"
        self.root.mkdir()
        self.private.mkdir()
        self.config = self.private / "config.json"
        self.source = self.private / "projects" / "project.yaml"
        self.output = self.private / "build"
        self.root_patch = patch.object(build, "ROOT", self.root)
        self.root_patch.start()
        self.addCleanup(self.root_patch.stop)
        self.write(self.source)
        self.write_config()
        (self.root / "web").mkdir()
        (self.root / "web" / "template.html").write_text(
            '<script type="application/json">/*__DATA__*/</script>', encoding="utf-8")

    def write(self, path, **values):
        data = {"id": "project", "name": "Project", "domain": "systems", "mode": "practice", **values}
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(yaml.safe_dump(data), encoding="utf-8")
        return path

    def write_config(self, **values):
        data = {"version": 1, "sources": ["projects/project.yaml"], "output_dir": "build", **values}
        self.config.write_text(json.dumps(data), encoding="utf-8")

    def run_build(self, *extra, config=None):
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return build.main(["--config", str(config or self.config), *extra])

    def last_build(self):
        self.output.mkdir(exist_ok=True)
        for name in ("overworld.html", "overworld.json"):
            (self.output / name).write_text("last good build", encoding="utf-8")

    def assert_last_build_unchanged(self):
        for name in ("overworld.html", "overworld.json"):
            self.assertEqual((self.output / name).read_text(), "last good build")

    def test_only_explicit_sources_are_loaded_with_real_source_and_stable_identity(self):
        self.write(self.root / "maps" / "unselected.yaml", name="Never enroll bundled")
        unselected = self.write(self.base / "repos" / "unselected" / "map.yaml", name="Never scan folders")
        with patch.dict("os.environ", {"OVERWORLD_GITHUB": str(unselected.parent.parent)}):
            self.assertEqual(self.run_build(), 0)
        world = json.loads((self.output / "overworld.json").read_text())
        self.assertEqual(len(world["children"]), 1)
        self.assertEqual(world["children"][0]["source"], str(self.source))
        self.assertEqual(world["children"][0]["key"], "/project")
        self.assertNotIn("Never", json.dumps(world))
        self.assertFalse((self.root / "dist").exists())

    def test_paths_are_relative_to_config_directory_not_current_directory(self):
        self.assertEqual(self.run_build(), 0)
        self.assertTrue((self.output / "overworld.html").is_file())
        self.assertEqual(build.errors, [])

    def test_ongoing_area_preserves_identity_sources_and_finite_child_contracts(self):
        self.write(self.source, work_type="area", review_criteria="Every active case has an owner.",
                   nodes=[{"id": "case", "name": "Finite case", "status": "done",
                           "done_when": "The example case is verified.", "check": "manual"}])
        self.assertEqual(self.run_build(), 0, build.errors)
        area = json.loads((self.output / "overworld.json").read_text())["children"][0]
        self.assertEqual((area["kind"], area["key"], area["source"]), ("project", "/project", str(self.source)))
        self.assertEqual(area["work_type"], "area")
        self.assertEqual(area["review_criteria"], "Every active case has an owner.")
        self.assertNotIn("status", area)
        self.assertEqual(area["children"][0]["status"], "done")
        self.assertEqual(area["children"][0]["key"], "/project/case")
        self.assertEqual(area["children"][0]["source"], str(self.source))
        self.assertEqual(area["children"][0]["done_when"], "The example case is verified.")

    def test_area_review_criteria_can_be_missing_and_existing_projects_still_complete(self):
        self.write(self.source, work_type="area")
        self.assertEqual(self.run_build("--check"), 0, build.errors)
        for work_type in ({}, {"work_type": "project"}):
            with self.subTest(work_type=work_type):
                self.write(self.source, status="done", done_when="A bounded outcome is verified.", **work_type)
                self.assertEqual(self.run_build("--check"), 0, build.errors)

    def test_an_ongoing_area_cannot_unlock_another_selected_root(self):
        area = self.write(self.private / "area.yaml", id="area", work_type="area")
        for consumer in ({}, {"work_type": "area"}):
            with self.subTest(consumer=consumer):
                self.write(self.source, needs=["area"], **consumer)
                self.write_config(sources=[str(self.source), str(area)])
                self.last_build()
                self.assertEqual(self.run_build(), 1)
                self.assertTrue(any("is an ongoing area and cannot complete" in e for e in build.errors))
                self.assert_last_build_unchanged()

    def test_area_can_depend_on_a_finite_project_and_use_a_ledger(self):
        finite = self.write(self.private / "finite.yaml", id="finite", status="done", done_when="Sample passes.")
        ledger = self.write_ledger(self.private / "cases.yaml", [{"id": "case", "name": "Case", "status": "done"}])
        self.write(self.source, work_type="area", needs=["finite"], nodes_file="../cases.yaml")
        self.write_config(sources=[str(self.source), str(finite)])
        self.assertEqual(self.run_build(), 0, build.errors)
        area = json.loads((self.output / "overworld.json").read_text())["children"][0]
        self.assertEqual(area["children"][0]["source"], str(ledger))
        self.assertEqual(area["children"][0]["key"], "/project/case")

    def test_area_fields_in_referenced_ledger_are_rejected(self):
        self.write_ledger(self.private / "cases.yaml", [{"id": "case", "name": "Case", "work_type": "area"}])
        self.write(self.source, work_type="area", nodes_file="../cases.yaml")
        self.assertEqual(self.run_build("--check"), 1)
        self.assertTrue(any("work_type is allowed only on a project/area root" in e for e in build.errors))

    def test_multiple_projects_in_one_repository_keep_distinct_authority_and_identity(self):
        shared = self.base / "shared-repository"
        # Git is optional. Both maps can name the same containing repository without merging projects.
        first = self.write(shared / "projects" / "garden" / "map.yaml", id="garden", name="Garden",
                           repo=str(shared), nodes=[{"id": "review", "name": "Review", "status": "done"}])
        second = self.write(shared / "projects" / "almanac" / "map.yaml", id="almanac", name="Almanac",
                            repo=str(shared), needs=["garden"],
                            nodes=[{"id": "review", "name": "Review", "status": "planned"}])
        self.write(shared / "projects" / "unselected" / "map.yaml", id="unselected")
        self.write_config(sources=[str(first), str(second)])
        self.assertEqual(self.run_build(), 0, build.errors)
        projects = json.loads((self.output / "overworld.json").read_text())["children"]
        self.assertEqual([p["id"] for p in projects], ["garden", "almanac"])
        self.assertEqual([p["source"] for p in projects], [str(first), str(second)])
        self.assertEqual([p["children"][0]["source"] for p in projects], [str(first), str(second)])
        self.assertEqual([p["children"][0]["key"] for p in projects],
                         ["/garden/review", "/almanac/review"])
        self.assertEqual([p["children"][0]["status"] for p in projects], ["done", "planned"])
        self.assertEqual(projects[1]["needs"], ["garden"])
        self.assertFalse((shared / ".git").exists())

    def test_config_argument_can_be_relative_to_current_directory(self):
        with patch.object(build.Path, "cwd", return_value=self.base):
            self.assertEqual(self.run_build(config=Path("private/config.json")), 0)
        self.assertTrue((self.output / "overworld.html").is_file())

    def test_selected_external_symlink_keeps_resolved_source_on_descendants(self):
        alias = self.private / "alias.yaml"
        alias.symlink_to(self.source)
        self.write(self.source, nodes=[{"id": "leaf", "name": "Leaf"}])
        self.write_config(sources=["alias.yaml"])
        self.assertEqual(self.run_build(), 0)
        project = json.loads((self.output / "overworld.json").read_text())["children"][0]
        self.assertEqual(project["children"][0]["source"], str(self.source))
        self.assertEqual(project["children"][0]["key"], "/project/leaf")

    def write_ledger(self, path, items):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(yaml.safe_dump(items), encoding="utf-8")
        return path

    def test_nodes_file_supplies_nodes_and_keeps_the_ledger_as_their_source(self):
        ledger = self.write_ledger(self.base / "repo" / "docs" / "stages.yaml", [
            {"id": "S1", "name": "First", "status": "done"},
            {"id": "S2", "name": "Second", "status": "planned", "needs": ["S1"]}])
        self.write(self.source, nodes_file="../../repo/docs/stages.yaml")
        self.assertEqual(self.run_build(), 0, build.errors)
        project = json.loads((self.output / "overworld.json").read_text())["children"][0]
        self.assertEqual(project["source"], str(self.source))
        self.assertNotIn("nodes_file", project)
        self.assertEqual([c["key"] for c in project["children"]], ["/project/S1", "/project/S2"])
        self.assertEqual({c["source"] for c in project["children"]}, {str(ledger)})
        self.assertEqual(project["children"][1]["needs"], ["S1"])

    def test_nodes_file_cannot_be_combined_with_inline_nodes(self):
        self.write_ledger(self.private / "ledger.yaml", [{"id": "a", "name": "A"}])
        self.write(self.source, nodes_file="../ledger.yaml", nodes=[{"id": "b", "name": "B"}])
        self.assertEqual(self.run_build(), 1)
        self.assertTrue(any("not both" in e for e in build.errors))

    def test_nodes_file_inside_product_or_symlinked_into_it_is_rejected(self):
        inside = self.write_ledger(self.root / "maps" / "stages.yaml", [{"id": "a", "name": "A"}])
        alias = self.private / "alias-stages.yaml"
        alias.symlink_to(inside)
        for value in (str(inside), "../alias-stages.yaml"):
            with self.subTest(value=value):
                self.write(self.source, nodes_file=value)
                self.assertEqual(self.run_build(), 1)
                self.assertTrue(any("private paths must be outside" in e for e in build.errors))
        self.assertFalse(self.output.exists())

    def test_nodes_file_must_be_an_existing_yaml_list(self):
        cases = {"missing.yaml": None, "mapping.yaml": {"id": "a"}, "stages.txt": [{"id": "a", "name": "A"}]}
        for name, content in cases.items():
            with self.subTest(name=name):
                if content is not None:
                    self.write_ledger(self.private / name, content)
                self.write(self.source, nodes_file=f"../{name}")
                self.assertEqual(self.run_build(), 1)
        self.assertFalse(self.output.exists())

    def test_nodes_file_nodes_are_validated_like_inline_nodes(self):
        self.write_ledger(self.private / "ledger.yaml", [
            {"id": "a", "name": "A", "needs": ["b"]}, {"id": "b", "name": "B", "needs": ["a"]}])
        self.write(self.source, nodes_file="../ledger.yaml")
        self.assertEqual(self.run_build(), 1)
        self.assertTrue(any("dependency cycle" in e for e in build.errors))

    def test_one_ledger_cannot_feed_two_projects(self):
        self.write_ledger(self.private / "ledger.yaml", [{"id": "a", "name": "A"}])
        self.write(self.source, nodes_file="../ledger.yaml")
        self.write(self.private / "projects" / "other.yaml", id="other", nodes_file="../ledger.yaml")
        self.write_config(sources=["projects/project.yaml", "projects/other.yaml"])
        self.assertEqual(self.run_build(), 1)
        self.assertTrue(any("already used" in e for e in build.errors))

    def test_duplicate_project_ids_are_rejected_instead_of_overridden(self):
        second = self.write(self.private / "other.yaml", name="Different project")
        self.write_config(sources=[str(self.source), str(second)])
        self.last_build()
        self.assertEqual(self.run_build(), 1)
        self.assertTrue(any("duplicate sibling id" in e for e in build.errors))
        self.assert_last_build_unchanged()

    def test_duplicate_sources_including_aliases_are_rejected(self):
        alias = self.private / "alias.yaml"
        alias.symlink_to(self.source)
        self.write_config(sources=[str(self.source), str(alias)])
        self.assertEqual(self.run_build(), 1)
        self.assertTrue(any("duplicate source path" in e for e in build.errors))
        self.assertFalse(self.output.exists())

    def test_project_cycles_fail_too(self):
        a = self.write(self.private / "a.yaml", id="a", needs=["b"])
        b = self.write(self.private / "b.yaml", id="b", needs=["a"])
        build.load_maps([a, b])
        self.assertTrue(any("selected projects: dependency cycle" in e for e in build.errors))

    def test_missing_prerequisite_is_not_implicitly_enrolled(self):
        self.write(self.source, needs=["unselected"])
        self.write(self.private / "unselected.yaml", id="unselected")
        self.assertEqual(self.run_build("--check"), 1)
        self.assertTrue(any("missing from selected project sources" in e for e in build.errors))
        self.assertFalse(self.output.exists())

    def test_malformed_yaml_has_file_context(self):
        self.source.write_text("id: [unclosed", encoding="utf-8")
        self.assertEqual(self.run_build(), 1)
        self.assertTrue(any(str(self.source) + ": cannot read YAML" in e for e in build.errors))

    def test_archive_is_explicit_and_keys_survive_reordering(self):
        archive = self.private / "archive.yaml"
        archive.write_text("archive:\n- name: first\n- name: second\n", encoding="utf-8")
        self.assertEqual(build.load_maps([self.source])[1], [])
        before = {n["name"]: n["key"] for n in build.load_maps([archive])[1]}
        archive.write_text("archive:\n- name: second\n- name: first\n", encoding="utf-8")
        after = {n["name"]: n["key"] for n in build.load_maps([archive])[1]}
        self.assertEqual(before, after)
        self.assertEqual(build.errors, [])

    def test_archive_duplicate_names_across_sources_are_rejected(self):
        paths = [self.private / "one.yaml", self.private / "two.yaml"]
        for path in paths:
            path.write_text("archive:\n- name: duplicate\n", encoding="utf-8")
        build.load_maps(paths)
        self.assertTrue(any("duplicate archive name" in e for e in build.errors))

    def test_project_cannot_claim_archive_key_namespace(self):
        self.write(self.source, id="@archive", nodes=[{"id": "first", "name": "First"}])
        build.load_maps([self.source])
        self.assertTrue(any("reserved for the archive shelf" in e for e in build.errors))

    def test_archive_names_cannot_alias_escaped_path_segments(self):
        self.source.write_text("archive:\n- name: a/b\n- name: a~1b\n", encoding="utf-8")
        archive = build.load_maps([self.source])[1]
        self.assertEqual([n["key"] for n in archive], ["/@archive/a~1b", "/@archive/a~01b"])

    def test_bad_map_does_not_overwrite_last_successful_build(self):
        self.write(self.source, status="not-a-status")
        self.last_build()
        self.assertEqual(self.run_build(), 1)
        self.assert_last_build_unchanged()

    def test_complete_build_preserves_unicode_and_script_like_names(self):
        name = "Café <!--<script></script>"
        self.write(self.source, name=name)
        self.assertEqual(self.run_build(), 0)
        html = (self.output / "overworld.html").read_text(encoding="utf-8")
        self.assertEqual(html.count("</script>"), 1)
        embedded = html.split(">", 1)[1].removesuffix("</script>")
        self.assertEqual(json.loads(embedded)["children"][0]["name"], name)

    def test_invalid_configs_never_overwrite_existing_output(self):
        self.last_build()
        configs = [[], {}, {"version": True, "sources": [str(self.source)], "output_dir": "build"},
                   {"version": 2, "sources": [str(self.source)], "output_dir": "build"},
                   {"version": 1, "sources": [], "output_dir": "build"},
                   {"version": 1, "sources": "projects/*.yaml", "output_dir": "build"},
                   {"version": 1, "sources": [None], "output_dir": "build"},
                   {"version": 1, "sources": [str(self.source)], "output_dir": "build", "typo": True}]
        for data in configs:
            with self.subTest(data=data):
                self.config.write_text(json.dumps(data), encoding="utf-8")
                self.assertEqual(self.run_build(), 1)
                self.assert_last_build_unchanged()

    def test_duplicate_json_fields_are_rejected(self):
        self.config.write_text('{"version": 1, "version": 2}', encoding="utf-8")
        self.assertEqual(self.run_build(), 1)
        self.assertTrue(any("duplicate config field" in e for e in build.errors))

    def test_missing_source_fails_before_creating_output(self):
        self.source.unlink()
        self.assertEqual(self.run_build(), 1)
        self.assertFalse(self.output.exists())

    def test_private_config_inside_product_is_rejected(self):
        config = self.root / "config.json"
        config.write_text(self.config.read_text(), encoding="utf-8")
        self.assertEqual(self.run_build(config=config), 1)
        self.assertTrue(any("config: private paths" in e for e in build.errors))

    def test_external_config_symlink_into_product_is_rejected(self):
        inside = self.root / "config.json"
        self.config.rename(inside)
        self.config.symlink_to(inside)
        self.assertEqual(self.run_build(), 1)
        self.assertTrue(any("config: private paths" in e for e in build.errors))

    def test_product_config_symlink_to_external_is_also_rejected(self):
        inside = self.root / "config.json"
        inside.symlink_to(self.config)
        self.assertEqual(self.run_build(config=inside), 1)

    def test_private_source_inside_product_or_symlinked_into_it_is_rejected(self):
        inside = self.write(self.root / "maps" / "private.yaml")
        alias = self.private / "alias.yaml"
        alias.symlink_to(inside)
        for source in (inside, alias):
            with self.subTest(source=source):
                self.write_config(sources=[str(source)])
                self.assertEqual(self.run_build(), 1)
                self.assertTrue(any("source 1: private paths" in e for e in build.errors))
        self.assertFalse(self.output.exists())

    def test_private_output_inside_product_or_symlinked_into_it_is_rejected(self):
        alias = self.private / "linked-output"
        alias.symlink_to(self.root, target_is_directory=True)
        for output in (self.root / "dist", alias / "new-output"):
            with self.subTest(output=output):
                self.write_config(output_dir=str(output))
                self.assertEqual(self.run_build(), 1)
                self.assertTrue(any("output_dir: private paths" in e for e in build.errors))
        self.assertFalse((self.root / "dist").exists())
        self.assertFalse((self.root / "new-output").exists())

    def test_output_file_symlink_into_product_is_rejected_without_touching_target(self):
        target = self.root / "existing.html"
        target.write_text("original", encoding="utf-8")
        self.output.mkdir()
        (self.output / "overworld.html").symlink_to(target)
        self.assertEqual(self.run_build(), 1)
        self.assertEqual(target.read_text(), "original")
        self.assertFalse((self.output / "overworld.json").exists())

    def test_second_output_symlink_is_rejected_before_first_output_changes(self):
        target = self.root / "existing.json"
        target.write_text("original", encoding="utf-8")
        self.last_build()
        (self.output / "overworld.json").unlink()
        (self.output / "overworld.json").symlink_to(target)
        self.assertEqual(self.run_build(), 1)
        self.assertEqual(target.read_text(), "original")
        self.assertEqual((self.output / "overworld.html").read_text(), "last good build")

    def test_output_cannot_overwrite_config(self):
        config = self.private / "overworld.json"
        self.write_config(output_dir=".")
        self.config.rename(config)
        before = config.read_bytes()
        self.assertEqual(self.run_build(config=config), 1)
        self.assertEqual(config.read_bytes(), before)
        self.assertTrue(any("would overwrite an input or config" in e for e in build.errors))

    def test_invalid_output_path_fails_without_partial_writes(self):
        self.output.write_text("not a directory", encoding="utf-8")
        self.assertEqual(self.run_build(), 1)
        self.assertEqual(self.output.read_text(), "not a directory")

    def test_check_does_not_create_or_modify_output(self):
        self.assertEqual(self.run_build("--check"), 0)
        self.assertFalse(self.output.exists())
        self.last_build()
        self.assertEqual(self.run_build("--check"), 0)
        self.assert_last_build_unchanged()

    def test_unserializable_yaml_does_not_overwrite_output(self):
        self.source.write_text(self.source.read_text() + "extra: !!set {item: null}\n", encoding="utf-8")
        self.last_build()
        self.assertEqual(self.run_build(), 1)
        self.assert_last_build_unchanged()

    def test_mode_is_required_and_unknown_arguments_fail(self):
        for args in ([], ["--check"], ["--demo", "--config", str(self.config)], ["--demo", "--typo"]):
            with self.subTest(args=args), contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as caught:
                build.main(args)
            self.assertEqual(caught.exception.code, 2)
        self.assertFalse(self.output.exists())

    def test_demo_uses_only_fixed_examples_and_ignores_personal_discovery(self):
        self.write(self.root / "examples" / "signal-garden.yaml", id="fictional", name="Fictional project")
        self.write(self.root / "examples" / "garden-stewardship.yaml", id="fictional-area", name="Fictional area",
                   work_type="area", review_criteria="The fictional cases remain actionable.")
        self.write(self.root / "examples" / "unselected.yaml", id="unselected")
        self.write(self.root / "maps" / "private.yaml", id="private")
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(build.main(["--demo"]), 0)
        world = json.loads((self.root / "dist" / "demo" / "overworld.json").read_text())
        self.assertEqual([n["id"] for n in world["children"]], ["fictional", "fictional-area"])
        self.assertEqual(world["children"][0]["source"], "examples/signal-garden.yaml")
        self.assertEqual(world["children"][1]["source"], "examples/garden-stewardship.yaml")
        self.assertEqual(world["children"][1]["work_type"], "area")
        self.assertFalse(self.output.exists())

    def test_demo_refuses_symlink_source_and_redirected_output(self):
        example = self.root / "examples" / "signal-garden.yaml"
        example.parent.mkdir()
        example.symlink_to(self.source)
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(build.main(["--demo"]), 1)
        example.unlink()
        self.write(example)
        self.write(self.root / "examples" / "garden-stewardship.yaml", id="fictional-area", work_type="area")
        (self.root / "dist").symlink_to(self.private, target_is_directory=True)
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(build.main(["--demo"]), 1)
        self.assertFalse((self.private / "demo").exists())

    def test_demo_refuses_a_symlink_in_the_new_area_source(self):
        self.write(self.root / "examples" / "signal-garden.yaml", id="fictional")
        (self.root / "examples" / "garden-stewardship.yaml").symlink_to(self.source)
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(build.main(["--demo"]), 1)
        self.assertTrue(any("demo source must be a regular fictional example" in e for e in build.errors))
        self.assertFalse((self.root / "dist").exists())


if __name__ == "__main__":
    unittest.main()
