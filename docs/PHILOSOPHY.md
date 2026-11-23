# Overworld — philosophy

For people and agents who build or maintain this kind of view. The goal is not "a dashboard"; it is
**progress at a glance, across many projects, without reading** — and, underneath that, a habit:
**purpose and observable success come before tasks.**

Overworld is also a shared planning discipline: people and agents use the same contract to divide work,
visualize it, and track its state. [PLANNING.md](PLANNING.md) turns that discipline into a practical guide.
The map reveals gaps; it cannot guarantee sound assumptions or invent the correct plan on its own.

## Experience review

During development, review the whole workflow as well as the requested feature. Challenge assumptions
when the model does not fit the work; check whether progress and completion communicate useful meaning.
Consider visual comprehension, reading effort, and the burden of organizing and maintaining the data.
Propose concrete improvements with reasoning and evidence, separating observed findings, proposed
changes, and implemented behavior. This review habit does not itself authorize broader implementation.

## 0. Goals first

A map can only show progress toward something. So the unit of Overworld is not the task, it is the goal:

| Level | Question it answers | Field |
|---|---|---|
| Goal | why does this project exist? | `goal` |
| Finish line | what is true on the day it is done? | `done_when` |
| Components | what has to exist for the finish line to be true? | child nodes |
| Tasks | what testable step moves a component forward? | leaf nodes with `done_when` / `check` |
| Steps | what do I physically do next, in order? | `steps` checklist |

Finite work has a finish line. An ongoing area can hold multiple finite cases and needs observable
review criteria instead of invented permanent completion. [ONBOARDING.md](ONBOARDING.md) proposes one
canonical purpose document and domain guidance. The renderer recognizes top-level `work_type: area`
and shows optional `review_criteria` in place of a permanent finish line; it does not assess area health
or schedule reviews.

A finite project without a finish line is drawn with a violet bullseye ◎ and listed under **Needs a finish line** in
the rail, above Stuck. For finite work, an accepted sentence of `done_when` makes progress meaningful;
ongoing areas instead retain finite cases with their own finish lines. Do not invent permanent completion
or interpret finished cases as a health assessment of their area. Requirements will change;
when they do, edit the goal or finish line, mark the
affected node **Spec changed**, and the affected built work turns pink (re-validate): the node itself,
built descendants, and built downstream dependents. Unfinished work stays unfinished. The map shows the
cost of a requirement change instead of hiding it; the changed goal or finish line still belongs in the
source file.

## 1. The problem it solves

A person with many projects has three questions, several times a day:
*where is everything?* · *what is actually moving?* · *what should I touch next?*

Every common tool answers one and loses the others:

| Tool | Keeps | Loses |
|---|---|---|
| Kanban | state | hierarchy, dependencies |
| Gantt | time, dependencies | hierarchy, "what now" |
| Tree / outline | hierarchy | dependencies, state at a glance |
| KPI dashboard | numbers | structure; numbers must be read |
| "Ask the LLM for a summary" | everything | you have to read again, every time |

Reading is the expensive operation (doubly so for a dyslexic reader). So the design rule is:
**every answer the person needs must be visible as colour, size, position or motion before any word is read.**

## 2. One graph, three truths

Every project is one graph. Each node carries three independent truths, and each truth gets its own channel so they never fight:

| Truth | Relation | Shown by |
|---|---|---|
| **Hierarchy** — what is part of what | `children` | zoom level (you are inside the parent) |
| **Dependency** — what must be true first | `needs` | position: prerequisites on the left, arrows → right |
| **State** — where it stands and how alive it is | `status`, `touched`, `due`, `check` | colour, ring, fade, pulse, chips |

The same node shape is used at each graph depth (project → component → task); optional steps are checklists
inside task cards. A node with children opens a smaller map drawn with the same rules.
One vocabulary, learned once.

## 3. Semantic zoom instead of an accordion

Expanding things in place (accordions, nested lists) produces walls. Zooming replaces the whole canvas with
the inside of one node and leaves a breadcrumb behind. Two consequences:

- Only one level is ever on screen, so the eye has a fixed amount to scan.
- The parent's summary (progress ring, `3/7`, NEXT count) is the only thing that leaks upward. Detail never
  leaks up; aggregates never leak down.

The camera is continuous: clicking zooms *into* the node, then the inside grows into place from where the
node was. Each level remembers its camera, so Back or a breadcrumb returns to the same place. Editing a
status or checking a step preserves that position. A task opens in focus beside its card; it should not
disappear behind the card. **− / +** change scale and **Fit** restores an overview of the current level.
Reduced motion keeps the same destinations without requiring the animation.

## 4. Position encodes dependency

Inside a node, children are laid out as a layered DAG: layer = longest path of `needs`, left to right.
Ready work tends toward the left; NEXT also checks status and the inherited prerequisite chain. Position
alone does not decide what to do next. Arrows take the colour of their source, so a green arrow means
"fed by something finished" and a grey one means "fed by something that
doesn't exist yet". Hovering lights the full upstream and downstream chain; everything else dims.

Long arrows route around intervening boxes. An arrow must never appear to enter an unrelated node on
its way to the actual target. Separate ports preserve the distinction between direct and indirect routes.

## 5. One variable per channel

| Channel | Variable | Why this pairing |
|---|---|---|
| Hue | status | categories → hue; the eye pre-attentively sorts by colour |
| Size | weight / scope | magnitude → area |
| Ring | weighted progress estimate | a ratio → a partial circle; includes checklist activity, not only verification |
| Opacity | recency of `touched` | "fading away" is literally what stale work does |
| Pulse | touched in 48 h | motion = alive, used nowhere else |
| Stroke | mode (campaign / practice / fallow / idea) | commitment level → line weight / dash |
| Violet (the accent) | NEXT and the selected node | reserved for "act here"; never used for status |
| Chip | due date, STUCK, WAIT, `?` | short words only where colour can't carry the meaning |

Semantic colours (good / warning / critical) are kept separate from the accent, and no channel is double-booked.
Someone who learns the legend once can read any project, including ones they have never seen.

## 6. Derived, never typed

The source file holds **facts**: status, needs, dates, the check command. The view computes **judgments**:

- NEXT = planned/in-progress leaf, every direct and inherited prerequisite chain done/live
- STUCK = planned/idea/in-progress work with an unmet direct or inherited prerequisite chain
- stale = in progress or live, untouched > 14 days
- overdue = `due` passed, not done
- progress = weighted child progress; leaves use verified completion, checklist ratio, or partial/drift credit

These progress estimates apply to finite work. Ongoing area roots omit completion rings/percentages,
never derive done/live from their children, and cannot serve as hard completion prerequisites. Their
activity/blocker statuses and finite child progress do not establish area health.

Nobody is allowed to type a flag the system can compute. Derived flags stay consistent with the recorded
facts, but cannot establish that those facts or the plan's assumptions are correct.
Where the status itself was inferred by an agent, it carries a `?` so the person knows to confirm.
A component's dependencies gate the tasks inside it, and a project's dependencies gate its components.
When no explicit finite parent status is recorded, the view derives done only when all non-dropped children
are done/live. This rollup does not independently verify integration; a full checklist ring alone does
not verify the parent.

Recorded completion and dependency readiness are separate facts. When a done/live node still has an
incomplete prerequisite chain, retain its recorded colour and add **Check dependencies**, with the reason
in its card and rail. Do not silently mark it unfinished, or let that mismatch unlock later work. The model
may need a narrower prerequisite contract; the UI must make that question visible instead of deciding it.

## 7. The map answers "where", the rail answers "what now"

Beside the map, lists are plain queries over the graph: **Next up**, **Needs a finish line**, **Stuck (and
why)**, **Check dependencies**, **Re-validate**, **Waiting**, and **Stale**. Waiting reasons live in task
notes; the current rail does not yet show every waiting component or its reason. At world level they cover the portfolio.
Inside a project they follow that project, so unrelated work does not compete with the current task.
**All projects** brings back the wider view. Each row jumps to its node. This is the actionable surface;
the map is the orienting surface. Keeping them side by side is what turns a pretty picture into a daily tool.

## 8. Interaction grammar: two gestures

- **Hover = preview.** Light the chain, show one line of context. Nothing changes.
- **Click = commit.** Zoom in if the node has insides; focus it and open its card if it doesn't.
- **Esc / breadcrumb = back.** Return to the previous level and its remembered camera.

A pinned node (card open) keeps its chain lit while you look around. Its prerequisites and **Unlocks** are
clickable, so following a dependency uses the same focus gesture. The grammar stays the same at every depth.

## 9. Text budget

A node shows at most three words plus glyphs. Sentences (`done_when`, `check`, notes) live in the card,
which opens only on request. Fonts are chosen for readability under dyslexia (Lexend for labels, Atkinson
Hyperlegible for prose), spacing is generous, and the only numbers on the map are ratios like `3/7`.

## 10. Honesty on the surface

The page states its `as of` date, shows guessed statuses with `?`, and shows rule violations instead of
hiding them ("4 campaigns, rule says 3"). A map that flatters is a map that stops being opened.

## 11. The world level is a map, not a list

Projects are packed circles inside domain regions (Systems, Content, Career, Life, Money). Gestalt grouping
does the sorting; size and ring do the ranking; fade shows what is drifting. Dormant projects sit on an
archive shelf as small dots: still visible (the long tail is real information: "so many projects"), but quiet.

## 11b. The 3D view

The world level can tilt into 3D: domains sit on a ring of floors, each project floats above its floor at a
height equal to its estimated progress, with a stem and a shadow down to the floor so height is readable.
The axis describes estimated finite progress; checklist activity can fill that estimate without verification.
Ongoing areas stay at a neutral floor height, with no completion height or ring. The view answers one
question the flat map can't: *which finite projects are high (nearly done) and which are flat on the ground?* It is
hand-rolled perspective on SVG (no WebGL), so it keeps the exact same grammar: hover lights chains, click
enters, legend spotlights. 2D stays the default reading view; 3D is for the "stand back and look" moment.

## 11c. Touching the map

Status can be changed from a node's card. Ticking steps updates the checklist without declaring the task
done. **Mark verified** is an explicit manual assertion that the finish line has been checked. The page
shows a `check` command when one exists, but never executes it; a click must not be presented as evidence
that an automated test ran. **Spec changed** marks affected built work `drift` for re-validation.

Those edits live in the viewer's browser only, shown as a "N local changes" bar. **Copy for agent** turns
them into a short list to paste into Codex, Claude, or Gemini. An agent reviews the list and writes accepted
changes into the YAML. The page never becomes the source of truth and does not silently sync drafts.

Drafts identify nodes by their full ancestry path and remember the values they started from. If a new
build changes those values, the page warns about the conflict. A stale local edit must not quietly replace
a newer source fact. The legend doubles as a spotlight: click a status (or NEXT / STUCK / ◎) and everything
else dims.

## 12. Source of truth is text

One explicitly selected YAML source per project stays outside the product. The builder reads those files
and optionally uses `git log` for repository recency, then supplies the graph to the renderer. The UI adds
a visible local-draft overlay while the person explores edits. Git is optional; when used, it keeps history
and supports reviewing accepted changes as a diff. Several projects may share a repository; its boundary
does not define their goals or identity. The UI never owns accepted project facts.

## v4 design handoff

Keep the world-level view for orientation across real projects. Inside one project, use the continuous
camera and focused task card to make the dependency map easy to act on. Direct status changes shorten
the feedback loop; separate verification and visible draft/conflict states keep that convenience honest.
These are refinements of one graph and one interaction grammar, not reasons to create another task store.

## Recipe for other agents

1. Define one node vocabulary (id, name, status, needs, children, touched, due, check) and use it at every depth.
2. Assign each truth to its own channel; never let two variables share one.
3. Store facts, compute judgments. Mark inferred facts.
4. Zoom, don't expand. One level on screen; aggregates leak up, detail never does.
5. Lay out by dependency: prerequisites left, arrows right, chain lights on hover.
6. Ship the "what now" rail with the map; the rail is the product.
7. Keep chrome identical at every level, so the person learns the UI once.
8. Keep the text budget: three words on the map, sentences in the card.
