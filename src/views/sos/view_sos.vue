<template>
  <BModal
    :model-value="show"
    title="Visualizar Alerta / SOS"
    header-class="bg-info-subtle p-3"
    class="v-modal-custom view-sos-modal"
    centered
    size="xl"
    hide-footer
    @update:model-value="$emit('close')"
  >
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">A carregar...</span>
      </div>
    </div>
    <template v-else-if="alerta">
      <BTabs v-model="activeTab" class="mb-3">
        <BTab title="Alerta">
          <BRow class="g-3">
            <BCol cols="12" class="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <span class="text-muted small">ID</span>
                <p class="mb-0 fw-medium">#{{ alerta.id }}</p>
              </div>
              <div>
                <BBadge :variant="tipoBadge(alerta.tipo)">{{ tipoLabel(alerta.tipo) }}</BBadge>
                <BBadge :variant="estadoBadge(alerta.estado)" class="ms-1">{{ estadoLabel(alerta.estado) }}</BBadge>
              </div>
            </BCol>
            <BCol md="6">
              <div class="mb-2">
                <span class="text-muted small">Tipo</span>
                <p class="mb-0">{{ tipoLabel(alerta.tipo) }}</p>
              </div>
            </BCol>
            <BCol md="6">
              <div class="mb-2">
                <span class="text-muted small">Estado</span>
                <p class="mb-0">
                  <BBadge :variant="estadoBadge(alerta.estado)">{{ estadoLabel(alerta.estado) }}</BBadge>
                </p>
              </div>
            </BCol>
            <BCol cols="12">
              <div class="mb-2">
                <span class="text-muted small">Localização do cidadão</span>
                <p v-if="isRealtime" class="mb-1 small text-success">
                  <i class="ri-map-pin-user-line me-1"></i> Atualização em tempo real
                </p>
              </div>
              <div v-if="show && markerLatLng" class="view-sos-map rounded overflow-hidden border">
                <l-map
                  ref="mapRef"
                  :zoom="mapZoom"
                  :center="markerLatLng"
                  style="height: 280px; width: 100%"
                  @ready="onMapReady"
                >
                  <l-tile-layer :url="mapTileUrl" :attribution="mapAttribution" />
                  <l-marker :lat-lng="markerLatLng" />
                </l-map>
              </div>
            </BCol>
            <BCol cols="12" v-if="alerta.endereco_aprox">
              <div class="mb-2">
                <span class="text-muted small">Endereço aproximado</span>
                <p class="mb-0">{{ alerta.endereco_aprox }}</p>
              </div>
            </BCol>
            <BCol md="6" v-if="alerta.autoridade_destino">
              <div class="mb-2">
                <span class="text-muted small">Autoridade destino</span>
                <p class="mb-0">{{ alerta.autoridade_destino }}</p>
              </div>
            </BCol>
            <BCol md="6" v-if="alerta.tipo_ocorrencia">
              <div class="mb-2">
                <span class="text-muted small">Tipo de ocorrência</span>
                <p class="mb-0">{{ alerta.tipo_ocorrencia }}</p>
              </div>
            </BCol>
            <BCol cols="12" v-if="alerta.descricao">
              <div class="mb-2">
                <span class="text-muted small">Descrição</span>
                <p class="mb-0">{{ alerta.descricao }}</p>
              </div>
            </BCol>
            <BCol md="6" v-if="alerta.categoria">
              <div class="mb-2">
                <span class="text-muted small">Categoria</span>
                <p class="mb-0">{{ alerta.categoria }}</p>
              </div>
            </BCol>
            <BCol md="6" v-if="alerta.motivo_cancelamento">
              <div class="mb-2">
                <span class="text-muted small">Motivo cancelamento</span>
                <p class="mb-0">{{ alerta.motivo_cancelamento }}</p>
              </div>
            </BCol>
            <BCol md="6" v-if="alerta.cancelado_at">
              <div class="mb-2">
                <span class="text-muted small">Cancelado em</span>
                <p class="mb-0">{{ formatDate(alerta.cancelado_at) }}</p>
              </div>
            </BCol>
            <BCol md="6">
              <div class="mb-2">
                <span class="text-muted small">Data de registo</span>
                <p class="mb-0">{{ formatDate(alerta.created_at) }}</p>
              </div>
            </BCol>
            <BCol md="6" v-if="alerta.id_cidadao != null">
              <div class="mb-2">
                <span class="text-muted small">ID Cidadão</span>
                <p class="mb-0">{{ alerta.id_cidadao }}</p>
              </div>
            </BCol>
            <BCol md="6" v-if="alerta.id_autoridade_atribuida != null">
              <div class="mb-2">
                <span class="text-muted small">ID Autoridade atribuída</span>
                <p class="mb-0">{{ alerta.id_autoridade_atribuida }}</p>
              </div>
            </BCol>
          </BRow>
        </BTab>
        <BTab title="Dados do cidadão" @click="onTabCidadao">
          <div v-if="alerta.id_cidadao == null" class="text-muted py-3">
            <i class="ri-user-unfollow-line me-1"></i> Alerta anónimo. Não há dados de cidadão associados.
          </div>
          <div v-else-if="cidadaoLoading" class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">A carregar...</span>
            </div>
          </div>
          <p v-else-if="cidadaoError" class="text-danger mb-0">{{ cidadaoError }}</p>
          <BRow v-else-if="cidadao" class="g-3">
            <BCol cols="12" class="mb-3">
              <div class="d-flex align-items-center gap-3 flex-wrap">
                <div
                  class="cidadao-foto-wrap rounded-circle overflow-hidden bg-light border flex-shrink-0"
                  :class="{ 'cidadao-foto-clickable': cidadaoFotoSrc }"
                  role="button"
                  tabindex="0"
                  @click="cidadaoFotoSrc && (showFotoFullscreen = true)"
                  @keydown.enter="cidadaoFotoSrc && (showFotoFullscreen = true)"
                >
                  <img
                    v-if="cidadaoFotoSrc"
                    :src="cidadaoFotoSrc"
                    alt="Foto de perfil"
                    class="cidadao-foto-img"
                  />
                  <div v-else class="cidadao-foto-placeholder d-flex align-items-center justify-content-center">
                    <i class="ri-user-line cidadao-foto-icon"></i>
                  </div>
                </div>
                <div>
                  <p class="mb-0 fw-medium fs-5">{{ cidadao.nome || '—' }}</p>
                  <p class="mb-0 text-muted small">ID #{{ cidadao.id }}</p>
                </div>
              </div>
            </BCol>
            <BCol md="6">
              <div class="mb-2">
                <span class="text-muted small">Nome</span>
                <p class="mb-0">{{ cidadao.nome || '—' }}</p>
              </div>
            </BCol>
            <BCol md="6">
              <div class="mb-2">
                <span class="text-muted small">Data de nascimento</span>
                <p class="mb-0">{{ formatDateCidadao(cidadao.data_nascimento) }}</p>
              </div>
            </BCol>
            <BCol md="6">
              <div class="mb-2">
                <span class="text-muted small">Telefone</span>
                <p class="mb-0">{{ cidadao.telefone || '—' }}</p>
              </div>
            </BCol>
            <BCol md="6">
              <div class="mb-2">
                <span class="text-muted small">BI</span>
                <p class="mb-0">{{ cidadao.bi || '—' }}</p>
              </div>
            </BCol>
            <BCol md="6">
              <div class="mb-2">
                <span class="text-muted small">Email</span>
                <p class="mb-0">{{ cidadao.email || '—' }}</p>
              </div>
            </BCol>
            <BCol md="6">
              <div class="mb-2">
                <span class="text-muted small">Género</span>
                <p class="mb-0">{{ cidadao.genero || '—' }}</p>
              </div>
            </BCol>
            <BCol md="6">
              <div class="mb-2">
                <span class="text-muted small">Registo em</span>
                <p class="mb-0">{{ formatDate(cidadao.created_at) }}</p>
              </div>
            </BCol>
            <BCol md="6">
              <div class="mb-2">
                <span class="text-muted small">Cuidados especiais</span>
                <p class="mb-0">{{ cidadao.precisa_cuidados_especiais ? 'Sim' : 'Não' }}</p>
              </div>
            </BCol>
            <BCol cols="12" v-if="cidadao.contatos_emergencia && cidadao.contatos_emergencia.length">
              <div class="mb-2">
                <span class="text-muted small">Contactos de emergência</span>
                <ul class="list-unstyled mb-0 mt-1">
                  <li v-for="c in cidadao.contatos_emergencia" :key="c.id" class="py-1 border-bottom border-light">
                    <strong>{{ c.nome }}</strong> — {{ c.telefone }}
                    <span v-if="c.email"> ({{ c.email }})</span>
                    <BBadge v-if="c.tipo" variant="light" class="ms-1">{{ c.tipo }}</BBadge>
                  </li>
                </ul>
              </div>
            </BCol>
            <BCol cols="12" v-if="cidadao.cuidados_especiais">
              <div class="mb-2">
                <span class="text-muted small">Cuidados especiais (detalhe)</span>
                <div class="rounded border p-2 bg-light mt-1">
                  <p class="mb-1"><strong>Tipo:</strong> {{ cidadao.cuidados_especiais.tipo_paciente || '—' }}</p>
                  <p class="mb-1" v-if="cidadao.cuidados_especiais.doencas_conhecidas"><strong>Doenças conhecidas:</strong> {{ cidadao.cuidados_especiais.doencas_conhecidas }}</p>
                  <p class="mb-1" v-if="cidadao.cuidados_especiais.alergias"><strong>Alergias:</strong> {{ cidadao.cuidados_especiais.alergias }}</p>
                  <p class="mb-1"><strong>Tipo sanguíneo:</strong> {{ cidadao.cuidados_especiais.tipo_sanguineo || '—' }}</p>
                  <p class="mb-0" v-if="cidadao.cuidados_especiais.hospital_ou_clinica"><strong>Hospital/Clínica:</strong> {{ cidadao.cuidados_especiais.hospital_ou_clinica }}</p>
                </div>
              </div>
            </BCol>
          </BRow>
        </BTab>
        <BTab title="Vídeos" @click="onTabVideos">
          <div v-if="midiasLoading" class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">A carregar...</span>
            </div>
          </div>
          <p v-else-if="midiasError" class="text-danger mb-0">{{ midiasError }}</p>
          <div v-else-if="!midias.length" class="text-muted py-4 text-center">
            <i class="ri-video-off-line me-1"></i> Nenhum vídeo de gravação associado a este alerta.
          </div>
          <div v-else class="view-sos-videos-list">
            <BAlert variant="info" class="small mb-3" show>
              <strong>Se a imagem do vídeo não aparecer</strong> (ecrã preto com barra de progresso), o ficheiro pode estar em formato não suportado pelo browser (ex.: HEVC/H.265). Use o botão <strong>«Abrir noutra aba»</strong> para tentar no player do browser ou transferir o ficheiro.
            </BAlert>
            <div class="d-flex flex-column gap-3">
            <div
              v-for="m in midias"
              :key="m.id"
              class="rounded border overflow-hidden bg-dark view-sos-video-item"
            >
              <div class="p-2 bg-light border-bottom small text-muted d-flex align-items-center justify-content-between flex-wrap gap-2">
                <span>
                  <span v-if="m.tipo === 'video'">Vídeo</span>
                  <span v-else>{{ m.tipo }}</span>
                  — {{ formatDate(m.created_at) }}
                </span>
                <div v-if="m.tipo === 'video'" class="d-flex gap-1 flex-wrap">
                <BButton
                  variant="outline-primary"
                  size="sm"
                  class="view-sos-video-fullscreen-btn"
                  @click="abrirVideoEcrãInteiro(m.id)"
                >
                  <i class="ri-fullscreen-line me-1"></i> Ecrã inteiro
                </BButton>
                <BButton
                  variant="outline-secondary"
                  size="sm"
                  :href="midiaVideoUrl(m)"
                  target="_blank"
                  rel="noopener"
                >
                  <i class="ri-external-link-line me-1"></i> Abrir noutra aba
                </BButton>
              </div>
              </div>
              <div class="view-sos-video-wrap">
                <template v-if="m.tipo === 'video'">
                  <video
                    v-show="!videoErro[m.id]"
                    :ref="(el) => setVideoRef(m.id, el)"
                    controls
                    preload="metadata"
                    crossorigin="anonymous"
                    class="view-sos-video"
                    @error="onVideoError(m.id)"
                  >
                    <source :src="midiaVideoUrl(m)" type="video/mp4" />
                    O seu browser não suporta a reprodução de vídeo.
                  </video>
                  <div v-if="videoErro[m.id]" class="view-sos-video-erro p-3 text-center text-white">
                    <p class="mb-2">Não foi possível reproduzir o vídeo nesta página.</p>
                    <BButton variant="light" size="sm" :href="midiaVideoUrl(m)" target="_blank" rel="noopener">
                      <i class="ri-external-link-line me-1"></i> Abrir vídeo noutra aba
                    </BButton>
                  </div>
                </template>
              <a
                v-else
                :href="midiaVideoUrl(m)"
                target="_blank"
                rel="noopener"
                class="d-block p-2 text-break"
              >
                {{ m.url_path }}
              </a>
              </div>
            </div>
            </div>
          </div>
        </BTab>
        <BTab title="Transmissão ao vivo" @click="onTabLive">
          <div class="view-sos-live">
          <div v-if="!alerta || !estadosAtivos.includes(alerta.estado)" class="text-muted py-4 text-center">
            <i class="ri-live-line me-1"></i> A transmissão ao vivo só está disponível para alertas <strong>pendentes</strong> ou <strong>em atendimento</strong>.
          </div>
          <template v-else>
            <div class="rounded border overflow-hidden bg-dark mb-2">
              <video
                ref="liveRemoteVideo"
                autoplay
                playsinline
                muted
                class="w-100"
                style="max-height: 320px; display: block; background: #000;"
              ></video>
            </div>
            <p
              :class="['mb-2 small px-2 py-2 rounded', liveStatusClass]"
            >
              {{ liveStatusText }}
            </p>
            <div class="d-flex gap-2 flex-wrap">
              <BButton
                size="sm"
                variant="outline-secondary"
                :disabled="!liveCanSwitchCamera"
                :class="{ active: liveCamera === 'back' }"
                @click="switchLiveCamera('back')"
              >
                Traseira
              </BButton>
              <BButton
                size="sm"
                variant="outline-secondary"
                :disabled="!liveCanSwitchCamera"
                :class="{ active: liveCamera === 'front' }"
                @click="switchLiveCamera('front')"
              >
                Frontal
              </BButton>
            </div>
          </template>
          </div>
        </BTab>
      </BTabs>
      <div class="d-flex justify-content-end mt-3">
        <BButton variant="secondary" @click="$emit('close')">Fechar</BButton>
      </div>
    </template>
    <template v-else-if="error">
      <p class="text-danger mb-0">{{ error }}</p>
      <div class="d-flex justify-content-end mt-3">
        <BButton variant="secondary" @click="$emit('close')">Fechar</BButton>
      </div>
    </template>
  </BModal>
  <BModal
    v-model="showFotoFullscreen"
    title="Foto de perfil"
    class="modal-foto-fullscreen"
    header-class="bg-light p-2"
    body-class="p-0 d-flex justify-content-center align-items-center bg-dark"
    hide-footer
    size="lg"
    centered
  >
    <img
      v-if="cidadaoFotoSrc"
      :src="cidadaoFotoSrc"
      alt="Foto de perfil (completa)"
      class="img-fluid w-100"
      style="max-height: 75vh; object-fit: contain;"
    />
  </BModal>
</template>

<script>
import { LMap, LTileLayer, LMarker } from '@vue-leaflet/vue-leaflet';
import { latLng } from 'leaflet';
import api from '@/services/api';

const ESTADOS_ATIVOS = ['pendente', 'em_atendimento'];

function getWsAlertasUrl() {
  const base = process.env.VUE_APP_API_BASE_URL
    ? process.env.VUE_APP_API_BASE_URL.replace(/\/$/, '')
    : 'http://localhost:8000';
  const wsBase = base.replace(/^http/, 'ws');
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('jwt') : null;
  const url = `${wsBase}/api/v1/ws/alertas`;
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

export default {
  name: 'ViewSos',
  components: { LMap, LTileLayer, LMarker },
  props: {
    show: { type: Boolean, default: false },
    alertaId: { type: Number, default: null },
  },
  emits: ['close'],
  data() {
    return {
      alerta: null,
      loading: false,
      error: null,
      mapTileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      mapAttribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>',
      mapZoom: 15,
      ws: null,
      wsConnected: false,
      leafletMap: null,
      activeTab: 0,
      cidadao: null,
      cidadaoLoading: false,
      cidadaoError: null,
      showFotoFullscreen: false,
      midias: [],
      midiasLoading: false,
      midiasError: null,
      videoRefs: {},
      videoErro: {},
      estadosAtivos: ESTADOS_ATIVOS,
      liveWs: null,
      livePc: null,
      liveStatus: 'idle',
      liveStatusText: '',
      liveCamera: 'back',
    };
  },
  computed: {
    markerLatLng() {
      if (!this.alerta) return null;
      const lat = Number(this.alerta.ultima_latitude ?? this.alerta.latitude);
      const lng = Number(this.alerta.ultima_longitude ?? this.alerta.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return latLng(lat, lng);
      }
      return null;
    },
    isRealtime() {
      return this.wsConnected && this.alerta && ESTADOS_ATIVOS.includes(this.alerta.estado);
    },
    cidadaoFotoSrc() {
      if (!this.cidadao) return null;
      const b64 = this.cidadao.fotografia_base64;
      if (b64 && typeof b64 === 'string') {
        return b64.startsWith('data:') ? b64 : `data:image/jpeg;base64,${b64}`;
      }
      const url = this.cidadao.fotografia_url;
      if (url && typeof url === 'string') {
        if (url.startsWith('http')) return url;
        const base = process.env.VUE_APP_API_BASE_URL
          ? process.env.VUE_APP_API_BASE_URL.replace(/\/$/, '')
          : 'http://localhost:8000';
        return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
      }
      return null;
    },
    liveStatusClass() {
      const m = {
        idle: 'bg-secondary text-white',
        connecting: 'bg-secondary text-white',
        waiting: 'bg-warning text-dark',
        live: 'bg-success text-white',
        error: 'bg-danger text-white',
      };
      return m[this.liveStatus] || 'bg-secondary text-white';
    },
    liveCanSwitchCamera() {
      return this.liveStatus === 'live' && this.liveWs && this.liveWs.readyState === WebSocket.OPEN;
    },
  },
  watch: {
    show(val) {
      if (val && this.alertaId) {
        this.fetchAlerta();
      } else {
        this.closeWs();
        this.alerta = null;
        this.error = null;
        this.activeTab = 0;
        this.cidadao = null;
        this.cidadaoError = null;
        this.showFotoFullscreen = false;
        this.midias = [];
        this.midiasError = null;
        this.disconnectLive();
      }
    },
    alertaId() {
      if (this.show && this.alertaId) {
        this.fetchAlerta();
      }
    },
    alerta(val) {
      if (val && ESTADOS_ATIVOS.includes(val.estado) && this.show) {
        this.connectWs();
      } else {
        this.closeWs();
      }
      this.cidadao = null;
      this.cidadaoError = null;
      this.midias = [];
      this.midiasError = null;
    },
    activeTab(val) {
      if (val === 1 && this.alerta?.id_cidadao) {
        this.fetchCidadao();
      }
      if (val === 2 && this.alertaId) {
        this.fetchMidias();
      }
      if (val === 3) {
        this.connectLive();
      } else {
        this.disconnectLive();
      }
    },
  },
  beforeUnmount() {
    this.closeWs();
    this.disconnectLive();
  },
  methods: {
    onMapReady(map) {
      this.leafletMap = map;
    },
    connectWs() {
      this.closeWs();
      if (!this.alertaId || !this.alerta || !ESTADOS_ATIVOS.includes(this.alerta.estado) || !this.show) return;
      try {
        const url = getWsAlertasUrl();
        const socket = new WebSocket(url);
        socket.onopen = () => {
          this.wsConnected = true;
        };
        socket.onclose = () => {
          this.ws = null;
          this.wsConnected = false;
        };
        socket.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.evento === 'localizacao_atualizada' && msg.alerta_id === this.alertaId) {
              this.alerta = { ...this.alerta, ultima_latitude: msg.ultima_latitude, ultima_longitude: msg.ultima_longitude, ultima_localizacao_at: msg.ultima_localizacao_at };
              const lat = Number(msg.ultima_latitude);
              const lng = Number(msg.ultima_longitude);
              if (this.leafletMap && Number.isFinite(lat) && Number.isFinite(lng)) {
                this.leafletMap.setView([lat, lng], this.leafletMap.getZoom());
              }
            }
          } catch {
            // ignora mensagens inválidas
          }
        };
        socket.onerror = () => {
          this.closeWs();
        };
        this.ws = socket;
      } catch {
        this.wsConnected = false;
      }
    },
    closeWs() {
      if (this.ws) {
        try {
          this.ws.close();
        } catch (_) {
          /* ignora erro ao fechar WebSocket */
        }
        this.ws = null;
      }
      this.wsConnected = false;
    },
    tipoLabel(tipo) {
      const map = {
        sos_rapido: 'SOS Rápido',
        sos_formulario: 'SOS Formulário',
        alerta_familiar: 'Alerta Familiar',
        medicacao_nao_cumprida: 'Medicação não cumprida',
      };
      return map[tipo] || tipo;
    },
    tipoBadge(tipo) {
      const map = {
        sos_rapido: 'danger',
        sos_formulario: 'warning',
        alerta_familiar: 'info',
        medicacao_nao_cumprida: 'secondary',
      };
      return map[tipo] || 'secondary';
    },
    estadoLabel(estado) {
      const map = {
        pendente: 'Pendente',
        em_atendimento: 'Em atendimento',
        resolvido: 'Resolvido',
        cancelado: 'Cancelado',
      };
      return map[estado] || estado;
    },
    estadoBadge(estado) {
      const map = {
        pendente: 'warning',
        em_atendimento: 'primary',
        resolvido: 'success',
        cancelado: 'secondary',
      };
      return map[estado] || 'secondary';
    },
    formatDate(val) {
      if (!val) return '—';
      try {
        return new Date(val).toLocaleString('pt-AO', { dateStyle: 'short', timeStyle: 'short' });
      } catch {
        return val;
      }
    },
    formatDateCidadao(val) {
      if (!val) return '—';
      try {
        return new Date(val).toLocaleDateString('pt-AO', { dateStyle: 'short' });
      } catch {
        return val;
      }
    },
    onTabCidadao() {
      if (this.activeTab === 1 && this.alerta?.id_cidadao) {
        this.fetchCidadao();
      }
    },
    onTabVideos() {
      if (this.activeTab === 2 && this.alertaId) {
        this.fetchMidias();
      }
    },
    onTabLive() {
      if (this.activeTab === 3) {
        this.connectLive();
      }
    },
    getLiveWsUrl() {
      const base = process.env.VUE_APP_API_BASE_URL
        ? process.env.VUE_APP_API_BASE_URL.replace(/\/$/, '')
        : 'http://localhost:8000';
      const wsBase = base.replace(/^http/, 'ws');
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('jwt') : null;
      if (!token || !this.alertaId) return null;
      return `${wsBase}/api/v1/ws/live/${this.alertaId}?role=autoridade&token=${encodeURIComponent(token)}`;
    },
    connectLive() {
      this.disconnectLive();
      if (!this.alertaId || !this.alerta || !ESTADOS_ATIVOS.includes(this.alerta.estado) || this.activeTab !== 3) return;
      const url = this.getLiveWsUrl();
      if (!url) {
        this.liveStatus = 'error';
        this.liveStatusText = 'Token em falta. Faça login como autoridade.';
        return;
      }
      this.liveStatus = 'connecting';
      this.liveStatusText = 'A conectar ao servidor de signaling…';
      try {
        const ws = new WebSocket(url);
        ws.onopen = () => {
          this.liveStatus = 'waiting';
          this.liveStatusText = 'Ligado. À espera de oferta do cidadão…';
        };
        ws.onmessage = (ev) => this.handleLiveMessage(ev);
        ws.onerror = () => {
          this.liveStatus = 'error';
          this.liveStatusText = 'Erro de ligação WebSocket.';
        };
        ws.onclose = () => {
          this.liveWs = null;
          if (this.liveStatus === 'connecting' || this.liveStatus === 'waiting' || this.liveStatus === 'live') {
            this.liveStatus = 'error';
            this.liveStatusText = 'Ligação fechada.';
          }
          if (this.livePc) {
            try {
              this.livePc.close();
            } catch (_) {
              /* ignora ao fechar peer connection */
            }
            this.livePc = null;
          }
        };
        this.liveWs = ws;
      } catch (e) {
        this.liveStatus = 'error';
        this.liveStatusText = e?.message || 'Erro ao conectar.';
      }
    },
    disconnectLive() {
      if (this.livePc) {
        try {
          this.livePc.close();
        } catch (_) {
          /* ignora ao fechar peer connection */
        }
        this.livePc = null;
      }
      if (this.liveWs) {
        try {
          this.liveWs.close();
        } catch (_) {
          /* ignora ao fechar WebSocket */
        }
        this.liveWs = null;
      }
      const video = this.$refs.liveRemoteVideo;
      if (video && video.srcObject) {
        video.srcObject = null;
      }
      this.liveStatus = 'idle';
      this.liveStatusText = '';
      this.liveCamera = 'back';
    },
    handleLiveMessage(ev) {
      try {
        const msg = JSON.parse(ev.data);
        const type = (msg.type || '').toLowerCase();
        const payload = msg.payload;
        const camera = (msg.camera || 'back').toLowerCase();
        if (type === 'offer') {
          this.handleLiveOffer(payload);
          this.liveCamera = camera === 'front' ? 'front' : 'back';
        } else if (type === 'ice' && this.livePc && payload) {
          this.livePc.addIceCandidate(new RTCIceCandidate(payload)).catch(() => {});
        }
      } catch {
        this.liveStatus = 'error';
        this.liveStatusText = 'Erro ao processar mensagem.';
      }
    },
    async handleLiveOffer(offerSdp) {
      if (this.livePc) {
        this.livePc.close();
        this.livePc = null;
      }
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pc.ontrack = (e) => {
        if (e.streams && e.streams[0]) {
          const video = this.$refs.liveRemoteVideo;
          if (video) {
            video.srcObject = e.streams[0];
          }
          this.liveStatus = 'live';
          this.liveStatusText = 'Em direto';
        }
      };
      pc.onicecandidate = (e) => {
        if (e.candidate && this.liveWs && this.liveWs.readyState === WebSocket.OPEN) {
          this.liveWs.send(JSON.stringify({ type: 'ice', payload: e.candidate }));
        }
      };
      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      if (this.liveWs && this.liveWs.readyState === WebSocket.OPEN) {
        this.liveWs.send(JSON.stringify({ type: 'answer', payload: answer }));
      }
      this.livePc = pc;
    },
    switchLiveCamera(which) {
      if (!this.liveCanSwitchCamera || !this.liveWs) return;
      this.liveWs.send(JSON.stringify({ type: 'switch_camera', payload: which }));
      this.liveCamera = which;
    },
    setVideoRef(id, el) {
      if (el) this.videoRefs[id] = el;
      else delete this.videoRefs[id];
    },
    abrirVideoEcrãInteiro(midiaId) {
      const video = this.videoRefs[midiaId];
      if (!video) return;
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
      }
    },
    /** URL para reproduzir vídeo: usa stream-video com headers e Range para o browser conseguir reproduzir. Outras mídias usam uploads. */
    midiaVideoUrl(m) {
      const base = process.env.VUE_APP_API_BASE_URL
        ? process.env.VUE_APP_API_BASE_URL.replace(/\/$/, '')
        : 'http://localhost:8000';
      const path = (m.url_path || '').replace(/^\//, '');
      if (m.tipo === 'video') {
        return `${base}/api/v1/stream-video/${path}`;
      }
      return `${base}/api/v1/uploads/${path}`;
    },
    onVideoError(midiaId) {
      this.videoErro = { ...this.videoErro, [midiaId]: true };
    },
    async fetchMidias() {
      if (!this.alertaId) return;
      this.midiasLoading = true;
      this.midiasError = null;
      this.midias = [];
      this.videoErro = {};
      try {
        const { data } = await api.get(`/alertas/${this.alertaId}/midias`);
        this.midias = data || [];
      } catch (err) {
        this.midiasError = err.response?.data?.detail || err.message || 'Erro ao carregar vídeos.';
      } finally {
        this.midiasLoading = false;
      }
    },
    async fetchCidadao() {
      const id = this.alerta?.id_cidadao;
      if (!id) return;
      this.cidadaoLoading = true;
      this.cidadaoError = null;
      this.cidadao = null;
      try {
        const { data } = await api.get(`/alertas/cidadao/${id}`);
        this.cidadao = data;
      } catch (err) {
        this.cidadaoError = err.response?.data?.detail || err.message || 'Erro ao carregar dados do cidadão.';
      } finally {
        this.cidadaoLoading = false;
      }
    },
    async fetchAlerta() {
      this.loading = true;
      this.error = null;
      this.alerta = null;
      this.closeWs();
      try {
        const { data } = await api.get(`/alertas/${this.alertaId}`);
        this.alerta = data;
      } catch (err) {
        this.error = err.response?.data?.detail || err.message || 'Erro ao carregar os dados do alerta.';
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.view-sos-map :deep(.leaflet-container) {
  font-family: inherit;
}
.cidadao-foto-wrap {
  width: 96px;
  height: 96px;
}
.cidadao-foto-clickable {
  cursor: pointer;
}
.cidadao-foto-clickable:hover {
  opacity: 0.9;
}
.cidadao-foto-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cidadao-foto-placeholder {
  width: 100%;
  height: 100%;
  color: var(--bs-secondary);
}
.cidadao-foto-icon {
  font-size: 2.5rem;
}
/* Tab transmissão ao vivo: botão de câmara ativo */
.view-sos-live .btn.active {
  background-color: var(--bs-secondary);
  color: var(--bs-white);
  border-color: var(--bs-secondary);
}

/* Tab Vídeos: contentor com altura fixa para o browser pintar os frames do vídeo */
.view-sos-video-wrap {
  position: relative;
  width: 100%;
  height: 420px;
  background: #000;
  overflow: hidden;
}
.view-sos-video-wrap .view-sos-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.view-sos-video-erro {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1a1a1a;
}
.view-sos-modal :deep(.modal-body) {
  max-height: 85vh;
  overflow-y: auto;
}
</style>

<style>
/* Modal da foto em cima do backdrop (sem scoped para atingir o modal teleportado) */
.modal-foto-fullscreen {
  z-index: 1060 !important;
}
.modal-foto-fullscreen .modal-dialog {
  z-index: 1061 !important;
}
</style>
