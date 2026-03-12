<script>
import Layout from "@/layouts/main.vue";

export default {
  components: { Layout },
  computed: {
    userName() {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        return user.email || "Autoridade";
      } catch {
        return "Autoridade";
      }
    },
  },
};
</script>

<template>
  <Layout>
    <BRow>
      <BCol cols="12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
          <h4 class="mb-sm-0">Dashboard</h4>
        </div>
      </BCol>
    </BRow>
    <BRow>
      <BCol cols="12">
        <BCard no-body>
          <BCardBody class="p-4">
            <h5 class="card-title mb-3">Bem-vindo ao painel SOS Angola</h5>
            <p class="text-muted mb-0">
              Olá, {{ userName }}. Esta é a área das autoridades. Utilize o menu para aceder às funcionalidades.
            </p>
          </BCardBody>
        </BCard>
      </BCol>
    </BRow>
  </Layout>
</template>
