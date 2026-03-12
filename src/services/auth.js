/**
 * Serviço de autenticação – login da autoridade (dashboard SOS Angola).
 * Utiliza o endpoint POST /api/v1/auth/autoridade/login do backend.
 */
import api from './api';

/**
 * Login da autoridade.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ access_token: string, token_type: string, expires_in: number, role: string, user_id: number }>}
 * @throws Em caso de credenciais inválidas (401) ou erro de rede.
 */
export async function loginAutoridade(email, password) {
  const { data } = await api.post('/auth/autoridade/login', {
    email: email.trim(),
    password,
  });
  return data;
}
