<script>
export default {
    data() {
        return {
            togglePassword: false,
        };
    },
};
</script>

<template>
    <div class="auth-page-wrapper auth-bg-cover py-5 d-flex justify-content-center align-items-center min-vh-100">
        <div class="bg-overlay"></div>
        <div class="auth-page-content overflow-hidden pt-lg-5">
            <BContainer>
                <BRow>
                    <BCol lg="12">
                        <BCard no-body class="overflow-hidden">
                            <BRow class="g-0">
                                <BCol lg="6">
                                    <div class="p-lg-5 p-4 auth-one-bg h-100">
                                        <div class="bg-overlay"></div>
                                        <div class="position-relative h-100 d-flex flex-column">
                                            <div class="mb-4">
                                                <router-link to="/" class="d-block">
                                                    <img src="@/assets/logo-sos.jpeg" alt="SOS Angola" height="88" class="rounded">
                                                </router-link>
                                            </div>
                                            <div class="mt-auto">
                                                <div class="mb-3">
                                                    <i class="ri-alarm-warning-line display-4 text-white opacity-75"></i>
                                                </div>
                                                <p class="fs-15 text-white-50 mb-1">Emergência comunicada, vida salva.</p>
                                                <p class="fs-14 text-white-50">Área reservada às autoridades. Aceda com as suas credenciais para gerir alertas e atendimento em tempo real.</p>
                                            </div>
                                        </div>
                                    </div>
                                </BCol>

                                <BCol lg="6">
                                    <div class="p-lg-5 p-4">
                                        <div>
                                            <h5 class="text-primary">Área das Autoridades</h5>
                                            <p class="text-muted">Inicie sessão para continuar ao painel SOS Angola.</p>
                                        </div>

                                        <div class="mt-4">
                                            <form>

                                                <div class="mb-3">
                                                    <label for="username" class="form-label">Utilizador / E-mail</label>
                                                    <input type="text" class="form-control" id="username"
                                                        placeholder="Introduza o utilizador ou e-mail">
                                                </div>

                                                <div class="mb-3">
                                                    <div class="float-end">
                                                        <router-link to="/auth/reset-pwd-cover" class="text-muted">
                                                            Esqueceu a palavra-passe?</router-link>
                                                    </div>
                                                    <label class="form-label" for="password-input">Palavra-passe</label>
                                                    <div class="position-relative auth-pass-inputgroup mb-3">
                                                        <input :type="togglePassword ? 'text' : 'password'"
                                                            class="form-control pe-5" placeholder="Introduza a palavra-passe"
                                                            id="password-input">
                                                        <BButton variant="link"
                                                            class="position-absolute end-0 top-0 text-decoration-none text-muted"
                                                            type="button" id="password-addon"
                                                            @click="togglePassword = !togglePassword"><i
                                                                class="ri-eye-fill align-middle"></i></BButton>
                                                    </div>
                                                </div>

                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" value=""
                                                        id="auth-remember-check">
                                                    <label class="form-check-label" for="auth-remember-check">Manter sessão</label>
                                                </div>

                                                <div class="mt-4">
                                                    <BButton variant="primary" class="w-100" type="submit">Entrar</BButton>
                                                </div>

                                            </form>
                                        </div>

                                        <div class="mt-5 text-center">
                                            <p class="mb-0 text-muted small">SOS Angola — Emergência comunicada, vida salva.</p>
                                        </div>
                                    </div>
                                </BCol>
                            </BRow>
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
                            <p class="mb-0">&copy; {{ new Date().getFullYear() }} SOS Angola. Área das Autoridades.</p>
                        </div>
                    </BCol>
                </BRow>
            </BContainer>
        </footer>
    </div>
</template>