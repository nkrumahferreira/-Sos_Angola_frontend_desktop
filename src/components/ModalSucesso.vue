<template>
  <BModal
    :model-value="show"
    hide-header
    body-class="p-4"
    class="v-modal-custom modal-feedback modal-sucesso"
    centered
    size="sm"
    @update:model-value="$emit('close')"
  >
    <div class="text-center">
      <div class="modal-feedback-icon success mb-3">
        <i class="ri-check-line"></i>
      </div>
      <p class="modal-feedback-message mb-0">{{ message }}</p>
    </div>
    <template #footer>
      <div class="w-100 d-flex justify-content-center">
        <BButton variant="success" size="sm" class="px-4" @click="$emit('close')">OK</BButton>
      </div>
    </template>
  </BModal>
</template>

<script>
export default {
  name: 'ModalSucesso',
  props: {
    show: { type: Boolean, default: false },
    title: { type: String, default: 'Sucesso' },
    message: { type: String, default: 'Operação realizada com sucesso.' },
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
.modal-feedback-icon.success {
  background: rgba(25, 135, 84, 0.12);
  color: #198754;
}
.modal-feedback-message {
  font-size: 0.9375rem;
  color: #495057;
  line-height: 1.5;
}
</style>
