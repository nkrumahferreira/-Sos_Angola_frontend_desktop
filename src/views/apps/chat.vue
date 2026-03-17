<script>
import simplebar from 'simplebar-vue';
import {
  SearchIcon,
  InfoIcon,
  MoreVerticalIcon
} from '@zhuowenli/vue-feather-icons';
import { helpers } from "@vuelidate/validators";
import useVuelidate from "@vuelidate/core";
import Layout from "@/layouts/main.vue";
import api from "@/services/api";
import { getApiBaseUrl } from "@/utils/apiBase";

const CHAT_PREFIX = "/chat/autoridades";

export default {
  setup() {
    return { v$: useVuelidate() };
  },
  data() {
    return {
      searchQuery: '',
      showOffcanvas: false,
      submitted: false,
      form: { message: "" },
      // Utilizador atual (autoridade)
      userId: null,
      userNome: '',
      profileImg: require("@/assets/images/users/user-dummy-img.jpg"),
      // Quarteis (pesquisa) e autoridades do quartel
      quarteis: [],
      quartelSelecionado: null,
      autoridades: [],
      loadingQuarteis: false,
      loadingAutoridades: false,
      // Minhas conversas
      conversas: [],
      loadingConversas: false,
      // Conversa ativa
      conversaAtiva: null, // { id, outro_nome, outro_online, mensagens[], id_outro }
      loadingMensagens: false,
      enviando: false,
      uploadando: false,
      // WebSockets
      wsPresence: null,
      wsConversation: null,
      onlineIds: new Set(),
    };
  },
  components: {
    Layout,
    SearchIcon,
    InfoIcon,
    MoreVerticalIcon,
    simplebar
  },
  validations: {
    form: {
      message: { required: helpers.withMessage("Escreva uma mensagem", () => true) }, // opcional: pode enviar só ficheiro
    },
  },
  computed: {
    resultQuery() {
      return (this.conversaAtiva && this.conversaAtiva.mensagens) ? this.conversaAtiva.mensagens : [];
    },
    token() {
      return typeof localStorage !== 'undefined' ? localStorage.getItem('jwt') : null;
    },
  },
  async mounted() {
    this.userId = parseInt(localStorage.getItem('userid') || '0', 10);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      this.userNome = user.email || user.nome || 'Autoridade';
    } catch (_) {
      this.userNome = 'Autoridade';
    }
    document.getElementById('copyClipBoard') && (document.getElementById('copyClipBoard').style.display = 'none');
    this.fetchConversas();
    this.connectPresence();
    this._bindChatListClick();
  },
  beforeUnmount() {
    this.disconnectPresence();
    this.disconnectConversation();
  },
  methods: {
    _bindChatListClick() {
      this.$nextTick(() => {
        const userChatElement = document.querySelectorAll(".user-chat");
        document.querySelectorAll(".chat-user-list li a").forEach((item) => {
          item.addEventListener("click", () => {
            userChatElement.forEach((elm) => elm.classList.add("user-chat-show"));
            const chatUserList = document.querySelector(".chat-user-list li.active");
            if (chatUserList) chatUserList.classList.remove("active");
            if (item.parentNode) item.parentNode.classList.add("active");
          });
        });
        document.querySelectorAll(".user-chat-remove").forEach((item) => {
          item.addEventListener("click", () => {
            userChatElement.forEach((elm) => elm.classList.remove("user-chat-show"));
          });
        });
      });
    },
    scrollToBottom(id) {
      this.$nextTick(() => {
        const el = id ? document.getElementById(id) : document.getElementById("users-chat");
        if (!el) return;
        const simpleBar = el.querySelector("#chat-conversation .simplebar-content-wrapper");
        const list = el.getElementsByClassName("chat-conversation-list")[0];
        const offsetHeight = list ? list.scrollHeight - window.innerHeight + 600 : 0;
        if (simpleBar && offsetHeight > 0) simpleBar.scrollTo({ top: offsetHeight, behavior: "smooth" });
      });
    },
    async fetchQuarteis() {
      const q = (this.searchQuery || '').trim();
      this.loadingQuarteis = true;
      try {
        const { data } = await api.get(`${CHAT_PREFIX}/quarteis`, { params: { nome: q || undefined, limit: 30 } });
        this.quarteis = data || [];
        if (!q) this.quarteis = [];
      } catch (e) {
        this.quarteis = [];
      }
      this.loadingQuarteis = false;
    },
    async selectQuartel(quartel) {
      this.quartelSelecionado = quartel;
      this.loadingAutoridades = true;
      try {
        const { data } = await api.get(`${CHAT_PREFIX}/quarteis/${quartel.id}/autoridades`);
        this.autoridades = (data || []).filter((a) => a.id_usuario != null && a.id_usuario !== this.userId);
      } catch (_) {
        this.autoridades = [];
      }
      this.loadingAutoridades = false;
    },
    async selectAutoridade(aut) {
      if (!aut.id_usuario) return;
      this.enviando = true;
      try {
        const { data } = await api.post(`${CHAT_PREFIX}/conversas`, { id_destino: aut.id_usuario });
        this.conversaAtiva = {
          id: data.id,
          outro_nome: aut.nome,
          outro_online: aut.online,
          id_outro: aut.id_usuario,
          mensagens: (data.mensagens || []).map((m) => this._normMsg(m)),
        };
        this.conversas = this.conversas.filter((c) => c.id !== data.id);
        this.conversas.unshift({
          id: data.id,
          outro_id: data.id_autoridade_1 === this.userId ? data.id_autoridade_2 : data.id_autoridade_1,
          outro_nome: aut.nome,
          mensagens: data.mensagens || [],
        });
        this.connectConversation(data.id);
        this.scrollToBottom("users-chat");
      } catch (err) {
        this.$bvToast && this.$bvToast.toast(err.response?.data?.detail || 'Erro ao abrir conversa.', { variant: 'danger' });
      }
      this.enviando = false;
    },
    async selectConversa(conv) {
      this.conversaAtiva = {
        id: conv.id,
        outro_nome: conv.outro_nome || `Autoridade #${conv.outro_id}`,
        outro_online: this.onlineIds.has(conv.outro_id),
        id_outro: conv.outro_id,
        mensagens: (conv.mensagens || []).map((m) => this._normMsg(m)),
      };
      this.connectConversation(conv.id);
      this.scrollToBottom("users-chat");
    },
    _normMsg(m) {
      const isMe = m.id_autor_envio === this.userId;
      let time = m.created_at;
      if (time && typeof time === 'string') time = time.slice(11, 16);
      else if (time && time.getHours) time = `${String(time.getHours()).padStart(2,'0')}:${String(time.getMinutes()).padStart(2,'0')}`;
      return {
        id: m.id,
        align: isMe ? 'right' : 'left',
        name: isMe ? this.userNome : (this.conversaAtiva && this.conversaAtiva.outro_nome) || 'Autoridade',
        message: m.conteudo || (m.media_url ? `[${m.tipo_mensagem}]` : ''),
        time: time || '',
        tipo_mensagem: m.tipo_mensagem,
        media_url: m.media_url,
      };
    },
    async fetchConversas() {
      this.loadingConversas = true;
      try {
        const { data } = await api.get(`${CHAT_PREFIX}/conversas`);
        this.conversas = data || [];
      } catch (_) {
        this.conversas = [];
      }
      this.loadingConversas = false;
    },
    connectPresence() {
      if (!this.token) return;
      const base = getApiBaseUrl().replace(/^http/, 'ws');
      const url = `${base}/api/v1${CHAT_PREFIX}/presence?token=${encodeURIComponent(this.token)}`;
      try {
        this.wsPresence = new WebSocket(url);
        this.wsPresence.onmessage = () => { /* presença não envia mensagens */ };
        this.wsPresence.onclose = () => { setTimeout(() => this.connectPresence(), 3000); };
      } catch (_) { /* ignorar falha de conexão WS */ }
    },
    disconnectPresence() {
      if (this.wsPresence) {
        this.wsPresence.close();
        this.wsPresence = null;
      }
    },
    connectConversation(idConversa) {
      this.disconnectConversation();
      if (!this.token || !idConversa) return;
      const base = getApiBaseUrl().replace(/^http/, 'ws');
      const url = `${base}/api/v1${CHAT_PREFIX}/conversas/${idConversa}/ws?token=${encodeURIComponent(this.token)}`;
      try {
        this.wsConversation = new WebSocket(url);
        this.wsConversation.onmessage = (ev) => {
          try {
            const d = JSON.parse(ev.data);
            if (d.evento === 'nova_mensagem' && d.mensagem && this.conversaAtiva && this.conversaAtiva.id === idConversa) {
              this.conversaAtiva.mensagens = this.conversaAtiva.mensagens || [];
              this.conversaAtiva.mensagens.push(this._normMsg(d.mensagem));
              this.scrollToBottom("users-chat");
            }
          } catch (_) { /* ignorar JSON inválido */ }
        };
        this.wsConversation.onclose = () => { this.wsConversation = null; };
      } catch (_) { /* ignorar falha de conexão WS */ }
    },
    disconnectConversation() {
      if (this.wsConversation) {
        this.wsConversation.close();
        this.wsConversation = null;
      }
    },
    async formSubmit() {
      this.submitted = true;
      this.v$.$touch();
      if (!this.conversaAtiva) {
        this.submitted = false;
        return;
      }
      const msg = (this.form.message || '').trim();
      if (!msg) {
        this.submitted = false;
        return;
      }
      this.enviando = true;
      try {
        const { data } = await api.post(`${CHAT_PREFIX}/conversas/${this.conversaAtiva.id}/mensagens`, {
          conteudo: msg,
          tipo_mensagem: 'text',
        });
        this.conversaAtiva.mensagens = this.conversaAtiva.mensagens || [];
        this.conversaAtiva.mensagens.push(this._normMsg(data));
        this.form.message = '';
        this.v$.form.message.$reset();
        this.scrollToBottom("users-chat");
      } catch (err) {
        this.$bvToast && this.$bvToast.toast(err.response?.data?.detail || 'Erro ao enviar.', { variant: 'danger' });
      }
      this.submitted = false;
      this.enviando = false;
    },
    async onFileSelected(ev) {
      const file = ev.target && ev.target.files && ev.target.files[0];
      if (!file || !this.conversaAtiva) return;
      this.uploadando = true;
      try {
        const formData = new FormData();
        formData.append('ficheiro', file);
        const { data: midiaData } = await api.post(`${CHAT_PREFIX}/conversas/${this.conversaAtiva.id}/midia`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const { data: msgData } = await api.post(`${CHAT_PREFIX}/conversas/${this.conversaAtiva.id}/mensagens`, {
          conteudo: file.name || '',
          tipo_mensagem: midiaData.tipo_mensagem || 'image',
          media_url: midiaData.url_path,
        });
        this.conversaAtiva.mensagens = this.conversaAtiva.mensagens || [];
        this.conversaAtiva.mensagens.push(this._normMsg(msgData));
        this.fetchConversas();
        this.scrollToBottom("users-chat");
      } catch (err) {
        this.$bvToast && this.$bvToast.toast(err.response?.data?.detail || 'Erro no envio do ficheiro.', { variant: 'danger' });
      }
      this.uploadando = false;
      ev.target.value = '';
    },
    urlMidia(path) {
      if (!path) return '';
      const base = getApiBaseUrl();
      return `${base}/api/v1/uploads/${path}`;
    },
  },
  watch: {
    searchQuery() {
      if (this.searchQuery.trim()) this.fetchQuarteis();
      else this.quarteis = [];
    },
  },
};
</script>

<template>
  <Layout>

    <div class="chat-wrapper d-lg-flex gap-1 mx-n4 mt-n4 p-1">
      <div class="chat-leftsidebar">
        <div class="px-4 pt-4 mb-4">
          <h5 class="mb-4">Chat entre autoridades</h5>
          <div class="search-box">
            <input v-model="searchQuery" type="text" class="form-control bg-light border-light" placeholder="Pesquisar quartel..." />
            <i class="ri-search-2-line search-icon"></i>
          </div>
        </div>

        <simplebar class="chat-room-list" data-simplebar>
          <!-- Quarteis (resultado da pesquisa) -->
          <div v-if="quarteis.length > 0" class="d-flex align-items-center px-4 mb-2">
            <h4 class="mb-0 fs-11 text-muted text-uppercase">Quarteis</h4>
          </div>
          <div v-if="quarteis.length > 0" class="chat-message-list">
            <ul class="list-unstyled chat-list chat-user-list mb-0">
              <li v-for="q in quarteis" :key="q.id" :class="{ active: quartelSelecionado && quartelSelecionado.id === q.id }">
                <BLink href="javascript:void(0);" @click="selectQuartel(q)">
                  <div class="d-flex align-items-center">
                    <div class="flex-shrink-0 me-2">
                      <div class="avatar-xxs">
                        <div class="avatar-title bg-light rounded-circle text-body"><i class="ri-building-line"></i></div>
                      </div>
                    </div>
                    <div class="flex-grow-1 overflow-hidden">
                      <p class="text-truncate mb-0">{{ q.nome }}</p>
                      <small class="text-muted">{{ q.tipo || '' }}</small>
                    </div>
                  </div>
                </BLink>
              </li>
            </ul>
          </div>
          <div v-if="loadingQuarteis" class="px-4 py-2 text-muted"><small>A carregar quarteis...</small></div>

          <!-- Autoridades do quartel selecionado -->
          <div v-if="quartelSelecionado" class="d-flex align-items-center px-4 mt-3 mb-2">
            <h4 class="mb-0 fs-11 text-muted text-uppercase">Autoridades — {{ quartelSelecionado.nome }}</h4>
          </div>
          <div v-if="quartelSelecionado && autoridades.length > 0" class="chat-message-list">
            <ul class="list-unstyled chat-list chat-user-list mb-0">
              <li v-for="aut in autoridades" :key="aut.id_cadastro" :class="{ active: conversaAtiva && conversaAtiva.id_outro === aut.id_usuario }">
                <BLink href="javascript:void(0);" @click="selectAutoridade(aut)">
                  <div class="d-flex align-items-center">
                    <div class="flex-shrink-0 chat-user-img align-self-center me-2 ms-0" :class="aut.online ? 'online' : ''">
                      <div class="avatar-xxs">
                        <div class="avatar-title rounded-circle bg-primary userprofile">{{ (aut.nome || 'A').charAt(0) }}</div>
                      </div>
                    </div>
                    <div class="flex-grow-1 overflow-hidden">
                      <p class="text-truncate mb-0">{{ aut.nome }}</p>
                      <small class="text-muted">{{ aut.tipo }} · {{ aut.online ? 'Online' : 'Offline' }}</small>
                    </div>
                  </div>
                </BLink>
              </li>
            </ul>
          </div>
          <div v-if="quartelSelecionado && loadingAutoridades" class="px-4 py-2 text-muted"><small>A carregar autoridades...</small></div>
          <div v-if="quartelSelecionado && !loadingAutoridades && autoridades.length === 0" class="px-4 py-2 text-muted"><small>Nenhuma autoridade com login neste quartel.</small></div>

          <!-- Minhas conversas -->
          <div class="d-flex align-items-center px-4 mt-4 pt-2 mb-2">
            <h4 class="mb-0 fs-11 text-muted text-uppercase">Conversas</h4>
          </div>
          <div class="chat-message-list">
            <ul class="list-unstyled chat-list chat-user-list mb-0">
              <li v-for="conv in conversas" :key="conv.id" :class="{ active: conversaAtiva && conversaAtiva.id === conv.id }">
                <BLink href="javascript:void(0);" @click="selectConversa(conv)">
                  <div class="d-flex align-items-center">
                    <div class="flex-shrink-0 chat-user-img align-self-center me-2 ms-0" :class="onlineIds.has(conv.outro_id) ? 'online' : ''">
                      <div class="avatar-xxs">
                        <div class="avatar-title rounded-circle bg-secondary userprofile">{{ (conv.outro_nome || 'A').charAt(0) }}</div>
                      </div>
                    </div>
                    <div class="flex-grow-1 overflow-hidden">
                      <p class="text-truncate mb-0">{{ conv.outro_nome || 'Conversa' }}</p>
                    </div>
                  </div>
                </BLink>
              </li>
            </ul>
          </div>
          <div v-if="loadingConversas" class="px-4 py-2 text-muted"><small>A carregar conversas...</small></div>
          <div v-if="!loadingConversas && conversas.length === 0 && !quartelSelecionado" class="px-4 py-2 text-muted"><small>Pesquise um quartel e escolha uma autoridade para iniciar.</small></div>
        </simplebar>
      </div>
      <div class="user-chat w-100 overflow-hidden">
        <div class="chat-content d-lg-flex">
          <div class="w-100 overflow-hidden position-relative">
            <div class="position-relative">
              <div v-if="!conversaAtiva" class="p-5 text-center text-muted">
                <i class="ri-chat-3-line display-4"></i>
                <p class="mt-2 mb-0">Pesquise um quartel, escolha uma autoridade ou abra uma conversa da lista.</p>
              </div>
              <div v-else>
              <div class="p-3 user-chat-topbar">
                <BRow class="align-items-center">
                  <BCol sm="4" cols="8">
                    <div class="d-flex align-items-center">
                      <div class="flex-shrink-0 d-block d-lg-none me-3">
                        <BLink href="javascript: void(0);" class="user-chat-remove fs-18 p-1"><i
                            class="ri-arrow-left-s-line align-bottom"></i></BLink>
                      </div>
                      <div class="flex-grow-1 overflow-hidden">
                        <div class="d-flex align-items-center">
                          <div class="flex-shrink-0 chat-user-img user-own-img align-self-center me-3 ms-0" :class="conversaAtiva.outro_online ? 'online' : ''">
                            <img :src="profileImg" class="rounded-circle avatar-xs" alt="" />
                            <span class="user-status"></span>
                          </div>
                          <div class="flex-grow-1 overflow-hidden">
                            <h5 class="text-truncate mb-0 fs-16">
                              <BLink class="text-reset username" @click="showOffcanvas = !showOffcanvas">{{ conversaAtiva.outro_nome }}
                              </BLink>
                            </h5>
                            <p class="text-truncate text-muted fs-14 mb-0 userStatus">
                              <small>{{ conversaAtiva.outro_online ? 'Online' : 'Offline' }}</small>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </BCol>
                  <BCol sm="8" cols="4">
                    <ul class="list-inline user-chat-nav text-end mb-0">
                      <li class="list-inline-item m-0">
                        <BDropdown variant="link" class="btn btn-ghost-secondary btn-icon" toggle-class="arrow-none"
                          menu-class="dropdown-menu p-0 dropdown-menu-end dropdown-menu-lg" auto-close="outside">
                          <template #button-content> <search-icon class="icon-sm"></search-icon>
                          </template>
                          <BDropdownItemButton>
                            <div class="p-2 dropdown-menu-lg px-0 py-0">
                              <div class="search-box">
                                <input type="text" class="form-control bg-light border-light" placeholder="Search here..."
                                  id="searchMessage" @click.prevent />
                                <i class="ri-search-2-line search-icon"></i>
                              </div>
                            </div>
                          </BDropdownItemButton>
                        </BDropdown>
                      </li>

                      <li class="list-inline-item d-none d-lg-inline-block m-0">
                        <BButton type="button" variant="ghost-secondary" class="btn-icon"
                          @click="showOffcanvas = !showOffcanvas">
                          <info-icon class="icon-sm"></info-icon>
                        </BButton>
                      </li>

                      <li class="list-inline-item m-0">
                        <BDropdown variant="link" class="btn btn-ghost-secondary btn-icon" toggle-class=" arrow-none"
                          menu-class="dropdown-menu" aria-haspopup="true">
                          <template #button-content> <more-vertical-icon class="icon-sm"></more-vertical-icon>
                          </template>
                          <BDropdownItem><i class="ri-inbox-archive-line align-bottom text-muted me-2"></i>
                            Archive
                          </BDropdownItem>
                          <BDropdownItem><i class="ri-mic-off-line align-bottom text-muted me-2"></i>
                            Muted</BDropdownItem>
                          <BDropdownItem><i class="ri-delete-bin-5-line align-bottom text-muted me-2"></i>
                            Delete</BDropdownItem>
                        </BDropdown>
                      </li>
                    </ul>
                  </BCol>
                </BRow>
              </div>

              <div class="position-relative" id="users-chat">
                <simplebar class="chat-conversation p-3 p-lg-4" id="chat-conversation" data-simplebar ref="current">
                  <ul class="list-unstyled chat-conversation-list">
                    <li v-for="data of resultQuery" :key="data.id || (data.time + data.message)" :class="{
                      right: `${data.align}` === 'right',
                      left: `${data.align}` !== 'right',
                    }" class="chat-list">
                      <div class="conversation-list">
                        <div class="chat-avatar" v-if="data.align !== 'right'">
                          <img :src="profileImg" alt="" />
                        </div>
                        <div class="user-chat-content">
                          <div class="ctext-wrap">
                            <div class="ctext-wrap-content">
                              <p v-if="data.tipo_mensagem === 'image' && data.media_url" class="mb-1">
                                <img :src="urlMidia(data.media_url)" class="rounded img-thumbnail" style="max-width: 200px; max-height: 200px;" alt="" />
                              </p>
                              <p v-else-if="(data.tipo_mensagem === 'video' || data.tipo_mensagem === 'document') && data.media_url" class="mb-1">
                                <a :href="urlMidia(data.media_url)" target="_blank" rel="noopener">{{ data.message || 'Ficheiro' }}</a>
                              </p>
                              <p v-else class="mb-0 ctext-content">{{ data.message }}</p>
                            </div>
                            <div class="conversation-name">
                              <small class="text-muted time">{{ data.time }}</small>
                              <span v-if="data.align === 'right'" class="text-success check-message-icon"><i class="ri-check-double-line align-bottom"></i></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  </ul>
                </simplebar>
                <div class="alert alert-warning alert-dismissible copyclipboard-alert px-4 fade show" id="copyClipBoard" role="alert" style="display: none;">
                  Mensagem copiada
                </div>
              </div>

              <div class="chat-input-section p-3 p-lg-4">
                <form @submit.prevent="formSubmit">
                  <BRow class="g-0 align-items-center">
                    <BCol cols="auto">
                      <div class="chat-input-links me-2">
                        <input type="file" ref="fileInput" class="d-none" accept="image/*,video/*,.pdf,.doc,.docx" @change="onFileSelected" />
                        <BButton type="button" variant="link" class="text-decoration-none" @click="$refs.fileInput && $refs.fileInput.click()" :disabled="uploadando">
                          <i class="ri-attachment-2 align-middle"></i>
                        </BButton>
                      </div>
                    </BCol>
                    <BCol>
                      <input type="text" v-model="form.message" class="form-control chat-input bg-light border-light"
                        placeholder="Escreva a mensagem..." :class="{ 'is-invalid': submitted && v$.form.message.$error }" />
                      <div v-if="submitted && v$.form.message.$error" class="invalid-feedback">
                        <span>{{ v$.form.message.required.$message }}</span>
                      </div>
                    </BCol>
                    <BCol cols="auto">
                      <div class="chat-input-links ms-2">
                        <BButton variant="success" type="submit" class="chat-send" :disabled="enviando">
                          <i class="ri-send-plane-2-fill align-bottom"></i>
                        </BButton>
                      </div>
                    </BCol>
                  </BRow>
                </form>
              </div>
              </div>

              <div class="replyCard">
                <BCard no-body class="mb-0">
                  <BCardBody class="py-3">
                    <div class="replymessage-block mb-0 d-flex align-items-start">
                      <div class="flex-grow-1">
                        <h5 class="conversation-name"></h5>
                        <p class="mb-0"></p>
                      </div>
                      <div class="flex-shrink-0">
                        <BButton type="button" variant="link" size="sm" id="close_toggle" class="mt-n2 me-n3 fs-18">
                          <i class="bx bx-x align-middle"></i>
                        </BButton>
                      </div>
                    </div>
                  </BCardBody>
                </BCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <BOffcanvas v-model="showOffcanvas" body-class="border-0 p-0 overflow-hidden" header-class="border-bottom">
      <div class="offcanvas-body profile-offcanvas p-0">
        <div class="team-cover">
          <img src="@/assets/images/small/img-9.jpg" alt="" class="img-fluid" />
        </div>
        <div class="p-1 pb-4 pt-0">
          <div class="team-settings">
            <div class="row g-0">
              <div class="col">
              </div>
              <div class="col-auto">
                <div class="user-chat-nav d-flex">
                  <BButton variant="link" class="nav-btn favourite-btn active">
                    <i class="ri-star-fill"></i>
                  </BButton>

                  <div class="dropdown">
                    <BLink class="btn nav-btn" href="javascript:void(0);" data-bs-toggle="dropdown" aria-expanded="false">
                      <i class="ri-more-2-fill"></i>
                    </BLink>
                    <ul class="dropdown-menu dropdown-menu-end">
                      <li>
                        <BLink class="dropdown-item" href="javascript:void(0);"><i
                            class="ri-inbox-archive-line align-bottom text-muted me-2"></i>Archive</BLink>
                      </li>
                      <li>
                        <BLink class="dropdown-item" href="javascript:void(0);"><i
                            class="ri-mic-off-line align-bottom text-muted me-2"></i>Muted</BLink>
                      </li>
                      <li>
                        <BLink class="dropdown-item" href="javascript:void(0);"><i
                            class="ri-delete-bin-5-line align-bottom text-muted me-2"></i>Delete</BLink>
                      </li>
                    </ul>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
        <div class="p-3 text-center">
          <img :src="profileImg" alt="" class="avatar-lg img-thumbnail rounded-circle mx-auto profile-img">
          <div class="mt-3">
            <h5 class="fs-16 mb-1">
              <BLink href="javascript:void(0);" class="link-primary username">{{ conversaAtiva ? conversaAtiva.outro_nome : 'Autoridade' }}</BLink>
            </h5>
            <p class="text-muted"><i class="ri-checkbox-blank-circle-fill me-1 align-bottom" :class="conversaAtiva && conversaAtiva.outro_online ? 'text-success' : 'text-secondary'"></i>{{ conversaAtiva && conversaAtiva.outro_online ? 'Online' : 'Offline' }}</p>
          </div>

          <div class="d-flex gap-2 justify-content-center">
            <BButton variant="light" class="avatar-xs p-0" data-bs-toggle="tooltip" data-bs-placement="top"
              title="Message">
              <span class="avatar-title rounded bg-light text-body">
                <i class="ri-question-answer-line"></i>
              </span>
            </BButton>

            <BButton variant="light" class="avatar-xs p-0" data-bs-toggle="tooltip" data-bs-placement="top"
              title="Favourite">
              <span class="avatar-title rounded bg-light text-body">
                <i class="ri-star-line"></i>
              </span>
            </BButton>

            <BButton variant="light" class="avatar-xs p-0" data-bs-toggle="tooltip" data-bs-placement="top" title="Phone">
              <span class="avatar-title rounded bg-light text-body">
                <i class="ri-phone-line"></i>
              </span>
            </BButton>

            <div class="dropdown">
              <BButton variant="light" class="avatar-xs p-0" data-bs-toggle="dropdown" aria-haspopup="true"
                aria-expanded="false">
                <span class="avatar-title bg-light text-body rounded">
                  <i class="ri-more-fill"></i>
                </span>
              </BButton>

              <ul class="dropdown-menu dropdown-menu-end">
                <li>
                  <BLink class="dropdown-item" href="javascript:void(0);"><i
                      class="ri-inbox-archive-line align-bottom text-muted me-2"></i>Archive</BLink>
                </li>
                <li>
                  <BLink class="dropdown-item" href="javascript:void(0);"><i
                      class="ri-mic-off-line align-bottom text-muted me-2"></i>Muted</BLink>
                </li>
                <li>
                  <BLink class="dropdown-item" href="javascript:void(0);"><i
                      class="ri-delete-bin-5-line align-bottom text-muted me-2"></i>Delete</BLink>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="border-top border-top-dashed p-3">
          <h5 class="fs-15 mb-3">Personal Details</h5>
          <div class="mb-3">
            <p class="text-muted text-uppercase fw-medium fs-12 mb-1">Number</p>
            <h6>+(256) 2451 8974</h6>
          </div>
          <div class="mb-3">
            <p class="text-muted text-uppercase fw-medium fs-12 mb-1">Email</p>
            <h6>lisaparker@gmail.com</h6>
          </div>
          <div>
            <p class="text-muted text-uppercase fw-medium fs-12 mb-1">Location</p>
            <h6 class="mb-0">California, USA</h6>
          </div>
        </div>

        <div class="border-top border-top-dashed p-3">
          <h5 class="fs-15 mb-3">Attached Files</h5>

          <div class="vstack gap-2">
            <div class="border rounded border-dashed p-2">
              <div class="d-flex align-items-center">
                <div class="flex-shrink-0 me-3">
                  <div class="avatar-xs">
                    <div class="avatar-title bg-light text-secondary rounded fs-20">
                      <i class="ri-folder-zip-line"></i>
                    </div>
                  </div>
                </div>
                <div class="flex-grow-1 overflow-hidden">
                  <h5 class="fs-13 mb-1">
                    <BLink href="#" class="text-body text-truncate d-block">App pages.zip</BLink>
                  </h5>
                  <div class="text-muted">2.2MB</div>
                </div>
                <div class="flex-shrink-0 ms-2">
                  <div class="d-flex gap-1">
                    <BButton variant="white" class="btn-icon text-muted btn-sm fs-18"><i class="ri-download-2-line"></i>
                    </BButton>
                    <div class="dropdown">
                      <BButton variant="white" class="btn-icon text-muted btn-sm fs-18 dropdown" type="button"
                        data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="ri-more-fill"></i>
                      </BButton>
                      <ul class="dropdown-menu">
                        <li>
                          <BLink class="dropdown-item" href="#"><i class="ri-share-line align-bottom me-2 text-muted"></i>
                            Share</BLink>
                        </li>
                        <li>
                          <BLink class="dropdown-item" href="#"><i
                              class="ri-bookmark-line align-bottom me-2 text-muted"></i> Bookmark</BLink>
                        </li>
                        <li>
                          <BLink class="dropdown-item" href="#"><i
                              class="ri-delete-bin-line align-bottom me-2 text-muted"></i> Delete</BLink>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="border rounded border-dashed p-2">
              <div class="d-flex align-items-center">
                <div class="flex-shrink-0 me-3">
                  <div class="avatar-xs">
                    <div class="avatar-title bg-light text-secondary rounded fs-20">
                      <i class="ri-file-ppt-2-line"></i>
                    </div>
                  </div>
                </div>
                <div class="flex-grow-1 overflow-hidden">
                  <h5 class="fs-13 mb-1">
                    <BLink href="#" class="text-body text-truncate d-block">Velzon admin.ppt</BLink>
                  </h5>
                  <div class="text-muted">2.4MB</div>
                </div>
                <div class="flex-shrink-0 ms-2">
                  <div class="d-flex gap-1">
                    <BButton variant="white" class="btn-icon text-muted btn-sm fs-18"><i class="ri-download-2-line"></i>
                    </BButton>
                    <div class="dropdown">
                      <BButton variant="white" class="btn-icon text-muted btn-sm fs-18 dropdown" type="button"
                        data-bs-toggle="dropdown" aria-expanded="false">
                        <i class="ri-more-fill"></i>
                      </BButton>
                      <ul class="dropdown-menu">
                        <li>
                          <BLink class="dropdown-item" href="#"><i class="ri-share-line align-bottom me-2 text-muted"></i>
                            Share</BLink>
                        </li>
                        <li>
                          <BLink class="dropdown-item" href="#"><i
                              class="ri-bookmark-line align-bottom me-2 text-muted"></i> Bookmark</BLink>
                        </li>
                        <li>
                          <BLink class="dropdown-item" href="#"><i
                              class="ri-delete-bin-line align-bottom me-2 text-muted"></i> Delete</BLink>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="border rounded border-dashed p-2">
              <div class="d-flex align-items-center">
                <div class="flex-shrink-0 me-3">
                  <div class="avatar-xs">
                    <div class="avatar-title bg-light text-secondary rounded fs-20">
                      <i class="ri-folder-zip-line"></i>
                    </div>
                  </div>
                </div>
                <div class="flex-grow-1 overflow-hidden">
                  <h5 class="fs-13 mb-1">
                    <BLink href="#" class="text-body text-truncate d-block">Images.zip</BLink>
                </h5>
                <div class="text-muted">1.2MB</div>
              </div>
              <div class="flex-shrink-0 ms-2">
                <div class="d-flex gap-1">
                  <BButton variant="white" class="btn-icon text-muted btn-sm fs-18"><i class="ri-download-2-line"></i>
                  </BButton>
                  <div class="dropdown">
                    <BButton variant="white" class="btn-icon text-muted btn-sm fs-18 dropdown" type="button"
                      data-bs-toggle="dropdown" aria-expanded="false">
                      <i class="ri-more-fill"></i>
                    </BButton>
                    <ul class="dropdown-menu">
                      <li>
                        <BLink class="dropdown-item" href="#"><i class="ri-share-line align-bottom me-2 text-muted"></i>
                          Share</BLink>
                      </li>
                      <li>
                        <BLink class="dropdown-item" href="#"><i
                            class="ri-bookmark-line align-bottom me-2 text-muted"></i> Bookmark</BLink>
                      </li>
                      <li>
                        <BLink class="dropdown-item" href="#"><i
                            class="ri-delete-bin-line align-bottom me-2 text-muted"></i> Delete</BLink>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="border rounded border-dashed p-2">
            <div class="d-flex align-items-center">
              <div class="flex-shrink-0 me-3">
                <div class="avatar-xs">
                  <div class="avatar-title bg-light text-secondary rounded fs-20">
                    <i class="ri-image-2-line"></i>
                  </div>
                </div>
              </div>
              <div class="flex-grow-1 overflow-hidden">
                <h5 class="fs-13 mb-1">
                  <BLink href="#" class="text-body text-truncate d-block">bg-pattern.png</BLink>
                </h5>
                <div class="text-muted">1.1MB</div>
              </div>
              <div class="flex-shrink-0 ms-2">
                <div class="d-flex gap-1">
                  <BButton variant="white" class="btn-icon text-muted btn-sm fs-18"><i class="ri-download-2-line"></i>
                  </BButton>
                  <div class="dropdown">
                    <BButton variant="white" class="btn-icon text-muted btn-sm fs-18 dropdown" type="button"
                      data-bs-toggle="dropdown" aria-expanded="false">
                      <i class="ri-more-fill"></i>
                    </BButton>
                    <ul class="dropdown-menu">
                      <li>
                        <BLink class="dropdown-item" href="#"><i class="ri-share-line align-bottom me-2 text-muted"></i>
                          Share</BLink>
                      </li>
                      <li>
                        <BLink class="dropdown-item" href="#"><i
                            class="ri-bookmark-line align-bottom me-2 text-muted"></i> Bookmark</BLink>
                      </li>
                      <li>
                        <BLink class="dropdown-item" href="#"><i
                            class="ri-delete-bin-line align-bottom me-2 text-muted"></i> Delete</BLink>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="text-center mt-2">
            <BButton variant="danger">Load more <i class="ri-arrow-right-fill align-bottom ms-1"></i></BButton>
          </div>
        </div>
      </div>
    </div>
  </BOffcanvas>
</Layout></template>