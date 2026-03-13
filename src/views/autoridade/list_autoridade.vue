<template>
  <Layout>
    <BRow>
      <BCol cols="12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
          <h4 class="mb-sm-0">Gestão de Autoridades</h4>
        </div>
      </BCol>
    </BRow>
    <BRow>
      <BCol cols="12">
        <BCard no-body>
          <BCardHeader>
            <div class="d-flex align-items-center flex-wrap gap-2">
              <div class="flex-grow-1">
                <BButton variant="primary" @click="openForm">
                  <i class="ri-add-fill me-1 align-bottom"></i> Cadastrar Autoridade
                </BButton>
              </div>
            </div>
          </BCardHeader>
          <BCardBody class="border-bottom">
            <BRow class="g-2 align-items-end mb-0">
              <BCol md="3" sm="6">
                <label class="form-label small text-muted mb-1">Pesquisar por nome</label>
                <BFormInput
                  v-model="filterNome"
                  type="text"
                  size="sm"
                  placeholder="Nome da autoridade..."
                  @keyup.enter="applyFilters"
                />
              </BCol>
              <BCol md="2" sm="6">
                <label class="form-label small text-muted mb-1">Tipo</label>
                <BFormSelect
                  v-model="filterTipo"
                  :options="filterTipoOptions"
                  size="sm"
                  class="form-select-sm"
                  @change="applyFilters"
                />
              </BCol>
              <BCol md="2" sm="6">
                <label class="form-label small text-muted mb-1">Estado</label>
                <BFormSelect
                  v-model="filterAtivo"
                  :options="filterAtivoOptions"
                  size="sm"
                  class="form-select-sm"
                  @change="applyFilters"
                />
              </BCol>
              <BCol md="2" sm="6">
                <BButton variant="primary" size="sm" class="w-100" @click="applyFilters">
                  <i class="ri-search-line me-1"></i> Pesquisar
                </BButton>
              </BCol>
              <BCol md="2" sm="6">
                <BButton variant="soft-secondary" size="sm" class="w-100" @click="clearFilters">
                  <i class="ri-filter-off-line me-1"></i> Limpar
                </BButton>
              </BCol>
            </BRow>
          </BCardBody>
          <BCardBody>
            <div v-if="loading" class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">A carregar...</span>
              </div>
            </div>
            <div v-else class="table-responsive">
              <table class="table table-bordered table-nowrap align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Nome</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Quartel</th>
                    <th scope="col">Telefone</th>
                    <th scope="col">Email</th>
                    <th scope="col">Ativo</th>
                    <th scope="col" style="width: 140px">Opções</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(a, index) in autoridades" :key="a.id">
                    <td>{{ (currentPage - 1) * perPage + index + 1 }}</td>
                    <td>{{ a.nome }}</td>
                    <td>
                      <BBadge :variant="tipoBadge(a.tipo)">{{ tipoLabel(a.tipo) }}</BBadge>
                    </td>
                    <td>{{ a.nome_quartel || '—' }}</td>
                    <td>{{ a.telefone || '—' }}</td>
                    <td>{{ a.email }}</td>
                    <td>
                      <span v-if="a.ativo" class="badge bg-success-subtle text-success">Sim</span>
                      <span v-else class="badge bg-secondary-subtle text-secondary">Não</span>
                    </td>
                    <td>
                      <div class="hstack gap-1">
                        <BButton variant="soft-info" size="sm" class="btn-icon" v-b-tooltip.hover title="Visualizar"
                          @click="openView(a.id)">
                          <i class="ri-eye-fill"></i>
                        </BButton>
                        <BButton variant="soft-primary" size="sm" class="btn-icon" v-b-tooltip.hover title="Editar"
                          @click="openForm(a)">
                          <i class="ri-pencil-fill"></i>
                        </BButton>
                        <BButton variant="soft-danger" size="sm" class="btn-icon" v-b-tooltip.hover title="Eliminar"
                          @click="openDelete(a)">
                          <i class="ri-delete-bin-fill"></i>
                        </BButton>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!loading && autoridades.length === 0">
                    <td colspan="8" class="text-center text-muted py-4">Nenhuma autoridade cadastrada.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="!loading && (autoridades.length > 0 || currentPage > 1)" class="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3">
              <div class="text-muted small">
                <template v-if="autoridades.length > 0">
                  A mostrar {{ (currentPage - 1) * perPage + 1 }} a {{ (currentPage - 1) * perPage + autoridades.length }}
                </template>
                <template v-else>Nenhum registo nesta página.</template>
              </div>
              <div class="d-flex align-items-center gap-1">
                <BButton variant="light" size="sm" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
                  <i class="ri-arrow-left-s-line"></i> Anterior
                </BButton>
                <span class="px-2 small text-muted">Página {{ currentPage }}</span>
                <BButton variant="light" size="sm" :disabled="!hasNextPage" @click="goToPage(currentPage + 1)">
                  Próxima <i class="ri-arrow-right-s-line"></i>
                </BButton>
              </div>
            </div>
          </BCardBody>
        </BCard>
      </BCol>
    </BRow>

    <ViewAutoridade
      :show="showViewModal"
      :autoridade-id="autoridadeToViewId"
      @close="showViewModal = false"
    />
    <FormAutoridade
      :show="showFormModal"
      :autoridade="autoridadeToEdit"
      @close="showFormModal = false"
      @saved="onFormSaved"
    />
    <DeleteAutoridade
      :show="showDeleteModal"
      :autoridade="autoridadeToDelete"
      @close="showDeleteModal = false"
      @confirm="onDeleteConfirm"
    />

    <ModalSucesso
      :show="showSuccessModal"
      :title="successTitle"
      :message="successMessage"
      @close="showSuccessModal = false"
    />
    <ModalErro
      :show="showErrorModal"
      :title="errorTitle"
      :message="errorMessage"
      @close="showErrorModal = false"
    />
  </Layout>
</template>

<script>
import Layout from '@/layouts/main.vue';
import api from '@/services/api';
import ViewAutoridade from './view_autoridade.vue';
import FormAutoridade from './form_autoridade.vue';
import DeleteAutoridade from './delete_autoridade.vue';
import ModalSucesso from '@/components/ModalSucesso.vue';
import ModalErro from '@/components/ModalErro.vue';

export default {
  name: 'ListAutoridade',
  components: { Layout, ViewAutoridade, FormAutoridade, DeleteAutoridade, ModalSucesso, ModalErro },
  data() {
    return {
      autoridades: [],
      loading: false,
      perPage: 10,
      currentPage: 1,
      hasNextPage: false,
      filterNome: '',
      filterTipo: '',
      filterAtivo: null,
      filterTipoOptions: [
        { value: '', text: 'Todos os tipos' },
        { value: 'admin', text: 'Admin' },
        { value: 'policial', text: 'Policial' },
        { value: 'bombeiro', text: 'Bombeiro' },
        { value: 'medico', text: 'Médico' },
      ],
      filterAtivoOptions: [
        { value: null, text: 'Todos' },
        { value: true, text: 'Ativo' },
        { value: false, text: 'Inativo' },
      ],
      showViewModal: false,
      autoridadeToViewId: null,
      showFormModal: false,
      showDeleteModal: false,
      autoridadeToEdit: null,
      autoridadeToDelete: null,
      showSuccessModal: false,
      successTitle: 'Sucesso',
      successMessage: '',
      showErrorModal: false,
      errorTitle: 'Erro',
      errorMessage: '',
    };
  },
  mounted() {
    this.fetchList();
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
    async fetchList(page = 1) {
      this.loading = true;
      this.currentPage = page;
      const skip = (page - 1) * this.perPage;
      const limit = this.perPage + 1;
      const params = { skip, limit };
      if (this.filterNome && this.filterNome.trim()) params.nome = this.filterNome.trim();
      if (this.filterTipo) params.tipo = this.filterTipo;
      if (this.filterAtivo !== null && this.filterAtivo !== undefined && this.filterAtivo !== '') {
        params.ativo = this.filterAtivo === true || this.filterAtivo === 'true';
      }
      try {
        const { data } = await api.get('/cadastro-autoridades/', { params });
        const list = Array.isArray(data) ? data : [];
        this.hasNextPage = list.length > this.perPage;
        this.autoridades = list.slice(0, this.perPage);
      } catch (err) {
        this.autoridades = [];
        this.hasNextPage = false;
        this.errorMessage = err.response?.data?.detail || err.message || 'Erro ao carregar autoridades.';
        this.showErrorModal = true;
      } finally {
        this.loading = false;
      }
    },
    applyFilters() {
      this.fetchList(1);
    },
    clearFilters() {
      this.filterNome = '';
      this.filterTipo = '';
      this.filterAtivo = null;
      this.fetchList(1);
    },
    goToPage(page) {
      if (page < 1) return;
      this.fetchList(page);
    },
    openView(id) {
      this.autoridadeToViewId = id;
      this.showViewModal = true;
    },
    openForm(autoridade = null) {
      this.autoridadeToEdit = autoridade;
      this.showFormModal = true;
    },
    openDelete(autoridade) {
      this.autoridadeToDelete = autoridade;
      this.showDeleteModal = true;
    },
    async onFormSaved({ id, payload }) {
      try {
        if (id) {
          await api.patch(`/cadastro-autoridades/${id}`, payload);
        } else {
          await api.post('/cadastro-autoridades/', payload);
        }
        this.showFormModal = false;
        const nome = payload?.nome || '';
        this.successMessage = id
          ? `Autoridade "${nome}" atualizada com sucesso.`
          : `Autoridade "${nome}" cadastrada com sucesso.`;
        this.showSuccessModal = true;
        await this.fetchList(this.currentPage);
      } catch (err) {
        const detail = err.response?.data?.detail;
        if (typeof detail === 'string') this.errorMessage = detail;
        else if (Array.isArray(detail) && detail.length) this.errorMessage = detail.map((d) => d.msg || d.loc?.join('.')).join(' ');
        else this.errorMessage = err.message || 'Erro ao guardar.';
        this.showErrorModal = true;
      }
    },
    async onDeleteConfirm(id) {
      const nomeAutoridade = this.autoridadeToDelete?.nome || 'Autoridade';
      try {
        await api.delete(`/cadastro-autoridades/${id}`);
        this.showDeleteModal = false;
        this.successMessage = `Autoridade "${nomeAutoridade}" eliminada com sucesso.`;
        this.showSuccessModal = true;
        await this.fetchList(this.currentPage);
      } catch (err) {
        this.errorMessage = err.response?.data?.detail || err.message || 'Erro ao eliminar.';
        this.showErrorModal = true;
      }
    },
  },
};
</script>
