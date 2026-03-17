<template>
  <BModal
    :model-value="show"
    title="Visualizar Quartel"
    header-class="bg-info-subtle p-3"
    class="v-modal-custom"
    centered
    size="lg"
    hide-footer
    @update:model-value="$emit('close')"
  >
    <div v-if="loading" class="text-center py-5">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">A carregar...</span>
      </div>
    </div>
    <template v-else-if="quartel">
      <BRow class="g-3">
        <BCol cols="12">
          <div class="mb-2">
            <span class="text-muted small">Nome</span>
            <p class="mb-0 fw-medium">{{ quartel.nome }}</p>
          </div>
        </BCol>
        <BCol md="6">
          <div class="mb-2">
            <span class="text-muted small">Tipo</span>
            <p class="mb-0">
              <BBadge :variant="tipoBadge(quartel.tipo)">{{ tipoLabel(quartel.tipo) }}</BBadge>
            </p>
          </div>
        </BCol>
        <BCol md="6">
          <div class="mb-2">
            <span class="text-muted small">Estado</span>
            <p class="mb-0">
              <span v-if="quartel.ativo" class="badge bg-success-subtle text-success">Ativo</span>
              <span v-else class="badge bg-secondary-subtle text-secondary">Inativo</span>
            </p>
          </div>
        </BCol>
        <BCol md="6">
          <div class="mb-2">
            <span class="text-muted small">Província</span>
            <p class="mb-0">{{ quartel.nome_provincia || '—' }}</p>
          </div>
        </BCol>
        <BCol md="6">
          <div class="mb-2">
            <span class="text-muted small">Município</span>
            <p class="mb-0">{{ quartel.nome_municipio || '—' }}</p>
          </div>
        </BCol>
        <BCol md="6">
          <div class="mb-2">
            <span class="text-muted small">Latitude</span>
            <p class="mb-0">{{ quartel.latitude }}</p>
          </div>
        </BCol>
        <BCol md="6">
          <div class="mb-2">
            <span class="text-muted small">Longitude</span>
            <p class="mb-0">{{ quartel.longitude }}</p>
          </div>
        </BCol>
        <BCol cols="12">
          <div class="mb-2">
            <span class="text-muted small">Localização no mapa</span>
          </div>
          <div v-if="show && markerLatLng" class="view-quartel-map rounded overflow-hidden border">
            <l-map
              :zoom="14"
              :center="markerLatLng"
              style="height: 280px; width: 100%"
            >
              <l-tile-layer :url="mapTileUrl" :attribution="mapAttribution" />
              <l-marker :lat-lng="markerLatLng" />
            </l-map>
          </div>
        </BCol>
      </BRow>
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
</template>

<script>
import { LMap, LTileLayer, LMarker } from '@vue-leaflet/vue-leaflet';
import { latLng } from 'leaflet';
import api from '@/services/api';

export default {
  name: 'ViewQuartel',
  components: { LMap, LTileLayer, LMarker },
  props: {
    show: { type: Boolean, default: false },
    quartelId: { type: Number, default: null },
  },
  emits: ['close'],
  data() {
    return {
      quartel: null,
      loading: false,
      error: null,
      mapTileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      mapAttribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>',
    };
  },
  computed: {
    tipoLabel() {
      const map = { policia: 'Polícia', bombeiros: 'Bombeiros', saude: 'Saúde' };
      return (tipo) => map[tipo] || tipo;
    },
    tipoBadge() {
      const map = { policia: 'primary', bombeiros: 'danger', saude: 'success' };
      return (tipo) => map[tipo] || 'secondary';
    },
    markerLatLng() {
      if (!this.quartel) return null;
      const lat = Number(this.quartel.latitude);
      const lng = Number(this.quartel.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return latLng(lat, lng);
      }
      return null;
    },
  },
  watch: {
    show(val) {
      if (val && this.quartelId) {
        this.fetchQuartel();
      } else {
        this.quartel = null;
        this.error = null;
      }
    },
    quartelId() {
      if (this.show && this.quartelId) {
        this.fetchQuartel();
      }
    },
  },
  methods: {
    async fetchQuartel() {
      this.loading = true;
      this.error = null;
      this.quartel = null;
      try {
        const { data } = await api.get(`/quarteis/${this.quartelId}`);
        this.quartel = data;
      } catch (err) {
        this.error = err.response?.data?.detail || err.message || 'Erro ao carregar o quartel.';
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.view-quartel-map :deep(.leaflet-container) {
  font-family: inherit;
}
</style>
