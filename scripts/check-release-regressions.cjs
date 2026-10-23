const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

// Exercise screen handlers without contacting Firebase or opening native UI.
function loadScreen(file, exposed, modules = {}, props = {}) {
  let states = [], cursor = 0;
  const effects = [];
  const react = {
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], v => { states[i] = v; }]; },
    useRef(value) { const i = cursor++; if (!(i in states)) states[i] = { current: value }; return states[i]; },
    useEffect(fn) { effects.push(fn); },
  };
  const source = fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')
    .replace('  return (\n    <', `  globalThis.handlers = { ${exposed} }; return null;\n  return (\n    <`);
  assert(source.includes('globalThis.handlers'), 'screen instrumentation point exists');
  const context = { exports: {}, console, setTimeout, clearTimeout, require(name) {
    if (name in modules) return modules[name];
    if (name === 'react') return react;
    if (name.includes('theme')) return { useAppTheme: () => ({ colors: {} }), makeStyles: () => () => ({}) };
    if (name === '@react-navigation/native') return { useNavigation: () => ({ goBack() {} }), useRoute: () => ({ params: props }) };
    if (name === 'react-native') return { Alert: { alert() {} } };
    return {};
  }};
  vm.createContext(context);
  vm.runInContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText, context);
  function render() { cursor = 0; context.exports.default(props); return context.handlers; }
  return { render, effects };
}

async function registration() {
  for (const role of ['owner', 'employee']) {
    const calls = [];
    const screen = loadScreen('src/screens/RegisterScreen.tsx', 'handleRegister, setName, setEmail, setPassword, setConfirmPassword, setBusinessName, setWorkIndependently', {
      '../context/AuthContext': { useAuth: () => ({ register: async (...args) => calls.push(args) }) },
    }, { role });
    const h = screen.render();
    h.setName('Tester'); h.setEmail('tester@example.com'); h.setPassword('password123'); h.setConfirmPassword('password123'); h.setBusinessName('Pumps'); h.setWorkIndependently(true);
    await screen.render().handleRegister();
    assert.equal(calls.length, 1, 'one registration request per valid submission');
    assert.equal(calls[0][3].role, role);
    if (role === 'employee') assert.equal(calls[0][3].ownerStatus, 'none');
  }
}

async function invoiceSharing() {
  const shares = [], updates = [];
  const screen = loadScreen('src/screens/InvoiceDetailScreen.tsx', 'handleViewPDF, handleSend', {
    '../context/AuthContext': { useAuth: () => ({ user: { displayName: 'Pumps' } }) },
    'firebase/firestore': { getFirestore() {}, doc() {}, updateDoc: async (_ref, data) => updates.push(data) },
    'expo-print': { printToFileAsync: async () => ({ uri: 'file:///invoice.pdf', numberOfPages: 1 }) },
    'expo-sharing': { isAvailableAsync: async () => true, shareAsync: async uri => shares.push(uri) },
  }, { invoice: { id: 'i', clientName: 'Customer', lineItems: [], renderedHtml: '<html>saved invoice</html>' } });
  const h = screen.render(); await h.handleViewPDF(); await h.handleSend();
  assert.deepEqual(shares, ['file:///invoice.pdf', 'file:///invoice.pdf']);
  assert.equal(updates[0].status, 'sent');
}

function dragButton() {
  let responder, position, cleanup;
  const routes = [];
  class ValueXY {
    constructor(value) { this.value = { ...value }; this.offset = { x: 0, y: 0 }; this.listeners = new Map(); this.x = { setValue: x => this.setValue({ ...this.value, x }) }; this.y = { setValue: y => this.setValue({ ...this.value, y }) }; position = this; }
    emit() { for (const fn of this.listeners.values()) fn({ x: this.value.x + this.offset.x, y: this.value.y + this.offset.y }); }
    setValue(v) { this.value = { ...v }; this.emit(); }
    extractOffset() { this.offset = { x: this.offset.x + this.value.x, y: this.offset.y + this.value.y }; this.value = { x: 0, y: 0 }; this.emit(); }
    flattenOffset() { this.value = { x: this.offset.x + this.value.x, y: this.offset.y + this.value.y }; this.offset = { x: 0, y: 0 }; this.emit(); }
    addListener(fn) { this.listeners.set('listener', fn); return 'listener'; }
    removeListener(id) { this.listeners.delete(id); }
  }
  const screen = loadScreen('src/components/DraggableFAB.tsx', 'position', {
    '@react-navigation/native': { useNavigation: () => ({ navigate: route => routes.push(route) }) },
    'react-native': {
      Dimensions: { get: () => ({ width: 400, height: 800 }) }, Vibration: { vibrate() {} },
      PanResponder: { create: handlers => { responder = handlers; return { panHandlers: {} }; } },
      Animated: { ValueXY, event: () => (_evt, gesture) => position.setValue({ x: gesture.dx, y: gesture.dy }), spring: (p, options) => ({ start: () => p.setValue(options.toValue) }) },
    },
  }, { variant: 'invoice' });
  screen.render(); cleanup = screen.effects[0]();
  function drag(dx, dy) { responder.onPanResponderGrant(); responder.onPanResponderMove(null, { dx, dy }); responder.onPanResponderRelease(null, { dx, dy }); }
  drag(30, -30); assert.equal(position.value.x, 202); assert.equal(position.value.y, 650);
  drag(30, -30); assert.equal(position.value.x, 232); assert.equal(position.value.y, 620);
  drag(1000, -1000); assert.equal(position.value.x, 344); assert.equal(position.value.y, 0);
  responder.onPanResponderGrant(); responder.onPanResponderRelease(null, { dx: 0, dy: 0 });
  assert.equal(routes[0], 'Invoice'); assert.equal(position.value.x, 172); assert.equal(position.value.y, 680);
  cleanup(); assert.equal(position.listeners.size, 0);
}

(async () => {
  await registration(); await invoiceSharing(); dragButton();
  console.log('PASS: single registration request, owner/employee registration data, PDF sharing URI, repeated drag, bounds, invoice button action and cleanup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
