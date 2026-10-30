const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'js', 'mission.js');
const original = fs.readFileSync(sourcePath, 'utf8');
const instrumented = original.replace(/\}\)\(\);\s*$/, 'globalThis.__audit={builders,conicPoint,hyperbolaPoint};})();');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeClassList() {
  const values = new Set();
  return {
    add(...items) { items.forEach(x => values.add(x)); },
    remove(...items) { items.forEach(x => values.delete(x)); },
    toggle(item, force) {
      if (force === undefined) force = !values.has(item);
      force ? values.add(item) : values.delete(item);
      return force;
    }
  };
}

function makeElement(tag = 'div') {
  const el = {
    tagName: tag.toUpperCase(),
    children: [],
    classList: makeClassList(),
    style: {},
    disabled: false,
    textContent: '',
    innerHTML: '',
    value: '',
    nodeType: 1,
    appendChild(child) { this.children.push(child); return child; },
    append(...children) { this.children.push(...children); },
    querySelector(selector) {
      if (selector === 'button') return this.children.find(x => x.tagName === 'BUTTON') || null;
      return null;
    },
    setPointerCapture() {},
    setAttribute() {}
  };
  return el;
}

function makeCanvasContext() {
  const gradient = { addColorStop() {} };
  return new Proxy({}, {
    get(target, prop) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
      if (prop === 'measureText') return text => ({ width: String(text).length * 12 });
      if (!(prop in target)) target[prop] = () => {};
      return target[prop];
    },
    set(target, prop, value) { target[prop] = value; return true; }
  });
}

function createSandbox(level) {
  const elements = new Map();
  const selectors = [
    '#level-name', '#intro-screen', '#lesson-screen', '#result-screen',
    '#intro-kicker', '#intro-title', '#intro-text', '#start-button', '#stage-number',
    '#stage-title', '#stage-copy', '#stage-count', '#telemetry', '#scene-caption',
    '#physics-line', '#control-deck', '#result-title', '#result-text', '#next-level',
    '#again-button', '#intro-canvas', '#mission-canvas', '#mission-route', '#step-list',
    '#overall-count', '#sidebar-stage-count', '#mission-time', '#lesson-time', '#resource-panel',
    '#resource-name', '#resource-value', '#resource-track', '#resource-bar', '#resource-status',
    '#previous-step', '#retry-step', '#show-hint', '#hint-bubble', '#pause-button', '#sound-button'
  ];
  selectors.forEach(selector => elements.set(selector, makeElement(selector.includes('canvas') ? 'canvas' : 'div')));
  elements.get('#intro-canvas').getContext = () => makeCanvasContext();
  elements.get('#mission-canvas').getContext = () => makeCanvasContext();
  const raf = [];
  const sandbox = {
    console,
    Math,
    Set,
    URLSearchParams,
    location: { search: `?level=${level}` },
    performance: { now: () => 0 },
    setTimeout(fn) { return fn; },
    requestAnimationFrame(fn) { raf.push(fn); return raf.length; },
    document: {
      querySelector(selector) { return elements.get(selector); },
      createElement(tag) { return makeElement(tag); },
      addEventListener() {}
    },
    window: {}
  };
  sandbox.globalThis = sandbox;
  return { sandbox, elements, raf };
}

const expectedStages = [0, 3, 2, 3, 4, 4, 5, 4, 5];
const autoStages = new Set(['2:1']);
for (let level = 1; level <= 8; level++) {
  const { sandbox, elements, raf } = createSandbox(level);
  vm.runInNewContext(instrumented, sandbox, { filename: sourcePath });
  assert(sandbox.__audit, `第 ${level} 关未能初始化`);
  const lesson = sandbox.__audit.builders[level]();
  lesson.init();
  assert(lesson.stages.length === expectedStages[level], `第 ${level} 关步骤数量错误`);
  for (let stage = 0; stage < lesson.stages.length; stage++) {
    lesson.stage = stage;
    lesson.stageTime = 0;
    elements.get('#control-deck').children = [];
    lesson.setup();
    lesson.update(0.016);
    lesson.draw(makeCanvasContext(), 0);
    assert(elements.get('#control-deck').children.length > 0 || autoStages.has(`${level}:${stage}`), `第 ${level} 关第 ${stage + 1} 步缺少操作`);
  }
  if (raf[0]) raf[0](16);
}

{
  const { sandbox } = createSandbox(1);
  vm.runInNewContext(instrumented, sandbox, { filename: sourcePath });
  const { conicPoint, hyperbolaPoint } = sandbox.__audit;
  const ellipseNear = conicPoint(0, 0, 100, 300, 0);
  const ellipseFar = conicPoint(0, 0, 100, 300, Math.PI);
  const hyperNear = hyperbolaPoint(0, 0, 120, 1.25, 0);
  assert(Math.abs(Math.hypot(ellipseNear.x, ellipseNear.y) - 100) < 1e-8, '椭圆近心点计算错误');
  assert(Math.abs(Math.hypot(ellipseFar.x, ellipseFar.y) - 300) < 1e-8, '椭圆远心点计算错误');
  assert(Math.abs(Math.hypot(hyperNear.x, hyperNear.y) - 120) < 1e-8, '双曲线近心点计算错误');
}

{
  const { sandbox } = createSandbox(3);
  vm.runInNewContext(instrumented, sandbox, { filename: sourcePath });
  const lesson = sandbox.__audit.builders[3]();
  lesson.init();
  lesson.stage = 1;
  lesson.setup();
  for (let i = 0; i < 100 && !lesson.waitingAtPeriapsis; i++) lesson.update(0.1);
  assert(lesson.waitingAtPeriapsis, '第三关第二步没有在再次到达近月点时进入持续等待');
  const heldTheta = lesson.orbitTheta;
  lesson.update(5);
  assert(lesson.orbitTheta === heldTheta && !lesson.stage0Button.disabled, '第三关第二步按钮等待时间仍然过短');
}

{
  const { sandbox } = createSandbox(5);
  vm.runInNewContext(instrumented, sandbox, { filename: sourcePath });
  const low = sandbox.__audit.builders[5]();
  low.init(); Object.assign(low, { stage: 3, alt: 100, siteX: 0, vz: 2, throttle: 25 }); low.update(1);
  const high = sandbox.__audit.builders[5]();
  high.init(); Object.assign(high, { stage: 3, alt: 100, siteX: 0, vz: 2, throttle: 100 }); high.update(1);
  assert(low.vz > 2 && high.vz < 2, '第五关推力没有按月球重力关系改变下降速度');
}

const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (let level = 1; level <= 8; level++) {
  assert(home.includes(`mission.html?level=${level}`), `首页缺少第 ${level} 关入口`);
}

const requiredIdeas = ['霍曼', '双曲线', '月球重力', '上升级', '中途修正', '水平速度', '相对速度'];
for (const idea of requiredIdeas) assert(original.includes(idea), `缺少教学概念：${idea}`);

const mission = fs.readFileSync(path.join(root, 'mission.html'), 'utf8');
for (const id of ['mission-route','step-list','mission-time','lesson-time','previous-step','retry-step','show-hint','pause-button','sound-button','resource-panel']) {
  assert(mission.includes(`id="${id}"`), `V4 界面缺少 ${id}`);
}

for (const feature of ['objectLabel','drawRoverTracks','drawFootprints','drawLunarGround','playTone','warning']) {
  assert(original.includes(feature), `V4 缺少反馈或场景能力：${feature}`);
}

console.log('V4 科学与运行审计通过：8 关、30 个操作步骤、轨道端点、步骤回退界面及首页入口均正常。');
