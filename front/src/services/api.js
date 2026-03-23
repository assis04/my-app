const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
