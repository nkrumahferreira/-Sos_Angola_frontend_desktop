<template>
  <Layout>
    <BRow>
      <BCol cols="12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
          <h4 class="mb-sm-0">Gestão de Primeiros Socorros</h4>
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
                  <i class="ri-add-fill me-1 align-bottom"></i> Cadastrar Primeiros Socorros
                </BButton>
              </div>
            </div>
          </BCardHeader>
          <BCardBody class="border-bottom">
            <BRow class="g-2 align-items-end mb-0">
              <BCol md="3" sm="6">
                <label class="form-label small text-muted mb-1">Pesquisar por título</label>
                <BFormInput
                  v-model="filterTitulo"
                  type="text"
                  size="sm"
                  placeholder="Título..."
                  @keyup.enter="applyFilters"
                />
              </BCol>
              <BCol md="2" sm="6">
                <label class="form-label small text-muted mb-1">Categoria</label>
                <BFormInput
                  v-model="filterCategoria"
                  type="text"
                  size="sm"
                  placeholder="Ex: queimaduras"
                  @keyup.enter="applyFilters"
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
                    <th scope="col">Título</th>
                    <th scope="col">Categoria</th>
                    <th scope="col">Ordem</th>
                    <th scope="col">Ativo</th>
                    <th scope="col" style="width: 140px">Opções</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in items" :key="item.id">
                    <td>{{ (currentPage - 1) * perPage + index + 1 }}</td>
                    <td>{{ item.titulo }}</td>
                    <td>{{ item.categoria }}</td>
                    <td>{{ item.ordem }}</td>
                    <td>
                      <span v-if="item.ativo" class="badge bg-success-subtle text-success">Sim</span>
                      <span v-else class="badge bg-secondary-subtle text-secondary">Não</span>
                    </td>
                    <td>
                      <div class="hstack gap-1">
                        <BButton variant="soft-info" size="sm" class="btn-icon" v-b-tooltip.hover title="Visualizar"
                          @click="openView(item.id)">
                          <i class="ri-eye-fill"></i>
                        </BButton>
                        <BButton variant="soft-primary" size="sm" class="btn-icon" v-b-tooltip.hover title="Editar"
                          @click="openForm(item)">
                          <i class="ri-pencil-fill"></i>
                        </BButton>
                        <BButton variant="soft-danger" size="sm" class="btn-icon" v-b-tooltip.hover title="Eliminar"
                          @click="openDelete(item)">
                          <i class="ri-delete-bin-fill"></i>
                        </BButton>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!loading && items.length === 0">
                    <td colspan="6" class="text-center text-muted py-4">Nenhum registo de primeiros socorros.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="!loading && (items.length > 0 || currentPage > 1)" class="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3">
              <div class="text-muted small">
                <template v-if="items.length > 0">
                  A mostrar {{ (currentPage - 1) * perPage + 1 }} a {{ (currentPage - 1) * perPage + items.length }}
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

    <FormPrimeirosSocorros
      :show="showFormModal"
      :item="itemToEdit"
      @close="showFormModal = false"
      @saved="onFormSaved"
      @error="onFormError"
    />
    <DeletePrimeirosSocorros
      :show="showDeleteModal"
      :item="itemToDelete"
      @close="showDeleteModal = false"
      @confirm="onDeleteConfirm"
    />
    <ViewPrimeirosSocorros
      :show="showViewModal"
      :item-id="itemToViewId"
      @close="showViewModal = false"
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
import FormPrimeirosSocorros from './form_primeiros_socorros.vue';
import DeletePrimeirosSocorros from './delete_primeiros_socorros.vue';
import ViewPrimeirosSocorros from './view_primeiros_socorros.vue';
import ModalSucesso from '@/components/ModalSucesso.vue';
import ModalErro from '@/components/ModalErro.vue';

const BASE = 'primeiros-socorros/admin';

export default {
  name: 'ListPrimeirosSocorros',
  components: {
    Layout,
    FormPrimeirosSocorros,
    DeletePrimeirosSocorros,
    ViewPrimeirosSocorros,
    ModalSucesso,
    ModalErro,
  },
  data() {
    return {
      items: [],
      loading: false,
      perPage: 10,
      currentPage: 1,
      hasNextPage: false,
      filterTitulo: '',
      filterCategoria: '',
      filterAtivo: null,
      filterAtivoOptions: [
        { value: null, text: 'Todos' },
        { value: true, text: 'Ativo' },
        { value: false, text: 'Inativo' },
      ],
      showFormModal: false,
      showDeleteModal: false,
      showViewModal: false,
      itemToEdit: null,
      itemToDelete: null,
      itemToViewId: null,
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
    async fetchList(page = 1) {
      this.loading = true;
      this.currentPage = page;
      const skip = (page - 1) * this.perPage;
      const limit = this.perPage + 1;
      const params = { skip, limit };
      if (this.filterCategoria && this.filterCategoria.trim()) params.categoria = this.filterCategoria.trim();
      if (this.filterAtivo !== null && this.filterAtivo !== undefined && this.filterAtivo !== '') {
        params.ativo = this.filterAtivo === true || this.filterAtivo === 'true';
      }
      try {
        const { data } = await api.get(`/${BASE}/`, { params });
        const list = Array.isArray(data) ? data : [];
        this.hasNextPage = list.length > this.perPage;
        this.items = list.slice(0, this.perPage);
      } catch (err) {
        this.items = [];
        this.hasNextPage = false;
        this.errorMessage = err.response?.data?.detail || err.message || 'Erro ao carregar primeiros socorros.';
        this.showErrorModal = true;
      } finally {
        this.loading = false;
      }
    },
    applyFilters() {
      this.fetchList(1);
    },
    clearFilters() {
      this.filterTitulo = '';
      this.filterCategoria = '';
      this.filterAtivo = null;
      this.fetchList(1);
    },
    goToPage(page) {
      if (page < 1) return;
      this.fetchList(page);
    },
    openForm(item = null) {
      this.itemToEdit = item;
      this.showFormModal = true;
    },
    openDelete(item) {
      this.itemToDelete = item;
      this.showDeleteModal = true;
    },
    openView(id) {
      this.itemToViewId = id;
      this.showViewModal = true;
    },
    onFormSaved() {
      this.showFormModal = false;
      this.successMessage = 'Registo guardado com sucesso.';
      this.showSuccessModal = true;
      this.fetchList(this.currentPage);
    },
    onFormError(message) {
      this.showFormModal = false;
      this.errorMessage = message || 'Erro ao guardar.';
      this.showErrorModal = true;
    },
    async onDeleteConfirm(id) {
      const titulo = this.itemToDelete?.titulo || 'Primeiros socorros';
      try {
        await api.delete(`/${BASE}/${id}`);
        this.showDeleteModal = false;
        this.successMessage = `"${titulo}" eliminado com sucesso.`;
        this.showSuccessModal = true;
        this.fetchList(this.currentPage);
      } catch (err) {
        this.errorMessage = err.response?.data?.detail || err.message || 'Erro ao eliminar.';
        this.showErrorModal = true;
      }
    },
  },
};
</script>
