<template>
  <Layout>
    <BRow>
      <BCol cols="12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
          <h4 class="mb-sm-0">Gestão de Quarteis</h4>
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
                  <i class="ri-add-fill me-1 align-bottom"></i> Cadastrar Quartel
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
                  placeholder="Nome do quartel..."
                  @keyup.enter="applyFilters"
                />
              </BCol>
              <BCol md="2" sm="6">
                <label class="form-label small text-muted mb-1">Tipo de quartel</label>
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
                    <th scope="col">Latitude</th>
                    <th scope="col">Longitude</th>
                    <th scope="col">Ativo</th>
                    <th scope="col" style="width: 140px">Opções</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(q, index) in quarteis" :key="q.id">
                    <td>{{ (currentPage - 1) * perPage + index + 1 }}</td>
                    <td>{{ q.nome }}</td>
                    <td>
                      <BBadge :variant="tipoBadge(q.tipo)">{{ tipoLabel(q.tipo) }}</BBadge>
                    </td>
                    <td>{{ q.latitude }}</td>
                    <td>{{ q.longitude }}</td>
                    <td>
                      <span v-if="q.ativo" class="badge bg-success-subtle text-success">Sim</span>
                      <span v-else class="badge bg-secondary-subtle text-secondary">Não</span>
                    </td>
                    <td>
                      <div class="hstack gap-1">
                        <BButton variant="soft-info" size="sm" class="btn-icon" v-b-tooltip.hover title="Visualizar"
                          @click="openView(q.id)">
                          <i class="ri-eye-fill"></i>
                        </BButton>
                        <BButton variant="soft-primary" size="sm" class="btn-icon" v-b-tooltip.hover title="Editar"
                          @click="openForm(q)">
                          <i class="ri-pencil-fill"></i>
                        </BButton>
                        <BButton variant="soft-danger" size="sm" class="btn-icon" v-b-tooltip.hover title="Eliminar"
                          @click="openDelete(q)">
                          <i class="ri-delete-bin-fill"></i>
                        </BButton>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!loading && quarteis.length === 0">
                    <td colspan="7" class="text-center text-muted py-4">Nenhum quartel cadastrado.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="!loading && (quarteis.length > 0 || currentPage > 1)" class="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3">
              <div class="text-muted small">
                <template v-if="quarteis.length > 0">
                  A mostrar {{ (currentPage - 1) * perPage + 1 }} a {{ (currentPage - 1) * perPage + quarteis.length }}
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

    <FormQuartel
      :show="showFormModal"
      :quartel="quartelToEdit"
      @close="showFormModal = false"
      @saved="onFormSaved"
    />
    <DeleteQuartel
      :show="showDeleteModal"
      :quartel="quartelToDelete"
      @close="showDeleteModal = false"
      @confirm="onDeleteConfirm"
    />
    <ViewQuartel
      :show="showViewModal"
      :quartel-id="quartelToViewId"
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
import FormQuartel from './form_quartel.vue';
import DeleteQuartel from './delete_quartel.vue';
import ViewQuartel from './view_quartel.vue';
import ModalSucesso from '@/components/ModalSucesso.vue';
import ModalErro from '@/components/ModalErro.vue';

export default {
  name: 'ListQuartel',
  components: { Layout, FormQuartel, DeleteQuartel, ViewQuartel, ModalSucesso, ModalErro },
  data() {
    return {
      quarteis: [],
      loading: false,
      perPage: 10,
      currentPage: 1,
      hasNextPage: false,
      filterNome: '',
      filterTipo: '',
      filterAtivo: null,
      filterTipoOptions: [
        { value: '', text: 'Todos os tipos' },
        { value: 'policia', text: 'Polícia' },
        { value: 'bombeiros', text: 'Bombeiros' },
        { value: 'saude', text: 'Saúde' },
      ],
      filterAtivoOptions: [
        { value: null, text: 'Todos' },
        { value: true, text: 'Ativo' },
        { value: false, text: 'Inativo' },
      ],
      showFormModal: false,
      showDeleteModal: false,
      showViewModal: false,
      quartelToEdit: null,
      quartelToDelete: null,
      quartelToViewId: null,
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
      const map = { policia: 'Polícia', bombeiros: 'Bombeiros', saude: 'Saúde' };
      return map[tipo] || tipo;
    },
    tipoBadge(tipo) {
      const map = { policia: 'primary', bombeiros: 'danger', saude: 'success' };
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
        const { data } = await api.get('/quarteis/', { params });
        const list = Array.isArray(data) ? data : [];
        this.hasNextPage = list.length > this.perPage;
        this.quarteis = list.slice(0, this.perPage);
      } catch (err) {
        this.quarteis = [];
        this.hasNextPage = false;
        this.errorMessage = err.response?.data?.detail || err.message || 'Erro ao carregar quarteis.';
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
    openForm(quartel = null) {
      this.quartelToEdit = quartel;
      this.showFormModal = true;
    },
    openDelete(quartel) {
      this.quartelToDelete = quartel;
      this.showDeleteModal = true;
    },
    openView(id) {
      this.quartelToViewId = id;
      this.showViewModal = true;
    },
    async onFormSaved({ id, payload }) {
      try {
        if (id) {
          await api.patch(`/quarteis/${id}`, payload);
        } else {
          await api.post('/quarteis/', payload);
        }
        this.showFormModal = false;
        const nome = payload?.nome || '';
        this.successMessage = id
          ? `Quartel "${nome}" atualizado com sucesso.`
          : `Quartel "${nome}" cadastrado com sucesso.`;
        this.showSuccessModal = true;
        await this.fetchList(this.currentPage);
      } catch (err) {
        this.errorMessage = err.response?.data?.detail || err.message || 'Erro ao guardar.';
        this.showErrorModal = true;
      }
    },
    async onDeleteConfirm(id) {
      const nomeQuartel = this.quartelToDelete?.nome || 'Quartel';
      try {
        await api.delete(`/quarteis/${id}`);
        this.showDeleteModal = false;
        this.successMessage = `Quartel "${nomeQuartel}" eliminado com sucesso.`;
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
