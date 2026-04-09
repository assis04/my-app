/* 
  Busca dinâmica de URL para permitir que celulares/dispositivos na Rede Local (192.168.X.X) 
  consigam se logar, rastreando 'localhost' na URL de Ambiente e trocando pelo IP do Host Dinamicamente.
*/
const getApiUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // No navegador (Client-side)
  if (typeof window !== 'undefined') {
    // 1. Se houver variável de ambiente, usamos ela (com ajuste dinâmico apenas se for localhost)
    if (envUrl) {
      if (envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
        return envUrl.replace(/localhost|127\.0\.0\.1/, window.location.hostname);
      }
      return envUrl;
    }
    // 2. Se não houver variável, tentamos o mesmo host da página na porta 3001 (novo padrão)
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }
  
  // No servidor (Server-side / SSR)
  return envUrl || 'http://localhost:3001';
};

const API_URL = getApiUrl();

/**
 * Retorna a URL base para conexão WebSocket (Socket.IO).
 * Usa a mesma lógica dinâmica do getApiUrl, mas na porta do Socket (3002).
 */
export const getSocketUrl = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${hostname}:3002`;
  }
  return 'http://localhost:3002';
};

let isRefreshing = false;
let refreshPromise = null;

async function tryRefreshToken() {
  if (isRefreshing) return refreshPromise;

  isRefreshing = true;
  refreshPromise = fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then(res => {
      if (!res.ok) throw new Error('Refresh failed');
      return true;
    })
    .finally(() => {
      isRefreshing = false;
      refreshPromise = null;
    });

  return refreshPromise;
}

export const api = async (endpoint, { body, ...customConfig } = {}, _isRetry = false) => {
  const isFormData = typeof window !== 'undefined' && body instanceof FormData;

  const headers = isFormData ? {} : { 'Content-Type': 'application/json' };

  const config = {
    method: body ? 'POST' : 'GET',
    ...customConfig,
    headers: {
      ...headers,
      ...customConfig.headers,
    },
    credentials: 'include',
  };

  if (body) {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);

    let data = {};
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { message: text || 'Erro desconhecido no servidor' };
    }

    if (response.ok) {
      return data;
    }

    // Token expirado → tenta refresh uma vez antes de redirecionar
    if (response.status === 401 && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
      if (!_isRetry) {
        try {
          await tryRefreshToken();
          return api(endpoint, { body, ...customConfig }, true);
        } catch {
          // Refresh falhou — redirecionar para login
        }
      }

      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      return Promise.reject('Sessão expirada. Faça login novamente.');
    }

    throw new Error(data.message || `Erro ${response.status}`);
  } catch (error) {
    return Promise.reject(error.message);
  }
};
