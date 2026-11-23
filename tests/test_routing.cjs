const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const template = fs.readFileSync(path.join(__dirname, '../web/template.html'), 'utf8');
const first = template.indexOf('function layers(');
const last = template.indexOf('function wrap(', first);
assert.ok(first >= 0 && last > first);
const context = vm.createContext({});
vm.runInContext(template.slice(first, last) + '\nglobalThis.routing={layers,routeDagEdges};', context);
const { layers, routeDagEdges } = context.routing;

const WIDTH = 182, HEIGHT = 58, COLUMN = 250, ROW = 88;
function layout(nodes) {
  const pos = new Map();
  layers(nodes).forEach((row, i) => row.forEach((n, j) => {
    pos.set(n.id, { x: i * COLUMN, y: (j - (row.length - 1) / 2) * ROW });
  }));
  const edges = nodes.flatMap(n => (n.needs || []).map(id => ({ a: id, b: n.id })));
  return { pos, edges, routes: routeDagEdges(edges, pos, WIDTH, HEIGHT, COLUMN) };
}

// A node is an obstacle except at the two intentional connection ports.
function assertClearLane(edge, route, pos) {
  assert.equal(route.kind, 'lane');
  for (let i = 1; i < route.points.length; i++) {
    const a = route.points[i - 1], b = route.points[i];
    assert.ok(a[0] === b[0] || a[1] === b[1], 'bypass segments are orthogonal');
    for (const [id, p] of pos) {
      if (id === edge.a || id === edge.b) continue;
      const left = p.x - WIDTH / 2, right = p.x + WIDTH / 2;
      const top = p.y - HEIGHT / 2, bottom = p.y + HEIGHT / 2;
      const crosses = a[0] === b[0]
        ? a[0] > left && a[0] < right && Math.max(a[1], b[1]) > top && Math.min(a[1], b[1]) < bottom
        : a[1] > top && a[1] < bottom && Math.max(a[0], b[0]) > left && Math.min(a[0], b[0]) < right;
      assert.equal(crosses, false, `${edge.a} → ${edge.b} must not pass through ${id}`);
    }
  }
}

test('Fictional Source → Summary bypasses Transform instead of entering it', () => {
  const graph = layout([
    { id: 'S1' }, { id: 'S2', needs: ['S1'] }, { id: 'S3', needs: ['S1', 'S2'] },
    { id: 'S4', needs: ['S1'] }, { id: 'S5', needs: ['S4'] }, { id: 'S6', needs: ['S1'] },
    { id: 'S7', needs: ['S3', 'S4'] }, { id: 'S8', needs: ['S4'] }, { id: 'S9', needs: ['S7'] },
    { id: 'S10', needs: ['S6'] }, { id: 'S11', needs: ['S1'] }, { id: 'S12', needs: ['S7'] },
    { id: 'ops1' }, { id: 'ops2' },
  ]);
  const bypass = graph.edges.find(e => e.a === 'S1' && e.b === 'S3');
  const direct = graph.edges.find(e => e.a === 'S2' && e.b === 'S3');
  assertClearLane(bypass, graph.routes.get(bypass), graph.pos);
  assert.equal(graph.routes.get(direct).kind, 'curve');
  assert.notDeepEqual(graph.routes.get(bypass).points.at(-1), graph.routes.get(direct).points.at(-1), 'separate incoming ports');
  assert.match(graph.routes.get(bypass).path, / Q/, 'bypass corners are rounded');
});

test('all long links clear intervening boxes, even in crowded uneven layers', () => {
  const nodes = Array.from({ length: 5 }, (_, i) => ({ id: `a${i}` }));
  for (let i = 0; i < 8; i++) nodes.push({ id: `b${i}`, needs: [`a${i % 5}`] });
  for (let i = 0; i < 6; i++) nodes.push({ id: `c${i}`, needs: [`b${i}`, `a${i % 5}`] });
  for (let i = 0; i < 4; i++) nodes.push({ id: `d${i}`, needs: [`c${i}`, `a${i}`, `b${i + 1}`] });
  const graph = layout(nodes);
  for (const edge of graph.edges) {
    const route = graph.routes.get(edge);
    assert.ok(!route.path.includes('NaN'));
    if (route.kind === 'lane') assertClearLane(edge, route, graph.pos);
    const start = route.points[0], end = route.points.at(-1);
    assert.equal(start[0], graph.pos.get(edge.a).x + WIDTH / 2);
    assert.equal(end[0], graph.pos.get(edge.b).x - WIDTH / 2 - 4);
    assert.ok(Math.abs(start[1] - graph.pos.get(edge.a).y) < HEIGHT / 2);
    assert.ok(Math.abs(end[1] - graph.pos.get(edge.b).y) < HEIGHT / 2);
  }
});

test('overlapping bypasses have separate lanes and stable routes', () => {
  const graph = layout([
    { id: 'a' }, { id: 'b', needs: ['a'] }, { id: 'c', needs: ['a', 'b'] },
    { id: 'd', needs: ['a', 'b', 'c'] }, { id: 'e', needs: ['a', 'c', 'd'] },
  ]);
  const bypasses = graph.edges.filter(e => graph.routes.get(e).kind === 'lane');
  for (let i = 0; i < bypasses.length; i++) {
    const a = graph.routes.get(bypasses[i]).points;
    for (let j = i + 1; j < bypasses.length; j++) {
      const b = graph.routes.get(bypasses[j]).points;
      if (a[2][0] < b[3][0] && a[3][0] > b[2][0]) {
        assert.ok(Math.abs(a[2][1] - b[2][1]) >= 14);
      }
    }
  }
  const reversed = routeDagEdges([...graph.edges].reverse(), graph.pos, WIDTH, HEIGHT, COLUMN);
  graph.edges.forEach(e => assert.equal(reversed.get(e).path, graph.routes.get(e).path));
});

test('simple adjacent dependencies retain a smooth left-to-right curve', () => {
  const graph = layout([{ id: 'a' }, { id: 'b', needs: ['a'] }]);
  const route = graph.routes.get(graph.edges[0]);
  assert.equal(route.kind, 'curve');
  assert.match(route.path, /^M91,0 C/);
  assert.deepEqual(Array.from(route.points.at(-1)), [155, 0]);
});
