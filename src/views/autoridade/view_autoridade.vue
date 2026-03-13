<template>
  <BModal
    :model-value="show"
    title="Visualizar Autoridade"
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
    <template v-else-if="autoridade">
      <BRow class="g-3">
        <BCol cols="12">
          <div class="mb-2">
            <span class="text-muted small">Nome</span>
            <p class="mb-0 fw-medium">{{ autoridade.nome }}</p>
          </div>
        </BCol>
        <BCol md="6">
          <div class="mb-2">
            <span class="text-muted small">Tipo</span>
            <p class="mb-0">
              <BBadge :variant="tipoBadge(autoridade.tipo)">{{ tipoLabel(autoridade.tipo) }}</BBadge>
            </p>
          </div>
        </BCol>
        <BCol md="6">
          <div class="mb-2">
            <span class="text-muted small">Estado</span>
            <p class="mb-0">
              <span v-if="autoridade.ativo" class="badge bg-success-subtle text-success">Ativo</span>
              <span v-else class="badge bg-secondary-subtle text-secondary">Inativo</span>
            </p>
          </div>
        </BCol>
        <BCol cols="12">
          <div class="mb-2">
            <span class="text-muted small">Quartel</span>
            <p class="mb-0">{{ autoridade.nome_quartel || '—' }}</p>
            <p v-if="autoridade.tipo_quartel" class="mb-0 small text-muted">
              Tipo: {{ tipoQuartelLabel(autoridade.tipo_quartel) }}
            </p>
          </div>
        </BCol>
        <BCol md="6">
          <div class="mb-2">
            <span class="text-muted small">Telefone</span>
            <p class="mb-0">{{ autoridade.telefone || '—' }}</p>
          </div>
        </BCol>
        <BCol md="6">
          <div class="mb-2">
            <span class="text-muted small">Email</span>
            <p class="mb-0">{{ autoridade.email || '—' }}</p>
          </div>
        </BCol>
        <BCol md="6" v-if="autoridade.created_at">
          <div class="mb-2">
            <span class="text-muted small">Data de registo</span>
            <p class="mb-0">{{ formatDate(autoridade.created_at) }}</p>
          </div>
        </BCol>
        <BCol md="6" v-if="autoridade.updated_at">
          <div class="mb-2">
            <span class="text-muted small">Última atualização</span>
            <p class="mb-0">{{ formatDate(autoridade.updated_at) }}</p>
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

export default {
  name: 'ViewAutoridade',
  props: {
    show: { type: Boolean, default: false },
    autoridadeId: { type: Number, default: null },
  },
  emits: ['close'],
  data() {
    return {
      autoridade: null,
      loading: false,
      error: null,
    };
  },
  watch: {
    show(val) {
      if (val && this.autoridadeId) {
        this.fetchAutoridade();
      } else {
        this.autoridade = null;
        this.error = null;
      }
    },
    autoridadeId() {
      if (this.show && this.autoridadeId) {
        this.fetchAutoridade();
      }
    },
  },
  methods: {
    tipoLabel(tipo) {
      const map = { admin: 'Admin', policial: 'Policial', bombeiro: 'Bombeiro', medico: 'Médico' };
      return map[tipo] || tipo;
    },
    tipoBadge(tipo) {
      const map = { admin: 'dark', policial: 'primary', bombeiro: 'danger', medico: 'success' };
      return map[tipo] || 'secondary';
    },
    tipoQuartelLabel(tipo) {
      const map = { policia: 'Polícia', bombeiros: 'Bombeiros', saude: 'Saúde' };
      return map[tipo] || tipo;
    },
    formatDate(val) {
      if (!val) return '—';
      try {
        const d = new Date(val);
        return d.toLocaleString('pt-AO', { dateStyle: 'short', timeStyle: 'short' });
      } catch {
        return val;
      }
    },
    async fetchAutoridade() {
      this.loading = true;
      this.error = null;
      this.autoridade = null;
      try {
        const { data } = await api.get(`/cadastro-autoridades/${this.autoridadeId}`);
        this.autoridade = data;
      } catch (err) {
        this.error = err.response?.data?.detail || err.message || 'Erro ao carregar os dados da autoridade.';
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
