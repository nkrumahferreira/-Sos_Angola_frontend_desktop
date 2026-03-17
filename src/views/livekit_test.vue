<template>
  <div class="livekit-test p-4">
    <h1 class="mb-3">LiveKit – teste isolado</h1>
    <p class="text-muted small mb-3">
      Conecta à sala <code>alert_{{ alertId || '?' }}</code> como autoridade e anexa o primeiro vídeo ao elemento abaixo, sem lógica extra.
    </p>
    <div class="mb-3">
      <label class="form-label">ID do alerta</label>
      <input v-model.number="alertId" type="number" class="form-control" style="max-width: 120px" placeholder="ex: 115" />
    </div>
    <button class="btn btn-primary mb-3" :disabled="connecting" @click="connect">
      {{ connecting ? 'A conectar…' : 'Conectar' }}
    </button>
    <div v-if="status" class="alert alert-info small">{{ status }}</div>
    <div class="rounded border bg-dark overflow-hidden" style="max-width: 640px;">
      <video
        ref="videoEl"
        autoplay
        playsinline
        muted
        style="width: 100%; display: block; background: #000; min-height: 360px;"
      ></video>
    </div>
    <p v-if="error" class="text-danger mt-2 small">{{ error }}</p>
  </div>
</template>

<script>
import { Room, RoomEvent } from 'livekit-client';
import api from '@/services/api';

export default {
  name: 'LivekitTest',
  data() {
    return {
      alertId: null,
      connecting: false,
      status: '',
      error: null,
      room: null,
      liveStatsIntervalId: null,
    };
  },
  mounted() {
    const id = this.$route.query?.alerta_id || this.$route.query?.id;
    if (id) this.alertId = Number(id);
  },
  methods: {
    async connect() {
      if (!this.alertId) {
        this.error = 'Indica o ID do alerta.';
        return;
      }
      this.error = null;
      this.status = 'A pedir token…';
      this.connecting = true;
      if (this.room) {
        try {
          this.room.disconnect();
        } catch (e) {
          void e;
        }
        this.room = null;
      }
      const video = this.$refs.videoEl;
      if (video && video.srcObject) {
        video.srcObject = null;
      }

      try {
        const { data } = await api.post(`/alertas/${this.alertId}/live-token`, { role: 'autoridade' });
        const url = (data && data.url) || '';
        const token = (data && data.token) || '';
        if (!url || !token) {
          this.error = 'Resposta sem url ou token.';
          this.connecting = false;
          return;
        }
        this.status = 'A conectar à sala…';
        const room = new Room({
          adaptiveStream: false,
          dynacast: false,
        });
        this.room = room;

        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          console.log('TRACK SUBSCRIBED', {
            participant: participant?.identity,
            kind: track.kind,
            publicationSubscribed: publication?.isSubscribed,
          });
          if (track.kind !== 'video') return;
          this.status = 'TrackSubscribed (vídeo). A anexar ao DOM.';
          const el = this.$refs.videoEl;
          if (!el) return;
          if (publication && typeof publication.setSubscribed === 'function') {
            publication.setSubscribed(true);
          }
          track.attach(el);
          el.muted = true;
          el.playsInline = true;
          el.autoplay = true;
          el.load();
          el.play().catch(() => {});
          const tryPlay = () => {
            if (el.paused && el.readyState >= 2) el.play().catch(() => {});
          };
          el.onloadeddata = tryPlay;
          el.onloadedmetadata = tryPlay;
          setTimeout(tryPlay, 300);
          setTimeout(tryPlay, 1000);
          this.status = 'Vídeo anexado.';
        });

        room.on(RoomEvent.Disconnected, () => {
          this.status = 'Desligado da sala.';
        });

        await room.connect(url, token, { autoSubscribe: true });
        this.status = 'Ligado. À espera de vídeo remoto.';

        const participantsLog = [];
        room.remoteParticipants.forEach((p) => {
          const pubs = [];
          p.trackPublications.forEach((pub) => {
            pubs.push({ sid: pub.trackSid, kind: pub.kind, isSubscribed: pub.isSubscribed, hasTrack: !!pub.track });
          });
          participantsLog.push({ identity: p.identity, sid: p.sid, trackPublications: pubs });
        });
        console.log('[LiveKit DEBUG] Participantes conectados', participantsLog);

        const statsIntervalId = setInterval(async () => {
          if (this.room !== room) {
            clearInterval(statsIntervalId);
            return;
          }
          try {
            const sub = room.engine?.pcManager?.subscriber;
            if (sub) {
              const stats = await sub.getStats();
              console.log('WEBRTC STATS', stats);
            }
          } catch (e) {
            console.warn('[LiveKit DEBUG] getStats erro', e);
          }
        }, 3000);
        this.liveStatsIntervalId = statsIntervalId;
      } catch (err) {
        this.error = err.response?.data?.detail || err.message || 'Erro ao conectar.';
        this.status = '';
      } finally {
        this.connecting = false;
      }
    },
  },
  beforeUnmount() {
    if (this.liveStatsIntervalId) {
      clearInterval(this.liveStatsIntervalId);
      this.liveStatsIntervalId = null;
    }
    if (this.room) {
      try {
        this.room.disconnect();
      } catch (e) {
        void e;
      }
      this.room = null;
    }
  },
};
</script>
