const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const root = path.resolve(__dirname, '..');
async function openPage() {
  const errors = [], requests = [];
  const state = { failDevices: false, distance: 20, email: false, stale: false, empty: false };
  const vc = new VirtualConsole();
  vc.on('jsdomError', error => errors.push(error.message));
  class Resources extends ResourceLoader {
    fetch(url) {
      if (!url.startsWith('http://localhost/')) return null;
      if (url.endsWith('chart.umd.js')) return Promise.resolve(Buffer.from('window.Chart = class { constructor(c,config){this.data=config.data;} update(){} };'));
      return Promise.resolve(fs.readFileSync(path.join(root, new URL(url).pathname)));
    }
  }
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'painelFloodView.html'), 'utf8'), {
    url: 'http://localhost/painelFloodView.html', runScripts: 'dangerously', resources: new Resources(),
    pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(w) {
      w.AbortController = AbortController;
      w.SVGSVGElement.prototype.createSVGRect = () => ({});
      w.fetch = async (url, options) => {
        requests.push({ url, options });
        const now = new Date(Date.now() - (state.stale ? 60000 : 0)).toISOString();
        let data;
        if (url.endsWith('/api/dispositivos')) {
          if (state.failDevices) throw Error('API indisponível');
          data = state.empty ? [] : [1, 2, 3].map(id => ({ id, nome: id === 3 ? '<b>Nano livre</b>' : `Nano ${id}`, ativo: true, pausado: false, ultimoContatoUtc: id === 3 ? null : now }));
        } else if (url.includes('areas-monitoradas')) {
          data = state.empty ? [] : [1, 2].map(id => ({ id, nome: id === 1 ? 'Estação Centro' : 'Ponto Norte', descricao: 'Rua de teste', dispositivoId: id,
            latitude: 2.82 + id / 100, longitude: -60.67, distanciaVazioCm: 26, cotaMaximaCm: 20,
            distanciaAtencaoCm: 16, distanciaAlertaCm: 11, distanciaCriticaCm: 8,
            geometriaGeoJson: { type: 'Polygon', coordinates: [[[-60.67,2.82],[-60.66,2.82],[-60.66,2.83],[-60.67,2.82]]] } }));
        } else if (url.endsWith('/api/ocorrencias')) {
          data = { id: 7, emailEnviado: state.email, mensagemEmail: state.email ? 'E-mail encaminhado ao servidor.' : 'E-mail não enviado: configure o serviço.' };
        } else {
          data = url.includes('/3/') ? [] : [{ id: 1, distanciaCm: url.includes('/2/') ? 8 : state.distance, recebidaEmUtc: now }];
        }
        return { ok: true, text: async () => JSON.stringify(data) };
      };
    }
  });
  await new Promise(resolve => dom.window.addEventListener('load', resolve, { once: true }));
  await new Promise(resolve => setTimeout(resolve, 40));
  return { dom, errors, state, requests };
}
function filter(w, key, value) {
  const input = w.document.getElementById('filter-' + key);
  input.value = value;
  input.dispatchEvent(new w.Event(key === 'search' ? 'input' : 'change'));
}
test('All devices include unlinked sensors, escape names and distinguish stale readings', async () => {
  const app = await openPage(), w = app.dom.window;
  try {
    assert.deepEqual(app.errors, []);
    assert.equal(w.FloodViewLive.devices.rows.length, 3);
    assert.equal(w.FloodViewLive.devices.rows[2].points, 'Sem ponto vinculado');
    assert.equal(w.FloodViewLive.devices.rows[2].status, 'Sem leituras');
    assert.equal(w.document.querySelector('.fv-device-table b'), null);
    assert.equal(w.FloodViewLive.devices.rows[0].status, 'Recebendo leituras');
    app.state.stale = true; await w.refresh(); await w.Vue.nextTick();
    assert.equal(w.FloodViewLive.devices.rows[0].status, 'Sem leitura recente');
    app.state.failDevices = true; await w.refresh();
    assert.match(w.FloodViewLive.devices.error, /Não foi possível/);
    assert.equal(w.FloodViewLive.devices.rows[0].status, 'Consulta indisponível');
  } finally { w.close(); }
});
test('Combined filters update map layers, counts, selection and charts; empty results clear old data', async () => {
  const app = await openPage(), w = app.dom.window;
  try {
    assert.equal(w.eval('layers.size'), 2);
    filter(w, 'search', 'estacao');
    assert.equal(w.eval('layers.size'), 1);
    assert.equal(w.FloodViewLive.counts.verde, 1);
    assert.equal(w.FloodViewLive.counts.preto, 0);
    filter(w, 'device', '2');
    assert.equal(w.eval('layers.size'), 0);
    assert.equal(w.FloodViewLive.selected.level, '—');
    w.switchTab('charts');
    assert.equal(w.eval('charts.get("chartBarRainfall").data.labels.length'), 0);
    w.clearDashboardFilters(); filter(w, 'status', 'preto');
    assert.equal(w.FloodViewLive.selected.name, 'Ponto Norte');
    assert.equal(w.eval('layers.size'), 1);
    await w.refresh();
    assert.equal(w.eval('layers.size'), 1);
    assert.equal(w.document.getElementById('filter-status').value, 'preto');
    w.clearDashboardFilters();
    assert.equal(w.eval('layers.size'), 2);
    assert.deepEqual(app.errors, []);
  } finally { w.close(); }
});
test('Vue updates live values and an empty database clears device rows', async () => {
  const app = await openPage(), w = app.dom.window;
  try {
    assert.match(w.FloodViewLive.selected.level, /6,0 cm/);
    app.state.distance = 8; await w.refresh(); await w.Vue.nextTick();
    assert.match(w.document.getElementById('selected-level-text').textContent, /18,0 cm/);
    app.state.empty = true; await w.refresh();
    assert.equal(w.FloodViewLive.devices.rows.length, 0);
    assert.equal(w.eval('layers.size'), 0);
    assert.deepEqual(app.errors, []);
  } finally { w.close(); }
});
test('Occurrence result distinguishes saved record from email submission', async () => {
  const app = await openPage(), w = app.dom.window;
  try {
    const form = w.document.getElementById('contactForm');
    const inputs = form.querySelectorAll('input');
    inputs[0].value = 'Teste'; inputs[1].value = 'operador@example.test'; inputs[2].value = 'Equipe';
    form.querySelector('textarea').value = 'Descrição de teste';
    await w.handleContactSubmit({ preventDefault() {} });
    const result = w.document.getElementById('contactSuccessMsg');
    assert.match(result.textContent, /#7 salva.*não enviado/);
    assert.equal(result.classList.contains('email-warning'), true);
    app.state.email = true;
    await w.handleContactSubmit({ preventDefault() {} });
    assert.match(result.textContent, /encaminhado/);
    assert.equal(result.classList.contains('email-warning'), false);
    assert.equal(app.requests.filter(r => r.url.endsWith('/api/ocorrencias')).length, 2);
  } finally { w.close(); }
});
test('Mobile sidebar opens devices screen and closes with Escape', async () => {
  const app = await openPage(), w = app.dom.window, d = w.document;
  try {
    w.innerWidth = 390; w.dispatchEvent(new w.Event('resize'));
    const toggle = d.getElementById('sidebar-toggle');
    toggle.click(); d.getElementById('nav-devices').click();
    assert.equal(d.getElementById('tab-devices').classList.contains('hidden'), false);
    assert.equal(d.getElementById('dashboard-filters').hidden, true);
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');
    toggle.click(); d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape' }));
    assert.equal(d.activeElement, toggle);
    assert.deepEqual(app.errors, []);
  } finally { w.close(); }
});
