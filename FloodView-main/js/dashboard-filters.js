"use strict";
let registeredDevices = [];
const dashboardFilters = { search: '', device: '', status: '' };
const normalized = text => String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function filteredSensors() {
  return sensorsData.filter(s =>
    (!dashboardFilters.search || normalized(`${s.nome} ${s.descricao || ''}`).includes(normalized(dashboardFilters.search))) &&
    (!dashboardFilters.device || String(s.dispositivoId) === dashboardFilters.device) &&
    (!dashboardFilters.status || s.status === dashboardFilters.status));
}
function applyDashboardFilters() {
  const visible = filteredSensors();
  if (!visible.some(s => s.id === currentSelectedSensorId)) currentSelectedSensorId = visible[0]?.id ?? null;
  live.filterSummary = `${visible.length} de ${sensorsData.length} ponto(s). Filtros aplicados ao mapa, indicadores e gráficos.`;
  updateKPICounts();
  if (map) renderMarkers();
  updateSelectedPoint();
  if (!$('tab-charts').classList.contains('hidden')) renderCharts();
}
function clearDashboardFilters() {
  for (const key of Object.keys(dashboardFilters)) {
    dashboardFilters[key] = '';
    $('filter-' + key).value = '';
  }
  applyDashboardFilters();
}
async function refreshDevices() {
  try {
    const devices = await FloodView.request('/api/dispositivos');
    if (!Array.isArray(devices) || devices.some(d => !Number.isInteger(d.id) || typeof d.nome !== 'string'))
      throw new Error('Resposta de dispositivos inválida.');
    registeredDevices = devices;
    live.devices.error = '';
    const select = $('filter-device');
    const options = devices.map(d => [String(d.id), `#${d.id} · ${d.nome}`]);
    if (select.dataset.options !== JSON.stringify(options)) {
      select.replaceChildren(new Option('Todos os dispositivos', ''));
      options.forEach(([value, label]) => select.add(new Option(label, value)));
      if (dashboardFilters.device && !devices.some(d => String(d.id) === dashboardFilters.device)) dashboardFilters.device = '';
      select.value = dashboardFilters.device;
      select.dataset.options = JSON.stringify(options);
    }
  } catch (error) {
    live.devices.error = `Não foi possível consultar os dispositivos. ${error.message}`;
  } finally {
    live.devices.loading = false;
  }
}
function renderDevices() {
  live.devices.rows = registeredDevices.map(d => {
    const reading = histories.get(d.id)?.[0];
    const unavailable = !!live.devices.error || failures.has(d.id);
    const fresh = !unavailable && FloodView.current(reading);
    const status = !d.ativo ? 'Desativado' : d.pausado ? 'Pausado' : unavailable ? 'Consulta indisponível' : fresh ? 'Recebendo leituras' : reading ? 'Sem leitura recente' : 'Sem leituras';
    const points = sensorsData.filter(s => s.dispositivoId === d.id);
    return { id: d.id, name: d.nome, status,
      active: fresh && d.ativo && !d.pausado,
      points: points.map(s => s.nome).join(', ') || 'Sem ponto vinculado',
      distance: reading ? `${format(reading.distanciaCm)} cm` : '—',
      updated: d.ultimoContatoUtc ? new Date(FloodView.utc(d.ultimoContatoUtc)).toLocaleString('pt-BR') : 'Nunca recebeu leitura' };
  });
}
for (const key of Object.keys(dashboardFilters)) {
  $('filter-' + key).addEventListener(key === 'search' ? 'input' : 'change', event => {
    dashboardFilters[key] = event.target.value.trim();
    applyDashboardFilters();
  });
}
