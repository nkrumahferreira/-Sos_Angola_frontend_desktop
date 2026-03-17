<template>
  <BModal
    :model-value="show"
    :title="item ? 'Editar Primeiros Socorros' : 'Cadastrar Primeiros Socorros'"
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
          <label class="form-label">Título</label>
          <input
            v-model="form.titulo"
            type="text"
            class="form-control"
            placeholder="Ex: Como tratar queimaduras"
            :class="{ 'is-invalid': submitted && !form.titulo }"
          />
          <div v-if="submitted && !form.titulo" class="invalid-feedback">Obrigatório.</div>
        </BCol>
        <BCol cols="12">
          <label class="form-label">Categoria</label>
          <input
            v-model="form.categoria"
            type="text"
            class="form-control"
            placeholder="Ex: queimaduras, hemorragia, paragem_cardiaca"
            :class="{ 'is-invalid': submitted && !form.categoria }"
          />
          <div v-if="submitted && !form.categoria" class="invalid-feedback">Obrigatório.</div>
        </BCol>
        <BCol cols="12">
          <label class="form-label">Descrição (resumo)</label>
          <BFormTextarea
            v-model="form.descricao"
            rows="2"
            class="form-control"
            placeholder="Resumo curto..."
          />
        </BCol>
        <BCol cols="12">
          <label class="form-label">Instruções (passo a passo)</label>
          <BFormTextarea
            v-model="form.instrucoes"
            rows="4"
            class="form-control"
            placeholder="Texto completo das instruções..."
          />
        </BCol>
        <BCol cols="12">
          <label class="form-label">URL do vídeo (ex.: YouTube)</label>
          <input
            v-model="form.video_url"
            type="url"
            class="form-control"
            placeholder="https://..."
          />
        </BCol>
        <BCol md="6">
          <label class="form-label">Ordem</label>
          <input
            v-model.number="form.ordem"
            type="number"
            min="0"
            class="form-control"
          />
        </BCol>
        <BCol cols="12">
          <label class="form-label">Imagem</label>
          <input
            ref="imagemInputRef"
            type="file"
            accept="image/jpeg,image/png,image/gif,image/jpg"
            class="form-control"
            @change="onImagemChange"
          />
          <p class="small text-muted mb-0 mt-1">JPG, PNG ou GIF. Máx. 10 MB. Opcional na edição.</p>
          <div v-if="item && item.imagem_url" class="mt-2">
            <img
              :src="imagemPreviewUrl"
              alt="Imagem atual"
              class="rounded border"
              style="max-height: 120px; max-width: 200px; object-fit: contain"
            />
            <p class="small text-muted mb-0">Imagem atual (substituir escolhendo novo ficheiro acima).</p>
          </div>
        </BCol>
        <BCol cols="12">
          <div class="form-check">
            <input
              id="form-ativo-ps"
              v-model="form.ativo"
              type="checkbox"
              class="form-check-input"
            />
            <label class="form-check-label" for="form-ativo-ps">Ativo</label>
          </div>
        </BCol>
      </BRow>
      <div class="hstack gap-2 justify-content-end mt-3">
        <BButton type="button" variant="light" @click="$emit('close')">Fechar</BButton>
        <BButton type="submit" variant="primary" :disabled="loading">
          {{ loading ? 'A guardar...' : (item ? 'Atualizar' : 'Cadastrar') }}
        </BButton>
      </div>
    </BForm>
  </BModal>
</template>

<script>
import api from '@/services/api';
import { getApiBaseUrl } from '@/utils/apiBase';

const BASE = 'primeiros-socorros/admin';

export default {
  name: 'FormPrimeirosSocorros',
  props: {
    show: { type: Boolean, default: false },
    item: { type: Object, default: null },
  },
  emits: ['close', 'saved', 'error'],
  data() {
    return {
      submitted: false,
      loading: false,
      form: {
        titulo: '',
        categoria: '',
        descricao: '',
        instrucoes: '',
        video_url: '',
        ordem: 0,
        ativo: true,
      },
      imagemFile: null,
    };
  },
  computed: {
    imagemPreviewUrl() {
      if (!this.item || !this.item.imagem_url) return '';
      const base = getApiBaseUrl();
      return `${base}/api/v1/uploads/${this.item.imagem_url}`;
    },
  },
  watch: {
    show(val) {
      if (val) {
        this.submitted = false;
        this.imagemFile = null;
        if (this.$refs.imagemInputRef) this.$refs.imagemInputRef.value = '';
        if (this.item) {
          this.form = {
            titulo: this.item.titulo || '',
            categoria: this.item.categoria || '',
            descricao: this.item.descricao || '',
            instrucoes: this.item.instrucoes || '',
            video_url: this.item.video_url || '',
            ordem: this.item.ordem ?? 0,
            ativo: this.item.ativo !== false,
          };
        } else {
          this.form = {
            titulo: '',
            categoria: '',
            descricao: '',
            instrucoes: '',
            video_url: '',
            ordem: 0,
            ativo: true,
          };
        }
      }
    },
  },
  methods: {
    onImagemChange(ev) {
      const file = ev.target?.files?.[0];
      this.imagemFile = file || null;
    },
    async onSubmit() {
      this.submitted = true;
      if (!this.form.titulo?.trim() || !this.form.categoria?.trim()) {
        return;
      }
      this.loading = true;
      try {
        if (this.item) {
          await this.doUpdate();
        } else {
          await this.doCreate();
        }
        this.$emit('saved');
        this.$emit('close');
      } catch (err) {
        const msg = err.response?.data?.detail || err.message || 'Erro ao guardar.';
        this.$emit('error', msg);
      } finally {
        this.loading = false;
      }
    },
    async doCreate() {
      const formData = new FormData();
      formData.append('titulo', this.form.titulo.trim());
      formData.append('categoria', this.form.categoria.trim());
      formData.append('descricao', (this.form.descricao || '').trim());
      formData.append('instrucoes', (this.form.instrucoes || '').trim());
      formData.append('video_url', (this.form.video_url || '').trim());
      formData.append('ordem', String(this.form.ordem ?? 0));
      formData.append('ativo', this.form.ativo ? 'true' : 'false');
      if (this.imagemFile) {
        formData.append('imagem', this.imagemFile);
      }
      const { data } = await api.post(`/${BASE}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    async doUpdate() {
      const id = this.item.id;
      const payload = {
        titulo: this.form.titulo.trim(),
        categoria: this.form.categoria.trim(),
        descricao: (this.form.descricao || '').trim() || null,
        instrucoes: (this.form.instrucoes || '').trim() || null,
        video_url: (this.form.video_url || '').trim() || null,
        ordem: this.form.ordem ?? 0,
        ativo: this.form.ativo,
      };
      await api.patch(`/${BASE}/${id}`, payload);
      if (this.imagemFile) {
        const formData = new FormData();
        formData.append('imagem', this.imagemFile);
        await api.post(`/${BASE}/${id}/imagem`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
    },
  },
};
</script>
