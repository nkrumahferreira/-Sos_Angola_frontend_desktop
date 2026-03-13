<template>
  <BModal
    :model-value="show"
    :title="autoridade ? 'Editar Autoridade' : 'Cadastrar Autoridade'"
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
          <label class="form-label">Nome</label>
          <input
            v-model="form.nome"
            type="text"
            class="form-control"
            placeholder="Ex: João Silva"
            :class="{ 'is-invalid': submitted && !form.nome }"
          />
          <div v-if="submitted && !form.nome" class="invalid-feedback">Obrigatório.</div>
        </BCol>
        <BCol cols="12">
          <label class="form-label">Tipo</label>
          <BFormSelect
            v-model="form.tipo"
            :options="tipoOptions"
            class="form-select"
            :class="{ 'is-invalid': submitted && !form.tipo }"
          />
          <div v-if="submitted && !form.tipo" class="invalid-feedback">Selecione o tipo.</div>
        </BCol>
        <BCol cols="12">
          <label class="form-label">Quartel</label>
          <p v-if="form.tipo && allowedQuartelTipoLabel" class="text-muted small mb-1">
            Apenas quarteis do tipo <strong>{{ allowedQuartelTipoLabel }}</strong> são permitidos para este tipo de autoridade.
          </p>
          <div class="quartel-select-wrap position-relative">
            <BFormInput
              v-model="quartelSearchText"
              type="text"
              placeholder="Pesquise e selecione o quartel..."
              autocomplete="off"
              :class="{ 'is-invalid': submitted && !form.id_quartel }"
              @input="onQuartelSearchInput"
              @focus="onQuartelSearchFocus"
              @blur="onQuartelSearchBlur"
            />
            <ul
              v-show="quartelDropdownOpen && (quartelSuggestions.length > 0 || quartelSearchLoading || (quartelSearchText.trim() && !quartelSearchLoading))"
              class="quartel-select-dropdown list-unstyled mb-0"
              @mousedown.prevent
            >
              <li v-if="quartelSearchLoading" class="quartel-select-item text-muted small py-2 px-3">
                <i class="ri-loader-4-line spin me-2"></i> A carregar...
              </li>
              <li
                v-for="q in quartelSuggestions"
                :key="q.id"
                class="quartel-select-item"
                @mousedown="selectQuartel(q)"
              >
                <i class="ri-building-line text-muted me-2"></i>
                <span>{{ q.nome }}</span>
                <span v-if="q.tipo" class="badge bg-light text-dark ms-2 small">{{ tipoQuartelLabel(q.tipo) }}</span>
              </li>
              <li v-if="!quartelSearchLoading && quartelSuggestions.length === 0 && quartelSearchText.trim()" class="quartel-select-item text-muted small py-2 px-3">
                Nenhum quartel encontrado.
              </li>
            </ul>
          </div>
          <div v-if="submitted && !form.id_quartel" class="invalid-feedback">Selecione o quartel.</div>
        </BCol>
        <BCol md="6">
          <label class="form-label">Telefone</label>
          <input
            :value="formatTelefoneDisplay(form.telefone)"
            type="text"
            class="form-control"
            placeholder="Ex: 963-258-741 (9 dígitos)"
            maxlength="11"
            inputmode="numeric"
            autocomplete="tel"
            @input="onTelefoneInput"
          />
        </BCol>
        <BCol md="6">
          <label class="form-label">Email</label>
          <BFormInput
            v-model="form.email"
            type="email"
            placeholder="Ex: autoridade@email.com"
            :class="{ 'is-invalid': submitted && !form.email }"
          />
          <div v-if="submitted && !form.email" class="invalid-feedback">Obrigatório.</div>
        </BCol>
        <BCol cols="12">
          <label class="form-label">{{ autoridade ? 'Nova senha (deixe em branco para manter)' : 'Senha' }}</label>
          <div class="password-input-wrap position-relative">
            <BFormInput
              v-model="form.senha"
              :type="showSenha ? 'text' : 'password'"
              :placeholder="autoridade ? 'Deixe em branco para não alterar' : 'Mínimo 6 caracteres'"
              :class="{ 'is-invalid': submitted && !autoridade && !form.senha }"
              class="pe-5"
            />
            <BButton
              type="button"
              variant="link"
              class="password-toggle-btn position-absolute top-50 end-0 translate-middle-y p-2 text-muted"
              :aria-label="showSenha ? 'Ocultar senha' : 'Visualizar senha'"
              @click="showSenha = !showSenha"
            >
              <i :class="showSenha ? 'ri-eye-off-line' : 'ri-eye-line'" class="fs-5"></i>
            </BButton>
          </div>
          <div v-if="submitted && !autoridade && !form.senha" class="invalid-feedback">Obrigatório no cadastro.</div>
        </BCol>
        <BCol cols="12">
          <div class="form-check">
            <input
              id="form-ativo-autoridade"
              v-model="form.ativo"
              type="checkbox"
              class="form-check-input"
            />
            <label class="form-check-label" for="form-ativo-autoridade">Ativo</label>
          </div>
        </BCol>
      </BRow>
      <div v-if="formError" class="alert alert-warning py-2 small mb-0 mt-2">{{ formError }}</div>
      <div class="hstack gap-2 justify-content-end mt-3">
        <BButton type="button" variant="light" @click="$emit('close')">Fechar</BButton>
        <BButton type="submit" variant="primary" :disabled="loading">
          {{ loading ? 'A guardar...' : (autoridade ? 'Atualizar' : 'Cadastrar') }}
        </BButton>
      </div>
    </BForm>
  </BModal>
</template>

<script>
import api from '@/services/api';

export default {
  name: 'FormAutoridade',
  props: {
    show: { type: Boolean, default: false },
    autoridade: { type: Object, default: null },
  },
  emits: ['close', 'saved'],
  data() {
    return {
      submitted: false,
      loading: false,
      quartelSearchText: '',
      quartelDropdownOpen: false,
      quartelSuggestions: [],
      quartelSearchLoading: false,
      quartelSearchDebounceTimer: null,
      selectedQuartel: null,
      formError: '',
      showSenha: false,
      tipoOptions: [
        { value: '', text: 'Selecione o tipo' },
        { value: 'admin', text: 'Admin' },
        { value: 'policial', text: 'Policial' },
        { value: 'bombeiro', text: 'Bombeiro' },
        { value: 'medico', text: 'Médico' },
      ],
      form: {
        nome: '',
        tipo: '',
        id_quartel: '',
        telefone: '',
        email: '',
        senha: '',
        ativo: true,
      },
    };
  },
  watch: {
    show(val) {
      if (val) {
        this.submitted = false;
        this.showSenha = false;
        this.quartelDropdownOpen = false;
        this.quartelSuggestions = [];
        if (this.autoridade) {
          this.form = {
            nome: this.autoridade.nome,
            tipo: this.autoridade.tipo,
            id_quartel: this.autoridade.id_quartel,
            telefone: this.normalizeTelefoneTo9(this.autoridade.telefone),
            email: this.autoridade.email,
            senha: '',
            ativo: this.autoridade.ativo !== false,
          };
          this.quartelSearchText = this.autoridade.nome_quartel || '';
          this.selectedQuartel = (this.autoridade.tipo_quartel != null && this.autoridade.id_quartel != null)
            ? { id: this.autoridade.id_quartel, nome: this.autoridade.nome_quartel || '', tipo: this.autoridade.tipo_quartel }
            : null;
        } else {
          this.form = {
            nome: '',
            tipo: '',
            id_quartel: '',
            telefone: '',
            email: '',
            senha: '',
            ativo: true,
          };
          this.quartelSearchText = '';
          this.selectedQuartel = null;
        }
        this.formError = '';
      }
    },
    'form.tipo'() {
      const allowed = this.getAllowedQuartelTipo();
      if (this.selectedQuartel && allowed != null && this.selectedQuartel.tipo !== allowed) {
        this.form.id_quartel = '';
        this.quartelSearchText = '';
        this.selectedQuartel = null;
        this.quartelSuggestions = [];
      }
    },
  },
  computed: {
    allowedQuartelTipoLabel() {
      const t = this.getAllowedQuartelTipo();
      if (t == null) return '';
      const map = { policia: 'Polícia', bombeiros: 'Bombeiros', saude: 'Saúde' };
      return map[t] || t;
    },
  },
  methods: {
    getAllowedQuartelTipo() {
      const map = { policial: 'policia', bombeiro: 'bombeiros', medico: 'saude' };
      return this.form.tipo ? map[this.form.tipo] ?? null : null;
    },
    normalizeTelefoneTo9(val) {
      if (val == null || val === '') return '';
      const digits = String(val).replace(/\D/g, '');
      return digits.length > 9 ? digits.slice(-9) : digits;
    },
    formatTelefoneDisplay(digitsOnly) {
      const d = (digitsOnly || '').replace(/\D/g, '').slice(0, 9);
      if (d.length <= 3) return d;
      if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
      return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
    },
    onTelefoneInput(ev) {
      const raw = (ev && ev.target ? ev.target.value : '') || '';
      const digits = raw.replace(/\D/g, '').slice(0, 9);
      this.form.telefone = digits;
    },
    tipoQuartelLabel(tipo) {
      const map = { policia: 'Polícia', bombeiros: 'Bombeiros', saude: 'Saúde' };
      return map[tipo] || tipo;
    },
    onQuartelSearchInput() {
      this.quartelDropdownOpen = true;
      this.formError = '';
      if (!(this.quartelSearchText || '').trim()) {
        this.form.id_quartel = '';
        this.selectedQuartel = null;
      }
      if (this.quartelSearchDebounceTimer) clearTimeout(this.quartelSearchDebounceTimer);
      this.quartelSearchDebounceTimer = setTimeout(() => {
        this.fetchQuarteis();
      }, 300);
    },
    onQuartelSearchFocus() {
      this.quartelDropdownOpen = true;
      if (this.quartelSuggestions.length === 0 && !this.quartelSearchLoading) {
        this.fetchQuarteis();
      }
    },
    onQuartelSearchBlur() {
      setTimeout(() => {
        this.quartelDropdownOpen = false;
      }, 200);
    },
    async fetchQuarteis() {
      const nome = (this.quartelSearchText || '').trim();
      this.quartelSearchLoading = true;
      try {
        const params = { skip: 0, limit: 100 };
        if (nome) params.nome = nome;
        const tipoQuartel = this.getAllowedQuartelTipo();
        if (tipoQuartel) params.tipo = tipoQuartel;
        const { data } = await api.get('/quarteis/', { params });
        this.quartelSuggestions = Array.isArray(data) ? data : [];
      } catch {
        this.quartelSuggestions = [];
      } finally {
        this.quartelSearchLoading = false;
      }
    },
    selectQuartel(q) {
      this.form.id_quartel = q.id;
      this.quartelSearchText = q.nome;
      this.selectedQuartel = { id: q.id, nome: q.nome, tipo: q.tipo };
      this.quartelSuggestions = [];
      this.quartelDropdownOpen = false;
      this.formError = '';
    },
    async onSubmit() {
      this.formError = '';
      this.submitted = true;
      if (!this.form.nome || !this.form.tipo || !this.form.id_quartel || !this.form.email) {
        return;
      }
      if (!this.autoridade && !this.form.senha) {
        return;
      }
      const allowedTipo = this.getAllowedQuartelTipo();
      if (allowedTipo != null && this.selectedQuartel && this.selectedQuartel.tipo !== allowedTipo) {
        this.formError = 'O quartel selecionado não é compatível com o tipo de autoridade escolhido. Policial só pode estar em quartel da Polícia; Bombeiro em quartel dos Bombeiros; Médico em quartel de Saúde.';
        return;
      }
      this.loading = true;
      try {
        const telefoneBackend = (this.form.telefone || '').replace(/\D/g, '').slice(0, 9);
        const payload = {
          nome: this.form.nome.trim(),
          tipo: this.form.tipo,
          id_quartel: Number(this.form.id_quartel),
          telefone: telefoneBackend.length === 9 ? `244${telefoneBackend}` : null,
          email: this.form.email.trim(),
          ativo: this.form.ativo,
        };
        if (this.form.senha && this.form.senha.trim()) {
          payload.senha = this.form.senha;
        }
        this.$emit('saved', {
          id: this.autoridade ? this.autoridade.id : null,
          payload,
        });
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.quartel-select-wrap {
  position: relative;
  overflow: visible;
}
.quartel-select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 9999;
  max-height: 220px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 0.25rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.2);
  margin-top: 2px;
  padding: 0.25rem 0;
}
.quartel-select-item {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.quartel-select-item:hover {
  background-color: var(--bs-primary-bg-subtle);
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.spin {
  display: inline-block;
  animation: spin 0.8s linear infinite;
}
.password-input-wrap .password-toggle-btn {
  text-decoration: none;
}
.password-input-wrap .password-toggle-btn:hover {
  color: var(--bs-primary) !important;
}
</style>
