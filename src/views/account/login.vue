<script>
import {
  required,
  email,
  helpers
} from "@vuelidate/validators";
import useVuelidate from "@vuelidate/core";
import { loginAutoridade } from "@/services/auth";

export default {
  setup() {
    return { v$: useVuelidate() };
  },
  data() {
    return {
      email: "",
      password: "",
      submitted: false,
      authError: null,
      processing: false,
    };
  },
  validations: {
    email: {
      required: helpers.withMessage("E-mail é obrigatório", required),
      email: helpers.withMessage("Introduza um e-mail válido", email),
    },
    password: {
      required: helpers.withMessage("Palavra-passe é obrigatória", required),
    },
  },
  methods: {
    async handleLogin() {
      this.submitted = true;
      this.v$.$touch();
      if (this.v$.$invalid) {
        return;
      }
      this.authError = null;
      this.processing = true;
      try {
        const data = await loginAutoridade(this.email, this.password);
        localStorage.setItem("jwt", data.access_token);
        localStorage.setItem("user", JSON.stringify({
          user_id: data.user_id,
          role: data.role,
          email: this.email,
        }));
        localStorage.setItem("userid", String(data.user_id));
        const redirect = this.$route.query.redirectFrom || "/";
        this.$router.push(redirect);
      } catch (err) {
        this.processing = false;
        const msg = err.response?.data?.detail || err.message || "Erro ao iniciar sessão.";
        this.authError = typeof msg === "string" ? msg : (Array.isArray(msg) ? msg.map(m => m.msg || m).join(" ") : "Credenciais inválidas.");
      }
    },
  },
};
</script>

<template>
  <div class="auth-page-wrapper pt-5">
    <div class="auth-one-bg-position auth-one-bg" id="auth-particles">
      <div class="bg-overlay"></div>

      <div class="shape">

        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink"
          viewBox="0 0 1440 120">
          <path d="M 0,36 C 144,53.6 432,123.2 720,124 C 1008,124.8 1296,56.8 1440,40L1440 140L0 140z"></path>
        </svg>
      </div>
    </div>

    <div class="auth-page-content">
      <BContainer>
        <BRow>
          <BCol lg="12">
            <div class="text-center mt-sm-5 mb-4 text-white-50">
              <div>
                <router-link to="/" class="d-inline-block auth-logo">
                  <img src="@/assets/logo-sos.jpeg" alt="SOS Angola" height="88" class="rounded" />
                </router-link>
              </div>
              <p class="mt-3 fs-15 fw-medium">
                Emergência comunicada, vida salva.
              </p>
              <p class="fs-14 opacity-75">Área das Autoridades</p>
            </div>
          </BCol>
        </BRow>

        <BRow class="justify-content-center">
          <BCol md="8" lg="6" xl="5">
            <BCard no-body class="mt-4">
              <BCardBody class="p-4">
                <div class="text-center mt-2">
                  <h5 class="text-primary">Área das Autoridades</h5>
                  <p class="text-muted">Inicie sessão para continuar ao painel SOS Angola.</p>
                </div>
                <div class="p-2 mt-4">
                  <BAlert v-model="authError" variant="danger" class="mt-3" dismissible>{{ authError }}</BAlert>

                  <div>

                  </div>

                  <form @submit.prevent="handleLogin">
                    <div class="mb-3">
                      <label for="email" class="form-label">E-mail</label>
                      <input type="email" class="form-control" id="email" placeholder="Introduza o e-mail" v-model="email" />
                      <div class="invalid-feedback">
                        <span></span>
                      </div>
                    </div>

                    <div class="mb-3">
                      <label class="form-label" for="password-input">Palavra-passe</label>
                      <div class="position-relative auth-pass-inputgroup mb-2">
                        <input type="password" v-model="password" class="form-control pe-5" placeholder="Introduza a palavra-passe"
                          id="password-input" />
                        <BButton variant="link" class="position-absolute end-0 top-0 text-decoration-none text-muted"
                          type="button" id="password-addon">
                          <i class="ri-eye-fill align-middle"></i>
                        </BButton>
                        <div class="invalid-feedback">
                          <span></span>
                        </div>
                      </div>
                      <div class="text-end">
                        <router-link to="/forgot-password" class="text-muted small">Esqueceu a palavra-passe?</router-link>
                      </div>
                    </div>

                    <div class="mt-4">
                      <BButton variant="success" class="w-100" type="submit" :disabled="processing">
                        {{ processing ? "Aguarde..." : "Entrar" }}
                      </BButton>
                    </div>
                  </form>
                </div>
              </BCardBody>
            </BCard>
          </BCol>
        </BRow>
      </BContainer>
    </div>

    <footer class="footer">
      <BContainer>
        <BRow>
          <BCol lg="12">
            <div class="text-center">
              <p class="mb-0 text-muted">
                &copy; {{ new Date().getFullYear() }} SOS Angola — Área das Autoridades.
              </p>
            </div>
          </BCol>
        </BRow>
      </BContainer>
    </footer>
  </div>
</template>