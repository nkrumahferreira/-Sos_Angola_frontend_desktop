<template>
  <Layout>
    <BRow>
      <BCol cols="12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
          <h4 class="mb-sm-0">Gestão de SOS / Alertas</h4>
        </div>
      </BCol>
    </BRow>
    <BRow>
      <BCol cols="12">
        <BCard no-body>
          <BCardBody class="border-bottom">
            <BRow class="g-2 align-items-end mb-0">
              <BCol md="3" sm="6">
                <label class="form-label small text-muted mb-1">Tipo</label>
                <BFormSelect
                  v-model="filterTipo"
                  :options="filterTipoOptions"
                  size="sm"
                  class="form-select-sm"
                  @change="applyFilters"
                />
              </BCol>
              <BCol md="3" sm="6">
                <label class="form-label small text-muted mb-1">Estado</label>
                <BFormSelect
                  v-model="filterEstado"
                  :options="filterEstadoOptions"
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
                    <th scope="col">Tipo</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Localização</th>
                    <th scope="col">Data</th>
                    <th scope="col" style="width: 200px">Opções</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(a, index) in alertas" :key="a.id">
                    <td>{{ (currentPage - 1) * perPage + index + 1 }}</td>
                    <td>
                      <BBadge :variant="tipoBadge(a.tipo)">{{ tipoLabel(a.tipo) }}</BBadge>
                    </td>
                    <td>
                      <BBadge :variant="estadoBadge(a.estado)">{{ estadoLabel(a.estado) }}</BBadge>
                    </td>
                    <td>
                      <span v-if="a.endereco_aprox">{{ a.endereco_aprox }}</span>
                      <span v-else class="text-muted">{{ a.latitude }}, {{ a.longitude }}</span>
                    </td>
                    <td>{{ formatDate(a.created_at) }}</td>
                    <td>
                      <div class="hstack gap-1">
                        <BButton variant="soft-info" size="sm" class="btn-icon" v-b-tooltip.hover title="Visualizar"
                          @click="openView(a.id)">
                          <i class="ri-eye-fill"></i>
                        </BButton>
                        <BDropdown
                          variant="soft-primary"
                          size="sm"
                          no-caret
                          dropstart
                          class="btn-icon dropdown"
                          toggle-class="btn-icon p-0"
                          :disabled="updatingEstadoId === a.id"
                          @show="dropdownOpenId = a.id"
                          @hide="dropdownOpenId = null"
                        >
                          <template #button-content>
                            <i class="ri-settings-3-fill"></i>
                            <span v-if="updatingEstadoId === a.id" class="spinner-border spinner-border-sm ms-1" role="status"></span>
                          </template>
                          <BDropdownItem
                            v-for="opt in estadoAlterarOptions(a.estado)"
                            :key="opt.value"
                            @click="alterarEstado(a, opt.value)"
                          >
                            {{ opt.text }}
                          </BDropdownItem>
                          <BDropdownItem v-if="estadoAlterarOptions(a.estado).length === 0" disabled>
                            Nenhuma alteração disponível
                          </BDropdownItem>
                        </BDropdown>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!loading && alertas.length === 0">
                    <td colspan="6" class="text-center text-muted py-4">Nenhum alerta encontrado.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="!loading && (alertas.length > 0 || currentPage > 1)" class="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-3">
              <div class="text-muted small">
                <template v-if="alertas.length > 0">
                  A mostrar {{ (currentPage - 1) * perPage + 1 }} a {{ (currentPage - 1) * perPage + alertas.length }}
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

    <ViewSos
      :show="showViewModal"
      :alerta-id="alertaToViewId"
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
import ViewSos from './view_sos.vue';
import ModalSucesso from '@/components/ModalSucesso.vue';
import ModalErro from '@/components/ModalErro.vue';

const ESTADOS_POSSIVEIS = [
  { value: 'pendente', text: 'Pendente' },
  { value: 'em_atendimento', text: 'Em atendimento' },
  { value: 'resolvido', text: 'Resolvido' },
  { value: 'cancelado', text: 'Cancelado' },
];

export default {
  name: 'ListSos',
  components: { Layout, ViewSos, ModalSucesso, ModalErro },
  data() {
    return {
      alertas: [],
      loading: false,
      updatingEstadoId: null,
      dropdownOpenId: null,
      showViewModal: false,
      alertaToViewId: null,
      perPage: 10,
      currentPage: 1,
      hasNextPage: false,
      filterTipo: '',
      filterEstado: '',
      filterTipoOptions: [
        { value: '', text: 'Todos os tipos' },
        { value: 'sos_rapido', text: 'SOS Rápido' },
        { value: 'sos_formulario', text: 'SOS Formulário' },
        { value: 'alerta_familiar', text: 'Alerta Familiar' },
        { value: 'medicacao_nao_cumprida', text: 'Medicação não cumprida' },
      ],
      filterEstadoOptions: [
        { value: '', text: 'Todos os estados' },
        { value: 'pendente', text: 'Pendente' },
        { value: 'em_atendimento', text: 'Em atendimento' },
        { value: 'resolvido', text: 'Resolvido' },
        { value: 'cancelado', text: 'Cancelado' },
      ],
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
      const o = ESTADOS_POSSIVEIS.find((e) => e.value === estado);
      return o ? o.text : estado;
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
    estadoAlterarOptions(estadoAtual) {
      const permitidos = [];
      if (estadoAtual !== 'em_atendimento') permitidos.push({ value: 'em_atendimento', text: 'Em atendimento' });
      if (estadoAtual !== 'resolvido') permitidos.push({ value: 'resolvido', text: 'Resolvido' });
      if (estadoAtual !== 'cancelado') permitidos.push({ value: 'cancelado', text: 'Cancelado' });
      return permitidos;
    },
    formatDate(val) {
      if (!val) return '—';
      try {
        return new Date(val).toLocaleString('pt-AO', { dateStyle: 'short', timeStyle: 'short' });
      } catch {
        return val;
      }
    },
    async fetchList(page = 1) {
      this.loading = true;
      this.currentPage = page;
      const skip = (page - 1) * this.perPage;
      const limit = this.perPage + 1;
      const params = { skip, limit };
      if (this.filterTipo) params.tipo = this.filterTipo;
      if (this.filterEstado) params.estado = this.filterEstado;
      try {
        const { data } = await api.get('/alertas/', { params });
        const list = Array.isArray(data) ? data : [];
        this.hasNextPage = list.length > this.perPage;
        this.alertas = list.slice(0, this.perPage);
      } catch (err) {
        this.alertas = [];
        this.hasNextPage = false;
        this.errorMessage = err.response?.data?.detail || err.message || 'Erro ao carregar alertas.';
        this.showErrorModal = true;
      } finally {
        this.loading = false;
      }
    },
    applyFilters() {
      this.fetchList(1);
    },
    clearFilters() {
      this.filterTipo = '';
      this.filterEstado = '';
      this.fetchList(1);
    },
    goToPage(page) {
      if (page < 1) return;
      this.fetchList(page);
    },
    openView(id) {
      this.alertaToViewId = id;
      this.showViewModal = true;
    },
    async alterarEstado(alerta, novoEstado) {
      this.updatingEstadoId = alerta.id;
      try {
        await api.patch(`/alertas/${alerta.id}/estado`, { estado: novoEstado });
        this.successMessage = `Estado do alerta #${alerta.id} alterado para "${this.estadoLabel(novoEstado)}".`;
        this.showSuccessModal = true;
        await this.fetchList(this.currentPage);
      } catch (err) {
        this.errorMessage = err.response?.data?.detail || err.message || 'Erro ao alterar estado.';
        this.showErrorModal = true;
      } finally {
        this.updatingEstadoId = null;
      }
    },
  },
};
</script>
