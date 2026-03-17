/**
 * Base URL da API e WebSockets.
 * Em browser: usa o host da página (ex.: abrir http://192.168.0.126:8080
 * faz pedidos a http://192.168.0.126:8000) para transmissão WebRTC na LAN.
 * Porta da API: VUE_APP_API_BASE_URL ou 8000.
 */
function getApiBaseUrl() {
  const fromEnv = process.env.VUE_APP_API_BASE_URL
    ? process.env.VUE_APP_API_BASE_URL.replace(/\/$/, '')
    : null;
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const protocol = window.location.protocol || 'http:';
    const host = window.location.hostname;
    const port = fromEnv ? (() => {
      try {
        const u = new URL(fromEnv);
        return u.port || '8000';
      } catch (_) {
        return '8000';
      }
    })() : '8000';
    return `${protocol}//${host}:${port}`;
  }
  return fromEnv || 'http://localhost:8000';
}

/**
 * iceServers para WebRTC (STUN + TURN opcional).
 * TURN: defina VUE_APP_TURN_URIS (ex.: turn:turn.example.com:3478),
 * opcionalmente VUE_APP_TURN_USER e VUE_APP_TURN_CREDENTIAL.
 */
function getIceServers() {
  const servers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];
  const turnUris = process.env.VUE_APP_TURN_URIS;
  if (turnUris && typeof turnUris === 'string') {
    const urls = turnUris.split(',').map((u) => u.trim()).filter(Boolean);
    const user = process.env.VUE_APP_TURN_USER;
    const credential = process.env.VUE_APP_TURN_CREDENTIAL;
    urls.forEach((url) => {
      servers.push(
        user && credential
          ? { urls: url, username: user, credential }
          : { urls: url }
      );
    });
  }
  return servers;
}

export { getApiBaseUrl, getIceServers };
