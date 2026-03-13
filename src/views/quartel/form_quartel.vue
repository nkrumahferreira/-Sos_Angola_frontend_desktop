<template>
  <BModal
    :model-value="show"
    :title="quartel ? 'Editar Quartel' : 'Cadastrar Quartel'"
    header-class="bg-primary-subtle p-3"
    class="v-modal-custom"
    centered
    hide-footer
    size="lg"
    @update:model-value="$emit('close')"
  >
    <BForm @submit.prevent="onSubmit" class="tablelist-form">
      <BRow class="g-3">
        <BCol cols="12">
          <label class="form-label">Nome do quartel</label>
          <input
            v-model="form.nome"
            type="text"
            class="form-control"
            placeholder="Ex: Comando Municipal da Polícia"
            :class="{ 'is-invalid': submitted && !form.nome }"
          />
          <div v-if="submitted && !form.nome" class="invalid-feedback">Obrigatório.</div>
        </BCol>
        <BCol cols="12">
          <label class="form-label">Tipo de quartel</label>
          <BFormSelect
            v-model="form.tipo"
            :options="tipoOptions"
            class="form-select"
            :class="{ 'is-invalid': submitted && !form.tipo }"
          />
          <div v-if="submitted && !form.tipo" class="invalid-feedback">Selecione o tipo.</div>
        </BCol>
        <BCol md="6">
          <label class="form-label">Latitude</label>
          <input
            v-model.number="form.latitude"
            type="number"
            step="any"
            class="form-control"
            placeholder="Ex: -8.8383"
            :class="{ 'is-invalid': submitted && form.latitude === '' }"
          />
          <div v-if="submitted && form.latitude === ''" class="invalid-feedback">Obrigatório.</div>
        </BCol>
        <BCol md="6">
          <label class="form-label">Longitude</label>
          <input
            v-model.number="form.longitude"
            type="number"
            step="any"
            class="form-control"
            placeholder="Ex: 13.2344"
            :class="{ 'is-invalid': submitted && form.longitude === '' }"
          />
          <div v-if="submitted && form.longitude === ''" class="invalid-feedback">Obrigatório.</div>
        </BCol>
        <BCol cols="12">
          <label class="form-label">Localização no mapa (Angola)</label>
          <p class="text-muted small mb-2">Pesquise um endereço ou local para centrar o mapa, ou clique no mapa / arraste o marcador para definir a localização.</p>
          <div class="map-search-wrap d-flex gap-2 mb-2">
            <div class="map-search-input-wrap flex-grow-1 position-relative">
              <BFormInput
                ref="searchInputRef"
                v-model="searchQuery"
                type="text"
                placeholder="Ex: Hospital Municipal do Sambizanga, Luanda"
                autocomplete="off"
                @input="onSearchInput"
                @keyup.enter="onSearchEnter"
                @focus="onSearchFocus"
                @blur="onSearchBlur"
              />
              <ul
                v-show="searchSuggestions.length > 0"
                class="map-search-suggestions list-unstyled mb-0"
                @mousedown.prevent
              >
                <li
                  v-for="(item, idx) in searchSuggestions"
                  :key="idx"
                  class="map-search-suggestion-item"
                  @mousedown="selectSuggestion(item)"
                >
                  <i class="ri-map-pin-line text-muted me-2"></i>
                  <span class="small">{{ item.display_name }}</span>
                </li>
              </ul>
              <div v-if="searchLoading && searchSuggestions.length === 0" class="map-search-loading small text-muted">
                <i class="ri-loader-4-line spin me-1"></i> A pesquisar...
              </div>
            </div>
            <BButton variant="primary" size="sm" :disabled="searchLoading" @click="searchOnMap">
              <span v-if="searchLoading && searchSuggestions.length > 0"><i class="ri-loader-4-line spin"></i></span>
              <span v-else><i class="ri-search-line me-1"></i> Pesquisar</span>
            </BButton>
          </div>
          <div v-if="searchError" class="alert alert-warning py-2 small mb-2">{{ searchError }}</div>
          <div v-if="show" class="form-quartel-map rounded overflow-hidden border">
            <l-map
              ref="mapRef"
              :zoom="mapZoom"
              :center="mapCenter"
              :options="{ zoomSnap: 0.5 }"
              style="height: 260px; width: 100%"
              @ready="onMapReady"
            >
              <l-tile-layer :url="mapTileUrl" :attribution="mapAttribution" />
              <l-marker
                v-if="markerLatLng"
                :lat-lng="markerLatLng"
                :draggable="true"
                @update:lat-lng="onMarkerMoved"
              />
            </l-map>
          </div>
        </BCol>
        <BCol cols="12">
          <div class="form-check">
            <input
              id="form-ativo"
              v-model="form.ativo"
              type="checkbox"
              class="form-check-input"
            />
            <label class="form-check-label" for="form-ativo">Ativo</label>
          </div>
        </BCol>
      </BRow>
      <div class="hstack gap-2 justify-content-end mt-3">
        <BButton type="button" variant="light" @click="$emit('close')">Fechar</BButton>
        <BButton type="submit" variant="primary" :disabled="loading">
          {{ loading ? 'A guardar...' : (quartel ? 'Atualizar' : 'Cadastrar') }}
        </BButton>
      </div>
    </BForm>
  </BModal>
</template>

<script>
import { LMap, LTileLayer, LMarker } from '@vue-leaflet/vue-leaflet';
import { latLng } from 'leaflet';

// Centro de Angola (aproximado)
const ANGOLA_CENTER = latLng(-12.3, 17.5);
const ANGOLA_ZOOM = 5;

export default {
  name: 'FormQuartel',
  components: { LMap, LTileLayer, LMarker },
  props: {
    show: { type: Boolean, default: false },
    quartel: { type: Object, default: null },
  },
  emits: ['close', 'saved'],
  data() {
    return {
      submitted: false,
      loading: false,
      mapReady: false,
      searchQuery: '',
      searchLoading: false,
      searchError: '',
      searchSuggestions: [],
      searchDebounceTimer: null,
      leafletMap: null,
      mapTileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      mapAttribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>',
      tipoOptions: [
        { value: '', text: 'Selecione o tipo' },
        { value: 'policia', text: 'Quartel da polícia' },
        { value: 'bombeiros', text: 'Quartel dos bombeiros' },
        { value: 'saude', text: 'Quartel de saúde' },
      ],
      form: {
        nome: '',
        tipo: '',
        latitude: '',
        longitude: '',
        ativo: true,
      },
    };
  },
  computed: {
    mapCenter() {
      const lat = Number(this.form.latitude);
      const lng = Number(this.form.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return latLng(lat, lng);
      }
      return ANGOLA_CENTER;
    },
    mapZoom() {
      const lat = Number(this.form.latitude);
      const lng = Number(this.form.longitude);
      return Number.isFinite(lat) && Number.isFinite(lng) ? 14 : ANGOLA_ZOOM;
    },
    markerLatLng() {
      const lat = Number(this.form.latitude);
      const lng = Number(this.form.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return latLng(lat, lng);
      }
      return null;
    },
  },
  watch: {
    show(val) {
      if (val) {
        this.submitted = false;
        if (this.quartel) {
          this.form = {
            nome: this.quartel.nome,
            tipo: this.quartel.tipo,
            latitude: this.quartel.latitude,
            longitude: this.quartel.longitude,
            ativo: this.quartel.ativo !== false,
          };
        } else {
          this.form = {
            nome: '',
            tipo: '',
            latitude: '',
            longitude: '',
            ativo: true,
          };
        }
      }
    },
  },
  methods: {
    onMapReady(mapInstance) {
      if (!mapInstance) return;
      this.leafletMap = mapInstance;
      mapInstance.on('click', (ev) => {
        if (ev && ev.latlng) {
          this.form.latitude = Math.round(ev.latlng.lat * 1e6) / 1e6;
          this.form.longitude = Math.round(ev.latlng.lng * 1e6) / 1e6;
        }
      });
    },
    onSearchInput() {
      if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
      const q = (this.searchQuery || '').trim();
      if (q.length < 2) {
        this.searchSuggestions = [];
        return;
      }
      this.searchDebounceTimer = setTimeout(() => {
        this.fetchSearchSuggestions();
      }, 350);
    },
    onSearchFocus() {
      const q = (this.searchQuery || '').trim();
      if (q.length >= 2 && this.searchSuggestions.length === 0 && !this.searchLoading) {
        this.fetchSearchSuggestions();
      }
    },
    onSearchBlur() {
      setTimeout(() => {
        this.searchSuggestions = [];
      }, 200);
    },
    onSearchEnter() {
      if (this.searchSuggestions.length > 0) {
        this.selectSuggestion(this.searchSuggestions[0]);
      } else {
        this.searchOnMap();
      }
    },
    async fetchSearchSuggestions() {
      const q = (this.searchQuery || '').trim();
      if (q.length < 2) {
        this.searchSuggestions = [];
        return;
      }
      this.searchLoading = true;
      this.searchError = '';
      try {
        const params = new URLSearchParams({
          q,
          format: 'json',
          limit: '6',
          countrycodes: 'ao',
        });
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'SOSAngola-Desktop/1.0 (Gestão de Quarteis)',
            },
          }
        );
        const data = await res.json();
        this.searchSuggestions = Array.isArray(data) ? data : [];
      } catch {
        this.searchSuggestions = [];
      } finally {
        this.searchLoading = false;
      }
    },
    selectSuggestion(item) {
      const latNum = parseFloat(item.lat);
      const lonNum = parseFloat(item.lon);
      if (Number.isFinite(latNum) && Number.isFinite(lonNum)) {
        this.form.latitude = Math.round(latNum * 1e6) / 1e6;
        this.form.longitude = Math.round(lonNum * 1e6) / 1e6;
        this.searchQuery = item.display_name || this.searchQuery;
        if (this.leafletMap) {
          this.leafletMap.setView([latNum, lonNum], 16);
        }
      }
      this.searchSuggestions = [];
    },
    async searchOnMap() {
      const q = (this.searchQuery || '').trim();
      if (!q) {
        this.searchError = 'Digite um endereço ou nome do local para pesquisar.';
        return;
      }
      this.searchError = '';
      this.searchLoading = true;
      try {
        const params = new URLSearchParams({
          q,
          format: 'json',
          limit: '1',
          countrycodes: 'ao',
        });
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'SOSAngola-Desktop/1.0 (Gestão de Quarteis)',
            },
          }
        );
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) {
          this.searchError = 'Local não encontrado. Tente outro nome ou endereço (Angola).';
          return;
        }
        const { lat, lon } = data[0];
        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);
        if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
          this.searchError = 'Coordenadas inválidas para este local.';
          return;
        }
        this.form.latitude = Math.round(latNum * 1e6) / 1e6;
        this.form.longitude = Math.round(lonNum * 1e6) / 1e6;
        if (this.leafletMap) {
          this.leafletMap.setView([latNum, lonNum], 16);
        }
      } catch (err) {
        this.searchError = 'Erro ao pesquisar. Verifique a ligação e tente novamente.';
      } finally {
        this.searchLoading = false;
      }
    },
    onMarkerMoved(latLngObj) {
      if (latLngObj && typeof latLngObj.lat === 'number' && typeof latLngObj.lng === 'number') {
        this.form.latitude = Math.round(latLngObj.lat * 1e6) / 1e6;
        this.form.longitude = Math.round(latLngObj.lng * 1e6) / 1e6;
      }
    },
    async onSubmit() {
      this.submitted = true;
      if (!this.form.nome || !this.form.tipo || this.form.latitude === '' || this.form.longitude === '') {
        return;
      }
      this.loading = true;
      try {
        await this.$emit('saved', {
          id: this.quartel ? this.quartel.id : null,
          payload: {
            nome: this.form.nome.trim(),
            tipo: this.form.tipo,
            latitude: Number(this.form.latitude),
            longitude: Number(this.form.longitude),
            ativo: this.form.ativo,
          },
        });
        this.$emit('close');
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.map-search-input-wrap {
  position: relative;
}
.map-search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1050;
  max-height: 220px;
  overflow-y: auto;
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 0.25rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  margin-top: 2px;
  padding: 0.25rem 0;
}
.map-search-suggestion-item {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.map-search-suggestion-item:hover {
  background-color: var(--bs-primary-bg-subtle);
}
.map-search-loading {
  position: absolute;
  top: 50%;
  right: 0.75rem;
  transform: translateY(-50%);
  pointer-events: none;
}
.form-quartel-map {
  min-height: 260px;
}
.form-quartel-map :deep(.leaflet-container) {
  font-family: inherit;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.spin {
  display: inline-block;
  animation: spin 0.8s linear infinite;
}
</style>
