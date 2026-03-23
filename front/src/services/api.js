/* 
  Busca dinâmica de URL para permitir que celulares/dispositivos na Rede Local (192.168.X.X) 
  consigam se logar, rastreando 'localhost' na URL de Ambiente e trocando pelo IP do Host Dinamicamente.
*/
const getApiUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    // Se a URL base tiver 'localhost', trocamos pro IP que o celular está usando
    if (envUrl && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      return envUrl.replace(/localhost|127\.0\.0\.1/, window.location.hostname);
    }
    if (envUrl) return envUrl;
    return `${window.location.protocol}//${window.location.hostname}:3002`;
  }
  // Se for código rodando no Node do Servidor
  return envUrl || 'http://localhost:3002';
};

const API_URL = getApiUrl();

export const api = async (endpoint, { body, ...customConfig } = {}) => {
  const isFormData = typeof window !== 'undefined' && body instanceof FormData;
  
  const headers = isFormData ? {} : { 'Content-Type': 'application/json' };
  
  // Inclui cookies nas requisições (importante para o refresh token)
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

  // Se houver um token no localStorage, adiciona no header
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    let data = {};
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      // Se não for JSON (ex: erro 500 com HTML do Express), pegamos como texto ou usamos um padrão
      const text = await response.text();
      data = { message: text || 'Erro desconhecido no servidor' };
    }

    if (response.ok) {
      return data;
    }

    // Token expirado ou inválido → limpa sessão e redireciona para login
    if (response.status === 401 && endpoint !== '/auth/login') {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
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
