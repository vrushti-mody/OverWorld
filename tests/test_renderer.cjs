const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

// Exercise the actual renderer's data/state functions without a browser or a copy of their logic.
const template = fs.readFileSync(path.join(__dirname, '../web/template.html'), 'utf8');
function section(start, end) {
  const first = template.indexOf(start);
  const last = template.indexOf(end, first);
  assert.ok(first >= 0 && last > first, `Renderer section missing: ${start}`);
  return template.slice(first, last);
}
const source = [
  section('const WORLD=', '// ---------- spotlight'),
  section('function draftFor(', 'let undoDraft='),
  section('function specChanged(', '// ---------- local changes'),
  `globalThis.api = {
    world: WORLD, get: key => byKey.get(key), status, progress, completionHeight, flags, setStatus, recordSteps, specChanged,
    get edits() { return edits }, get conflicts() { return conflicts },
    loadDrafts(value) { edits=value; resetToSource(); applyEdits() }
  };`,
].join('\n');

function app(children, stored = {}) {
  const world = { id: 'world', key: '', kind: 'world', children };
  const storage = new Map([['ow-edits-v2', JSON.stringify(stored)]]);
  const context = vm.createContext({
    document: { getElementById: () => ({ textContent: JSON.stringify(world) }) },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    matchMedia: () => ({ matches: false }),
  });
  vm.runInContext(source, context);
  return context.api;
}

const project = (id, children, extra = {}) => ({ id, name: id, kind: 'project', children, ...extra });
const leaf = (id, status = 'planned', extra = {}) => ({ id, name: id, kind: 'task', status, ...extra });

test('identical sibling-local IDs keep independent drafts across projects', () => {
  const a = app([project('first', [leaf('task')]), project('second', [leaf('task')])]);
  a.setStatus(a.get('/first/task'), 'done');
  assert.equal(a.status(a.get('/first/task')), 'done');
  assert.equal(a.status(a.get('/second/task')), 'planned');
  assert.deepEqual(Object.keys(a.edits), ['/first/task']);
});

test('a full checklist does not verify a task or its parent', () => {
  const a = app([project('p', [leaf('task', 'partial', { steps: [{ name: 'Try it', done: true }] })])]);
  assert.equal(a.progress(a.get('/p/task')), 1);
  assert.equal(a.status(a.get('/p/task')), 'partial');
  assert.equal(a.status(a.get('/p')), 'partial');
  a.setStatus(a.get('/p/task'), 'done');
  assert.equal(a.status(a.get('/p')), 'done');
});

test('finishing every case keeps an area ongoing and cannot unlock a completion prerequisite', () => {
  const a = app([
    project('garden', [leaf('spring', 'done')], { work_type: 'area', review_criteria: 'Beds remain usable.' }),
    project('report', [leaf('publish')], { needs: ['garden'] }),
  ]);
  const area = a.get('/garden');
  assert.equal(a.progress(area), 1, 'finite case progress remains available');
  assert.equal(a.status(area), 'partial');
  assert.equal(a.completionHeight(area), 0, 'an area has no completion height');
  assert.equal(a.flags(area).noGoal, false);
  assert.equal(a.flags(area).noReview, false);
  assert.equal(a.flags(a.get('/report/publish')).ready, false);
  assert.equal(a.flags(a.get('/report/publish')).blocked, true);
  assert.equal(a.completionHeight(a.get('/garden/spring')), 1);
});

test('an empty area prompts for review criteria and never becomes a NEXT task', () => {
  const a = app([project('garden', [], { work_type: 'area' })]);
  const area = a.get('/garden');
  assert.equal(a.flags(area).noGoal, false);
  assert.equal(a.flags(area).noReview, true);
  assert.equal(a.flags(area).ready, false);
  assert.equal(a.status(area), 'planned');
  for (const terminal of ['done', 'live']) {
    a.setStatus(area, terminal);
    assert.equal(a.status(area), 'planned');
    assert.deepEqual(Object.keys(a.edits), []);
  }
});

test('changing a project into an area holds old completion drafts while preserving child drafts', () => {
  for (const terminal of ['done', 'live']) {
    const a = app([project('garden', [leaf('spring')], { work_type: 'area' })], {
      '/garden': { baseStatus: null, status: terminal },
      '/garden/spring': { baseStatus: 'planned', status: 'done' },
    });
    assert.equal(a.status(a.get('/garden')), 'partial');
    assert.equal(a.status(a.get('/garden/spring')), 'done');
    assert.equal(a.edits['/garden'].status, terminal, 'held draft remains recoverable');
    assert.equal(a.conflicts.length, 1);
    assert.equal(a.conflicts[0].key, '/garden');
    assert.match(a.conflicts[0].reason, /ongoing area/);
  }
});

test('recorded completion with an incomplete prerequisite is surfaced without rewriting the fact', () => {
  const a = app([project('p', [leaf('truth', 'partial'), leaf('score', 'done', {needs:['truth']}), leaf('arena', 'planned', {needs:['score']})])]);
  assert.equal(a.status(a.get('/p/score')), 'done');
  assert.equal(a.flags(a.get('/p/score')).inconsistent, true);
  assert.equal(a.flags(a.get('/p/arena')).ready, false);
  assert.equal(a.flags(a.get('/p/arena')).blocked, true);
  a.setStatus(a.get('/p/truth'), 'done');
  assert.equal(a.flags(a.get('/p/score')).inconsistent, false);
  assert.equal(a.flags(a.get('/p/arena')).ready, true);
});

test('dependency health traverses shared prerequisites without treating a diamond as a cycle', () => {
  const a = app([project('p', [leaf('base','done'),leaf('left','done',{needs:['base']}),leaf('right','done',{needs:['base']}),leaf('end','planned',{needs:['left','right']})])]);
  assert.equal(a.flags(a.get('/p/end')).ready, true);
});

test('project and component prerequisites gate nested leaf readiness', () => {
  const a = app([
    project('gate', [], { status: 'planned' }),
    project('p', [
      { id: 'base', name: 'Base', status: 'planned', children: [leaf('base-task')] },
      { id: 'dependent', name: 'Dependent', needs: ['base'], children: [leaf('task', 'partial')] },
    ], { needs: ['gate'] }),
  ]);
  const n = a.get('/p/dependent/task');
  assert.equal(a.flags(n).ready, false);
  assert.equal(a.flags(n).blocked, true);
  a.setStatus(a.get('/gate'), 'done');
  assert.equal(a.flags(n).ready, false);
  a.setStatus(a.get('/p/base/base-task'), 'done');
  // Explicit parent status is still a fact; changing its child does not silently erase that fact.
  assert.equal(a.flags(n).ready, false);
  a.setStatus(a.get('/p/base'), 'done');
  assert.equal(a.flags(n).ready, true);
});

test('a rebuilt source holds back conflicting status edits', () => {
  const a = app([project('p', [leaf('task', 'waiting')])], {
    '/p/task': { baseStatus: 'planned', status: 'done' },
  });
  assert.equal(a.status(a.get('/p/task')), 'waiting');
  assert.equal(a.conflicts.length, 1);
  assert.equal(a.edits['/p/task'].status, 'done');
});

test('reordered checklists do not receive old index-based edits', () => {
  const a = app([project('p', [leaf('task', 'partial', {
    steps: [{ name: 'Second', done: false }, { name: 'First', done: false }],
  })])], {
    '/p/task': { baseSteps: [false, false], stepNames: ['First', 'Second'], steps: [true, false] },
  });
  assert.equal(a.get('/p/task').steps[0].done, false);
  assert.equal(a.get('/p/task').steps[1].done, false);
  assert.equal(a.conflicts.length, 1);
});

test('accepted source changes remove an already-applied draft', () => {
  const a = app([project('p', [leaf('task', 'done')])], {
    '/p/task': { baseStatus: 'planned', status: 'done' },
  });
  assert.equal(Object.keys(a.edits).length, 0);
  assert.equal(a.conflicts.length, 0);
});

test('spec changes reopen terminal built tasks and built downstream descendants', () => {
  const a = app([project('p', [
    leaf('start', 'done'),
    { id: 'dependent', name: 'Dependent', needs: ['start'], children: [leaf('built', 'done'), leaf('future')] },
    leaf('unrelated', 'done'),
  ])]);
  a.specChanged(a.get('/p/start'));
  assert.equal(a.status(a.get('/p/start')), 'drift');
  assert.equal(a.status(a.get('/p/dependent/built')), 'drift');
  assert.equal(a.status(a.get('/p/dependent/future')), 'planned');
  assert.equal(a.status(a.get('/p/unrelated')), 'done');
});

test('nested spec changes propagate through ancestor contracts to dependent branches', () => {
  const a = app([project('p', [
    { id: 'base', name: 'Base', status: 'done', children: [leaf('task', 'done')] },
    { id: 'dependent', name: 'Dependent', status: 'done', needs: ['base'], children: [leaf('task', 'done')] },
    leaf('unrelated', 'done'),
  ])]);
  a.specChanged(a.get('/p/base/task'));
  assert.equal(a.status(a.get('/p/base/task')), 'drift');
  assert.equal(a.status(a.get('/p/base')), 'drift');
  assert.equal(a.status(a.get('/p/dependent/task')), 'drift');
  assert.equal(a.status(a.get('/p/dependent')), 'drift');
  assert.equal(a.status(a.get('/p/unrelated')), 'done');
});

test('malformed saved draft entries cannot stop the map from loading', () => {
  for (const entry of [null, 42, { baseSteps: [false], stepNames: ['Check'], steps: true }]) {
    const a = app([project('p', [leaf('task', 'planned', { steps: [{ name: 'Check', done: false }] })])], {
      '/p/task': entry,
    });
    assert.equal(a.status(a.get('/p/task')), 'planned');
    assert.equal(a.get('/p/task').steps[0].done, false);
  }
});
