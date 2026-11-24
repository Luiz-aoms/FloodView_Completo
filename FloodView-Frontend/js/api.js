window.FloodView = (() => {
  const api = window.FLOODVIEW_API || "https://localhost:7064";
  async function request(path, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(api + path, {
        cache: "no-store",
        ...options,
        headers: { "Content-Type": "application/json", ...options.headers },
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) {
        let detail = text;
        try {
          const error = JSON.parse(text);
          detail = error.detail || error.title || text;
        } catch {}
        throw new Error(detail || `HTTP ${response.status}`);
      }
      return text ? JSON.parse(text) : null;
    } catch (error) {
      if (error.name === "AbortError")
        throw new Error("A API demorou a responder.");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  function utc(value) {
    if (typeof value !== "string") return NaN;
    const text = value.trim();
    return Date.parse(/(?:Z|[+-]\d{2}:\d{2})$/i.test(text) ? text : text + "Z");
  }
  function current(reading, now = Date.now()) {
    const age = reading ? now - utc(reading.recebidaEmUtc) : NaN;
    return Number.isFinite(age) && age >= -5000 && age <= 30000;
  }
  function status(area, reading, failed = false) {
    if (failed || !current(reading)) return "cinza";
    if (
      area.distanciaCriticaCm !== null &&
      area.distanciaCriticaCm !== undefined &&
      reading.distanciaCm <= area.distanciaCriticaCm
    )
      return "preto";
    if (reading.distanciaCm <= area.distanciaAlertaCm) return "vermelho";
    if (reading.distanciaCm <= area.distanciaAtencaoCm) return "amarelo";
    return "verde";
  }
  function circlePolygon(lat, lng, radius = 1000) {
    const coordinates = [],
      angular = radius / 6371000;
    const phi = (lat * Math.PI) / 180,
      lambda = (lng * Math.PI) / 180;
    for (let i = 0; i < 64; i++) {
      const bearing = (2 * Math.PI * i) / 64;
      const phi2 = Math.asin(
        Math.sin(phi) * Math.cos(angular) +
          Math.cos(phi) * Math.sin(angular) * Math.cos(bearing),
      );
      const lambda2 =
        lambda +
        Math.atan2(
          Math.sin(bearing) * Math.sin(angular) * Math.cos(phi),
          Math.cos(angular) - Math.sin(phi) * Math.sin(phi2),
        );
      coordinates.push([(lambda2 * 180) / Math.PI, (phi2 * 180) / Math.PI]);
    }
    coordinates.push([...coordinates[0]]);
    return { type: "Polygon", coordinates: [coordinates] };
  }
  return { request, utc, current, status, circlePolygon };
})();
