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
  const shares = [], updates = [], alerts = [];
  const screen = loadScreen('src/screens/InvoiceDetailScreen.tsx', 'handleViewPDF, handleSend, updateStatus', {
    'react-native': { Alert: { alert: (...args) => alerts.push(args) } },
    '../context/AuthContext': { useAuth: () => ({ user: { displayName: 'Pumps' } }) },
    'firebase/firestore': { getFirestore() {}, doc() {}, updateDoc: async (_ref, data) => updates.push(data) },
    'expo-print': { printToFileAsync: async () => ({ uri: 'file:///invoice.pdf', numberOfPages: 1 }) },
    'expo-sharing': { isAvailableAsync: async () => true, shareAsync: async uri => shares.push(uri) },
  }, { invoice: { id: 'i', clientName: 'Customer', lineItems: [], renderedHtml: '<html>saved invoice</html>' } });
  const h = screen.render(); await h.handleViewPDF(); await h.handleSend();
  assert.deepEqual(shares, ['file:///invoice.pdf', 'file:///invoice.pdf']);
  // Expo resolves with no result on Back as well as when a target is chosen.
  assert.equal(updates.length, 0, 'closing sharing must not mark an invoice sent');
  assert.equal(alerts.length, 0, 'closing sharing must not show a send-success alert');
  await h.updateStatus('sent');
  assert.equal(updates[0].status, 'sent');
  assert.equal(typeof updates[0].sentDate, 'string');
  assert.equal(alerts[0][0], 'Success', 'explicit status changes still confirm success');
}

async function newInvoiceSharing() {
  const alerts = [], writes = [], shares = [], updates = [];
  const screen = loadScreen('src/screens/InvoiceScreen.tsx', 'handleGenerateInvoice, setClientName', {
    'react-native': { Alert: { alert: (...args) => alerts.push(args) } },
    '../context/AuthContext': { useAuth: () => ({ user: { uid: 'u' } }) },
    'date-fns': { format: () => '2026-10-23', addDays: () => new Date() },
    'firebase/firestore': {
      doc() {}, collection() {}, getDoc: async () => ({ exists: () => true }),
      runTransaction: async () => 1,
      addDoc: async (_ref, invoice) => { writes.push(invoice); return { id: 'new-invoice' }; },
      updateDoc: async (_ref, data) => updates.push(data),
    },
    '../utils/invoiceTemplate': { buildConcretePumpInvoiceHtml: () => '<html>invoice</html>' },
    'expo-print': { printToFileAsync: async () => ({ uri: 'file:///new-invoice.pdf' }) },
    'expo-sharing': { isAvailableAsync: async () => true, shareAsync: async uri => shares.push(uri) },
  });
  screen.render().setClientName('Customer');
  await screen.render().handleGenerateInvoice();
  assert.equal(writes.length, 1); assert.equal(writes[0].status, 'draft');
  assert.equal(alerts.length, 1);
  await alerts[0][2].find(button => button.text === 'Send Now').onPress();
  assert.deepEqual(shares, ['file:///new-invoice.pdf']);
  assert.equal(updates.length, 0, 'backing out of Send Now leaves the saved draft unchanged');
  assert.equal(alerts.length, 1, 'no extra success alert after closing sharing');
}

async function savedJobInvoiceNavigation() {
  const { StackRouter, StackActions, CommonActions } = require('@react-navigation/routers');
  for (const fromDetail of [false, true]) {
    const router = StackRouter({ initialRouteName: 'MainApp' });
    const options = { routeNames: ['MainApp', 'AddJob', 'Invoice', 'JobDetail'], routeParamList: {}, routeGetIdList: {} };
    let state = router.getInitialState(options);
    if (fromDetail) state = router.getStateForAction(state, StackActions.push('JobDetail'), options);
    state = router.getStateForAction(state, StackActions.push('AddJob'), options);
    let saves = 0, releaseSave;
    const pendingSave = new Promise(resolve => { releaseSave = resolve; });
    const screen = loadScreen('src/screens/AddjobScreen.tsx', 'handleSave, setAddress, setCity, setYards, setGenerateInvoice', {
      '@react-navigation/native': {
        CommonActions,
        useRoute: () => ({ params: {} }),
        useNavigation: () => ({ dispatch: action => { state = router.getStateForAction(state, action, options); } }),
      },
      '../context/AuthContext': { useAuth: () => ({ user: { uid: 'u', role: 'owner' } }) },
      '../context/JobsContext': { useJobs: () => ({ addJob: async () => { saves++; await pendingSave; return 'saved-job-id'; } }) },
      'firebase/firestore': { getFirestore() {} },
      'date-fns': { format: () => '2026-10-24' },
    });
    const h = screen.render(); h.setAddress('123 Main'); h.setCity('Test'); h.setYards('8'); h.setGenerateInvoice(true);
    const ready = screen.render();
    const saving = ready.handleSave();
    await ready.handleSave();
    assert.equal(saves, 1, 'rapid second Save must not create another job');
    assert.equal(state.routes[state.index].name, 'AddJob', 'wait for job persistence before invoice navigation');
    releaseSave(); await saving;
    assert.equal(state.routes.length, 2);
    assert.equal(state.routes[0].name, 'MainApp');
    assert.equal(state.routes[0].params.screen, 'Home');
    assert.equal(state.routes[state.index].name, 'Invoice');
    assert.equal(state.routes[state.index].params.jobs[0].id, 'saved-job-id');
    assert.equal(state.routes[state.index].params.jobs[0].amount, 350);
    state = router.getStateForAction(state, CommonActions.goBack(), options);
    assert.equal(state.routes[state.index].name, 'MainApp', 'Back and invoice completion return home');
    assert.equal(state.routes.some(route => route.name === 'AddJob'), false, 'saved form is no longer reachable');
    assert.equal(saves, 1);
  }
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
  await registration(); await invoiceSharing(); await newInvoiceSharing(); await savedJobInvoiceNavigation(); dragButton();
  console.log('PASS: save once before invoice creation, return Home without saved form, registration, cancelled sharing, explicit Sent update, PDF URI, drag and cleanup.');
})().catch(error => { console.error(error); process.exitCode = 1; });


