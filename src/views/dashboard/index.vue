<script>
import { LMap, LTileLayer, LMarker, LTooltip, LCircleMarker, LPolyline } from "@vue-leaflet/vue-leaflet";
import { latLng } from "leaflet";
import Layout from "@/layouts/main.vue";
import ViewSos from "@/views/sos/view_sos.vue";
import api from "@/services/api";
import { getApiBaseUrl } from "@/utils/apiBase";

const ANGOLA_CENTER = latLng(-12.3, 17.5);
const ANGOLA_ZOOM = 5;
const ESTADOS_ATIVOS = ["pendente", "em_atendimento"];
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

export default {
  name: "DashboardIndex",
  components: { Layout, LMap, LTileLayer, LMarker, LTooltip, LCircleMarker, LPolyline, ViewSos },
  data() {
    return {
      userName: "",
      quarteis: [],
      provincias: [],
      mapLoading: true,
      mapError: null,
      showViewSos: false,
      viewSosAlertaId: null,
      mapTileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      mapAttribution: "&copy; <a href=\"http://osm.org/copyright\">OpenStreetMap</a>",
      center: ANGOLA_CENTER,
      zoom: ANGOLA_ZOOM,
      mapFullscreen: false,
      alertasAtivos: [],
      wsAlertas: null,
      routeByAlertaId: {},
      filterTipo: null,
      filterProvinciaId: null,
      filterModo: "todos",
      userHasInteracted: false,
      alertAudioContext: null,
      // Estatísticas para cards e gráficos
      statsResumo: null,
      statsResumoLoading: false,
      statsResumoError: null,
      statsUltimos30Dias: [],
      statsUltimos30DiasLoading: false,
      statsTopQuarteis: [],
      statsTopQuarteisLoading: false,
      statsTopAreas: [],
      statsTopAreasLoading: false,
    };
  },
  computed: {
    quarteisComCoordenadas() {
      return this.quarteis.filter((q) => {
        const lat = Number(q.latitude);
        const lng = Number(q.longitude);
        return Number.isFinite(lat) && Number.isFinite(lng);
      });
    },
    quartelIdsEmOcorrencia() {
      const ids = new Set();
      this.allRouteSegments.forEach((seg) => {
        if (seg.quartelId) ids.add(seg.quartelId);
      });
      return ids;
    },
    quarteisFiltrados() {
      let list = this.quarteisComCoordenadas;
      if (this.filterModo === "nenhum") return [];
      if (this.filterTipo) {
        list = list.filter((q) => (q.tipo || "").toLowerCase() === this.filterTipo);
      }
      if (this.filterProvinciaId) {
        list = list.filter((q) => q.id_provincia === this.filterProvinciaId);
      }
      if (this.filterModo === "em_ocorrencia") {
        list = list.filter((q) => this.quartelIdsEmOcorrencia.has(q.id));
      }
      return list;
    },
    provinciaOptions() {
      const opts = [{ value: null, text: "Todas as províncias" }];
      this.provincias.forEach((p) => opts.push({ value: p.id, text: p.nome }));
      return opts;
    },
    alertasComPosicao() {
      return this.alertasAtivos.filter((a) => {
        const lat = this.posicaoAlerta(a).lat;
        const lng = this.posicaoAlerta(a).lng;
        return Number.isFinite(lat) && Number.isFinite(lng);
      });
    },
    allRouteSegments() {
      const out = [];
      this.alertasComPosicao.forEach((a) => {
        const segs = this.routeByAlertaId[a.id] || [];
        segs.forEach((s) => out.push({ ...s, alertaId: a.id }));
      });
      return out;
    },
    // Dados para gráficos (ApexCharts)
    chartUltimos30DiasSeries() {
      const data = this.statsUltimos30Dias || [];
      return [
        {
          name: "Ocorrências",
          data: data.map((d) => d.total),
        },
      ];
    },
    chartUltimos30DiasOptions() {
      const data = this.statsUltimos30Dias || [];
      return {
        chart: { type: "bar", toolbar: { show: false }, height: 260 },
        dataLabels: { enabled: false },
        stroke: { curve: "smooth", width: 2 },
        xaxis: {
          categories: data.map((d) =>
            new Date(d.dia).toLocaleDateString("pt-AO", { day: "2-digit", month: "2-digit" })
          ),
          labels: { rotate: -45 },
        },
        yaxis: { labels: { formatter: (v) => Math.round(v) } },
        colors: ["#0d6efd"],
      };
    },
    chartTopQuarteisSeries() {
      const data = this.statsTopQuarteis || [];
      return [
        {
          name: "Ocorrências",
          data: data.map((d) => d.total_alertas),
        },
      ];
    },
    chartTopQuarteisOptions() {
      const data = this.statsTopQuarteis || [];
      return {
        chart: { type: "bar", toolbar: { show: false }, height: 260 },
        plotOptions: { bar: { horizontal: true } },
        dataLabels: { enabled: false },
        xaxis: {
          categories: data.map((d) => d.nome_quartel),
          labels: { formatter: (v) => Math.round(v) },
        },
        colors: ["#198754"],
      };
    },
    chartTopAreasSeries() {
      const data = this.statsTopAreas || [];
      return data.map((d) => d.total_alertas);
    },
    chartTopAreasOptions() {
      const data = this.statsTopAreas || [];
      return {
        chart: { type: "donut", height: 260 },
        labels: data.map((d) => d.area),
        legend: { position: "bottom" },
      };
    },
  },
  mounted() {
    this.setUserName();
    this.fetchProvincias();
    this.fetchQuarteis().then(() => {
      this.fetchAlertasAtivos();
    });
    this.fetchDashboardStats();
    this.connectWsAlertas();
    document.addEventListener("fullscreenchange", this.onFullscreenChange);
    this.unlockAudioOnFirstInteraction();
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  },
  beforeUnmount() {
    this.disconnectWsAlertas();
    document.removeEventListener("fullscreenchange", this.onFullscreenChange);
    document.removeEventListener("click", this.handleFirstUserInteraction);
    document.removeEventListener("keydown", this.handleFirstUserInteraction);
    if (this.alertAudioContext && this.alertAudioContext.close) {
      this.alertAudioContext.close().catch(() => {});
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  },
  methods: {
    posicaoAlerta(a) {
      const lat = a.ultima_latitude != null ? a.ultima_latitude : a.latitude;
      const lng = a.ultima_longitude != null ? a.ultima_longitude : a.longitude;
      return { lat: Number(lat), lng: Number(lng) };
    },
    getWsAlertasUrl() {
      const base = getApiBaseUrl();
      const wsBase = base.replace(/^http/, "ws");
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null;
      if (!token) return null;
      return `${wsBase}/api/v1/ws/alertas?token=${encodeURIComponent(token)}`;
    },
    handleFirstUserInteraction() {
      if (this.userHasInteracted) return;
      this.userHasInteracted = true;
      document.removeEventListener("click", this.handleFirstUserInteraction);
      document.removeEventListener("keydown", this.handleFirstUserInteraction);
      const C = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
      if (C) {
        const ctx = new C();
        if (ctx.resume) ctx.resume().then(() => {}).catch(() => {});
        this.alertAudioContext = ctx;
      }
    },
    unlockAudioOnFirstInteraction() {
      document.addEventListener("click", this.handleFirstUserInteraction, { once: false });
      document.addEventListener("keydown", this.handleFirstUserInteraction, { once: false });
    },
    connectWsAlertas() {
      this.disconnectWsAlertas();
      const url = this.getWsAlertasUrl();
      if (!url) return;
      try {
        const ws = new WebSocket(url);
        ws.onopen = () => {};
        ws.onmessage = (ev) => this.onWsAlertasMessage(ev);
        ws.onerror = () => {};
        ws.onclose = () => {
          this.wsAlertas = null;
        };
        this.wsAlertas = ws;
      } catch (_) {
        /* ignore */
      }
    },
    disconnectWsAlertas() {
      if (this.wsAlertas) {
        try {
          this.wsAlertas.close();
        } catch (_) {
          /* ignore */
        }
        this.wsAlertas = null;
      }
    },
    alertarNovoSOS(alerta) {
      this.playAlertaSonoro();
      this.vibrarAlerta();
      this.notificarNovoSOS(alerta);
    },
    playAlertaSonoro() {
      if (!this.userHasInteracted || !this.alertAudioContext) return;
      try {
        const ctx = this.alertAudioContext;
        if (ctx.state === "suspended" && ctx.resume) {
          ctx.resume().then(() => this.playAlertaSonoroBeep()).catch(() => {});
          return;
        }
        this.playAlertaSonoroBeep();
      } catch (_) {
        /* ignore */
      }
    },
    playAlertaSonoroBeep() {
      try {
        const ctx = this.alertAudioContext;
        if (!ctx) return;
        const play = (frequency, start, duration) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = frequency;
          osc.type = "sine";
          gain.gain.setValueAtTime(0.3, start);
          gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
          osc.start(start);
          osc.stop(start + duration);
        };
        play(880, 0, 0.15);
        play(880, 0.25, 0.15);
        play(880, 0.5, 0.2);
      } catch (_) {
        /* ignore */
      }
    },
    vibrarAlerta() {
      if (!this.userHasInteracted) return;
      try {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 200]);
        }
      } catch (_) {
        /* ignore */
      }
    },
    notificarNovoSOS(alerta) {
      try {
        if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
        const n = new Notification("Novo SOS – SOS Angola", {
          body: `Novo alerta #${alerta.id} no mapa. Verifique o dashboard.`,
          icon: "/favicon.ico",
          tag: "sos-" + alerta.id,
          requireInteraction: true,
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      } catch (_) {
        /* ignore */
      }
    },
    onWsAlertasMessage(ev) {
      try {
        const msg = JSON.parse(ev.data);
        const evento = msg.evento;
        if (evento === "novo_alerta" && msg.alerta) {
          const a = msg.alerta;
          if (ESTADOS_ATIVOS.includes(a.estado)) {
            const idx = this.alertasAtivos.findIndex((x) => x.id === a.id);
            const isNovo = idx < 0;
            if (idx >= 0) this.alertasAtivos.splice(idx, 1, a);
            else this.alertasAtivos.push(a);
            this.updateRoutesForAlerta(a);
            if (isNovo) this.alertarNovoSOS(a);
          }
        } else if (evento === "localizacao_atualizada" && msg.alerta_id) {
          const id = msg.alerta_id;
          const lat = msg.ultima_latitude;
          const lng = msg.ultima_longitude;
          const a = this.alertasAtivos.find((x) => x.id === id);
          if (a && Number.isFinite(lat) && Number.isFinite(lng)) {
            a.ultima_latitude = lat;
            a.ultima_longitude = lng;
            this.$forceUpdate();
            this.updateRoutesForAlerta(a);
          }
        } else if (evento === "alerta_encerrado" && msg.alerta_id) {
          const id = msg.alerta_id;
          this.alertasAtivos = this.alertasAtivos.filter((x) => x.id !== id);
          const next = { ...this.routeByAlertaId };
          delete next[id];
          this.routeByAlertaId = next;
        }
      } catch (_) {
        /* ignore parse error */
      }
    },
    abrirViewSos(alertaId) {
      this.viewSosAlertaId = alertaId;
      this.showViewSos = true;
    },
    async fetchAlertasAtivos() {
      try {
        const [r1, r2] = await Promise.all([
          api.get("/alertas/", { params: { estado: "pendente", limit: 100 } }),
          api.get("/alertas/", { params: { estado: "em_atendimento", limit: 100 } }),
        ]);
        const list = [...(Array.isArray(r1.data) ? r1.data : []), ...(Array.isArray(r2.data) ? r2.data : [])];
        const byId = new Map();
        list.forEach((a) => {
          if (ESTADOS_ATIVOS.includes(a.estado)) byId.set(a.id, a);
        });
        this.alertasAtivos = Array.from(byId.values());
        this.alertasAtivos.forEach((a) => this.updateRoutesForAlerta(a));
      } catch (_) {
        /* ignore; alertas ativos remain empty */
      }
    },
    autoridadeToTipo(autoridade_destino) {
      if (!autoridade_destino) return null;
      const m = { policia: "policia", bombeiros: "bombeiros", ambulancia: "saude" };
      return m[String(autoridade_destino).toLowerCase()] || null;
    },
    getTiposQuartelParaAlerta(alerta) {
      const t = this.autoridadeToTipo(alerta.autoridade_destino);
      if (t) return [t];
      return ["policia", "bombeiros", "saude"];
    },
    distanceKm(lat1, lng1, lat2, lng2) {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    nearestQuartelByTipo(lat, lng, tipo) {
      const list = this.quarteisComCoordenadas.filter((q) => (q.tipo || "").toLowerCase() === tipo);
      if (list.length === 0) return null;
      let best = list[0];
      let bestD = this.distanceKm(lat, lng, Number(best.latitude), Number(best.longitude));
      list.forEach((q) => {
        const d = this.distanceKm(lat, lng, Number(q.latitude), Number(q.longitude));
        if (d < bestD) {
          bestD = d;
          best = q;
        }
      });
      return best;
    },
    async fetchRouteOsrm(fromLat, fromLng, toLat, toLng) {
      const coords = `${fromLng},${fromLat};${toLng},${toLat}`;
      const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        const coordsList = data?.routes?.[0]?.geometry?.coordinates;
        if (Array.isArray(coordsList) && coordsList.length) {
          return coordsList.map(([lng, lat]) => [lat, lng]);
        }
      } catch (_) {
        /* ignore */
      }
      return [[fromLat, fromLng], [toLat, toLng]];
    },
    async updateRoutesForAlerta(alerta) {
      const pos = this.posicaoAlerta(alerta);
      if (!Number.isFinite(pos.lat) || !Number.isFinite(pos.lng)) return;
      const tipos = this.getTiposQuartelParaAlerta(alerta);
      const colors = { policia: "#0d6efd", bombeiros: "#dc3545", saude: "#198754" };
      const promises = tipos.map(async (tipo) => {
        const q = this.nearestQuartelByTipo(pos.lat, pos.lng, tipo);
        if (!q) return null;
        const latlngs = await this.fetchRouteOsrm(
          pos.lat,
          pos.lng,
          Number(q.latitude),
          Number(q.longitude)
        );
        return { latlngs, color: colors[tipo] || "#666", quartelNome: q.nome, quartelId: q.id, tipo };
      });
      const results = await Promise.all(promises);
      const segments = results.filter(Boolean);
      this.routeByAlertaId = { ...this.routeByAlertaId, [alerta.id]: segments };
    },
    onFullscreenChange() {
      this.mapFullscreen = !!document.fullscreenElement;
      this.$nextTick(() => {
        const map = this.$refs.leafletMap?.leafletObject;
        if (map) map.invalidateSize();
      });
    },
    toggleMapFullscreen() {
      const el = this.$refs.mapContainer;
      if (!el) return;
      if (this.mapFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else {
        el.requestFullscreen?.().catch(() => {});
      }
    },
    setUserName() {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        this.userName = user.email || "Autoridade";
      } catch {
        this.userName = "Autoridade";
      }
    },
    latLngFor(q) {
      return latLng(Number(q.latitude), Number(q.longitude));
    },
    tipoLabel(tipo) {
      const map = { policia: "Polícia", bombeiros: "Bombeiros", saude: "Saúde" };
      return map[tipo] || tipo;
    },
    async fetchProvincias() {
      try {
        const { data } = await api.get("/localizacao/provincias");
        this.provincias = Array.isArray(data) ? data : [];
      } catch (_) {
        this.provincias = [];
      }
    },
    async fetchQuarteis() {
      this.mapLoading = true;
      this.mapError = null;
      try {
        const { data } = await api.get("/quarteis/", { params: { limit: 200 } });
        this.quarteis = Array.isArray(data) ? data : [];
      } catch (err) {
        this.mapError = err.response?.data?.detail || err.message || "Erro ao carregar quarteis.";
      } finally {
        this.mapLoading = false;
      }
    },
    async fetchDashboardStats() {
      // Resumo
      this.statsResumoLoading = true;
      this.statsResumoError = null;
      try {
        const { data } = await api.get("/alertas/estatisticas/resumo");
        this.statsResumo = data;
      } catch (err) {
        this.statsResumoError = err.response?.data?.detail || err.message || "Erro ao carregar resumo.";
      } finally {
        this.statsResumoLoading = false;
      }
      // Últimos 30 dias, top quarteis, top áreas em paralelo
      this.statsUltimos30DiasLoading = true;
      this.statsTopQuarteisLoading = true;
      this.statsTopAreasLoading = true;
      try {
        const [rDias, rQuarteis, rAreas] = await Promise.allSettled([
          api.get("/alertas/estatisticas/ultimos-30-dias"),
          api.get("/alertas/estatisticas/top-quarteis", { params: { limit: 5 } }),
          api.get("/alertas/estatisticas/top-areas", { params: { limit: 5 } }),
        ]);
        if (rDias.status === "fulfilled") this.statsUltimos30Dias = rDias.value.data || [];
        if (rQuarteis.status === "fulfilled") this.statsTopQuarteis = rQuarteis.value.data || [];
        if (rAreas.status === "fulfilled") this.statsTopAreas = rAreas.value.data || [];
      } finally {
        this.statsUltimos30DiasLoading = false;
        this.statsTopQuarteisLoading = false;
        this.statsTopAreasLoading = false;
      }
    },
  },
};
</script>

<template>
  <Layout>
    <BRow>
      <BCol cols="12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
          <h4 class="mb-sm-0">Dashboard</h4>
        </div>
      </BCol>
    </BRow>
    <BRow class="mb-3 row-cols-1 row-cols-sm-2 row-cols-lg-5 g-3">
      <BCol>
        <BCard class="h-100">
          <BCardBody>
            <p class="text-muted text-uppercase small mb-1">Total de ocorrências</p>
            <h4 class="mb-0">
              <span v-if="statsResumoLoading">...</span>
              <span v-else>{{ statsResumo?.total ?? 0 }}</span>
            </h4>
          </BCardBody>
        </BCard>
      </BCol>
      <BCol>
        <BCard class="h-100">
          <BCardBody>
            <p class="text-muted text-uppercase small mb-1">Pendentes</p>
            <h4 class="mb-0 text-warning">{{ statsResumo?.pendente ?? 0 }}</h4>
          </BCardBody>
        </BCard>
      </BCol>
      <BCol>
        <BCard class="h-100">
          <BCardBody>
            <p class="text-muted text-uppercase small mb-1">Em atendimento</p>
            <h4 class="mb-0 text-primary">{{ statsResumo?.em_atendimento ?? 0 }}</h4>
          </BCardBody>
        </BCard>
      </BCol>
      <BCol>
        <BCard class="h-100">
          <BCardBody>
            <p class="text-muted text-uppercase small mb-1">Resolvidos</p>
            <h4 class="mb-0 text-success">{{ statsResumo?.resolvido ?? 0 }}</h4>
          </BCardBody>
        </BCard>
      </BCol>
      <BCol>
        <BCard class="h-100">
          <BCardBody>
            <p class="text-muted text-uppercase small mb-1">Cancelados</p>
            <h4 class="mb-0 text-secondary">{{ statsResumo?.cancelado ?? 0 }}</h4>
          </BCardBody>
        </BCard>
      </BCol>
    </BRow>
    <BRow>
      <BCol cols="12">
        <BCard no-body>
          <BCardHeader class="d-flex flex-wrap align-items-center gap-3">
            <h5 class="card-title mb-0">Mapa de Angola – Quarteis</h5>
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <span class="small text-muted me-1">Tipo:</span>
              <BButton
                size="sm"
                :variant="filterTipo === null ? 'primary' : 'outline-primary'"
                @click="filterTipo = null"
              >
                Todos
              </BButton>
              <BButton
                size="sm"
                :variant="filterTipo === 'policia' ? 'primary' : 'outline-primary'"
                @click="filterTipo = filterTipo === 'policia' ? null : 'policia'"
              >
                Polícia
              </BButton>
              <BButton
                size="sm"
                :variant="filterTipo === 'bombeiros' ? 'danger' : 'outline-danger'"
                @click="filterTipo = filterTipo === 'bombeiros' ? null : 'bombeiros'"
              >
                Bombeiros
              </BButton>
              <BButton
                size="sm"
                :variant="filterTipo === 'saude' ? 'success' : 'outline-success'"
                @click="filterTipo = filterTipo === 'saude' ? null : 'saude'"
              >
                Saúde
              </BButton>
            </div>
            <BFormSelect
              v-model="filterProvinciaId"
              :options="provinciaOptions"
              size="sm"
              class="form-select-sm"
              style="max-width: 220px"
            />
            <BFormSelect
              v-model="filterModo"
              :options="[
                { value: 'todos', text: 'Todos os quarteis' },
                { value: 'em_ocorrencia', text: 'Apenas em ocorrência' },
                { value: 'nenhum', text: 'Nenhum quartel' },
              ]"
              size="sm"
              class="form-select-sm"
              style="max-width: 200px"
            />
          </BCardHeader>
          <BCardBody class="p-0 position-relative">
            <div v-if="mapLoading" class="dashboard-map-loading d-flex align-items-center justify-content-center">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">A carregar...</span>
              </div>
            </div>
            <p v-else-if="mapError" class="text-danger p-3 mb-0">{{ mapError }}</p>
            <div
              v-else
              ref="mapContainer"
              class="dashboard-map-wrap rounded-bottom position-relative"
            >
              <button
                type="button"
                class="dashboard-map-fullscreen-btn btn btn-light btn-sm shadow-sm"
                :title="mapFullscreen ? 'Sair do ecrã inteiro' : 'Expandir mapa'"
                @click="toggleMapFullscreen"
              >
                <i :class="mapFullscreen ? 'ri-fullscreen-exit-line' : 'ri-fullscreen-line'"></i>
              </button>
              <l-map
                ref="leafletMap"
                class="dashboard-map-inner"
                :zoom="zoom"
                :center="center"
                style="height: 420px; width: 100%"
              >
                <l-tile-layer :url="mapTileUrl" :attribution="mapAttribution" />
                <l-polyline
                  v-for="(seg, segKey) in allRouteSegments"
                  :key="'route-' + seg.alertaId + '-' + (seg.quartelNome || segKey)"
                  :lat-lngs="seg.latlngs"
                  :color="seg.color"
                  :weight="4"
                  :opacity="0.8"
                />
                <l-marker
                  v-for="q in quarteisFiltrados"
                  :key="'q-' + q.id"
                  :lat-lng="latLngFor(q)"
                >
                  <l-tooltip :options="{ permanent: false, direction: 'top' }">
                    <strong>{{ q.nome }}</strong><br />
                    <span class="small">{{ tipoLabel(q.tipo) }}</span>
                  </l-tooltip>
                </l-marker>
                <l-circle-marker
                  v-for="a in alertasComPosicao"
                  :key="'alerta-' + a.id"
                  :lat-lng="[posicaoAlerta(a).lat, posicaoAlerta(a).lng]"
                  :radius="10"
                  color="#dc3545"
                  :fill-color="'#dc3545'"
                  :fill-opacity="0.9"
                  :weight="2"
                  class="dashboard-sos-marker cursor-pointer"
                  @click="abrirViewSos(a.id)"
                >
                  <l-tooltip :options="{ permanent: false, direction: 'top' }">
                    <strong>SOS #{{ a.id }}</strong><br />
                    <span class="small">{{ a.estado }}</span><br />
                    <span class="small" v-if="a.autoridade_destino">Destino: {{ a.autoridade_destino }}</span><br />
                    <span class="small text-primary">Clique para ver detalhes</span>
                  </l-tooltip>
                </l-circle-marker>
              </l-map>
            </div>
            <p v-if="!mapLoading && !mapError" class="small text-muted p-2 mb-0 border-top">
              <i class="ri-map-pin-line me-1"></i>
              {{ quarteisFiltrados.length }} quartel(is) visível(is) no mapa
              <span v-if="filterTipo || filterProvinciaId || filterModo !== 'todos'" class="text-muted">(filtros ativos)</span>.
              <span v-if="alertasComPosicao.length" class="ms-2">
                <i class="ri-alarm-warning-line me-1"></i>
                {{ alertasComPosicao.length }} SOS ativo(s) no mapa (tempo real).
              </span>
            </p>
          </BCardBody>
        </BCard>
      </BCol>
    </BRow>
    <BRow class="mt-3">
      <BCol xl="6" class="mb-3">
        <BCard>
          <BCardHeader>
            <h5 class="card-title mb-0">Áreas com mais ocorrências</h5>
          </BCardHeader>
          <BCardBody>
            <div v-if="statsTopAreasLoading" class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">A carregar...</span>
              </div>
            </div>
            <div v-else>
              <apexchart
                class="apex-charts"
                height="260"
                dir="ltr"
                type="donut"
                :series="chartTopAreasSeries"
                :options="chartTopAreasOptions"
              ></apexchart>
              <ul class="list-unstyled mt-3 mb-0 small">
                <li v-for="a in statsTopAreas" :key="a.area" class="d-flex justify-content-between">
                  <span>{{ a.area }}</span>
                  <span class="fw-medium">{{ a.total_alertas }}</span>
                </li>
              </ul>
            </div>
          </BCardBody>
        </BCard>
      </BCol>
      <BCol xl="6" class="mb-3">
        <BCard>
          <BCardHeader>
            <h5 class="card-title mb-0">Top 5 quarteis com mais ocorrências</h5>
          </BCardHeader>
          <BCardBody>
            <div v-if="statsTopQuarteisLoading" class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">A carregar...</span>
              </div>
            </div>
            <div v-else>
              <apexchart
                class="apex-charts"
                height="260"
                dir="ltr"
                type="bar"
                :series="chartTopQuarteisSeries"
                :options="chartTopQuarteisOptions"
              ></apexchart>
            </div>
          </BCardBody>
        </BCard>
      </BCol>
    </BRow>
    <BRow class="mt-3">
      <BCol cols="12" class="mb-3">
        <BCard>
          <BCardHeader>
            <h5 class="card-title mb-0">Ocorrências nos últimos 30 dias</h5>
          </BCardHeader>
          <BCardBody>
            <div v-if="statsUltimos30DiasLoading" class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">A carregar...</span>
              </div>
            </div>
            <div v-else>
              <apexchart
                class="apex-charts"
                height="260"
                dir="ltr"
                type="bar"
                :series="chartUltimos30DiasSeries"
                :options="chartUltimos30DiasOptions"
              ></apexchart>
            </div>
          </BCardBody>
        </BCard>
      </BCol>
    </BRow>
    <ViewSos
      :show="showViewSos"
      :alerta-id="viewSosAlertaId"
      @close="showViewSos = false"
    />
  </Layout>
</template>

<style scoped>
.dashboard-map-loading {
  min-height: 320px;
}
.dashboard-map-wrap :deep(.leaflet-container) {
  font-family: inherit;
}
.dashboard-map-fullscreen-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}
.dashboard-map-wrap:fullscreen {
  border-radius: 0;
  background: #fff;
  display: flex;
  flex-direction: column;
}
.dashboard-map-wrap:fullscreen .dashboard-map-inner,
.dashboard-map-wrap:fullscreen .dashboard-map-inner :deep(.leaflet-container) {
  flex: 1;
  min-height: 0;
  height: 100% !important;
}
.dashboard-map-wrap:fullscreen .dashboard-map-fullscreen-btn {
  top: 16px;
  right: 16px;
}
.dashboard-sos-marker :deep(.leaflet-interactive) {
  cursor: pointer;
}
</style>
