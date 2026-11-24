// Vue controls only these small HTML regions, never the map, forms or charts.
window.FloodViewLive = (() => {
  const state = Vue.reactive({
    clock: "00:00:00",
    counts: { verde: 0, amarelo: 0, vermelho: 0, preto: 0 },
    devices: { rows: [], loading: true, error: "" },
    filterSummary: "Consultando pontos…",
    notice: {
      title: "Conectando à plataforma",
      text: "Consultando pontos e leituras na API local.",
    },
    selected: {
      name: "Nenhum ponto selecionado",
      address: "Aguardando consulta",
      level: "—",
      distance: "—",
      updated: "Sem leitura",
      status: "SEM DADOS ATUAIS",
      color: "#94a3b8",
      percent: 0,
    },
    home: {
      point: "Dispositivo 1",
      connection: "Consultando",
      connected: false,
      value: "—",
      unit: "Aguardando dados do sensor",
      status: "Consultando",
    },
  });
  // Each region uses its existing HTML as the Vue template.
  // v-text escapes values from the API; no HTML from user data is executed.
  document.querySelectorAll("[data-live-values]").forEach((element) => {
    Vue.createApp({ setup: () => ({ live: state }) }).mount(element);
  });
  return state;
})();
