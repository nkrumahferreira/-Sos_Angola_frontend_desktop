<script>
import Layout from "@/layouts/main.vue";

export default {
  data() {
    return {
      defaultAvatar: require("@/assets/images/users/user-dummy-img.jpg"),
      profile: {
        displayName: '',
        email: '',
        roleLabel: '—',
        role: '',
      },
    };
  },
  components: {
    Layout
  },
  created() {
    this.loadUserProfile();
  },
  methods: {
    loadUserProfile() {
      try {
        const raw = localStorage.getItem("user");
        if (!raw) {
          this.profile.displayName = 'Utilizador';
          this.profile.email = '';
          this.profile.roleLabel = '—';
          return;
        }
        const user = JSON.parse(raw);
        this.profile.displayName = user.nome || user.email || 'Utilizador';
        this.profile.email = user.email || '';
        this.profile.role = user.role || '';
        const roleMap = { admin: 'Administrador', autoridade: 'Autoridade', superadmin: 'Super Admin' };
        this.profile.roleLabel = roleMap[this.profile.role] || this.profile.role || '—';
      } catch (_) {
        this.profile.displayName = 'Utilizador';
        this.profile.email = '';
        this.profile.roleLabel = '—';
      }
    },
  },
};
</script>

<template>
  <Layout>
    <div class="profile-foreground position-relative mx-n4 mt-n4">
      <div class="profile-wid-bg">
        <img src="@/assets/images/profile-bg.jpg" alt="" class="profile-wid-img" />
      </div>
    </div>
    <div class="pt-4 mb-4 mb-lg-3 pb-lg-4 profile-wrapper">
      <BRow class="g-4">
        <BCol cols="auto">
          <div class="avatar-lg">
            <img :src="defaultAvatar" alt="user-img" class="img-thumbnail rounded-circle" />
          </div>
        </BCol>
        <BCol>
          <div class="p-2">
            <h3 class="text-white mb-1">{{ profile.displayName }}</h3>
            <p class="text-white text-opacity-75">{{ profile.roleLabel }}</p>
            <div class="hstack text-white-50 gap-1">
              <div class="me-2" v-if="profile.email">
                <i class="ri-mail-line me-1 text-white text-opacity-75 fs-16 align-middle"></i>{{ profile.email }}
              </div>
            </div>
          </div>
        </BCol>
      </BRow>
    </div>

    <BRow>
      <BCol lg="12">
        <div>
          <div class="d-flex profile-wrapper" style="position: absolute; right: 13px; top: 26px; ">
            <div class="d-flex justify-content-end">
              <router-link to="/pages/profile-setting" class="btn btn-success"><i
                  class="ri-edit-box-line align-bottom"></i> Editar perfil</router-link>
            </div>
          </div>
          <BTabs nav-class=" animation-nav profile-nav gap-2 gap-lg-3  pt-4 text-muted" pills>
            <BTab title="Visão geral" class="nav-item pt-4">
              <template #title>
                <i class="ri-airplay-fill d-inline-block d-md-none"></i>
                <span class="d-none d-md-inline-block">Visão geral</span>
              </template>
              <BRow >
                <BCol xxl="3">
                  <BCard no-body>
                    <BCardBody>
                      <h5 class="card-title mb-5">Completar perfil</h5>
                      <BProgress class="animated-progress custom-progress progress-label">
                        <BProgressBar :value="30" variant="danger">
                          <div class="label">30%</div>
                        </BProgressBar>
                      </BProgress>
                    </BCardBody>
                  </BCard>

                  <BCard no-body>
                    <BCardBody>
                      <h5 class="card-title mb-3">Info</h5>
                      <div class="table-responsive">
                        <table class="table table-borderless mb-0">
                          <tbody>
                            <tr>
                              <th class="ps-0" scope="row">Nome :</th>
                              <td class="text-muted">{{ profile.displayName }}</td>
                            </tr>
                            <tr>
                              <th class="ps-0" scope="row">E-mail :</th>
                              <td class="text-muted">{{ profile.email || '—' }}</td>
                            </tr>
                            <tr>
                              <th class="ps-0" scope="row">Tipo :</th>
                              <td class="text-muted">{{ profile.roleLabel }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </BCardBody>
                  </BCard>
                </BCol>
              </BRow>
            </BTab>
          </BTabs>
        </div>
      </BCol>
    </BRow>
  </Layout>
</template>

<style>
.tamp{
  position: absolute;
  top: 17px;
  right: 16px;
}
</style>

