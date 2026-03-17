<template>
  <BModal
    :model-value="show"
    title="Eliminar Primeiros Socorros"
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
        <h5>Tem certeza que deseja eliminar este registo?</h5>
        <p v-if="item" class="text-muted mb-0">
          <strong>{{ item.titulo }}</strong> ({{ item.categoria }}) será removido permanentemente.
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
  name: 'DeletePrimeirosSocorros',
  props: {
    show: { type: Boolean, default: false },
    item: { type: Object, default: null },
  },
  emits: ['close', 'confirm'],
  data() {
    return { loading: false };
  },
  methods: {
    async onConfirm() {
      if (!this.item?.id) return;
      this.loading = true;
      try {
        await this.$emit('confirm', this.item.id);
        this.$emit('close');
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
