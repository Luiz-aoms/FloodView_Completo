"use strict";
const $ = (id) => document.getElementById(id);
const live = window.FloodViewLive;
const COLORS = {
  verde: "#10b981",
  amarelo: "#f59e0b",
  vermelho: "#ef4444",
  preto: "#0f172a",
  cinza: "#94a3b8",
};
const LABELS = {
  verde: "NORMAL",
  amarelo: "ATENÇÃO",
  vermelho: "ALAGAMENTO",
  preto: "CRÍTICO",
  cinza: "SEM DADOS ATUAIS",
};
let sensorsData = [],
  currentSelectedSensorId = null,
  map,
  draftMarker,
  pollTimer;
let polling = false,
  firstLoad = true;
const layers = new Map(),
  histories = new Map(),
  failures = new Set(),
  charts = new Map();
function showToast(text) {
  $("toast-text").textContent = text;
  $("toast").classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => $("toast").classList.add("hidden"), 6000);
}
function banner(title, text) {
  const box = $("alert-banner");
  box.hidden = false;
  live.notice.title = title;
  live.notice.text = text;
}
function switchTab(id) {
  $("dashboard-filters").hidden = !["dashboard", "charts"].includes(id);
  document
    .querySelectorAll(".tab-content")
    .forEach((el) => el.classList.add("hidden"));
  document
    .querySelectorAll(".nav-btn")
    .forEach((el) =>
      el.classList.remove("bg-white", "shadow-sm", "font-semibold"),
    );
  $("tab-" + id).classList.remove("hidden");
  $("nav-" + id)?.classList.add("bg-white", "shadow-sm", "font-semibold");
  document.querySelectorAll(".nav-btn").forEach((button) => {
    if (button.id === "nav-" + id) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (id === "dashboard") map?.invalidateSize();
  if (id === "charts") renderCharts();
}
function openRegisterModal() {
  $("registerModal").classList.remove("hidden");
}
function closeRegisterModal() {
  $("registerModal").classList.add("hidden");
  if (draftMarker) {
    map.removeLayer(draftMarker);
    draftMarker = null;
  }
}
function createCustomPinIcon(status) {
  return L.divIcon({
    className: "custom-pin",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -7],
    html: `<div style="position:absolute;left:5px;top:5px;box-sizing:border-box;width:14px;height:14px;border:2px solid white;border-radius:50%;background:${COLORS[status]};box-shadow:0 1px 4px #777"></div>`,
  });
}
function format(value, digits = 1) {
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
function readingFor(sensor) {
  return histories.get(sensor.dispositivoId)?.[0];
}
function height(sensor, reading) {
  return sensor.distanciaVazioCm == null || !reading
    ? null
    : Math.max(0, sensor.distanciaVazioCm - reading.distanciaCm);
}
function updateKPICounts() {
  for (const color of ["verde", "amarelo", "vermelho", "preto"])
    live.counts[color] = filteredSensors().filter((s) => s.status === color).length;
}
function renderMarkers() {
  const visible = filteredSensors();
  for (const [id, entry] of layers) {
    if (!visible.some((s) => s.id === id)) {
      map.removeLayer(entry.marker);
      map.removeLayer(entry.area);
      layers.delete(id);
    }
  }
  for (const sensor of visible) {
    let entry = layers.get(sensor.id);
    const signature = JSON.stringify([
      sensor.latitude,
      sensor.longitude,
      sensor.geometriaGeoJson,
    ]);
    if (entry && entry.signature !== signature) {
      map.removeLayer(entry.marker);
      map.removeLayer(entry.area);
      layers.delete(sensor.id);
      entry = null;
    }
    if (!entry) {
      const marker = L.marker([sensor.latitude, sensor.longitude]).addTo(map);
      const geometry =
        typeof sensor.geometriaGeoJson === "string"
          ? JSON.parse(sensor.geometriaGeoJson)
          : sensor.geometriaGeoJson;
      const area = L.geoJSON(geometry, { fillOpacity: 0.15 }).addTo(map);
      marker.on("click", () => {
        currentSelectedSensorId = sensor.id;
        updateSelectedPoint();
      });
      entry = { marker, area, signature };
      layers.set(sensor.id, entry);
    }
    entry.marker.setIcon(createCustomPinIcon(sensor.status));
    entry.area.setStyle({
      color: COLORS[sensor.status],
      fillColor: COLORS[sensor.status],
    });
    const popup = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = sensor.nome;
    const description = document.createElement("p");
    description.textContent =
      sensor.descricao || `Dispositivo ${sensor.dispositivoId}`;
    const state = document.createElement("p");
    state.textContent = LABELS[sensor.status];
    popup.append(name, description, state);
    entry.marker.bindPopup(popup);
  }
}
function updateSelectedPoint() {
  const sensor = filteredSensors().find((s) => s.id === currentSelectedSensorId);
  const reading = sensor && readingFor(sensor);
  const fresh =
    sensor && !failures.has(sensor.dispositivoId) && FloodView.current(reading);
  const value = fresh ? height(sensor, reading) : null;
  const pct =
    value !== null && sensor.cotaMaximaCm
      ? Math.max(0, Math.min(100, (value / sensor.cotaMaximaCm) * 100))
      : null;
  Object.assign(live.selected, {
    name: sensor?.nome || "Nenhum ponto encontrado",
    address: sensor
      ? sensor.descricao || `Dispositivo ${sensor.dispositivoId}`
      : "Ajuste os filtros ou cadastre um ponto no mapa.",
    level:
      value !== null
        ? `${pct === null ? "" : format(pct, 0) + "% · "}${format(value)} cm`
        : sensor && fresh
          ? "Calibração não informada"
          : "—",
    distance: reading ? `${format(reading.distanciaCm)} cm` : "—",
    updated: reading
      ? new Date(FloodView.utc(reading.recebidaEmUtc)).toLocaleTimeString(
          "pt-BR",
        )
      : "Sem leitura",
    color: COLORS[sensor?.status || "cinza"],
    status: LABELS[sensor?.status || "cinza"],
    percent: pct ?? 0,
  });
  renderMiniChart(sensor);
}
function chart(id, type, labels, datasets, options = {}) {
  if (!window.Chart) return;
  if (!charts.has(id)) {
    charts.set(
      id,
      new Chart($(id), {
        type,
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          ...options,
        },
      }),
    );
  } else {
    const instance = charts.get(id);
    instance.data.labels = labels;
    instance.data.datasets = datasets;
    instance.update("none");
  }
}
function series(sensor) {
  const readings = sensor
    ? [...(histories.get(sensor.dispositivoId) || [])].reverse()
    : [];
  return {
    labels: readings.map((r) =>
      new Date(FloodView.utc(r.recebidaEmUtc)).toLocaleTimeString("pt-BR"),
    ),
    readings,
  };
}
function renderMiniChart(sensor) {
  const data = series(sensor);
  chart(
    "dashMiniChart",
    "line",
    data.labels,
    [
      {
        label: "Distância (cm)",
        data: data.readings.map((r) => r.distanciaCm),
        borderColor: "#0f172a",
        tension: 0.3,
        pointRadius: 0,
      },
    ],
    { plugins: { legend: { display: false } } },
  );
}
function renderCharts() {
  const selected = filteredSensors().find((s) => s.id === currentSelectedSensorId),
    data = series(selected);
  chart("chartLineTrend", "line", data.labels, [
    {
      label: "Altura (m)",
      data: data.readings.map((r) => {
        const v = height(selected, r);
        return v === null ? null : v / 100;
      }),
      borderColor: "#1d4ed8",
      tension: 0.3,
      pointRadius: 0,
    },
  ]);
  chart(
    "chartBarRainfall",
    "bar",
    filteredSensors().map((s) => s.nome),
    [
      {
        label: "Altura atual (cm)",
        data: filteredSensors().map((s) =>
          s.status === "cinza" ? null : height(s, readingFor(s)),
        ),
        backgroundColor: filteredSensors().map((s) => COLORS[s.status]),
      },
    ],
  );
  chart("chartDonutStatus", "doughnut", Object.values(LABELS), [
    {
      data: Object.keys(LABELS).map(
        (c) => filteredSensors().filter((s) => s.status === c).length,
      ),
      backgroundColor: Object.values(COLORS),
    },
  ]);
  chart("chartAreaFlow", "line", data.labels, [
    {
      label: "Distância do sensor (cm)",
      data: data.readings.map((r) => r.distanciaCm),
      borderColor: "#64748b",
      tension: 0.3,
      pointRadius: 0,
    },
  ]);
}
async function refresh() {
  if (polling) return;
  clearTimeout(pollTimer);
  polling = true;
  let areasFailed = false;
  try {
    await refreshDevices();
    try {
      const areas = await FloodView.request("/api/areas-monitoradas");
      if (!Array.isArray(areas))
        throw new Error("Resposta de pontos inválida.");
      sensorsData = areas;
    } catch (error) {
      areasFailed = true;
      banner("Falha na consulta de pontos", error.message);
    }
    const ids = [
      ...new Set(
        [...registeredDevices.map(d => d.id), ...sensorsData.map(s => s.dispositivoId)],
      ),
    ];
    await Promise.all(
      ids.map(async (id) => {
        try {
          const readings = await FloodView.request(
            `/api/dispositivos/${id}/leituras?limite=60`,
          );
          if (
            !Array.isArray(readings) ||
            readings.some(
              (r) =>
                !Number.isFinite(r.distanciaCm) ||
                !Number.isFinite(FloodView.utc(r.recebidaEmUtc)),
            )
          )
            throw new Error("Leituras inválidas.");
          histories.set(
            id,
            readings.sort(
              (a, b) =>
                FloodView.utc(b.recebidaEmUtc) - FloodView.utc(a.recebidaEmUtc),
            ),
          );
          failures.delete(id);
        } catch {
          failures.add(id);
        }
      }),
    );
    for (const sensor of sensorsData)
      sensor.status = FloodView.status(
        sensor,
        readingFor(sensor),
        areasFailed || failures.has(sensor.dispositivoId),
      );
    applyDashboardFilters();
    renderDevices();
    if (firstLoad && sensorsData.length) {
      map.fitBounds(
        L.latLngBounds(sensorsData.map((s) => [s.latitude, s.longitude])),
        { maxZoom: 14, padding: [30, 30] },
      );
      firstLoad = false;
    }
    if (!areasFailed) {
      const alerts = sensorsData.filter((s) =>
        ["vermelho", "preto"].includes(s.status),
      );
      const offline = sensorsData.filter((s) => s.status === "cinza");
      banner(
        alerts.length ? "Alerta de nível da água" : "Monitoramento dos pontos",
        alerts.length
          ? alerts.map((s) => s.nome).join(", ")
          : !sensorsData.length
            ? "Nenhum ponto cadastrado. Clique no mapa para vincular o dispositivo 1."
            : offline.length
              ? `${offline.length} ponto(s) sem leituras atuais. Verifique a ponte serial.`
              : "Leituras atualizadas. Nenhum ponto em alerta.",
      );
    }
  } catch (error) {
    banner("Não foi possível atualizar o painel", error.message);
  } finally {
    polling = false;
    pollTimer = setTimeout(refresh, 3000);
  }
}
async function handleSensorRegister(event) {
  event.preventDefault();
  const button = $("btn-salvar-registro");
  if (button.disabled) return;
  const empty = Number($("sensor-empty").value),
    maximum = Number($("sensor-max").value) * 100;
  if (!(empty >= 2 && empty <= 400 && maximum > 0 && maximum <= empty)) {
    showToast(
      "A cota máxima deve ser positiva e não ultrapassar a distância com o recipiente vazio.",
    );
    return;
  }
  const latitude = Number($("sensor-lat").value),
    longitude = Number($("sensor-lng").value);
  button.disabled = true;
  try {
    const area = await FloodView.request("/api/areas-monitoradas", {
      method: "POST",
      body: JSON.stringify({
        nome: $("sensor-name").value.trim(),
        descricao: $("sensor-address").value.trim(),
        dispositivoId: Number($("sensor-device").value),
        latitude,
        longitude,
        distanciaVazioCm: empty,
        cotaMaximaCm: maximum,
        distanciaAtencaoCm: empty - maximum * 0.5,
        distanciaAlertaCm: empty - maximum * 0.75,
        distanciaCriticaCm: empty - maximum * 0.9,
        geometriaGeoJson: FloodView.circlePolygon(latitude, longitude),
      }),
    });
    currentSelectedSensorId = area.id;
    closeRegisterModal();
    $("sensorForm").reset();
    if (draftMarker) {
      map.removeLayer(draftMarker);
      draftMarker = null;
    }
    await refresh();
    showToast("Ponto salvo no banco de dados.");
  } catch (error) {
    showToast("Não foi possível salvar: " + error.message);
  } finally {
    button.disabled = false;
  }
}
async function deleteSensorById(id) {
  const sensor = sensorsData.find((s) => s.id === id);
  if (
    !sensor ||
    !confirm(
      `Excluir o ponto "${sensor.nome}"? As leituras do dispositivo serão preservadas.`,
    )
  )
    return;
  try {
    await FloodView.request(`/api/areas-monitoradas/${id}`, {
      method: "DELETE",
    });
    await refresh();
    showToast("Ponto excluído.");
  } catch (error) {
    showToast(error.message);
  }
}
function deleteSelectedSensor() {
  return deleteSensorById(currentSelectedSensorId);
}
function closeContactMessage() {
  $("contactSuccessMsg").classList.add("hidden");
  $("contactForm").querySelector('button[type="submit"]').focus();
}
async function handleContactSubmit(event) {
  event.preventDefault();
  const form = $("contactForm"),
    button = form.querySelector("button");
  if (button.disabled) return;
  const inputs = form.querySelectorAll("input"),
    select = form.querySelector("select"),
    textarea = form.querySelector("textarea");
  button.disabled = true;
  $("contactSuccessMsg").classList.add("hidden");
  try {
    const result = await FloodView.request("/api/ocorrencias", {
      method: "POST",
      body: JSON.stringify({
        nome: inputs[0].value,
        email: inputs[1].value,
        departamento: inputs[2].value,
        tipo: select.value,
        descricao: textarea.value,
      }),
    });
    $("contactSuccessText").textContent =
      `Ocorrência #${result.id} salva. ${result.mensagemEmail || "Status do e-mail não informado pela API."}`;
    $("contactSuccessMsg").classList.toggle("email-warning", !result.emailEnviado);
    $("contactSuccessMsg").classList.remove("hidden");
    form.reset();
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
}
async function triggerDefenseAlert() {
  const sensor = sensorsData.find((s) => s.id === currentSelectedSensorId);
  if (!sensor || sensor.status === "cinza") {
    showToast("Selecione um ponto com leitura atual.");
    return;
  }
  try {
    const result = await FloodView.request("/api/ocorrencias", {
      method: "POST",
      body: JSON.stringify({
        nome: "Operador local",
        tipo: "alerta",
        descricao: `${sensor.nome}: ${LABELS[sensor.status]}. Distância ${readingFor(sensor).distanciaCm} cm.`,
      }),
    });
    showToast(
      `Alerta #${result.id} salvo. ${result.mensagemEmail || "Status do e-mail não informado pela API."}`,
    );
  } catch (error) {
    showToast(error.message);
  }
}
function initMap() {
  map = L.map("map", {
    center: [2.82027, -60.67197],
    zoom: 13,
    minZoom: 2,
    maxZoom: 18,
    fullscreenControl: true,
  });
  const tiles = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { attribution: "&copy; OpenStreetMap contributors", maxZoom: 18 },
  ).addTo(map);
  tiles.on("tileerror", () =>
    showToast(
      "O mapa de ruas depende de internet. Os dados dos sensores continuam disponíveis.",
    ),
  );
  map.on("click", (e) => {
    $("sensor-lat").value = e.latlng.lat.toFixed(6);
    $("sensor-lng").value = e.latlng.lng.toFixed(6);
    if (draftMarker) map.removeLayer(draftMarker);
    draftMarker = L.marker(e.latlng).addTo(map);
    openRegisterModal();
  });
}
function updateClock() {
  live.clock = new Date().toLocaleTimeString("pt-BR");
}
window.addEventListener("load", () => {
  updateClock();
  setInterval(updateClock, 1000);
  try {
    initMap();
    refresh();
  } catch (error) {
    banner("Não foi possível iniciar o painel", error.message);
  }
});
