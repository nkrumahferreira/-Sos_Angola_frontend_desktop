<template>
  <BModal
    :model-value="show"
    hide-header
    body-class="p-4"
    class="v-modal-custom modal-feedback modal-erro"
    centered
    size="sm"
    @update:model-value="$emit('close')"
  >
    <div class="text-center">
      <div class="modal-feedback-icon erro mb-3">
        <i class="ri-close-line"></i>
      </div>
      <p class="modal-feedback-message mb-0">{{ message }}</p>
    </div>
    <template #footer>
      <div class="w-100 d-flex justify-content-center">
        <BButton variant="danger" size="sm" class="px-4" @click="$emit('close')">Fechar</BButton>
      </div>
    </template>
  </BModal>
</template>

<script>
export default {
  name: 'ModalErro',
  props: {
    show: { type: Boolean, default: false },
    title: { type: String, default: 'Erro' },
    message: { type: String, default: 'Ocorreu um erro no sistema. Tente novamente.' },
  },
  emits: ['close'],
};
</script>

<style scoped>
.modal-feedback-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}
.modal-feedback-icon.erro {
  background: rgba(220, 53, 69, 0.12);
  color: #dc3545;
}
.modal-feedback-message {
  font-size: 0.9375rem;
  color: #495057;
  line-height: 1.5;
}
</style>
