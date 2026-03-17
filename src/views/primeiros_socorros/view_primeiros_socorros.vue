<template>
  <BModal
    :model-value="show"
    title="Visualizar Primeiros Socorros"
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
    <template v-else-if="item">
      <BRow class="g-3">
        <BCol cols="12">
          <div class="mb-2">
            <span class="text-muted small">Título</span>
            <p class="mb-0 fw-medium">{{ item.titulo }}</p>
          </div>
        </BCol>
        <BCol md="6">
          <div class="mb-2">
            <span class="text-muted small">Categoria</span>
            <p class="mb-0">{{ item.categoria }}</p>
          </div>
        </BCol>
        <BCol md="6">
          <div class="mb-2">
            <span class="text-muted small">Estado</span>
            <p class="mb-0">
              <span v-if="item.ativo" class="badge bg-success-subtle text-success">Ativo</span>
              <span v-else class="badge bg-secondary-subtle text-secondary">Inativo</span>
            </p>
          </div>
        </BCol>
        <BCol md="6">
          <div class="mb-2">
            <span class="text-muted small">Ordem</span>
            <p class="mb-0">{{ item.ordem }}</p>
          </div>
        </BCol>
        <BCol cols="12" v-if="item.descricao">
          <div class="mb-2">
            <span class="text-muted small">Descrição</span>
            <p class="mb-0">{{ item.descricao }}</p>
          </div>
        </BCol>
        <BCol cols="12" v-if="item.instrucoes">
          <div class="mb-2">
            <span class="text-muted small">Instruções</span>
            <p class="mb-0 white-space-pre-wrap">{{ item.instrucoes }}</p>
          </div>
        </BCol>
        <BCol cols="12" v-if="item.video_url">
          <div class="mb-2">
            <span class="text-muted small">URL do vídeo</span>
            <p class="mb-0">
              <a :href="item.video_url" target="_blank" rel="noopener">{{ item.video_url }}</a>
            </p>
          </div>
        </BCol>
        <BCol cols="12" v-if="item.imagem_url">
          <div class="mb-2">
            <span class="text-muted small">Imagem</span>
            <div class="mt-1">
              <img
                :src="imagemFullUrl"
                alt="Imagem"
                class="rounded border"
                style="max-height: 280px; max-width: 100%; object-fit: contain"
              />
            </div>
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
import api from '@/services/api';
import { getApiBaseUrl } from '@/utils/apiBase';

const BASE = 'primeiros-socorros/admin';

export default {
  name: 'ViewPrimeirosSocorros',
  props: {
    show: { type: Boolean, default: false },
    itemId: { type: Number, default: null },
  },
  emits: ['close'],
  data() {
    return {
      item: null,
      loading: false,
      error: null,
    };
  },
  computed: {
    imagemFullUrl() {
      if (!this.item?.imagem_url) return '';
      const base = getApiBaseUrl();
      return `${base}/api/v1/uploads/${this.item.imagem_url}`;
    },
  },
  watch: {
    show(val) {
      if (val && this.itemId) {
        this.fetchItem();
      } else {
        this.item = null;
        this.error = null;
      }
    },
    itemId() {
      if (this.show && this.itemId) {
        this.fetchItem();
      }
    },
  },
  methods: {
    async fetchItem() {
      this.loading = true;
      this.error = null;
      this.item = null;
      try {
        const { data } = await api.get(`/${BASE}/${this.itemId}`);
        this.item = data;
      } catch (err) {
        this.error = err.response?.data?.detail || err.message || 'Erro ao carregar.';
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.white-space-pre-wrap {
  white-space: pre-wrap;
}
</style>
