<script>
import { LMap, LTileLayer, LMarker, LTooltip, LCircleMarker, LPolyline } from "@vue-leaflet/vue-leaflet";
import { latLng } from "leaflet";
import Layout from "@/layouts/main.vue";
import ViewSos from "@/views/sos/view_sos.vue";
import api from "@/services/api";

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
  },
  mounted() {
    this.setUserName();
    this.fetchQuarteis().then(() => {
      this.fetchAlertasAtivos();
    });
    this.connectWsAlertas();
    document.addEventListener("fullscreenchange", this.onFullscreenChange);
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  },
  beforeUnmount() {
    this.disconnectWsAlertas();
    document.removeEventListener("fullscreenchange", this.onFullscreenChange);
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
      const base = process.env.VUE_APP_API_BASE_URL
        ? process.env.VUE_APP_API_BASE_URL.replace(/\/$/, "")
        : "http://localhost:8000";
      const wsBase = base.replace(/^http/, "ws");
      const token = typeof localStorage !== "undefined" ? localStorage.getItem("jwt") : null;
      if (!token) return null;
      return `${wsBase}/api/v1/ws/alertas?token=${encodeURIComponent(token)}`;
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
      try {
        const C = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
        if (!C) return;
        const ctx = new C();
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
        return { latlngs, color: colors[tipo] || "#666", quartelNome: q.nome, tipo };
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
    <BRow>
      <BCol cols="12">
        <BCard no-body class="mb-3">
          <BCardBody class="p-4">
            <h5 class="card-title mb-3">Bem-vindo ao painel SOS Angola</h5>
            <p class="text-muted mb-0">
              Olá, {{ userName }}. Esta é a área das autoridades. Utilize o menu para aceder às funcionalidades.
            </p>
          </BCardBody>
        </BCard>
      </BCol>
    </BRow>
    <BRow>
      <BCol cols="12">
        <BCard no-body>
          <BCardHeader class="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <h5 class="card-title mb-0">Mapa de Angola – Quarteis</h5>
            <div class="d-flex align-items-center gap-2">
              <BBadge variant="primary">Polícia</BBadge>
              <BBadge variant="danger">Bombeiros</BBadge>
              <BBadge variant="success">Saúde</BBadge>
            </div>
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
                  v-for="q in quarteisComCoordenadas"
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
              {{ quarteisComCoordenadas.length }} quartel(is) com localização no mapa.
              <span v-if="alertasComPosicao.length" class="ms-2">
                <i class="ri-alarm-warning-line me-1"></i>
                {{ alertasComPosicao.length }} SOS ativo(s) no mapa (tempo real).
              </span>
            </p>
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
