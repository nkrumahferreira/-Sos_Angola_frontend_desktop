<template>
  <BModal
    :model-value="show"
    title="Eliminar quartel"
    modal-class="zoomIn"
    hide-footer
    centered
    no-close-on-backdrop
    @update:model-value="$emit('close')"
  >
    <div class="mt-2 text-center">
      <div class="avatar-xl mx-auto mb-3">
        <div class="avatar-title bg-danger-subtle text-danger rounded-circle fs-1">
          <i class="ri-delete-bin-line"></i>
        </div>
      </div>
      <div class="mt-4 pt-2 fs-15 mx-4 mx-sm-5">
        <h5>Tem certeza que deseja eliminar este quartel?</h5>
        <p v-if="quartel" class="text-muted mb-0">
          <strong>{{ quartel.nome }}</strong> ({{ tipoLabel }}) será removido permanentemente.
        </p>
      </div>
    </div>
    <div class="d-flex gap-2 justify-content-center mt-4 mb-2">
      <BButton variant="light" class="w-sm" @click="$emit('close')">Cancelar</BButton>
      <BButton variant="danger" class="w-sm" :disabled="loading" @click="onConfirm">
        {{ loading ? 'A eliminar...' : 'Sim, eliminar' }}
      </BButton>
    </div>
  </BModal>
</template>

<script>
export default {
  name: 'DeleteQuartel',
  props: {
    show: { type: Boolean, default: false },
    quartel: { type: Object, default: null },
  },
  emits: ['close', 'confirm'],
  data() {
    return { loading: false };
  },
  computed: {
    tipoLabel() {
      if (!this.quartel || !this.quartel.tipo) return '';
      const map = { policia: 'Polícia', bombeiros: 'Bombeiros', saude: 'Saúde' };
      return map[this.quartel.tipo] || this.quartel.tipo;
    },
  },
  methods: {
    async onConfirm() {
      this.loading = true;
      try {
        await this.$emit('confirm', this.quartel.id);
        this.$emit('close');
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
